// submit-portal-diary — speichert einen Tagebuch-Eintrag der Klientin.
// Optional mit Foto (Foto-Ernährungstagebuch, Art. 9): das Bild wird in den
// privaten Supabase-Storage (EU/Frankfurt) geladen, der Eintrag verweist per
// photo_path darauf. Anzeige später über zeitlich begrenzte Signed-URLs.
//
// Method: POST · Body { token, title, tag, detail?, time?, photoBase64?, photoType? }
// Returns { ok, entry } / 4xx / 5xx. Echtheit über das signierte Portal-JWT.

import type { Context } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { verifyPortalToken, tokenIdShort } from './_shared/jwt.js'
import { notifyCC } from './_shared/notify-cc.ts'
import { notifyAdminPortalActivity } from './_shared/notify-admin.ts'
import { getSupabaseCreds, sbInsert, sbUpload, sbSignedUrl } from './_shared/supabase.ts'

const MAX_TITLE = 200
const MAX_DETAIL = 1000
const MAX_PHOTO_BYTES = 8 * 1024 * 1024 // 8 MB (komprimiert sind es i. d. R. < 500 KB)
const ALLOWED_TAGS = new Set(['Mahlzeit', 'Bewegung', 'Schlaf', 'Notiz', 'Foto'])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 60
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const e = rateLimitMap.get(ip)
  if (!e || now - e.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now })
    return false
  }
  e.count++
  return e.count > RATE_LIMIT_MAX
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

  // Rate-Limit an die geprüfte Token-Identität binden (nicht an den fälschbaren x-forwarded-for-Header).
  if (isRateLimited(payload.sub)) return jsonResponse(429, { error: 'Zu viele Anfragen. Bitte später erneut.' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Portal-Speicher ist noch nicht konfiguriert.' })

  const title = (typeof body?.title === 'string' ? body.title.trim() : '').slice(0, MAX_TITLE) || 'Eintrag'
  const tag = ALLOWED_TAGS.has(body?.tag) ? body.tag : 'Notiz'
  const detail = (typeof body?.detail === 'string' ? body.detail.trim() : '').slice(0, MAX_DETAIL) || null
  const time = typeof body?.time === 'string' ? body.time.trim().slice(0, 16) : null

  // Ess-Zeitpunkt (vom Klienten gemeint, ISO). Fehlt → jetzt. Nicht in der Zukunft (+15 min
  // Toleranz), höchstens 7 Tage zurück (gegen Fehleingaben/Missbrauch).
  let eatenAtIso = new Date().toISOString()
  if (typeof body?.eatenAt === 'string' && body.eatenAt) {
    const t = Date.parse(body.eatenAt)
    const now = Date.now()
    if (Number.isNaN(t) || t > now + 15 * 60 * 1000 || t < now - 7 * 24 * 60 * 60 * 1000) {
      return jsonResponse(400, { error: 'Zeitpunkt ungültig (nicht in der Zukunft, höchstens 7 Tage zurück).' })
    }
    eatenAtIso = new Date(t).toISOString()
  }

  // Optionales Foto in den privaten Storage laden
  let photoPath: string | null = null
  if (typeof body?.photoBase64 === 'string' && body.photoBase64) {
    let bytes: Buffer
    try { bytes = Buffer.from(body.photoBase64, 'base64') } catch { return jsonResponse(400, { error: 'Foto-Daten ungültig' }) }
    if (bytes.length === 0) return jsonResponse(400, { error: 'Foto-Daten leer' })
    if (bytes.length > MAX_PHOTO_BYTES) return jsonResponse(413, { error: 'Foto zu groß' })
    const safeSub = payload.sub.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
    const ext = body?.photoType === 'image/png' ? 'png' : 'jpg'
    photoPath = `${safeSub}/${randomUUID()}.${ext}`
    try {
      await sbUpload(creds, 'diary-photos', photoPath, new Uint8Array(bytes), body?.photoType === 'image/png' ? 'image/png' : 'image/jpeg')
    } catch (err) {
      console.error('[submit-portal-diary] storage upload failed', err)
      return jsonResponse(500, { error: 'Foto konnte nicht gespeichert werden.' })
    }
  }

  const insertRow: Record<string, unknown> = {
    client_sub: payload.sub,
    subject_id: payload.subjectId ?? null,
    time_label: time,
    title,
    tag,
    detail,
    photo_path: photoPath,
    eaten_at: eatenAtIso,
  }
  let row: any
  try {
    const rows = await sbInsert(creds, 'portal_diary', insertRow)
    row = Array.isArray(rows) ? rows[0] : rows
  } catch (err) {
    // eaten_at-Spalte evtl. noch nicht angelegt (SQL noch nicht ausgeführt) → ohne sie erneut
    // versuchen, damit ein Deploy VOR der SQL das Speichern nicht bricht (created_at bleibt die Zeit).
    console.warn('[submit-portal-diary] Insert mit eaten_at fehlgeschlagen, Retry ohne', (err as Error).message)
    try {
      const { eaten_at, ...legacy } = insertRow
      const rows = await sbInsert(creds, 'portal_diary', legacy)
      row = Array.isArray(rows) ? rows[0] : rows
    } catch (err2) {
      console.error('[submit-portal-diary] supabase insert failed', err2)
      return jsonResponse(500, { error: 'Eintrag konnte nicht gespeichert werden.' })
    }
  }

  let photoUrl: string | null = null
  if (photoPath) {
    try { photoUrl = await sbSignedUrl(creds, 'diary-photos', photoPath) } catch { /* Anzeige folgt beim Laden */ }
  }

  await notifyCC({
    event: 'bm.portal.diary',
    email: payload.sub,
    data: {
      ...(payload.subjectId ? { subjectId: payload.subjectId } : {}),
      title,
      tag,
      hasPhoto: !!photoPath,
    },
  })
  // CC-unabhängiger Fallback: Dr. K direkt per Mail an info@ benachrichtigen.
  await notifyAdminPortalActivity({ kind: 'Tagebuch-Eintrag', clientSub: payload.sub, clientName: payload.name, preview: `${tag}: ${title}${photoPath ? ' (mit Foto)' : ''}` })

  console.log(`✓ Portal-Tagebuch: ${payload.sub} (${tag}${photoPath ? '+Foto' : ''}, token=${tokenIdShort(token)})`)
  return jsonResponse(200, {
    ok: true,
    entry: { id: row?.id, time_label: row?.time_label, title: row?.title, tag: row?.tag, detail: row?.detail, photoUrl, created_at: row?.created_at, eaten_at: row?.eaten_at ?? null },
  })
}
