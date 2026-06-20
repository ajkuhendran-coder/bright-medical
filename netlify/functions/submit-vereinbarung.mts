// submit-vereinbarung — nimmt die Online-Gegenzeichnung des Coaching-Vertrags entgegen.
// Validiert das signierte JWT (scope 'vereinbarung'), protokolliert die Zustimmung,
// erzeugt eine ausgefüllte Vertrags-PDF (Klientendaten + Bestätigungsprotokoll) und
// versendet sie per Mail an Klient + info@, plus notify-cc "bm.vereinbarung.signed".
//
// Method: POST (vom Browser der /vereinbarung-Seite)
// Body:   { token, name, anschrift, geburtsdatum, telefon, signature, accept:true }
// Returns: { ok } oder 400/401/429/500.
//
// Sicherheit: kein Bearer nötig — die Echtheit garantiert das signierte JWT.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { verifyVereinbarungToken, tokenIdShort } from './_shared/jwt.js'
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

// --- Rate limiting (in-memory) ---
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 15
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

// Load the (non-fillable) contract + Anlagen PDFs at module init.
function loadBuffer(rel: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)))
}
const CONTRACT_PDF = (() => {
  try { return loadBuffer('email-templates/_assets/coaching-vertrag.pdf') }
  catch { return null }
})()
const ANLAGEN_PDF = (() => {
  try { return loadBuffer('email-templates/_assets/coaching-vertrag-anlagen.pdf') }
  catch { return null }
})()
const EINWILLIGUNG_PDF = (() => {
  try { return loadBuffer('email-templates/_assets/coaching-vertrag-einwilligung.pdf') }
  catch { return null }
})()

// Helvetica/WinAnsi can't encode chars outside Latin-1 (e.g. "→"). Sanitize before drawing.
function pdfSafe(s: string): string {
  return String(s)
    .replace(/→/g, '->')
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Keep "€" (WinAnsi 0x80); strip any other non-Latin-1 char Helvetica can't encode.
    .replace(/[^\x00-\xFF€]/g, ' ')
}

// Paket-Checkbox-Positionen auf Seite 1 (y von UNTEN; A4 595x842). Kalibriert auf den
// anwaltlich finalen Vertrag (Stand Juni 2026, 6 Seiten).
const PAKET_CHECK_Y: Record<string, number> = {
  deepdive: 240,
  vollprogramm: 222,
  raten: 204,
  upgrade: 186,
}

type Felder = {
  name: string
  anschrift: string
  geburtsdatum: string
  telefon: string
  email: string
  signature: string
  paketKey: string
  paketLabel: string
  paketPreis: string
  subjectId?: string
}

// Build the filled contract PDF (stamp data onto page 1/4/5 + append protocol page).
async function buildFilledPdf(f: Felder, meta: { bestaetigtAm: string; ip: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.load(CONTRACT_PDF!)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()
  const ink = rgb(0.06, 0.15, 0.25)
  const teal = rgb(0.0, 0.62, 0.72)

  const draw = (pageIdx: number, x: number, y: number, text: string, size = 10, f2 = font) => {
    const p = pages[pageIdx]
    if (!p) return
    p.drawText(pdfSafe(text), { x, y, size, font: f2, color: ink })
  }

  // Seite 1 (Index 0): Datentabelle §1
  draw(0, 245, 505, f.name)
  draw(0, 245, 486, f.anschrift)
  draw(0, 245, 463, f.geburtsdatum)
  draw(0, 245, 441, f.telefon)
  draw(0, 245, 419, f.email)
  // Paket-Häkchen §2 (Seite 1)
  const cy = PAKET_CHECK_Y[f.paketKey]
  if (cy !== undefined) pages[0]?.drawText('X', { x: 95, y: cy, size: 11, font: fontB, color: teal })

  // Unterschriftenseite (Index 5): Ort/Datum (online bestätigt) + getippte Unterschrift
  const datumOnly = meta.bestaetigtAm.split(',')[0]
  draw(5, 95, 713, `Online bestätigt am ${datumOnly}`, 9)
  draw(5, 100, 690, f.signature, 12)

  // --- Protocol page ---
  const W = 595.28, H = 841.89
  const page = doc.addPage([W, H])
  const drawP = (x: number, y: number, text: string, size: number, f2 = font, color = ink) =>
    page.drawText(pdfSafe(text), { x, y, size, font: f2, color })
  let y = H - 70
  drawP(56, y, 'Bestätigungsprotokoll', 20, fontB)
  y -= 14
  page.drawRectangle({ x: 56, y, width: W - 112, height: 1.5, color: teal })
  y -= 26
  drawP(56, y, 'Coaching-Vereinbarung — elektronisch bestätigt (Textform gem. § 11 des Vertrages).', 10)
  y -= 30

  const rows: [string, string][] = [
    ['Name, Vorname', f.name],
    ['Anschrift', f.anschrift],
    ['Geburtsdatum', f.geburtsdatum],
    ['Telefon', f.telefon],
    ['E-Mail', f.email],
    ['Gewähltes Paket', `${f.paketLabel} — ${f.paketPreis}`],
    ['Bestätigt am', meta.bestaetigtAm],
    ['Unterschrift (Druckbuchstaben)', f.signature],
    ['IP-Adresse', meta.ip],
    ...(f.subjectId ? [['Referenz', f.subjectId] as [string, string]] : []),
  ]
  for (const [label, val] of rows) {
    drawP(56, y, label, 9, fontB, teal)
    drawP(210, y, String(val || '-'), 10)
    y -= 22
  }
  y -= 10
  const note =
    'Der Klient hat bestätigt, die Coaching-Vereinbarung und die Widerrufsbelehrung gelesen zu haben und dem Vertrag zuzustimmen. Ihm steht ein 14-tägiges Widerrufsrecht ab Vertragsschluss zu (siehe Anlage 1 / Widerrufsbelehrung). Die vollständige Vereinbarung mit Anlagen liegt diesem Dokument bei.'
  // simple word-wrap
  const words = pdfSafe(note).split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (font.widthOfTextAtSize(test, 9) > W - 112) {
      drawP(56, y, line, 9); y -= 14; line = w
    } else line = test
  }
  if (line) drawP(56, y, line, 9)

  return doc.save()
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('client-ip') || 'unknown'
  if (isRateLimited(ip)) return jsonResponse(429, { error: 'Zu viele Anfragen. Bitte später erneut.' })

  const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!jwtSecret || !apiKey) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (env)' })
  if (!CONTRACT_PDF) return jsonResponse(500, { error: 'Vertrags-PDF nicht im Bundle' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }
  const { token, name, anschrift, geburtsdatum, telefon, signature, accept } = body || {}

  if (typeof token !== 'string') return jsonResponse(400, { error: 'Missing token' })
  const v = verifyVereinbarungToken(token, jwtSecret)
  if (!v.ok) {
    const status = v.reason === 'expired' ? 401 : 401
    return jsonResponse(status, { error: `Token ${v.reason}` })
  }
  if (accept !== true) return jsonResponse(400, { error: 'Zustimmung erforderlich' })

  const str = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '')
  const f: Felder = {
    name: str(name, 120),
    anschrift: str(anschrift, 200),
    geburtsdatum: str(geburtsdatum, 20),
    telefon: str(telefon, 40),
    email: v.payload.sub,
    signature: str(signature, 120),
    paketKey: v.payload.paketKey,
    paketLabel: v.payload.paketLabel,
    paketPreis: v.payload.paketPreis,
    subjectId: v.payload.subjectId,
  }
  if (!f.name || !f.anschrift || !f.geburtsdatum || !f.telefon || !f.signature) {
    return jsonResponse(400, { error: 'Bitte alle Felder ausfüllen' })
  }

  const bestaetigtAm = new Date().toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  }) + ' Uhr'

  let filledPdf: Uint8Array
  try {
    filledPdf = await buildFilledPdf(f, { bestaetigtAm, ip })
  } catch (err) {
    console.error('[submit-vereinbarung] PDF build failed', err)
    return jsonResponse(500, { error: 'PDF-Erzeugung fehlgeschlagen' })
  }

  const attachments: { filename: string; content: string }[] = [
    { filename: 'Coaching-Vereinbarung-bestaetigt.pdf', content: Buffer.from(filledPdf).toString('base64') },
  ]
  if (ANLAGEN_PDF) {
    attachments.push({ filename: 'Anlagen-Widerruf-Leistung-Datenschutz.pdf', content: ANLAGEN_PDF.toString('base64') })
  }
  if (EINWILLIGUNG_PDF) {
    attachments.push({ filename: 'Einwilligung-Gesundheitsdaten.pdf', content: EINWILLIGUNG_PDF.toString('base64') })
  }

  const safeName = escapeHtml(f.name)
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#F6F8FA;font-family:'Inter',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;">
<tr><td style="padding:14px 40px;background:#F6F8FA;border-bottom:1px solid #E3E8EE;"><img src="https://brightmedical.de/images/logo-light.png" alt="Bright Medical" width="155" style="height:36px;width:auto;display:block;" /></td></tr>
<tr><td style="padding:40px 40px 32px;">
<div style="font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:14px;">Bestätigt</div>
<div style="font-family:'Fraunces',Georgia,serif;font-size:28px;line-height:1.15;color:#0A2540;margin-bottom:22px;font-weight:500;">Ihre Vereinbarung ist bestätigt.</div>
<div style="font-size:15px;line-height:1.65;color:#2A3A52;margin-bottom:18px;">Guten Tag ${safeName},</div>
<div style="font-size:15px;line-height:1.65;color:#2A3A52;margin-bottom:18px;">vielen Dank! Ihre Coaching-Vereinbarung (${escapeHtml(f.paketLabel)}) ist bestätigt. Im Anhang finden Sie die vollständige, bestätigte Vereinbarung, die Anlagen (Widerrufsbelehrung, Leistungsbeschreibung, Datenschutz) sowie die gesonderte Einwilligung zur Verarbeitung von Gesundheitsdaten als PDF.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,184,212,0.06);border-left:3px solid #00B8D4;margin:8px 0 24px;"><tr><td style="padding:16px 18px;font-size:13px;line-height:1.6;color:#2A3A52;">Ihnen steht ein <strong>14-tägiges Widerrufsrecht</strong> zu (ab Vertragsschluss). Die Widerrufsbelehrung liegt als Anlage 1 bei. Bestätigt am ${escapeHtml(bestaetigtAm)}.</td></tr></table>
<div style="font-size:15px;line-height:1.65;color:#2A3A52;margin-bottom:18px;">Ich melde mich in Kürze persönlich, damit wir gemeinsam starten.</div>
<div style="font-size:14px;color:#2A3A52;margin-bottom:6px;">Herzliche Grüße,</div>
<div style="font-size:15px;font-weight:600;color:#0A2540;">Ajanth Kuhendran</div>
<div style="font-size:13px;color:#5A6A80;line-height:1.5;">Facharzt für Allgemeinmedizin<br/>Spezialist für funktionelle &amp; integrative Medizin</div>
</td></tr>
<tr><td style="background:#0B2040;padding:22px 40px;color:rgba(255,255,255,0.6);font-size:11px;line-height:1.55;font-style:italic;">Coaching-Dienstleistung im zweiten Gesundheitsmarkt. Keine Kassenleistung.<br/>Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal · info@brightmedical.de</td></tr>
</table></td></tr></table></body></html>`

  const resend = new Resend(apiKey)
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: f.email,
      bcc: ADMIN_EMAIL,
      subject: 'Ihre Coaching-Vereinbarung ist bestätigt',
      html,
      attachments,
    })
    if (error || !data) {
      console.error('Resend error:', error)
      return jsonResponse(502, { error: 'Resend rejected the message', detail: error })
    }

    await notifyCC({
      event: 'bm.vereinbarung.signed',
      email: f.email,
      name: f.name,
      data: {
        ...(f.subjectId ? { subjectId: f.subjectId } : {}),
        paket: f.paketKey,
        paketLabel: f.paketLabel,
        bestaetigtAm,
        ip,
      },
    })

    console.log(`✓ Vereinbarung bestätigt: ${f.email} — Paket ${f.paketKey} (token=${tokenIdShort(token)})`)
    return jsonResponse(200, { ok: true })
  } catch (err) {
    console.error('submit-vereinbarung error:', err)
    return jsonResponse(500, { error: 'Internal error' })
  }
}
