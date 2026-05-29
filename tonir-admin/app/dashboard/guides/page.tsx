import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { GuideRow } from '@/lib/database.types'

async function toggleActive(id: string, current: boolean) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('guides').update({ is_active: !current }).eq('id', id)
  revalidatePath('/dashboard/guides')
}

async function saveGuide(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = createSupabaseAdminClient()
  const venueIdsRaw = (formData.get('venue_ids') as string) || ''
  const venue_ids = venueIdsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  await supabase.from('guides').upsert({
    id,
    title: formData.get('title') as string,
    subtitle: formData.get('subtitle') as string,
    tag: formData.get('tag') as string,
    cover_url: formData.get('cover_url') as string,
    sort_order: Number(formData.get('sort_order') || 0),
    venue_ids,
  })
  revalidatePath('/dashboard/guides')
}

export default async function GuidesPage() {
  const supabase = createSupabaseAdminClient()
  const [{ data: guides, error }, { data: venues }] = await Promise.all([
    supabase.from('guides').select('*').order('sort_order'),
    supabase.from('venues').select('id, name').eq('is_active', true).order('name'),
  ])

  if (error) throw error

  const venueMap = Object.fromEntries(
    venues?.map(v => [v.id, v.name]) ?? []
  )

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Guides</h1>

      {/* Guides table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
              <th className="px-4 py-3 font-medium text-zinc-500">Title</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Tag</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Order</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Venues</th>
              <th className="px-4 py-3 font-medium text-zinc-500">Active</th>
            </tr>
          </thead>
          <tbody>
            {guides?.map((guide: GuideRow) => (
              <tr
                key={guide.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{guide.title}</p>
                  <p className="text-xs text-zinc-400">{guide.subtitle}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                    {guide.tag}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{guide.sort_order}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">
                  {guide.venue_ids.length > 0
                    ? guide.venue_ids.map(id => venueMap[id] ?? id).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleActive.bind(null, guide.id, guide.is_active)}>
                    <button
                      type="submit"
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                        guide.is_active ? 'bg-green-500' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          guide.is_active ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit form for each guide */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900">Edit / Create Guide</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {guides?.map((guide: GuideRow) => (
            <form
              key={guide.id}
              action={saveGuide}
              className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3"
            >
              <input type="hidden" name="id" value={guide.id} />
              <p className="text-xs font-mono text-zinc-400">{guide.id}</p>
              <Field label="Title" name="title" defaultValue={guide.title} />
              <Field label="Subtitle" name="subtitle" defaultValue={guide.subtitle} />
              <Field label="Tag" name="tag" defaultValue={guide.tag} />
              <Field label="Cover URL" name="cover_url" defaultValue={guide.cover_url} />
              <Field label="Sort order" name="sort_order" type="number" defaultValue={String(guide.sort_order)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Venue IDs (comma-separated)</label>
                <textarea
                  name="venue_ids"
                  defaultValue={guide.venue_ids.join(', ')}
                  rows={2}
                  className="text-xs px-2 py-1.5 rounded-md border border-zinc-200 bg-white resize-none"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                Save
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        className="text-xs px-2 py-1.5 rounded-md border border-zinc-200 bg-white"
      />
    </div>
  )
}
