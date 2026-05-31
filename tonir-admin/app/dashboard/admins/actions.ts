'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export type CreateAdminState = { ok: false; error?: string } | { ok: true }

export async function createAdmin(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }

  const name     = (formData.get('name')     as string)?.trim()
  const email    = (formData.get('email')    as string)?.trim()
  const password = (formData.get('password') as string)?.trim()
  const venueId  = (formData.get('venue_id') as string)?.trim()

  if (!name || !email || !password || !venueId) {
    return { ok: false, error: 'All fields are required.' }
  }

  const supabase = createSupabaseAdminClient()

  // Create Supabase auth user
  const { data: created, error: authError } = await (supabase as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { ok: false, error: authError.message }
  if (!created?.user) return { ok: false, error: 'Failed to create user — try again.' }

  // Upsert profile (handles auto-create triggers that may have already inserted a row)
  const { error: profileError } = await (supabase as any).from('profiles').upsert({
    id:               created.user.id,
    name,
    email,
    role:             'admin',
    managed_venue_id: venueId,
    tier:             'Tonir',
    tier_level:       1,
    yel_points:       0,
    total_visits:     0,
    is_admin:         true,
  })

  if (profileError) {
    // Roll back auth user so we don't leave orphaned accounts
    await (supabase as any).auth.admin.deleteUser(created.user.id).catch(() => {})
    return { ok: false, error: profileError.message }
  }

  revalidatePath('/dashboard/admins')
  return { ok: true }
}

export async function deleteAdmin(_prev: unknown, formData: FormData): Promise<void> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return

  const id = formData.get('id') as string
  if (!id) return

  const supabase = createSupabaseAdminClient()
  await (supabase as any)
    .from('profiles')
    .update({ role: 'user', managed_venue_id: null, is_admin: false })
    .eq('id', id)

  revalidatePath('/dashboard/admins')
}
