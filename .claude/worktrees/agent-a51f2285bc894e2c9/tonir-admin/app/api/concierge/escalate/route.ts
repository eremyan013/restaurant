import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  const { session_id } = await request.json() as { session_id?: string }
  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400, headers: CORS })
  }

  const supabase = createSupabaseAdminClient()
  await (supabase as any)
    .from('concierge_sessions')
    .update({ status: 'escalated' })
    .eq('id', session_id)

  return NextResponse.json({ ok: true }, { headers: CORS })
}
