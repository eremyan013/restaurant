'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i)
  return bytes.buffer
}

export function PushSubscriber() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        if (Notification.permission === 'denied') return

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return

        const existing = await reg.pushManager.getSubscription()
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })

        await fetch('/api/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
      } catch {
        // Silently fail — push is an enhancement, not required
      }
    }

    subscribe()
  }, [])

  return null
}
