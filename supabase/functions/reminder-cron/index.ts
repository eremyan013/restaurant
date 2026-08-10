import { createClient } from 'npm:@supabase/supabase-js@2'

// Yerevan is UTC+4, no DST.
const YEREVAN_OFFSET_MS = 4 * 60 * 60 * 1000

function yerevanNow(): { hour: number; minute: number; dateIso: string } {
  const now = new Date(Date.now() + YEREVAN_OFFSET_MS)
  const hour    = now.getUTCHours()
  const minute  = now.getUTCMinutes()
  const year    = now.getUTCFullYear()
  const month   = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day     = String(now.getUTCDate()).padStart(2, '0')
  return { hour, minute, dateIso: `${year}-${month}-${day}` }
}

function yerevanTomorrow(): string {
  const d = new Date(Date.now() + YEREVAN_OFFSET_MS + 24 * 60 * 60 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function yerevanToUtcMs(dateIso: string, time: string): number {
  const [h, m] = time.split(':').map(Number)
  return Date.parse(`${dateIso}T00:00:00Z`) - YEREVAN_OFFSET_MS + (h * 60 + m) * 60 * 1000
}

async function sendPush(token: string, title: string, body: string): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  }).catch((err) => { console.error('Push send failed:', err) })
}

Deno.serve(async (_req: Request) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { hour, dateIso: todayIso } = yerevanNow()
  const tomorrowIso = yerevanTomorrow()
  const nowMs = Date.now()

  let dayBeforeSent = 0, dayBeforeFailed = 0
  let twoHourSent   = 0, twoHourFailed   = 0

  // --- Block 1: Day-before reminder (18:00–19:59 Yerevan) ---
  if (hour >= 18 && hour < 20) {
    const { data: rows, error } = await admin
      .from('reservations')
      .select(`id, time, profiles!reservations_user_id_fkey(push_token, language), venues(name)`)
      .eq('status', 'confirmed')
      .eq('date_iso', tomorrowIso)
      .eq('reminder_day_before_sent', false)

    if (error) {
      console.error('Day-before query failed:', error.message)
    } else {
      for (const row of rows ?? []) {
        const profile   = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const venue     = Array.isArray(row.venues)   ? row.venues[0]   : row.venues
        const p         = profile as { push_token: string | null; language: string | null } | null
        const token     = p?.push_token
        const lang      = p?.language ?? 'en'
        const venueName = (venue as { name: string } | null)?.name ?? 'your venue'
        if (!token) continue

        let pushTitle: string, pushBody: string
        if (lang === 'hy') {
          pushTitle = 'Հիշեցում 🍽️'
          pushBody  = `Ձեր սեղանը վաղը ${venueName}-ում ժամը ${row.time as string}-ին։ Շուտով կտեսնվենք!`
        } else if (lang === 'ru') {
          pushTitle = 'Напоминание 🍽️'
          pushBody  = `Ваш столик завтра в ${venueName} в ${row.time as string}. До встречи!`
        } else {
          pushTitle = 'Reminder 🍽️'
          pushBody  = `Your table tomorrow at ${venueName} at ${row.time as string}. See you soon!`
        }
        await sendPush(token, pushTitle, pushBody)

        const { error: upErr } = await admin.from('reservations').update({ reminder_day_before_sent: true }).eq('id', row.id)
        if (upErr) { console.error(`day_before update failed ${row.id}:`, upErr.message); dayBeforeFailed++ }
        else dayBeforeSent++
      }
    }
  }

  // --- Block 2: 2-hour reminder ---
  const windowLow  = nowMs + (1 * 60 + 45) * 60 * 1000
  const windowHigh = nowMs + (2 * 60 + 15) * 60 * 1000

  const { data: rows2, error: err2 } = await admin
    .from('reservations')
    .select(`id, date_iso, time, profiles!reservations_user_id_fkey(push_token, language), venues(name)`)
    .eq('status', 'confirmed')
    .eq('reminder_2h_sent', false)
    .in('date_iso', [todayIso, tomorrowIso])

  if (err2) {
    console.error('2h query failed:', err2.message)
  } else {
    for (const row of rows2 ?? []) {
      const resMs = yerevanToUtcMs(row.date_iso as string, row.time as string)
      if (resMs < windowLow || resMs > windowHigh) continue

      const profile   = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const venue     = Array.isArray(row.venues)   ? row.venues[0]   : row.venues
      const p         = profile as { push_token: string | null; language: string | null } | null
      const token     = p?.push_token
      const lang      = p?.language ?? 'en'
      const venueName = (venue as { name: string } | null)?.name ?? 'your venue'
      if (!token) continue

      let pushTitle: string, pushBody: string
      if (lang === 'hy') {
        pushTitle = 'Շուտով կտեսնվենք 🎉'
        pushBody  = `Ձեր սեղանը ${venueName}-ում 2 ժամից է! Կտեսնվենք ժամը ${row.time as string}-ին։`
      } else if (lang === 'ru') {
        pushTitle = 'До встречи 🎉'
        pushBody  = `Ваш столик в ${venueName} через 2 часа! Ждём вас в ${row.time as string}.`
      } else {
        pushTitle = 'See You Soon 🎉'
        pushBody  = `Your table at ${venueName} is in 2 hours! See you at ${row.time as string}.`
      }
      await sendPush(token, pushTitle, pushBody)

      const { error: upErr } = await admin.from('reservations').update({ reminder_2h_sent: true }).eq('id', row.id)
      if (upErr) { console.error(`2h update failed ${row.id}:`, upErr.message); twoHourFailed++ }
      else twoHourSent++
    }
  }

  const summary = { day_before: { sent: dayBeforeSent, failed: dayBeforeFailed }, two_hour: { sent: twoHourSent, failed: twoHourFailed } }
  console.log('Reminder cron finished:', JSON.stringify(summary))
  return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
