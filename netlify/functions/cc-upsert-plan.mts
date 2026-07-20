// cc-upsert-plan — Command Center veröffentlicht/aktualisiert den Plan EINER Klientin (Portal Plan-Tab).
// Method: POST · Auth: Authorization: Bearer <CC_API_SECRET> (wie cc-coach-reply — CCs Schreibweg zu BM)
// Body: { email, title?, intro?, sections: [{type,title?,body?,items?[],variant?,plate?,badge?}], subjectId? }
// Upsert auf client_sub (EIN aktueller Plan pro Klientin); version++ bei Update.
// Human-in-the-loop: der eigentliche Freigabe-Klick ("Veröffentlichen") passiert IM Cockpit
// nach der Vorschau; diese Function ist der Schreibpfad nach erfolgter Freigabe.
// Returns: { ok, version } / 4xx / 5xx.

import type { Context } from '@netlify/functions'
import { getSupabaseCreds } from './_shared/supabase.ts'
import { notifyClientNewPlan } from './_shared/notify-client.ts'
import { publishPlan } from './_shared/portal-plans.ts'

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Section = { type: string; title?: string; body?: string; items?: string[]; variant?: string; plate?: boolean; badge?: string }
// Baustein-Array säubern + validieren (festes Vokabular, kein Frei-HTML). null = ungültig.
function sanitizeSections(input: unknown): Section[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 60) return null
  const out: Section[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null
    const type = (raw as any).type
    if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) return null
    const sec: Section = { type }
    const { title, body, items, variant, plate, badge } = raw as any
    if (title != null) { if (typeof title !== 'string') return null; sec.title = title.slice(0, 200) }
    if (body != null) { if (typeof body !== 'string') return null; sec.body = body.slice(0, 2000) }
    if (items != null) {
      if (!Array.isArray(items)) return null
      sec.items = items.filter((x) => typeof x === 'string').slice(0, 40).map((x: string) => x.slice(0, 300))
    }
    // optionale Design-Hinweise (abwärtskompatibel): Layout-Variante + Teller-Foto + Trainings-Badge.
    // WICHTIG: 'stepper'/'checklist' müssen mit durch, sonst verliert der gespeicherte Plan Stepper+Teller.
    if (typeof variant === 'string' && ['cards', 'stepper', 'checklist', 'checks', 'plain'].includes(variant)) sec.variant = variant
    if (plate === true) sec.plate = true
    if (typeof badge === 'string' && badge.trim()) sec.badge = badge.trim().slice(0, 80)
    out.push(sec)
  }
  return out
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const expected = Netlify.env.get('CC_API_SECRET')
  if (!expected) return jsonResponse(500, { error: 'Server-Konfigurationsfehler (CC_API_SECRET)' })
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/)
  const presented = m?.[1] || ''
  if (!presented || !safeEqual(presented, expected)) return jsonResponse(401, { error: 'Unauthorized' })

  const creds = getSupabaseCreds()
  if (!creds) return jsonResponse(503, { error: 'Supabase nicht konfiguriert (env)' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { error: 'Invalid JSON' }) }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) return jsonResponse(400, { error: 'Invalid or missing "email"' })
  const sections = sanitizeSections(body?.sections)
  if (!sections) return jsonResponse(400, { error: 'Invalid "sections" (leeres oder ungültiges Baustein-Array)' })

  const title = (typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Ihr Ernährungs- & Trainingsplan').slice(0, 200)
  const intro = typeof body?.intro === 'string' && body.intro.trim() ? body.intro.trim().slice(0, 1000) : null
  const subjectId = typeof body?.subjectId === 'string' && body.subjectId.trim() ? body.subjectId.trim().slice(0, 80) : null

  // Veröffentlichen: upsert portal_plans (aktuell) + Archiv in portal_plan_versions (Historie).
  let nextVersion: number
  try {
    nextVersion = await publishPlan(creds, { email, title, intro, sections, subjectId })
  } catch (err) {
    console.error('[cc-upsert-plan] publish failed', err)
    return jsonResponse(500, { error: 'Plan konnte nicht gespeichert werden.' })
  }

  console.log(`✓ cc-upsert-plan: ${email} (v${nextVersion}, ${sections.length} Bausteine)`)
  // Best-effort: Klientin über den neuen Plan informieren (E-Mail, OHNE Inhalt). Schluckt eigene Fehler.
  await notifyClientNewPlan({ clientEmail: email })
  return jsonResponse(200, { ok: true, version: nextVersion })
}
