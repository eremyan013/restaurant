import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { HomeSectionsClient } from './home-sections-client'
import {
  reorderSections,
  reorderItems,
  toggleSection,
  updateSectionMeta,
  addItem,
  removeItem,
  createSection,
  deleteSection,
} from './actions'

export const metadata: Metadata = { title: 'Home Sections — Tonir Admin' }

export default async function HomeSectionsPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [sectionsResult, venuesResult, guidesResult] = await Promise.all([
    supabase
      .from('home_sections')
      .select(`
        *,
        home_section_items (
          *,
          venue:venues ( id, name, photo_url )
        )
      `)
      .order('sort_order', { ascending: true }),
    supabase
      .from('venues')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('guides')
      .select('id, title')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (sectionsResult.error) throw sectionsResult.error

  return (
    <HomeSectionsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialSections={(sectionsResult.data ?? []) as any}
      availableVenues={venuesResult.data ?? []}
      availableGuides={guidesResult.data ?? []}
      reorderSections={reorderSections}
      reorderItems={reorderItems}
      toggleSection={toggleSection}
      updateSectionMeta={updateSectionMeta}
      addItem={addItem}
      removeItem={removeItem}
      createSection={createSection}
      deleteSection={deleteSection}
    />
  )
}
