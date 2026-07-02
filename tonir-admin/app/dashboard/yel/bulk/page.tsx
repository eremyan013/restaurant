import type { Metadata } from 'next'
import Link from 'next/link'
import { ConfirmButton } from '@/components/confirm-button'
import { BulkAmountInput } from './bulk-amount-input'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { logActivity } from '@/lib/log-activity'
import { calcTierLevel, genYelCode } from '@/lib/yel-logic'
import { requirePagePermission, assertPermission } from '@/lib/permissions'

export const metadata: Metadata = { title: 'Bulk Adjustment — Tonir Admin' }

const BULK_ALL_LIMIT = 500

type FilterType = 'all' | 'visited' | 'tier'

const ALL_SETTING_KEYS = [
  'tier_1_name','tier_2_name','tier_3_name','tier_4_name',
  'tier_2_min', 'tier_3_min', 'tier_4_min',
]

async function loadTierConfig(): Promise<{ names: Record<number,string>; mins: Record<number,number> }> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from('settings').select('key, value').in('key', ALL_SETTING_KEYS)
  const names: Record<number,string> = { 1:'Tonir', 2:'Pandok', 3:'Areni', 4:'Master' }
  const mins:  Record<number,number> = { 1:0, 2:1000, 3:2000, 4:3000 }
  for (const row of (data ?? [])) {
    if (row.key.endsWith('_name')) { const l = parseInt(row.key[5]); if (l>=1&&l<=4) names[l]=row.value }
    if (row.key.endsWith('_min'))  { const l = parseInt(row.key[5]); if (l>=2&&l<=4) mins[l]=parseInt(row.value) }
  }
  return { names, mins }
}

type BulkUserRow = {
  id:         string
  name:       string
  player_id:  number
  yel_points: number
  tier:       string
  tier_level: number
}

async function fetchMatchingUsers(
  filterType: FilterType,
  fromDate: string,
  toDate: string,
  tierLevel: string,
): Promise<BulkUserRow[]> {
  const supabase = createSupabaseAdminClient()

  if (filterType === 'visited') {
    if (!fromDate || !toDate) return []
    const { data: resvData } = await supabase
      .from('reservations')
      .select('user_id')
      .eq('status', 'visited')
      .gte('date_iso', fromDate)
      .lte('date_iso', toDate)
    const ids = [...new Set((resvData ?? []).map((r) => r.user_id))]
    if (!ids.length) return []
    const { data } = await supabase
      .from('profiles')
      .select('id, name, player_id, yel_points, tier, tier_level')
      .in('id', ids)
    return data ?? []
  }

  if (filterType === 'tier') {
    const lvl = parseInt(tierLevel)
    if (!lvl) return []
    const { data } = await supabase
      .from('profiles')
      .select('id, name, player_id, yel_points, tier, tier_level')
      .eq('role', 'user')
      .eq('tier_level', lvl)
    return data ?? []
  }

  // all
  const { data } = await supabase
    .from('profiles')
    .select('id, name, player_id, yel_points, tier, tier_level')
    .eq('role', 'user')
    .limit(BULK_ALL_LIMIT)
  return data ?? []
}

async function applyBulk(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (!actor) return
  if (actor.role !== 'super_admin') {
    const granted = await assertPermission(actor, 'yel', 'bulk')
    if (!granted) return
  }

  const filterType = (formData.get('filter_type') as FilterType) || 'all'
  const fromDate   = formData.get('from_date') as string ?? ''
  const toDate     = formData.get('to_date')   as string ?? ''
  const tierLevel  = formData.get('tier_level') as string ?? ''
  const amount     = parseInt(formData.get('amount') as string, 10)
  if (isNaN(amount) || amount === 0) return

  const supabase = createSupabaseAdminClient()
  const [users, { names, mins }] = await Promise.all([
    fetchMatchingUsers(filterType, fromDate, toDate, tierLevel),
    loadTierConfig(),
  ])

  for (const u of users) {
    const newPoints = Math.max(0, (u.yel_points ?? 0) + amount)
    const oldLevel  = u.tier_level ?? 1
    const newLevel  = calcTierLevel(newPoints, mins)

    await supabase.from('profiles').update({
      yel_points: newPoints,
      tier_level: newLevel,
      tier:       names[newLevel],
    }).eq('id', u.id)

    if (newLevel > oldLevel) {
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const { data: tierPrizes } = await supabase
          .from('prizes').select('id, stock').eq('unlock_type','tier').eq('min_tier_level',lvl).eq('is_active',true)
        for (const prize of (tierPrizes ?? [])) {
          if (prize.stock != null) {
            const { count } = await supabase
              .from('user_prizes').select('id',{count:'exact',head:true}).eq('prize_id',prize.id)
            if ((count??0) >= prize.stock) continue
          }
          await supabase.from('user_prizes').insert({
            user_id: u.id, prize_id: prize.id,
            code: genYelCode(),
            status: 'active',
          })
        }
      }
    }
  }

  await logActivity(actor, 'bulk_adjust_yel', 'profile', 'bulk', `${users.length} users`, { amount, filterType, fromDate, toDate, tierLevel })
  revalidatePath('/dashboard/yel')
  redirect('/dashboard/yel/bulk?applied=1')
}

export default async function BulkYelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'yel', 'bulk')

  const params = await searchParams
  const filterType = (params.filter_type ?? 'all') as FilterType
  const fromDate   = params.from_date  ?? ''
  const toDate     = params.to_date    ?? ''
  const tierLevel  = params.tier_level ?? '1'
  const amount     = params.amount     ?? ''
  const applied    = params.applied    === '1'

  const hasPreview = !!params.filter_type
  const amountNum  = parseInt(amount, 10)

  const [matchingUsers, { names: tierNames, mins: tierMins }] = await Promise.all([
    hasPreview ? fetchMatchingUsers(filterType, fromDate, toDate, tierLevel) : Promise.resolve([]),
    loadTierConfig(),
  ])

  const TIER_COLORS: Record<number,string> = {
    1:'bg-zinc-100 text-zinc-600', 2:'bg-blue-50 text-blue-700',
    3:'bg-violet-50 text-violet-700', 4:'bg-amber-50 text-amber-700',
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/yel" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Yel Points
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Bulk Point Adjustment</h1>
      </div>

      {applied && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">
          Bulk adjustment applied successfully.
        </div>
      )}

      {/* Filter form (GET) */}
      <form method="GET" action="/dashboard/yel/bulk" className="bg-white rounded-xl border border-zinc-200 p-5 space-y-5">
        {/* Criteria */}
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Criteria</h2>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all',     label: 'All users' },
              { key: 'visited', label: 'Visited in period' },
              { key: 'tier',    label: 'By tier level' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter_type"
                  value={key}
                  defaultChecked={filterType === key}
                  className="accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Visited date range */}
        <div className={filterType === 'visited' ? '' : 'opacity-40 pointer-events-none'}>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Date range</h2>
          <div className="flex items-center gap-3">
            <input type="date" name="from_date" defaultValue={fromDate}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            <span className="text-zinc-400 text-sm">to</span>
            <input type="date" name="to_date" defaultValue={toDate}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          </div>
        </div>

        {/* Tier selector */}
        <div className={filterType === 'tier' ? '' : 'opacity-40 pointer-events-none'}>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Tier level</h2>
          <select name="tier_level" defaultValue={tierLevel}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900">
            {([1,2,3,4] as const).map(l => (
              <option key={l} value={l}>Level {l} — {tierNames[l]}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Points to add / subtract</h2>
          <BulkAmountInput initialAmount={amount} />
        </div>

        <button type="submit" className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          Preview
        </button>
      </form>

      {/* Preview */}
      {hasPreview && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-700">
              {matchingUsers.length === 0
                ? 'No users match this filter'
                : `${matchingUsers.length} user${matchingUsers.length !== 1 ? 's' : ''} affected`}
            </h2>
            {!isNaN(amountNum) && amountNum !== 0 && matchingUsers.length > 0 && (
              <span className={`text-sm font-semibold ${amountNum > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {amountNum > 0 ? '+' : ''}{amountNum} pts each
              </span>
            )}
          </div>

          {matchingUsers.length > 0 && !isNaN(amountNum) && amountNum !== 0 && (
            <>
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-4 max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                      <th scope="col" className="px-4 py-3 font-medium text-zinc-500">User</th>
                      <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Tier</th>
                      <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Now</th>
                      <th scope="col" className="px-4 py-3 font-medium text-zinc-500">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingUsers.slice(0, 50).map((u) => {
                      const after = Math.max(0, (u.yel_points ?? 0) + amountNum)
                      const newLevel = calcTierLevel(after, tierMins)
                      const tierChanged = newLevel !== (u.tier_level ?? 1)
                      return (
                        <tr key={u.id} className="border-b border-zinc-100 last:border-0 odd:bg-white even:bg-zinc-50/50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-zinc-900">{u.name}</p>
                            <p className="text-xs text-zinc-400">ID {u.player_id}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[u.tier_level??1]}`}>
                              {u.tier ?? tierNames[u.tier_level??1]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-zinc-700">{(u.yel_points??0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 tabular-nums">
                            <span className={amountNum > 0 ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                              {after.toLocaleString()}
                            </span>
                            {tierChanged && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[newLevel]}`}>
                                → {tierNames[newLevel]}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {matchingUsers.length > 50 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-xs text-zinc-400 text-center">
                          …and {matchingUsers.length - 50} more users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filterType === 'all' && matchingUsers.length === BULK_ALL_LIMIT && (
                <p className="text-xs text-amber-600 mt-2">
                  Showing first 500 users. Use a tier or date filter to target a subset.
                </p>
              )}

              <form action={applyBulk}>
                <input type="hidden" name="filter_type" value={filterType} />
                <input type="hidden" name="from_date"   value={fromDate} />
                <input type="hidden" name="to_date"     value={toDate} />
                <input type="hidden" name="tier_level"  value={tierLevel} />
                <input type="hidden" name="amount"      value={amount} />
                <ConfirmButton
                  message={`Apply ${amountNum > 0 ? '+' : ''}${amountNum} points to ${matchingUsers.length} users?`}
                  className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  Apply to {matchingUsers.length} user{matchingUsers.length !== 1 ? 's' : ''} →
                </ConfirmButton>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
