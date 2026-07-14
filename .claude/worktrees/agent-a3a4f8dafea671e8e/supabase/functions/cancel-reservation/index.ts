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
    const { token } = await req.json()
    if (!token) {
      return json({ error: 'invalid_token' }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // token is the reservation id
    const { data: reservation, error: fetchError } = await adminClient
      .from('reservations')
      .select('id, status, date_iso, time')
      .eq('id', token)
      .maybeSingle()

    if (fetchError || !reservation) {
      return json({ error: 'invalid_token' }, 404)
    }

    if (reservation.status === 'cancelled') {
      return json({ status: 'cancelled', already: true })
    }

    // Enforce 1-hour cancellation deadline
    if (reservation.date_iso && reservation.time) {
      const [hourStr, minuteStr] = reservation.time.split(':')
      if (hourStr && minuteStr) {
        const resDate = new Date(`${reservation.date_iso}T${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}:00`)
        if (Date.now() >= resDate.getTime() - 60 * 60 * 1000) {
          return json({ error: 'cancellation_deadline_passed' }, 409)
        }
      }
    }

    const { error: updateError } = await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', token)

    if (updateError) {
      console.error('Cancel update error:', updateError)
      return json({ error: 'update_failed' }, 500)
    }

    return json({ status: 'cancelled' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
