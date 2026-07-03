import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import webpush from 'web-push'
import { rateLimit, RATE_NOTIFY } from '@/lib/rate-limit'

webpush.setVapidDetails(
  'mailto:admin@tonir.am',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Notify-Secret',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const notifySecret = process.env.NOTIFY_SECRET
  const headerSecret = request.headers.get('X-Notify-Secret')
  if (!notifySecret || !headerSecret || headerSecret !== notifySecret) {
    return NextResponse.json({ ok: false }, { status: 401, headers: CORS })
  }

  const rl = await rateLimit(request, RATE_NOTIFY)
  if (rl.limited) return NextResponse.json({ ok: false }, { status: 429, headers: CORS })

  const { venue_name, date, time, people } = await request.json() as {
    venue_name: string
    date: string
    time: string
    people: number
  }

  if (!venue_name || !date || !time) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS })
  }

  const supabase = createSupabaseAdminClient()
  const { data: admins } = await supabase
    .from('profiles')
    .select('push_token, web_push_sub')
    .eq('is_admin', true)

  const title = '🍽️ New Reservation Request'
  const body = `${venue_name} · ${date} · ${time} · ${people} ppl`

  const notifications: Promise<unknown>[] = []

  for (const admin of (admins ?? [])) {
    // Web push (browser)
    const webPushSub = admin.web_push_sub as { endpoint?: string } | null
    if (webPushSub?.endpoint) {
      notifications.push(
        webpush.sendNotification(
          admin.web_push_sub as unknown as Parameters<typeof webpush.sendNotification>[0],
          JSON.stringify({ title, body, url: '/dashboard/reservations' }),
        ).catch(() => {})
      )
    }
    // Mobile push (Expo)
    if (admin.push_token) {
      notifications.push(
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ to: admin.push_token, title, body, sound: 'default' }),
        }).catch(() => {})
      )
    }
  }

  await Promise.all(notifications)

  return NextResponse.json({ ok: true }, { headers: CORS })
}
