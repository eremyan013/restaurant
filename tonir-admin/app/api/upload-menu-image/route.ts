import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const venueId = formData.get('venueId') as string | null

  if (!file || !venueId) {
    return NextResponse.json({ error: 'Missing file or venueId' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const path = `${venueId}/${crypto.randomUUID()}.${ext}`

  const buffer = new Uint8Array(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(path, buffer, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('menu-images')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
