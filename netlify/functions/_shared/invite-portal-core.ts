// invite-portal-core — reiner Render für die Portal-Einladung (Token signieren + e1i-Template füllen).
// Genutzt vom Cockpit-Weg (`cc-send-preset`, Preset „invite-portal"). Der bestehende Live-Sender
// `invite-portal.mts` (BM-Mail-App) bleibt unberührt — diese Datei spiegelt dessen Render 1:1, damit
// die Cockpit-Einladung byte-gleich zur Mail-App-Einladung ist. Bei Änderungen am e1i-Template beide
// im Blick behalten (gleiches Template-File → visuell identisch; nur die Variablen-Logik hier gespiegelt).
//
// KEIN Versand, KEIN Datei-/ENV-Zugriff hier: Template-String + jwtSecret werden von der Entry-Function
// hereingereicht (readFileSync-Assets gehören in die Entry-Function, nicht ins _shared-Modul).

import { signPortalToken } from './jwt.ts'
import { PresetError } from './mail-presets.ts'

const SITE_BASE = 'https://brightmedical.de'
const DEFAULT_TTL_DAYS = 120
const DEFAULT_PROGRAM = 'Ihr Bright Medical Programm'
const INVITE_SUBJECT = 'Ihr persönlicher Bereich bei Bright Medical'

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export type InvitePortalResult = { subject: string; html: string; text: string; link: string; expHuman: string }

export function renderInvitePortalMail(opts: {
  template: string
  email: string
  fields: Record<string, unknown>
  jwtSecret: string
}): InvitePortalResult {
  const f = opts.fields || {}
  const str = (k: string): string => (typeof f[k] === 'string' ? (f[k] as string) : '')
  const num = (k: string): number | undefined => (Number.isFinite(f[k] as number) ? Math.floor(f[k] as number) : undefined)

  const name = str('name').trim()
  if (!name) throw new PresetError('Pflichtfeld fehlt: Vorname (name)')
  if (name.length > 120) throw new PresetError('„Vorname" ist zu lang.')

  const anrede = str('anrede').trim()
  if (anrede.length > 200) throw new PresetError('„Anrede" ist zu lang.')
  const personalNote = str('personalNote').trim()
  if (personalNote.length > 1500) throw new PresetError('„Persönliche Notiz" ist zu lang (max 1500 Zeichen).')

  const wc = num('weekCurrent') !== undefined ? Math.max(1, num('weekCurrent')!) : 1
  const wt = num('weekTotal') !== undefined ? Math.max(wc, num('weekTotal')!) : 4
  const ttlDays = num('ttlDays') !== undefined ? Math.min(365, Math.max(7, num('ttlDays')!)) : DEFAULT_TTL_DAYS
  const program = str('programLabel').trim() ? str('programLabel').trim().slice(0, 120) : DEFAULT_PROGRAM

  const data: Record<string, unknown> = {
    name: name.slice(0, 120),
    programLabel: program,
    weekCurrent: wc,
    weekTotal: wt,
    ...(str('initials').trim() ? { initials: str('initials').trim().slice(0, 4) } : {}),
    ...(str('focusTitle').trim() ? { focusTitle: str('focusTitle').trim().slice(0, 120) } : {}),
    ...(str('focusText').trim() ? { focusText: str('focusText').trim().slice(0, 400) } : {}),
    ...(str('focusStep').trim() ? { focusStep: str('focusStep').trim().slice(0, 200) } : {}),
    ...(str('nextCallHuman').trim() ? { nextCallHuman: str('nextCallHuman').trim().slice(0, 120) } : {}),
    ...(str('nextCallUrl').trim() ? { nextCallUrl: str('nextCallUrl').trim().slice(0, 400) } : {}),
    ...(str('planUpdated').trim() ? { planUpdated: str('planUpdated').trim().slice(0, 60) } : {}),
    ...(str('subjectId').trim() ? { subjectId: str('subjectId').trim().slice(0, 80) } : {}),
  }

  const token = signPortalToken(opts.email, data, ttlDays, opts.jwtSecret)
  const link = `${SITE_BASE}/mein-programm?t=${encodeURIComponent(token)}`
  const exp = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
  const expHuman = exp.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })

  const safeNote = personalNote ? escapeHtml(personalNote) : ''
  const vars: Record<string, string> = {
    ANREDE: escapeHtml(anrede || 'Guten Tag,'),
    PROGRAMM_LABEL: escapeHtml(program),
    LINK: link,
    GUELTIG_BIS: expHuman,
    'PERSÖNLICHE_NOTIZ_BLOCK': safeNote
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FA;border-radius:12px;border-left:3px solid #00B8D4;margin-bottom:24px;"><tr><td style="padding:18px 22px;font-family:'Inter',Arial,sans-serif;font-size:14px;line-height:1.65;color:#2A3A52;font-style:italic;">${safeNote}</td></tr></table>`
      : '',
  }
  let html = opts.template
  for (const [k, v] of Object.entries(vars)) html = html.replaceAll(`{{${k}}}`, v)

  const text = `${anrede || 'Guten Tag,'}

ab jetzt läuft alles an einem sicheren Ort zusammen, Ihr Tagebuch, Ihr Plan, Ihr nächster Termin und der direkte Draht zu mir. Alles verschlüsselt und in der EU, ganz ohne WhatsApp.

Ihr Programm: ${program}

Zu Ihrem Bereich:
${link}

Der Link ist persönlich für Sie und bis ${expHuman} gültig. Kein Konto, kein Passwort, einfach antippen.

So haben Sie Ihren Bereich immer griffbereit:
Bewahren Sie diese E-Mail auf – der Link oben ist Ihr persönlicher Zugang.
• iPhone (Safari): Teilen-Symbol → „Zum Home-Bildschirm"
• Android (Chrome): Menü ⋮ → „Zum Startbildschirm hinzufügen"
${personalNote ? `\n${personalNote}\n` : ''}
Herzliche Grüße,
Ajanth Kuhendran
Bright Medical
`

  return { subject: INVITE_SUBJECT, html, text, link, expHuman }
}
