import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

async function createVenue(formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()

  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('Venue ID is required')

  const { error } = await supabase.from('venues').insert({
    id,
    name: formData.get('name') as string,
    cuisine: formData.get('cuisine') as string,
    area: formData.get('area') as string,
    price: formData.get('price') as string,
    rating: parseFloat(formData.get('rating') as string),
    reviews_count: parseInt(formData.get('reviews_count') as string) || 0,
    photo_url: formData.get('photo_url') as string,
    dish_url: formData.get('dish_url') as string,
    distance_km: formData.get('distance_km') as string,
    booked_today: parseInt(formData.get('booked_today') as string) || 0,
    heat: formData.get('heat') as 'high' | 'med' | 'low',
    kind: formData.get('kind') as 'restaurant' | 'bar' | 'lounge' | 'club',
    coord_x: parseFloat(formData.get('coord_x') as string) || 0,
    coord_y: parseFloat(formData.get('coord_y') as string) || 0,
    description: formData.get('description') as string,
    times: (formData.get('times') as string)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    perk: formData.get('perk') as string,
    tags: (formData.get('tags') as string)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    is_active: formData.get('is_active') === 'true',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  redirect('/dashboard/venues')
}

export default function NewVenuePage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/venues"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Venues
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">New venue</h1>
      </div>

      <form action={createVenue} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <VenueFields />
        <div className="pt-2 border-t border-zinc-100">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Create venue
          </button>
        </div>
      </form>
    </div>
  )
}

export function VenueFields({ defaults }: { defaults?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <F label="ID (slug)" name="id" required defaultValue={defaults?.id} />
      <F label="Name" name="name" required defaultValue={defaults?.name} />
      <F label="Cuisine" name="cuisine" required defaultValue={defaults?.cuisine} />
      <F label="Area" name="area" required defaultValue={defaults?.area} />
      <F label="Price (e.g. $$)" name="price" required defaultValue={defaults?.price} />
      <F label="Rating (0–5)" name="rating" type="number" step="0.1" min="0" max="5" required defaultValue={defaults?.rating} />
      <F label="Reviews count" name="reviews_count" type="number" defaultValue={defaults?.reviews_count ?? '0'} />
      <F label="Booked today" name="booked_today" type="number" defaultValue={defaults?.booked_today ?? '0'} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Heat</label>
        <select name="heat" defaultValue={defaults?.heat ?? 'med'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
          <option value="high">high</option>
          <option value="med">med</option>
          <option value="low">low</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Kind</label>
        <select name="kind" defaultValue={defaults?.kind ?? 'restaurant'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
          <option value="restaurant">restaurant</option>
          <option value="bar">bar</option>
          <option value="lounge">lounge</option>
          <option value="club">club</option>
        </select>
      </div>

      <F label="Photo URL" name="photo_url" type="url" required defaultValue={defaults?.photo_url} />
      <F label="Dish URL" name="dish_url" type="url" required defaultValue={defaults?.dish_url} />
      <F label="Distance (km)" name="distance_km" defaultValue={defaults?.distance_km} />
      <F label="Coord X (lat)" name="coord_x" type="number" step="any" defaultValue={defaults?.coord_x ?? '40'} />
      <F label="Coord Y (lng)" name="coord_y" type="number" step="any" defaultValue={defaults?.coord_y ?? '44'} />
      <F label="Perk" name="perk" defaultValue={defaults?.perk} />

      <div className="sm:col-span-2 flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Description</label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={defaults?.description}
          className="px-3 py-2 rounded-lg border border-zinc-300 text-sm resize-none"
        />
      </div>

      <div className="sm:col-span-2 flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Times (comma-separated, e.g. 12:00, 13:00, 14:00)
        </label>
        <input
          type="text"
          name="times"
          required
          defaultValue={defaults?.times}
          className="h-10 px-3 rounded-lg border border-zinc-300 text-sm"
        />
      </div>

      <div className="sm:col-span-2 flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          name="tags"
          defaultValue={defaults?.tags}
          className="h-10 px-3 rounded-lg border border-zinc-300 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">Active</label>
        <select name="is_active" defaultValue={defaults?.is_active ?? 'true'} className="h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    </div>
  )
}

function F({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  step,
  min,
  max,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  step?: string
  min?: string
  max?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        step={step}
        min={min}
        max={max}
        className="h-10 px-3 rounded-lg border border-zinc-300 text-sm"
      />
    </div>
  )
}
