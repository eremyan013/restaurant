import { createSupabaseAdminClient } from './supabase-admin'
import type { AdminRole } from './current-admin'

export type ActivityAction =
  | 'confirm_reservation' | 'cancel_reservation' | 'mark_visited' | 'update_reservation_note' | 'offer_alternatives'
  | 'approve_review'      | 'hide_review'         | 'delete_review'
  | 'adjust_yel'          | 'bulk_adjust_yel'
  | 'update_venue'        | 'delete_venue'        | 'create_venue'
  | 'toggle_prize'        | 'delete_prize'        | 'create_prize'
  | 'mark_prize_used'
  | 'resolve_concierge'   | 'escalate_concierge'

export async function logActivity(
  admin: { id: string; name: string; role: AdminRole } | null,
  action: ActivityAction,
  entityType: string,
  entityId: string,
  entityName: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!admin) return
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('admin_activity_log').insert({
      admin_id:    admin.id,
      admin_name:  admin.name,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      entity_name: entityName,
      details:     (meta ?? null) as import('@/lib/database.types').Json,
    })
  } catch {
    // logging failures must never crash the actual operation
  }
}
