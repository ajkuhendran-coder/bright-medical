// cc-coach-reply — Command Center schreibt eine Coach-Antwort in den Portal-Thread EINER Klientin.
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> · Body { email, text, subjectId? }
// INSERT portal_messages { client_sub, subject_id?, sender:'coach', text } -> erscheint sofort im
// Patienten-Portal (portal-thread mappt sender='coach' als Gegenseite).
// Returns { ok, id, created_at }.
//
// Sicherheit: schreibt patientensichtbare Nachrichten und umgeht RLS -> ausschliesslich hinter dem
// CC_API_SECRET. Der eigentliche Freigabe-Schritt (Arzt prueft Claude-Entwurf) passiert IM Command
// Center; diese Function ist nur der Schreibpfad nach erfolgter Freigabe.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbInsert } from './_shared/supabase.ts'
import { notifyClientNewMessage } from './_shared/notify-client.ts'

const MAX_TEXT = 4000

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
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return jsonResponse(400, { error: 'Missing "text"' })
  if (text.length > MAX_TEXT) return jsonResponse(400, { error: `"text" too long (max ${MAX_TEXT})` })
  const subjectId = (typeof body?.subjectId === 'string' && body.subjectId.trim()) ? body.subjectId.trim().slice(0, 80) : null

  try {
    const rows = await sbInsert(creds, 'portal_messages', {
      client_sub: email,
      ...(subjectId ? { subject_id: subjectId } : {}),
      sender: 'coach',
      text,
    })
    const row = Array.isArray(rows) ? rows[0] : rows
    // Best-effort: Klientin über die neue Coach-Nachricht informieren (E-Mail; Push folgt separat).
    // notifyClientNewMessage schluckt eigene Fehler -> der Coach-Write scheitert hieran nie.
    await notifyClientNewMessage({ clientEmail: email })
    return jsonResponse(200, { ok: true, id: row?.id, created_at: row?.created_at })
  } catch (err) {
    console.error('[cc-coach-reply] supabase insert failed', err)
    return jsonResponse(500, { error: 'Antwort konnte nicht gespeichert werden.' })
  }
}
