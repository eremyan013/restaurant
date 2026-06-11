import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { rateLimit, RATE_UPLOAD } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, RATE_UPLOAD)
  if (rl.limited) return rl.toResponse!()
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const path = `covers/${crypto.randomUUID()}.${ext}`
  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('guide-covers')
    .upload(path, buffer, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('guide-covers')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
