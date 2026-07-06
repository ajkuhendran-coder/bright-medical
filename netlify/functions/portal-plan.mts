// portal-plan — liefert den aktuellen Plan der Klientin fürs Portal (Plan-Tab).
// Method: POST · Body { token } · verifiziert das Portal-JWT, liest portal_plans.
// Returns { ok, configured, plan: { title, intro, sections, version, updatedAt } | null }.

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

  const verified = verifyPortalToken(token, jwtSecret)
  if (!verified.ok) {
    const code = verified.reason === 'expired' ? 401 : 400
    return jsonResponse(code, { error: 'Ungültiger oder abgelaufener Link', reason: verified.reason })
  }
  const payload = verified.payload

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(200, { ok: true, configured: false, plan: null })

  try {
    const rows = await sbSelect(
      creds,
      'portal_plans',
      `client_sub=eq.${encodeURIComponent(payload.sub)}&limit=1&select=title,intro,sections,version,updated_at`,
    )
    const r = rows[0]
    const plan = r
      ? {
          title: r.title,
          intro: r.intro ?? null,
          sections: Array.isArray(r.sections) ? r.sections : [],
          version: r.version,
          updatedAt: r.updated_at,
        }
      : null
    return jsonResponse(200, { ok: true, configured: true, plan })
  } catch (err) {
    console.error('[portal-plan] supabase select failed', err)
    return jsonResponse(500, { error: 'Plan konnte nicht geladen werden.' })
  }
}
