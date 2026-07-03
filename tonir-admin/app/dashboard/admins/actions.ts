'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { validateAction } from '@/lib/validate-action'
import {
  zCreateAdminSchema, parseCreateAdminFormData,
  zUpdateAdminSchema, parseUpdateAdminFormData,
  type CreateAdminInput, type UpdateAdminInput,
} from '@/lib/schemas'
import { parsePermissionsFromFormData } from '@/lib/permissions'

export type CreateAdminState =
  | { ok: false; error?: string; fieldErrors?: Partial<Record<keyof CreateAdminInput, string>> }
  | { ok: true }

export async function createAdmin(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }

  const parsed = validateAction(zCreateAdminSchema, parseCreateAdminFormData(formData))
  if (!parsed.success) return parsed.state

  const { name, email, password, managed_venue_ids } = parsed.data

  const supabase = createSupabaseAdminClient()

  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return { ok: false, error: authError.message }
  if (!created?.user) return { ok: false, error: 'Failed to create user — try again.' }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id:               created.user.id,
    name,
    email,
    role:              'admin',
    managed_venue_ids,
    managed_venue_id:  managed_venue_ids[0] ?? null,
    tier:              'Tonir',
    tier_level:        1,
    yel_points:        0,
    total_visits:      0,
    is_admin:          true,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {})
    return { ok: false, error: profileError.message }
  }

  // Insert permissions row — non-fatal if it fails (admin account still created)
  const permissions = parsePermissionsFromFormData(formData)
  await supabase.from('admin_permissions').insert({ admin_id: created.user.id, ...permissions }).catch(() => {})

  revalidatePath('/dashboard/admins')
  return { ok: true }
}

export type UpdateAdminState =
  | { ok: false; error?: string; fieldErrors?: Partial<Record<keyof UpdateAdminInput, string>> }
  | { ok: true }

export async function updateAdmin(
  _prev: UpdateAdminState,
  formData: FormData,
): Promise<UpdateAdminState> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }

  const parsed = validateAction(zUpdateAdminSchema, parseUpdateAdminFormData(formData))
  if (!parsed.success) return parsed.state

  const { id, name, email, password, managed_venue_ids } = parsed.data

  const supabase = createSupabaseAdminClient()

  const authUpdate: Record<string, string> = { email }
  if (password) authUpdate.password = password

  const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdate)
  if (authError) return { ok: false, error: authError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name, email, managed_venue_ids, managed_venue_id: managed_venue_ids[0] ?? null })
    .eq('id', id)

  if (profileError) return { ok: false, error: profileError.message }

  const permissions = parsePermissionsFromFormData(formData)
  const { error: permError } = await supabase
    .from('admin_permissions')
    .upsert({ admin_id: id, ...permissions }, { onConflict: 'admin_id' })
  if (permError) return { ok: false, error: 'Admin updated but permissions could not be saved.' }

  revalidatePath('/dashboard/admins')
  return { ok: true }
}

export async function removeAdmin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }

  const id = formData.get('id') as string
  if (!id) return { ok: false, error: 'Missing admin ID' }

  const supabase = createSupabaseAdminClient()
  const { data: target } = await supabase.from('profiles').select('role').eq('id', id).single()
  if (target?.role !== 'admin') return { ok: false, error: 'Target is not an admin' }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'user', managed_venue_ids: [], managed_venue_id: null, is_admin: false })
    .eq('id', id)
  if (profileError) return { ok: false, error: profileError.message }

  await supabase.auth.admin.updateUserById(id, { ban_duration: '87600h' }).catch(() => {})

  // ON DELETE CASCADE handles hard-deletes; this cleans up soft-demoted admins
  await supabase.from('admin_permissions').delete().eq('admin_id', id)

  revalidatePath('/dashboard/admins')
  return { ok: true }
}
