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

    return json({ reservation_id: reservation.id })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
