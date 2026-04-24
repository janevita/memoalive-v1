/**
 * /api/upload/[token]
 *
 * GET  — validates a session token; returns { valid, scrapbookTitle, expiresAt }
 * POST — accepts a file (multipart/form-data field "file"), uploads it to
 *        Supabase Storage under phone-uploads/{sessionId}/, saves the URL to
 *        upload_session_photos, and returns { url }.
 *
 * Both endpoints are public — auth is provided by the unguessable session token.
 * File upload uses the service-role key so it bypasses Storage RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { randomUUID }                from 'crypto'

// Service-role client — server only, never exposed to the browser
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service-role env vars missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── GET — validate session ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const sb = adminClient()
    const { data: session } = await sb
      .from('upload_sessions')
      .select('id, scrapbook_title, expires_at')
      .eq('token', params.token)
      .single()

    if (!session) {
      return NextResponse.json({ valid: false }, { status: 404 })
    }

    const valid = new Date((session as any).expires_at) > new Date()
    return NextResponse.json({
      valid,
      scrapbookTitle: (session as any).scrapbook_title ?? null,
      expiresAt:      (session as any).expires_at,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}

// ── POST — upload a file ──────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const sb = adminClient()

    // 1. Validate and fetch session
    const { data: session } = await sb
      .from('upload_sessions')
      .select('id, expires_at')
      .eq('token', params.token)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 404 })
    }
    if (new Date((session as any).expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 })
    }

    const sessionId = (session as any).id as string

    // 2. Parse file from multipart/form-data
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Validate file type
    const mime = file.type || 'image/jpeg'
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 415 })
    }

    // 4. Max 50 MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 })
    }

    // 5. Upload to Supabase Storage
    const ext  = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
    const path = `phone-uploads/${sessionId}/${randomUUID()}.${ext}`

    const buffer = await file.arrayBuffer()

    const { error: storageErr } = await sb.storage
      .from('memory-media')
      .upload(path, buffer, { contentType: mime, upsert: false })

    if (storageErr) {
      return NextResponse.json({ error: storageErr.message }, { status: 500 })
    }

    // 6. Get public URL
    const { data: { publicUrl } } = sb.storage
      .from('memory-media')
      .getPublicUrl(path)

    // 7. Record in upload_session_photos
    await sb.from('upload_session_photos').insert({
      session_id: sessionId,
      url:        publicUrl,
      filename:   file.name || `photo.${ext}`,
    })

    return NextResponse.json({ url: publicUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
