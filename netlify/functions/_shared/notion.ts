// Schlanker Notion-API-Client für „Bright Medical · Fragebögen".
// Nutzt nur fetch — keine npm-Dependency.
//
// Voraussetzung: NOTION_API_KEY in Netlify-ENV (Internal Integration mit Schreib-Zugriff,
// und die DB muss für die Integration freigegeben sein).
// NOTION_FRAGEBOGEN_DB_ID in Netlify-ENV (oder hardcoded fallback unten).

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const FALLBACK_DB_ID = '4f7f7fa7-3dc4-4a1e-af2b-9b546d85822c'

// --- Wert-Mapper für SELECT-Felder ---
// Backend bekommt evtl. längere Antwortvarianten als die Notion-Optionen erwarten.
// Hier mappen wir auf die exakten SELECT-Optionen.

function mapAufmerksam(value: string): string | null {
  if (!value) return null
  const v = value.toLowerCase()
  if (v.includes('empfehlung')) return 'Empfehlung'
  if (v.includes('instagram') || v.includes('social')) return 'Social Media'
  if (v.includes('such') || v.includes('google')) return 'Suchmaschine'
  if (v.includes('praxis') || v.includes('bestand')) return 'Bestandspatient'
  return 'Sonstiges'
}

function selectOrNull(value: string | undefined, allowed: string[]): string | null {
  if (!value) return null
  return allowed.includes(value) ? value : null
}

// Field types --------------------------------------------------------------

function richText(value: string | undefined) {
  if (!value) return { rich_text: [] }
  // Notion limit: 2000 chars per text block
  return {
    rich_text: [{ type: 'text', text: { content: value.slice(0, 2000) } }],
  }
}
function selectVal(value: string | null) {
  return value ? { select: { name: value } } : { select: null }
}
function emailVal(value: string | undefined) {
  return { email: value || null }
}
function titleVal(value: string) {
  return { title: [{ type: 'text', text: { content: value.slice(0, 200) } }] }
}

// --- Public API -----------------------------------------------------------

export type FragebogenSubmission = {
  name: string
  email: string
  thema: string
  alter: string
  geschlecht: string
  koerper: string
  ziel: string
  dauer: string
  gesundheitszustand: string
  medikamente: string
  coaching_erfahrung: string
  bereitschaft: string
  aufmerksam: string
  sonstiges: string
  tokenId: string
  resendMessageId?: string
}

export async function pushToNotion(s: FragebogenSubmission): Promise<{ ok: true; pageId: string } | { ok: false; error: string }> {
  const apiKey = process.env.NOTION_API_KEY || ''
  const dbId = process.env.NOTION_FRAGEBOGEN_DB_ID || FALLBACK_DB_ID
  if (!apiKey) return { ok: false, error: 'NOTION_API_KEY not configured' }

  const ALTER_OPTIONS = ['Unter 30 Jahre', '30 – 39 Jahre', '40 – 49 Jahre', '50 – 59 Jahre', '60 Jahre und älter']
  const GESCHLECHT_OPTIONS = ['Männlich', 'Weiblich', 'Divers', 'Möchte ich nicht angeben']
  const DAUER_OPTIONS = ['Unter 3 Monate', '3 bis 12 Monate', '1 bis 3 Jahre', 'Länger als 3 Jahre']
  const THEMA_OPTIONS = [
    'Gewichtsoptimierung / Abnehmen',
    'Hormonoptimierung',
    'Darmgesundheit / Erschöpfung',
    'Longevity / Anti-Aging / Prävention',
    'Sonstiges',
  ]

  const properties: Record<string, unknown> = {
    'Name': titleVal(s.name || 'Ohne Namen'),
    'Status': selectVal('Neu'),
    'Email': emailVal(s.email),
    'Thema': selectVal(selectOrNull(s.thema, THEMA_OPTIONS)),
    'Alter': selectVal(selectOrNull(s.alter, ALTER_OPTIONS)),
    'Geschlecht': selectVal(selectOrNull(s.geschlecht, GESCHLECHT_OPTIONS)),
    'Dauer': selectVal(selectOrNull(s.dauer, DAUER_OPTIONS)),
    'Aufmerksam geworden': selectVal(mapAufmerksam(s.aufmerksam)),
    'Hauptziel': richText(s.ziel),
    'Größe & Gewicht': richText(s.koerper),
    'Gesundheitszustand': richText(s.gesundheitszustand),
    'Medikamente': richText(s.medikamente),
    'Coaching-Erfahrung': richText(s.coaching_erfahrung),
    'Bereitschaft': richText(s.bereitschaft),
    'Sonstiges': richText(s.sonstiges),
    'Token-ID': richText(s.tokenId),
    'Resend Message ID': richText(s.resendMessageId || ''),
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: `Notion API ${res.status}: ${text.slice(0, 300)}` }
  }
  const data = (await res.json()) as { id: string }
  return { ok: true, pageId: data.id }
}
