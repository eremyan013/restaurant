import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  const update: Record<string, unknown> = {}
  if ('name' in body)         update.name = body.name
  if ('description' in body)  update.description = body.description
  if ('price' in body)        update.price = body.price
  if ('photo_url' in body)    update.photo_url = body.photo_url
  if ('allergens' in body)    update.allergens = body.allergens
  if ('sort_order' in body)   update.sort_order = body.sort_order
  if ('is_available' in body) update.is_available = body.is_available
  if ('is_popular' in body)   update.is_popular = body.is_popular

  const { error } = await supabase.from('menu_items').update(update).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.venue_id) revalidatePath(`/dashboard/menus/${body.venue_id}`)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const venueId = new URL(request.url).searchParams.get('venueId')
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (venueId) revalidatePath(`/dashboard/menus/${venueId}`)
  return NextResponse.json({ ok: true })
}
