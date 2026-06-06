// invite-questionnaire — generiert einen einmaligen Fragebogen-Link mit JWT (14 Tage)
// und versendet ihn als Einladungs-Mail an den Patienten.
//
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (gleiches Secret wie send-mail)
// Method:  POST
// Body:    {
//   "to": "patient@example.com",
//   "anrede": "Herr Mustermann",
//   "personalNote": "optional — kurzer persönlicher Satz (eingebettet in die Mail)"
// }
//
// Returns: { ok, link, exp, messageId }
//          oder 401/400/500 mit error.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signFragebogenToken } from './_shared/jwt.js'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'
const SITE_BASE = 'https://brightmedical.de'
const TTL_DAYS = 14

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Load template + logos at module init
function loadFile(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
}
const INVITE_HTML_TEMPLATE = (() => {
  try { return loadFile('email-templates/e0b-questionnaire-invite.html') }
  catch { return '' }
})()
let LOGO_LIGHT = '', LOGO_DARK = ''
try {
  const logosRaw = loadFile('email-templates/_assets/logos-base64.txt')
  const [light, dark] = logosRaw.split('---SEPARATOR---').map((s) => s.trim())
  LOGO_LIGHT = light || ''
  LOGO_DARK = dark || ''
} catch {}

// --- Handler ---

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  // Bearer auth (same secret as send-mail)
  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (auth)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!apiKey || !jwtSecret) {
    return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })
  }

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const { to, anrede, personalNote } = body || {}
  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "to"' })
  }
  if (anrede && (typeof anrede !== 'string' || anrede.length > 200)) {
    return jsonResponse(400, { error: '"anrede" too long' })
  }
  if (personalNote && (typeof personalNote !== 'string' || personalNote.length > 1500)) {
    return jsonResponse(400, { error: '"personalNote" too long' })
  }

  // Generate JWT
  const token = signFragebogenToken(to, TTL_DAYS, jwtSecret)
  const link = `${SITE_BASE}/fragebogen?t=${encodeURIComponent(token)}`
  const exp = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)
  const expGerman = exp.toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  })

  // Render email
  const safeAnrede = escapeHtml(anrede || 'liebe Interessentin / lieber Interessent')
  const safeNote = personalNote ? escapeHtml(personalNote) : ''
  const subject = `Ihr persönlicher Fragebogen — Bright Medical`

  let html = INVITE_HTML_TEMPLATE
  if (!html) {
    return jsonResponse(500, { error: 'Email-Template e0b-questionnaire-invite.html nicht im Bundle' })
  }
  const vars: Record<string, string> = {
    LOGO_LIGHT,
    LOGO_DARK,
    ANREDE: safeAnrede,
    LINK: link,
    GUELTIG_BIS: expGerman,
    'PERSÖNLICHE_NOTIZ': safeNote,
    'PERSÖNLICHE_NOTIZ_BLOCK': safeNote
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin-bottom:24px;"><tr><td style="padding:18px 22px;font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safeNote}</td></tr></table>`
      : '',
  }
  for (const [k, v] of Object.entries(vars)) {
    html = html.replaceAll(`{{${k}}}`, v)
  }

  const text = `${anrede || 'Hallo'},

vielen Dank für Ihr Interesse an Bright Medical.

Bitte füllen Sie kurz unseren Qualifizierungsfragebogen aus — 5 Schritte, ca. 5–7 Minuten:

${link}

Der Link ist 14 Tage gültig (bis zum ${expGerman}).

${personalNote || ''}

Bei Fragen einfach auf diese Mail antworten.

Herzlich,
Ajanth Kuhendran
Bright Medical
`

  const resend = new Resend(apiKey)
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to,
      subject,
      html,
      text,
    })
    if (error || !data) {
      console.error('Resend error:', error)
      return jsonResponse(502, { error: 'Resend rejected the message', detail: error })
    }
    console.log(`✓ Invitation sent to ${to} — message id ${data.id} — link valid until ${expGerman}`)
    return jsonResponse(200, {
      ok: true,
      messageId: data.id,
      to,
      link,
      exp: exp.toISOString(),
      expHuman: expGerman,
    })
  } catch (err) {
    console.error('invite-questionnaire error:', err)
    return jsonResponse(500, { error: 'Internal error' })
  }
}
