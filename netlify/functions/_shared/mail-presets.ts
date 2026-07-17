// mail-presets — Katalog + Render für die „Mail im Cockpit"-Funktion (#4).
// EINE Quelle für beide Oberflächen: das Cockpit holt den Katalog über `cc-mail-presets`,
// der Versand rendert über `renderPreset` in `cc-send-preset`. Preview UND Send nutzen
// DENSELBEN Render → garantiert byte-identisch (kein zweiter Render-Pfad).
//
// Stufe 1: `e-html` = freie HTML-Mail, eingebettet in den Bright-Medical-Marken-Rahmen
// (Logo-Kopf, Navy-Footer mit Coaching-/HWG-Hinweis). Weitere Presets (Wochen-Anker,
// Call-Reminder, …) docken später als zusätzliche Einträge + Render-Zweige an.

export type MailFieldType = 'text' | 'textarea' | 'number' | 'date' | 'html'
export type MailField = {
  key: string
  label: string
  type: MailFieldType
  default?: string
  hint?: string
  required?: boolean
  half?: boolean // CC-UI: nebeneinander im Grid
}
export type MailPreset = {
  key: string
  label: string
  target: string // Anzeige, wer der typische Empfänger ist (z. B. „Klientin")
  subject?: string // fester Default-Betreff, sonst aus Feld
  fields: MailField[]
}
export type RenderedMail = { subject: string; html: string; text: string }

// Fehler, den der Aufrufer als 400 (klare Meldung an den Coach) behandeln soll.
export class PresetError extends Error {}

// ------------------------------------------------------------------ Katalog
export const MAIL_PRESETS: MailPreset[] = [
  {
    key: 'e-html',
    label: 'Freie HTML-Mail',
    target: 'Klientin',
    fields: [
      { key: 'subject', label: 'Betreff', type: 'text', default: '', hint: 'Die Betreffzeile der E-Mail.', required: true },
      { key: 'preheader', label: 'Vorschautext (optional)', type: 'text', default: '', hint: 'Kurzer Text, den das Mailprogramm in der Übersicht neben dem Betreff zeigt.', required: false },
      {
        key: 'html',
        label: 'HTML-Inhalt',
        type: 'html',
        default: '',
        hint: 'Ihr HTML-Code. Wird automatisch in den Bright-Medical-Rahmen (Logo oben, Coaching-Fußzeile unten) eingebettet — die <html>/<head>/<body>-Hülle können Sie mitschicken oder weglassen.',
        required: true,
      },
    ],
  },
  {
    // Portal-Zugang: signierter, sicherer Link ins Klient-Portal. Render/Token laufen über
    // invite-portal-core (cc-send-preset), NICHT über renderPreset — die Felder hier steuern
    // Dropdown + Formular im Cockpit. Betreff ist fest („Ihr persönlicher Bereich bei Bright Medical").
    key: 'invite-portal',
    label: 'Portal-Zugang senden',
    target: 'Klientin',
    fields: [
      { key: 'name', label: 'Vorname', type: 'text', default: '', hint: 'Für die Begrüßung + den Portal-Bereich.', required: true, half: true },
      { key: 'anrede', label: 'Anrede', type: 'text', default: '', hint: 'z. B. „Liebe Frau Junga,". Leer = „Guten Tag,".', half: true },
      { key: 'programLabel', label: 'Programm', type: 'text', default: 'Metabolic Deep-Dive', hint: 'Erscheint im Portal und in der Mail.' },
      { key: 'weekCurrent', label: 'Aktuelle Woche', type: 'number', default: '1', half: true },
      { key: 'weekTotal', label: 'Wochen gesamt', type: 'number', default: '4', half: true },
      { key: 'focusTitle', label: 'Fokus-Titel (optional)', type: 'text', default: '', hint: 'Personalisiert die Portal-Startseite.' },
      { key: 'focusText', label: 'Fokus-Text (optional)', type: 'textarea', default: '' },
      { key: 'focusStep', label: 'Kleiner Schritt (optional)', type: 'text', default: '' },
      { key: 'nextCallHuman', label: 'Nächster Termin (optional)', type: 'text', default: '', hint: 'z. B. „Mittwoch, 16.07."' },
      { key: 'personalNote', label: 'Persönliche Notiz (optional)', type: 'textarea', default: '', hint: 'Erscheint als hervorgehobener Block in der Einladungs-Mail.' },
    ],
  },
]

export function getPreset(key: string): MailPreset | undefined {
  return MAIL_PRESETS.find((p) => p.key === key)
}

// ------------------------------------------------------------------ Helfer
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Einen einzelnen äußeren <div>-Container abstreifen (häufiges Muster: der eingefügte
// Body ist ein einziger Layout-Wrapper). Nur wenn der zum ERSTEN <div> gehörende
// Schluss-Tag am Ende steht (= genau ein umschließender Container) — sonst unverändert.
function unwrapSingleContainer(html: string): string {
  const s = html.trim()
  const open = s.match(/^<div\b[^>]*>/i)
  if (!open) return s
  const re = /<(\/?)div\b[^>]*>/gi
  let depth = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    depth += m[1] ? -1 : 1
    if (depth === 0) {
      // Schluss-Tag dieses ersten <div> gefunden — steht es am Ende?
      return m.index + m[0].length === s.length ? s.slice(open[0].length, m.index).trim() : s
    }
  }
  return s
}

// Aus dem eingefügten HTML den eigentlichen Inhalt gewinnen: <body> extrahieren (falls
// eine ganze Seite kam), <script>/<style> entfernen (E-Mail ignoriert Scripts ohnehin),
// einen einzelnen äußeren Layout-Container abstreifen.
function innerContent(raw: string): string {
  let s = String(raw ?? '')
  const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (body) s = body[1]
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  return unwrapSingleContainer(s.trim())
}

// Roher Text-Fallback (Multipart-Mails ohne Text-Teil landen eher im Spam).
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|ol|ul)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim()
}

// Der Bright-Medical-Marken-Rahmen: Logo-Kopf + Inhalt + Navy-Footer (HWG-/Coaching-Hinweis).
// Logo wird zur Anzeige aus der Live-Domain geladen (wie die Benachrichtigungs-Mails), kein Bundling nötig.
export function brandedHtmlEmail(opts: { inner: string; preheader?: string }): string {
  const pre = opts.preheader && opts.preheader.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">${escapeHtml(opts.preheader.trim())}</div>`
    : ''
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F6F8FA;font-family:'Inter',Arial,sans-serif;">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;">
<tr><td style="padding:14px 40px;background:#F6F8FA;border-bottom:1px solid #E3E8EE;"><img src="https://brightmedical.de/images/logo-light.png" alt="Bright Medical" width="155" style="height:36px;width:auto;display:block;" /></td></tr>
<tr><td style="padding:30px 34px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b;font-size:15px;line-height:1.6;">${opts.inner}</td></tr>
<tr><td style="background:#0B2040;padding:22px 40px;color:rgba(255,255,255,0.6);font-size:11px;line-height:1.55;font-style:italic;">Bright Medical ist ein Coaching-Angebot und ersetzt keine ärztliche Behandlung.<br/>Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal · info@brightmedical.de</td></tr>
</table></td></tr></table></body></html>`
}

// ------------------------------------------------------------------ Render
// EINE Funktion für Preview und Send. Wirft PresetError bei Nutzerfehlern (fehlende
// Pflichtfelder etc.) → der Endpoint macht daraus eine 400 mit klarer Meldung.
export function renderPreset(presetKey: string, fields: Record<string, unknown>): RenderedMail {
  const preset = getPreset(presetKey)
  if (!preset) throw new PresetError(`Unbekanntes Preset: ${presetKey}`)

  const get = (k: string): string => (typeof fields[k] === 'string' ? (fields[k] as string) : '')
  for (const f of preset.fields) {
    if (f.required && !get(f.key).trim()) throw new PresetError(`Pflichtfeld fehlt: ${f.label}`)
  }

  if (presetKey === 'e-html') {
    const subject = get('subject').trim()
    const inner = innerContent(get('html'))
    if (!inner) throw new PresetError('Der HTML-Inhalt ist leer.')
    const html = brandedHtmlEmail({ inner, preheader: get('preheader') })
    return { subject, html, text: htmlToText(inner) }
  }

  throw new PresetError(`Für das Preset „${presetKey}" ist noch kein Render hinterlegt.`)
}
