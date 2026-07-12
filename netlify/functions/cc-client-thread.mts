// cc-client-thread — Command-Center-Lesezugriff auf den Nachrichten-Verlauf EINER Klientin.
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> · Body { email, limit? }
// Liest portal_messages (service_role, umgeht RLS), gefiltert auf client_sub = email.
// Returns { ok, count, messages: [{ id, sender, text, read_at, created_at }] } (aufsteigend, aelteste zuerst).
//
// Sicherheit: umgeht RLS und kann JEDE Klientin lesen -> ausschliesslich hinter dem
// CC_API_SECRET (bewusst getrennt von BRIGHT_SEND_SECRET / Mailversand). Nur fuers Command Center.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbSelect, sbSignedUrl } from './_shared/supabase.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}
// Constant-time-Vergleich (gegen Timing-Angriffe auf das Bearer-Secret).
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
  const limit = Number.isFinite(body?.limit) ? Math.min(500, Math.max(1, Math.floor(body.limit))) : 200

  try {
    // desc + limit holt die juengsten N; danach umdrehen -> aufsteigend fuer die Anzeige.
    const rows = await sbSelect(
      creds,
      'portal_messages',
      `client_sub=eq.${encodeURIComponent(email)}&order=created_at.desc&select=id,sender,text,read_at,created_at,audio_path,audio_seconds&limit=${limit}`,
    )
    // Sprachnachrichten: signierte Kurzzeit-URL, damit Dr. K seine gesendete Voice im Cockpit nachhören kann.
    const mapped = await Promise.all(rows.map(async (r) => {
      const base = { id: r.id, sender: r.sender === 'coach' ? 'coach' : 'client', text: r.text, read_at: r.read_at, created_at: r.created_at }
      if (!r.audio_path) return base
      try { return { ...base, audioUrl: await sbSignedUrl(creds, 'coach-voice', r.audio_path), audioSeconds: r.audio_seconds ?? null } }
      catch { return base }
    }))
    const messages = mapped.reverse()
    return jsonResponse(200, { ok: true, count: messages.length, messages })
  } catch (err) {
    console.error('[cc-client-thread] supabase select failed', err)
    return jsonResponse(500, { error: 'Verlauf konnte nicht geladen werden.' })
  }
}
