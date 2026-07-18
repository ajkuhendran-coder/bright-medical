// cc-get-state — Command Center liest die aktuellen Start-Inhalte EINER Klientin, damit die
// Cockpit-Karte „Wochen-Fokus setzen" die Felder vorbefüllen kann (kein versehentliches Leeren).
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> · Body { email } → { ok, state | null }.
// Inert bis SQL: fehlt die Tabelle → state:null (kein 500).

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

  try {
    const rows = await sbSelect(
      creds,
      'portal_state',
      `client_sub=eq.${encodeURIComponent(email)}&limit=1&select=week_current,week_total,focus_title,focus_text,focus_step,next_call_human,next_call_url,completed,updated_at`,
    )
    const r = rows[0]
    const state = r
      ? {
          weekCurrent: r.week_current ?? null,
          weekTotal: r.week_total ?? null,
          focusTitle: r.focus_title ?? null,
          focusText: r.focus_text ?? null,
          focusStep: r.focus_step ?? null,
          nextCallHuman: r.next_call_human ?? null,
          nextCallUrl: r.next_call_url ?? null,
          completed: r.completed ?? false,
          updatedAt: r.updated_at ?? null,
        }
      : null
    return jsonResponse(200, { ok: true, state })
  } catch (err) {
    console.warn('[cc-get-state] select fehlgeschlagen (portal_state noch nicht da?)', (err as Error).message)
    return jsonResponse(200, { ok: true, state: null })
  }
}
