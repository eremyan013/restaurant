import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { TermsClient } from './terms-client'
import { saveTerms } from './actions'

export const metadata: Metadata = { title: 'Terms and Conditions — Tonir Admin' }

type TermsLanguage = 'hy' | 'ru' | 'en'
const LANGUAGES: TermsLanguage[] = ['hy', 'ru', 'en']

export default async function TermsPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  if (admin.role !== 'super_admin') redirect('/dashboard')

  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['terms_hy', 'terms_ru', 'terms_en'])

  const rows = (data ?? []) as { key: string; value: string }[]

  const initialTerms: Record<TermsLanguage, string> = {
    hy: '',
    ru: '',
    en: '',
  }

  for (const row of rows) {
    const lang = row.key.replace('terms_', '') as TermsLanguage
    if (LANGUAGES.includes(lang)) {
      initialTerms[lang] = row.value ?? ''
    }
  }

  return <TermsClient initialTerms={initialTerms} onSave={saveTerms} />
}
