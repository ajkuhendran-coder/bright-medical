// invite-vereinbarung — generiert einen signierten Link (JWT, 7 Tage) zur
// Online-Gegenzeichnung des Coaching-Vertrags und versendet die Einladung per Mail.
//
// Aufgerufen vom Command Center NACH Zahlungseingang.
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (gleiches Secret wie send-mail)
// Method:  POST
// Body:    {
//   "to": "klient@example.com",          // Pflicht
//   "paket": "vollprogramm",              // Pflicht: deepdive | vollprogramm | raten | upgrade
//   "anrede": "Lieber Herr Mustermann,",        // optional (Default: neutrale Anrede)
//   "name": "Max Mustermann",              // optional, Vorbefüllung des Namens auf der Seite
//   "personalNote": "…",                  // optional, max 1500 Zeichen
//   "subjectId": "BM-2026-XXXX"           // optional, CC-Referenz, wandert ins JWT + zurück
// }
//
// Returns: { ok, link, exp, expHuman, messageId, paket } oder 401/400/500.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signVereinbarungToken } from './_shared/jwt.js'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'
const SITE_BASE = 'https://brightmedical.de'
const TTL_DAYS = 7

// Single source of truth for the packages (must match the Coaching-Vertrag).
const PAKETE: Record<string, { key: string; label: string; preis: string }> = {
  deepdive: { key: 'deepdive', label: 'Metabolic Deep-Dive · 4 Wochen', preis: '990 € (einmalig)' },
  vollprogramm: { key: 'vollprogramm', label: 'Bright Medical Vollprogramm · 12 Wochen', preis: '2.990 € (einmalig)' },
  raten: { key: 'raten', label: 'Bright Medical Vollprogramm · 12 Wochen (Ratenzahlung)', preis: '3 × 997 € monatlich' },
  upgrade: { key: 'upgrade', label: 'Upgrade Deep-Dive → Vollprogramm · +8 Wochen', preis: '2.000 € (Anrechnung)' },
}

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
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function loadFile(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
}
const INVITE_HTML_TEMPLATE = (() => {
  try { return loadFile('email-templates/e1g-vereinbarung-einladung.html') }
  catch { return '' }
})()

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (auth)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!apiKey || !jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const { to, paket, anrede, name, personalNote, subjectId } = body || {}
  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "to"' })
  }
  if (typeof paket !== 'string' || !(paket in PAKETE)) {
    return jsonResponse(400, { error: 'Unknown or missing "paket"', available: Object.keys(PAKETE) })
  }
  if (anrede && (typeof anrede !== 'string' || anrede.length > 200)) {
    return jsonResponse(400, { error: '"anrede" too long' })
  }
  if (name && (typeof name !== 'string' || name.length > 120)) {
    return jsonResponse(400, { error: '"name" too long' })
  }
  if (personalNote && (typeof personalNote !== 'string' || personalNote.length > 1500)) {
    return jsonResponse(400, { error: '"personalNote" too long' })
  }
  if (subjectId && (typeof subjectId !== 'string' || subjectId.length > 80)) {
    return jsonResponse(400, { error: '"subjectId" invalid' })
  }

  const pk = PAKETE[paket]
  const token = signVereinbarungToken(to, pk, { subjectId, name }, TTL_DAYS, jwtSecret)
  const link = `${SITE_BASE}/vereinbarung?t=${encodeURIComponent(token)}`
  const exp = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)
  const expGerman = exp.toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  })

  const html = INVITE_HTML_TEMPLATE
  if (!html) return jsonResponse(500, { error: 'Email-Template e1g-vereinbarung-einladung.html nicht im Bundle' })

  const safeAnrede = escapeHtml(anrede || 'Guten Tag,')
  const safeNote = personalNote ? escapeHtml(personalNote) : ''
  const subject = 'Ihre Coaching-Vereinbarung: bitte bestätigen'

  const vars: Record<string, string> = {
    ANREDE: safeAnrede,
    PAKET_LABEL: escapeHtml(pk.label),
    PAKET_PREIS: escapeHtml(pk.preis),
    LINK: link,
    GUELTIG_BIS: expGerman,
    'PERSÖNLICHE_NOTIZ_BLOCK': safeNote
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin-bottom:24px;"><tr><td style="padding:18px 22px;font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safeNote}</td></tr></table>`
      : '',
  }
  let rendered = html
  for (const [k, v] of Object.entries(vars)) rendered = rendered.replaceAll(`{{${k}}}`, v)

  const text = `${anrede || 'Guten Tag,'}

vielen Dank für Ihr Vertrauen. Damit wir starten können, lesen und bestätigen Sie bitte Ihre Coaching-Vereinbarung online:

Paket: ${pk.label} (${pk.preis})

${link}

Der Link ist 7 Tage gültig (bis ${expGerman}). Ihnen steht ein 14-tägiges Widerrufsrecht zu.

${personalNote || ''}

Herzlich,
Ajanth Kuhendran
Bright Medical
`

  const resend = new Resend(apiKey)
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL, replyTo: REPLY_TO, to, subject, html: rendered, text,
    })
    if (error || !data) {
      console.error('Resend error:', error)
      return jsonResponse(502, { error: 'Resend rejected the message', detail: error })
    }
    console.log(`✓ Vereinbarung-Einladung an ${to} — Paket ${pk.key} — msg ${data.id} — gültig bis ${expGerman}`)
    return jsonResponse(200, {
      ok: true,
      messageId: data.id,
      to,
      link,
      exp: exp.toISOString(),
      expHuman: expGerman,
      paket: pk.key,
    })
  } catch (err) {
    console.error('invite-vereinbarung error:', err)
    return jsonResponse(500, { error: 'Internal error' })
  }
}
