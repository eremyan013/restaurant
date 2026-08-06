'use client'

import { useState, useTransition, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
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

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-zinc-200 mx-0.5" />
}

export function TermsClient({ initialTerms, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<TermsLanguage>('hy')
  const [savedTexts, setSavedTexts] = useState<Record<TermsLanguage, string>>(initialTerms)
  const [texts, setTexts] = useState<Record<TermsLanguage, string>>(initialTerms)
  const [error, setError] = useState<string | null>(null)
  const [successTab, setSuccessTab] = useState<TermsLanguage | null>(null)
  const [isPending, startTransition] = useTransition()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: initialTerms[activeTab],
    onUpdate({ editor }) {
      const html = editor.getHTML()
      setTexts((prev) => ({ ...prev, [activeTab]: html }))
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[420px] focus:outline-none prose prose-zinc max-w-none text-sm leading-relaxed',
      },
    },
  })

  const switchTab = useCallback(
    (lang: TermsLanguage) => {
      if (!editor) return
      // Save current tab's content before switching
      setTexts((prev) => ({ ...prev, [activeTab]: editor.getHTML() }))
      setActiveTab(lang)
      editor.commands.setContent(texts[lang] || initialTerms[lang] || '')
    },
    [editor, activeTab, texts, initialTerms],
  )

  const isDirty = editor ? texts[activeTab] !== savedTexts[activeTab] : false

  function handleSave() {
    if (!editor) return
    setError(null)
    setSuccessTab(null)
    const lang = activeTab
    const html = editor.getHTML()
    startTransition(async () => {
      const result = await onSave(lang, html)
      if (result.error) {
        setError(result.error)
      } else {
        setSavedTexts((prev) => ({ ...prev, [lang]: html }))
        setTexts((prev) => ({ ...prev, [lang]: html }))
        setSuccessTab(lang)
        setTimeout(() => setSuccessTab(null), 2000)
      }
    })
  }

  return (
    <div className="p-6 max-w-4xl">
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
      <div className="flex gap-1 border-b border-zinc-200 mb-0">
        {LANGUAGES.map((lang) => {
          const dirty = texts[lang] !== savedTexts[lang]
          return (
            <button
              key={lang}
              onClick={() => switchTab(lang)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                activeTab === lang
                  ? 'bg-white border border-b-white border-zinc-200 text-zinc-900 -mb-px relative z-10'
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

      {/* Editor panel */}
      <div className="border border-zinc-200 rounded-b-lg rounded-tr-lg bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-zinc-200 bg-zinc-50">
          {/* Headings */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor?.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setParagraph().run()}
            active={editor?.isActive('paragraph')}
            title="Paragraph"
          >
            ¶
          </ToolbarButton>

          <Divider />

          {/* Inline formatting */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            title="Underline"
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive('strike')}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </ToolbarButton>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title="Bullet list"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title="Numbered list"
          >
            1. List
          </ToolbarButton>

          <Divider />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            active={editor?.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            ≡←
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            active={editor?.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            active={editor?.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            ≡→
          </ToolbarButton>

          <Divider />

          {/* Block */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote')}
            title="Blockquote"
          >
            "
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            ―
          </ToolbarButton>

          <Divider />

          {/* History */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo"
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo"
          >
            ↪
          </ToolbarButton>
        </div>

        {/* Editor content */}
        <div className="px-5 py-4">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Footer */}
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

        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <style>{`
        .prose h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .prose h2 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.4rem; }
        .prose h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.35rem; }
        .prose p { margin: 0.5rem 0; }
        .prose ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose li { margin: 0.2rem 0; }
        .prose blockquote { border-left: 3px solid #d4d4d8; padding-left: 1rem; color: #71717a; margin: 0.75rem 0; }
        .prose hr { border-color: #e4e4e7; margin: 1rem 0; }
        .tiptap:focus { outline: none; }
      `}</style>
    </div>
  )
}
