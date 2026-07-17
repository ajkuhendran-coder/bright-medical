// template-mail-core — reiner Render für die templatebasierten Programm-Mails im Cockpit
// (Freie Text-Mail, Programm-Welcome, Wochen-Anker, Termin-Erinnerung).
//
// EIN Ziel: byte-gleich zur BM-Mail-App. Die Mail-App (public/_intern-mail.html) schickt
// diese Presets über `send-mail.mts` (Vorlage aus email-templates/*.html, {{VARS}}-Substitution,
// Auto-Aufbau der Freitext-Blöcke). Diese Datei SPIEGELT send-mail.mts' Render-Logik 1:1
// (substitute + autoFillFreitext + autoFillNotizBlock), damit Cockpit-Vorschau und Cockpit-Versand
// exakt dieselbe Mail erzeugen wie die Mail-App. Der Live-Sender `send-mail.mts` bleibt UNBERÜHRT —
// hier additiv gespiegelt (wie `invite-portal-core` den `invite-portal.mts` spiegelt).
//
// KEIN Datei-/ENV-Zugriff hier: Vorlagen-HTML + Logo-Base64 werden von der Entry-Function
// (cc-send-preset) hereingereicht (readFileSync-Assets gehören in die Entry-Function).

import type { MailPreset, RenderedMail } from './mail-presets.ts'
import { PresetError, htmlToText } from './mail-presets.ts'

// --- {{KEY}}-Substitution (identisch zu send-mail.mts) ---
function substitute(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v))
  }
  return out
}

// HTML-escape (identisch zu send-mail.mts)
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// PERSÖNLICHE_NOTIZ_BLOCK aus PERSÖNLICHE_NOTIZ bauen (identisch zu send-mail.mts)
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

// Freitext-Blöcke bauen (BODY->BODY_HTML, CTA_LABEL+CTA_LINK->CTA_BLOCK, HINWEIS->HINWEIS_BLOCK).
// Identisch zu send-mail.mts (Vorlage „e-frei"). Alle Nutzereingaben werden HTML-escaped.
function autoFillFreitext(vars: Record<string, string>): void {
  // BODY -> BODY_HTML (Leerzeile = neuer Absatz, einfacher Umbruch = <br/>)
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

  // CTA_LABEL + CTA_LINK -> CTA_BLOCK (nur wenn beide da)
  if (vars['CTA_LABEL'] && vars['CTA_LINK'] && !vars['CTA_BLOCK']) {
    const label = escapeHtml(vars['CTA_LABEL'])
    const href = escapeHtml(vars['CTA_LINK'])
    vars['CTA_BLOCK'] =
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;"><tr><td align="center" style="padding:0;"><a href="${href}" style="display:inline-block;background:#00B8D4;background:linear-gradient(180deg,#00B8D4 0%,#0099B3 100%);color:#FFFFFF;padding:18px 36px;border-radius:999px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(0,184,212,0.25);">${label} &rarr;</a></td></tr></table>`
  }

  // HINWEIS -> HINWEIS_BLOCK (cyan-umrandeter Hinweis-Kasten)
  if (vars['HINWEIS'] && !vars['HINWEIS_BLOCK']) {
    const safe = escapeHtml(vars['HINWEIS']).replace(/\r?\n/g, '<br/>')
    vars['HINWEIS_BLOCK'] =
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin:0 0 24px;border-collapse:separate;"><tr><td style="padding:18px 22px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:8px;">Hinweis</div><div style="font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;">${safe}</div></td></tr></table>`
  }

  // Nicht gefüllte optionale Blöcke leer rendern (nie ein rohes {{PLACEHOLDER}} stehen lassen)
  for (const k of ['BODY_HTML', 'CTA_BLOCK', 'HINWEIS_BLOCK']) {
    if (!vars[k]) vars[k] = ''
  }
}

// --- Render: ein templatebasiertes Preset (byte-gleich zur Mail-App) ---
// Baut die Variablen wie das Mail-App-Formular (Preset-Defaults, überlagert von den Feldwerten),
// injiziert die Logos, baut die Auto-Blöcke und substituiert in die Vorlage. Wirft PresetError
// bei fehlenden Pflichtfeldern → der Endpoint macht daraus eine 400 mit klarer Meldung.
export function renderTemplateMail(opts: {
  preset: MailPreset
  templateHtml: string
  logoLight?: string
  logoDark?: string
  fields: Record<string, unknown>
}): RenderedMail {
  const { preset, templateHtml, fields } = opts

  // Werte: Preset-Defaults, überlagert von den übergebenen Feldwerten (wie das Mail-App-Formular).
  const vars: Record<string, string> = {}
  for (const f of preset.fields) vars[f.key] = f.default ?? ''
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') vars[k] = v
    else if (typeof v === 'number') vars[k] = String(v)
  }

  // Pflichtfelder prüfen (leer/Whitespace = fehlt).
  for (const f of preset.fields) {
    if (f.required && !String(vars[f.key] ?? '').trim()) {
      throw new PresetError(`Pflichtfeld fehlt: ${f.label}`)
    }
  }

  // Logos wie send-mail (die „e-frei"-Vorlage nutzt {{LOGO_LIGHT}}).
  vars['LOGO_LIGHT'] = opts.logoLight ?? ''
  vars['LOGO_DARK'] = opts.logoDark ?? ''

  // Auto-Blöcke (identisch zu send-mail).
  autoFillNotizBlock(vars)
  autoFillFreitext(vars)

  const html = substitute(templateHtml, vars)

  // Betreff: das bearbeitbare Feld `subject` gewinnt, sonst der Preset-Default. Auch der Betreff
  // läuft durch substitute (erlaubt {{VARS}} im Betreff, wie bei send-mail).
  const subjectRaw =
    typeof fields['subject'] === 'string' && (fields['subject'] as string).trim()
      ? (fields['subject'] as string)
      : preset.subject || ''
  const subject = substitute(subjectRaw, vars)

  const text = htmlToText(html)
  return { subject, html, text }
}
