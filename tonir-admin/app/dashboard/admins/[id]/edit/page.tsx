import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { getAdminPermissions } from '@/lib/permissions'
import { EditAdminForm } from './EditAdminForm'

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  const [{ data: profile }, { data: venues }, permissions] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, email, managed_venue_ids')
      .eq('id', id)
      .eq('role', 'admin')
      .single(),
    supabase
      .from('venues')
      .select('id, name')
      .order('name'),
    getAdminPermissions(id),
  ])

  if (!profile) notFound()

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/admins"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Admins
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Admin</h1>
      </div>

      <EditAdminForm admin={profile} venues={venues ?? []} permissions={permissions} />
    </div>
  )
}
