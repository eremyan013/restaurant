import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/current-admin'
import { Sidebar } from '@/components/sidebar'
import { PushSubscriber } from '@/components/PushSubscriber'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <PushSubscriber />
      <Sidebar adminName={admin.name} role={admin.role} managedVenueIds={admin.managed_venue_ids} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
