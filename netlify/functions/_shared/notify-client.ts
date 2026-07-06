// Best-effort-Benachrichtigung an die KLIENTIN, wenn der Coach ihr im Portal „Mein Programm"
// eine Nachricht schreibt. BEWUSST nur ein Hinweis — KEINE Gesundheitsdaten, kein Inhalt der
// Nachricht (der bleibt im verschlüsselten Portal). Reiner „schauen Sie mal rein"-Anstoß, damit
// die Klientin nicht auf eine Push-Benachrichtigung angewiesen ist (E-Mail kommt auf jedem Gerät an).
//
// Schluckt ALLE Fehler: der eigentliche Coach-Write (cc-coach-reply) darf hieran nie scheitern.

import { Resend } from 'resend'

const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'
const REPLY_TO = 'info@brightmedical.de'

export async function notifyClientNewMessage(opts: { clientEmail: string; coachName?: string }): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const coach = opts.coachName?.trim() || 'Ihr Coach'
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: opts.clientEmail,
      subject: 'Neue Nachricht in Ihrem Bereich „Mein Programm"',
      text:
        `Guten Tag,\n\n` +
        `${coach} hat Ihnen soeben in Ihrem persönlichen Bereich „Mein Programm" geschrieben.\n\n` +
        `Öffnen Sie einfach Ihren Bereich — über den Link aus Ihrer Einladungs-Mail oder das „Mein Programm"-Symbol auf Ihrem Startbildschirm —, um die Nachricht zu lesen und zu antworten.\n\n` +
        `Herzliche Grüße\nBright Medical\n\n` +
        `(Automatische Benachrichtigung. Ihre Nachrichten und Daten bleiben verschlüsselt in Ihrem Bereich — bitte antworten Sie nicht auf diese E-Mail.)`,
    })
  } catch (err) {
    console.error('[notify-client] failed', err)
  }
}
