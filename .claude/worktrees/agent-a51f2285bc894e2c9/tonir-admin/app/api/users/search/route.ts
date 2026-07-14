import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, name, email, push_token')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data ?? [] })
}
