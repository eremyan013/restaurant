'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

export type UpdateUserState = { ok: false; error?: string } | { ok: true }

export async function updateUser(
  _prev: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return { ok: false, error: 'Unauthorized' }

  const id         = (formData.get('id')          as string)?.trim()
  const name       = (formData.get('name')        as string)?.trim()
  const email      = (formData.get('email')       as string)?.trim()
  const phone      = (formData.get('phone')       as string)?.trim() || null
  const tierLevel  = parseInt(formData.get('tier_level') as string, 10)

  if (!id || !name || !email) {
    return { ok: false, error: 'Name and email are required.' }
  }
  if (isNaN(tierLevel) || tierLevel < 1 || tierLevel > 4) {
    return { ok: false, error: 'Tier level must be between 1 and 4.' }
  }

  const supabase = createSupabaseAdminClient()

  // Update auth email
  const { error: authError } = await (supabase as any).auth.admin.updateUserById(id, { email })
  if (authError) return { ok: false, error: authError.message }

  // Update profile
  const { error: profileError } = await (supabase as any)
    .from('profiles')
    .update({ name, email, phone, tier_level: tierLevel })
    .eq('id', id)

  if (profileError) return { ok: false, error: profileError.message }

  revalidatePath(`/dashboard/users/${id}`)
  revalidatePath('/dashboard/users')
  return { ok: true }
}
