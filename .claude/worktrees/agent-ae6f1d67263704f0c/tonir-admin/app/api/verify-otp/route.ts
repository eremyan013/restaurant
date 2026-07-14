import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 5, windowSecs: 60 })
  if (rl.limited) return rl.toResponse!()

  try {
    const { user_id, phone, code } = await req.json()
    if (!user_id || !phone || !code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: row, error: fetchErr } = await supabase
      .from('phone_otp_codes')
      .select('id, code, expires_at, used')
      .eq('user_id', user_id)
      .eq('phone', phone)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'no_code' }, { status: 400 })
    }

    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 })
    }

    if (row.code !== String(code).trim()) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
    }

    // Mark code as used
    await supabase.from('phone_otp_codes').update({ used: true }).eq('id', row.id)

    // Mark profile as phone verified
    await supabase.from('profiles').update({ phone_verified: true }).eq('id', user_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[verify-otp]', err)
    return NextResponse.json({ error: err?.message ?? 'Verification failed' }, { status: 500 })
  }
}
