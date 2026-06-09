import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    // Dev fallback: log the code instead of sending
    console.log(`[OTP] SMS to ${to}: ${body}`)
    return
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `Twilio error ${res.status}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, phone } = await req.json()
    if (!user_id || !phone) {
      return NextResponse.json({ error: 'Missing user_id or phone' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Delete any existing unused codes for this user
    await supabase.from('phone_otp_codes').delete().eq('user_id', user_id).eq('used', false)

    const code = generateCode()

    const { error: insertErr } = await supabase.from('phone_otp_codes').insert({
      user_id,
      phone,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (insertErr) throw insertErr

    await sendSms(phone, `Ձեր Tonir հաստատման կոդն է: ${code}`)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-otp]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to send OTP' }, { status: 500 })
  }
}
