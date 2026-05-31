// submit-termin — nimmt die Terminwahl des Patienten entgegen.
// Validiert das signierte JWT, ermittelt den gewählten Slot, schickt eine
// Bestätigungs-Mail an den Patienten + eine Notiz an info@brightmedical.de
// und meldet "bm.termin.selected" ans Command Center.
//
// Method: POST (vom Browser der /termin-Seite)
// Body:   { "token": "<JWT>", "slotId": "s2" }
// Returns: { ok, slot: { id, start, dauer } } oder 400/401/429/500.
//
// Sicherheit: kein Bearer nötig — die Echtheit garantiert das signierte JWT.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { verifyTerminToken, tokenIdShort, type TerminSlot } from './_shared/jwt.js'
import { notifyCC } from './_shared/notify-cc.ts'

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

// --- Rate limiting (in-memory, resets on cold start) ---
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 20
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// Load confirmation template + logos at module init
function loadFile(rel: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8')
}
const CONFIRM_HTML_TEMPLATE = (() => {
  try { return loadFile('email-templates/e1e-termin-bestaetigung.html') }
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

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('client-ip') || 'unknown'
  if (isRateLimited(ip)) return jsonResponse(429, { error: 'Zu viele Anfragen. Bitte später erneut.' })

  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  if (!jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const { token, slotId } = body || {}
  if (typeof token !== 'string' || !token) return jsonResponse(400, { error: 'Missing token' })
  if (typeof slotId !== 'string' || !slotId) return jsonResponse(400, { error: 'Missing slotId' })

  const verified = verifyTerminToken(token, jwtSecret)
  if (!verified.ok) {
    const code = verified.reason === 'expired' ? 401 : 400
    return jsonResponse(code, { error: 'Ungültiger oder abgelaufener Link', reason: verified.reason })
  }

  const payload = verified.payload
  const slot: TerminSlot | undefined = payload.slots.find((s) => s.id === slotId)
  if (!slot) return jsonResponse(400, { error: 'Unbekannter Termin' })

  const email = payload.sub
  const slotHuman = formatSlotGerman(slot.start)
  const tokenId = tokenIdShort(token)

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  const resend = apiKey ? new Resend(apiKey) : null

  // 1) Confirmation mail to the patient (best-effort)
  if (resend && CONFIRM_HTML_TEMPLATE) {
    try {
      let html = CONFIRM_HTML_TEMPLATE
      const vars: Record<string, string> = {
        LOGO_LIGHT, LOGO_DARK,
        TERMIN: escapeHtml(slotHuman),
        DAUER: String(slot.dauer),
      }
      for (const [k, v] of Object.entries(vars)) html = html.replaceAll(`{{${k}}}`, v)
      await resend.emails.send({
        from: FROM_EMAIL, replyTo: REPLY_TO, to: email,
        subject: 'Ihr Erstgespräch ist reserviert',
        html,
        text: `Ihr Termin ist reserviert:\n\n${slotHuman} (${slot.dauer} Min)\n\nIch melde mich zur vereinbarten Zeit. Bei Fragen einfach auf diese Mail antworten.\n\nHerzlich,\nAjanth Kuhendran · Bright Medical`,
      })
    } catch (err) {
      console.error('[submit-termin] confirmation mail failed', err)
    }
  }

  // 2) Admin notice (best-effort)
  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL, to: ADMIN_EMAIL,
        subject: `Termin gewählt — ${email}`,
        html: `<h2>Erstgespräch-Termin gewählt</h2><p><strong>${escapeHtml(email)}</strong> hat gewählt:</p><p style="font-size:16px;">${escapeHtml(slotHuman)} (${slot.dauer} Min)</p>${payload.subjectId ? `<p style="color:#999;">CC-Ref: ${escapeHtml(payload.subjectId)}</p>` : ''}`,
      })
    } catch (err) {
      console.error('[submit-termin] admin mail failed', err)
    }
  }

  // 3) Notify Command Center (best-effort, helper swallows errors)
  // subjectId travels inside data (NotifyCCInput has no top-level subjectId field).
  await notifyCC({
    event: 'bm.termin.selected',
    email,
    data: {
      ...(payload.subjectId ? { subjectId: payload.subjectId } : {}),
      slotId: slot.id,
      start: slot.start,
      dauer: slot.dauer,
      terminHuman: slotHuman,
    },
  })

  console.log(`✓ Termin gewählt: ${email} → ${slotHuman} (token=${tokenId})`)

  return jsonResponse(200, {
    ok: true,
    slot: { id: slot.id, start: slot.start, dauer: slot.dauer, human: slotHuman },
  })
}
