// portal-diary — liefert die Tagebuch-Einträge der Klientin fürs Portal.
// Method: POST · Body { token } · verifiziert das Portal-JWT, liest portal_diary.
// Fotos werden als zeitlich begrenzte Signed-URLs ausgeliefert (Bucket ist privat).
// Returns { ok, configured, entries: [{ id, time_label, title, tag, detail, photoUrl, created_at }] }.

import type { Context } from '@netlify/functions'
import { verifyPortalToken } from './_shared/jwt.js'
import { getSupabaseCreds, sbSelect, sbSignedUrl } from './_shared/supabase.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token) return jsonResponse(400, { error: 'Missing token' })

  const verified = verifyPortalToken(token, jwtSecret)
  if (!verified.ok) {
    const code = verified.reason === 'expired' ? 401 : 400
    return jsonResponse(code, { error: 'Ungültiger oder abgelaufener Link', reason: verified.reason })
  }
  const payload = verified.payload

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(200, { ok: true, configured: false, entries: [] })

  try {
    const rows = await sbSelect(
      creds,
      'portal_diary',
      `client_sub=eq.${encodeURIComponent(payload.sub)}&order=created_at.desc&select=id,time_label,title,tag,detail,photo_path,created_at`,
    )
    const entries = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        time_label: r.time_label,
        title: r.title,
        tag: r.tag,
        detail: r.detail,
        created_at: r.created_at,
        photoUrl: r.photo_path ? await sbSignedUrl(creds, 'diary-photos', r.photo_path).catch(() => null) : null,
      })),
    )
    return jsonResponse(200, { ok: true, configured: true, entries })
  } catch (err) {
    console.error('[portal-diary] supabase select failed', err)
    return jsonResponse(500, { error: 'Tagebuch konnte nicht geladen werden.' })
  }
}
