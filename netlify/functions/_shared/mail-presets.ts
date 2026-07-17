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
  template?: string // email-templates/<name>.html → über template-mail-core rendern (byte-gleich zur Mail-App)
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
  {
    // Freie Text-Mail: eigener Text im Bright-Medical-Design (Logo, Signatur, Fußzeile fest).
    // Rendert über die „e-frei"-Vorlage (template-mail-core) — byte-gleich zur Mail-App.
    key: 'e-frei',
    label: 'Freie Text-Mail',
    target: 'Klientin',
    template: 'e-frei',
    fields: [
      { key: 'subject', label: 'Betreff', type: 'text', default: 'Eine Nachricht von Bright Medical', hint: 'Die Betreffzeile der E-Mail.', required: true },
      { key: 'ANREDE', label: 'Anrede / Begrüßung', type: 'text', default: 'Guten Tag,' },
      { key: 'BODY', label: 'Nachrichtentext', type: 'textarea', default: '', required: true, hint: 'Frei schreiben. Leerzeile = neuer Absatz. Wird automatisch ins Bright-Medical-Design eingebettet (Logo, Signatur, Fußzeile kommen von selbst).' },
      { key: 'CTA_LABEL', label: 'Button-Text (optional)', type: 'text', default: '', half: true, hint: 'z. B. „Zum Vertrag". Leer = kein Button.' },
      { key: 'CTA_LINK', label: 'Button-Link (optional)', type: 'text', default: '', half: true },
      { key: 'HINWEIS', label: 'Hinweis-Kasten (optional, hellblau hervorgehoben)', type: 'textarea', default: '', hint: 'Optionaler hervorgehobener Hinweis-Block. Leer = kein Kasten.' },
      { key: 'PREHEADER', label: 'Vorschautext im Postfach (optional)', type: 'text', default: 'Eine persönliche Nachricht von Bright Medical.' },
    ],
  },
  {
    // Programm-Welcome Deep-Dive (Tag 0 + integrierter Woche-1-Anker). Rendert über „e-frei".
    key: 'e-prog-welcome-deepdive',
    label: 'Programm-Welcome (Deep-Dive)',
    target: 'Klientin',
    template: 'e-frei',
    fields: [
      { key: 'subject', label: 'Betreff', type: 'text', default: 'Willkommen bei Bright Medical: Ihr Deep-Dive startet', required: true },
      { key: 'ANREDE', label: 'Anrede / Begrüßung', type: 'text', default: 'Liebe Frau …,' },
      { key: 'BODY', label: 'Welcome-Text (Standard, pro Klientin anpassbar)', type: 'textarea', default: 'schön, dass Sie sich für den Metabolic Deep-Dive entschieden haben. Ab heute schauen wir in den nächsten vier Wochen gemeinsam genau hin: wie Ihr Körper reagiert, was Ihnen guttut und was Sie konkret im Alltag verändern können.\n\nIhre vier Wochen auf einen Blick\n• Woche 1: Kickoff-Gespräch und Start Ihrer Glukose-Beobachtung\n• Woche 2: Wir besprechen Ihre ersten Beobachtungen, Sie erhalten Ihren Basis-Ernährungsplan\n• Woche 3: Umsetzung im Alltag, ich bleibe per WhatsApp an Ihrer Seite\n• Woche 4: Abschlussgespräch, Rückblick und Ihr persönlicher Eigenplan für danach\n\nSo läuft unser Austausch\n• Ihr Foto-Ernährungstagebuch und alles rund um Ihre Gesundheitsdaten führen Sie in Ihrem persönlichen Bereich „Mein Programm" (den Zugangslink haben Sie gestern erhalten). Dort ist alles verschlüsselt in der EU gespeichert.\n• Für Organisatorisches und einen kurzen Gruß zwischendurch bin ich per WhatsApp da.\n• Unsere Gespräche laufen als Video-Call über Google Meet.\n\nDiese Woche (Woche 1): Ankommen und beobachten\nDiese Woche geht es nur ums Hinschauen: Leben Sie normal weiter, der Sensor misst mit. Den genauen Termin für unser Kickoff-Gespräch stimmen wir diese Woche kurz per WhatsApp ab.\n\nIhr erster kleiner Schritt\nLegen Sie Ihren Sensor an (die Anleitung liegt bei) und essen Sie einfach Ihren ganz normalen Alltag. Mehr braucht es diese Woche nicht.\n\nBei Fragen erreichen Sie mich jederzeit per Antwort auf diese Mail oder über WhatsApp.', required: true, hint: 'Tag-0-Welcome für den Deep-Dive, mit integriertem Woche-1-Anker. Logo/Signatur/Fußzeile kommen vom Design. Portal-Link kam separat mit der Portal-Einladung.' },
      { key: 'HINWEIS', label: 'Sicherheits-Hinweis (hellblau hervorgehoben)', type: 'textarea', default: 'Bright Medical ist ein Coaching-Angebot und ersetzt keine ärztliche Behandlung; ärztliche Leistungen laufen getrennt über die Praxis. Falls Sie Medikamente einnehmen, die den Blutzucker beeinflussen, besprechen Sie größere Ernährungsumstellungen bitte vorab mit Ihrem behandelnden Arzt.', hint: 'Für Klientinnen mit blutzuckerwirksamen Medikamenten (z. B. Mounjaro) wichtig. Nicht ohne Rücksprache entfernen.' },
      { key: 'PREHEADER', label: 'Vorschautext im Postfach', type: 'text', default: 'Vier fokussierte Wochen. Hier sind Ihre nächsten Schritte.' },
    ],
  },
  {
    // Wochen-Anker (Montag, Woche 2–4). Gerüst — „Wo Sie stehen" + Fokus IMMER individuell (FernUSG).
    key: 'e-wochen-anker',
    label: 'Wochen-Anker (Montag, Woche 2–4)',
    target: 'Klientin',
    template: 'e-frei',
    fields: [
      { key: 'subject', label: 'Betreff (pro Woche anpassen)', type: 'text', default: 'Ihre Woche bei Bright Medical', required: true, hint: 'z. B. „Woche 2: Erste Erkenntnisse".' },
      { key: 'ANREDE', label: 'Anrede / Begrüßung', type: 'text', default: 'Guten Tag Frau …,' },
      { key: 'BODY', label: 'Anker-Text (Gerüst — [Klammern] pro Woche füllen)', type: 'textarea', default: 'Woche [N] von 4\n\n[Wo Sie stehen – ein individueller Satz, z. B. „Ihre Morgenwerte sind diese Woche schon ruhiger, schön zu sehen."]\n\nIhr Fokus diese Woche\n[Fokus-Text, ein bis zwei Sätze, individuell auf Ihre Beobachtungen bezogen]\n\nWas diese Woche ansteht\n• [z. B. unser Video-Gespräch]\n• [z. B. neuen Sensor anlegen]\n\nIhr kleiner Schritt diese Woche\n[Ein konkreter kleiner Schritt]\n\nWie immer: Fragen jederzeit per WhatsApp oder Antwort auf diese Mail.', required: true, hint: 'FernUSG: „Wo Sie stehen" + Fokus IMMER individuell an echte Beobachtungen anpassen — kein fixer Lehrplan.' },
      { key: 'PREHEADER', label: 'Vorschautext im Postfach', type: 'text', default: 'Ihr Wochen-Fokus und was ansteht.' },
    ],
  },
  {
    // Termin-Erinnerung Folgetermin (Coaching-Call). Rendert über die eigene Vorlage
    // e1c-reminder-folgetermin.html (direkte Feld-Substitution, kein Freitext-Autofill).
    key: 'e1c-reminder-folgetermin',
    label: 'Termin-Erinnerung (Folgetermin)',
    target: 'Klientin',
    template: 'e1c-reminder-folgetermin',
    fields: [
      { key: 'subject', label: 'Betreff', type: 'text', default: 'Erinnerung: Ihr Coaching-Termin morgen', required: true },
      { key: 'TERMIN_TYP', label: 'Termin-Typ', type: 'text', default: 'Coaching-Call' },
      { key: 'HEADLINE', label: 'Headline', type: 'text', default: 'Ihr nächster Coaching-Call.' },
      { key: 'WOCHENTAG', label: 'Wochentag (z. B. DONNERSTAG)', type: 'text', default: '', required: true },
      { key: 'TAG_MONAT', label: 'Tag · Monat (z. B. 7. MAI)', type: 'text', default: '', required: true },
      { key: 'JAHR', label: 'Jahr', type: 'text', default: '2026', half: true, required: true },
      { key: 'UHRZEIT', label: 'Uhrzeit (z. B. 15:00)', type: 'text', default: '', half: true, required: true },
      { key: 'DAUER', label: 'Dauer', type: 'text', default: '45 min' },
      { key: 'ORT_LABEL', label: 'Ort-Label (Format/Ort)', type: 'text', default: 'Format' },
      { key: 'ORT_PRIMARY', label: 'Ort/Format primär', type: 'text', default: 'Telefongespräch' },
      { key: 'ORT_HINWEIS', label: 'Ort-Hinweis', type: 'textarea', default: 'Ich rufe Sie an unter der hinterlegten Nummer.' },
      { key: 'VORBEREITUNG_1', label: 'Vorbereitung 1', type: 'text', default: 'Halten Sie Ihr Tagebuch bereit.' },
      { key: 'VORBEREITUNG_2', label: 'Vorbereitung 2', type: 'text', default: 'Notieren Sie 2–3 Themen, die Sie besprechen möchten.' },
      { key: 'VORBEREITUNG_3', label: 'Vorbereitung 3', type: 'text', default: 'Aktuelle Werte (CGM, Schlaf, Gewicht), falls relevant.' },
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
// Exportiert, damit template-mail-core denselben Text-Teil erzeugt.
export function htmlToText(html: string): string {
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
