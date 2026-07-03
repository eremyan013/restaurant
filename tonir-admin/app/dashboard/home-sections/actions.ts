'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/current-admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { z } from 'zod'

/**
 * Returns a service-role Supabase client after asserting the caller is a super_admin.
 * Throws 'Forbidden' for any other role — never reaches the DB layer.
 */
async function getAdminClient() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') throw new Error('Forbidden')
  return createSupabaseAdminClient()
}

export type AddedItem = {
  id: string
  section_id: string
  sort_order: number
  item_type: 'venue' | 'guide'
  venue_id: string | null
  guide_id: string | null
}

// ─── Section ordering ─────────────────────────────────────────────────────────

export async function reorderSections(orderedIds: string[]): Promise<void> {
  const supabase = await getAdminClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('home_sections').update({ sort_order: index }).eq('id', id)
    )
  )
  revalidatePath('/dashboard/home-sections')
}

export async function reorderItems(sectionId: string, orderedIds: string[]): Promise<void> {
  const supabase = await getAdminClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('home_section_items').update({ sort_order: index }).eq('id', id)
    )
  )
  revalidatePath('/dashboard/home-sections')
}

// ─── Section visibility ───────────────────────────────────────────────────────

export async function toggleSection(id: string, current: boolean): Promise<void> {
  const supabase = await getAdminClient()
  await supabase.from('home_sections').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/home-sections')
}

// ─── Section metadata ─────────────────────────────────────────────────────────

const MetaSchema = z.object({
  name:       z.string().min(1).max(80),
  name_hy:    z.string().max(80).nullable(),
  name_ru:    z.string().max(80).nullable(),
  name_en:    z.string().max(80).nullable(),
  eyebrow:    z.string().max(80),
  eyebrow_hy: z.string().max(80).nullable(),
  eyebrow_ru: z.string().max(80).nullable(),
  eyebrow_en: z.string().max(80).nullable(),
})
export type UpdateMetaPayload = z.infer<typeof MetaSchema>

export async function updateSectionMeta(
  id: string,
  payload: UpdateMetaPayload
): Promise<{ error?: string }> {
  const parsed = MetaSchema.safeParse(payload)
  if (!parsed.success) return { error: 'Invalid input' }
  const supabase = await getAdminClient()
  const { error } = await supabase
    .from('home_sections')
    .update(parsed.data)
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/home-sections')
  return {}
}

// ─── Section items ────────────────────────────────────────────────────────────

export async function addItem(
  sectionId: string,
  itemType: 'venue' | 'guide',
  itemId: string
): Promise<{ error?: string; item?: AddedItem }> {
  const supabase = await getAdminClient()
  // Determine next sort_order from current item count in this section
  const { count } = await supabase
    .from('home_section_items')
    .select('*', { count: 'exact', head: true })
    .eq('section_id', sectionId)
  const sortOrder = count ?? 0
  const { data, error } = await supabase.from('home_section_items').insert({
    section_id: sectionId,
    item_type:  itemType,
    venue_id:   itemType === 'venue' ? itemId : null,
    guide_id:   itemType === 'guide' ? itemId : null,
    sort_order: sortOrder,
  }).select('id, section_id, sort_order, item_type, venue_id, guide_id').single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/home-sections')
  return { item: data }
}

export async function removeItem(itemId: string): Promise<void> {
  const supabase = await getAdminClient()
  await supabase.from('home_section_items').delete().eq('id', itemId)
  revalidatePath('/dashboard/home-sections')
}

// ─── Section creation / deletion ──────────────────────────────────────────────

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  section_type: z.enum(['venue', 'guide']),
})
export type CreateSectionPayload = z.infer<typeof CreateSchema>

export async function createSection(
  payload: CreateSectionPayload
): Promise<{ error?: string }> {
  const parsed = CreateSchema.safeParse(payload)
  if (!parsed.success) return { error: 'Invalid input' }
  const supabase = await getAdminClient()
  // Place the new section after all existing ones
  const { count } = await supabase
    .from('home_sections')
    .select('*', { count: 'exact', head: true })
  const { error } = await supabase.from('home_sections').insert({
    name:         parsed.data.name,
    section_type: parsed.data.section_type,
    sort_order:   count ?? 99,
    is_builtin:   false,
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard/home-sections')
  return {}
}

export async function deleteSection(id: string): Promise<{ error?: string }> {
  const supabase = await getAdminClient()
  // Guard: built-in sections cannot be deleted
  const { data } = await supabase
    .from('home_sections')
    .select('is_builtin')
    .eq('id', id)
    .single()
  if (data?.is_builtin) return { error: 'Built-in sections cannot be deleted' }
  await supabase.from('home_sections').delete().eq('id', id)
  revalidatePath('/dashboard/home-sections')
  return {}
}
