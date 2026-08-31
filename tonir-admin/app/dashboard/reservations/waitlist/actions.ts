'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/current-admin'
import { assertPermission } from '@/lib/permissions'
import { logActivity } from '@/lib/log-activity'

export async function notifyWaitlist(
  venueId: string,
): Promise<{ ok: boolean; error?: string; notified?: number }> {
  const admin = await getCurrentAdmin()
  if (!admin) return { ok: false, error: 'Unauthorized' }
  if (!(await assertPermission(admin, 'reservations', 'manage'))) return { ok: false, error: 'Forbidden' }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-waitlist`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ venue_id: venueId }),
    },
  )

  if (!res.ok) return { ok: false, error: 'Edge function error' }
  const data = await res.json()

  await logActivity(admin, 'notify_waitlist', 'venue', venueId, venueId, { notified: data.notified })
  revalidatePath('/dashboard/reservations/waitlist')
  return { ok: true, notified: data.notified }
}
