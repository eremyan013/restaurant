import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { rateLimit, RATE_UPLOAD } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RATE_UPLOAD)
  if (rl.limited) return rl.toResponse!()

  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const parts = file.name.split('.')
  const ext   = (parts.length > 1 ? parts.pop()! : 'jpg').toLowerCase()
  const path  = `${crypto.randomUUID()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('venue-photos')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('venue-photos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
