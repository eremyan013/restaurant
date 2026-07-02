import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { requirePagePermission, assertPermission } from '@/lib/permissions'

export const metadata: Metadata = { title: 'Concierge Session — Tonir Admin' }
import ConciergeReplyForm from './reply-form'
import ConciergeThread from './thread'
import ConciergeStatusButtons from './status-buttons'
import type { ConciergeMessageRow, ConciergeSessionRow } from '@/lib/database.types'

async function setSessionStatus(id: string, status: 'escalated' | 'resolved' | 'active') {
  'use server'
  const actor = await getCurrentAdmin()
  if (!actor) return
  if (actor.role !== 'super_admin') {
    const granted = await assertPermission(actor, 'concierge', 'reply')
    if (!granted) return
  }
  const supabase = createSupabaseAdminClient()
  await supabase.from('concierge_sessions').update({ status }).eq('id', id)
  revalidatePath(`/dashboard/concierge/${id}`)
  revalidatePath('/dashboard/concierge')
}

async function sendAdminReply(sessionId: string, text: string) {
  'use server'
  const actor = await getCurrentAdmin()
  if (!actor) return
  if (actor.role !== 'super_admin') {
    const granted = await assertPermission(actor, 'concierge', 'reply')
    if (!granted) return
  }
  const trimmed = text.trim().slice(0, 4000)
  if (!trimmed) return
  const supabase = createSupabaseAdminClient()
  await supabase.from('concierge_messages').insert({
    session_id: sessionId,
    role: 'admin',
    text: trimmed,
  })
  await supabase
    .from('concierge_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Send push notification to user
  const { data: sessionRow } = await supabase
    .from('concierge_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (sessionRow?.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', sessionRow.user_id)
      .single()

    if (profile?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          to:    profile.push_token,
          title: 'Concierge Reply',
          body:  trimmed.length > 100 ? trimmed.slice(0, 97) + '…' : trimmed,
          sound: 'default',
        }),
      }).catch(() => {})
    }
  }

  revalidatePath(`/dashboard/concierge/${sessionId}`)
  revalidatePath('/dashboard/concierge')
}

export default async function ConciergeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/login')
  await requirePagePermission(admin, 'concierge', 'view')

  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const { data: rawSession, error } = await supabase
    .from('concierge_sessions')
    .select('id, user_id, status, started_at, last_message_at')
    .eq('id', id)
    .single()

  if (error || !rawSession) notFound()

  const { data: profileData } = rawSession.user_id
    ? await supabase.from('profiles').select('name, email, player_id, tier, yel_points').eq('id', rawSession.user_id).single()
    : { data: null }

  type SessionWithProfile = ConciergeSessionRow & {
    profiles: { name: string; email: string; player_id: number; tier: string; yel_points: number } | null
  }
  const session: SessionWithProfile = { ...rawSession, profiles: profileData ?? null }

  const { data: messagesRaw } = await supabase
    .from('concierge_messages')
    .select('id, session_id, role, text, suggestions, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const messages: ConciergeMessageRow[] = messagesRaw ?? []

  const STATUS_STYLES: Record<string, string> = {
    active:    'bg-zinc-100 text-zinc-600',
    escalated: 'bg-red-50 text-red-600',
    resolved:  'bg-green-50 text-green-700',
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/concierge" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Concierge Inbox
        </Link>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[session.status] ?? ''}`}>
          {session.status}
        </span>
      </div>

      {/* User info */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-zinc-900">{session.profiles?.name ?? 'Anonymous'}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{session.profiles?.email ?? '—'}</p>
          {session.profiles?.player_id && (
            <p className="text-xs text-zinc-400 mt-1">
              ID {session.profiles.player_id} · {session.profiles.tier} · {(session.profiles.yel_points ?? 0).toLocaleString()} Yel
            </p>
          )}
        </div>
        <ConciergeStatusButtons
          sessionId={id}
          status={session.status}
          onMarkResolved={setSessionStatus.bind(null, id, 'resolved')}
          onMarkEscalated={setSessionStatus.bind(null, id, 'escalated')}
          onReopen={setSessionStatus.bind(null, id, 'active')}
        />
      </div>

      {/* Thread */}
      <ConciergeThread messages={messages} />

      <p className="text-xs text-zinc-400 text-center mt-6">
        Session started {new Date(session.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}{messages.length} messages
      </p>

      {/* Admin reply */}
      <ConciergeReplyForm onSend={sendAdminReply.bind(null, id)} />
    </div>
  )
}
