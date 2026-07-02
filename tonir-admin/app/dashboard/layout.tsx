import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { getAdminPermissions } from '@/lib/permissions'
import type { AdminPermissions } from '@/lib/permissions'
import { Sidebar } from '@/components/sidebar'
import { PushSubscriber } from '@/components/PushSubscriber'
import { ToastProvider } from '@/components/toast-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/login')
  }

  // null signals "super admin — show everything"; granular admins get their real permissions
  const permissions: AdminPermissions | null =
    admin.role === 'super_admin'
      ? null
      : await getAdminPermissions(admin.id)

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-50">
        <PushSubscriber />
        <Sidebar
          adminName={admin.name}
          role={admin.role}
          managedVenueIds={admin.managed_venue_ids}
          permissions={permissions}
        />
        <main className="flex-1 overflow-y-auto p-8 pt-12 lg:pt-8">{children}</main>
      </div>
    </ToastProvider>
  )
}
