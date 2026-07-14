/**
 * Unit tests for app/api/upload-venue-photo/route.ts
 *
 * This route handles file uploads to Supabase storage.
 * Behaviors:
 *   - Must return 403 for unauthenticated requests (any admin role is fine)
 *   - Must return {url} on success
 *   - Must reject requests without a file (400)
 *   - Must return 500 on storage errors
 *   - File extension is derived from file.name; files with no dot fall back to 'jpg'
 *   - Upload path uses crypto.randomUUID() + extension
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/current-admin',  () => ({ getCurrentAdmin: vi.fn() }))

import { POST } from '@/app/api/upload-venue-photo/route'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getCurrentAdmin } from '@/lib/current-admin'
import { makeMockSupabaseClient, SUPER_ADMIN, REGULAR_ADMIN } from '../../helpers/supabase-mock'

function makeUploadRequest(file: File | null): NextRequest {
  const fd = new FormData()
  if (file) fd.set('file', file)
  return new NextRequest('http://localhost/api/upload-venue-photo', {
    method: 'POST',
    body: fd,
  })
}

function makeFile(name: string, type = 'image/jpeg', content = 'fake-image-bytes') {
  return new File([content], name, { type })
}

describe('POST /api/upload-venue-photo', () => {
  let client: ReturnType<typeof makeMockSupabaseClient>

  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(SUPER_ADMIN)
    client = makeMockSupabaseClient({
      storage: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/venue-photos/abc.jpg' },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as any)
  })

  // ── Authorization ──────────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 403 for unauthenticated requests', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null)

    const res = await POST(makeUploadRequest(makeFile('photo.jpg')))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Forbidden' })
  })

  it('[HAPPY PATH] regular admin can upload (any authenticated admin is allowed)', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(REGULAR_ADMIN)

    const res = await POST(makeUploadRequest(makeFile('photo.jpg')))

    expect(res.status).toBe(200)
  })

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('[HAPPY PATH] returns {url} with public URL on successful upload', async () => {
    const res = await POST(makeUploadRequest(makeFile('photo.jpg')))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('url')
    expect(typeof json.url).toBe('string')
    expect(json.url).toMatch(/^https:\/\//)
  })

  it('[HAPPY PATH] uses file extension from file.name', async () => {
    const pngFile = makeFile('banner.png', 'image/png')

    await POST(makeUploadRequest(pngFile))

    const storageMock = (client.storage.from as any).mock.results[0].value
    const uploadCall = (storageMock.upload as any).mock.calls[0]
    const uploadPath: string = uploadCall?.[0] ?? ''
    expect(uploadPath).toMatch(/\.png$/)
  })

  it('[HAPPY PATH] falls back to "jpg" when file has no dot in name', async () => {
    // Fixed: parts.length > 1 check means 'noext' now correctly falls back to 'jpg'
    const noExtFile = makeFile('noext', 'image/jpeg')

    await POST(makeUploadRequest(noExtFile))

    const storageMock = (client.storage.from as any).mock.results[0].value
    const uploadCall = (storageMock.upload as any).mock.calls[0]
    const uploadPath: string = uploadCall?.[0] ?? ''
    expect(uploadPath).toMatch(/\.jpg$/)
  })

  it('[HAPPY PATH] uploads with correct contentType from file.type', async () => {
    const webpFile = makeFile('image.webp', 'image/webp')

    await POST(makeUploadRequest(webpFile))

    const storageMock = (client.storage.from as any).mock.results[0].value
    const uploadCall = (storageMock.upload as any).mock.calls[0]
    const uploadOptions = uploadCall?.[2] ?? {}
    expect(uploadOptions.contentType).toBe('image/webp')
  })

  it('[HAPPY PATH] uses upsert:false to prevent overwriting existing files', async () => {
    await POST(makeUploadRequest(makeFile('photo.jpg')))

    const storageMock = (client.storage.from as any).mock.results[0].value
    const uploadOptions = (storageMock.upload as any).mock.calls[0]?.[2] ?? {}
    expect(uploadOptions.upsert).toBe(false)
  })

  // ── Failure scenarios ──────────────────────────────────────────────────────

  it('[FAILURE SCENARIO] returns 400 when no file is provided in the form', async () => {
    const res = await POST(makeUploadRequest(null))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Missing file' })
  })

  it('[FAILURE SCENARIO] returns 500 when supabase storage upload fails', async () => {
    const failingClient = makeMockSupabaseClient({
      storage: { uploadError: { message: 'Bucket not found' } },
    })
    vi.mocked(createSupabaseAdminClient).mockReturnValue(failingClient as any)

    const res = await POST(makeUploadRequest(makeFile('photo.jpg')))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json).toMatchObject({ error: 'Bucket not found' })
  })
})
