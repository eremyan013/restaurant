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

async function sendPush(token: string, title: string, body: string): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  }).catch((err) => { console.error('Push send failed:', err) })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401)
    }

    // Verify the caller's session JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    const body = await req.json()
    const { venue_id, people, date, date_iso, time, occasion, note, yel_earned } = body

    if (!venue_id || people == null || !date || !time || yel_earned == null) {
      return json({ error: 'missing_required_fields' }, 400)
    }

    // Service role client for DB writes (bypasses RLS so insert always works)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Server-side availability check: is the date blocked for this venue?
    if (date_iso) {
      const { data: blocked } = await adminClient
        .from('venue_blocked_dates')
        .select('id')
        .eq('venue_id', venue_id)
        .eq('date', date_iso)
        .maybeSingle()

      if (blocked) {
        return json({ error: 'no_availability' }, 409)
      }
    }

    const { data: reservation, error: insertError } = await adminClient
      .from('reservations')
      .insert({
        user_id: user.id,
        venue_id,
        people: Number(people),
        date,
        date_iso: date_iso ?? null,
        time,
        occasion: occasion ?? null,
        note: note?.trim() || null,
        status: 'pending_confirmation',
        sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        yel_earned: String(yel_earned),
        admin_note: null,
      })
      .select('id')
      .single()

    if (insertError || !reservation) {
      console.error('Reservation insert error:', insertError)
      return json({ error: 'insert_failed' }, 500)
    }

    // fire-and-forget push — not awaited, never blocks the response
    ;(async () => {
      try {
        const [{ data: profile }, { data: venue }] = await Promise.all([
          adminClient.from('profiles').select('push_token').eq('id', user.id).maybeSingle(),
          adminClient.from('venues').select('name').eq('id', venue_id).maybeSingle(),
        ])
        const token = (profile as { push_token: string | null } | null)?.push_token
        if (!token) return
        const venueName = (venue as { name: string } | null)?.name ?? ''
        await sendPush(
          token,
          'Request Received 🎉',
          `We've received your request${venueName ? ` for ${venueName}` : ''} on ${date} at ${time}. We'll confirm within 30 minutes.`,
        )
      } catch (err) {
        console.error('Fire-and-forget push failed:', err)
      }
    })()

    return json({ reservation_id: reservation.id })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
