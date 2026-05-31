import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('venues').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/venues')
}

export default async function VenuesPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  // Restaurant admins go directly to their venue's edit page
  if (admin.role === 'admin') redirect(admin.managed_venue_id ? `/dashboard/venues/${admin.managed_venue_id}` : '/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, cuisine, area, kind, rating, is_active')
    .order('name')

  if (error) throw error

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Venues</h1>
        <Link
          href="/dashboard/venues/new"
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          + New venue
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Cuisine</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Area</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Kind</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Rating</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Active</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Menu</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {venues?.map(venue => (
              <tr
                key={venue.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">{venue.name}</td>
                <td className="px-4 py-3 text-zinc-600">{venue.cuisine}</td>
                <td className="px-4 py-3 text-zinc-600">{venue.area}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 capitalize">
                    {venue.kind}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">⭐ {venue.rating}</td>
                <td className="px-4 py-3">
                  <form action={toggleActive.bind(null, venue.id, venue.is_active)}>
                    <button
                      type="submit"
                      title={venue.is_active ? 'Deactivate' : 'Activate'}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                        venue.is_active ? 'bg-green-500' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          venue.is_active ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/menus/${venue.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Menu →
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/venues/${venue.id}`}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
