import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

type Target =
  | { type: 'all' }
  | { type: 'tier'; tier: number }
  | { type: 'user'; userId: string }

interface SendPayload {
  title: string
  body: string
  target: Target
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

async function sendBatch(messages: object[]): Promise<{ ok: number; fail: number }> {
  if (messages.length === 0) return { ok: 0, fail: 0 }
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) return { ok: 0, fail: messages.length }
  const json = await res.json()
  const data: Array<{ status: string }> = json.data ?? []
  const ok = data.filter((d) => d.status === 'ok').length
  return { ok, fail: messages.length - ok }
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: SendPayload = await request.json()
  const { title, body: msgBody, target } = body

  if (!title?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Fetch target push tokens
  let query = (supabase as any)
    .from('profiles')
    .select('id, push_token')
    .not('push_token', 'is', null)

  if (target.type === 'tier') {
    query = query.eq('tier_level', target.tier)
  } else if (target.type === 'user') {
    query = query.eq('id', target.userId)
  }

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tokens: string[] = (profiles ?? [])
    .map((p: { push_token: string }) => p.push_token)
    .filter(Boolean)

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  // Send in chunks of 100 (Expo limit)
  const CHUNK = 100
  let totalOk = 0
  let totalFail = 0

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK).map((to) => ({
      to,
      title,
      body: msgBody,
      sound: 'default',
    }))
    const { ok, fail } = await sendBatch(chunk)
    totalOk += ok
    totalFail += fail
  }

  return NextResponse.json({ sent: totalOk, failed: totalFail, total: tokens.length })
}

// Preview: count how many users would receive the notification
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'all'
  const tier = searchParams.get('tier')
  const userId = searchParams.get('userId')

  const supabase = createSupabaseAdminClient()

  let query = (supabase as any)
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('push_token', 'is', null)

  if (type === 'tier' && tier) {
    query = query.eq('tier_level', parseInt(tier))
  } else if (type === 'user' && userId) {
    query = query.eq('id', userId)
  }

  const { count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0 })
}
