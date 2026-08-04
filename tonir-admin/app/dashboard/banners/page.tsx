import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { BannerRow } from '@/lib/database.types'
import { BannersClient } from './banners-client'
import { createBanner, toggleBanner, deleteBanner, reorderBanners } from './actions'

export const metadata: Metadata = { title: 'Banners — Tonir Admin' }

export default async function BannersPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })

  const banners: BannerRow[] = data ?? []

  return (
    <BannersClient
      initialBanners={banners}
      onCreate={createBanner}
      onToggle={toggleBanner}
      onDelete={deleteBanner}
      onReorder={reorderBanners}
    />
  )
}
