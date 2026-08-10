import { createClient } from 'npm:@supabase/supabase-js@2'

// Sanitize user-controlled strings before embedding in HTML.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Format a UTC ISO timestamp for display in Asia/Yerevan (UTC+4, no DST).
function formatYerevan(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function buildEmailHtml(opts: {
  guestName: string
  venueName: string
  reservationDate: string
  reservationTime: string
  partySize: number
  slaDeadline: string   // ISO string (UTC)
  minutesOverdue: number
  reservationId: string
}): string {
  const guest   = escapeHtml(opts.guestName)
  const venue   = escapeHtml(opts.venueName)
  const slaYerevan = escapeHtml(formatYerevan(opts.slaDeadline))
  const ctaUrl  = `https://tonir-admin.vercel.app/dashboard/reservations?status=pending_confirmation`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SLA Breach Alert</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #dc2626; padding: 24px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { margin: 4px 0 0; color: #fecaca; font-size: 13px; }
    .body { padding: 28px 32px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; margin-bottom: 2px; }
    .value { font-size: 15px; color: #111827; margin-bottom: 16px; }
    .overdue-badge { display: inline-block; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 10px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .cta { display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; }
    .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>SLA Breach — Action Required</h1>
      <p>A reservation at ${venue} has exceeded its confirmation deadline.</p>
    </div>
    <div class="body">
      <div class="overdue-badge">${opts.minutesOverdue}m overdue</div>

      <div class="label">Guest</div>
      <div class="value">${guest}</div>

      <div class="label">Venue</div>
      <div class="value">${venue}</div>

      <div class="label">Reservation date &amp; time</div>
      <div class="value">${escapeHtml(opts.reservationDate)} at ${escapeHtml(opts.reservationTime)}</div>

      <div class="label">Party size</div>
      <div class="value">${opts.partySize} ${opts.partySize === 1 ? 'guest' : 'guests'}</div>

      <div class="label">SLA deadline (Yerevan time)</div>
      <div class="value">${slaYerevan}</div>

      <hr class="divider" />

      <a href="${ctaUrl}" class="cta">Review pending reservations</a>
    </div>
    <div class="footer">
      This is an automated alert from Tonir Admin. Reservation ID: ${escapeHtml(opts.reservationId)}
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Handler — invoked by Supabase cron scheduler every 5 minutes.
// No CORS headers needed; this function is not called from the browser.
// ---------------------------------------------------------------------------
Deno.serve(async (_req: Request) => {
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey   = Deno.env.get('RESEND_API_KEY')!

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Fetch all pending_confirmation reservations where:
  //   - sla_deadline has passed, AND
  //   - no alert has been sent yet, OR the last alert was sent more than 5 minutes ago
  //     (prevents double-firing if the cron overlaps itself).
  const { data: breached, error: queryError } = await admin
    .from('reservations')
    .select(
      `id, date, time, people, sla_deadline,
       profiles!reservations_user_id_fkey(name, email),
       venues(name)`,
    )
    .eq('status', 'pending_confirmation')
    .lt('sla_deadline', new Date().toISOString())
    .or('sla_alert_sent_at.is.null,sla_alert_sent_at.lt.' + new Date(Date.now() - 5 * 60 * 1000).toISOString())

  if (queryError) {
    console.error('SLA query failed:', queryError.message)
    return new Response(
      JSON.stringify({ error: 'query_failed', detail: queryError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const rows = breached ?? []
  let sent   = 0
  let failed = 0

  for (const row of rows) {
    // PostgREST returns FK-joined rows as objects (single) or arrays (many).
    // profiles!reservations_user_id_fkey is a to-one join → object.
    const profile  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const venue    = Array.isArray(row.venues)   ? row.venues[0]   : row.venues

    const guestName  = (profile as { name: string; email: string } | null)?.name  ?? 'Unknown guest'
    const venueName  = (venue   as { name: string } | null)?.name ?? 'Unknown venue'
    const slaDeadline = row.sla_deadline as string

    const minutesOverdue = Math.floor((Date.now() - new Date(slaDeadline).getTime()) / 60_000)
    const subject = `[SLA BREACH] ${venueName} – ${minutesOverdue}m overdue`

    const html = buildEmailHtml({
      guestName,
      venueName,
      reservationDate: row.date as string,
      reservationTime: row.time as string,
      partySize: row.people as number,
      slaDeadline,
      minutesOverdue,
      reservationId: row.id as string,
    })

    // Send via Resend.
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',   // temporary until custom domain is verified
        to: 'robert.a.saroyan@gmail.com',
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error(`Failed to send SLA alert for reservation ${row.id}:`, errBody)
      failed++
      continue
    }

    // Mark the alert as sent so we don't re-fire within the next 5-minute window.
    const { error: updateError } = await admin
      .from('reservations')
      .update({ sla_alert_sent_at: new Date().toISOString() })
      .eq('id', row.id)

    if (updateError) {
      // Email was sent but we couldn't stamp the row — log and count as failed
      // so the next run will attempt to send again (acceptable duplicate risk).
      console.error(`sla_alert_sent_at update failed for ${row.id}:`, updateError.message)
      failed++
    } else {
      sent++
    }
  }

  const total = rows.length
  console.log(`SLA alert cron finished: sent=${sent}, failed=${failed}, total=${total}`)

  return new Response(
    JSON.stringify({ sent, failed, total }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
