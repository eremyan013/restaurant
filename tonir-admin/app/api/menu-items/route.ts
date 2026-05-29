import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from('menu_items').insert({
    venue_id: body.venue_id,
    category_id: body.category_id,
    name: body.name,
    description: body.description ?? null,
    price: body.price,
    photo_url: body.photo_url ?? null,
    is_available: true,
    is_popular: body.is_popular ?? false,
    allergens: body.allergens ?? [],
    sort_order: body.sort_order ?? 0,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath(`/dashboard/menus/${body.venue_id}`)
  return NextResponse.json({ ok: true })
}
