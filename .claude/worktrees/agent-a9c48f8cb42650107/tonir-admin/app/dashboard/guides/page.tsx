import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { GuideRow } from '@/lib/database.types'
import { GuidesManager } from './guides-manager'
import { getCurrentAdmin } from '@/lib/current-admin'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('guides').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/guides')
}

export default async function GuidesPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

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
