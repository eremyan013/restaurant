import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { GuideRow } from '@/lib/database.types'
import { GuidesManager } from './guides-manager'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('guides').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/guides')
}

export default async function GuidesPage() {
  const supabase = createSupabaseAdminClient()
  const [{ data: guides, error }, { data: venues }] = await Promise.all([
    (supabase as any).from('guides').select('*').order('sort_order'),
    (supabase as any).from('venues').select('id, name').eq('is_active', true).order('name'),
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
