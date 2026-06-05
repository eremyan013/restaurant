import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

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

const TIER_COLORS: Record<number, string> = {
  1: 'bg-zinc-100 text-zinc-600',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-violet-50 text-violet-700',
  4: 'bg-amber-50 text-amber-700',
}

async function markUsed(formData: FormData) {
  'use server'
  await getCurrentAdmin() // auth check — any admin can redeem
  const id   = formData.get('id') as string
  const code = formData.get('code') as string
  if (!id) return

  const supabase = createSupabaseAdminClient()
  await (supabase as any)
    .from('user_prizes')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active')

  revalidatePath(`/dashboard/redemption?code=${encodeURIComponent(code)}`)
  redirect(`/dashboard/redemption?code=${encodeURIComponent(code)}`)
}

export default async function RedemptionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')

  const { code: rawCode } = await searchParams
  const code = rawCode?.trim().toUpperCase() ?? ''

  const supabase = createSupabaseAdminClient()

  let result: any = null
  let notFound = false

  if (code) {
    const { data } = await (supabase as any)
      .from('user_prizes')
      .select(`
        id, code, status, claimed_at, used_at, expires_at,
        profiles(name, email, player_id, tier, tier_level, yel_points, avatar_url),
        prizes(name, description, type, unlock_type, points_cost, venue_id, venues(name))
      `)
      .eq('code', code)
      .maybeSingle()

    if (data) {
      result = data
    } else {
      notFound = true
    }
  }

  const isExpired  = result?.expires_at && new Date(result.expires_at) < new Date()
  const effectiveStatus = isExpired && result?.status === 'active' ? 'expired' : result?.status

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Prize Redemption</h1>
      <p className="text-sm text-zinc-500 mb-8">Enter a YEL-XXXXXX code to look up and mark a prize as used.</p>

      {/* Search form */}
      <form method="GET" action="/dashboard/redemption" className="flex gap-2 mb-8">
        <input
          type="text"
          name="code"
          defaultValue={code}
          placeholder="YEL-XXXXXX"
          autoComplete="off"
          autoFocus
          className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          Look up
        </button>
      </form>

      {/* Not found */}
      {notFound && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-600">
          No prize found for code <span className="font-mono font-semibold">{code}</span>.
          Check the code and try again.
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">

          {/* Status banner */}
          <div className={`px-5 py-3 text-sm font-medium flex items-center gap-2 ${
            effectiveStatus === 'active'
              ? 'bg-green-50 text-green-700 border-b border-green-100'
              : effectiveStatus === 'used'
              ? 'bg-zinc-100 text-zinc-500 border-b border-zinc-200'
              : 'bg-red-50 text-red-600 border-b border-red-100'
          }`}>
            <span className="text-base">
              {effectiveStatus === 'active' ? '✓' : effectiveStatus === 'used' ? '✗' : '⚠'}
            </span>
            {effectiveStatus === 'active' && 'Valid — ready to redeem'}
            {effectiveStatus === 'used'   && `Already redeemed${result.used_at ? ` on ${new Date(result.used_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}`}
            {effectiveStatus === 'expired'&& 'Expired — do not honour'}
          </div>

          <div className="p-5 space-y-5">
            {/* Code */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold text-zinc-900 tracking-widest">{result.code}</span>
              <span className="text-xs text-zinc-400">
                Claimed {new Date(result.claimed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <hr className="border-zinc-100" />

            {/* Prize info */}
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Prize</p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{result.prizes?.name ?? '—'}</p>
                  {result.prizes?.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{result.prizes.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[result.prizes?.type] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {TYPE_LABELS[result.prizes?.type] ?? result.prizes?.type}
                    </span>
                    {result.prizes?.venues?.name && (
                      <span className="text-xs text-zinc-400">{result.prizes.venues.name}</span>
                    )}
                    {!result.prizes?.venue_id && (
                      <span className="text-xs text-zinc-400">All venues</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-zinc-100" />

            {/* User info */}
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">User</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-600 shrink-0">
                  {(result.profiles?.name ?? '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">{result.profiles?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {result.profiles?.player_id && (
                      <span className="text-xs text-zinc-400">ID {result.profiles.player_id}</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[result.profiles?.tier_level ?? 1]}`}>
                      {result.profiles?.tier ?? '—'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {(result.profiles?.yel_points ?? 0).toLocaleString()} Yel
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiry */}
            {result.expires_at && (
              <>
                <hr className="border-zinc-100" />
                <p className="text-sm text-zinc-500">
                  Expires: <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-zinc-700'}`}>
                    {new Date(result.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </p>
              </>
            )}

            {/* Action */}
            {effectiveStatus === 'active' && (
              <>
                <hr className="border-zinc-100" />
                <form action={markUsed}>
                  <input type="hidden" name="id"   value={result.id} />
                  <input type="hidden" name="code" value={result.code} />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all"
                    onClick={e => { if (!confirm(`Mark "${result.prizes?.name}" as used for ${result.profiles?.name}?`)) e.preventDefault() }}
                  >
                    Mark as used
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
