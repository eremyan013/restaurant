import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { DeleteButton } from '@/components/delete-button'
import { LocationForm } from '@/components/location-form'

export const metadata: Metadata = { title: 'Edit Location — Tonir Admin' }

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single()
  if (error || !data) notFound()

  const location = data

  async function updateLocation(formData: FormData) {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return

    const g = (key: string) => (formData.get(key) as string) ?? ''

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('locations')
      .update({
        name_hy:    g('name_hy'),
        name_ru:    g('name_ru'),
        name_en:    g('name_en'),
        sort_order: parseInt(g('sort_order'), 10) || 0,
        is_active:  formData.get('is_active') === 'true',
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/dashboard/locations')
    redirect('/dashboard/locations')
  }

  async function deleteLocation() {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return
    const supabase = createSupabaseAdminClient()
    await supabase.from('locations').delete().eq('id', id)
    revalidatePath('/dashboard/locations')
    redirect('/dashboard/locations')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/locations" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Locations
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit: {location.name_hy}</h1>
      </div>

      <LocationForm
        action={updateLocation}
        defaults={{
          name_hy:    location.name_hy,
          name_ru:    location.name_ru,
          name_en:    location.name_en,
          sort_order: location.sort_order,
          is_active:  location.is_active,
        }}
      />

      <form action={deleteLocation} className="mt-6">
        <DeleteButton
          label="Delete location"
          confirmMessage={`Delete "${location.name_hy}"? This cannot be undone.`}
        />
      </form>
    </div>
  )
}
