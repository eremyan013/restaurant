'use server'

import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// ── Per-section permission union types ────────────────────────────────────────
export type ReservationsPermission  = null | 'view' | 'manage'
export type ReviewsPermission       = null | 'view' | 'moderate'
export type YelPermission           = null | 'view' | 'adjust' | 'bulk'
export type UsersPermission         = null | 'view' | 'edit'
export type VenuesPermission        = null | 'view' | 'edit'
export type PrizesPermission        = null | 'view' | 'manage'
export type ConciergePermission     = null | 'view' | 'reply'
export type RedemptionPermission    = null | 'view' | 'redeem'
export type ActivityLogPermission   = null | 'view'
export type GuidesPermission        = null | 'view' | 'manage'
export type MenusPermission         = null | 'view' | 'manage'

export interface AdminPermissions {
  reservations:  ReservationsPermission
  reviews:       ReviewsPermission
  yel:           YelPermission
  users:         UsersPermission
  venues:        VenuesPermission
  prizes:        PrizesPermission
  concierge:     ConciergePermission
  redemption:    RedemptionPermission
  activity_log:  ActivityLogPermission
  guides:        GuidesPermission
  menus:         MenusPermission
}

export type PermissionSection = keyof AdminPermissions

export const PERMISSION_SECTIONS: PermissionSection[] = [
  'reservations', 'reviews', 'yel', 'users', 'venues', 'prizes',
  'concierge', 'redemption', 'activity_log', 'guides', 'menus',
]

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  reservations: null, reviews: null, yel: null, users: null, venues: null,
  prizes: null, concierge: null, redemption: null, activity_log: null,
  guides: null, menus: null,
}

// Sentinel used for super_admin — all sections fully granted
const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  reservations: 'manage', reviews: 'moderate', yel: 'bulk', users: 'edit',
  venues: 'edit', prizes: 'manage', concierge: 'reply', redemption: 'redeem',
  activity_log: 'view', guides: 'manage', menus: 'manage',
}

const HIERARCHY: Record<PermissionSection, string[]> = {
  reservations: ['view', 'manage'],
  reviews:      ['view', 'moderate'],
  yel:          ['view', 'adjust', 'bulk'],
  users:        ['view', 'edit'],
  venues:       ['view', 'edit'],
  prizes:       ['view', 'manage'],
  concierge:    ['view', 'reply'],
  redemption:   ['view', 'redeem'],
  activity_log: ['view'],
  guides:       ['view', 'manage'],
  menus:        ['view', 'manage'],
}

export function hasPermission(
  permissions: AdminPermissions,
  section: PermissionSection,
  required: string,
): boolean {
  const actual = permissions[section]
  if (!actual) return false
  const chain = HIERARCHY[section]
  const ri = chain.indexOf(required)
  const ai = chain.indexOf(actual)
  return ri !== -1 && ai !== -1 && ai >= ri
}

export async function getAdminPermissions(adminId: string): Promise<AdminPermissions> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('admin_id', adminId)
    .maybeSingle()
  if (!data) return { ...DEFAULT_PERMISSIONS }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin_id, created_at, updated_at, ...perms } = data
  return { ...DEFAULT_PERMISSIONS, ...perms } as AdminPermissions
}

// For page Server Components — redirects on failure
export async function requirePagePermission(
  admin: { id: string; role: string },
  section: PermissionSection,
  level: string,
): Promise<AdminPermissions> {
  if (admin.role === 'super_admin') return { ...SUPER_ADMIN_PERMISSIONS }
  const perms = await getAdminPermissions(admin.id)
  if (!hasPermission(perms, section, level)) redirect('/dashboard')
  return perms
}

// For server actions — returns flag instead of redirecting
export async function assertPermission(
  admin: { id: string; role: string },
  section: PermissionSection,
  level: string,
): Promise<boolean> {
  if (admin.role === 'super_admin') return true
  const perms = await getAdminPermissions(admin.id)
  return hasPermission(perms, section, level)
}

// FormData → AdminPermissions (used by createAdmin / updateAdmin)
export function parsePermissionsFromFormData(fd: FormData): AdminPermissions {
  const result = { ...DEFAULT_PERMISSIONS }
  for (const section of PERMISSION_SECTIONS) {
    const val = (fd.get(`perm_${section}`) as string | null) ?? ''
    ;(result as Record<string, unknown>)[section] = val === '' ? null : val
  }
  return result
}
