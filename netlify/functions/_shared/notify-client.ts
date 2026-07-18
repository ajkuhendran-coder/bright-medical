// Best-effort-Benachrichtigungen an die KLIENTIN (Portal „Mein Programm").
// BEWUSST nur ein Hinweis — KEINE Gesundheitsdaten, kein Nachrichten-/Plan-Inhalt
// (der bleibt im verschlüsselten Portal). Reiner „schauen Sie mal rein"-Anstoß, damit
// die Klientin nicht auf Push angewiesen ist (E-Mail kommt auf jedem Gerät an).
//
// Schluckt ALLE Fehler: der eigentliche Schreibpfad (cc-coach-reply / *-plan) darf hieran
// nie scheitern. Markenkonformes HTML (Logo, Fraunces/Inter, Navy/Teal) + Text-Fallback.

import { Resend } from 'resend'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Markenkonforme Hüll-HTML für die Hinweis-Mails (gleicher Stil wie invite/vereinbarung).
export function brandedNotificationEmail(opts: { eyebrow: string; title: string; paragraphs: string[]; noteHtml: string }): string {
  const paras = opts.paragraphs
    .map((p) => `<div style="font-size:15px;line-height:1.65;color:#2A3A52;margin-bottom:18px;">${p}</div>`)
    .join('')
  return `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#F6F8FA;font-family:'Inter',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8FA;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;">
<tr><td style="padding:14px 40px;background:#F6F8FA;border-bottom:1px solid #E3E8EE;"><img src="https://brightmedical.de/images/logo-light.png" alt="Bright Medical" width="155" style="height:36px;width:auto;display:block;" /></td></tr>
<tr><td style="padding:40px 40px 30px;">
<div style="font-size:11px;font-weight:600;letter-spacing:2.2px;color:#00B8D4;text-transform:uppercase;margin-bottom:14px;">${opts.eyebrow}</div>
<div style="font-family:'Fraunces',Georgia,serif;font-size:27px;line-height:1.18;color:#0A2540;margin-bottom:22px;font-weight:500;">${opts.title}</div>
${paras}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,184,212,0.06);border-left:3px solid #00B8D4;margin:6px 0 4px;"><tr><td style="padding:14px 18px;font-size:13px;line-height:1.6;color:#2A3A52;">${opts.noteHtml}</td></tr></table>
</td></tr>
<tr><td style="background:#0B2040;padding:22px 40px;color:rgba(255,255,255,0.6);font-size:11px;line-height:1.55;font-style:italic;">Bright Medical ist ein Coaching-Angebot und ersetzt keine ärztliche Behandlung.<br/>Bright Medical · Am Alten Güterbahnhof 24 · 76646 Bruchsal · info@brightmedical.de</td></tr>
</table></td></tr></table></body></html>`
}

export async function notifyClientNewMessage(opts: { clientEmail: string; coachName?: string }): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const coach = escapeHtml(opts.coachName?.trim() || 'Ihr Coach')
    const html = brandedNotificationEmail({
      eyebrow: 'Mein Programm',
      title: 'Sie haben eine neue Nachricht',
      paragraphs: [
        'Guten Tag,',
        `${coach} hat Ihnen soeben in Ihrem persönlichen Bereich „Mein Programm" geschrieben.`,
        'Öffnen Sie einfach Ihren Bereich — über den Link aus Ihrer Einladungs-Mail oder das „Mein Programm"-Symbol auf Ihrem Startbildschirm —, um die Nachricht zu lesen und zu antworten.',
      ],
      noteHtml: 'Ihre Nachrichten und Daten bleiben verschlüsselt in Ihrem Bereich. <strong>Bitte antworten Sie nicht auf diese E-Mail.</strong>',
    })
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: opts.clientEmail,
      subject: 'Neue Nachricht in Ihrem Bereich „Mein Programm"',
      html,
      text:
        `Guten Tag,\n\n` +
        `${opts.coachName?.trim() || 'Ihr Coach'} hat Ihnen soeben in Ihrem persönlichen Bereich „Mein Programm" geschrieben.\n\n` +
        `Öffnen Sie einfach Ihren Bereich — über den Link aus Ihrer Einladungs-Mail oder das „Mein Programm"-Symbol auf Ihrem Startbildschirm —, um die Nachricht zu lesen und zu antworten.\n\n` +
        `Herzliche Grüße\nBright Medical\n\n` +
        `(Automatische Benachrichtigung. Ihre Daten bleiben verschlüsselt in Ihrem Bereich — bitte antworten Sie nicht auf diese E-Mail.)`,
    })
  } catch (err) {
    console.error('[notify-client] message notification failed', err)
  }
}

export async function notifyClientNewPlan(opts: { clientEmail: string }): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const html = brandedNotificationEmail({
      eyebrow: 'Mein Programm',
      title: 'Ihr Plan ist da',
      paragraphs: [
        'Guten Tag,',
        'in Ihrem persönlichen Bereich „Mein Programm" liegt jetzt Ihr Ernährungs- & Trainingsplan für Sie bereit.',
        'Öffnen Sie einfach Ihren Bereich — über den Link aus Ihrer Einladungs-Mail oder das „Mein Programm"-Symbol auf Ihrem Startbildschirm —, um Ihren Plan anzusehen. Dort können Sie ihn jederzeit auch als PDF speichern.',
      ],
      noteHtml: 'Ihre Daten bleiben verschlüsselt in Ihrem Bereich. <strong>Bitte antworten Sie nicht auf diese E-Mail.</strong>',
    })
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: opts.clientEmail,
      subject: 'Ihr persönlicher Plan liegt in „Mein Programm" für Sie bereit',
      html,
      text:
        `Guten Tag,\n\n` +
        `in Ihrem persönlichen Bereich „Mein Programm" liegt jetzt Ihr Ernährungs- & Trainingsplan für Sie bereit.\n\n` +
        `Öffnen Sie einfach Ihren Bereich — über den Link aus Ihrer Einladungs-Mail oder das „Mein Programm"-Symbol auf Ihrem Startbildschirm —, um Ihren Plan anzusehen. Dort können Sie ihn jederzeit auch als PDF speichern.\n\n` +
        `Herzliche Grüße\nBright Medical\n\n` +
        `(Automatische Benachrichtigung. Ihre Daten bleiben verschlüsselt in Ihrem Bereich — bitte antworten Sie nicht auf diese E-Mail.)`,
    })
  } catch (err) {
    console.error('[notify-client] plan notification failed', err)
  }
}

// Kopie der erteilten Art.-9-Einwilligung an die Klientin (Rechenschaftspflicht, Art. 7 DSGVO).
// Enthält KEINE Gesundheitsdaten — nur die Kategorien, in die eingewilligt wurde, Zeitpunkt + Textstand.
export async function notifyClientConsent(opts: {
  clientEmail: string
  name?: string
  categories: string[]
  grantedAtHuman: string
  version: string
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const hallo = opts.name?.trim() ? `Guten Tag ${escapeHtml(opts.name.trim())},` : 'Guten Tag,'
    const liste = opts.categories.length
      ? `<ul style="margin:6px 0 0;padding-left:20px;">${opts.categories.map((c) => `<li style="margin-bottom:8px;line-height:1.5;">${escapeHtml(c)}</li>`).join('')}</ul>`
      : ''
    const html = brandedNotificationEmail({
      eyebrow: 'Ihre Einwilligung',
      title: 'Ihre Einwilligung ist bestätigt',
      paragraphs: [
        hallo,
        `Sie haben am ${escapeHtml(opts.grantedAtHuman)} in Ihrem persönlichen Bereich „Mein Programm" in die Verarbeitung Ihrer Gesundheitsdaten eingewilligt (Art. 9 DSGVO). Zur Sicherheit erhalten Sie hier eine Kopie für Ihre Unterlagen.`,
        `<strong style="color:#0A2540;">Sie haben eingewilligt in:</strong>${liste}`,
        `Ihre Einwilligung ist freiwillig und jederzeit mit Wirkung für die Zukunft widerrufbar — per E-Mail an <a href="mailto:info@brightmedical.de" style="color:#0891b2;">info@brightmedical.de</a>.`,
      ],
      noteHtml: `Textstand der Einwilligung: ${escapeHtml(opts.version)}. Bitte bewahren Sie diese E-Mail für Ihre Unterlagen auf. <strong>Bitte antworten Sie nicht auf diese E-Mail.</strong>`,
    })
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: opts.clientEmail,
      subject: 'Ihre Einwilligung bei Bright Medical — Ihre Kopie',
      html,
      text:
        `${opts.name?.trim() ? `Guten Tag ${opts.name.trim()},` : 'Guten Tag,'}\n\n` +
        `Sie haben am ${opts.grantedAtHuman} in Ihrem Bereich „Mein Programm" in die Verarbeitung Ihrer Gesundheitsdaten eingewilligt (Art. 9 DSGVO). Hier Ihre Kopie für Ihre Unterlagen.\n\n` +
        `Sie haben eingewilligt in:\n${opts.categories.map((c) => `• ${c}`).join('\n')}\n\n` +
        `Ihre Einwilligung ist freiwillig und jederzeit mit Wirkung für die Zukunft widerrufbar — per E-Mail an info@brightmedical.de.\n\n` +
        `Textstand: ${opts.version}\n\n` +
        `Herzliche Grüße\nBright Medical\n\n(Automatische Kopie. Bitte antworten Sie nicht auf diese E-Mail.)`,
    })
  } catch (err) {
    console.error('[notify-client] consent copy failed', err)
  }
}
