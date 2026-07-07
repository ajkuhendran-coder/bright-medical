// cc-get-plan — Command Center liest den aktuellen Plan + Versions-Historie EINER Klientin
// (Cockpit „Aktueller Plan" / Akte: „Was hat sie WANN bekommen?"). Reiner Lese-Weg.
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> (wie cc-coach-reply)
// Body:
//   { email }            → { ok, plan: <aktuell>|null, history: [{version, publishedAt, title}] }
//   { email, version }   → { ok, plan: <genau diese Version>|null }
// Returns { ok, plan, history? } / 4xx / 5xx.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbSelect } from './_shared/supabase.ts'

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

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })
  const enc = encodeURIComponent(email)

  const version = Number.isInteger(body?.version) && body.version > 0 ? Number(body.version) : null

  try {
    if (version) {
      const rows = await sbSelect(creds, 'portal_plan_versions', `client_sub=eq.${enc}&version=eq.${version}&limit=1&select=title,intro,sections,version,published_at`)
      const r = rows[0]
      const plan = r ? { title: r.title, intro: r.intro ?? null, sections: Array.isArray(r.sections) ? r.sections : [], version: r.version, updatedAt: r.published_at } : null
      return jsonResponse(200, { ok: true, plan })
    }

    const [curRows, histRows] = await Promise.all([
      sbSelect(creds, 'portal_plans', `client_sub=eq.${enc}&limit=1&select=title,intro,sections,version,updated_at`),
      sbSelect(creds, 'portal_plan_versions', `client_sub=eq.${enc}&order=version.desc&select=version,published_at,title`),
    ])
    const c = curRows[0]
    const plan = c ? { title: c.title, intro: c.intro ?? null, sections: Array.isArray(c.sections) ? c.sections : [], version: c.version, updatedAt: c.updated_at } : null
    const history = histRows.map((h: any) => ({ version: h.version, publishedAt: h.published_at, title: h.title }))
    return jsonResponse(200, { ok: true, plan, history })
  } catch (err) {
    console.error('[cc-get-plan] read failed', err)
    return jsonResponse(500, { error: 'Plan konnte nicht gelesen werden.' })
  }
}
