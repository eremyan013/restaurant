import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { logActivity } from '@/lib/log-activity'
import { PrizeForm } from '@/components/prize-form'
import { validateAction } from '@/lib/validate-action'
import { zPrizeSchema, parsePrizeFormData } from '@/lib/schemas'
import type { VenueRow, SettingRow } from '@/lib/database.types'

export default async function NewPrizePage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const [venuesRes, settingsRes] = await Promise.all([
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('settings').select('key, value').in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name']),
  ])

  const venues: Pick<VenueRow, 'id'|'name'>[] = venuesRes.data ?? []
  const tierNames: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  for (const s of ((settingsRes.data ?? []) as SettingRow[])) {
    const l = parseInt(s.key[5]); if (l >= 1 && l <= 4) tierNames[l] = s.value
  }

  async function createPrize(formData: FormData) {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return

    const parsed = validateAction(zPrizeSchema, parsePrizeFormData(formData))
    if (!parsed.success) return

    const { name, description, type, unlock_type, points_cost, min_tier_level, venue_id, image_url, stock, sort_order, is_active } = parsed.data

    const supabase = createSupabaseAdminClient()
    const { data: inserted } = await supabase
      .from('prizes')
      .insert({
        name, description, type, unlock_type, points_cost, min_tier_level,
        venue_id, image_url, stock, sort_order, is_active,
      })
      .select('id')
      .single()

    await logActivity(actor, 'create_prize', 'prize', inserted?.id ?? '', name)
    redirect('/dashboard/prizes')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/prizes" className="text-sm text-zinc-500 hover:text-zinc-700">← Back to Prizes</a>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">New Prize</h1>
      <PrizeForm action={createPrize} venues={venues} tierNames={tierNames} isNew />
    </div>
  )
}
