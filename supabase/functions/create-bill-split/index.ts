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
  data?: Record<string, unknown>,
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
    // 1. Parse Authorization header and verify session
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401)
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    // 2. Validate request body
    const body = await req.json()
    const { reservation_id, total_amount, friend_ids } = body ?? {}

    if (
      !reservation_id ||
      typeof total_amount !== 'number' || total_amount <= 0 ||
      !Array.isArray(friend_ids) || friend_ids.length === 0
    ) {
      return json({ error: 'missing_required_fields' }, 400)
    }

    // Service role client for DB reads/writes (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 3. Fetch reservation and verify status + ownership
    const { data: reservation, error: resError } = await adminClient
      .from('reservations')
      .select('id, user_id, status, venue_id')
      .eq('id', reservation_id)
      .maybeSingle()

    if (resError) {
      console.error('Reservation fetch error:', resError)
      return json({ error: 'internal_error' }, 500)
    }
    if (!reservation) {
      return json({ error: 'reservation_not_found' }, 404)
    }
    if (reservation.status !== 'visited') {
      return json({ error: 'reservation_not_visited' }, 400)
    }
    if (reservation.user_id !== user.id) {
      return json({ error: 'not_your_reservation' }, 403)
    }

    // 4. Check for an existing split on this reservation
    const { data: existingSplit } = await adminClient
      .from('bill_splits')
      .select('id')
      .eq('reservation_id', reservation_id)
      .maybeSingle()

    if (existingSplit) {
      return json({ error: 'split_already_exists' }, 409)
    }

    // 5. Verify all friend_ids are accepted friends of the caller
    const { data: friendships, error: friendError } = await adminClient
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.in.(${friend_ids.join(',')})),` +
        `and(addressee_id.eq.${user.id},requester_id.in.(${friend_ids.join(',')}))`
      )

    if (friendError) {
      console.error('Friendship check error:', friendError)
      return json({ error: 'internal_error' }, 500)
    }
    if (!friendships || friendships.length !== friend_ids.length) {
      return json({ error: 'invalid_friend_ids' }, 400)
    }

    // 6. Compute split amounts
    const participant_count = friend_ids.length + 1
    const share_amount = Math.round((total_amount / participant_count) * 100) / 100

    // 7. Insert the bill_split row
    const { data: splitRow, error: splitInsertError } = await adminClient
      .from('bill_splits')
      .insert({
        reservation_id,
        initiator_id: user.id,
        total_amount,
        participant_count,
        share_amount,
        currency: 'AMD',
      })
      .select('id')
      .single()

    if (splitInsertError || !splitRow) {
      console.error('bill_splits insert error:', splitInsertError)
      return json({ error: 'internal_error' }, 500)
    }

    const split_id = splitRow.id

    // 8. Batch insert participants (initiator + friends)
    const participants = [
      { split_id, user_id: user.id, is_initiator: true },
      ...friend_ids.map((friendId: string) => ({ split_id, user_id: friendId, is_initiator: false })),
    ]

    const { error: participantsInsertError } = await adminClient
      .from('bill_split_participants')
      .insert(participants)

    if (participantsInsertError) {
      console.error('bill_split_participants insert error:', participantsInsertError)
      return json({ error: 'internal_error' }, 500)
    }

    // 9. Return success immediately before push notifications
    const response = json({ ok: true, split_id })

    // 10. Fire-and-forget push notifications to each friend
    ;(async () => {
      try {
        const [{ data: initiatorProfile }, { data: venueRow }] = await Promise.all([
          adminClient.from('profiles').select('name').eq('id', user.id).maybeSingle(),
          // venue_id is TEXT — no UUID cast needed
          adminClient.from('venues').select('name').eq('id', reservation.venue_id).maybeSingle(),
        ])

        const initiatorName = (initiatorProfile as { name: string | null } | null)?.name ?? ''
        const venueName = (venueRow as { name: string | null } | null)?.name ?? ''

        const { data: friendProfiles } = await adminClient
          .from('profiles')
          .select('id, push_token, language, notif_friend_activity')
          .in('id', friend_ids)

        if (!friendProfiles) return

        await Promise.all(
          friendProfiles.map(async (friend: {
            id: string
            push_token: string | null
            language: string | null
            notif_friend_activity: boolean | null
          }) => {
            if (!friend.push_token) return
            // Guard: NULL passes through (only explicit false blocks)
            if (friend.notif_friend_activity === false) return

            const lang = friend.language ?? 'en'
            let pushTitle: string
            let pushBody: string

            if (lang === 'hy') {
              pushTitle = 'Հաշիվ կիսել'
              pushBody  = `${initiatorName}-ը հրավիրել է ձեզ կիսել հաշիվը · ${venueName} · ${share_amount} AMD`
            } else if (lang === 'ru') {
              pushTitle = 'Разделить счёт'
              pushBody  = `${initiatorName} предлагает разделить счёт · ${venueName} · ${share_amount} AMD`
            } else {
              pushTitle = 'Bill Split'
              pushBody  = `${initiatorName} invited you to split the bill · ${venueName} · ${share_amount} AMD`
            }

            await sendPush(friend.push_token, pushTitle, pushBody, { type: 'bill_split', split_id })
          })
        )
      } catch (err) {
        console.error('Fire-and-forget push failed:', err)
      }
    })()

    return response
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'internal_error' }, 500)
  }
})
