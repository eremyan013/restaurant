import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { GuideRow } from '@/lib/database.types'
import { GuidesManager } from './guides-manager'

export const metadata: Metadata = { title: 'Guides — Tonir Admin' }
import { getCurrentAdmin } from '@/lib/current-admin'
import { requirePagePermission, assertPermission } from '@/lib/permissions'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const actor = await getCurrentAdmin()
  if (!actor) return
  if (actor.role !== 'super_admin') {
    const granted = await assertPermission(actor, 'guides', 'manage')
    if (!granted) return
  }
  const supabase = createSupabaseAdminClient()
  await supabase.from('guides').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/guides')
}

export default async function GuidesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'guides', 'view')

  const supabase = createSupabaseAdminClient()
  const [{ data: guides, error }, { data: venues }] = await Promise.all([
    supabase.from('guides').select('*').order('sort_order'),
    supabase.from('venues').select('id, name').eq('is_active', true).order('name'),
  ])

  if (error) throw error

  return (
    <GuidesManager
      guides={(guides ?? []) as GuideRow[]}
      venues={venues ?? []}
      toggleActive={toggleActive}
    />
  )
}
