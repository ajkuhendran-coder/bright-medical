// submit-portal-einwilligung — nimmt die Art.-9-Einwilligung der Klientin aus dem
// Portal-Onboarding entgegen (Consent-Gate). Verifiziert das Portal-JWT, protokolliert
// die erteilten Kategorien mit Zeitstempel/IP in portal_consents.
//
// Method: POST  ·  Body { token, cgm, photos, questionnaire, channel }  ·  Returns { ok }
// Sicherheit: kein Bearer — die Echtheit garantiert das signierte Portal-JWT.

import type { Context } from '@netlify/functions'
import { verifyPortalToken } from './_shared/jwt.js'
import { getSupabaseCreds, sbInsert } from './_shared/supabase.ts'

// Textstand der Einwilligungserklärung (coaching-vertrag-einwilligung.pdf, Stand Juni 2026).
const CONSENT_VERSION = 'einwilligung-gesundheitsdaten-2026-06'

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
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  const b = (x: unknown) => x === true
  const consent_photos = b(body.photos)
  const consent_channel = b(body.channel)
  // Portal-Kernkategorien (Foto-Tagebuch + sicherer Kanal) sind Pflicht — sonst kann
  // das Portal seine Hauptfunktion nicht rechtskonform erbringen.
  if (!consent_photos || !consent_channel) {
    return jsonResponse(400, { error: 'Für die Nutzung des Portals sind Foto-Tagebuch und sicherer Kanal erforderlich.' })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('client-ip') || 'unknown'
  const row = {
    client_sub: v.payload.sub,
    ...(v.payload.subjectId ? { subject_id: v.payload.subjectId } : {}),
    name: v.payload.name,
    consent_cgm: b(body.cgm),
    consent_photos,
    consent_questionnaire: b(body.questionnaire),
    consent_channel,
    consent_version: CONSENT_VERSION,
    ip,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  }

  try {
    await sbInsert(creds, 'portal_consents', row)
    console.log(`✓ Einwilligung erteilt: ${v.payload.sub} (cgm=${row.consent_cgm} photos=${row.consent_photos} q=${row.consent_questionnaire} channel=${row.consent_channel})`)
    return jsonResponse(200, { ok: true })
  } catch (err) {
    console.error('[submit-portal-einwilligung] insert failed', err)
    return jsonResponse(500, { error: 'Einwilligung konnte nicht gespeichert werden.' })
  }
}
