'use client'

import { useState } from 'react'
import { LangTabs, LANGS, type Lang } from '@/components/lang-tabs'

export function AddCategoryForm({ action }: { action: (fd: FormData) => void }) {
  const [lang, setLang] = useState<Lang>('hy')
  const [names, setNames] = useState<Record<Lang, string>>({ hy: '', ru: '', en: '' })

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-medium text-zinc-900">Add category</p>

      <LangTabs lang={lang} onChange={setLang} />

      {/* Hidden inputs for all languages */}
      {LANGS.map(l => (
        <input key={l} type="hidden" name={`name_${l}`} value={names[l]} />
      ))}

      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Category name</label>
          <input
            type="text"
            value={names[lang]}
            onChange={e => setNames(prev => ({ ...prev, [lang]: e.target.value }))}
            placeholder="e.g. Appetizers"
            className="h-9 px-3 rounded-lg border border-zinc-300 text-sm w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Sort order</label>
          <input
            type="number"
            name="sort_order"
            defaultValue="0"
            className="h-9 px-3 rounded-lg border border-zinc-300 text-sm w-20"
          />
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Add category
        </button>
      </div>
    </form>
  )
}
