// portal-state — liefert die LIVE Start-Inhalte der Klientin (Woche / Fokus / nächster Termin),
// server-getrieben statt im Token eingefroren. POST { token } → verifiziert Portal-JWT, liest portal_state.
// Returns { ok, configured, state | null }.
//
// INERT bis SQL + CC-Writer live sind: fehlt die Tabelle oder die Zeile → state:null, und das Portal
// fällt auf die Token-Werte zurück (= heutiges Verhalten). Deshalb NIE 500 fürs Frontend bei fehlender
// Tabelle. Siehe HANDOVER-PORTAL-STATE.md.

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

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(200, { ok: true, configured: false, state: null })

  try {
    const rows = await sbSelect(
      creds,
      'portal_state',
      `client_sub=eq.${encodeURIComponent(verified.payload.sub)}&limit=1&select=week_current,week_total,focus_title,focus_text,focus_step,next_call_human,next_call_url,completed,updated_at`,
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
    return jsonResponse(200, { ok: true, configured: true, state })
  } catch (err) {
    // Tabelle portal_state evtl. noch nicht angelegt → inert: kein State, Portal nutzt Token-Werte.
    console.warn('[portal-state] select fehlgeschlagen (portal_state noch nicht da?)', (err as Error).message)
    return jsonResponse(200, { ok: true, configured: false, state: null })
  }
}
