// portal-plan-pdf — erzeugt den aktuellen Plan der Klientin ON-DEMAND als hochwertiges
// A4-Design-PDF (pdf-lib). Wird NIRGENDS gespeichert (DSGVO): kein Objekt, kein Cache.
//
// Method: GET
// Zugang (zwei Wege):
//   • Klientin:  ?t=<Portal-JWT>            (wie das Portal — die Signatur beweist die Echtheit)
//   • Cockpit:   ?email=<klientin>  + Authorization: Bearer <CC_API_SECRET | BRIGHT_SEND_SECRET>
//                (optional ?name=<Vorname> für die persönliche Kopfzeile)
// Returns: application/pdf (Content-Disposition attachment) · 4xx/5xx als JSON.

import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { verifyPortalToken } from './_shared/jwt.js'
import { getSupabaseCreds, sbSelect } from './_shared/supabase.ts'
import { buildPlanPdf, type PlanPdfAssets } from './_shared/plan-pdf.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

// Marken-Fonts + Bilder DIREKT in der Function laden (bewährtes Muster wie submit-vereinbarung:
// aus email-templates/_assets/, via netlify.toml `included_files` gebündelt). NICHT im geteilten
// Modul laden — dort zeigt import.meta.url nach dem Bundling auf die Function, nicht aufs Modul.
const ASSETS: PlanPdfAssets | null = (() => {
  try {
    const load = (rel: string) => readFileSync(fileURLToPath(new URL(`../../email-templates/_assets/${rel}`, import.meta.url)))
    const opt = (rel: string): Uint8Array | null => { try { return load(rel) } catch { return null } }
    return {
      serifMed: load('fonts/Newsreader-Medium.ttf'),
      serifItalic: load('fonts/Newsreader-Italic.ttf'),
      sans: load('fonts/HankenGrotesk-Regular.ttf'),
      sansSemi: load('fonts/HankenGrotesk-SemiBold.ttf'),
      sansBold: load('fonts/HankenGrotesk-Bold.ttf'),
      logo: opt('logo-light.png'),
      plate: opt('teller-portionsmodell.jpg'),
    }
  } catch (e) { console.error('[portal-plan-pdf] assets load failed', e); return null }
})()

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'GET') return jsonResponse(405, { error: 'Method not allowed' })

  const url = new URL(req.url)
  let clientSub = ''
  let name: string | null = url.searchParams.get('name')

  const bearer = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)?.[1]
  if (bearer) {
    // Cockpit-Weg: vertrauenswürdiges Server-Secret + explizite E-Mail.
    const ccSecret = Netlify.env.get('CC_API_SECRET')
    const sendSecret = Netlify.env.get('BRIGHT_SEND_SECRET')
    const authorized = (ccSecret && safeEqual(bearer, ccSecret)) || (sendSecret && safeEqual(bearer, sendSecret))
    if (!authorized) return jsonResponse(401, { error: 'Unauthorized' })
    const email = (url.searchParams.get('email') || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })
    clientSub = email
  } else {
    // Klientin-Weg: signiertes Portal-JWT aus ?t=…
    const token = url.searchParams.get('t') || ''
    if (!token) return jsonResponse(400, { error: 'Missing token' })
    const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
    if (!jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })
    const verified = verifyPortalToken(token, jwtSecret)
    if (!verified.ok) {
      const code = verified.reason === 'expired' ? 401 : 400
      return jsonResponse(code, { error: 'Ungültiger oder abgelaufener Link', reason: verified.reason })
    }
    clientSub = verified.payload.sub
    if (!name) name = verified.payload.name || null
  }

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Portal-Speicher ist noch nicht konfiguriert.' })

  let row: any
  try {
    const rows = await sbSelect(
      creds,
      'portal_plans',
      `client_sub=eq.${encodeURIComponent(clientSub)}&limit=1&select=title,intro,sections,version,updated_at`,
    )
    row = rows[0]
  } catch (err) {
    console.error('[portal-plan-pdf] supabase select failed', err)
    return jsonResponse(500, { error: 'Plan konnte nicht geladen werden.' })
  }
  if (!row) return jsonResponse(404, { error: 'Für Sie ist noch kein Plan hinterlegt.' })
  if (!ASSETS) return jsonResponse(500, { error: 'PDF-Assets nicht im Bundle' })

  let pdf: Uint8Array
  try {
    pdf = await buildPlanPdf(
      {
        title: row.title,
        intro: row.intro ?? null,
        sections: Array.isArray(row.sections) ? row.sections : [],
        version: row.version ?? null,
        updatedAt: row.updated_at ?? null,
      },
      { name, assets: ASSETS },
    )
  } catch (err) {
    console.error('[portal-plan-pdf] PDF build failed', err)
    return jsonResponse(500, { error: 'PDF-Erzeugung fehlgeschlagen.' })
  }

  const fname = row.version ? `Bright-Medical-Plan-v${row.version}.pdf` : 'Bright-Medical-Plan.pdf'
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // inline: öffnet im neuen Tab direkt im PDF-Viewer (mobil-freundlich); Dateiname
      // bleibt fürs Speichern gesetzt. CC lädt bei Bedarf per fetch→blob mit eigenem Namen.
      'Content-Disposition': `inline; filename="${fname}"`,
      'Cache-Control': 'no-store, private',
      ...CORS_HEADERS,
    },
  })
}
