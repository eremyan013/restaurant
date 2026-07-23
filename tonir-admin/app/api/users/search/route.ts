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

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, push_token')
    .not('role', 'in', '("admin","super_admin")')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,id::text.ilike.%${q}%`)
    .limit(10)

  if (error) {
    // Fallback: if role filter fails (e.g. unexpected role values), search without it
    const { data: fallback, error: fallbackErr } = await supabase
      .from('profiles')
      .select('id, name, email, push_token')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%,id::text.ilike.%${q}%`)
      .limit(10)
    if (fallbackErr) return NextResponse.json({ error: fallbackErr.message }, { status: 500 })
    return NextResponse.json({ users: fallback ?? [] })
  }

  return NextResponse.json({ users: data ?? [] })
}
