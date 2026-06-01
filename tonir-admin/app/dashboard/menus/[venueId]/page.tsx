import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import type { MenuCategoryRow, MenuItemRow } from '@/lib/database.types'
import { AddItemForm } from '@/components/add-item-form'
import { EditItemRow } from '@/components/edit-item-row'

// ── Server Actions ────────────────────────────────────────────────────────────

async function addCategory(venueId: string, formData: FormData) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('menu_categories').insert({
    venue_id: venueId,
    name: formData.get('name') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  })
  revalidatePath(`/dashboard/menus/${venueId}`)
}

async function deleteCategory(venueId: string, id: string) {
  'use server'
  const supabase = createSupabaseAdminClient()
  await supabase.from('menu_categories').delete().eq('id', id)
  revalidatePath(`/dashboard/menus/${venueId}`)
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MenuPage({
  params,
}: {
  params: Promise<{ venueId: string }>
}) {
  const { venueId } = await params

  // Restaurant admins can only access their own venue's menu
  const admin = await getCurrentAdmin()
  if (admin?.role === 'admin' && !admin.managed_venue_ids.includes(venueId)) {
    redirect(admin.managed_venue_ids.length ? '/dashboard/venues' : '/dashboard')
  }

  const supabase = createSupabaseAdminClient()

  const [{ data: venue }, { data: categories }, { data: items }] = await Promise.all([
    supabase.from('venues').select('id, name').eq('id', venueId).single(),
    supabase
      .from('menu_categories')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order'),
    supabase
      .from('menu_items')
      .select('*')
      .eq('venue_id', venueId)
      .order('sort_order'),
  ])

  if (!venue) notFound()

  const itemsByCategory = (items ?? []).reduce<Record<string, MenuItemRow[]>>(
    (acc, item) => {
      if (!acc[item.category_id]) acc[item.category_id] = []
      acc[item.category_id].push(item)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/venues"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Venues
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Menu: {venue.name}</h1>
      </div>

      {/* Categories + Items */}
      {categories && categories.length > 0 ? (
        <div className="space-y-6">
          {categories.map((cat: MenuCategoryRow) => {
            const catItems = itemsByCategory[cat.id] ?? []
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                  <div>
                    <span className="font-medium text-zinc-900">{cat.name}</span>
                    <span className="ml-2 text-xs text-zinc-400">order {cat.sort_order}</span>
                  </div>
                  <form action={deleteCategory.bind(null, venueId, cat.id)}>
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Delete category
                    </button>
                  </form>
                </div>

                {/* Items table */}
                {catItems.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left">
                        <th className="px-4 py-2 font-medium text-zinc-500 w-12"></th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Name</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Price</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Available</th>
                        <th className="px-4 py-2 font-medium text-zinc-500">Popular</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item: MenuItemRow) => (
                        <EditItemRow key={item.id} item={item} venueId={venueId} />
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Add item form */}
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
                  <AddItemForm venueId={venueId} categoryId={cat.id} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">No categories yet. Add one below.</p>
      )}

      {/* Add category form */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <p className="text-sm font-medium text-zinc-900 mb-3">Add category</p>
        <form action={addCategory.bind(null, venueId)} className="flex gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Category name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Appetizers"
              required
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
            className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Add category
          </button>
        </form>
      </div>
    </div>
  )
}
