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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: 'unauthorized' }, 401)

  const body = await req.json()
  const { reservation_id } = body ?? {}
  if (!reservation_id) return json({ error: 'invalid_request' }, 400)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: res } = await adminClient
    .from('reservations')
    .select('id, status, user_id')
    .eq('id', reservation_id)
    .single()

  if (!res) return json({ error: 'not_found' }, 404)
  if (res.user_id !== user.id) return json({ error: 'forbidden' }, 403)
  if (res.status !== 'alternative_offered') return json({ error: 'invalid_status' }, 409)

  const { error: updateErr } = await adminClient
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservation_id)

  if (updateErr) return json({ error: 'update_failed' }, 500)

  return json({ status: 'cancelled' })
})
