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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Banners
          <span className="ml-2 text-sm font-normal text-zinc-400">{banners.length} total</span>
        </h1>
      </div>
      <BannersClient
        initialBanners={banners}
        onCreate={createBanner}
        onToggle={toggleBanner}
        onDelete={deleteBanner}
        onReorder={reorderBanners}
      />
    </div>
  )
}
