import { redirect } from 'next/navigation'
import { createSupabaseSessionClient } from '@/lib/supabase-session'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Sidebar } from '@/components/sidebar'
import { PushSubscriber } from '@/components/PushSubscriber'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get current session
  const supabase = await createSupabaseSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check is_admin — use service_role to bypass RLS
  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin, name')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <PushSubscriber />
      <Sidebar adminName={profile.name} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
