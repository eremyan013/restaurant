import { z } from 'zod'

export const zPrizeSchema = z.object({
  name:           z.string().min(1, 'Prize name is required').max(200),
  description:    z.string().max(1000).nullable().optional(),
  type:           z.enum(['discount', 'free_item', 'experience', 'voucher']),
  unlock_type:    z.enum(['points', 'tier']),
  points_cost:    z.number().int().positive('Points cost must be a positive integer').nullable().optional(),
  min_tier_level: z.number().int().min(1).max(4).nullable().optional(),
  venue_id:       z.string().uuid().nullable().optional(),
  image_url:      z.string().url('Must be a valid URL').nullable().optional(),
  stock:          z.number().int().positive('Stock must be a positive integer').nullable().optional(),
  sort_order:     z.number().int().min(0).default(0),
  is_active:      z.boolean().default(true),
  expires_at:     z.string().nullable().optional(),
}).superRefine((val, ctx) => {
  if (val.unlock_type === 'points' && !val.points_cost) {
    ctx.addIssue({ code: 'custom', path: ['points_cost'], message: 'Points cost is required' })
  }
  if (val.unlock_type === 'tier' && !val.min_tier_level) {
    ctx.addIssue({ code: 'custom', path: ['min_tier_level'], message: 'Tier level is required' })
  }
})

export type PrizeInput = z.infer<typeof zPrizeSchema>

export function parsePrizeFormData(fd: FormData): unknown {
  const unlockType     = fd.get('unlock_type') as string
  const unlimitedStock = fd.get('unlimited_stock') === 'on'
  const stockRaw       = (fd.get('stock') as string)?.trim()
  const venueRaw       = (fd.get('venue_id') as string)?.trim()
  const imageRaw       = (fd.get('image_url') as string)?.trim()
  const pointsRaw      = (fd.get('points_cost') as string)?.trim()
  const tierRaw        = (fd.get('min_tier_level') as string)?.trim()

  return {
    name:           (fd.get('name') as string)?.trim(),
    description:    (fd.get('description') as string)?.trim() || null,
    type:           fd.get('type'),
    unlock_type:    unlockType,
    points_cost:    unlockType === 'points' && pointsRaw ? Number(pointsRaw) : null,
    min_tier_level: unlockType === 'tier'   && tierRaw   ? Number(tierRaw)   : null,
    venue_id:       venueRaw || null,
    image_url:      imageRaw || null,
    stock:          (!unlimitedStock && stockRaw) ? Number(stockRaw) : null,
    sort_order:     Number(fd.get('sort_order')) || 0,
    is_active:      fd.get('is_active') === 'true',
    expires_at:     ((fd.get('expires_at') as string)?.trim()) ? new Date(fd.get('expires_at') as string).toISOString() : null,
  }
}
