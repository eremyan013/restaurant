import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { PrizeForm } from '@/components/prize-form'

export default async function NewPrizePage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const [venuesRes, settingsRes] = await Promise.all([
    (supabase as any).from('venues').select('id, name').order('name'),
    (supabase as any).from('settings').select('key, value').in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name']),
  ])

  const venues: any[] = venuesRes.data ?? []
  const tierNames: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  for (const s of (settingsRes.data ?? [])) {
    const l = parseInt(s.key[5]); if (l >= 1 && l <= 4) tierNames[l] = s.value
  }

  async function createPrize(formData: FormData) {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return

    const unlockType = formData.get('unlock_type') as string
    const unlimitedStock = formData.get('unlimited_stock') === 'on'
    const stockRaw = formData.get('stock') as string

    const supabase = createSupabaseAdminClient()
    await (supabase as any).from('prizes').insert({
      name:          (formData.get('name') as string).trim(),
      description:   (formData.get('description') as string)?.trim() || null,
      type:          formData.get('type') as string,
      unlock_type:   unlockType,
      points_cost:   unlockType === 'points' ? parseInt(formData.get('points_cost') as string) : null,
      min_tier_level: unlockType === 'tier'  ? parseInt(formData.get('min_tier_level') as string) : null,
      venue_id:      (formData.get('venue_id') as string) || null,
      image_url:     (formData.get('image_url') as string)?.trim() || null,
      stock:         (!unlimitedStock && stockRaw) ? parseInt(stockRaw) : null,
      sort_order:    parseInt(formData.get('sort_order') as string) || 0,
      is_active:     formData.get('is_active') === 'true',
    })
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
