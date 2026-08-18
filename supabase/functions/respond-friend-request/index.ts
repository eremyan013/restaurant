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
    const { friendship_id, action } = body ?? {}

    if (!friendship_id || !action) {
      return json({ error: 'missing_required_fields' }, 400)
    }
    if (action !== 'accept' && action !== 'decline') {
      return json({ error: 'invalid_action' }, 400)
    }

    // Service role client for DB operations (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch the friendship row to validate ownership and current state
    const { data: friendship } = await adminClient
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendship_id)
      .maybeSingle()

    if (!friendship) {
      return json({ error: 'not_found' }, 404)
    }
    if (friendship.addressee_id !== user.id) {
      return json({ error: 'forbidden' }, 403)
    }
    if (friendship.status !== 'pending') {
      return json({ error: 'already_responded' }, 409)
    }

    // Update the friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const { error: updateError } = await adminClient
      .from('friendships')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', friendship_id)

    if (updateError) {
      console.error('Friendship update error:', updateError)
      return json({ error: 'update_failed' }, 500)
    }

    // Fire-and-forget push — only sent when the request is accepted
    if (action === 'accept') {
      ;(async () => {
        try {
          const [{ data: addresseeProfile }, { data: requesterProfile }] = await Promise.all([
            adminClient.from('profiles').select('name').eq('id', user.id).maybeSingle(),
            adminClient.from('profiles').select('push_token, language, notif_friend_activity').eq('id', friendship.requester_id).maybeSingle(),
          ])

          const token = (requesterProfile as { push_token: string | null } | null)?.push_token
          if (!token) return
          if ((requesterProfile as { notif_friend_activity: boolean | null } | null)?.notif_friend_activity === false) return

          const name = (addresseeProfile as { name: string | null } | null)?.name ?? ''
          const lang = (requesterProfile as { language: string | null } | null)?.language ?? 'en'

          let pushTitle: string
          let pushBody: string
          if (lang === 'hy') {
            pushTitle = 'Հայտն ընդունվեց'
            pushBody  = `${name}-ն ընդունեց ձեր ընկերոջ հայտը`
          } else if (lang === 'ru') {
            pushTitle = 'Заявка принята'
            pushBody  = `${name} принял(а) вашу заявку в друзья`
          } else {
            pushTitle = 'Request Accepted'
            pushBody  = `${name} accepted your friend request`
          }

          await sendPush(token, pushTitle, pushBody)
        } catch (err) {
          console.error('Fire-and-forget push failed:', err)
        }
      })()
    }

    return json({ ok: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
