// submit-portal-nachricht — nimmt eine Nachricht der Klientin aus dem Portal entgegen.
// Validiert das signierte Portal-JWT, speichert die Nachricht in Supabase (EU) und
// benachrichtigt das Command Center (best-effort).
//
// Method: POST  ·  Body { token, text }  ·  Returns { ok, message } / 4xx / 5xx.
// Sicherheit: kein Bearer nötig — die Echtheit garantiert das signierte JWT.

import type { Context } from '@netlify/functions'
import { verifyPortalToken, tokenIdShort } from './_shared/jwt.js'
import { notifyCC } from './_shared/notify-cc.ts'
import { notifyAdminPortalActivity } from './_shared/notify-admin.ts'
import { getSupabaseCreds, sbInsert } from './_shared/supabase.ts'

const MAX_LEN = 2000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

// Rate limiting (in-memory, resets on cold start)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 40
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
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_LEN) : ''
  if (!token) return jsonResponse(400, { error: 'Missing token' })
  if (!text) return jsonResponse(400, { error: 'Nachricht ist leer' })

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

  let inserted: any
  try {
    const rows = await sbInsert(creds, 'portal_messages', {
      client_sub: payload.sub,
      subject_id: payload.subjectId ?? null,
      sender: 'client',
      text,
    })
    inserted = Array.isArray(rows) ? rows[0] : rows
  } catch (err) {
    console.error('[submit-portal-nachricht] supabase insert failed', err)
    return jsonResponse(500, { error: 'Nachricht konnte nicht gespeichert werden.' })
  }

  // Command Center benachrichtigen (best-effort, Helper schluckt Fehler)
  await notifyCC({
    event: 'bm.portal.message',
    email: payload.sub,
    data: {
      ...(payload.subjectId ? { subjectId: payload.subjectId } : {}),
      preview: text.slice(0, 140),
    },
  })
  // CC-unabhängiger Fallback: Dr. K direkt per Mail an info@ benachrichtigen.
  await notifyAdminPortalActivity({ kind: 'Nachricht', clientSub: payload.sub, clientName: payload.name, preview: text.slice(0, 140) })

  console.log(`✓ Portal-Nachricht: ${payload.sub} (token=${tokenIdShort(token)})`)
  return jsonResponse(200, { ok: true, message: { id: inserted?.id, text, created_at: inserted?.created_at } })
}
