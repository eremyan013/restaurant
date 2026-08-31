import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default', data }),
  }).catch((err) => { console.error('Push send failed:', err) })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Admin-only: caller must present the service role key
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!bearerToken || bearerToken !== serviceRoleKey) {
      return json({ error: 'unauthorized' }, 401)
    }

    const body = await req.json().catch(() => null)
    const venue_id: string | undefined = body?.venue_id

    if (!venue_id) {
      return json({ error: 'missing_venue_id' }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch venue name for notification copy
    const { data: venue } = await adminClient
      .from('venues')
      .select('name')
      .eq('id', venue_id)
      .maybeSingle()

    const venueName: string = (venue as { name: string } | null)?.name ?? venue_id

    // Fetch all unnotified waitlist entries with profile push data
    type WaitlistEntry = {
      id: string
      user_id: string
      profiles: {
        push_token: string | null
        language: string | null
        notif_reminders: boolean | null
      } | null
    }

    const { data: entries, error: fetchError } = await adminClient
      .from('waitlist_entries')
      .select('id, user_id, profiles!waitlist_entries_user_id_fkey(push_token, language, notif_reminders)')
      .eq('venue_id', venue_id)
      .is('notified_at', null)

    if (fetchError) {
      console.error('Waitlist fetch error:', fetchError)
      return json({ error: 'fetch_failed' }, 500)
    }

    const rows = (entries ?? []) as WaitlistEntry[]

    // Send push to each eligible entry
    await Promise.allSettled(
      rows.map(async (entry) => {
        const profile = entry.profiles
        const token = profile?.push_token
        if (!token) return
        // null means user hasn't opted out — treat as enabled
        if (profile?.notif_reminders === false) return

        const lang = profile?.language ?? 'en'
        let title: string
        let pushBody: string

        if (lang === 'hy') {
          title    = '🔔 Տեղ ազատվել է'
          pushBody = `${venueName}-ում արդեն կա ազատ տեղ։ Ամրագրեք հիմա։`
        } else if (lang === 'ru') {
          title    = '🔔 Место освободилось'
          pushBody = `В ${venueName} появилось свободное место. Забронируйте сейчас!`
        } else {
          title    = '🔔 A spot is available'
          pushBody = `${venueName} now has availability. Book your table now!`
        }

        await sendPush(token, title, pushBody, { type: 'waitlist_notify', venue_id })
      })
    )

    // Bulk-stamp notified_at so these entries are not re-notified
    const { error: stampError } = await adminClient
      .from('waitlist_entries')
      .update({ notified_at: new Date().toISOString() })
      .eq('venue_id', venue_id)
      .is('notified_at', null)

    if (stampError) {
      console.error('Waitlist stamp error:', stampError)
      // Pushes already sent — log but still return partial success
      return json({ ok: true, notified: rows.length, warn: 'stamp_failed' })
    }

    return json({ ok: true, notified: rows.length })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
