'use server'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { BannerRow } from '@/lib/database.types'

type BannerLanguage = 'hy' | 'ru' | 'en'
const VALID_LANGUAGES = new Set<BannerLanguage>(['hy', 'ru', 'en'])

export async function createBanner(formData: FormData): Promise<{ error?: string; banner?: BannerRow }> {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return { error: 'Permission denied' }

  const image_url = (formData.get('image_url') as string ?? '').trim()
  if (!image_url) return { error: 'Image is required' }

  const rawLang = (formData.get('language') as string ?? 'hy').trim() as BannerLanguage
  const language: BannerLanguage = VALID_LANGUAGES.has(rawLang) ? rawLang : 'hy'

  const supabase = createSupabaseAdminClient()

  const { data: maxRow } = await supabase
    .from('banners')
    .select('sort_order')
    .eq('language', language)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase.from('banners').insert({
    image_url,
    title:      (formData.get('title') as string ?? '').trim() || null,
    subtitle:   (formData.get('subtitle') as string ?? '').trim() || null,
    tap_action: ((formData.get('tap_action') as string) || 'none') as 'none' | 'deep_link' | 'external_url',
    tap_url:    (formData.get('tap_url') as string ?? '').trim() || null,
    start_date: (formData.get('start_date') as string ?? '').trim() || null,
    end_date:   (formData.get('end_date') as string ?? '').trim() || null,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
    language,
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/banners')
  return { banner: data as BannerRow }
}

export async function toggleBanner(id: string, is_active: boolean): Promise<void> {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('banners').update({ is_active }).eq('id', id)
  revalidatePath('/dashboard/banners')
}

export async function deleteBanner(id: string): Promise<void> {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await supabase.from('banners').delete().eq('id', id)
  revalidatePath('/dashboard/banners')
}

export async function reorderBanners(orderedIds: string[]): Promise<void> {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('banners').update({ sort_order: index }).eq('id', id)
    )
  )
  revalidatePath('/dashboard/banners')
}
