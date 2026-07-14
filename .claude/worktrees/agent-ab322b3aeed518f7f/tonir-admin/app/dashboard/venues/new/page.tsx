import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export const metadata: Metadata = { title: 'New Venue — Tonir Admin' }
import { logActivity } from '@/lib/log-activity'
import { VenueFormClient } from '@/components/venue-form-client'

async function createVenue(formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()

  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('Venue ID is required')

  const g = (key: string) => (formData.get(key) as string) || ''
  const arr = (key: string) => g(key).split(',').map(s => s.trim()).filter(Boolean)

  const name_hy = g('name_hy')

  const { error } = await supabase.from('venues').insert({
    id,
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
    reviews_count:  0,
    photo_url:      g('photo_url'),
    dish_url:       g('dish_url'),
    distance_km:    g('distance_km'),
    booked_today:   0,
    heat:           g('heat') as 'high' | 'med' | 'low',
    kind:           g('kind') as 'restaurant' | 'bar' | 'lounge' | 'club',
    coord_x:        parseFloat(g('coord_x')) || 0,
    coord_y:        parseFloat(g('coord_y')) || 0,
    times:          arr('times'),
    is_active:      g('is_active') === 'true',
  })

  if (error) throw new Error(error.message)
  await logActivity(admin, 'create_venue', 'venue', id, name_hy || g('name_ru') || g('name_en') || id)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

export default async function NewVenuePage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/venues" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Venues
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">New venue</h1>
      </div>
      <VenueFormClient action={createVenue} isNew />
    </div>
  )
}
