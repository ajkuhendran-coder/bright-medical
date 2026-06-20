// cc-client-diary — Command-Center-Lesezugriff auf das Tagebuch EINER Klientin inkl. Foto-Signed-URLs.
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> · Body { email, limit? }
// Liest portal_diary (service_role, umgeht RLS) + signiert Fotos aus dem privaten Bucket diary-photos.
// Returns { ok, count, entries: [{ id, time_label, title, tag, detail, photoUrl, created_at }] } (neueste zuerst).
//
// Sicherheit: umgeht RLS und kann JEDE Klientin lesen -> ausschliesslich hinter dem CC_API_SECRET.
// Foto-Signed-URLs sind kurzlebig (1h) und werden pro Request frisch erzeugt. Nur fuers Command Center.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbSelect, sbSignedUrl } from './_shared/supabase.ts'

const PHOTO_TTL_SECONDS = 3600

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function normEmail(x: unknown): string {
  return typeof x === 'string' ? x.trim().toLowerCase() : ''
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('CC_API_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (CC_API_SECRET)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const email = normEmail(body?.email)
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })
  const limit = Number.isFinite(body?.limit) ? Math.min(500, Math.max(1, Math.floor(body.limit))) : 100

  try {
    const rows = await sbSelect(
      creds,
      'portal_diary',
      `client_sub=eq.${encodeURIComponent(email)}&order=created_at.desc&select=id,time_label,title,tag,detail,photo_path,created_at&limit=${limit}`,
    )
    const entries = await Promise.all(
      rows.map(async (r) => {
        let photoUrl: string | null = null
        if (r.photo_path) {
          try { photoUrl = await sbSignedUrl(creds, 'diary-photos', r.photo_path, PHOTO_TTL_SECONDS) } catch { photoUrl = null }
        }
        return {
          id: r.id,
          time_label: r.time_label,
          title: r.title,
          tag: r.tag,
          detail: r.detail,
          photoUrl,
          created_at: r.created_at,
        }
      }),
    )
    return jsonResponse(200, { ok: true, count: entries.length, entries })
  } catch (err) {
    console.error('[cc-client-diary] supabase select failed', err)
    return jsonResponse(500, { error: 'Tagebuch konnte nicht geladen werden.' })
  }
}
