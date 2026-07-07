// set-portal-plan — veröffentlicht/aktualisiert den Plan einer Klientin (Portal Plan-Tab).
// Auth:    Authorization: Bearer <BRIGHT_SEND_SECRET>  (gleiches Secret wie invite-portal)
// Method:  POST
// Body:    { email, title?, intro?, sections: [{type,title?,body?,items?[]}], subjectId? }
// Upsert auf client_sub (EIN aktueller Plan pro Klientin); version++ bei Update.
// Human-in-the-loop: der Aufruf IST die ärztliche Freigabe (Dr. K löst ihn aus).
// Returns: { ok, version } / 4xx / 5xx.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds, sbSelect } from './_shared/supabase.ts'
import { notifyClientNewPlan } from './_shared/notify-client.ts'

const ALLOWED_TYPES = new Set(['heading', 'text', 'list', 'meal', 'training', 'note'])

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

type Section = { type: string; title?: string; body?: string; items?: string[]; variant?: string; plate?: boolean }
function sanitizeSections(input: unknown): Section[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 60) return null
  const out: Section[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null
    const type = (raw as any).type
    if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) return null
    const sec: Section = { type }
    const { title, body, items, variant, plate } = raw as any
    if (title != null) { if (typeof title !== 'string') return null; sec.title = title.slice(0, 200) }
    if (body != null) { if (typeof body !== 'string') return null; sec.body = body.slice(0, 2000) }
    if (items != null) {
      if (!Array.isArray(items)) return null
      sec.items = items.filter((x) => typeof x === 'string').slice(0, 40).map((x: string) => x.slice(0, 300))
    }
    // optionale Design-Hinweise (abwärtskompatibel): Karten/Häkchen-Variante + Teller-Foto
    if (typeof variant === 'string' && ['cards', 'checks', 'plain'].includes(variant)) sec.variant = variant
    if (plate === true) sec.plate = true
    out.push(sec)
  }
  return out
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('BRIGHT_SEND_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (auth)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Portal-Speicher ist noch nicht konfiguriert.' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return jsonResponse(400, { error: 'Invalid or missing "email"' })
  }
  const sections = sanitizeSections(body?.sections)
  if (!sections) return jsonResponse(400, { error: 'Invalid "sections" (leeres oder ungültiges Baustein-Array)' })

  const title = (typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Ihr Ernährungs- & Trainingsplan').slice(0, 200)
  const intro = typeof body?.intro === 'string' && body.intro.trim() ? body.intro.trim().slice(0, 1000) : null
  const subjectId = typeof body?.subjectId === 'string' && body.subjectId.trim() ? body.subjectId.trim().slice(0, 80) : null

  // Bestehende Version lesen (für version++)
  let nextVersion = 1
  try {
    const existing = await sbSelect(creds, 'portal_plans', `client_sub=eq.${encodeURIComponent(email)}&select=version&limit=1`)
    if (existing[0]?.version) nextVersion = Number(existing[0].version) + 1
  } catch (err) {
    console.error('[set-portal-plan] version lookup failed', err)
    return jsonResponse(500, { error: 'Plan konnte nicht gelesen werden.' })
  }

  // Upsert auf client_sub (merge-duplicates); updated_at explizit (Default greift nur bei INSERT)
  const row = {
    client_sub: email,
    subject_id: subjectId,
    title,
    intro,
    sections,
    version: nextVersion,
    updated_at: new Date().toISOString(),
  }
  try {
    const res = await fetch(`${creds.url}/rest/v1/portal_plans?on_conflict=client_sub`, {
      method: 'POST',
      headers: {
        apikey: creds.serviceKey,
        Authorization: `Bearer ${creds.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    })
    if (!res.ok) {
      console.error('[set-portal-plan] upsert failed', res.status, await res.text())
      return jsonResponse(500, { error: 'Plan konnte nicht gespeichert werden.' })
    }
  } catch (err) {
    console.error('[set-portal-plan] upsert error', err)
    return jsonResponse(500, { error: 'Plan konnte nicht gespeichert werden.' })
  }

  console.log(`✓ Portal-Plan gesetzt für ${email} (v${nextVersion}, ${sections.length} Bausteine)`)
  // Best-effort: Klientin über den neuen Plan informieren (E-Mail, OHNE Inhalt). Schluckt eigene Fehler.
  await notifyClientNewPlan({ clientEmail: email })
  return jsonResponse(200, { ok: true, version: nextVersion })
}
