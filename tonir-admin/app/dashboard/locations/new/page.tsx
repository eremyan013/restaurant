import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { LocationForm } from '@/components/location-form'

export const metadata: Metadata = { title: 'New Location — Tonir Admin' }

async function createLocation(formData: FormData) {
  'use server'
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return

  const g = (key: string) => (formData.get(key) as string) ?? ''

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('locations').insert({
    name_hy:    g('name_hy'),
    name_ru:    g('name_ru'),
    name_en:    g('name_en'),
    sort_order: parseInt(g('sort_order'), 10) || 0,
    is_active:  formData.get('is_active') === 'true',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/locations')
  redirect('/dashboard/locations')
}

export default async function NewLocationPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/locations" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Locations
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">New location</h1>
      </div>
      <LocationForm action={createLocation} />
    </div>
  )
}
