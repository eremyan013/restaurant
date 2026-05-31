import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseSessionClient } from '@/lib/supabase-session'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const session = await createSupabaseSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription } = await request.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  await (admin as any).from('profiles').update({ web_push_sub: subscription }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await createSupabaseSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  await (admin as any).from('profiles').update({ web_push_sub: null }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
