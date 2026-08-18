// portal-access — server-seitige Zugangssperre fürs Klient-Portal.
//
// WARUM: Der Portal-Token läuft 120 Tage (invite-portal DEFAULT_TTL_DAYS). Nach einem
// 4-Wochen-Programm hätte ein Klient sonst noch ~3 Monate Zugriff. Einen Token-Widerruf
// gibt es nicht — stattdessen prüfen ALLE Portal-Functions dieses Flag und liefern 403,
// statt Daten herauszugeben. Gesetzt wird es vom Command Center beim „abgeschlossen"-Klick
// (cc-set-state { accessRevoked: true }).
//
// ⚠️ Getrennt von `completed` (= nur Abschluss-Screen, manueller Schalter in der
// Wochen-Fokus-Karte). Zwei Bedeutungen, zwei Felder — `completed` sperrt NICHT aus.
//
// Fehlerverhalten bewusst FAIL-OPEN: fehlt die Spalte (SQL noch nicht ausgeführt) oder
// hakt die DB kurz, bleibt der Zugang offen (= bisheriges Verhalten). Eine aktive Klientin
// soll durch einen Infrastruktur-Hickup nicht ausgesperrt werden; die eigentliche
// Zugangskontrolle bleibt der signierte Token, das Flag ist die zusätzliche Schicht.

import { getSupabaseCreds, sbSelect } from './supabase.ts'

export const REVOKED_MESSAGE =
  'Ihr Programm ist abgeschlossen — dieser Zugang ist nicht mehr aktiv. Bei Fragen erreichen Sie uns unter info@brightmedical.de.'

/** true = Zugang gesperrt. Bei jedem Zweifel (kein Supabase, fehlende Spalte, Fehler) false. */
export async function isAccessRevoked(clientSub: string): Promise<boolean> {
  const creds = getSupabaseCreds()
  if (!creds || !clientSub) return false
  try {
    const rows = await sbSelect(
      creds,
      'portal_state',
      `client_sub=eq.${encodeURIComponent(clientSub)}&limit=1&select=access_revoked`,
    )
    return rows[0]?.access_revoked === true
  } catch (err) {
    // Spalte/Tabelle noch nicht da oder DB-Fehler → nicht aussperren, aber sichtbar loggen.
    console.warn('[portal-access] Prüfung nicht möglich, Zugang bleibt offen:', (err as Error).message)
    return false
  }
}

/** Fertige 403-Antwort für gesperrte Zugänge (einheitlicher Text + Flag fürs Frontend). */
export function revokedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: REVOKED_MESSAGE, revoked: true }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
