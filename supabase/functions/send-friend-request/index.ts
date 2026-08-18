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
    const { addressee_id } = body ?? {}

    if (!addressee_id) {
      return json({ error: 'missing_required_fields' }, 400)
    }
    if (addressee_id === user.id) {
      return json({ error: 'cannot_add_self' }, 400)
    }

    // Service role client for DB writes (bypasses RLS so queries always work)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Check for an existing friendship row in either direction
    const { data: existing } = await adminClient
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${addressee_id}),` +
        `and(requester_id.eq.${addressee_id},addressee_id.eq.${user.id})`
      )
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        return json({ error: 'already_friends' }, 409)
      }
      if (existing.status === 'pending') {
        return json({ error: 'request_already_sent' }, 409)
      }
      // status === 'declined' — delete so the request can be re-sent
      await adminClient.from('friendships').delete().eq('id', existing.id)
    }

    // Insert the new pending friendship request
    const { error: insertError } = await adminClient
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id, status: 'pending' })

    if (insertError) {
      console.error('Friendship insert error:', insertError)
      return json({ error: 'insert_failed' }, 500)
    }

    // Fire-and-forget push — not awaited, never blocks the response
    ;(async () => {
      try {
        const [{ data: requesterProfile }, { data: addresseeProfile }] = await Promise.all([
          adminClient.from('profiles').select('name').eq('id', user.id).maybeSingle(),
          adminClient.from('profiles').select('push_token, language, notif_friend_activity').eq('id', addressee_id).maybeSingle(),
        ])

        const token = (addresseeProfile as { push_token: string | null } | null)?.push_token
        if (!token) return
        if ((addresseeProfile as { notif_friend_activity: boolean | null } | null)?.notif_friend_activity === false) return

        const name = (requesterProfile as { name: string | null } | null)?.name ?? ''
        const lang = (addresseeProfile as { language: string | null } | null)?.language ?? 'en'

        let pushTitle: string
        let pushBody: string
        if (lang === 'hy') {
          pushTitle = 'Ընկերոջ հայտ'
          pushBody  = `${name}-ն ուզում է լինել ձեր ընկերը`
        } else if (lang === 'ru') {
          pushTitle = 'Заявка в друзья'
          pushBody  = `${name} хочет добавить вас в друзья`
        } else {
          pushTitle = 'Friend Request'
          pushBody  = `${name} wants to be your friend`
        }

        await sendPush(token, pushTitle, pushBody)
      } catch (err) {
        console.error('Fire-and-forget push failed:', err)
      }
    })()

    return json({ ok: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
