import type { ZodSchema, ZodError } from 'zod'

export type ActionState<T = Record<string, string>> =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<keyof T, string>> }

export function validateAction<T>(
  schema: ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; state: ActionState<T> } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  return { success: false, state: { ok: false, fieldErrors: flattenZodErrors<T>(result.error) } }
}

function flattenZodErrors<T>(error: ZodError): Partial<Record<keyof T, string>> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as string
    if (key && !out[key]) out[key] = issue.message
  }
  return out as Partial<Record<keyof T, string>>
}
