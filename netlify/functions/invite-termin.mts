// invite-termin — generiert einen signierten Termin-Link (JWT, 7 Tage) mit den
// vom Arzt vorgewählten Slots und versendet die Erstgespräch-Einladung per Mail.
//
// Aufgerufen vom Command Center.
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (gleiches Secret wie send-mail)
// Method:  POST
// Body:    {
//   "to": "patient@example.com",
//   "anrede": "Frau Müller",
//   "slots": [ { "id": "s1", "start": "2026-06-03T10:00:00+02:00", "dauer": 20 }, ... ],
//   "personalNote": "optional — kurzer persönlicher Satz",
//   "subjectId": "BM-2026-XXXX"   // optional, CC-Referenz, wandert ins JWT + zurück
// }
//
// Returns: { ok, link, exp, expHuman, messageId, slotCount } oder 401/400/500.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { signTerminToken, type TerminSlot } from './_shared/jwt.js'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'
const SITE_BASE = 'https://brightmedical.de'
const TTL_DAYS = 7
const MAX_SLOTS = 8

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

// Format an ISO start into German "Mittwoch, 3. Juni 2026 · 10:00 Uhr"
function formatSlotGerman(startISO: string): string {
  const d = new Date(startISO)
  if (isNaN(d.getTime())) return startISO
  const datum = d.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  })
  const zeit = d.toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  })
  return `${datum} · ${zeit} Uhr`
}

// Load template + logos at module init
function loadFile(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
}
const INVITE_HTML_TEMPLATE = (() => {
  try { return loadFile('email-templates/e1d-termin-einladung.html') }
  catch { return '' }
})()
let LOGO_LIGHT = '', LOGO_DARK = ''
try {
  const logosRaw = loadFile('email-templates/_assets/logos-base64.txt')
  const [light, dark] = logosRaw.split('---SEPARATOR---').map((s) => s.trim())
  LOGO_LIGHT = light || ''
  LOGO_DARK = dark || ''
} catch {}

// --- Slot validation ---
function validateSlots(raw: unknown): { ok: true; slots: TerminSlot[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: '"slots" must be a non-empty array' }
  if (raw.length > MAX_SLOTS) return { ok: false, error: `too many slots (max ${MAX_SLOTS})` }
  const slots: TerminSlot[] = []
  const seenIds = new Set<string>()
  for (const s of raw) {
    if (!s || typeof s !== 'object') return { ok: false, error: 'each slot must be an object' }
    const { id, start, dauer } = s as Record<string, unknown>
    if (typeof id !== 'string' || !id || id.length > 40) return { ok: false, error: 'slot.id invalid' }
    if (seenIds.has(id)) return { ok: false, error: `duplicate slot id "${id}"` }
    seenIds.add(id)
    if (typeof start !== 'string' || isNaN(new Date(start).getTime())) return { ok: false, error: `slot.start invalid for "${id}"` }
    if (typeof dauer !== 'number' || dauer <= 0 || dauer > 240) return { ok: false, error: `slot.dauer invalid for "${id}"` }
    slots.push({ id, start, dauer })
  }
  return { ok: true, slots }
}

// --- Handler ---
export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  // Bearer auth (same secret as send-mail / invite-questionnaire)
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

  const { to, anrede, personalNote, subjectId } = body || {}
  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "to"' })
  }
  if (anrede && (typeof anrede !== 'string' || anrede.length > 200)) {
    return jsonResponse(400, { error: '"anrede" too long' })
  }
  if (personalNote && (typeof personalNote !== 'string' || personalNote.length > 1500)) {
    return jsonResponse(400, { error: '"personalNote" too long' })
  }
  if (subjectId && (typeof subjectId !== 'string' || subjectId.length > 80)) {
    return jsonResponse(400, { error: '"subjectId" invalid' })
  }
  const sv = validateSlots(body?.slots)
  if (!sv.ok) return jsonResponse(400, { error: sv.error })

  // Generate JWT (slots travel inside the signed token)
  const token = signTerminToken(to, sv.slots, subjectId, TTL_DAYS, jwtSecret)
  const link = `${SITE_BASE}/termin?t=${encodeURIComponent(token)}`
  const exp = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000)
  const expGerman = exp.toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  })

  const html = INVITE_HTML_TEMPLATE
  if (!html) return jsonResponse(500, { error: 'Email-Template e1d-termin-einladung.html nicht im Bundle' })

  // Build the slot preview list for the email
  const slotsHtml = sv.slots
    .map(
      (s) =>
        `<tr><td style="padding:8px 0;font-family:'Inter',Arial,sans-serif;font-size:14px;color:#2A3A52;border-bottom:1px solid #E3E8EE;">${escapeHtml(formatSlotGerman(s.start))} <span style="color:#5A6A80;">(${s.dauer} Min)</span></td></tr>`,
    )
    .join('')
  const safeAnrede = escapeHtml(anrede || 'liebe Interessentin / lieber Interessent')
  const safeNote = personalNote ? escapeHtml(personalNote) : ''
  const subject = 'Ihr Erstgespräch — bitte Termin wählen'

  const vars: Record<string, string> = {
    LOGO_LIGHT,
    LOGO_DARK,
    ANREDE: safeAnrede,
    LINK: link,
    GUELTIG_BIS: expGerman,
    SLOTS_BLOCK: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">${slotsHtml}</table>`,
    'PERSÖNLICHE_NOTIZ_BLOCK': safeNote
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin-bottom:24px;"><tr><td style="padding:18px 22px;font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safeNote}</td></tr></table>`
      : '',
  }
  let rendered = html
  for (const [k, v] of Object.entries(vars)) rendered = rendered.replaceAll(`{{${k}}}`, v)

  const textSlots = sv.slots.map((s) => `  • ${formatSlotGerman(s.start)} (${s.dauer} Min)`).join('\n')
  const text = `${anrede || 'Hallo'},

vielen Dank für das ausgefüllte Vorgespräch. Gerne lade ich Sie zu unserem kostenlosen Erstgespräch ein.

Mögliche Termine:
${textSlots}

Bitte wählen Sie hier Ihren Wunschtermin (Link 7 Tage gültig, bis ${expGerman}):
${link}

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
    console.log(`✓ Termin-Einladung an ${to} — ${sv.slots.length} Slots — msg ${data.id} — gültig bis ${expGerman}`)
    return jsonResponse(200, {
      ok: true,
      messageId: data.id,
      to,
      link,
      exp: exp.toISOString(),
      expHuman: expGerman,
      slotCount: sv.slots.length,
    })
  } catch (err) {
    console.error('invite-termin error:', err)
    return jsonResponse(500, { error: 'Internal error' })
  }
}
