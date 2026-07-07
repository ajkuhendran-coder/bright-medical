// Best-effort Web-Push an alle Geräte-Subscriptions einer Klientin.
// NUR ein Hinweis — KEIN Inhalt/Gesundheitsdaten (bleibt im verschlüsselten Portal).
// Abgelaufene Subscriptions (HTTP 404/410) werden automatisch gelöscht.
// Schluckt ALLE Fehler: der auslösende Schreibpfad (cc-coach-reply …) scheitert hieran nie.
// Ohne gesetzte VAPID-ENV ist die Funktion ein No-op (E-Mail bleibt der garantierte Kanal).

import webpush from 'web-push'
import { getSupabaseCreds, sbSelect } from './supabase.ts'

let configured: boolean | null = null
function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@brightmedical.de'
  if (!pub || !priv) { configured = false; return false }
  try { webpush.setVapidDetails(subject, pub, priv); configured = true } catch { configured = false }
  return configured
}

export async function sendPushToClient(
  clientEmail: string,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  try {
    if (!ensureConfigured()) return
    const creds = getSupabaseCreds()
    if (!creds) return
    const rows = await sbSelect(creds, 'push_subscriptions', `client_sub=eq.${encodeURIComponent(clientEmail)}&select=endpoint,p256dh,auth,url`)
    if (!rows.length) return

    await Promise.all(rows.map(async (r: any) => {
      const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }
      const body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        tag: payload.tag || 'bright-medical',
        url: r.url || payload.url || '/mein-programm',
      })
      try {
        await webpush.sendNotification(sub as any, body)
      } catch (err: any) {
        const code = err?.statusCode
        if (code === 404 || code === 410) {
          try {
            await fetch(`${creds.url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(r.endpoint)}`, {
              method: 'DELETE',
              headers: { apikey: creds.serviceKey, Authorization: `Bearer ${creds.serviceKey}` },
            })
          } catch { /* egal */ }
        }
      }
    }))
  } catch (err) {
    console.error('[push] send failed', err)
  }
}
