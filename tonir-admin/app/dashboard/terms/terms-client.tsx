'use client'

import { useState, useTransition } from 'react'
import type { saveTerms } from './actions'

type TermsLanguage = 'hy' | 'ru' | 'en'

const LANGUAGE_LABELS: Record<TermsLanguage, string> = {
  hy: 'Armenian',
  ru: 'Russian',
  en: 'English',
}
const LANGUAGES: TermsLanguage[] = ['hy', 'ru', 'en']

type Props = {
  initialTerms: Record<TermsLanguage, string>
  onSave: typeof saveTerms
}

export function TermsClient({ initialTerms, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<TermsLanguage>('hy')
  const [texts, setTexts] = useState<Record<TermsLanguage, string>>(initialTerms)
  const [savedTexts, setSavedTexts] = useState<Record<TermsLanguage, string>>(initialTerms)
  const [error, setError] = useState<string | null>(null)
  const [successTab, setSuccessTab] = useState<TermsLanguage | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDirty = texts[activeTab] !== savedTexts[activeTab]

  function handleSave() {
    setError(null)
    setSuccessTab(null)
    const lang = activeTab
    const text = texts[lang]
    startTransition(async () => {
      const result = await onSave(lang, text)
      if (result.error) {
        setError(result.error)
      } else {
        setSavedTexts((prev) => ({ ...prev, [lang]: text }))
        setSuccessTab(lang)
        setTimeout(() => setSuccessTab(null), 2000)
      }
    })
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Terms and Conditions</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Stored in the <code className="bg-zinc-100 px-1 rounded text-xs">settings</code> table as{' '}
          <code className="bg-zinc-100 px-1 rounded text-xs">terms_hy</code>,{' '}
          <code className="bg-zinc-100 px-1 rounded text-xs">terms_ru</code>,{' '}
          <code className="bg-zinc-100 px-1 rounded text-xs">terms_en</code>.
        </p>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-5">
        {LANGUAGES.map((lang) => {
          const dirty = texts[lang] !== savedTexts[lang]
          return (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                activeTab === lang
                  ? 'bg-white border border-b-white border-zinc-200 text-zinc-900 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
              {dirty && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
              )}
            </button>
          )
        })}
      </div>

      {/* Textarea */}
      <textarea
        value={texts[activeTab]}
        onChange={(e) =>
          setTexts((prev) => ({ ...prev, [activeTab]: e.target.value }))
        }
        rows={20}
        placeholder={`Terms and Conditions in ${LANGUAGE_LABELS[activeTab]}…`}
        className="w-full rounded-lg border border-zinc-200 p-4 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
        disabled={isPending}
      />

      {/* Footer row */}
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isPending || !isDirty
              ? 'bg-zinc-300 cursor-not-allowed'
              : 'bg-zinc-900 hover:bg-zinc-700'
          }`}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>

        {successTab === activeTab && (
          <span className="text-sm text-emerald-600 font-medium">Saved.</span>
        )}

        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </div>
  )
}
