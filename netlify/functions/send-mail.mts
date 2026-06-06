// send-mail — manual mail trigger for templated transactional/personal emails.
//
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (set in Netlify env)
// Method:  POST
// Body (JSON):
//   {
//     "template": "e1b-reminder-erstgespraech",       // required, must be in TEMPLATES
//     "to": "klientin@example.com",                   // required
//     "subject": "Custom subject (optional)",          // optional, overrides template default
//     "from":    "Custom <from@brightmedical.de>",     // optional
//     "replyTo": "info@brightmedical.de",              // optional
//     "vars":    { "ANREDE_KURZ": "Herr Mustermann", ... } // optional, merged into template defaults
//   }
//
// Returns 200 { ok: true, messageId, subject, to }
// 401 wrong/missing token, 400 bad input, 429 rate limited, 500 internal.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FROM_DEFAULT = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO_DEFAULT = 'info@brightmedical.de'

// --- Template registry (mirrors scripts/send-test.js) ---
type TemplateKey =
  | 'e-frei'
  | 'e0a-confirmation'
  | 'e0c-verzoegerung'
  | 'e1a-welcome'
  | 'e1b-reminder-erstgespraech'
  | 'e1c-reminder-folgetermin'
  | 'e1f-praxis-onboarding'
  | 'e1h-telefon-nachfrage'
  | 'e10-teaser'
  | 'e11-newsletter'
  | 'e2a-program-launch'
  | 'e3a-zahlungslink'

type TemplateConfig = {
  subject: string
  vars: Record<string, string>
}

const TEMPLATES: Record<TemplateKey, TemplateConfig> = {
  'e-frei': {
    subject: 'Eine Nachricht von Bright Medical',
    vars: {
      PREHEADER: 'Eine persönliche Nachricht von Bright Medical.',
      ANREDE: 'Guten Tag,',
      BODY: '',
      BODY_HTML: '',
      CTA_LABEL: '',
      CTA_LINK: '',
      CTA_BLOCK: '',
      HINWEIS: '',
      HINWEIS_BLOCK: '',
    },
  },
  'e0a-confirmation': {
    subject: 'Ihre Anfrage ist bei uns angekommen',
    vars: { firstName: 'Patient:in' },
  },
  'e0c-verzoegerung': {
    subject: 'Eine persönliche Nachricht zu Ihrer Anfrage',
    vars: { ANREDE: 'Guten Tag' },
  },
  'e10-teaser': {
    subject: 'Etwas Neues aus unserer Praxis.',
    vars: {},
  },
  'e1a-welcome': {
    subject: 'Willkommen bei Bright Medical',
    vars: {
      ANREDE_KURZ: 'Frau/Herr …',
      TERMIN_TAG: '—',
      TERMIN_MONAT_KURZ: '—',
      TERMIN_WOCHENTAG_KURZ: '—',
      TERMIN_DAUER: '20 min',
      TERMIN_UHRZEIT: '—',
      TERMIN_FORMAT: 'Telefongespräch',
    },
  },
  'e1b-reminder-erstgespraech': {
    subject: 'Erinnerung: Erstgespräch · {{WOCHENTAG_KURZ}} {{DATUM_KURZ}} · {{UHRZEIT}} Uhr',
    vars: {
      ANREDE_KURZ: 'Frau/Herr …',
      WOCHENTAG: '—',
      WOCHENTAG_KURZ: '—',
      DATUM_KURZ: '—',
      TAG_MONAT: '—',
      JAHR: '—',
      UHRZEIT: '—',
      DAUER: '20 Minuten',
      TELEFON_HINWEIS:
        'Bitte antworten Sie mir kurz mit der Telefonnummer, unter der ich Sie morgen erreichen kann.',
      'PERSÖNLICHE_NOTIZ': '',
    },
  },
  'e1c-reminder-folgetermin': {
    subject: 'Erinnerung: Ihr Coaching-Termin morgen',
    vars: {
      TERMIN_TYP: 'Coaching-Call',
      HEADLINE: 'Ihr nächster Coaching-Call.',
      WOCHENTAG: '—',
      TAG_MONAT: '—',
      JAHR: '—',
      UHRZEIT: '—',
      DAUER: '45 min',
      ORT_LABEL: 'Format',
      ORT_PRIMARY: 'Telefongespräch',
      ORT_HINWEIS: 'Ich rufe Sie an unter der hinterlegten Nummer.',
      VORBEREITUNG_1: 'Halten Sie Ihr Tagebuch / Tracking-Sheet bereit.',
      VORBEREITUNG_2: 'Notieren Sie 2–3 Themen, die Sie besprechen möchten.',
      VORBEREITUNG_3: 'Aktuelle Werte (CGM, Schlaf, Gewicht) — falls relevant.',
    },
  },
  'e1f-praxis-onboarding': {
    subject: 'Ihr Start bei Bright Medical — die nächsten Schritte',
    vars: {
      PREHEADER: 'Schön, dass Sie dabei sind — hier die nächsten Schritte.',
      ANREDE: 'Liebe/r …,',
      BODY:
        'wir haben in unserem persönlichen Gespräch Ihre Ziele, Ihre Ausgangslage und Ihren möglichen Weg in Ruhe besprochen. Ich freue mich sehr, dass Sie sich für die Begleitung durch Bright Medical entschieden haben.\n\nDamit wir gut starten können, habe ich Ihnen die nächsten Schritte hier noch einmal kurz zusammengefasst.',
      BODY_HTML: '',
      HINWEIS: '',
      HINWEIS_BLOCK: '',
      CTA_LABEL: '',
      CTA_LINK: '',
      CTA_BLOCK: '',
    },
  },
  'e1h-telefon-nachfrage': {
    subject: 'Wie erreiche ich Sie am besten?',
    vars: {
      PREHEADER: 'Mir fehlt noch Ihre Telefonnummer für unser Gespräch.',
      ANREDE: 'Liebe/r …,',
      BODY:
        'damit wir unser Gespräch gut vorbereiten können und ich Sie sicher erreiche, fehlt mir noch Ihre Telefonnummer.',
      BODY_HTML: '',
      HINWEIS: '',
      HINWEIS_BLOCK: '',
      CTA_LABEL: '',
      CTA_LINK: '',
      CTA_BLOCK: '',
    },
  },
  'e11-newsletter': {
    subject: 'Der Rundgang — Bright Medical',
    vars: {},
  },
  'e2a-program-launch': {
    subject: 'Neu: Unser Longevity-Programm öffnet im Mai',
    vars: {},
  },
  'e3a-zahlungslink': {
    subject: 'Ihr Zahlungslink — {{PROGRAMM_NAME}}',
    vars: {
      ANREDE: 'Frau/Herr …',
      PROGRAMM_NAME: 'Bright Medical Vollprogramm — 12 Wochen',
      PROGRAMM_KURZBESCHREIBUNG: '12 Wochen ärztlich begleitetes Coaching · 7 Calls · 6 CGM-Sensoren · individueller Plan',
      PROGRAMM_PREIS: '2.990 €',
      PROGRAMM_ZAHLUNGSMODUS: 'Einmalzahlung',
      ZAHLUNGSLINK: 'https://buy.stripe.com/fZu7sL93vdJ2gmZ8ejcQU01',
      'PERSÖNLICHE_NOTIZ': '',
      'PERSÖNLICHE_NOTIZ_BLOCK': '',
    },
  },
}

// Personalized templates MUST receive real per-recipient data from the caller.
// Without this guard, the defaults above would silently render for a real patient
// (the "Herr Mustermann / 30. April" bug). A missing key now fails loudly with 400
// instead of mailing a plausible-but-wrong name/date to a real recipient.
const REQUIRED_VARS: Partial<Record<TemplateKey, string[]>> = {
  'e1a-welcome': [
    'ANREDE_KURZ',
    'TERMIN_TAG',
    'TERMIN_MONAT_KURZ',
    'TERMIN_WOCHENTAG_KURZ',
    'TERMIN_UHRZEIT',
  ],
  'e1b-reminder-erstgespraech': [
    'ANREDE_KURZ',
    'WOCHENTAG',
    'WOCHENTAG_KURZ',
    'DATUM_KURZ',
    'TAG_MONAT',
    'JAHR',
    'UHRZEIT',
  ],
  'e1c-reminder-folgetermin': ['WOCHENTAG', 'TAG_MONAT', 'JAHR', 'UHRZEIT'],
  'e1f-praxis-onboarding': ['ANREDE'],
  'e1h-telefon-nachfrage': ['ANREDE'],
  'e3a-zahlungslink': ['ANREDE'],
}

// --- Load templates + logos at module init (bundled via netlify.toml `included_files`) ---
function loadFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf8')
}

const HTML_BY_TEMPLATE: Record<string, string> = {}
for (const key of Object.keys(TEMPLATES) as TemplateKey[]) {
  try {
    HTML_BY_TEMPLATE[key] = loadFile(`email-templates/${key}.html`)
  } catch (e) {
    console.warn(`Could not load template ${key}:`, (e as Error).message)
  }
}

let LOGO_LIGHT = ''
let LOGO_DARK = ''
try {
  const logosRaw = loadFile('email-templates/_assets/logos-base64.txt')
  const [light, dark] = logosRaw.split('---SEPARATOR---').map((s) => s.trim())
  LOGO_LIGHT = light || ''
  LOGO_DARK = dark || ''
} catch {
  // If absent, templates fall back to {{LOGO_*}} placeholders being left blank/visible.
}

// --- Rate limiting (in-memory, resets on cold start) ---
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 30
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>()
function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstRequest: now })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// --- Constant-time string compare (mitigate timing-attacks on the bearer token) ---
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// --- Substitute {{KEY}} placeholders ---
function substitute(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v))
  }
  return out
}

// HTML-escape user content (for embedded blocks like persönliche Notiz)
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Auto-build PERSÖNLICHE_NOTIZ_BLOCK from PERSÖNLICHE_NOTIZ when only the latter is given
function autoFillNotizBlock(vars: Record<string, string>): void {
  const note = vars['PERSÖNLICHE_NOTIZ']
  const block = vars['PERSÖNLICHE_NOTIZ_BLOCK']
  if (note && !block) {
    const safe = escapeHtml(note).replace(/\r?\n/g, '<br/>')
    vars['PERSÖNLICHE_NOTIZ_BLOCK'] = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin:0 0 24px;border-collapse:separate;"><tr><td style="padding:18px 22px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:8px;">Persönlich</div><div style="font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safe}</div></td></tr></table>`
  } else if (!note && !block) {
    vars['PERSÖNLICHE_NOTIZ_BLOCK'] = ''
  }
}

// Build the freitext template blocks from raw user input (template "e-frei").
// BODY (plain text) -> BODY_HTML (paragraphs), CTA_LABEL+CTA_LINK -> CTA_BLOCK,
// HINWEIS -> HINWEIS_BLOCK. All user input is HTML-escaped.
function autoFillFreitext(vars: Record<string, string>): void {
  // BODY -> BODY_HTML (double newline = new paragraph, single newline = <br/>)
  if (vars['BODY'] && !vars['BODY_HTML']) {
    const paras = escapeHtml(vars['BODY'])
      .split(/\r?\n\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
    vars['BODY_HTML'] = paras
      .map(
        (p) =>
          `<div class="sans" style="font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.65;color:#2A3A52;margin-bottom:18px;">${p.replace(/\r?\n/g, '<br/>')}</div>`,
      )
      .join('')
  }

  // CTA_LABEL + CTA_LINK -> CTA_BLOCK (only if both present)
  if (vars['CTA_LABEL'] && vars['CTA_LINK'] && !vars['CTA_BLOCK']) {
    const label = escapeHtml(vars['CTA_LABEL'])
    const href = escapeHtml(vars['CTA_LINK'])
    vars['CTA_BLOCK'] =
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;"><tr><td align="center" style="padding:0;"><a href="${href}" style="display:inline-block;background:#00B8D4;background:linear-gradient(180deg,#00B8D4 0%,#0099B3 100%);color:#FFFFFF;padding:18px 36px;border-radius:999px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(0,184,212,0.25);">${label} &rarr;</a></td></tr></table>`
  }

  // HINWEIS -> HINWEIS_BLOCK (cyan-bordered note card)
  if (vars['HINWEIS'] && !vars['HINWEIS_BLOCK']) {
    const safe = escapeHtml(vars['HINWEIS']).replace(/\r?\n/g, '<br/>')
    vars['HINWEIS_BLOCK'] =
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin:0 0 24px;border-collapse:separate;"><tr><td style="padding:18px 22px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:8px;">Hinweis</div><div style="font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;">${safe}</div></td></tr></table>`
  }

  // Ensure unfilled optional blocks render as empty (never leave raw {{PLACEHOLDER}})
  for (const k of ['BODY_HTML', 'CTA_BLOCK', 'HINWEIS_BLOCK']) {
    if (!vars[k]) vars[k] = ''
  }
}

// --- CORS ---
// We allow any origin: the actual auth is the Bearer token, so the same-origin policy
// adds no security here. Permissive CORS just lets the form work from preview URLs,
// the production page, and any other future client (iOS Shortcut, etc.).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })
}

// --- Handler ---
export default async (req: Request, _context: Context) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  // Bearer auth
  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) {
    console.error('BRIGHT_SEND_SECRET not configured in Netlify env')
    return jsonResponse(500, { error: 'Server-Konfigurationsfehler' })
  }

  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/)
  const presented = match?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  // Rate limiting (per-IP — cheap belt for public endpoint, even with auth)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('client-ip') ||
    'unknown'
  if (isRateLimited(ip)) {
    return jsonResponse(429, { error: 'Rate limit exceeded — try again in an hour.' })
  }

  // Resend key
  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured')
    return jsonResponse(500, { error: 'Server-Konfigurationsfehler' })
  }

  // Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  const { template, to, subject, from, replyTo, vars: clientVars } = body || {}

  if (typeof template !== 'string' || !(template in TEMPLATES)) {
    return jsonResponse(400, {
      error: 'Unknown or missing template',
      available: Object.keys(TEMPLATES),
    })
  }
  if (typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "to"' })
  }
  if (clientVars !== undefined && (typeof clientVars !== 'object' || Array.isArray(clientVars))) {
    return jsonResponse(400, { error: '"vars" must be an object' })
  }

  // Guard: personalized templates must get real per-recipient data from the caller.
  const required = REQUIRED_VARS[template as TemplateKey]
  if (required) {
    const provided = (clientVars || {}) as Record<string, unknown>
    const missing = required.filter((k) => {
      const v = provided[k]
      return typeof v !== 'string' || v.trim() === ''
    })
    if (missing.length > 0) {
      return jsonResponse(400, {
        error: `Template "${template}" requires per-recipient vars — refusing to send with placeholder defaults`,
        missing,
      })
    }
  }

  const templateKey = template as TemplateKey
  const cfg = TEMPLATES[templateKey]
  const html = HTML_BY_TEMPLATE[templateKey]
  if (!html) {
    return jsonResponse(500, { error: `Template HTML not bundled: ${templateKey}` })
  }

  // Merge vars: defaults < client overrides < injected logos
  const mergedVars: Record<string, string> = {
    ...cfg.vars,
    ...(clientVars || {}),
    LOGO_LIGHT,
    LOGO_DARK,
  }

  // Auto-render PERSÖNLICHE_NOTIZ_BLOCK from PERSÖNLICHE_NOTIZ
  autoFillNotizBlock(mergedVars)

  // Auto-render freitext blocks (BODY_HTML, CTA_BLOCK, HINWEIS_BLOCK) for template "e-frei"
  autoFillFreitext(mergedVars)

  // Render
  const renderedHtml = substitute(html, mergedVars)
  const renderedSubject = substitute(
    typeof subject === 'string' && subject.length > 0 ? subject : cfg.subject,
    mergedVars,
  )

  // Send via Resend
  const resend = new Resend(apiKey)
  try {
    const { data, error } = await resend.emails.send({
      from: typeof from === 'string' && from.length > 0 ? from : FROM_DEFAULT,
      replyTo: typeof replyTo === 'string' && replyTo.length > 0 ? replyTo : REPLY_TO_DEFAULT,
      to,
      subject: renderedSubject,
      html: renderedHtml,
    })
    if (error || !data) {
      console.error('Resend error:', error)
      return jsonResponse(502, { error: 'Resend rejected the message', detail: error })
    }
    console.log(`✓ Sent ${templateKey} to ${to} — message id ${data.id}`)
    return jsonResponse(200, {
      ok: true,
      messageId: data.id,
      template: templateKey,
      subject: renderedSubject,
      to,
    })
  } catch (err) {
    console.error('send-mail unexpected error:', err)
    return jsonResponse(500, { error: 'Internal error during send' })
  }
}
