'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

type TermsLanguage = 'hy' | 'ru' | 'en'
const VALID_LANGUAGES = new Set<TermsLanguage>(['hy', 'ru', 'en'])

export async function saveTerms(
  language: TermsLanguage,
  text: string,
): Promise<{ error?: string }> {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') return { error: 'Permission denied' }

  if (!VALID_LANGUAGES.has(language)) return { error: 'Invalid language' }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: `terms_${language}`, value: text }, { onConflict: 'key' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/terms')
  return {}
}
