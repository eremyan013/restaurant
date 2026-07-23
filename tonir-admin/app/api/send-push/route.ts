import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit, RATE_CRITICAL } from '@/lib/rate-limit'

type Target =
  | { type: 'all' }
  | { type: 'tier'; tier: number }
  | { type: 'user'; userId: string }

type Lang = 'hy' | 'ru' | 'en'

interface SendPayload {
  titles: Record<Lang, string>
  bodies: Record<Lang, string>
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
  const rl = await rateLimit(request, RATE_CRITICAL)
  if (rl.limited) return rl.toResponse!()

  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: SendPayload = await request.json()
  const { titles, bodies, target } = body

  const LANGS: Lang[] = ['hy', 'ru', 'en']
  if (LANGS.some((l) => !titles?.[l]?.trim() || !bodies?.[l]?.trim())) {
    return NextResponse.json({ error: 'Title and body are required for all languages' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Fetch target push tokens
  let query = supabase
    .from('profiles')
    .select('id, push_token, language')
    .not('push_token', 'is', null)

  if (target.type === 'tier') {
    query = query.eq('tier_level', target.tier)
  } else if (target.type === 'user') {
    query = query.eq('id', target.userId)
  }

  const { data: profiles, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allProfiles = (profiles ?? []) as Array<{ id: string; push_token: string | null; language: string | null }>

  if (allProfiles.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  const groups: Record<Lang, string[]> = { hy: [], ru: [], en: [] }
  for (const p of allProfiles) {
    const lang: Lang = (p.language as Lang) && LANGS.includes(p.language as Lang)
      ? (p.language as Lang)
      : 'hy'
    if (p.push_token) groups[lang].push(p.push_token)
  }

  const total = groups.hy.length + groups.ru.length + groups.en.length
  if (total === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  const CHUNK = 100
  let totalOk = 0
  let totalFail = 0

  for (const lang of LANGS) {
    const tokens = groups[lang]
    if (tokens.length === 0) continue
    for (let i = 0; i < tokens.length; i += CHUNK) {
      const chunk = tokens.slice(i, i + CHUNK).map((to) => ({
        to,
        title: titles[lang],
        body: bodies[lang],
        sound: 'default',
      }))
      const { ok, fail } = await sendBatch(chunk)
      totalOk += ok
      totalFail += fail
    }
  }

  return NextResponse.json({ sent: totalOk, failed: totalFail, total })
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

  let query = supabase
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
