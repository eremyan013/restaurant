import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit, RATE_WRITE } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RATE_WRITE)
  if (rl.limited) return rl.toResponse!()
  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  const { error } = await (supabase as any).from('menu_items').insert({
    venue_id:       body.venue_id,
    category_id:    body.category_id,
    name:           body.name,
    name_hy:        body.name_hy        ?? null,
    name_ru:        body.name_ru        ?? null,
    name_en:        body.name_en        ?? null,
    description:    body.description    ?? null,
    description_hy: body.description_hy ?? null,
    description_ru: body.description_ru ?? null,
    description_en: body.description_en ?? null,
    price:          body.price,
    photo_url:      body.photo_url      ?? null,
    is_available:   true,
    is_popular:     body.is_popular     ?? false,
    allergens:      body.allergens      ?? [],
    allergens_hy:   body.allergens_hy   ?? null,
    allergens_ru:   body.allergens_ru   ?? null,
    allergens_en:   body.allergens_en   ?? null,
    sort_order:     body.sort_order     ?? 0,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath(`/dashboard/menus/${body.venue_id}`)
  return NextResponse.json({ ok: true })
}
