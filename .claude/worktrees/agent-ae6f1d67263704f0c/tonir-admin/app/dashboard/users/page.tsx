import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { Pagination, PAGINATION_SIZE } from '@/components/pagination'
import UsersClient from './users-client'

export const metadata: Metadata = { title: 'Users — Tonir Admin' }

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; sort?: string; page?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const { q: rawQ, tier: rawTier, sort: rawSort, page: rawPage } = await searchParams

  const q    = rawQ?.trim() ?? ''
  const tier = ['1','2','3','4'].includes(rawTier ?? '') ? rawTier! : ''
  const sort = ['created_at:desc','created_at:asc','yel_points:desc','total_visits:desc','name:asc','name:desc'].includes(rawSort ?? '')
    ? rawSort!
    : 'created_at:desc'
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1)
  const from = (page - 1) * PAGINATION_SIZE
  const to   = from + PAGINATION_SIZE - 1

  const [sortKey, sortDir] = sort.split(':') as [string, 'asc' | 'desc']

  const supabase = createSupabaseAdminClient()

  let query = supabase
    .from('profiles')
    .select('id, player_id, name, email, phone, tier, yel_points, total_visits, created_at', { count: 'exact' })
    .eq('role', 'user')
    .order(sortKey, { ascending: sortDir === 'asc' })
    .range(from, to)

  if (tier) query = query.eq('tier', tier)
  if (q)    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,player_id::text.ilike.%${q}%`)

  const { data: users, count, error } = await query

  if (error) throw error

  const totalCount = count ?? 0

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (q)    params.set('q', q)
    if (tier) params.set('tier', tier)
    if (sort !== 'created_at:desc') params.set('sort', sort)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/dashboard/users${qs ? '?' + qs : ''}`
  }

  return (
    <div>
      <UsersClient
        users={users ?? []}
        totalCount={totalCount}
        currentPage={page}
        defaultQ={q}
        defaultTier={tier}
        defaultSort={sort}
      />
      <Pagination
        page={page}
        total={totalCount}
        prevHref={page > 1 ? pageHref(page - 1) : null}
        nextHref={page * PAGINATION_SIZE < totalCount ? pageHref(page + 1) : null}
      />
    </div>
  )
}
