// invite-portal, erzeugt einen signierten Zugangs-Link (JWT, Scope `portal`) zum
// Klient-Portal „Mein Programm" und versendet die Einladung per Mail.
//
// Aufgerufen aus der BM-Mail-App / vom Command Center beim Programmstart.
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (gleiches Secret wie send-mail)
// Method:  POST
// Body:    {
//   "to": "klientin@example.com",         // Pflicht
//   "name": "Sandra",                       // Pflicht: Vorname für die Begrüßung
//   "anrede": "Liebe Sandra,",              // optional (Default: neutrale Anrede)
//   "programLabel": "Metabolic Deep-Dive", // optional (Default unten)
//   "weekCurrent": 1, "weekTotal": 4,       // optional
//   "initials": "SB",                       // optional (Default: aus Name)
//   "focusTitle": "...", "focusText": "...", "focusStep": "...",  // optional
//   "nextCallHuman": "...", "nextCallUrl": "...", "planUpdated": "...",  // optional
//   "personalNote": "...",                  // optional, max 1500 Zeichen
//   "subjectId": "BM-2026-XXXX",            // optional, CC-Referenz
//   "ttlDays": 120                          // optional (Default 120, begleitet das Programm)
// }
//
// Returns: { ok, link, exp, expHuman, messageId } oder 401/400/500.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signPortalToken } from './_shared/jwt.js'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'
const SITE_BASE = 'https://brightmedical.de'
const DEFAULT_TTL_DAYS = 120
const DEFAULT_PROGRAM = 'Ihr Bright Medical Programm'

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
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function loadFile(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
}
const INVITE_HTML_TEMPLATE = (() => {
  try { return loadFile('email-templates/e1i-portal-einladung.html') }
  catch { return '' }
})()

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (auth)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!apiKey || !jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const { to, name, anrede, programLabel, initials, focusTitle, focusText, focusStep,
    nextCallHuman, nextCallUrl, planUpdated, personalNote, subjectId } = body || {}

  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "to"' })
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 120) {
    return jsonResponse(400, { error: 'Missing or invalid "name"' })
  }
  if (anrede && (typeof anrede !== 'string' || anrede.length > 200)) return jsonResponse(400, { error: '"anrede" too long' })
  if (personalNote && (typeof personalNote !== 'string' || personalNote.length > 1500)) return jsonResponse(400, { error: '"personalNote" too long' })
  if (subjectId && (typeof subjectId !== 'string' || subjectId.length > 80)) return jsonResponse(400, { error: '"subjectId" invalid' })

  const wc = Number.isFinite(body?.weekCurrent) ? Math.max(1, Math.floor(body.weekCurrent)) : 1
  const wt = Number.isFinite(body?.weekTotal) ? Math.max(wc, Math.floor(body.weekTotal)) : 4
  const ttlDays = Number.isFinite(body?.ttlDays) ? Math.min(365, Math.max(7, Math.floor(body.ttlDays))) : DEFAULT_TTL_DAYS
  const program = (typeof programLabel === 'string' && programLabel.trim()) ? programLabel.trim().slice(0, 120) : DEFAULT_PROGRAM

  const data = {
    name: name.trim().slice(0, 120),
    programLabel: program,
    weekCurrent: wc,
    weekTotal: wt,
    ...(typeof initials === 'string' && initials.trim() ? { initials: initials.trim().slice(0, 4) } : {}),
    ...(typeof focusTitle === 'string' && focusTitle.trim() ? { focusTitle: focusTitle.trim().slice(0, 120) } : {}),
    ...(typeof focusText === 'string' && focusText.trim() ? { focusText: focusText.trim().slice(0, 400) } : {}),
    ...(typeof focusStep === 'string' && focusStep.trim() ? { focusStep: focusStep.trim().slice(0, 200) } : {}),
    ...(typeof nextCallHuman === 'string' && nextCallHuman.trim() ? { nextCallHuman: nextCallHuman.trim().slice(0, 120) } : {}),
    ...(typeof nextCallUrl === 'string' && nextCallUrl.trim() ? { nextCallUrl: nextCallUrl.trim().slice(0, 400) } : {}),
    ...(typeof planUpdated === 'string' && planUpdated.trim() ? { planUpdated: planUpdated.trim().slice(0, 60) } : {}),
    ...(subjectId ? { subjectId } : {}),
  }

  const token = signPortalToken(to, data, ttlDays, jwtSecret)
  const link = `${SITE_BASE}/mein-programm?t=${encodeURIComponent(token)}`
  const exp = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
  const expGerman = exp.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })

  const html = INVITE_HTML_TEMPLATE
  if (!html) return jsonResponse(500, { error: 'Email-Template e1i-portal-einladung.html nicht im Bundle' })

  const safeNote = personalNote ? escapeHtml(personalNote) : ''
  const vars: Record<string, string> = {
    ANREDE: escapeHtml(anrede || `Guten Tag,`),
    PROGRAMM_LABEL: escapeHtml(program),
    LINK: link,
    GUELTIG_BIS: expGerman,
    'PERSÖNLICHE_NOTIZ_BLOCK': safeNote
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin-bottom:24px;"><tr><td style="padding:18px 22px;font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safeNote}</td></tr></table>`
      : '',
  }
  let rendered = html
  for (const [k, v] of Object.entries(vars)) rendered = rendered.replaceAll(`{{${k}}}`, v)

  const text = `${anrede || 'Guten Tag,'}

ab jetzt läuft alles an einem sicheren Ort zusammen, Ihr Tagebuch, Ihr Plan, Ihr nächster Termin und der direkte Draht zu mir. Alles verschlüsselt und in der EU, ganz ohne WhatsApp.

Ihr Programm: ${program}

Zu Ihrem Bereich:
${link}

Der Link ist persönlich für Sie und bis ${expGerman} gültig. Kein Konto, kein Passwort, einfach antippen.
${personalNote ? `\n${personalNote}\n` : ''}
Herzliche Grüße,
Ajanth Kuhendran
Bright Medical
`

  const resend = new Resend(apiKey)
  try {
    const { data: sent, error } = await resend.emails.send({
      from: FROM_EMAIL, replyTo: REPLY_TO, to, subject: 'Ihr persönlicher Bereich bei Bright Medical', html: rendered, text,
    })
    if (error || !sent) {
      console.error('Resend error:', error)
      return jsonResponse(502, { error: 'Resend rejected the message', detail: error })
    }
    console.log(`✓ Portal-Einladung an ${to}, msg ${sent.id}, gültig bis ${expGerman}`)
    return jsonResponse(200, { ok: true, messageId: sent.id, to, link, exp: exp.toISOString(), expHuman: expGerman })
  } catch (err) {
    console.error('invite-portal error:', err)
    return jsonResponse(500, { error: 'Internal error' })
  }
}
