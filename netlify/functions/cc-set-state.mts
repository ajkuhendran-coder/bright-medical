// cc-set-state — Command Center setzt die LIVE Start-Inhalte EINER Klientin (Woche / Fokus / Termin).
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> (wie cc-upsert-plan — CCs Schreibweg zu BM)
// Body: { email, weekCurrent?, weekTotal?, focusTitle?, focusText?, focusStep?, nextCallHuman?, nextCallUrl?, completed? }
// Upsert auf client_sub (EINE Zeile pro Klientin). NUR gesetzte Felder werden geschrieben (partielles
// Update; ein Feld als "" leert es, ein weggelassenes Feld bleibt unverändert). Kein version-Tracking
// (nur der aktuelle Stand). Human-in-the-loop: der Speichern-Klick passiert IM Cockpit.
// Siehe HANDOVER-PORTAL-STATE.md.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbUpsert } from './_shared/supabase.ts'

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
const str = (x: unknown, max: number): string | undefined => (typeof x === 'string' ? x.trim().slice(0, max) : undefined)
const intOrU = (x: unknown): number | undefined => (Number.isFinite(x) ? Math.max(0, Math.min(99, Math.floor(x as number))) : undefined)

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

  // Nur gesetzte Felder ins Upsert übernehmen (partielles Update). "" leert, weggelassen bleibt.
  const row: Record<string, unknown> = { client_sub: email, updated_at: new Date().toISOString() }
  const wc = intOrU(body?.weekCurrent); if (wc !== undefined) row.week_current = wc
  const wt = intOrU(body?.weekTotal); if (wt !== undefined) row.week_total = wt
  const ft = str(body?.focusTitle, 120); if (ft !== undefined) row.focus_title = ft || null
  const fx = str(body?.focusText, 600); if (fx !== undefined) row.focus_text = fx || null
  const fs = str(body?.focusStep, 300); if (fs !== undefined) row.focus_step = fs || null
  const nh = str(body?.nextCallHuman, 120); if (nh !== undefined) row.next_call_human = nh || null
  const nu = str(body?.nextCallUrl, 400); if (nu !== undefined) row.next_call_url = nu && /^https?:\/\//.test(nu) ? nu : null
  if (typeof body?.completed === 'boolean') row.completed = body.completed

  try {
    await sbUpsert(creds, 'portal_state', row, 'client_sub')
  } catch (err) {
    console.error('[cc-set-state] upsert failed', err)
    return jsonResponse(500, { error: 'Status konnte nicht gespeichert werden.' })
  }
  const setFields = Object.keys(row).filter((k) => k !== 'client_sub' && k !== 'updated_at')
  console.log(`✓ cc-set-state: ${email} (${setFields.join(', ') || 'nur Zeitstempel'})`)
  return jsonResponse(200, { ok: true })
}
