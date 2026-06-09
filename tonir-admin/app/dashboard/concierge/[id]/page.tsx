import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

async function setSessionStatus(id: string, status: 'escalated' | 'resolved' | 'active') {
  'use server'
  const actor = await getCurrentAdmin()
  if (actor?.role !== 'super_admin') return
  const supabase = createSupabaseAdminClient()
  await (supabase as any).from('concierge_sessions').update({ status }).eq('id', id)
  revalidatePath(`/dashboard/concierge/${id}`)
  revalidatePath('/dashboard/concierge')
}

export default async function ConciergeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getCurrentAdmin()
  if (admin?.role !== 'super_admin') redirect('/dashboard')

  const { id } = await params
  const supabase = createSupabaseAdminClient()

  const { data: session, error } = await (supabase as any)
    .from('concierge_sessions')
    .select('*, profiles(name, email, player_id, tier, yel_points)')
    .eq('id', id)
    .single()

  if (error || !session) notFound()

  const { data: messagesRaw } = await (supabase as any)
    .from('concierge_messages')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  const messages: any[] = messagesRaw ?? []

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
        <div className="flex flex-col gap-2 items-end">
          {session.status === 'escalated' && (
            <form action={setSessionStatus.bind(null, id, 'resolved')}>
              <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
                Mark resolved
              </button>
            </form>
          )}
          {session.status === 'active' && (
            <form action={setSessionStatus.bind(null, id, 'escalated')}>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#F0AB0C] hover:bg-[#d99a0b] text-zinc-900 text-sm font-medium transition-colors">
                Mark escalated
              </button>
            </form>
          )}
          {session.status === 'resolved' && (
            <form action={setSessionStatus.bind(null, id, 'active')}>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                Reopen
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">No messages in this session.</p>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-sm rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white rounded-tr-sm'
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.suggestions.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-500">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-zinc-400 text-center mt-6">
        Session started {new Date(session.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}{messages.length} messages
      </p>
    </div>
  )
}
