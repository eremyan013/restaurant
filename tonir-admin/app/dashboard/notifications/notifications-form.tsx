'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/toast-provider'

type TargetType = 'all' | 'tier' | 'user'

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Tonir',
  2: 'Tier 2 — Ոսկի',
  3: 'Tier 3 — Արծաթ',
  4: 'Tier 4 — Ադամանդ',
}

const QUICK_TEMPLATES = [
  { label: '✅ Booking Confirmed', title: 'Booking Confirmed', body: 'Your reservation has been confirmed. See you soon!' },
  { label: '❌ Booking Cancelled', title: 'Booking Cancelled', body: 'Your reservation has been cancelled. Please contact us for more info.' },
  { label: '🎉 Special Promo', title: 'Special Offer Just for You', body: 'Exclusive deal at your favourite Tonir venue tonight. Tap to book!' },
  { label: '🏆 Tier Up', title: "You've Levelled Up!", body: "Congrats! You've reached a new tier. Check your new rewards in the app." },
]

interface UserResult {
  id: string
  name: string
  email: string
  push_token: string | null
}

export function NotificationsForm({ venues }: { venues: { id: string; name: string }[] }) {
  const toast = useToast()
  const [targetType, setTargetType] = useState<TargetType>('all')
  const [tier, setTier] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  // Issue 15: track whether a search has completed (distinguishes "not yet searched" from "no results")
  const [hasSearched, setHasSearched] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  const [audienceUsers, setAudienceUsers] = useState<UserResult[]>([])
  const [audienceTotal, setAudienceTotal] = useState(0)
  const [audienceLoading, setAudienceLoading] = useState(false)

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Issue 14: controls the inline broadcast-confirm panel
  const [confirmPending, setConfirmPending] = useState(false)

  // Fetch recipient preview count whenever target changes
  const fetchCount = useCallback(async () => {
    setCountLoading(true)
    setRecipientCount(null)
    try {
      const params = new URLSearchParams({ type: targetType })
      if (targetType === 'tier') params.set('tier', String(tier))
      if (targetType === 'user' && selectedUser) params.set('userId', selectedUser.id)
      const res = await fetch(`/api/send-push?${params}`)
      const data = await res.json()
      setRecipientCount(data.count ?? 0)
    } catch {
      setRecipientCount(null)
    } finally {
      setCountLoading(false)
    }
  }, [targetType, tier, selectedUser])

  useEffect(() => {
    if (targetType === 'user' && !selectedUser) return
    fetchCount()
  }, [fetchCount])

  // Audience preview (All Users / By Tier)
  useEffect(() => {
    if (targetType === 'user') { setAudienceUsers([]); setAudienceTotal(0); return }
    setAudienceLoading(true)
    const params = new URLSearchParams({ type: targetType, limit: '8' })
    if (targetType === 'tier') params.set('tier', String(tier))
    fetch(`/api/users/preview?${params}`)
      .then((r) => r.json())
      .then((data) => { setAudienceUsers(data.users ?? []); setAudienceTotal(data.total ?? 0) })
      .catch(() => { setAudienceUsers([]); setAudienceTotal(0) })
      .finally(() => setAudienceLoading(false))
  }, [targetType, tier])

  // User search
  useEffect(() => {
    if (targetType !== 'user' || userSearch.trim().length < 2) {
      setUserResults([])
      // Issue 15: reset hasSearched when the query becomes too short or mode changes
      setHasSearched(false)
      return
    }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearch.trim())}`)
        const data = await res.json()
        setUserResults(data.users ?? [])
      } catch {
        setUserResults([])
      } finally {
        setSearchLoading(false)
        // Issue 15: mark that at least one search attempt has completed
        setHasSearched(true)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [userSearch, targetType])

  function applyTemplate(t: typeof QUICK_TEMPLATES[number]) {
    setTitle(t.title)
    setBody(t.body)
  }

  // Issue 14: switching audience clears the pending confirm state
  function handleSetTargetType(t: TargetType) {
    setTargetType(t)
    setSelectedUser(null)
    setUserSearch('')
    setHasSearched(false)
    setConfirmPending(false)
  }

  async function send() {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }
    if (targetType === 'user' && !selectedUser) {
      setError('Select a user to send to.')
      return
    }

    // Issue 14: intercept the first click when broadcasting to all users
    if (targetType === 'all' && !confirmPending) {
      setConfirmPending(true)
      return
    }

    setSending(true)
    setError(null)
    setResult(null)

    try {
      const target =
        targetType === 'all'
          ? { type: 'all' as const }
          : targetType === 'tier'
          ? { type: 'tier' as const, tier }
          : { type: 'user' as const, userId: selectedUser!.id }

      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setResult(data)
      toast.success(`Sent ${data.sent} of ${data.total} notifications`)

      // Issue 16: reset form to defaults after a successful send
      setTitle('')
      setBody('')
      setTargetType('all')
      setTier(1)
      setSelectedUser(null)
      setUserSearch('')
      setUserResults([])
      setHasSearched(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send notifications'
      setError(msg)
      toast.error(msg)
    } finally {
      setSending(false)
      // Issue 14: always clear confirm state after send attempt (success or error)
      setConfirmPending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Compose panel ── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quick templates */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-3">Quick Templates</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <p className="text-sm font-medium text-zinc-700">Message</p>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Your booking is confirmed"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
            />
            <p className="text-right text-xs text-zinc-400 mt-0.5">{title.length}/100</p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Your table at Dolmama on June 7 at 20:00 is confirmed!"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 resize-none"
            />
            <p className="text-right text-xs text-zinc-400 mt-0.5">{body.length}/200</p>
          </div>
        </div>

        {/* Target */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <p className="text-sm font-medium text-zinc-700">Audience</p>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'tier', 'user'] as TargetType[]).map((t) => (
              <button
                key={t}
                onClick={() => handleSetTargetType(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  targetType === t
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {t === 'all' ? 'All Users' : t === 'tier' ? 'By Tier' : 'Specific User'}
              </button>
            ))}
          </div>

          {targetType === 'tier' && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Tier Level</label>
              <select
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{TIER_LABELS[n]}</option>
                ))}
              </select>
            </div>
          )}

          {(targetType === 'all' || targetType === 'tier') && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">
                {audienceLoading ? 'Loading…' : `${audienceTotal} user${audienceTotal !== 1 ? 's' : ''} in this audience`}
              </p>
              {!audienceLoading && audienceUsers.length > 0 && (
                <div className="border border-zinc-100 rounded-lg overflow-hidden">
                  {audienceUsers.map((u, i) => (
                    <div
                      key={u.id}
                      className={`flex items-center gap-3 px-3 py-2 ${i < audienceUsers.length - 1 ? 'border-b border-zinc-100' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-500 shrink-0">
                        {(u.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-900 truncate">{u.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                      </div>
                      {!u.push_token && (
                        <span className="text-xs text-amber-500 shrink-0">No token</span>
                      )}
                    </div>
                  ))}
                  {audienceTotal > audienceUsers.length && (
                    <div className="px-3 py-2 bg-zinc-50 text-xs text-zinc-400">
                      + {audienceTotal - audienceUsers.length} more user{audienceTotal - audienceUsers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
              {!audienceLoading && audienceUsers.length === 0 && (
                <p className="text-xs text-zinc-400">No users found in this audience.</p>
              )}
            </div>
          )}

          {targetType === 'user' && (
            <div className="relative">
              <label className="block text-xs text-zinc-500 mb-1">Search by name or email</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">{selectedUser.name}</p>
                    <p className="text-xs text-zinc-500">{selectedUser.email}</p>
                    {!selectedUser.push_token && (
                      <p className="text-xs text-amber-600 mt-0.5">No push token — notification will not be delivered</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedUser(null); setUserSearch(''); setHasSearched(false) }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Type name or email…"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
                  {searchLoading && (
                    <p className="text-xs text-zinc-400 mt-1">Searching…</p>
                  )}
                  {userResults.length > 0 && (
                    <div className="mt-1 border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                      {userResults.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setUserSearch(''); setUserResults([]); setHasSearched(false) }}
                          className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
                        >
                          <p className="text-sm font-medium text-zinc-900">{u.name}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                          {!u.push_token && (
                            <p className="text-xs text-amber-500">No push token</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Issue 15: empty state — only shown after a real search returned nothing */}
                  {!searchLoading && hasSearched && userResults.length === 0 && userSearch.trim().length >= 2 && (
                    <div className="mt-1 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-500">
                      No users found for &ldquo;{userSearch.trim()}&rdquo;
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Error / result */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
            Sent <strong>{result.sent}</strong> of <strong>{result.total}</strong> notifications.
            {result.failed > 0 && (
              <span className="ml-1 text-amber-600">{result.failed} failed (invalid/expired tokens).</span>
            )}
          </div>
        )}
      </div>

      {/* ── Preview sidebar ── */}
      <div className="space-y-4">
        {/* Phone preview */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-4">Preview</p>
          <div className="bg-zinc-900 rounded-2xl p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center text-lg shrink-0">
                🍽️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Tonir</p>
                  <p className="text-xs text-zinc-500">now</p>
                </div>
                <p className="text-sm font-semibold mt-0.5 leading-snug">
                  {title.trim() || <span className="text-zinc-500 font-normal">Notification title</span>}
                </p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {body.trim() || <span>Notification body text will appear here.</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recipient count */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-700 mb-2">Recipients</p>
          {countLoading ? (
            <p className="text-2xl font-semibold text-zinc-400">…</p>
          ) : recipientCount !== null ? (
            <p className="text-3xl font-semibold text-zinc-900 tabular-nums">{recipientCount}</p>
          ) : (
            <p className="text-2xl font-semibold text-zinc-300">—</p>
          )}
          <p className="text-xs text-zinc-400 mt-1">users with push token</p>
        </div>

        {/* Issue 14: inline broadcast confirmation panel — replaces the send button */}
        {confirmPending ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">Send to all users?</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This will send to{' '}
                  <strong>{recipientCount !== null ? recipientCount : '…'}</strong>{' '}
                  users with push tokens. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPending(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-medium text-zinc-700 hover:border-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="flex-1 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending…' : 'Yes, send to all'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={send}
            disabled={sending || !title.trim() || !body.trim() || (targetType === 'user' && !selectedUser)}
            className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending…' : `Send Notification${recipientCount !== null ? ` (${recipientCount})` : ''}`}
          </button>
        )}

        <p className="text-xs text-zinc-400 text-center">
          Delivered via Expo Push Service to iOS and Android.
        </p>
      </div>
    </div>
  )
}
