'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VenuePicker = { id: string; name: string }
type GuidePicker = { id: string; title: string }

type SectionItem = {
  id: string
  section_id: string
  sort_order: number
  item_type: 'venue' | 'guide'
  venue_id: string | null
  guide_id: string | null
  venue: { id: string; name: string; photo_url: string | null } | null
  guide: { id: string; title: string; cover_url: string | null } | null
}

type Section = {
  id: string
  name: string
  name_hy: string | null
  name_ru: string | null
  name_en: string | null
  eyebrow: string
  eyebrow_hy: string | null
  eyebrow_ru: string | null
  eyebrow_en: string | null
  sort_order: number
  is_active: boolean
  section_type: 'venue' | 'guide'
  is_builtin: boolean
  home_section_items: SectionItem[]
}

type Props = {
  initialSections: Section[]
  availableVenues: VenuePicker[]
  availableGuides: GuidePicker[]
  reorderSections: (orderedIds: string[]) => Promise<void>
  reorderItems: (sectionId: string, orderedIds: string[]) => Promise<void>
  toggleSection: (id: string, current: boolean) => Promise<void>
  updateSectionMeta: (
    id: string,
    payload: {
      name: string
      name_hy: string | null
      name_ru: string | null
      name_en: string | null
      eyebrow: string
      eyebrow_hy: string | null
      eyebrow_ru: string | null
      eyebrow_en: string | null
    }
  ) => Promise<{ error?: string }>
  addItem: (
    sectionId: string,
    itemType: 'venue' | 'guide',
    itemId: string
  ) => Promise<{ error?: string }>
  removeItem: (itemId: string) => Promise<void>
  createSection: (payload: {
    name: string
    section_type: 'venue' | 'guide'
  }) => Promise<{ error?: string }>
  deleteSection: (id: string) => Promise<{ error?: string }>
}

// ---------------------------------------------------------------------------
// GripIcon — drag handle
// ---------------------------------------------------------------------------

function GripIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="text-zinc-400"
    >
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// ToggleSwitch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
        checked ? 'bg-zinc-900' : 'bg-zinc-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// AddItemPicker — searchable dropdown to add a venue or guide to a section
// ---------------------------------------------------------------------------

function AddItemPicker({
  sectionId,
  sectionType,
  availableVenues,
  availableGuides,
  existingItemIds,
  onAdd,
  onClose,
}: {
  sectionId: string
  sectionType: 'venue' | 'guide'
  availableVenues: VenuePicker[]
  availableGuides: GuidePicker[]
  existingItemIds: string[]
  onAdd: (sectionId: string, type: 'venue' | 'guide', id: string) => Promise<void>
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const candidates =
    sectionType === 'venue'
      ? availableVenues.filter((v) => !existingItemIds.includes(v.id))
      : availableGuides.filter((g) => !existingItemIds.includes(g.id))

  const filtered = candidates.filter((c) => {
    const label = sectionType === 'venue' ? (c as VenuePicker).name : (c as GuidePicker).title
    return label.toLowerCase().includes(query.toLowerCase())
  })

  async function handleSelect(id: string) {
    setBusy(true)
    try {
      await onAdd(sectionId, sectionType, id)
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <div className="mt-2 border border-zinc-200 rounded-lg bg-white shadow-md overflow-hidden">
      <div className="p-2 border-b border-zinc-100">
        <input
          type="text"
          placeholder={`Search ${sectionType === 'venue' ? 'venues' : 'guides'}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full text-sm px-2 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          aria-label={`Search ${sectionType === 'venue' ? 'venues' : 'guides'} to add`}
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-3 py-3 text-sm text-zinc-400">No results</p>
      ) : (
        <ul
          role="listbox"
          aria-label={`Available ${sectionType === 'venue' ? 'venues' : 'guides'}`}
          className="max-h-48 overflow-y-auto"
        >
          {filtered.map((c) => {
            const label = sectionType === 'venue' ? (c as VenuePicker).name : (c as GuidePicker).title
            return (
              <li key={c.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSelect(c.id)}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="p-2 border-t border-zinc-100">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableItem — a single item row inside a section's item list
// ---------------------------------------------------------------------------

function SortableItem({
  item,
  label,
  onRemove,
}: {
  item: SectionItem
  label: string
  onRemove: (id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-zinc-200 transition-colors"
        aria-label={`Drag to reorder: ${label}`}
      >
        <GripIcon />
      </span>
      <span className="flex-1 text-sm text-zinc-800">{label}</span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${label}`}
        className="text-zinc-400 hover:text-red-500 transition-colors text-base leading-none px-1"
      >
        ✕
      </button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// ItemsPanel — item list with its own DnD context
// ---------------------------------------------------------------------------

function ItemsPanel({
  section,
  items,
  availableVenues,
  availableGuides,
  onReorderItems,
  onRemoveItem,
  onAddItem,
}: {
  section: Section
  items: SectionItem[]
  availableVenues: VenuePicker[]
  availableGuides: GuidePicker[]
  onReorderItems: (sectionId: string, orderedIds: string[]) => void
  onRemoveItem: (itemId: string) => Promise<void>
  onAddItem: (sectionId: string, type: 'venue' | 'guide', id: string) => Promise<void>
}) {
  const [showPicker, setShowPicker] = useState(false)
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorderItems(section.id, arrayMove(items, oldIndex, newIndex).map((i) => i.id))
  }

  const existingItemIds = items.map((i) =>
    i.item_type === 'venue' ? (i.venue_id ?? '') : (i.guide_id ?? '')
  )

  async function handleRemove(itemId: string) {
    await onRemoveItem(itemId)
    router.refresh()
  }

  async function handleAdd(sectionId: string, type: 'venue' | 'guide', id: string) {
    await onAddItem(sectionId, type, id)
    router.refresh()
  }

  return (
    <div className="px-4 pb-4 pt-3 border-t border-zinc-100">
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 mb-3">No items yet.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1.5 mb-3" aria-label={`Items in ${section.name}`}>
              {items.map((item) => {
                const label = item.item_type === 'venue'
                  ? item.venue?.name ?? availableVenues.find(v => v.id === item.venue_id)?.name ?? '(unknown venue)'
                  : availableGuides.find(g => g.id === item.guide_id)?.title ?? '(unknown guide)'
                return <SortableItem key={item.id} item={item} label={label} onRemove={handleRemove} />
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {showPicker ? (
        <AddItemPicker
          sectionId={section.id}
          sectionType={section.section_type}
          availableVenues={availableVenues}
          availableGuides={availableGuides}
          existingItemIds={existingItemIds}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
        >
          + Add {section.section_type === 'venue' ? 'venue' : 'guide'}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditMetaForm — inline multilingual edit form for name + eyebrow
// ---------------------------------------------------------------------------

type LangTab = 'hy' | 'ru' | 'en'

function EditMetaForm({
  section,
  onSave,
  onCancel,
}: {
  section: Section
  onSave: (
    id: string,
    payload: {
      name: string
      name_hy: string | null
      name_ru: string | null
      name_en: string | null
      eyebrow: string
      eyebrow_hy: string | null
      eyebrow_ru: string | null
      eyebrow_en: string | null
    }
  ) => Promise<{ error?: string }>
  onCancel: () => void
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<LangTab>('hy')
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    name: section.name,
    name_hy: section.name_hy ?? '',
    name_ru: section.name_ru ?? '',
    name_en: section.name_en ?? '',
    eyebrow: section.eyebrow,
    eyebrow_hy: section.eyebrow_hy ?? '',
    eyebrow_ru: section.eyebrow_ru ?? '',
    eyebrow_en: section.eyebrow_en ?? '',
  })

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setBusy(true)
    try {
      const result = await onSave(section.id, {
        name: fields.name,
        name_hy: fields.name_hy || null,
        name_ru: fields.name_ru || null,
        name_en: fields.name_en || null,
        eyebrow: fields.eyebrow,
        eyebrow_hy: fields.eyebrow_hy || null,
        eyebrow_ru: fields.eyebrow_ru || null,
        eyebrow_en: fields.eyebrow_en || null,
      })
      if (result?.error) {
        setServerError(result.error)
      } else {
        router.refresh()
        onCancel()
      }
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: LangTab; label: string }[] = [
    { id: 'hy', label: 'HY' },
    { id: 'ru', label: 'RU' },
    { id: 'en', label: 'EN' },
  ]

  const nameKey = activeTab === 'hy' ? 'name_hy' : activeTab === 'ru' ? 'name_ru' : 'name_en'
  const eyebrowKey =
    activeTab === 'hy' ? 'eyebrow_hy' : activeTab === 'ru' ? 'eyebrow_ru' : 'eyebrow_en'

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 mt-2">
      {/* Default name / eyebrow */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Name (default)
          </label>
          <input
            type="text"
            required
            value={fields.name}
            onChange={set('name')}
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Eyebrow (default)
          </label>
          <input
            type="text"
            required
            value={fields.eyebrow}
            onChange={set('eyebrow')}
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Language tabs */}
      <div
        role="tablist"
        aria-label="Language"
        className="flex gap-1 mb-3"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Name ({activeTab.toUpperCase()})
          </label>
          <input
            type="text"
            value={fields[nameKey]}
            onChange={set(nameKey)}
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Eyebrow ({activeTab.toUpperCase()})
          </label>
          <input
            type="text"
            value={fields[eyebrowKey]}
            onChange={set(eyebrowKey)}
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-red-600 mb-3">
          {serverError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// SortableSection — a single draggable section card
// ---------------------------------------------------------------------------

function SortableSection({
  section,
  isExpanded,
  isEditing,
  availableVenues,
  availableGuides,
  localItems,
  onToggleExpand,
  onToggleEdit,
  onToggleActive,
  onDelete,
  onUpdateMeta,
  onReorderItems,
  onRemoveItem,
  onAddItem,
}: {
  section: Section
  isExpanded: boolean
  isEditing: boolean
  availableVenues: VenuePicker[]
  availableGuides: GuidePicker[]
  localItems: SectionItem[]
  onToggleExpand: (id: string) => void
  onToggleEdit: (id: string) => void
  onToggleActive: (id: string, current: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdateMeta: (
    id: string,
    payload: {
      name: string
      name_hy: string | null
      name_ru: string | null
      name_en: string | null
      eyebrow: string
      eyebrow_hy: string | null
      eyebrow_ru: string | null
      eyebrow_en: string | null
    }
  ) => Promise<{ error?: string }>
  onReorderItems: (sectionId: string, orderedIds: string[]) => void
  onRemoveItem: (itemId: string) => Promise<void>
  onAddItem: (sectionId: string, type: 'venue' | 'guide', id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Section header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-100 transition-colors shrink-0"
          aria-label={`Drag to reorder section: ${section.name}`}
        >
          <GripIcon />
        </span>

        {/* Name + badges */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-zinc-900 truncate">{section.name}</span>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              section.section_type === 'venue'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {section.section_type}
          </span>
          {section.is_builtin && (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              built-in
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <ToggleSwitch
            checked={section.is_active}
            onChange={() => onToggleActive(section.id, section.is_active)}
            label={`${section.is_active ? 'Deactivate' : 'Activate'} section: ${section.name}`}
          />

          <button
            type="button"
            onClick={() => onToggleEdit(section.id)}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-zinc-900 text-xs font-medium transition-colors"
            aria-expanded={isEditing}
            aria-controls={`edit-form-${section.id}`}
          >
            {isEditing ? 'Close' : 'Edit'}
          </button>

          {!section.is_builtin && (
            <button
              type="button"
              onClick={() => onDelete(section.id)}
              aria-label={`Delete section: ${section.name}`}
              className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleExpand(section.id)}
            aria-expanded={isExpanded}
            aria-controls={`items-panel-${section.id}`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} items for section: ${section.name}`}
            className="text-zinc-400 hover:text-zinc-700 transition-colors px-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div id={`edit-form-${section.id}`} className="px-4 pb-4">
          <EditMetaForm
            section={section}
            onSave={onUpdateMeta}
            onCancel={() => onToggleEdit(section.id)}
          />
        </div>
      )}

      {/* Items panel */}
      {isExpanded && !isEditing && (
        <div id={`items-panel-${section.id}`}>
          <ItemsPanel
            section={section}
            items={localItems}
            availableVenues={availableVenues}
            availableGuides={availableGuides}
            onReorderItems={onReorderItems}
            onRemoveItem={onRemoveItem}
            onAddItem={onAddItem}
          />
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// CreateSectionForm — inline form to create a new section
// ---------------------------------------------------------------------------

function CreateSectionForm({
  onCreate,
  onCancel,
}: {
  onCreate: (payload: { name: string; section_type: 'venue' | 'guide' }) => Promise<{ error?: string }>
  onCancel: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sectionType, setSectionType] = useState<'venue' | 'guide'>('venue')
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setServerError(null)
    setBusy(true)
    try {
      const result = await onCreate({ name: name.trim(), section_type: sectionType })
      if (result?.error) {
        setServerError(result.error)
      } else {
        router.refresh()
        onCancel()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4"
      aria-label="Create new section"
    >
      <p className="text-sm font-semibold text-zinc-900 mb-3">New Section</p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <label htmlFor="new-section-name" className="block text-xs font-medium text-zinc-500 mb-1">
            Section name
          </label>
          <input
            id="new-section-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Featured Restaurants"
            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="new-section-type" className="block text-xs font-medium text-zinc-500 mb-1">
            Type
          </label>
          <select
            id="new-section-type"
            value={sectionType}
            onChange={(e) => setSectionType(e.target.value as 'venue' | 'guide')}
            className="text-sm px-2.5 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
          >
            <option value="venue">Venue</option>
            <option value="guide">Guide</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Creating…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-red-600 mt-2">
          {serverError}
        </p>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// HomeSectionsClient — root component
// ---------------------------------------------------------------------------

export function HomeSectionsClient({
  initialSections,
  availableVenues,
  availableGuides,
  reorderSections,
  reorderItems,
  toggleSection,
  updateSectionMeta,
  addItem,
  removeItem,
  createSection,
  deleteSection,
}: Props) {
  const router = useRouter()

  // Canonical sections list — optimistically updated on drag
  const [sections, setSections] = useState<Section[]>(initialSections)

  // Track which sections are expanded (showing items panel)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Track which sections have their edit form open
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())

  // Per-section item order (optimistic), keyed by section id
  const [itemOrder, setItemOrder] = useState<Record<string, SectionItem[]>>(() =>
    Object.fromEntries(
      initialSections.map((s) => [
        s.id,
        [...s.home_section_items].sort((a, b) => a.sort_order - b.sort_order),
      ])
    )
  )

  const [showCreate, setShowCreate] = useState(false)

  // Sensors for section-level DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ---- section-level drag end ----
  async function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sections, oldIndex, newIndex)
    setSections(reordered)

    try {
      await reorderSections(reordered.map((s) => s.id))
    } catch {
      router.refresh()
    }
  }

  // ---- item-level reorder (optimistic only; parent calls server action) ----
  const handleReorderItems = useCallback(
    (sectionId: string, orderedIds: string[]) => {
      setItemOrder((prev) => {
        const current = prev[sectionId] ?? []
        const reordered = orderedIds
          .map((id) => current.find((i) => i.id === id))
          .filter((i): i is SectionItem => i !== undefined)
        return { ...prev, [sectionId]: reordered }
      })

      // Fire server action in background; refresh on error
      reorderItems(sectionId, orderedIds).catch(() => router.refresh())
    },
    [reorderItems, router]
  )

  // ---- toggle active ----
  async function handleToggleActive(id: string, current: boolean) {
    // Optimistic update
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s))
    )
    try {
      await toggleSection(id, current)
      router.refresh()
    } catch {
      // Revert
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: current } : s))
      )
    }
  }

  // ---- toggle expand ----
  function handleToggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ---- toggle edit ----
  function handleToggleEdit(id: string) {
    setEditingIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ---- delete section ----
  async function handleDelete(id: string) {
    const section = sections.find((s) => s.id === id)
    if (!section) return
    if (!confirm(`Delete section "${section.name}"? This cannot be undone.`)) return

    const result = await deleteSection(id)
    if (result?.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  // ---- remove item ----
  async function handleRemoveItem(itemId: string) {
    await removeItem(itemId)
  }

  // ---- add item ----
  async function handleAddItem(sectionId: string, type: 'venue' | 'guide', id: string) {
    const result = await addItem(sectionId, type, id)
    if (result?.error) {
      alert(result.error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Home Sections</h1>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            + New Section
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateSectionForm
          onCreate={createSection}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Sections list */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 py-16 text-center text-zinc-400 text-sm">
          No sections yet. Create your first one above.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-3" aria-label="Home sections">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isExpanded={expandedIds.has(section.id)}
                  isEditing={editingIds.has(section.id)}
                  availableVenues={availableVenues}
                  availableGuides={availableGuides}
                  localItems={itemOrder[section.id] ?? section.home_section_items}
                  onToggleExpand={handleToggleExpand}
                  onToggleEdit={handleToggleEdit}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onUpdateMeta={updateSectionMeta}
                  onReorderItems={handleReorderItems}
                  onRemoveItem={handleRemoveItem}
                  onAddItem={handleAddItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
