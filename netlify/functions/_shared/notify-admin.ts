// Best-effort-Benachrichtigung an info@brightmedical.de bei neuer Portal-Aktivität
// (Nachricht oder Tagebuch-Eintrag der Klientin). BEWUSST unabhängig vom Command Center:
// garantiert, dass Dr. K mitbekommt, wenn eine Klientin schreibt — auch wenn der CC-Event
// verloren geht oder das CC-Dashboard (noch) nicht läuft.
//
// Schluckt ALLE Fehler: der eigentliche Klient-Write darf hieran niemals scheitern.

import { Resend } from 'resend'

const ADMIN_EMAIL = 'info@brightmedical.de'
const FROM_EMAIL = 'Bright Medical <noreply@brightmedical.de>'

export async function notifyAdminPortalActivity(opts: {
  kind: 'Nachricht' | 'Tagebuch-Eintrag'
  clientSub: string
  clientName?: string
  preview?: string
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return
    const who = opts.clientName ? `${opts.clientName} (${opts.clientSub})` : opts.clientSub
    const previewBlock = opts.preview ? `\n\n„${opts.preview}"` : ''
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Portal: neue ${opts.kind} von ${opts.clientName || opts.clientSub}`,
      text:
        `Im Klient-Portal „Mein Programm" ist eine neue ${opts.kind} eingegangen.\n\n` +
        `Von: ${who}${previewBlock}\n\n` +
        `Zum Antworten das Command Center öffnen. (Automatische Benachrichtigung — bitte nicht auf diese Mail antworten.)`,
    })
  } catch (err) {
    console.error('[notify-admin] failed', err)
  }
}
