// submit-questionnaire — empfängt eine Antwort vom Fragebogen unter /fragebogen
// und (a) versendet eine formatierte E-Mail an den Arzt, (b) legt einen Eintrag
// in der Notion-Datenbank „Bright Medical · Fragebögen" an.
//
// Auth:  JWT (signed mit BRIGHT_JWT_SECRET) im Body als `token`
//        Falls kein Token vorhanden: requireToken-Mode wird per ENV gesteuert.
//        ENV `FRAGEBOGEN_REQUIRE_TOKEN`=`'1'` → Token-Pflicht (Default-Behavior).
//        Sonst (für Sprint-1-Kompatibilität): Submit ohne Token erlaubt.
//
// Schutz:  Honeypot, Rate-Limit (10/30min/IP), Origin-Whitelist, Length-Limits.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { verifyFragebogenToken, tokenIdShort } from './_shared/jwt.js'
import { pushToNotion, type FragebogenSubmission } from './_shared/notion.js'
import { notifyCC } from './_shared/notify-cc.ts'

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'

// --- Frage-Definitionen — gespiegelt aus src/data/fragebogen-questions.ts ---
const QUESTIONS_META: Array<{ id: string; label: string; required: boolean; maxLength: number }> = [
  { id: 'name',                 label: 'Vollständiger Name',                                required: true,  maxLength: 200 },
  { id: 'alter',                label: 'Alter',                                              required: true,  maxLength: 50 },
  { id: 'geschlecht',           label: 'Geschlecht',                                         required: true,  maxLength: 50 },
  { id: 'koerper',              label: 'Größe & Gewicht',                                    required: true,  maxLength: 80 },
  { id: 'thema',                label: 'Gesundheitsthema',                                   required: true,  maxLength: 80 },
  { id: 'ziel',                 label: 'Hauptziel für das Coaching',                         required: true,  maxLength: 800 },
  { id: 'dauer',                label: 'Dauer der Beschäftigung mit dem Thema',              required: true,  maxLength: 50 },
  { id: 'gesundheitszustand',   label: 'Aktueller Gesundheitszustand',                       required: true,  maxLength: 200 },
  { id: 'medikamente',          label: 'Aktuelle Medikamente',                               required: false, maxLength: 800 },
  { id: 'coaching_erfahrung',   label: 'Bisherige Coaching-Erfahrung',                       required: true,  maxLength: 200 },
  { id: 'bereitschaft',         label: 'Bereitschaft zur Lifestyle-Änderung',                required: true,  maxLength: 200 },
  { id: 'aufmerksam',           label: 'Wie auf Bright Medical aufmerksam geworden',         required: true,  maxLength: 80 },
  { id: 'sonstiges',            label: 'Sonstiges / weitere Informationen',                  required: false, maxLength: 1500 },
]

// --- Security helpers ------------------------------------------------------

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function nl2br(html: string): string {
  return html.replace(/\r?\n/g, '<br/>')
}

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000
const RATE_LIMIT_MAX = 10
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

const ALLOWED_ORIGINS = ['https://brightmedical.de', 'https://www.brightmedical.de', 'http://localhost']
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (origin.endsWith('.netlify.app')) return true
  return ALLOWED_ORIGINS.some((a) => origin === a || origin.startsWith(a + ':'))
}

// --- Handler ---------------------------------------------------------------

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server-Konfigurationsfehler' }), { status: 500 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('client-ip') ||
    'unknown'
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  // Honeypot — bots fill it; we silently 200
  if (body.honeypot && String(body.honeypot).length > 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  // --- JWT-Validierung (optional in Phase 1, Pflicht in Phase 2) ---
  const requireToken = Netlify.env.get('FRAGEBOGEN_REQUIRE_TOKEN') === '1'
  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET') || ''
  let invitedEmail: string | null = null
  let tokenId = 'no-token'

  if (typeof body.token === 'string' && body.token.length > 0) {
    if (!jwtSecret) {
      return new Response(JSON.stringify({ error: 'Server-Konfigurationsfehler (JWT)' }), { status: 500 })
    }
    const v = verifyFragebogenToken(body.token, jwtSecret)
    if (!v.ok) {
      return new Response(
        JSON.stringify({ error: 'Einladung ungültig oder abgelaufen', reason: v.reason }),
        { status: 401 },
      )
    }
    invitedEmail = v.payload.sub
    tokenId = tokenIdShort(body.token)
  } else if (requireToken) {
    return new Response(
      JSON.stringify({ error: 'Einladung erforderlich', reason: 'noToken' }),
      { status: 401 },
    )
  }

  const answers = body.answers
  if (!answers || typeof answers !== 'object') {
    return new Response(JSON.stringify({ error: 'Missing answers' }), { status: 400 })
  }

  // Validate + sanitize
  const sanitized: Record<string, string> = {}
  for (const q of QUESTIONS_META) {
    const raw = answers[q.id]
    if (raw == null || raw === '') {
      if (q.required) {
        return new Response(JSON.stringify({ error: `Pflichtfeld fehlt: ${q.label}` }), { status: 400 })
      }
      sanitized[q.id] = ''
      continue
    }
    if (typeof raw !== 'string') {
      return new Response(JSON.stringify({ error: `Ungültiger Typ: ${q.id}` }), { status: 400 })
    }
    if (raw.length > q.maxLength) {
      return new Response(JSON.stringify({ error: `Zu lang: ${q.label}` }), { status: 400 })
    }
    sanitized[q.id] = raw.trim()
  }

  // --- Build admin email ---
  const stamp = new Date().toLocaleString('de-DE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  })

  const tableRows = QUESTIONS_META.map((q) => {
    const v = sanitized[q.id]
    const valueHtml = v ? nl2br(escapeHtml(v)) : '<em style="color:#94a3b8;">—</em>'
    return `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #e3e8ee;font-family:Inter,Arial,sans-serif;font-size:12px;color:#5A6A80;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;vertical-align:top;width:200px;">${escapeHtml(q.label)}</td>
        <td style="padding:14px 16px;border-bottom:1px solid #e3e8ee;font-family:Inter,Arial,sans-serif;font-size:14px;color:#0A2540;line-height:1.5;">${valueHtml}</td>
      </tr>
    `
  }).join('')

  const tokenLine = invitedEmail
    ? `<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">${stamp} · IP ${escapeHtml(ip)} · Einladung: ${escapeHtml(invitedEmail)}</div>`
    : `<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">${stamp} · IP ${escapeHtml(ip)} · ohne Einladungs-Link</div>`

  const adminHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#F6F8FA;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:680px;margin:24px auto;background:#FFFFFF;">
    <div style="background:#0B2040;color:#FFFFFF;padding:24px 32px;">
      <div style="font-size:11px;letter-spacing:1.6px;color:#00B8D4;text-transform:uppercase;font-weight:600;margin-bottom:6px;">Neuer Fragebogen</div>
      <div style="font-family:Fraunces,Georgia,serif;font-size:24px;font-weight:500;letter-spacing:-0.3px;">Qualifizierung — ${escapeHtml(sanitized.name || 'unbenannt')}</div>
      ${tokenLine}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      ${tableRows}
    </table>
    <div style="padding:18px 32px;background:#F6F8FA;font-size:11px;color:#5A6A80;border-top:1px solid #e3e8ee;">
      Eintrag in Notion: <strong>Bright Medical · Fragebögen</strong> — bitte dort weiterbearbeiten.
    </div>
  </div>
</body></html>`

  const adminText = QUESTIONS_META.map((q) => `${q.label}\n${sanitized[q.id] || '—'}\n`).join('\n')

  const resend = new Resend(apiKey)
  let resendMessageId: string | undefined
  try {
    const { data } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Neuer Fragebogen — ${sanitized.name || 'unbenannt'} · ${sanitized.thema || '?'}`,
      html: adminHtml,
      text: adminText,
    })
    resendMessageId = data?.id
  } catch (err) {
    console.error('Resend error:', err)
    // continue — Notion-Push immer noch versuchen
  }

  // --- Notion-Push (best effort — wenn Notion-API fehlt, nur Email) ---
  const submission: FragebogenSubmission = {
    name: sanitized.name,
    email: invitedEmail || '',
    thema: sanitized.thema,
    alter: sanitized.alter,
    geschlecht: sanitized.geschlecht,
    koerper: sanitized.koerper,
    ziel: sanitized.ziel,
    dauer: sanitized.dauer,
    gesundheitszustand: sanitized.gesundheitszustand,
    medikamente: sanitized.medikamente,
    coaching_erfahrung: sanitized.coaching_erfahrung,
    bereitschaft: sanitized.bereitschaft,
    aufmerksam: sanitized.aufmerksam,
    sonstiges: sanitized.sonstiges,
    tokenId,
    resendMessageId,
  }

  let notionPageId: string | null = null
  let notionError: string | null = null
  try {
    const r = await pushToNotion(submission)
    if (r.ok) {
      notionPageId = r.pageId
      console.log(`✓ Notion page created: ${r.pageId}`)
    } else {
      notionError = r.error
      console.warn(`! Notion push failed: ${r.error}`)
    }
  } catch (err) {
    notionError = err instanceof Error ? err.message : String(err)
    console.warn(`! Notion push exception:`, notionError)
  }

  console.log(`✓ Fragebogen received from ${sanitized.name || '?'} (token=${tokenId})`)

  // --- Notify Command Center (best-effort) ---
  // Carries all answers + the Notion page id so the CC can link straight to it.
  const ccEmail = invitedEmail || (sanitized.email ?? '')
  if (ccEmail) {
    await notifyCC({
      event: 'bm.questionnaire.submitted',
      email: ccEmail,
      name: sanitized.name,
      notionPageId: notionPageId || undefined,
      data: {
        thema: sanitized.thema,
        alter: sanitized.alter,
        geschlecht: sanitized.geschlecht,
        koerper: sanitized.koerper,
        ziel: sanitized.ziel,
        dauer: sanitized.dauer,
        gesundheitszustand: sanitized.gesundheitszustand,
        medikamente: sanitized.medikamente,
        coaching_erfahrung: sanitized.coaching_erfahrung,
        bereitschaft: sanitized.bereitschaft,
        aufmerksam: sanitized.aufmerksam,
        sonstiges: sanitized.sonstiges,
      },
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      messageId: resendMessageId,
      notionPageId,
      notionError, // visible only in network response — NOT shown to patient
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
