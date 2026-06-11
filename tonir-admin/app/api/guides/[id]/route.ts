import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit, RATE_WRITE } from '@/lib/rate-limit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, RATE_WRITE)
  if (rl.limited) return rl.toResponse!()

  const { id } = await params
  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('guides').update({
    title:       body.title,
    title_hy:    body.title_hy    ?? null,
    title_ru:    body.title_ru    ?? null,
    title_en:    body.title_en    ?? null,
    subtitle:    body.subtitle,
    subtitle_hy: body.subtitle_hy ?? null,
    subtitle_ru: body.subtitle_ru ?? null,
    subtitle_en: body.subtitle_en ?? null,
    tag:         body.tag,
    tag_hy:      body.tag_hy      ?? null,
    tag_ru:      body.tag_ru      ?? null,
    tag_en:      body.tag_en      ?? null,
    cover_url:   body.cover_url,
    sort_order:  body.sort_order  ?? 0,
    venue_ids:   body.venue_ids   ?? [],
    is_active:   body.is_active,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/dashboard/guides')
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(_request, RATE_WRITE)
  if (rl.limited) return rl.toResponse!()

  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('guides').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/dashboard/guides')
  return NextResponse.json({ ok: true })
}
