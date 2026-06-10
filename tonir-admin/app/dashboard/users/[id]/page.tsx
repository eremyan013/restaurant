import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { ProfileRow, ReservationRow } from '@/lib/database.types'
import { UserEditForm } from './user-edit-form'

type ReservationWithVenue = ReservationRow & { venues: { name: string } | null }
type FavoriteWithVenue = {
  id: string
  created_at: string
  venues: { id: string; name: string; cuisine: string; photo_url: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  visited:   'bg-zinc-100 text-zinc-600',
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [profileResult, reservationsResult, favoritesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'user')
      .single(),
    supabase
      .from('reservations')
      .select('id, date, time, people, occasion, status, yel_earned, created_at, venues(name)')
      .eq('user_id', id)
      .order('date_iso', { ascending: false })
      .limit(20),
    supabase
      .from('favorites')
      .select('id, created_at, venue_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (profileResult.error || !profileResult.data) notFound()

  const user = profileResult.data as ProfileRow
  const reservations = (reservationsResult.data ?? []) as unknown as ReservationWithVenue[]

  const rawFavorites: any[] = favoritesResult.data ?? []
  const favVenueIds = [...new Set(rawFavorites.map((f: any) => f.venue_id).filter(Boolean))]
  const favVenuesRes = favVenueIds.length > 0
    ? await supabase.from('venues').select('id, name, cuisine, photo_url').in('id', favVenueIds as any)
    : { data: [] }
  const favVenueMap: Record<string, any> = Object.fromEntries(
    ((favVenuesRes.data ?? []) as any[]).map((v: any) => [v.id, v])
  )
  const favorites = rawFavorites.map((f: any) => ({
    ...f,
    venues: favVenueMap[f.venue_id] ?? null,
  })) as FavoriteWithVenue[]

  const initials = user.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/users" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to Users
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden bg-zinc-100">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-semibold text-zinc-500">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-zinc-900">{user.name}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{user.email}</p>
            <p className="text-zinc-400 text-xs mt-1">Member since {memberSince}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-100 text-zinc-700">
              {user.tier}
            </span>
            <UserEditForm user={{
              id: user.id,
              name: user.name,
              email: user.email,
              phone: (user as any).phone ?? null,
              tier_level: user.tier_level,
            }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-100">
          <Stat label="Tier Level" value={String(user.tier_level)} />
          <Stat label="YEL Points" value={user.yel_points.toLocaleString()} />
          <Stat label="Total Visits" value={String(user.total_visits)} />
          <Stat label="Favorites" value={String(favorites.length)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-medium text-zinc-900 mb-4">Account Details</h2>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Player ID" value={<span className="font-mono font-semibold text-zinc-900">{user.player_id}</span>} />
              <DetailRow label="Phone" value={<span className="tabular-nums">{(user as any).phone ?? '—'}</span>} />
              <DetailRow label="User ID" value={<span className="font-mono text-xs break-all">{user.id}</span>} />
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="Last updated" value={new Date(user.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
            </dl>
          </div>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-medium text-zinc-900 mb-4">Favorite Venues</h2>
              <ul className="space-y-3">
                {favorites.map((fav) => {
                  const venue = fav.venues
                  if (!venue) return null
                  return (
                    <li key={fav.id} className="flex items-center gap-3">
                      <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                        {venue.photo_url && (
                          <Image src={venue.photo_url} alt={venue.name} fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{venue.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{venue.cuisine}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: reservations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">Reservation History</h2>
            </div>
            {reservations.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-400 text-center">No reservations yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left">
                    <th className="px-4 py-3 font-medium text-zinc-500">Venue</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Date</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Guests</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 font-medium text-zinc-500">YEL</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => {
                    const venue = r.venues
                    return (
                      <tr key={r.id} className="odd:bg-white even:bg-zinc-100 hover:bg-zinc-200 transition-colors">
                        <td className="px-4 py-3 text-zinc-900">{venue?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{r.date} {r.time}</td>
                        <td className="px-4 py-3 text-zinc-600">{r.people}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${STATUS_STYLES[r.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 tabular-nums">{r.yel_earned}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-zinc-900 mt-0.5">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right">{value}</dd>
    </div>
  )
}
