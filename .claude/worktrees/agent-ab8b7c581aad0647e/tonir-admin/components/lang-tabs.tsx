'use client'

export type Lang = 'hy' | 'ru' | 'en'
export const LANGS: Lang[] = ['hy', 'ru', 'en']
const LABELS: Record<Lang, string> = { hy: 'Հայ', ru: 'Рус', en: 'Eng' }

export function LangTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg w-fit">
      {LANGS.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            lang === l ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
