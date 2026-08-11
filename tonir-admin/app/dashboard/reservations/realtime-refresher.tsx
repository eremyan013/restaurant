'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export function ReservationsRealtimeRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel('reservations-admin-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => { router.refresh() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  return null
}
