// portal-consent-status — prüft, ob für die Klientin bereits eine gültige Art.-9-Einwilligung
// vorliegt (Consent-Gate). Das Frontend blendet den Einwilligungs-Screen nur ein, wenn nein.
//
// Method: POST  ·  Body { token }  ·  Returns { ok, configured, consented }
// configured=false -> Supabase (noch) nicht konfiguriert; Frontend zeigt dann sicherheitshalber das Gate.

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

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token) return jsonResponse(400, { error: 'Missing token' })

  const v = verifyPortalToken(token, jwtSecret)
  if (!v.ok) return jsonResponse(401, { error: 'Ungültiger oder abgelaufener Link', reason: v.reason })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(200, { ok: true, configured: false, consented: false })

  try {
    const rows = await sbSelect(
      creds,
      'portal_consents',
      `client_sub=eq.${encodeURIComponent(v.payload.sub)}&consent_photos=eq.true&consent_channel=eq.true&select=id&limit=1`,
    )
    return jsonResponse(200, { ok: true, configured: true, consented: rows.length > 0 })
  } catch (err) {
    console.error('[portal-consent-status] select failed', err)
    // Im Zweifel: Gate zeigen (nicht ungeprüft Gesundheitsdaten zulassen).
    return jsonResponse(200, { ok: true, configured: true, consented: false })
  }
}
