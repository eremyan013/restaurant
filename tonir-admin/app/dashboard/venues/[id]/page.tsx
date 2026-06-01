import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { DeleteButton } from '@/components/delete-button'
import { VenueFormClient, type VenueFormDefaults } from '@/components/venue-form-client'

async function updateVenue(id: string, formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()

  const g = (key: string) => (formData.get(key) as string) || ''
  const arr = (key: string) => g(key).split(',').map(s => s.trim()).filter(Boolean)

  const name_hy = g('name_hy')

  const { error } = await (supabase as any)
    .from('venues')
    .update({
      name:           name_hy || g('name_ru') || g('name_en'),
      name_hy:        name_hy        || null,
      name_ru:        g('name_ru')   || null,
      name_en:        g('name_en')   || null,
      cuisine:        g('cuisine_hy') || g('cuisine_ru') || g('cuisine_en'),
      cuisine_hy:     g('cuisine_hy')     || null,
      cuisine_ru:     g('cuisine_ru')     || null,
      cuisine_en:     g('cuisine_en')     || null,
      area:           g('area_hy') || g('area_ru') || g('area_en'),
      area_hy:        g('area_hy')        || null,
      area_ru:        g('area_ru')        || null,
      area_en:        g('area_en')        || null,
      description:    g('description_hy') || g('description_ru') || g('description_en'),
      description_hy: g('description_hy') || null,
      description_ru: g('description_ru') || null,
      description_en: g('description_en') || null,
      perk:           g('perk_hy') || g('perk_ru') || g('perk_en'),
      perk_hy:        g('perk_hy')        || null,
      perk_ru:        g('perk_ru')        || null,
      perk_en:        g('perk_en')        || null,
      tags:           arr('tags_hy'),
      tags_hy:        arr('tags_hy').length ? arr('tags_hy') : null,
      tags_ru:        arr('tags_ru').length ? arr('tags_ru') : null,
      tags_en:        arr('tags_en').length ? arr('tags_en') : null,
      price:          g('price'),
      rating:         parseFloat(g('rating')) || 0,
      reviews_count:  parseInt(g('reviews_count')) || 0,
      photo_url:      g('photo_url'),
      dish_url:       g('dish_url'),
      distance_km:    g('distance_km'),
      booked_today:   parseInt(g('booked_today')) || 0,
      heat:           g('heat') as 'high' | 'med' | 'low',
      kind:           g('kind') as 'restaurant' | 'bar' | 'lounge' | 'club',
      coord_x:        parseFloat(g('coord_x')) || 0,
      coord_y:        parseFloat(g('coord_y')) || 0,
      times:          arr('times'),
      is_active:      g('is_active') === 'true',
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

async function deleteVenue(id: string) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('venues').delete().eq('id', id)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const { data: venue, error } = await (supabase as any)
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !venue) notFound()

  const defaults: VenueFormDefaults = {
    id:             venue.id,
    name_hy:        venue.name_hy        ?? venue.name,
    name_ru:        venue.name_ru        ?? '',
    name_en:        venue.name_en        ?? '',
    cuisine_hy:     venue.cuisine_hy     ?? venue.cuisine,
    cuisine_ru:     venue.cuisine_ru     ?? '',
    cuisine_en:     venue.cuisine_en     ?? '',
    area_hy:        venue.area_hy        ?? venue.area,
    area_ru:        venue.area_ru        ?? '',
    area_en:        venue.area_en        ?? '',
    description_hy: venue.description_hy ?? venue.description,
    description_ru: venue.description_ru ?? '',
    description_en: venue.description_en ?? '',
    perk_hy:        venue.perk_hy        ?? venue.perk,
    perk_ru:        venue.perk_ru        ?? '',
    perk_en:        venue.perk_en        ?? '',
    tags_hy:        (venue.tags_hy ?? venue.tags ?? []).join(', '),
    tags_ru:        (venue.tags_ru ?? []).join(', '),
    tags_en:        (venue.tags_en ?? []).join(', '),
    price:          venue.price,
    rating:         String(venue.rating),
    reviews_count:  String(venue.reviews_count),
    photo_url:      venue.photo_url,
    dish_url:       venue.dish_url,
    distance_km:    venue.distance_km,
    booked_today:   String(venue.booked_today),
    heat:           venue.heat,
    kind:           venue.kind,
    coord_x:        String(venue.coord_x),
    coord_y:        String(venue.coord_y),
    times:          (venue.times ?? []).join(', '),
    is_active:      String(venue.is_active),
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/venues" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Venues
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit: {venue.name_hy ?? venue.name}</h1>
      </div>

      <VenueFormClient action={updateVenue.bind(null, id)} defaults={defaults} />

      <form action={deleteVenue.bind(null, id)} className="mt-6">
        <DeleteButton
          label="Delete venue"
          confirmMessage={`Delete "${venue.name_hy ?? venue.name}"? This cannot be undone.`}
        />
      </form>
    </div>
  )
}
