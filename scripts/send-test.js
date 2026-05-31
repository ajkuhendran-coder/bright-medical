// One-shot test send via Resend.
//
// Usage:
//   RESEND_API_KEY=re_xxx node scripts/send-test.js <template> <recipient> [subject]
//
// Examples:
//   node scripts/send-test.js e10-teaser kuhendran@me.com
//   node scripts/send-test.js e0a-confirmation kuhendran@me.com
//   node scripts/send-test.js e1b-reminder-erstgespraech kuhendran@me.com
//   node scripts/send-test.js e1b-reminder-erstgespraech kuhendran@me.com \
//     --var ANREDE_KURZ="Frau Müller" --var UHRZEIT=14:00
//
// Reads HTML from ./email-templates/<template>.html.
// Replaces {{KEY}} placeholders from TEMPLATES[<template>].vars.
// CLI flags `--var KEY=VALUE` override individual variables.
// Override the entire `to` and `subject` from CLI as positional args.
//
// Fixed FROM = "Bright Medical <noreply@brightmedical.de>" (matches contact.mts).

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resend } from 'resend'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

// Per-template defaults — subject + variables to substitute into {{KEY}} markers.
// Override individual vars from CLI with `--var KEY=VALUE`.
const TEMPLATES = {
  'e0a-confirmation': {
    subject: 'Ihre Anfrage ist bei uns angekommen',
    vars: {
      firstName: process.env.TEST_FIRST_NAME || 'Melanie',
    },
  },
  'e10-teaser': {
    subject: 'Etwas Neues aus unserer Praxis.',
    vars: {},
  },
  'e1a-welcome': {
    subject: 'Willkommen bei Bright Medical',
    vars: {
      ANREDE_KURZ: 'Frau Becker',
      TERMIN_TAG: '5',
      TERMIN_MONAT_KURZ: 'MAI',
      TERMIN_WOCHENTAG_KURZ: 'DI',
      TERMIN_DAUER: '20 min',
      TERMIN_UHRZEIT: '14:30',
      TERMIN_FORMAT: 'Telefongespräch',
    },
  },
  'e1b-reminder-erstgespraech': {
    subject: 'Erinnerung: Erstgespräch · {{WOCHENTAG_KURZ}} {{DATUM_KURZ}} · {{UHRZEIT}} Uhr',
    vars: {
      ANREDE_KURZ: 'Frau Bechtel',
      WOCHENTAG: 'DONNERSTAG',
      WOCHENTAG_KURZ: 'Do',
      DATUM_KURZ: '30.04.',
      TAG_MONAT: '30. APRIL',
      JAHR: '2026',
      UHRZEIT: '13:15',
      DAUER: '20 Minuten',
      TELEFON_HINWEIS: 'Bitte antworten Sie mir kurz mit der Telefonnummer, unter der ich Sie morgen erreichen kann.',
      'PERSÖNLICHE_NOTIZ': 'Liebe Frau Bechtel, ich freue mich sehr auf unser Gespräch morgen. Bringen Sie ruhig auch alle Fragen mit, die Ihnen zwischendurch gekommen sind — wir nehmen uns die Zeit.',
    },
  },
  'e1c-reminder-folgetermin': {
    subject: 'Erinnerung: Ihr Coaching-Termin morgen',
    vars: {
      TERMIN_TYP: 'Coaching-Call',
      HEADLINE: 'Ihr nächster Coaching-Call.',
      WOCHENTAG: 'DONNERSTAG',
      TAG_MONAT: '7. MAI',
      JAHR: '2026',
      UHRZEIT: '15:00',
      DAUER: '45 min',
      ORT_LABEL: 'Format',
      ORT_PRIMARY: 'Telefongespräch',
      ORT_HINWEIS: 'Ich rufe Sie an unter der hinterlegten Nummer.',
      VORBEREITUNG_1: 'Halten Sie Ihr Tagebuch / Tracking-Sheet bereit.',
      VORBEREITUNG_2: 'Notieren Sie 2–3 Themen, die Sie besprechen möchten.',
      VORBEREITUNG_3: 'Aktuelle Werte (CGM, Schlaf, Gewicht) — falls relevant.',
    },
  },
  'e11-newsletter': {
    subject: 'Der Rundgang — Bright Medical',
    vars: {
      PREHEADER: 'Was uns diesen Monat beschäftigt hat.',
      AUSGABE_NUMMER: '01',
      AUSGABE_MONAT: 'MAI 2026',
      MASTHEAD_TAGLINE: 'Was uns diesen Monat beschäftigt hat — Werte, Geschichten, Hintergründe.',
      INDEX_01: 'Schlaf als Hebel',
      INDEX_02: 'Programm-Update',
      INDEX_03: 'Ihre Frage: Kreatin?',
      INDEX_04: 'Ein persönlicher Blick',
      LESEZEIT: '6 min',
      FEATURE_HEADLINE: 'Warum Schlaf der unterschätzte Hebel ist.',
      FEATURE_TEASER: 'Wir messen Blut, wir messen Hormone, wir tracken Schritte. Beim Schlaf hingegen vertrauen viele auf Bauchgefühl. Dabei ist er der größte Einzelfaktor für fast alles, was wir messen.',
      FEATURE_LINK: 'https://brightmedical.de/blog/schlaf',
      PROGRAMM_HEADLINE: 'Gewichtsoptimierung — Plätze für Sommer 2026.',
      PROGRAMM_META: '12 Wochen · ärztlich begleitet · CORE 2.990€',
      PROGRAMM_LINK: 'https://brightmedical.de#programme',
      TIPP_FRAGE: 'Bringt Kreatin auch über 40 noch etwas?',
      TIPP_ANTWORT: 'Kurz: ja — besonders dann. Kognitive Effekte, Muskelerhalt, Schlaf. Wichtig sind Form und Dosis.',
      TIPP_LINK: 'https://brightmedical.de/blog/kreatin',
      STAT_1_ZAHL: '12',
      STAT_1_LABEL: 'Erstgespräche',
      STAT_2_ZAHL: '4',
      STAT_2_LABEL: 'aktive Klient:innen',
      STAT_3_ZAHL: '1',
      STAT_3_LABEL: 'neuer Programmschwerpunkt',
      PERSOENLICHE_NOTIZ: 'Diese Ausgabe ist die erste — entstanden zwischen Praxis-Sprechstunde und neuen Klienten-Gesprächen. Schreiben Sie mir gerne zurück, wenn Sie ein Thema interessiert.',
      ABMELDE_LINK: 'https://brightmedical.de/abmelden',
    },
  },
  'e3a-zahlungslink': {
    subject: 'Ihr Zahlungslink — {{PROGRAMM_NAME}}',
    vars: {
      ANREDE: 'Liebe Frau Müller',
      PROGRAMM_NAME: 'Bright Medical Vollprogramm — 12 Wochen',
      PROGRAMM_KURZBESCHREIBUNG: '12 Wochen ärztlich begleitetes Coaching · 7 Calls · 6 CGM-Sensoren · individueller Plan',
      PROGRAMM_PREIS: '2.990 €',
      PROGRAMM_ZAHLUNGSMODUS: 'Einmalzahlung',
      ZAHLUNGSLINK: 'https://buy.stripe.com/fZu7sL93vdJ2gmZ8ejcQU01',
      'PERSÖNLICHE_NOTIZ': '',
      'PERSÖNLICHE_NOTIZ_BLOCK': '',
    },
  },
  'e2a-program-launch': {
    subject: 'Neu: Unser Longevity-Programm öffnet im Mai',
    vars: {
      PREHEADER: 'Zwölf Wochen. Strukturiert. Ärztlich begleitet.',
      LAUNCH_MONAT_JAHR: 'MAI 2026',
      PROGRAMM_NAME: 'Longevity 2026',
      PROGRAMM_HEADLINE_LINE_1: 'Longevity.',
      PROGRAMM_HEADLINE_LINE_2: 'Nicht länger leben.',
      PROGRAMM_HEADLINE_LINE_3: 'Besser altern.',
      PROGRAMM_BESCHREIBUNG: 'Zwölf Wochen. Vollständige Diagnostik. Ärztlich begleitet. Ab dem 15. Mai öffnen wir limitierte Plätze für unser neues Longevity-Programm.',
      CTA_LINK: 'https://brightmedical.de#programme',
      CTA_LABEL: 'Erstgespräch vereinbaren',
      CTA_HINWEIS: 'Anmeldung bis 10. Mai · Start 15. Mai',
      STAT_1_ZAHL: '12',
      STAT_1_LABEL: 'Wochen Begleitung',
      STAT_2_ZAHL: '60+',
      STAT_2_LABEL: 'Biomarker',
      STAT_3_ZAHL: '8',
      STAT_3_LABEL: 'Plätze verfügbar',
      ENTHALTEN_HEADLINE: 'Medizin, die zusammendenkt.',
      FEATURE_1_TITEL: 'Ausführliche Diagnostik',
      FEATURE_1_TEXT: 'Blut, Hormone, Mikrobiom, Stoffwechsel — strukturiert ausgewertet, in einer Praxis.',
      FEATURE_2_TITEL: 'Ihr persönlicher Plan',
      FEATURE_2_TEXT: 'Ernährung, Bewegung, Schlaf, Supplemente — auf Ihre Werte abgestimmt. Kein Schema F.',
      FEATURE_3_TITEL: 'Ärztliche Begleitung',
      FEATURE_3_TEXT: 'Alle zwei Wochen ein Call. Dazwischen WhatsApp-Support. Sie sind nie allein.',
      TESTIMONIAL_TEXT: 'Zum ersten Mal seit Jahren fühle ich mich nicht wie eine Checkliste. Jemand hört zu — und sieht das ganze Bild.',
      TESTIMONIAL_NAME: 'M., 47',
      TESTIMONIAL_META: 'Teilnehmer · Bright Medical',
    },
  },
}

// --- Parse args ---
const argv = process.argv.slice(2)
const positional = []
const cliVars = {}

for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--var' && argv[i + 1]) {
    const eq = argv[i + 1].indexOf('=')
    if (eq > 0) {
      const k = argv[i + 1].slice(0, eq)
      const v = argv[i + 1].slice(eq + 1)
      cliVars[k] = v
    }
    i++
  } else {
    positional.push(a)
  }
}

const [template, recipient, subjectArg] = positional

if (!template || !recipient) {
  console.error('Usage: node scripts/send-test.js <template> <recipient> [subject] [--var KEY=VALUE ...]')
  console.error('Templates: ' + Object.keys(TEMPLATES).join(', '))
  process.exit(1)
}

if (!TEMPLATES[template]) {
  console.error(`Unknown template "${template}".`)
  console.error('Templates: ' + Object.keys(TEMPLATES).join(', '))
  process.exit(1)
}

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('RESEND_API_KEY not set. Try:')
  console.error('  export RESEND_API_KEY=$(netlify env:get RESEND_API_KEY)')
  console.error('Or grab it from https://resend.com/api-keys')
  process.exit(1)
}

const cfg = TEMPLATES[template]
const vars = { ...cfg.vars, ...cliVars }

// Auto-load inline-base64 logos (so the mail renders even when image-loading is blocked).
// Helper file format: <data-url>\n---SEPARATOR---\n<data-url>\n
try {
  const logosFile = join(projectRoot, 'email-templates', '_assets', 'logos-base64.txt')
  const logosRaw = await readFile(logosFile, 'utf8')
  const [light, dark] = logosRaw.split('---SEPARATOR---').map((s) => s.trim())
  if (light && !vars.LOGO_LIGHT) vars.LOGO_LIGHT = light
  if (dark && !vars.LOGO_DARK) vars.LOGO_DARK = dark
} catch {
  // No helper file — fall back to whatever {{LOGO_*}} placeholders the template defines.
}

const htmlPath = join(projectRoot, 'email-templates', `${template}.html`)

let html
try {
  html = await readFile(htmlPath, 'utf8')
} catch (err) {
  console.error(`Could not read ${htmlPath}`)
  console.error(err.message)
  process.exit(1)
}

// Auto-render PERSÖNLICHE_NOTIZ_BLOCK from PERSÖNLICHE_NOTIZ when only the latter is given
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
const note = vars['PERSÖNLICHE_NOTIZ']
if (note && !vars['PERSÖNLICHE_NOTIZ_BLOCK']) {
  const safe = escapeHtml(note).replace(/\r?\n/g, '<br/>')
  vars['PERSÖNLICHE_NOTIZ_BLOCK'] = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin:0 0 24px;border-collapse:separate;"><tr><td style="padding:18px 22px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:8px;">Persönlich</div><div style="font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safe}</div></td></tr></table>`
} else if (!note && !vars['PERSÖNLICHE_NOTIZ_BLOCK']) {
  vars['PERSÖNLICHE_NOTIZ_BLOCK'] = ''
}

for (const [k, v] of Object.entries(vars)) {
  html = html.replaceAll(`{{${k}}}`, String(v))
}

// Substitute {{...}} placeholders inside the subject too — same vars map.
let subject = subjectArg || cfg.subject || `Test: ${template}`
for (const [k, v] of Object.entries(vars)) {
  subject = subject.replaceAll(`{{${k}}}`, String(v))
}

// Warn about any leftover {{...}} placeholders that did not get filled.
const leftovers = [...html.matchAll(/\{\{([A-Z_ÄÖÜa-zäöü0-9]+)\}\}/g)].map((m) => m[1])
if (leftovers.length > 0) {
  console.warn(`! Unsubstituted placeholders: ${[...new Set(leftovers)].join(', ')}`)
}

const resend = new Resend(apiKey)

console.log(`→ Sending "${subject}"`)
console.log(`  from: ${FROM_EMAIL}`)
console.log(`  to:   ${recipient}`)
console.log(`  html: ${htmlPath} (${html.length} chars)`)
if (Object.keys(cliVars).length) {
  console.log(`  cli vars: ${Object.entries(cliVars).map(([k, v]) => `${k}=${v}`).join(', ')}`)
}

const { data, error } = await resend.emails.send({
  from: FROM_EMAIL,
  replyTo: REPLY_TO,
  to: recipient,
  subject,
  html,
})

if (error) {
  console.error('✗ Resend error:', error)
  process.exit(1)
}

console.log(`✓ Sent. Resend message id: ${data.id}`)
