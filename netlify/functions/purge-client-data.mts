// purge-client-data — Löschung der Gesundheitsdaten EINES Klienten (Anlage 3: 30 Tage nach
// Programmende) und zugleich der Weg für Art.-17-Löschverlangen.
//
// Method: POST · Auth: Authorization: Bearer <BRIGHT_SEND_SECRET> (nur Dr. K / Cockpit)
// Body: { email, dryRun?, includeLegalHold?, confirm? }
//
//   dryRun (DEFAULT true) → zählt nur, löscht NICHTS. Liefert den Report für die Freigabe.
//   dryRun:false          → löscht. Verlangt ZUSÄTZLICH confirm === "LOESCHEN".
//   includeLegalHold:true → löscht auch Pläne + Versand-Log (Anwaltsfrage 6, s. _shared/purge.ts).
//
// Diese Function macht nur Auth + Sicherheitsabfragen; die eigentliche Logik liegt in
// _shared/purge.ts (dort auch die vollständige Bestandsliste) — so ist sie lokal testbar.
// Jeder echte Lauf schreibt eine Audit-Zeile ins Netlify-Log.
// Siehe Programm-Workflow/ENTWURF-30-TAGE-LOESCHUNG.md.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds } from './_shared/supabase.ts'
import { collectPurgePlan, describePlan, executePurge } from './_shared/purge.ts'

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

  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (BRIGHT_SEND_SECRET)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })

  // Sicherheitsnetz: gelöscht wird NUR bei ausdrücklichem dryRun:false UND confirm:"LOESCHEN".
  const dryRun = body?.dryRun !== false
  const includeLegalHold = body?.includeLegalHold === true
  if (!dryRun && body?.confirm !== 'LOESCHEN') {
    return jsonResponse(400, {
      error: 'Zum echten Löschen zusätzlich confirm:"LOESCHEN" senden. Ohne das passiert nichts.',
      hint: 'Zuerst mit dryRun:true den Report prüfen und freigeben lassen.',
    })
  }

  try {
    const plan = await collectPurgePlan(creds, email)
    const report = describePlan(plan, includeLegalHold)

    if (dryRun) {
      console.log(`[purge-client-data] DRY-RUN ${email}: ${JSON.stringify(report)}`)
      return jsonResponse(200, { ok: true, dryRun: true, geloescht: false, plan: report })
    }

    const deleted = await executePurge(creds, plan, includeLegalHold)
    console.log(`⚠️ [purge-client-data] GELÖSCHT ${email} (includeLegalHold=${includeLegalHold}): ${JSON.stringify(deleted)}`)
    return jsonResponse(200, { ok: true, dryRun: false, geloescht: true, email, deleted, bleibt: report.bleibt_immer })
  } catch (err) {
    console.error('[purge-client-data] failed', err)
    return jsonResponse(500, { error: 'Löschung konnte nicht (vollständig) ausgeführt werden.', detail: (err as Error).message })
  }
}
