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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  if ('name'           in body) update.name           = body.name
  if ('name_hy'        in body) update.name_hy        = body.name_hy
  if ('name_ru'        in body) update.name_ru        = body.name_ru
  if ('name_en'        in body) update.name_en        = body.name_en
  if ('description'    in body) update.description    = body.description
  if ('description_hy' in body) update.description_hy = body.description_hy
  if ('description_ru' in body) update.description_ru = body.description_ru
  if ('description_en' in body) update.description_en = body.description_en
  if ('price'          in body) update.price          = body.price
  if ('photo_url'      in body) update.photo_url      = body.photo_url
  if ('allergens'      in body) update.allergens      = body.allergens
  if ('allergens_hy'   in body) update.allergens_hy   = body.allergens_hy
  if ('allergens_ru'   in body) update.allergens_ru   = body.allergens_ru
  if ('allergens_en'   in body) update.allergens_en   = body.allergens_en
  if ('sort_order'     in body) update.sort_order     = body.sort_order
  if ('is_available'   in body) update.is_available   = body.is_available
  if ('is_popular'     in body) update.is_popular     = body.is_popular

  const { error } = await (supabase as any).from('menu_items').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.venue_id) revalidatePath(`/dashboard/menus/${body.venue_id}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, RATE_WRITE)
  if (rl.limited) return rl.toResponse!()

  const { id } = await params
  const venueId = new URL(request.url).searchParams.get('venueId')
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (venueId) revalidatePath(`/dashboard/menus/${venueId}`)
  return NextResponse.json({ ok: true })
}
