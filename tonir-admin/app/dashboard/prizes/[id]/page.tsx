import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { PrizeForm } from '@/components/prize-form'
import { PrizeClaimMarkUsed } from '@/components/prize-claim-mark-used'
import { requirePagePermission } from '@/lib/permissions'

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-green-50 text-green-700',
  used:    'bg-zinc-100 text-zinc-500',
  expired: 'bg-red-50 text-red-600',
}

export default async function EditPrizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'prizes', 'view')

  const supabase = createSupabaseAdminClient()

  const [prizeRes, venuesRes, settingsRes, claimsRes] = await Promise.all([
    supabase.from('prizes').select('*').eq('id', id).single(),
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('settings').select('key, value').in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name']),
    supabase
      .from('user_prizes')
      .select('id, status, code, claimed_at, used_at, user_id')
      .eq('prize_id', id)
      .order('claimed_at', { ascending: false })
      .limit(30),
  ])

  if (!prizeRes.data) notFound()

  const prize  = prizeRes.data
  const venues: any[] = venuesRes.data ?? []
  const rawClaims: any[] = claimsRes.data ?? []

  const claimUserIds = [...new Set(rawClaims.map((c: any) => c.user_id).filter(Boolean))]
  const claimProfilesRes = claimUserIds.length > 0
    ? await supabase.from('profiles').select('id, name, player_id, email').in('id', claimUserIds)
    : { data: [] }
  const claimProfileMap: Record<string, any> = Object.fromEntries(
    (claimProfilesRes.data ?? []).map((p: any) => [p.id, p])
  )
  const claims: any[] = rawClaims.map((c: any) => ({
    ...c,
    profiles: claimProfileMap[c.user_id] ?? null,
  }))

  const tierNames: Record<number, string> = { 1: 'Tonir', 2: 'Pandok', 3: 'Areni', 4: 'Master' }
  for (const s of (settingsRes.data ?? [])) {
    const l = parseInt(s.key[5]); if (l >= 1 && l <= 4) tierNames[l] = s.value
  }

  const activeClaims = claims.filter((c: any) => c.status === 'active').length
  const usedClaims   = claims.filter((c: any) => c.status === 'used').length

  async function updatePrize(formData: FormData) {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return

    const unlockType     = formData.get('unlock_type') as string
    const unlimitedStock = formData.get('unlimited_stock') === 'on'
    const stockRaw       = formData.get('stock') as string

    const supabase = createSupabaseAdminClient()
    await supabase.from('prizes').update({
      name:          (formData.get('name') as string).trim(),
      description:   (formData.get('description') as string)?.trim() || null,
      type:          formData.get('type') as 'discount' | 'free_item' | 'experience' | 'voucher',
      unlock_type:   unlockType as 'points' | 'tier',
      points_cost:   unlockType === 'points' ? parseInt(formData.get('points_cost') as string) : null,
      min_tier_level: unlockType === 'tier'  ? parseInt(formData.get('min_tier_level') as string) : null,
      venue_id:      (formData.get('venue_id') as string) || null,
      image_url:     (formData.get('image_url') as string)?.trim() || null,
      stock:         (!unlimitedStock && stockRaw) ? parseInt(stockRaw) : null,
      sort_order:    parseInt(formData.get('sort_order') as string) || 0,
      is_active:     formData.get('is_active') === 'true',
      updated_at:    new Date().toISOString(),
    }).eq('id', id)
    revalidatePath('/dashboard/prizes')
    revalidatePath(`/dashboard/prizes/${id}`)
  }

  async function markUsed(claimId: string) {
    'use server'
    const actor = await getCurrentAdmin()
    if (actor?.role !== 'super_admin') return
    const supabase = createSupabaseAdminClient()
    await supabase.from('user_prizes').update({ status: 'used', used_at: new Date().toISOString() }).eq('id', claimId)
    revalidatePath(`/dashboard/prizes/${id}`)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/dashboard/prizes" className="text-sm text-zinc-500 hover:text-zinc-700">← Back to Prizes</Link>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{prize.name}</h1>
        <div className="flex gap-4 text-sm text-zinc-500">
          <span><span className="font-medium text-zinc-900">{claims.length}</span> total claims</span>
          <span><span className="font-medium text-green-700">{activeClaims}</span> active</span>
          <span><span className="font-medium text-zinc-500">{usedClaims}</span> used</span>
        </div>
      </div>

      <PrizeForm
        action={updatePrize}
        venues={venues}
        tierNames={tierNames}
        defaults={{
          name:          prize.name,
          description:   prize.description ?? undefined,
          type:          prize.type,
          unlock_type:   prize.unlock_type,
          points_cost:   prize.points_cost?.toString(),
          min_tier_level: prize.min_tier_level?.toString(),
          venue_id:      prize.venue_id ?? undefined,
          image_url:     prize.image_url ?? undefined,
          stock:         prize.stock?.toString(),
          unlimited_stock: prize.stock == null,
          sort_order:    prize.sort_order?.toString(),
          is_active:     prize.is_active ? 'true' : 'false',
        }}
      />

      {/* Claims history */}
      {claims.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Claim History</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Last 30 claims</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left">
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">User</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Code</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Claimed</th>
                <th scope="col" className="px-4 py-3 font-medium text-zinc-500">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c: any) => (
                <tr key={c.id} className="odd:bg-white even:bg-zinc-100 border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{c.profiles?.name ?? '—'}</p>
                    <p className="text-xs text-zinc-400">ID {c.profiles?.player_id} · {c.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{c.code ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(c.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'active' && (
                      <PrizeClaimMarkUsed markUsedAction={markUsed.bind(null, c.id)} />
                    )}
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
