import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const { venue_name, date, time, people } = await request.json() as {
    venue_name: string
    date: string
    time: string
    people: number
  }

  if (!venue_name || !date || !time) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS })
  }

  const supabase = createSupabaseAdminClient()
  const { data: admins } = await (supabase as any)
    .from('profiles')
    .select('push_token')
    .eq('is_admin', true)
    .not('push_token', 'is', null)

  const tokens: string[] = ((admins ?? []) as Array<{ push_token: string }>)
    .map((a) => a.push_token)
    .filter(Boolean)

  if (tokens.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: '🍽️ New Reservation Request',
          body: `${venue_name} · ${date} · ${time} · ${people} ppl`,
          sound: 'default',
        }))
      ),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true }, { headers: CORS })
}
