// purge — Kernlogik der Klienten-Löschung (Anlage 3: 30 Tage nach Programmende / Art. 17).
// Bewusst getrennt von der Function (die macht nur Auth + Guards), damit dieser sicherheits-
// kritische Code lokal gegen eine Testzeile prüfbar ist. Muster wie diary-meta.ts.
//
// KERN (immer löschen):        portal_messages (+coach-voice) · portal_diary (+diary-photos)
//                              · portal_state · push_subscriptions
// ANWALTSABHÄNGIG (Schalter):  portal_plans · portal_plan_versions · sent_mails
//                              → Frage 6 offen: ärztliche Doku-Aufbewahrung vs. Löschzusage.
// NIE:                         portal_consents (Rechenschaftsnachweis Art. 5 Abs. 2 DSGVO)

import { sbSelect, sbDelete, sbDeleteObjects, type SupabaseCreds } from './supabase.ts'

export const CORE_TABLES = ['portal_messages', 'portal_diary', 'portal_state', 'push_subscriptions'] as const
export const LEGAL_HOLD_TABLES = ['portal_plans', 'portal_plan_versions', 'sent_mails'] as const
/** Diese Tabelle wird NIE angefasst — Nachweis, dass eingewilligt wurde. */
export const NEVER_DELETE = ['portal_consents'] as const

export type PurgePlan = {
  email: string
  rows: Record<string, number>
  consents: number
  diaryPhotos: string[]
  voiceFiles: string[]
}

/** Zeilen einer Tabelle für diesen Klienten exakt zählen (ohne die Daten zu laden). */
export async function countRows(creds: SupabaseCreds, table: string, email: string): Promise<number> {
  const res = await fetch(
    `${creds.url}/rest/v1/${table}?client_sub=eq.${encodeURIComponent(email)}&select=client_sub&limit=1`,
    { headers: { apikey: creds.serviceKey, Authorization: `Bearer ${creds.serviceKey}`, Prefer: 'count=exact' } },
  )
  if (!res.ok) throw new Error(`count ${table} ${res.status}: ${await res.text()}`)
  const total = (res.headers.get('content-range') || '').split('/')[1]
  return total && total !== '*' ? Number(total) : 0
}

async function collectPaths(creds: SupabaseCreds, table: string, column: string, email: string): Promise<string[]> {
  const rows = await sbSelect(creds, table, `client_sub=eq.${encodeURIComponent(email)}&select=${column}`)
  return rows.map((r: any) => r?.[column]).filter((p: unknown): p is string => typeof p === 'string' && !!p)
}

/** Bestand aufnehmen — verändert NICHTS. Basis für Dry-Run-Report und echten Lauf. */
export async function collectPurgePlan(creds: SupabaseCreds, email: string): Promise<PurgePlan> {
  const rows: Record<string, number> = {}
  for (const t of [...CORE_TABLES, ...LEGAL_HOLD_TABLES]) rows[t] = await countRows(creds, t, email)
  return {
    email,
    rows,
    consents: await countRows(creds, 'portal_consents', email),
    diaryPhotos: await collectPaths(creds, 'portal_diary', 'photo_path', email),
    voiceFiles: await collectPaths(creds, 'portal_messages', 'audio_path', email),
  }
}

/** Menschlich lesbarer Report (Dry-Run und Quittung nach dem Lauf). */
export function describePlan(plan: PurgePlan, includeLegalHold: boolean) {
  return {
    email: plan.email,
    kern: {
      portal_messages: plan.rows.portal_messages,
      portal_diary: plan.rows.portal_diary,
      portal_state: plan.rows.portal_state,
      push_subscriptions: plan.rows.push_subscriptions,
      dateien_diary_photos: plan.diaryPhotos.length,
      dateien_coach_voice: plan.voiceFiles.length,
    },
    anwaltsabhaengig: {
      portal_plans: plan.rows.portal_plans,
      portal_plan_versions: plan.rows.portal_plan_versions,
      sent_mails: plan.rows.sent_mails,
      wird_geloescht: includeLegalHold,
      hinweis: includeLegalHold
        ? 'Wird MITGELÖSCHT (includeLegalHold:true).'
        : 'Bleibt stehen — Anwaltsfrage 6 (Aufbewahrung vs. Löschpflicht) offen.',
    },
    bleibt_immer: { portal_consents: plan.consents, grund: 'Rechenschaftsnachweis Art. 5 Abs. 2 DSGVO' },
  }
}

/**
 * Führt die Löschung aus. Erst die Storage-Dateien (die DB-Zeilen sind die Pfad-Quelle),
 * dann die Zeilen. portal_consents wird nie angefasst.
 */
export async function executePurge(
  creds: SupabaseCreds,
  plan: PurgePlan,
  includeLegalHold: boolean,
): Promise<Record<string, number>> {
  const deleted: Record<string, number> = {}
  deleted.dateien_diary_photos = await sbDeleteObjects(creds, 'diary-photos', plan.diaryPhotos)
  deleted.dateien_coach_voice = await sbDeleteObjects(creds, 'coach-voice', plan.voiceFiles)
  const tables = includeLegalHold ? [...CORE_TABLES, ...LEGAL_HOLD_TABLES] : [...CORE_TABLES]
  for (const t of tables) {
    await sbDelete(creds, t, `client_sub=eq.${encodeURIComponent(plan.email)}`)
    deleted[t] = plan.rows[t]
  }
  return deleted
}
