import { z } from 'zod'

export const zCreateAdminSchema = z.object({
  name:              z.string().min(1, 'Name is required').max(200),
  email:             z.string().email('Must be a valid email address'),
  password:          z.string().min(8, 'Password must be at least 8 characters'),
  managed_venue_ids: z.array(z.string().uuid()).min(1, 'At least one venue must be selected'),
})

export type CreateAdminInput = z.infer<typeof zCreateAdminSchema>

export function parseCreateAdminFormData(fd: FormData): unknown {
  return {
    name:              (fd.get('name')     as string)?.trim(),
    email:             (fd.get('email')    as string)?.trim(),
    password:          fd.get('password') as string,
    managed_venue_ids: fd.getAll('venue_id').map(v => (v as string).trim()).filter(Boolean),
  }
}

export const zUpdateAdminSchema = z.object({
  id:                z.string().uuid(),
  name:              z.string().min(1, 'Name is required').max(200),
  email:             z.string().email('Must be a valid email address'),
  password:          z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  managed_venue_ids: z.array(z.string().uuid()).min(1, 'At least one venue must be selected'),
})

export type UpdateAdminInput = z.infer<typeof zUpdateAdminSchema>

export function parseUpdateAdminFormData(fd: FormData): unknown {
  return {
    id:                (fd.get('id')       as string)?.trim(),
    name:              (fd.get('name')     as string)?.trim(),
    email:             (fd.get('email')    as string)?.trim(),
    password:          (fd.get('password') as string) || undefined,
    managed_venue_ids: fd.getAll('venue_id').map(v => (v as string).trim()).filter(Boolean),
  }
}
