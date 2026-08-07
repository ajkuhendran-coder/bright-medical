// diary-meta — Säuberung der strukturierten Tagebuch-Zusatzangaben (portal_diary.meta).
// Reine Logik ohne Netlify-/Node-Abhängigkeiten → lokal testbar (Muster wie template-mail-core.ts).
//
// Aktueller Anwendungsfall: SPORT-/TRAININGS-TAGEBUCH
//   meta = { kind:'training', muscle?, weightKg?, reps?, sets? }
// Der Übungsname steht in `title`, die Kategorie in `tag` ('Bewegung'), der Zeitpunkt in `eaten_at`.
//
// Sicherheit: strikte Positivliste. Unbekannte Schlüssel, fremdes `kind`, unplausible Zahlen und
// beliebige Client-Strings werden VERWORFEN — es landet nichts Ungeprüftes in der Datenbank.

export const MUSCLE_GROUPS = ['Beine', 'Rücken', 'Brust', 'Schultern', 'Arme', 'Bauch', 'Ganzkörper', 'Cardio'] as const

const ALLOWED_MUSCLES = new Set<string>(MUSCLE_GROUPS)

function positiveNumber(v: unknown, max: number, decimals = 0): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n) || n <= 0 || n > max) return undefined
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/** null = kein (gültiges) meta — der Eintrag wird dann ohne Zusatzangaben gespeichert. */
export function sanitizeMeta(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.kind !== 'training') return null
  const out: Record<string, unknown> = { kind: 'training' }
  if (typeof r.muscle === 'string' && ALLOWED_MUSCLES.has(r.muscle)) out.muscle = r.muscle
  const w = positiveNumber(r.weightKg, 500, 1); if (w !== undefined) out.weightKg = w
  const reps = positiveNumber(r.reps, 500); if (reps !== undefined) out.reps = reps
  const sets = positiveNumber(r.sets, 50); if (sets !== undefined) out.sets = sets
  return out
}
