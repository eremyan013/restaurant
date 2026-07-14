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
      .select('id, status')
      .eq('id', token)
      .maybeSingle()

    if (fetchError || !reservation) {
      return json({ error: 'invalid_token' }, 404)
    }

    if (reservation.status === 'confirmed') {
      return json({ status: 'confirmed', already: true })
    }

    if (reservation.status === 'cancelled') {
      return json({ error: 'already_cancelled' }, 409)
    }

    const { error: updateError } = await adminClient
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', token)

    if (updateError) {
      console.error('Confirm update error:', updateError)
      return json({ error: 'update_failed' }, 500)
    }

    return json({ status: 'confirmed' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
