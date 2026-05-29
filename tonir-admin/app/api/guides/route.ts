import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('guides').insert({
    id: crypto.randomUUID(),
    title: body.title,
    subtitle: body.subtitle,
    tag: body.tag,
    cover_url: body.cover_url,
    sort_order: body.sort_order ?? 0,
    venue_ids: body.venue_ids ?? [],
    is_active: body.is_active ?? true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/dashboard/guides')
  return NextResponse.json({ ok: true })
}
