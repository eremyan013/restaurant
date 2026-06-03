import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { YelAdjustForm } from '@/components/yel-adjust-form'
import { TierSettingsForm } from '@/components/tier-settings-form'

const TIER_COLORS: Record<number, string> = {
  1: 'bg-zinc-100 text-zinc-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-violet-50 text-violet-700',
  4: 'bg-amber-50 text-amber-700',
}

const ALL_SETTING_KEYS = [
  'tier_1_name', 'tier_2_name', 'tier_3_name', 'tier_4_name',
  'tier_2_min',  'tier_3_min',  'tier_4_min',
]

type TierSettings = {
  names: Record<number, string>
  mins:  Record<number, number>  // level -> min points (level 1 always 0)
}

async function loadTierSettings(): Promise<TierSettings> {
  const supabase = createSupabaseAdminClient()
  const { data } = await (supabase as any)
    .from('settings').select('key, value').in('key', ALL_SETTING_KEYS)

  const names: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  const mins:  Record<number, number> = { 1: 0, 2: 1000, 3: 2000, 4: 3000 }

  for (const row of (data ?? [])) {
    if (row.key.endsWith('_name')) {
      const level = parseInt(row.key[5])
      if (level >= 1 && level <= 4) names[level] = row.value
    } else if (row.key.endsWith('_min')) {
      const level = parseInt(row.key[5])
      if (level >= 2 && level <= 4) mins[level] = parseInt(row.value)
    }
  }
  return { names, mins }
}

function calcTierLevel(points: number, mins: Record<number, number>): number {
  if (points >= mins[4]) return 4
  if (points >= mins[3]) return 3
  if (points >= mins[2]) return 2
  return 1
}

function genCode() {
  return 'YEL-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function adjustPoints(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const userId = formData.get('user_id') as string
  const amount = parseInt(formData.get('amount') as string, 10)
  if (!userId || isNaN(amount)) return

  const supabase = createSupabaseAdminClient()
  const [profileRes, settingsRes] = await Promise.all([
    (supabase as any).from('profiles').select('yel_points, tier_level').eq('id', userId).single(),
    (supabase as any).from('settings').select('key, value').in('key', ALL_SETTING_KEYS),
  ])
  if (!profileRes.data) return

  const names: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  const mins:  Record<number, number> = { 1: 0, 2: 1000, 3: 2000, 4: 3000 }
  for (const row of (settingsRes.data ?? [])) {
    if (row.key.endsWith('_name')) { const l = parseInt(row.key[5]); if (l >= 1 && l <= 4) names[l] = row.value }
    if (row.key.endsWith('_min'))  { const l = parseInt(row.key[5]); if (l >= 2 && l <= 4) mins[l]  = parseInt(row.value) }
  }

  const oldLevel  = profileRes.data.tier_level ?? 1
  const newPoints = Math.max(0, (profileRes.data.yel_points ?? 0) + amount)
  const newLevel  = calcTierLevel(newPoints, mins)

  await (supabase as any).from('profiles').update({
    yel_points: newPoints,
    tier_level: newLevel,
    tier: names[newLevel],
  }).eq('id', userId)

  // Auto-assign tier prizes for every newly unlocked level
  if (newLevel > oldLevel) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      const { data: tierPrizes } = await (supabase as any)
        .from('prizes')
        .select('id, stock')
        .eq('unlock_type', 'tier')
        .eq('min_tier_level', lvl)
        .eq('is_active', true)

      for (const prize of (tierPrizes ?? [])) {
        // Check stock
        if (prize.stock != null) {
          const { count } = await (supabase as any)
            .from('user_prizes').select('id', { count: 'exact', head: true }).eq('prize_id', prize.id)
          if ((count ?? 0) >= prize.stock) continue
        }
        await (supabase as any).from('user_prizes').insert({
          user_id:  userId,
          prize_id: prize.id,
          code:     genCode(),
          status:   'active',
        })
      }
    }
  }

  revalidatePath('/dashboard/yel')
}

async function saveTierSettings(formData: FormData) {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const supabase = createSupabaseAdminClient()

  const upserts = [
    { key: 'tier_1_name', value: (formData.get('tier_1_name') as string)?.trim() || 'Level 1' },
    { key: 'tier_2_name', value: (formData.get('tier_2_name') as string)?.trim() || 'Level 2' },
    { key: 'tier_3_name', value: (formData.get('tier_3_name') as string)?.trim() || 'Level 3' },
    { key: 'tier_4_name', value: (formData.get('tier_4_name') as string)?.trim() || 'Level 4' },
    { key: 'tier_2_min',  value: formData.get('tier_2_min') as string || '1000' },
    { key: 'tier_3_min',  value: formData.get('tier_3_min') as string || '2000' },
    { key: 'tier_4_min',  value: formData.get('tier_4_min') as string || '3000' },
  ]

  await (supabase as any).from('settings').upsert(upserts, { onConflict: 'key' })

  const names = Object.fromEntries(upserts.filter(u => u.key.endsWith('_name')).map(u => [
    parseInt(u.key[5]), u.value,
  ])) as Record<number, string>
  const mins = Object.fromEntries(upserts.filter(u => u.key.endsWith('_min')).map(u => [
    parseInt(u.key[5]), parseInt(u.value),
  ])) as Record<number, number>
  mins[1] = 0

  // Re-assign tier + tier_level for all users based on new thresholds
  const { data: users } = await (supabase as any)
    .from('profiles').select('id, yel_points').eq('role', 'user')

  for (const u of (users ?? [])) {
    const level = calcTierLevel(u.yel_points ?? 0, mins)
    await (supabase as any).from('profiles')
      .update({ tier_level: level, tier: names[level] })
      .eq('id', u.id)
  }

  revalidatePath('/dashboard/yel')
}

export default async function YelPage() {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [profilesRes, recentRes, { names: tierNames, mins: tierMins }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, player_id, name, email, yel_points, tier, tier_level, total_visits')
      .eq('role', 'user')
      .order('yel_points', { ascending: false }),
    (supabase as any)
      .from('reservations')
      .select('id, date, yel_earned, profiles(name, player_id), venues(name)')
      .eq('status', 'visited')
      .order('created_at', { ascending: false })
      .limit(30),
    loadTierSettings(),
  ])

  const users: any[]  = profilesRes.data ?? []
  const recent: any[] = recentRes.data ?? []

  const totalPoints     = users.reduce((s, u) => s + (u.yel_points ?? 0), 0)
  const usersWithPoints = users.filter(u => u.yel_points > 0).length
  const avgPoints       = usersWithPoints > 0 ? Math.round(totalPoints / usersWithPoints) : 0
  const totalVisits     = users.reduce((s, u) => s + (u.total_visits ?? 0), 0)

  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const u of users) tierCounts[u.tier_level ?? 1] = (tierCounts[u.tier_level ?? 1] ?? 0) + 1

  function tierRange(level: number) {
    const from = tierMins[level]
    const to   = level < 4 ? tierMins[level + 1] - 1 : null
    return to !== null ? `${from.toLocaleString()} – ${to.toLocaleString()} pts` : `${from.toLocaleString()}+ pts`
  }

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Yel Points</h1>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Points in circulation" value={totalPoints.toLocaleString()} />
        <StatCard label="Users with points"     value={usersWithPoints.toLocaleString()} />
        <StatCard label="Avg per active user"   value={avgPoints.toLocaleString()} />
        <StatCard label="Total visits"          value={totalVisits.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier distribution */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">Tier Distribution</h2>
          <div className="space-y-3">
            {([4, 3, 2, 1] as const).map(level => {
              const count = tierCounts[level] ?? 0
              const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[level]}`}>
                        {tierNames[level]}
                      </span>
                      <span className="text-xs text-zinc-400">Level {level}</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-700">{count}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-500">
            <p className="font-medium text-zinc-700 mb-2">Tier thresholds</p>
            {([1, 2, 3, 4] as const).map(level => (
              <p key={level}>{tierNames[level]} — {tierRange(level)}</p>
            ))}
          </div>
        </div>

        {/* Manual adjustment */}
        <div className="lg:col-span-2">
          <YelAdjustForm users={users} adjustPoints={adjustPoints} />
        </div>
      </div>

      {/* Tier settings */}
      <TierSettingsForm tierNames={tierNames} tierMins={tierMins} saveTierSettings={saveTierSettings} />

      {/* Top earners */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Top Earners</h2>
          <span className="text-xs text-zinc-400">Top {Math.min(users.length, 20)} users</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500 w-8">#</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Player</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tier</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Points</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Visits</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 20).map((u, i) => (
              <tr key={u.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors">
                <td className="px-4 py-3 text-zinc-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/users/${u.id}`} className="font-medium text-zinc-900 hover:text-zinc-600">
                    {u.name}
                  </Link>
                  <p className="text-xs text-zinc-400">ID {u.player_id} · {u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[u.tier_level ?? 1]}`}>
                    {u.tier ?? tierNames[u.tier_level ?? 1]}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-zinc-900 tabular-nums">
                  {(u.yel_points ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-600 tabular-nums">{u.total_visits ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Recent Yel Activity</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Last 30 visited reservations</p>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No visited reservations yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left">
                <th className="px-4 py-3 font-medium text-zinc-500">User</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Points earned</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r: any) => (
                <tr key={r.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{r.profiles?.name ?? '—'}</p>
                    {r.profiles?.player_id && <p className="text-xs text-zinc-400">ID {r.profiles.player_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{r.venues?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      +{r.yel_earned} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 mt-1 tabular-nums">{value}</p>
    </div>
  )
}
