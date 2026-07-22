import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit, RATE_READ } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, RATE_READ)
  if (rl.limited) return rl.toResponse!()

  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'all'
  const tier = searchParams.get('tier')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20)

  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('profiles')
    .select('id, name, email, push_token', { count: 'exact' })
    .not('role', 'in', '("admin","super_admin")')
    .order('name', { ascending: true })

  if (type === 'tier' && tier) {
    query = query.eq('tier_level', parseInt(tier))
  }

  let { data, count, error } = await query.limit(limit)

  if (error) {
    // Fallback without role filter
    let fallbackQuery = supabase
      .from('profiles')
      .select('id, name, email, push_token', { count: 'exact' })
      .order('name', { ascending: true })
    if (type === 'tier' && tier) fallbackQuery = fallbackQuery.eq('tier_level', parseInt(tier))
    const fallback = await fallbackQuery.limit(limit)
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    data = fallback.data
    count = fallback.count
    error = null
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 })
}
