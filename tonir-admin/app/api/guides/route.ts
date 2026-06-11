import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { zGuideSchema } from '@/lib/schemas'
import { rateLimit, RATE_WRITE } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RATE_WRITE)
  if (rl.limited) return rl.toResponse!()
  const body = await request.json()

  const result = zGuideSchema.safeParse(body)
  if (!result.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('guides').insert({
    id:          crypto.randomUUID(),
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
    is_active:   body.is_active   ?? true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/dashboard/guides')
  return NextResponse.json({ ok: true })
}
