// portal-thread — liefert den Nachrichten-Verlauf der Klientin fürs Portal.
// Method: POST  ·  Body { token }  ·  verifiziert das Portal-JWT, liest portal_messages.
// Returns { ok, configured, messages: [{ from: 'coach'|'me', text, time }] }.
//
// configured=false → Supabase ist (noch) nicht konfiguriert; das Frontend behält
// dann seine Demo-Daten. Sicherheit: Echtheit über das signierte JWT.

import type { Context } from '@netlify/functions'
import { verifyPortalToken } from './_shared/jwt.js'
import { getSupabaseCreds, sbSelect } from './_shared/supabase.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

function shortTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
    : d.toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'Europe/Berlin' })
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
  if (!creds) return jsonResponse(200, { ok: true, configured: false, messages: [] })

  try {
    const rows = await sbSelect(
      creds,
      'portal_messages',
      `client_sub=eq.${encodeURIComponent(payload.sub)}&order=created_at.asc&select=sender,text,created_at`,
    )
    const messages = rows.map((r) => ({
      from: r.sender === 'coach' ? 'coach' : 'me',
      text: r.text,
      time: shortTime(r.created_at),
    }))
    return jsonResponse(200, { ok: true, configured: true, messages })
  } catch (err) {
    console.error('[portal-thread] supabase select failed', err)
    return jsonResponse(500, { error: 'Verlauf konnte nicht geladen werden.' })
  }
}
