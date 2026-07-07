// Gemeinsamer Publish-Weg für Portal-Pläne (genutzt von cc-upsert-plan + set-portal-plan).
// - portal_plans: EIN aktueller Plan pro Klientin (was das Portal liest), version++ bei Update.
// - portal_plan_versions: append-only Historie ALLER veröffentlichten Versionen (Cockpit/Akte).
// Der Archiv-Insert ist best-effort: schlägt er fehl, wird der Publish NICHT verhindert
// (das Portal muss den neuen Plan zeigen — die Historie ist Doku, kein Blocker).

import { sbSelect, type SupabaseCreds } from './supabase.ts'

export type PublishPlanInput = {
  email: string
  title: string
  intro: string | null
  sections: unknown[]
  subjectId: string | null
}

export async function publishPlan(creds: SupabaseCreds, input: PublishPlanInput): Promise<number> {
  // nächste Version bestimmen
  let nextVersion = 1
  const existing = await sbSelect(creds, 'portal_plans', `client_sub=eq.${encodeURIComponent(input.email)}&select=version&limit=1`)
  if (existing[0]?.version) nextVersion = Number(existing[0].version) + 1

  const now = new Date().toISOString()
  const auth = { apikey: creds.serviceKey, Authorization: `Bearer ${creds.serviceKey}`, 'Content-Type': 'application/json' }
  const payload = { client_sub: input.email, subject_id: input.subjectId, title: input.title, intro: input.intro, sections: input.sections, version: nextVersion }

  // 1) aktueller Stand — Pflicht (wirft bei Fehler)
  const res = await fetch(`${creds.url}/rest/v1/portal_plans?on_conflict=client_sub`, {
    method: 'POST',
    headers: { ...auth, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...payload, updated_at: now }),
  })
  if (!res.ok) throw new Error(`portal_plans upsert ${res.status}: ${await res.text()}`)

  // 2) Historie — best-effort (darf den Publish nie killen)
  try {
    const arch = await fetch(`${creds.url}/rest/v1/portal_plan_versions`, {
      method: 'POST',
      headers: { ...auth, Prefer: 'return=minimal' },
      body: JSON.stringify({ ...payload, published_at: now }),
    })
    if (!arch.ok) console.error('[publishPlan] archive failed', arch.status, await arch.text())
  } catch (err) {
    console.error('[publishPlan] archive error', err)
  }

  return nextVersion
}
