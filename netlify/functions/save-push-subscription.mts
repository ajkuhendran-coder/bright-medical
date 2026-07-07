// save-push-subscription — das Portal meldet die Push-Subscription der Klientin an.
// Method: POST · Body { token, subscription:{endpoint, keys:{p256dh, auth}}, url? }
// Verifiziert das Portal-JWT (wie die anderen Portal-Functions) → client_sub = payload.sub.
// Upsert auf endpoint (unique). `url` = Deep-Link zum eigenen Bereich (fürs Antippen der Push).
// Returns { ok } / 4xx / 5xx.

import type { Context } from '@netlify/functions'
import { verifyPortalToken } from './_shared/jwt.js'
import { getSupabaseCreds } from './_shared/supabase.ts'

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

  const sub = body?.subscription
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : ''
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : ''
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : ''
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) {
    return jsonResponse(400, { error: 'Ungültige Subscription' })
  }

  // Deep-Link nur akzeptieren, wenn er auf den eigenen Portal-Pfad zeigt (kein Fremd-URL).
  let url: string | null = null
  const rawUrl = typeof body?.url === 'string' ? body.url : ''
  if (rawUrl) {
    try {
      const u = new URL(rawUrl)
      if (u.hostname.endsWith('brightmedical.de') && u.pathname.startsWith('/mein-programm')) url = rawUrl.slice(0, 1200)
    } catch { /* ignorieren */ }
  }

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Portal-Speicher ist noch nicht konfiguriert.' })

  const row = {
    client_sub: verified.payload.sub,
    endpoint,
    p256dh,
    auth,
    url,
    updated_at: new Date().toISOString(),
  }
  try {
    const res = await fetch(`${creds.url}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
      method: 'POST',
      headers: {
        apikey: creds.serviceKey,
        Authorization: `Bearer ${creds.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    })
    if (!res.ok) {
      console.error('[save-push-subscription] upsert failed', res.status, await res.text())
      return jsonResponse(500, { error: 'Konnte nicht gespeichert werden.' })
    }
  } catch (err) {
    console.error('[save-push-subscription] error', err)
    return jsonResponse(500, { error: 'Konnte nicht gespeichert werden.' })
  }

  return jsonResponse(200, { ok: true })
}
