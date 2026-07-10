import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PrizeActiveToggle, PrizeDeleteButton } from '@/components/prize-list-client'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'

export const metadata: Metadata = { title: 'Prizes — Tonir Admin' }
import { getCurrentAdmin } from '@/lib/current-admin'
import { logActivity } from '@/lib/log-activity'
import type { PrizeRow, UserPrizeRow, VenueRow, SettingRow } from '@/lib/database.types'
import { requirePagePermission } from '@/lib/permissions'

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

async function deletePrize(id: string): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }
  if (!id) return { ok: false, error: 'Invalid prize ID' }
  const supabase = createSupabaseAdminClient()
  const { data: prize } = await supabase
    .from('prizes')
    .select('name')
    .eq('id', id)
    .single()
  const { error: dbError } = await supabase.from('prizes').delete().eq('id', id)
  if (dbError) return { ok: false, error: dbError.message }
  await logActivity(actor, 'delete_prize', 'prize', id, prize?.name ?? id)
  revalidatePath('/dashboard/prizes')
  return { ok: true }
}

export default async function PrizesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'prizes', 'view')

  const sp   = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  const supabase = createSupabaseAdminClient()

  const [prizesRes, claimsRes, venuesRes, settingsRes, statsRes] = await Promise.all([
    supabase.from('prizes').select('id, name, description, type, unlock_type, points_cost, min_tier_level, venue_id, image_url, stock, sort_order, is_active, expires_at, created_at, updated_at', { count: 'exact' }).order('sort_order').order('created_at', { ascending: false }).range(from, to),
    supabase.from('user_prizes').select('prize_id, status'),
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('settings').select('key, value').in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name']),
    supabase.from('prizes').select('is_active, unlock_type', { count: 'exact' }),
  ])

  const prizeRows:  PrizeRow[]                                = prizesRes.data   ?? []
  const totalCount: number                                    = prizesRes.count  ?? 0
  const claims:     Pick<UserPrizeRow, 'prize_id'|'status'>[] = claimsRes.data   ?? []
  const venues:     Pick<VenueRow, 'id'|'name'>[]             = venuesRes.data   ?? []
  const settings:   Pick<SettingRow, 'key' | 'value'>[]       = settingsRes.data ?? []
  const statsRows                                             = statsRes.data    ?? []
  const statsCount                                            = statsRes.count   ?? 0

  const tierNames: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  for (const s of settings) {
    const l = parseInt(s.key[5]); if (l >= 1 && l <= 4) tierNames[l] = s.value
  }
  const venueMap: Record<string, string> = Object.fromEntries(venues.map((v) => [v.id, v.name]))

  const claimCountMap: Record<string, number> = {}
  for (const c of claims) claimCountMap[c.prize_id] = (claimCountMap[c.prize_id] ?? 0) + 1

  const totalPrizes  = statsCount
  const activePrizes = statsRows.filter(p => p.is_active).length
  const marketPrizes = statsRows.filter(p => p.unlock_type === 'points').length
  const tierPerks    = statsRows.filter(p => p.unlock_type === 'tier').length
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

      {prizeRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center">
          <p className="text-zinc-400 text-sm">No prizes yet.</p>
          <Link href="/dashboard/prizes/new" className="mt-3 inline-block text-sm text-zinc-900 font-medium hover:underline">
            Create your first prize →
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">Prize List</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left border-b border-zinc-100">
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Prize</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Type</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Unlock</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Stock</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Claimed</th>
                  <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Active</th>
                  <th scope="col" className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {prizeRows.map((p) => (
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
                      <PrizeActiveToggle
                        prizeName={p.name}
                        isActive={p.is_active ?? false}
                        toggleAction={toggleActive.bind(null, p.id, p.is_active ?? false)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/dashboard/prizes/${p.id}`} className="px-3 py-1.5 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-xs font-medium transition-colors">
                          Edit
                        </Link>
                        <PrizeDeleteButton
                          prizeName={p.name}
                          deleteAction={deletePrize.bind(null, p.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={totalCount}
            prevHref={page > 1 ? `/dashboard/prizes?page=${page - 1}` : null}
            nextHref={page * PAGINATION_SIZE < totalCount ? `/dashboard/prizes?page=${page + 1}` : null}
          />
        </>
      )}
    </div>
  )
}
