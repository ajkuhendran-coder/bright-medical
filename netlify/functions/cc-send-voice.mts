// cc-send-voice — Command Center schickt eine SPRACHNACHRICHT (Coach → Klientin) ins Portal.
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> (gleicher Scope wie cc-coach-reply:
//   schreibt eine Coach-Nachricht; bewusst getrennt vom Mailversand-Secret).
// Body: { email, audioBase64, mime, seconds?, note? }
//   → Audio in den privaten EU-Bucket 'coach-voice' (wie Tagebuch-Fotos), portal_messages-Zeile mit audio_path.
//   → Klientin hört die Nachricht im Portal ab (signierte Kurzzeit-URL). Sie kann selbst KEINE Voice senden (nur Text).
// Returns { ok, id, created_at, audioUrl } / 4xx / 5xx.
//
// Muster: cc-coach-reply (Auth + Ping) + submit-portal-diary (sbUpload + Signed-URL).

import type { Context } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { getSupabaseCreds, sbInsert, sbUpload, sbSignedUrl } from './_shared/supabase.ts'
import { notifyClientNewMessage } from './_shared/notify-client.ts'
import { sendPushToClient } from './_shared/push.ts'

const VOICE_BUCKET = 'coach-voice'
const MAX_AUDIO_BYTES = 15 * 1024 * 1024 // 15 MB (großzügig; iPhone-Sprachmemo ~1 MB/Min)
const MAX_NOTE = 500
// Erlaubte Audio-MIME-Typen → Dateiendung. iPhone-Sprachmemo = audio/mp4 (AAC/.m4a).
const EXT_BY_MIME: Record<string, string> = {
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'm4a',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/ogg': 'ogg', 'audio/webm': 'webm',
  'audio/wav': 'wav', 'audio/x-wav': 'wav',
}

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
  const presented = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const email = normEmail(body?.email)
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })

  const mime = typeof body?.mime === 'string' ? body.mime.trim().toLowerCase() : ''
  const ext = EXT_BY_MIME[mime]
  if (!ext) return jsonResponse(400, { error: `Nicht unterstütztes Audio-Format: ${mime || '(keins)'}`, allowed: Object.keys(EXT_BY_MIME) })

  if (typeof body?.audioBase64 !== 'string' || !body.audioBase64) return jsonResponse(400, { error: 'Missing "audioBase64"' })
  let bytes: Buffer
  try { bytes = Buffer.from(body.audioBase64, 'base64') } catch { return jsonResponse(400, { error: 'Audio-Daten ungültig' }) }
  if (bytes.length === 0) return jsonResponse(400, { error: 'Audio-Daten leer' })
  if (bytes.length > MAX_AUDIO_BYTES) return jsonResponse(413, { error: 'Audio zu groß (max 15 MB)' })

  const seconds = Number.isFinite(body?.seconds) ? Math.max(0, Math.min(7200, Math.floor(body.seconds))) : null
  const note = (typeof body?.note === 'string' ? body.note.trim() : '').slice(0, MAX_NOTE) || null

  const safeSub = email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  const path = `${safeSub}/${randomUUID()}.${ext}`
  try {
    await sbUpload(creds, VOICE_BUCKET, path, new Uint8Array(bytes), mime)
  } catch (err) {
    console.error('[cc-send-voice] storage upload failed', err)
    return jsonResponse(500, { error: 'Sprachnachricht konnte nicht gespeichert werden.' })
  }

  let row: any
  try {
    const rows = await sbInsert(creds, 'portal_messages', {
      client_sub: email,
      sender: 'coach',
      text: note || '🎙️ Sprachnachricht',
      audio_path: path,
      audio_seconds: seconds,
    })
    row = Array.isArray(rows) ? rows[0] : rows
  } catch (err) {
    console.error('[cc-send-voice] supabase insert failed', err)
    return jsonResponse(500, { error: 'Nachricht konnte nicht gespeichert werden.' })
  }

  // Best-effort: Klientin über die neue Nachricht informieren — INHALTSFREI (Kanal-Hygiene).
  await notifyClientNewMessage({ clientEmail: email })
  await sendPushToClient(email, { title: 'Neue Nachricht', body: 'Neue Nachricht in Ihrem Bereich „Mein Programm".', tag: 'coach-message' })

  let audioUrl: string | null = null
  try { audioUrl = await sbSignedUrl(creds, VOICE_BUCKET, path) } catch { /* Anzeige folgt beim Laden */ }

  console.log(`✓ cc-send-voice an ${email} (${ext}, ${bytes.length} B)`)
  return jsonResponse(200, { ok: true, id: row?.id, created_at: row?.created_at, audioUrl })
}
