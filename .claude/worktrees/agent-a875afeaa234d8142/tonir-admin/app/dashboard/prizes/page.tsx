import Link from 'next/link'
import { ConfirmButton } from '@/components/confirm-button'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { PrizeRow, UserPrizeRow, VenueRow, SettingRow } from '@/lib/database.types'

const TYPE_LABELS: Record<string, string> = {
  discount:   'Discount',
  free_item:  'Free Item',
  experience: 'Experience',
  voucher:    'Voucher',
}

const TYPE_COLORS: Record<string, string> = {
  discount:   'bg-blue-50 text-blue-700',
  free_item:  'bg-green-50 text-green-700',
  experience: 'bg-violet-50 text-violet-700',
  voucher:    'bg-amber-50 text-amber-700',
}

async function toggleActive(id: string, current: boolean) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('prizes').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/prizes')
}

async function deletePrize(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const id = formData.get('id') as string
  if (!id) return
  const supabase = createSupabaseAdminClient()
  await supabase.from('prizes').delete().eq('id', id)
  revalidatePath('/dashboard/prizes')
}

export default async function PrizesPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [prizesRes, claimsRes, venuesRes, settingsRes] = await Promise.all([
    supabase.from('prizes').select('*').order('sort_order').order('created_at', { ascending: false }),
    supabase.from('user_prizes').select('prize_id, status'),
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('settings').select('key, value').in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name']),
  ])

  const prizes:   PrizeRow[]                                = prizesRes.data   ?? []
  const claims:   Pick<UserPrizeRow, 'prize_id'|'status'>[] = claimsRes.data   ?? []
  const venues:   Pick<VenueRow, 'id'|'name'>[]             = venuesRes.data   ?? []
  const settings: Pick<SettingRow, 'key' | 'value'>[]       = settingsRes.data ?? []

  const tierNames: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  for (const s of settings) {
    const l = parseInt(s.key[5]); if (l >= 1 && l <= 4) tierNames[l] = s.value
  }
  const venueMap: Record<string, string> = Object.fromEntries(venues.map((v) => [v.id, v.name]))

  const claimCountMap: Record<string, number> = {}
  for (const c of claims) claimCountMap[c.prize_id] = (claimCountMap[c.prize_id] ?? 0) + 1

  const totalPrizes  = prizes.length
  const activePrizes = prizes.filter(p => p.is_active).length
  const marketPrizes = prizes.filter(p => p.unlock_type === 'points').length
  const tierPerks    = prizes.filter(p => p.unlock_type === 'tier').length
  const totalClaimed = claims.length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Prizes</h1>
        <Link href="/dashboard/prizes/new" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          + New prize
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total prizes',   value: totalPrizes },
          { label: 'Active',         value: activePrizes },
          { label: 'Market prizes',  value: marketPrizes },
          { label: 'Tier perks',     value: tierPerks },
          { label: 'Total claimed',  value: totalClaimed },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="text-xl font-semibold text-zinc-900 mt-0.5 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {prizes.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No prizes yet.</p>
          <Link href="/dashboard/prizes/new" className="mt-3 inline-block text-sm text-zinc-900 font-medium hover:underline">
            Create your first prize →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                <th className="px-4 py-3 font-medium text-zinc-500">Prize</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Type</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Unlock</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Stock</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Claimed</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {prizes.map((p) => (
                <tr key={p.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{p.name}</p>
                    {p.description && <p className="text-xs text-zinc-400 truncate max-w-[220px]">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.unlock_type === 'points' ? (
                      <span className="text-zinc-700">{(p.points_cost ?? 0).toLocaleString()} pts</span>
                    ) : (
                      <span className="text-zinc-700">Level {p.min_tier_level} — {tierNames[p.min_tier_level ?? 0]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.venue_id ? (venueMap[p.venue_id] ?? '—') : 'All venues'}</td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">
                    {p.stock != null ? p.stock : <span className="text-zinc-400">∞</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 tabular-nums">{claimCountMap[p.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <form action={toggleActive.bind(null, p.id, p.is_active)}>
                      <button
                        type="submit"
                        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${p.is_active ? 'bg-green-500' : 'bg-zinc-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/prizes/${p.id}`} className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors">
                        Edit
                      </Link>
                      <form action={deletePrize}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton
                          message={`Delete "${p.name}"?`}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
