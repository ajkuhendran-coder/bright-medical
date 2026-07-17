// cc-send-preset — Command Center rendert (Vorschau) bzw. versendet eine Preset-Mail.
// Method: POST · Auth: Authorization: Bearer <CC_SEND_SECRET>
// Body: { presetKey, email, fields:{…}, mode:'preview'|'send', idempotencyKey? }
//   mode:'preview' → { subject, html, text }         (kein Versand)
//   mode:'send'    → { ok, messageId } | { ok, alreadySent:true }
//
// Byte-genau: Vorschau UND Versand nutzen DENSELBEN renderPreset → was Dr. K sieht, geht raus.
// Doppelsende-Schutz: `sent_mails.idempotency_key` UNIQUE — beim Send zuerst die Zeile
// reservieren; UNIQUE-Konflikt = schon versendet (kein zweiter Versand). Bei Resend-Fehler
// wird die Reservierung zurückgerollt, damit ein echter Retry möglich bleibt.
// Nach Erfolg: `bm.mail.sent`-Event an CC (Feed/Akte). Human-in-the-loop: nur nach Freigabe-Klick.

import { Resend } from 'resend'
import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbInsert, sbDelete } from './_shared/supabase.ts'
import { renderPreset, getPreset, PresetError, MAIL_PRESETS } from './_shared/mail-presets.ts'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderInvitePortalMail } from './_shared/invite-portal-core.ts'
import { renderTemplateMail } from './_shared/template-mail-core.ts'
import { notifyCC } from './_shared/notify-cc.ts'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

// Portal-Einladungs-Template DIREKT in der Entry-Function laden (Asset-Regel: readFileSync nie im _shared-Modul).
const INVITE_TEMPLATE = (() => {
  try { return readFileSync(fileURLToPath(new URL('../../email-templates/e1i-portal-einladung.html', import.meta.url)), 'utf8') }
  catch (e) { console.error('[cc-send-preset] e1i-Template load failed', e); return '' }
})()

// Vorlagen der templatebasierten Presets + Logos DIREKT in der Entry-Function laden
// (Asset-Regel: readFileSync nie im _shared-Modul). Jede Vorlage genau einmal.
function loadAsset(rel: string): string {
  try { return readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8') }
  catch (e) { console.error(`[cc-send-preset] asset load failed: ${rel}`, e); return '' }
}
const TEMPLATE_HTML: Record<string, string> = {}
for (const p of MAIL_PRESETS) {
  if (p.template && !(p.template in TEMPLATE_HTML)) {
    TEMPLATE_HTML[p.template] = loadAsset(`email-templates/${p.template}.html`)
  }
}
const [LOGO_LIGHT, LOGO_DARK] = (() => {
  const raw = loadAsset('email-templates/_assets/logos-base64.txt')
  const [light, dark] = raw.split('---SEPARATOR---').map((s) => s.trim())
  return [light || '', dark || '']
})()

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function normEmail(x: unknown): string {
  return typeof x === 'string' ? x.trim().toLowerCase() : ''
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('CC_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (CC_SEND_SECRET)' })
  const presented = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const presetKey = typeof body?.presetKey === 'string' ? body.presetKey : ''
  const preset = getPreset(presetKey)
  if (!preset) return jsonResponse(400, { error: `Unbekanntes Preset: ${presetKey || '(keins)'}` })

  const email = normEmail(body?.email)
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })

  const fields = body?.fields && typeof body.fields === 'object' && !Array.isArray(body.fields) ? body.fields : {}
  const mode = body?.mode === 'send' ? 'send' : 'preview'

  // Render (Preview UND Send — derselbe Pfad = byte-identisch).
  // invite-portal signiert einen Portal-Token + füllt das e1i-Template (eigener Render-Weg);
  // templatebasierte Presets (preset.template) laufen über template-mail-core (byte-gleich zur Mail-App);
  // alle anderen (e-html) über renderPreset (Marken-Rahmen).
  let rendered
  try {
    if (presetKey === 'invite-portal') {
      const jwtSecret = Netlify.env.get('BRIGHT_JWT_SECRET')
      if (!jwtSecret) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (BRIGHT_JWT_SECRET)' })
      if (!INVITE_TEMPLATE) return jsonResponse(500, { error: 'Einladungs-Template nicht im Bundle' })
      rendered = renderInvitePortalMail({ template: INVITE_TEMPLATE, email, fields, jwtSecret })
    } else if (preset.template) {
      const templateHtml = TEMPLATE_HTML[preset.template]
      if (!templateHtml) return jsonResponse(500, { error: `Vorlage nicht im Bundle: ${preset.template}` })
      rendered = renderTemplateMail({ preset, templateHtml, logoLight: LOGO_LIGHT, logoDark: LOGO_DARK, fields })
    } else {
      rendered = renderPreset(presetKey, fields)
    }
  } catch (err) {
    if (err instanceof PresetError) return jsonResponse(400, { error: err.message })
    console.error('[cc-send-preset] render failed', err)
    return jsonResponse(500, { error: 'Render fehlgeschlagen.' })
  }

  if (mode === 'preview') {
    return jsonResponse(200, { subject: rendered.subject, html: rendered.html, text: rendered.text })
  }

  // ---- mode:'send' ----
  const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return jsonResponse(400, { error: 'Missing "idempotencyKey" (für den Versand erforderlich)' })
  }

  const apiKey = Netlify.env.get('RESEND_API_KEY')
  if (!apiKey) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (RESEND_API_KEY)' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  // 1) Reservieren: UNIQUE(idempotency_key). Konflikt (23505) = schon versendet → nicht erneut senden.
  try {
    await sbInsert(creds, 'sent_mails', {
      idempotency_key: idempotencyKey,
      client_sub: email,
      preset_key: presetKey,
      subject: rendered.subject,
    })
  } catch (err) {
    if (String((err as Error).message).includes('23505')) {
      return jsonResponse(200, { ok: true, alreadySent: true })
    }
    console.error('[cc-send-preset] reservation insert failed', err)
    return jsonResponse(500, { error: 'Versand konnte nicht vorgemerkt werden.' })
  }

  // 2) Senden. Bei Fehler die Reservierung zurückrollen (echter Retry bleibt möglich).
  const rollback = async () => {
    try { await sbDelete(creds, 'sent_mails', `idempotency_key=eq.${encodeURIComponent(idempotencyKey)}`) }
    catch (e) { console.error('[cc-send-preset] rollback delete failed', e) }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    if (error || !data) {
      await rollback()
      console.error('[cc-send-preset] resend rejected', error)
      return jsonResponse(502, { error: 'Der Mailversand wurde abgelehnt.', detail: error })
    }

    // Best-effort: CC über den Versand informieren (Feed/Akte). Darf den Erfolg nicht kippen.
    await notifyCC({
      event: 'bm.mail.sent',
      email,
      data: { presetKey, subject: rendered.subject, messageId: data.id, at: new Date().toISOString() },
    })

    console.log(`✓ cc-send-preset ${presetKey} an ${email} — message id ${data.id}`)
    return jsonResponse(200, { ok: true, messageId: data.id })
  } catch (err) {
    await rollback()
    console.error('[cc-send-preset] send failed', err)
    return jsonResponse(500, { error: 'Interner Fehler beim Versand.' })
  }
}
