import { z } from 'zod'

export const zYelAdjustSchema = z.object({
  user_id: z.string().uuid('A valid user must be selected'),
  amount:  z.number()
             .int('Amount must be a whole number')
             .refine(v => v !== 0, 'Amount cannot be zero'),
})

export type YelAdjustInput = z.infer<typeof zYelAdjustSchema>

export function parseYelFormData(fd: FormData): unknown {
  return {
    user_id: (fd.get('user_id') as string)?.trim(),
    amount:  Number(fd.get('amount')),
  }
}
