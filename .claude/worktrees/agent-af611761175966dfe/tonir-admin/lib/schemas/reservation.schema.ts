import { z } from 'zod'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HH_MM    = /^\d{2}:\d{2}$/

export const zNewReservationSchema = z.object({
  venue_id:  z.string().uuid('Venue is required'),
  user_id:   z.string().uuid('A guest must be selected'),
  date_iso:  z.string().regex(ISO_DATE, 'Date must be YYYY-MM-DD'),
  time:      z.string().regex(HH_MM, 'Time must be HH:MM'),
  people:    z.number().int().min(1, 'At least 1 guest').max(50, 'Maximum 50 guests'),
  status:    z.enum(['confirmed', 'pending']).default('confirmed'),
  occasion:  z.string().max(200).nullable().optional(),
  note:      z.string().max(1000).nullable().optional(),
})

export type NewReservationInput = z.infer<typeof zNewReservationSchema>

export function parseNewReservationFormData(fd: FormData): unknown {
  return {
    venue_id:  (fd.get('venue_id')  as string)?.trim(),
    user_id:   (fd.get('user_id')   as string)?.trim(),
    date_iso:  (fd.get('date_iso')  as string)?.trim(),
    time:      (fd.get('time')      as string)?.trim(),
    people:    Number(fd.get('people')),
    status:    (fd.get('status')    as string)?.trim() || 'confirmed',
    occasion:  (fd.get('occasion')  as string)?.trim() || null,
    note:      (fd.get('note')      as string)?.trim() || null,
  }
}

export const zEditReservationSchema = z.object({
  id:       z.string().uuid(),
  date_iso: z.string().regex(ISO_DATE, 'Date must be YYYY-MM-DD'),
  time:     z.string().regex(HH_MM, 'Time must be HH:MM'),
  people:   z.number().int().min(1, 'At least 1 guest').max(50, 'Maximum 50 guests'),
  occasion: z.string().max(200).nullable().optional(),
  note:     z.string().max(1000).nullable().optional(),
})

export type EditReservationInput = z.infer<typeof zEditReservationSchema>

export function parseEditReservationFormData(fd: FormData): unknown {
  return {
    id:       (fd.get('id')       as string)?.trim(),
    date_iso: (fd.get('date_iso') as string)?.trim(),
    time:     (fd.get('time')     as string)?.trim(),
    people:   Number(fd.get('people')),
    occasion: (fd.get('occasion') as string)?.trim() || null,
    note:     (fd.get('note')     as string)?.trim() || null,
  }
}
