// Minimaler Supabase-Helfer für die Netlify Functions des Klient-Portals.
// Dependency-frei: spricht PostgREST + Storage direkt per fetch mit dem
// service_role-Key (umgeht RLS). Der Key wird NIE ans Frontend gegeben.
//
// Env (in Netlify + lokaler .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

export type SupabaseCreds = { url: string; serviceKey: string }

export function getSupabaseCreds(): SupabaseCreds | null {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return { url: url.replace(/\/+$/, ''), serviceKey }
}

function authHeaders(creds: SupabaseCreds): Record<string, string> {
  return { apikey: creds.serviceKey, Authorization: `Bearer ${creds.serviceKey}` }
}

// PostgREST: insert (gibt die erzeugten Zeilen zurück)
export async function sbInsert(
  creds: SupabaseCreds,
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
): Promise<any[]> {
  const res = await fetch(`${creds.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...authHeaders(creds), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

// PostgREST: upsert auf eine Konflikt-Spalte (merge-duplicates). Nur die im Payload gesetzten
// Spalten werden bei Konflikt aktualisiert (partielles Update möglich). Gibt die Zeile(n) zurück.
export async function sbUpsert(
  creds: SupabaseCreds,
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
  onConflict: string,
): Promise<any[]> {
  const res = await fetch(`${creds.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: 'POST',
    headers: { ...authHeaders(creds), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Supabase upsert ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

// PostgREST: delete (query = PostgREST-Filter, z. B. "idempotency_key=eq.abc") — u. a. für Idempotenz-Rollback
export async function sbDelete(creds: SupabaseCreds, table: string, query: string): Promise<void> {
  const res = await fetch(`${creds.url}/rest/v1/${table}?${query}`, { method: 'DELETE', headers: authHeaders(creds) })
  if (!res.ok) throw new Error(`Supabase delete ${table} ${res.status}: ${await res.text()}`)
}

// PostgREST: select (query = roher PostgREST-Querystring, z. B. "client_sub=eq.x&order=created_at.asc")
export async function sbSelect(creds: SupabaseCreds, table: string, query: string): Promise<any[]> {
  const res = await fetch(`${creds.url}/rest/v1/${table}?${query}`, { headers: authHeaders(creds) })
  if (!res.ok) throw new Error(`Supabase select ${table} ${res.status}: ${await res.text()}`)
  return res.json()
}

// Storage: Objekt hochladen (z. B. Tagebuch-Foto)
export async function sbUpload(
  creds: SupabaseCreds,
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const res = await fetch(`${creds.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: 'POST',
    headers: { ...authHeaders(creds), 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes,
  })
  if (!res.ok) throw new Error(`Supabase upload ${bucket}/${path} ${res.status}: ${await res.text()}`)
}

// Storage: zeitlich begrenzte Signed-URL für ein privates Objekt erzeugen
export async function sbSignedUrl(
  creds: SupabaseCreds,
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const res = await fetch(`${creds.url}/storage/v1/object/sign/${bucket}/${encodeURI(path)}`, {
    method: 'POST',
    headers: { ...authHeaders(creds), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  })
  if (!res.ok) throw new Error(`Supabase sign ${bucket}/${path} ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return `${creds.url}/storage/v1${data.signedURL}`
}
