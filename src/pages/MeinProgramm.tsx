import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'

// Klient-Portal „Mein Programm" (Scope `portal`).
// Sicherer, DSGVO-konformer Bereich der Klientin: Tagebuch, Plan, Nachrichten an
// den Coach (ersetzt WhatsApp für Gesundheitsdaten) + read-only Programm-Anzeige.
//
// Umsetzung des abgenommenen Designs aus claude.ai/design ("Mein Programm.dc.html"):
// 4-Tab-App (Start / Tagebuch / Plan / Kontakt), Newsreader-Serif + Hanken Grotesk.
//
// Zustandslos: read-only Personalisierung kommt aus dem signierten JWT (?t=...);
// die Signatur prüft der Server, clientseitig wird der Payload nur angezeigt.
// Tagebuch, Nachrichten-Thread und Glukose sind aktuell Demo-/Client-State —
// die Supabase-Anbindung (EU/Frankfurt) sitzt an `// TODO(Supabase)`-Nahtstellen.

const INK = '#14314D'
const ACC = '#1AA3C6'
const ACC_DK = '#0E7E9C'
const MUT = '#6B7E8D'
const OFF = '#9FB0BC'
const OK = '#1F9C6B'
const LINE = '#E7EDF2'
const serif = { fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, letterSpacing: '-.01em' } as const

type PortalPayload = {
  sub: string
  exp: number
  scope: string
  name: string
  initials?: string
  programLabel: string
  weekCurrent: number
  weekTotal: number
  focusTitle?: string
  focusText?: string
  focusStep?: string
  planUpdated?: string
  nextCallHuman?: string
  nextCallUrl?: string
}

type Tab = 'start' | 'tagebuch' | 'plan' | 'kontakt'
type ThreadMsg = { from: 'coach' | 'me'; text: string; time: string; audioUrl?: string; audioSeconds?: number | null }
type Entry =
  | { kind: 'day'; label: string }
  | { kind: 'entry'; time: string; title: string; tag: string; detail: string; photo?: string }

// Plan-Bausteine (festes Vokabular, kommen als JSONB aus portal_plans — bewusst lose typisiert).
type PlanSectionData = { type: string; title?: string; body?: string; items?: string[]; variant?: string; plate?: boolean }
type PlanData = { title: string; intro: string | null; sections: PlanSectionData[]; version: number; updatedAt: string }

const TAG_COLORS: Record<string, [string, string]> = {
  Mahlzeit: ['#E7F6FA', '#0E7E9C'],
  Foto: ['#E7F6FA', '#0E7E9C'],
  Bewegung: ['#E8F5EE', '#1F9C6B'],
  Schlaf: ['#EEF0FB', '#5560B3'],
  Notiz: ['#F0F2F4', '#6B7E8D'],
}

function readUrlToken(): string | null {
  if (typeof window === 'undefined') return null
  const t = new URL(window.location.href).searchParams.get('t')
  if (!t) return null
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) return null
  return t
}

function decodePayload(token: string): PortalPayload | null {
  try {
    const b64url = token.split('.')[0]
    const pad = b64url.length % 4 === 0 ? '' : '='.repeat(4 - (b64url.length % 4))
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const p = JSON.parse(new TextDecoder().decode(bytes)) as PortalPayload
    if (p.scope !== 'portal' || !p.name || !p.programLabel) return null
    return p
  } catch {
    return null
  }
}

function greeting(): string {
  const h = Number(new Date().toLocaleString('de-DE', { hour: '2-digit', hour12: false, timeZone: 'Europe/Berlin' }))
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}
function nowTime(): string {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}
// Datums-Schlüssel (YYYY-MM-DD) IN Europe/Berlin — damit Heute/Gestern unabhängig
// von der Geräte-Zeitzone korrekt entschieden werden (en-CA liefert ISO-Datum).
function berlinDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' })
}
function dayLabel(d: Date): string {
  const now = new Date()
  const yest = new Date(now.getTime() - 86400000)
  const k = berlinDayKey(d)
  const datum = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' })
  if (k === berlinDayKey(now)) return `Heute · ${datum}`
  if (k === berlinDayKey(yest)) return `Gestern · ${datum}`
  return datum
}
// Neuen Eintrag oben einfügen — nur unter den HEUTIGEN Tages-Header (sonst neuen anlegen,
// damit ein heutiger Eintrag nicht unter „Gestern"/ein veraltetes Datum rutscht).
function prependToday(prev: Entry[], entry: Entry): Entry[] {
  const today = dayLabel(new Date())
  if (prev.length && prev[0].kind === 'day' && prev[0].label === today) return [prev[0], entry, ...prev.slice(1)]
  return [{ kind: 'day', label: today }, entry, ...prev]
}
// Server-Einträge (neueste zuerst) in die Tages-gruppierte Render-Liste umbauen.
type ServerEntry = { time_label?: string; title: string; tag: string; detail?: string; photoUrl?: string | null; created_at: string }
function toInterleaved(rows: ServerEntry[]): Entry[] {
  const out: Entry[] = []
  let last = ''
  for (const r of rows) {
    const d = new Date(r.created_at)
    const ok = !isNaN(d.getTime())
    const label = ok ? dayLabel(d) : ''
    if (label && label !== last) { out.push({ kind: 'day', label }); last = label }
    out.push({
      kind: 'entry',
      time: r.time_label || (ok ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : ''),
      title: r.title,
      tag: r.tag,
      detail: r.detail || '',
      photo: r.photoUrl || undefined,
    })
  }
  return out
}
// Foto clientseitig verkleinern/komprimieren → kompaktes JPEG als Data-URL.
function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no 2d context')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
    img.src = url
  })
}

// --- Push-Benachrichtigung (freiwillig) ---
// VAPID-Public-Key ist NICHT geheim (Gegenstück zum privaten Key in der Netlify-ENV).
const VAPID_PUBLIC = 'BPmBO9l9zVZC1_SM46JrZihxbvb4CYFMeGog7UluDc-TCPqLo3raEqnZ0QXXQY0IILjjSLpQzxUqiE_DU3PUbxs'
const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// --- kleine Bausteine ---
function CamIcon({ s = 17 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}
function LockNote({ children }: { children: ReactNode }) {
  return (
    <div style={{ margin: '18px 26px 0', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flex: 'none' }}>
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#8295A2' }}>{children}</div>
    </div>
  )
}
// Lade-Platzhalter (Skeleton) — verhindert das „leer → Inhalt springt rein"-Flackern.
function SkeletonCards({ n = 3 }: { n?: number }) {
  return (
    <div style={{ padding: '4px 0 0' }} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="mp-skel" style={{ height: 66, borderRadius: 14, marginBottom: 10 }} />
      ))}
    </div>
  )
}

// Plan-Datum menschlich (Europe/Berlin).
function formatPlanDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })
}

// Inline-Fettung (**fett**) → React-Knoten (spiegelt das PDF).
function RichText({ text, boldColor = INK }: { text?: string; boldColor?: string }) {
  const parts = String(text ?? '').split('**')
  return <>{parts.map((p, i) => (i % 2 === 1 ? <strong key={i} style={{ fontWeight: 600, color: boldColor }}>{p}</strong> : <span key={i}>{p}</span>))}</>
}

const serifI = { fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic', fontWeight: 400 } as const
const PLAN_SIG = { name: 'Ajanth Kuhendran', lines: ['Facharzt für Allgemeinmedizin', 'Spezialist in funktionelle und integrative Medizin', 'Bright Medical'] }

function Kicker({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 8px' }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: ACC }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: '#EDF1F5' }} />
    </div>
  )
}
function PlanBullets({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0 0' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: ACC, marginTop: 7 }} />
          <span style={{ fontSize: 14.5, lineHeight: 1.55, color: '#40566A' }}><RichText text={it} /></span>
        </div>
      ))}
    </div>
  )
}

// Plan im Design rendern — kontext-bewusst: die Überschrift steuert Karten/Häkchen (wie im PDF).
function PlanBody({ sections }: { sections: PlanSectionData[] }) {
  const guardRe = /leitplanke|grundregel|grundsatz|prinzip|regel/i
  const successRe = /erfolg|messen|merken|dranbleib|erkenne/i
  let headingKind: 'guard' | 'success' | 'other' = 'other'
  let firstList = false
  const out: ReactNode[] = []
  sections.forEach((s, i) => {
    const items = Array.isArray(s.items) ? s.items.filter((x) => typeof x === 'string' && x.trim()) : []
    if (s.type === 'heading') {
      headingKind = guardRe.test(s.title || '') ? 'guard' : successRe.test(s.title || '') ? 'success' : 'other'
      out.push(
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '26px 0 2px' }}>
          <div style={{ ...serif, fontSize: 21, color: INK, whiteSpace: 'nowrap' }}>{s.title}</div>
          <div style={{ flex: 1, height: 1, background: LINE }} />
        </div>,
      )
    } else if (s.type === 'list') {
      const variant = s.variant || (headingKind === 'guard' || (!firstList && items.length >= 2 && items.length <= 3) ? 'cards' : headingKind === 'success' ? 'checks' : 'plain')
      firstList = true
      if (variant === 'cards' && items.length >= 2 && items.length <= 3) {
        out.push(
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0 0' }}>
            {items.map((it, j) => (
              <div key={j} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#F7F9FB', border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ ...serif, fontSize: 30, lineHeight: 1, color: ACC, flex: 'none', width: 36 }}>{String(j + 1).padStart(2, '0')}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: '#40566A', paddingTop: 4 }}><RichText text={it} /></div>
              </div>
            ))}
          </div>,
        )
      } else if (variant === 'checks') {
        out.push(
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: '12px 0 0' }}>
            {items.map((it, j) => (
              <div key={j} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flex: 'none', width: 24, height: 24, borderRadius: '50%', background: '#EAF6F9', border: '1px solid #CDE9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACC_DK, marginTop: 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span style={{ fontSize: 14.5, lineHeight: 1.55, color: '#40566A' }}><RichText text={it} /></span>
              </div>
            ))}
          </div>,
        )
      } else {
        out.push(
          <div key={i} style={{ margin: '12px 0 0' }}>
            {s.title && <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>{s.title}</div>}
            <PlanBullets items={items} />
          </div>,
        )
      }
    } else if (s.type === 'meal') {
      out.push(
        <div key={i}>
          <Kicker label="Mahlzeit" />
          <div style={{ ...serif, fontSize: 22, color: INK, margin: '0 0 2px' }}>{s.title}</div>
          {s.plate ? (
            <img src="/images/teller-portionsmodell.jpg" alt="Der Teller · Portionsmodell — die Hälfte Gemüse, ein Viertel Eiweiß, ein Viertel Beilage" style={{ width: '100%', maxWidth: 460, borderRadius: 14, border: `1px solid ${LINE}`, display: 'block', margin: '10px auto 0' }} />
          ) : (
            <>
              {s.body && <div style={{ ...serifI, fontSize: 15, color: MUT, margin: '2px 0 10px' }}>{s.body}</div>}
              <PlanBullets items={items} />
            </>
          )}
        </div>,
      )
    } else if (s.type === 'training') {
      let title = s.title || 'Bewegung'
      let badge = ''
      const m = title.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      if (m) { title = m[1].trim(); badge = m[2].trim() }
      out.push(
        <div key={i}>
          <Kicker label="Bewegung" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 2px' }}>
            <span style={{ ...serif, fontSize: 22, color: INK }}>{title}</span>
            {badge && <span style={{ fontSize: 11, fontWeight: 600, color: ACC_DK, background: '#EAF6F9', border: '1px solid #CDE9F0', padding: '3px 10px', borderRadius: 20 }}>{badge}</span>}
          </div>
          {s.body && <div style={{ ...serifI, fontSize: 15, color: MUT, margin: '4px 0 10px' }}>{s.body}</div>}
          <PlanBullets items={items} />
        </div>,
      )
    } else if (s.type === 'note') {
      if (s.title && s.title.trim()) {
        out.push(
          <div key={i} style={{ margin: '16px 0 0', background: '#EAF6F9', border: '1px solid #CDE9F0', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: ACC_DK, marginBottom: 5 }}>{s.title}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#2C5266' }}><RichText text={s.body} boldColor="#14314D" /></div>
          </div>,
        )
      } else {
        out.push(
          <div key={i} style={{ margin: '24px 0 0', borderLeft: `3px solid ${ACC}`, padding: '2px 0 2px 18px' }}>
            <div style={{ ...serifI, fontSize: 16, lineHeight: 1.6, color: '#2C4256' }}>{s.body}</div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{PLAN_SIG.name}</div>
              {PLAN_SIG.lines.map((ln, j) => <div key={j} style={{ fontSize: 12.5, color: MUT, lineHeight: 1.5 }}>{ln}</div>)}
            </div>
          </div>,
        )
      }
    } else if (s.body) {
      out.push(<div key={i} style={{ fontSize: 14.5, lineHeight: 1.6, color: '#40566A', margin: '12px 0 0' }}><RichText text={s.body} /></div>)
    }
  })
  return <>{out}</>
}

// PWA-Tags fürs Portal zur Laufzeit einhängen — NUR auf dieser Route; die
// Marketing-Seite (index.html) bleibt unberührt. Das Manifest wird dynamisch als
// Blob erzeugt, damit der Zugangs-Token (aus ?t=…) als start_url erhalten bleibt —
// so öffnet auch eine auf Android installierte Kachel direkt den eigenen Bereich.
function ensurePortalPwa(): void {
  if (typeof document === 'undefined') return
  const head = document.head
  const setMeta = (name: string, content: string) => {
    let m = head.querySelector(`meta[name="${name}"]`)
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); head.appendChild(m) }
    m.setAttribute('content', content)
  }
  setMeta('apple-mobile-web-app-capable', 'yes')
  setMeta('mobile-web-app-capable', 'yes')
  setMeta('apple-mobile-web-app-status-bar-style', 'default')
  setMeta('apple-mobile-web-app-title', 'Mein Programm')

  if (!head.querySelector('link[rel="apple-touch-icon"]')) {
    const l = document.createElement('link')
    l.rel = 'apple-touch-icon'
    l.setAttribute('sizes', '180x180')
    l.href = '/images/portal-icon-180.png'
    head.appendChild(l)
  }

  if (!document.getElementById('mp-manifest')) {
    const origin = window.location.origin
    // Absolute URLs sind Pflicht: relative Pfade würden gegen die blob:-Basis auflösen.
    const manifest = {
      name: 'Mein Programm — Bright Medical',
      short_name: 'Mein Programm',
      description: 'Ihr persönlicher, sicherer Bereich bei Bright Medical.',
      lang: 'de',
      start_url: window.location.href,
      scope: `${origin}/mein-programm`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F7F9FB',
      theme_color: '#F7F9FB',
      icons: [
        { src: `${origin}/images/portal-icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${origin}/images/portal-icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${origin}/images/portal-icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const link = document.createElement('link')
    link.id = 'mp-manifest'
    link.rel = 'manifest'
    link.href = URL.createObjectURL(blob)
    head.appendChild(link)
  }
}

export default function MeinProgramm() {
  const token = useMemo(readUrlToken, [])
  const payload = useMemo(() => (token ? decodePayload(token) : null), [token])

  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'start'
    const v = new URL(window.location.href).searchParams.get('view')
    return (['tagebuch', 'plan', 'kontakt'] as Tab[]).includes(v as Tab) ? (v as Tab) : 'start'
  })
  const [focusDone, setFocusDone] = useState(() => {
    try { return localStorage.getItem(`mp-focus-${payload?.weekCurrent ?? 0}`) === '1' } catch { return false }
  })
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState({ thread: true, diary: true, plan: true })
  const [seenCoachCount, setSeenCoachCount] = useState(() => {
    try { return Number(localStorage.getItem('mp-seen-coach') || 0) } catch { return 0 }
  })
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState(false)
  // Thread + Tagebuch kommen aus Supabase (EU) über portal-thread / portal-diary.
  // Start LEER — kein Demo-Seed, damit eine echte Klientin nie fremde Daten sieht.
  const [thread, setThread] = useState<ThreadMsg[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [plan, setPlan] = useState<PlanData | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteTag, setNoteTag] = useState('Notiz')
  const [writeError, setWriteError] = useState('')
  const [pushState, setPushState] = useState<'idle' | 'granted' | 'denied' | 'busy' | 'unsupported'>(() => {
    if (!pushSupported) return 'unsupported'
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'idle'
  })
  // „Zum Startbildschirm"-Tipp: einmalig, wegklickbar (localStorage); nicht in der
  // bereits installierten App (display-mode standalone / iOS navigator.standalone).
  const [a2hsOff, setA2hsOff] = useState(() => {
    try { return localStorage.getItem('mp-a2hs') === 'off' } catch { return false }
  })
  const [a2hsOpen, setA2hsOpen] = useState(false)
  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(display-mode: standalone)')?.matches === true
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  }, [])
  // Consent-Gate: Art.-9-Einwilligung vor der ersten Nutzung.
  const [consentState, setConsentState] = useState<'loading' | 'needed' | 'granted'>('loading')
  const [consentBoxes, setConsentBoxes] = useState({ cgm: false, photos: false, questionnaire: false, channel: false })
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  const [consentError, setConsentError] = useState('')

  useEffect(() => {
    document.title = 'Mein Programm | Bright Medical'
    let m = document.querySelector('meta[name="robots"]')
    if (!m) {
      m = document.createElement('meta')
      m.setAttribute('name', 'robots')
      document.head.appendChild(m)
    }
    m.setAttribute('content', 'noindex,nofollow')
    // Fonts (Newsreader + Hanken Grotesk) werden lokal via @font-face in index.css
    // geladen — kein externer Google-Fonts-Aufruf (DSGVO auf der Gesundheitsdaten-Seite).
    ensurePortalPwa()
  }, [])

  // Verlauf + Tagebuch laden (best-effort; ohne Backend bleiben die Demo-Daten).
  // Seq-Guard: ein späterer Load (z. B. nach einem Write) gewinnt gegen einen noch
  // laufenden Mount-Load — so überschreibt der Mount-Load keine gerade hinzugefügten Einträge.
  const threadSeq = useRef(0)
  const diarySeq = useRef(0)

  const loadThread = useCallback(async () => {
    if (!token) return
    const seq = ++threadSeq.current
    try {
      const res = await fetch('/.netlify/functions/portal-thread', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (seq === threadSeq.current && data?.configured && Array.isArray(data.messages)) {
        setThread(data.messages as ThreadMsg[])
      }
    } catch { /* Preview/offline → Demo-Thread behalten */ }
    finally { setLoading((l) => (l.thread ? { ...l, thread: false } : l)) }
  }, [token])

  const loadDiary = useCallback(async () => {
    if (!token) return
    const seq = ++diarySeq.current
    try {
      const res = await fetch('/.netlify/functions/portal-diary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (seq === diarySeq.current && data?.configured && Array.isArray(data.entries)) {
        setEntries(toInterleaved(data.entries as ServerEntry[]))
      }
    } catch { /* Preview/offline → Demo-Einträge behalten */ }
    finally { setLoading((l) => (l.diary ? { ...l, diary: false } : l)) }
  }, [token])

  const loadPlan = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/.netlify/functions/portal-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data?.configured && data.plan) setPlan(data.plan as PlanData)
    } catch { /* offline → kein Plan, Platzhalter bleibt */ }
    finally { setLoading((l) => (l.plan ? { ...l, plan: false } : l)) }
  }, [token])

  useEffect(() => { void loadThread() }, [loadThread])
  useEffect(() => { void loadDiary() }, [loadDiary])
  useEffect(() => { void loadPlan() }, [loadPlan])

  // Beim Zurückkehren in die App (Tab/PWA wieder im Vordergrund) frisch laden:
  // sonst zeigt die installierte App tagelang alte Nachrichten/Pläne, und die
  // signierten Foto-/Audio-URLs (1 h gültig) wären längst abgelaufen.
  useEffect(() => {
    if (!token) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void loadThread()
      void loadDiary()
      void loadPlan()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [token, loadThread, loadDiary, loadPlan])

  // Chat: bei Öffnen des Kontakt-Tabs + bei neuer Nachricht ans Ende springen
  // (bei langem Verlauf sonst mühsames Scrollen zum Neuesten).
  useEffect(() => {
    if (tab === 'kontakt') threadEndRef.current?.scrollIntoView({ block: 'end' })
  }, [tab, thread.length])

  // Ungelesen-Markierung am Kontakt-Tab (rein clientseitig via localStorage, kein Schema/CC):
  // „gesehen" = Anzahl Coach-Nachrichten beim letzten Öffnen des Kontakt-Tabs.
  const coachCount = thread.filter((m) => m.from === 'coach').length
  const hasUnread = coachCount > seenCoachCount && tab !== 'kontakt'
  useEffect(() => {
    if (tab === 'kontakt' && coachCount !== seenCoachCount) {
      setSeenCoachCount(coachCount)
      try { localStorage.setItem('mp-seen-coach', String(coachCount)) } catch { /* ignore */ }
    }
  }, [tab, coachCount, seenCoachCount])

  // --- Push-Benachrichtigung (freiwillig, nur nach Consent) ---
  const savePush = useCallback(async (sub: PushSubscription) => {
    if (!token) return
    const j = sub.toJSON()
    try {
      await fetch('/.netlify/functions/save-push-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, subscription: { endpoint: sub.endpoint, keys: j.keys }, url: window.location.href }),
      })
    } catch { /* egal — E-Mail bleibt der garantierte Kanal */ }
  }, [token])

  const enablePush = useCallback(async () => {
    if (!pushSupported || !token) return
    setPushState('busy')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushState(perm === 'denied' ? 'denied' : 'idle'); return }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) }))
      await savePush(sub)
      setPushState('granted')
    } catch { setPushState('idle') }
  }, [token, savePush])

  // Wenn Push bereits erlaubt ist: SW registrieren + Subscription sicherstellen (neues Gerät / erneuert).
  useEffect(() => {
    if (!pushSupported || !token || consentState !== 'granted' || Notification.permission !== 'granted') return
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      try {
        const existing = await reg.pushManager.getSubscription()
        const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) }))
        await savePush(sub)
      } catch { /* egal */ }
    }).catch(() => {})
  }, [token, consentState, savePush])

  // Einwilligungs-Status prüfen — Gate nur zeigen, wenn noch keine Einwilligung vorliegt.
  useEffect(() => {
    if (!token || !payload) return
    let alive = true
    fetch('/.netlify/functions/portal-consent-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (alive) setConsentState(data?.consented ? 'granted' : 'needed') })
      .catch(() => { if (alive) setConsentState('needed') }) // im Zweifel: Gate zeigen
    return () => { alive = false }
  }, [token, payload])

  const expired = payload ? payload.exp < Date.now() : false

  function dismissA2hs() {
    setA2hsOff(true)
    try { localStorage.setItem('mp-a2hs', 'off') } catch { /* ignore */ }
  }

  function sendMessage() {
    const t = draft.trim()
    if (!t) return
    setThread((prev) => [...prev, { from: 'me', text: t, time: 'jetzt' }])
    setDraft('')
    setSent(true)
    setWriteError('')
    if (!token) return
    fetch('/.netlify/functions/submit-portal-nachricht', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, text: t }),
    })
      .then((res) => {
        if (res.ok) { void loadThread() }
        else if (res.status !== 503) {
          setSent(false)
          setWriteError('Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.')
          void loadThread()
        }
      })
      .catch(() => { /* offline → Nachricht bleibt lokal sichtbar */ })
  }
  function saveNote() {
    const t = noteText.trim()
    if (!t) return
    const time = nowTime()
    const title = t.slice(0, 120)
    const tag = noteTag
    setEntries((prev) => prependToday(prev, { kind: 'entry', time, title, tag, detail: '' }))
    setNoteText('')
    setNoteOpen(false)
    setWriteError('')
    if (!token) return
    fetch('/.netlify/functions/submit-portal-diary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, title, tag, time }),
    })
      .then((res) => {
        if (res.status === 503) return // kein Backend → lokale Notiz behalten
        if (!res.ok) setWriteError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
        void loadDiary() // mit Server abgleichen (entfernt fehlgeschlagene optimistische Einträge)
      })
      .catch(() => { /* offline → Notiz bleibt lokal sichtbar */ })
  }
  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    setWriteError('')
    let failed = 0
    for (const f of files) {
      let dataUrl: string
      try { dataUrl = await compressImage(f) } catch { failed++; continue }
      const time = nowTime()
      // optimistisch anzeigen
      setEntries((prev) => prependToday(prev, { kind: 'entry', time, title: 'Mahlzeit-Foto', tag: 'Foto', detail: '', photo: dataUrl }))
      if (!token) continue
      // verschlüsselt in Supabase Storage (EU) ablegen, dann mit Server abgleichen
      try {
        const res = await fetch('/.netlify/functions/submit-portal-diary', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, title: 'Mahlzeit-Foto', tag: 'Foto', time, photoBase64: dataUrl.split(',')[1], photoType: 'image/jpeg' }),
        })
        if (res.status === 503) continue // kein Backend → lokale Vorschau behalten
        if (!res.ok) setWriteError('Foto konnte nicht gespeichert werden. Bitte erneut versuchen.')
        void loadDiary()
      } catch { /* offline → lokale Vorschau behalten */ }
    }
    if (failed > 0) {
      setWriteError(failed === 1
        ? 'Ein Foto konnte nicht gelesen werden. Bitte versuchen Sie es mit einem anderen Bild.'
        : `${failed} Fotos konnten nicht gelesen werden. Bitte erneut versuchen.`)
    }
  }

  function submitConsent() {
    if (!consentBoxes.photos || !consentBoxes.channel || consentSubmitting) return
    setConsentSubmitting(true)
    setConsentError('')
    fetch('/.netlify/functions/submit-portal-einwilligung', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...consentBoxes }),
    })
      .then((res) => {
        if (res.ok) setConsentState('granted')
        else setConsentError('Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.')
      })
      .catch(() => setConsentError('Verbindung fehlgeschlagen. Bitte erneut versuchen.'))
      .finally(() => setConsentSubmitting(false))
  }

  // ---- Ungültiger / abgelaufener Link ----
  if (!token || !payload || expired) {
    return (
      <div className="mp-page" style={{ alignItems: 'center' }}>
        <div style={{ maxWidth: 380, width: '100%', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 22, padding: '40px 28px', textAlign: 'center', boxShadow: '0 20px 50px -20px rgba(20,49,77,.35)' }}>
          <h1 style={{ ...serif, fontSize: 23, color: INK, marginBottom: 12 }}>Link nicht gültig</h1>
          <p style={{ color: MUT, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Dieser Zugang ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an unter{' '}
            <a href="mailto:info@brightmedical.de" style={{ color: ACC_DK }}>info@brightmedical.de</a>.
          </p>
          <a href="https://brightmedical.de" style={{ display: 'inline-block', background: INK, color: '#fff', textDecoration: 'none', borderRadius: 99, padding: '11px 24px', fontWeight: 600, fontSize: 14 }}>Zur Startseite</a>
        </div>
        <PortalStyles />
      </div>
    )
  }

  // ---- Consent-Gate: Art.-9-Einwilligung vor der ersten Nutzung ----
  if (consentState !== 'granted') {
    const canSubmit = consentBoxes.photos && consentBoxes.channel && !consentSubmitting
    const items: { key: keyof typeof consentBoxes; label: string }[] = [
      { key: 'cgm', label: 'Verarbeitung meiner CGM-/Glukosedaten zur individuellen Auswertung und Beratung' },
      { key: 'photos', label: 'Verarbeitung von Fotos meines Ernährungstagebuchs zur individuellen Ernährungsanalyse' },
      { key: 'questionnaire', label: 'Verarbeitung gesundheitsbezogener Angaben aus Fragebögen und Coaching-Gesprächen' },
      { key: 'channel', label: 'Übermittlung dieser Daten über den sicheren, verschlüsselten Kanal von Bright Medical' },
    ]
    return (
      <div className="mp-page" style={{ alignItems: 'center' }}>
        <div className="mp-app" style={{ justifyContent: 'flex-start' }}>
          <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top) + 18px) 26px 8px' }}>
            <img src="/images/bright-medical-portal-logo.png" alt="Bright Medical" style={{ height: 27, width: 'auto', display: 'block' }} />
          </div>
          <div className="mp-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '8px 26px 26px' }}>
            {consentState === 'loading' ? (
              <div style={{ textAlign: 'center', color: MUT, fontSize: 14, padding: '60px 0' }}>Einen Moment …</div>
            ) : (
              <>
                <h1 style={{ ...serif, fontSize: 23, color: INK, margin: '10px 0 6px' }}>Einverständnis für Ihre Gesundheitsdaten</h1>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4A6071', marginBottom: 18 }}>
                  Guten Tag {payload.name}, damit Ihr Coach mit Ihren Gesundheitsdaten arbeiten darf, brauchen wir einmalig Ihre Einwilligung (Art. 9 DSGVO). Sie ist <strong>freiwillig</strong> und jederzeit widerrufbar.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {items.map((it) => {
                    const on = consentBoxes[it.key]
                    return (
                      <button key={it.key} type="button" onClick={() => setConsentBoxes((b) => ({ ...b, [it.key]: !b[it.key] }))}
                        style={{ display: 'flex', gap: 11, alignItems: 'flex-start', textAlign: 'left', width: '100%', cursor: 'pointer', fontFamily: 'inherit', background: on ? '#F2FAFC' : '#fff', border: `1.5px solid ${on ? ACC : '#DEE6EC'}`, borderRadius: 12, padding: '13px 14px' }}>
                        <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 6, marginTop: 1, border: `1.5px solid ${on ? ACC : '#C4D0D9'}`, background: on ? ACC : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </span>
                        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK }}>{it.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: '#8295A2' }}>
                  Verantwortlich: Bright Medical, Ajanth Kuhendran, Bruchsal. Die Verarbeitung erfolgt ausschließlich für Ihr Coaching. Widerruf jederzeit per E-Mail an <a href="mailto:info@brightmedical.de" style={{ color: ACC_DK }}>info@brightmedical.de</a> mit Wirkung für die Zukunft. Foto-Tagebuch und sicherer Kanal sind für die Portal-Nutzung erforderlich.
                </p>
                {consentError && <div style={{ margin: '12px 0 0', padding: '9px 13px', background: '#FDECEC', border: '1px solid #F5C6C6', borderRadius: 10, color: '#B42318', fontSize: 13 }}>{consentError}</div>}
                <button onClick={submitConsent} disabled={!canSubmit}
                  style={{ marginTop: 16, width: '100%', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: 15, borderRadius: 12, border: 'none', cursor: canSubmit ? 'pointer' : 'default', background: canSubmit ? INK : '#B9C6CF', color: '#fff' }}>
                  {consentSubmitting ? 'Wird gespeichert …' : 'Einwilligung erteilen'}
                </button>
              </>
            )}
          </div>
        </div>
        <PortalStyles />
      </div>
    )
  }

  const initials = payload.initials || payload.name.slice(0, 2).toUpperCase()
  const focusTitle = payload.focusTitle || 'Willkommen'
  const focusText = payload.focusText || 'Ihr Coach hinterlegt hier jede Woche Ihren Fokus. Es geht gleich los.'
  const focusStep = payload.focusStep || 'Wir starten gemeinsam im ersten Gespräch.'

  // Programm abgeschlossen: Dr. K sendet einen finalen Portal-Link mit weekCurrent > weekTotal
  // (z. B. „5 von 4"). Dann zeigt der Start-Tab statt Fortschritt/Fokus einen würdigen Abschluss.
  const abgeschlossen = payload.weekCurrent > payload.weekTotal
  const navColor = (t: Tab) => (tab === t ? INK : OFF)
  const navWeight = (t: Tab) => (tab === t ? 600 : 500)

  return (
    <div className="mp-page">
      <div className="mp-app">

        {/* Brand-Lockup */}
        <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top) + 16px) 26px 11px' }}>
          <img src="/images/bright-medical-portal-logo.png" alt="Bright Medical" style={{ height: 27, width: 'auto', display: 'block' }} />
        </div>

        {writeError && (
          <div style={{ margin: '0 16px 8px', padding: '9px 13px', background: '#FDECEC', border: '1px solid #F5C6C6', borderRadius: 10, color: '#B42318', fontSize: 12.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }} role="alert">
            <span>{writeError}</span>
            <button onClick={() => setWriteError('')} aria-label="Schließen" style={{ border: 'none', background: 'none', color: '#B42318', cursor: 'pointer', fontSize: 17, lineHeight: 1, fontFamily: 'inherit', flex: 'none' }}>×</button>
          </div>
        )}

        {/* ===== SCROLL-INHALT ===== */}
        <div className="mp-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

          {/* ---------- START ---------- */}
          {tab === 'start' && (
            <div style={{ padding: '0 0 18px', animation: 'mp-rise .35s ease' }}>
              <div style={{ padding: '14px 26px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ ...serif, fontSize: 25, color: INK }}>{greeting()}, {payload.name}</div>
                  <div style={{ fontSize: 13, color: MUT, marginTop: 3 }}>{payload.programLabel}</div>
                </div>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>{initials}</div>
              </div>

              {/* Tipp: Zum Startbildschirm — dezent, wegklickbar, nicht in der installierten App */}
              {!a2hsOff && !isStandalone && (
                <div style={{ margin: '14px 26px 0' }}>
                  <div style={{ background: '#F2F8FA', border: '1px solid #DCEEF3', borderRadius: 14, padding: '13px 14px' }}>
                    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 9, background: '#fff', border: '1px solid #DCEEF3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACC_DK }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                      </span>
                      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: INK }}>
                        <strong style={{ fontWeight: 600 }}>Immer griffbereit:</strong> Legen Sie sich „Mein Programm" auf den Startbildschirm — dann sind Sie mit einem Tipp hier, wie bei einer App.
                        <div style={{ marginTop: 7 }}>
                          <button onClick={() => setA2hsOpen((v) => !v)} style={{ border: 'none', background: 'none', padding: 0, color: ACC_DK, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>{a2hsOpen ? 'Ausblenden' : 'So geht’s'}</button>
                        </div>
                        {a2hsOpen && (
                          <div style={{ marginTop: 9, fontSize: 12.5, lineHeight: 1.55, color: '#4A6071' }}>
                            <div style={{ marginBottom: 5 }}><strong style={{ color: INK }}>iPhone (Safari):</strong> unten auf das Teilen-Symbol → „Zum Home-Bildschirm".</div>
                            <div><strong style={{ color: INK }}>Android (Chrome):</strong> oben rechts auf ⋮ → „Zum Startbildschirm hinzufügen".</div>
                          </div>
                        )}
                      </div>
                      <button onClick={dismissA2hs} aria-label="Tipp schließen" style={{ flex: 'none', border: 'none', background: 'none', color: '#9FB0BC', cursor: 'pointer', fontSize: 18, lineHeight: 1, fontFamily: 'inherit', marginTop: -2 }}>×</button>
                    </div>
                  </div>
                </div>
              )}

              {abgeschlossen && (
                <div className="mp-card" style={{ margin: '18px 26px 0', padding: '26px 22px', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: '#E8F5EE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: OK, marginBottom: 14 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <div style={{ ...serif, fontSize: 24, color: INK, marginBottom: 10 }}>Geschafft, {payload.name}!</div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, color: '#4A6071', maxWidth: 320, margin: '0 auto' }}>
                    Sie haben Ihren {payload.programLabel} abgeschlossen. Schön, dass Sie diesen Weg gegangen sind und drangeblieben sind.
                  </div>
                  <div style={{ height: 1, background: '#EDF1F5', margin: '20px 0 16px' }} />
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4A6071', textAlign: 'left' }}>
                    <div style={{ marginBottom: 10 }}><strong style={{ color: INK }}>Ihre Unterlagen bleiben bei Ihnen.</strong> Ihren persönlichen Plan können Sie im Tab „Plan" jederzeit als PDF speichern; Ihr Tagebuch bleibt hier für Sie sichtbar.</div>
                    <div><strong style={{ color: INK }}>Sie möchten weitermachen?</strong> Schreiben Sie mir unten kurz, dann finden wir gemeinsam den passenden nächsten Schritt.</div>
                  </div>
                </div>
              )}

              {!abgeschlossen && (<>
              {/* Fortschritt */}
              <div style={{ padding: '18px 26px 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', color: MUT, textTransform: 'uppercase' }}>Ihr Programm</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Woche {payload.weekCurrent} von {payload.weekTotal}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: payload.weekTotal }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < payload.weekCurrent ? ACC : '#DDE6EC' }} />
                  ))}
                </div>
              </div>

              {/* Fokus diese Woche */}
              <div className="mp-card" style={{ margin: '22px 26px 0', padding: '22px 22px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: ACC, textTransform: 'uppercase' }}>Ihr Fokus diese Woche</div>
                <div style={{ ...serif, fontSize: 22, color: INK, margin: '8px 0' }}>{focusTitle}</div>
                <div style={{ fontSize: 15, lineHeight: 1.55, color: '#4A6071' }}>{focusText}</div>
                <div style={{ height: 1, background: '#EDF1F5', margin: '18px 0 16px' }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: MUT, textTransform: 'uppercase', marginBottom: 6 }}>Ihr nächster Schritt</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, color: INK, fontWeight: 500 }}>{focusStep}</div>
                <button
                  onClick={() => setFocusDone((v) => { const nv = !v; try { localStorage.setItem(`mp-focus-${payload?.weekCurrent ?? 0}`, nv ? '1' : '0') } catch { /* ignore */ } return nv })}
                  style={{ marginTop: 16, width: '100%', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', border: `1.5px solid ${focusDone ? OK : 'transparent'}`, background: focusDone ? '#E8F5EE' : INK, color: focusDone ? OK : '#fff' }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: focusDone ? OK : 'rgba(255,255,255,.18)', color: '#fff' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  {focusDone ? 'Erledigt — gut gemacht!' : 'Als erledigt markieren'}
                </button>
              </div>

              {/* Glukose-Sensor — Auswertung im Gespräch, KEINE Live-Anbindung im Portal (keine erfundenen Werte) */}
              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>Ihr Glukose-Sensor</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: ACC, background: '#E7F6FA', padding: '4px 9px', borderRadius: 20 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACC, display: 'inline-block' }} />FreeStyle Libre
                  </span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: '#4A6071' }}>
                  Tragen Sie den Sensor einfach wie besprochen weiter — Ihre Werte schauen wir uns gemeinsam im Video-Gespräch an.
                </div>
              </div>

              {/* Nächstes Gespräch */}
              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: ACC, textTransform: 'uppercase' }}>Nächstes Gespräch</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 4px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EAF0F4', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>AJ</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Ajanth · Health Coach</div>
                    <div style={{ fontSize: 13, color: MUT }}>{payload.nextCallHuman || 'Termin wird abgestimmt'}</div>
                  </div>
                </div>
                <a
                  href={payload.nextCallUrl || undefined}
                  target={payload.nextCallUrl ? '_blank' : undefined}
                  rel="noreferrer"
                  style={{ marginTop: 14, width: '100%', boxSizing: 'border-box', border: `1.5px solid ${ACC}`, background: '#fff', color: ACC_DK, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: 13, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', textDecoration: 'none', opacity: payload.nextCallUrl ? 1 : 0.55 }}
                >
                  <CamIcon /> Zum Video-Gespräch
                </a>
              </div>
              </>)}

              {/* Plan-Zeile */}
              <button onClick={() => setTab('plan')} style={{ margin: '14px 26px 0', width: 'calc(100% - 52px)', textAlign: 'left', padding: '18px 22px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: '#EAF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, flex: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: INK }}>Ihr Ernährungs- &amp; Lifestyle-Plan</span>
                  <span style={{ display: 'block', fontSize: 13, color: MUT, marginTop: 2 }}>{payload.planUpdated ? `Aktualisiert ${payload.planUpdated}` : 'Folgt nach dem Kickoff'}</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9FB0BC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>

              {/* Kurze Nachricht */}
              <div style={{ margin: '14px 26px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: MUT, textTransform: 'uppercase', marginBottom: 9 }}>Kurze Nachricht an Ajanth</div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setSent(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                    placeholder="Frage oder kurzer Gruß …"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #DEE6EC', background: '#fff', borderRadius: 14, padding: '14px 52px 14px 16px', fontFamily: 'inherit', fontSize: 14, color: INK }}
                  />
                  <button onClick={sendMessage} aria-label="Senden" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, border: 'none', borderRadius: 10, background: ACC, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
                {sent && (
                  <div style={{ marginTop: 9, fontSize: 12.5, color: OK, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Gesendet — Ajanth meldet sich. <span onClick={() => setTab('kontakt')} style={{ color: ACC_DK, textDecoration: 'underline', cursor: 'pointer' }}>Zum Verlauf</span>
                  </div>
                )}
              </div>

              <LockNote><strong style={{ color: OK, fontWeight: 600 }}>Sicher & DSGVO-konform.</strong> Verschlüsselt in der EU. Coaching-Angebot, ersetzt keine ärztliche Behandlung.</LockNote>
            </div>
          )}

          {/* ---------- TAGEBUCH ---------- */}
          {tab === 'tagebuch' && (
            <div style={{ padding: '0 0 18px', animation: 'mp-rise .35s ease' }}>
              <div style={{ padding: '14px 26px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ ...serif, fontSize: 26, color: INK }}>Tagebuch</div>
                  <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Was Sie essen & bewegen — kurz notiert</div>
                </div>
                <div style={{ flex: 'none', display: 'flex', gap: 8 }}>
                  <button onClick={() => fileRef.current?.click()} aria-label="Foto hinzufügen" style={{ border: `1.5px solid ${ACC}`, background: '#fff', color: ACC_DK, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 12px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    Foto
                  </button>
                  <button onClick={() => setNoteOpen((v) => !v)} style={{ border: 'none', background: INK, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Eintrag
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickPhoto} hidden />
              </div>

              {noteOpen && (
                <div style={{ margin: '4px 26px 0', padding: '14px 16px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, animation: 'mp-rise .25s ease' }}>
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveNote() }}
                    autoFocus
                    maxLength={120}
                    placeholder="Kurz notieren – z. B. Mittagessen: Salat mit Hähnchen"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #DEE6EC', background: '#F7F9FB', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', fontSize: 14, color: INK }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {(['Mahlzeit', 'Bewegung', 'Schlaf', 'Notiz'] as const).map((tg) => {
                      const active = noteTag === tg
                      const [bg, col] = TAG_COLORS[tg] || TAG_COLORS.Notiz
                      return (
                        <button key={tg} onClick={() => setNoteTag(tg)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', border: active ? `1.5px solid ${col}` : '1px solid #E3E8EE', background: active ? bg : '#fff', color: active ? col : MUT }}>{tg}</button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, alignItems: 'center' }}>
                    <button onClick={() => { setNoteOpen(false); setNoteText('') }} style={{ border: 'none', background: 'none', color: MUT, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                    <button onClick={saveNote} disabled={!noteText.trim()} style={{ border: 'none', background: INK, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', opacity: noteText.trim() ? 1 : 0.45 }}>Speichern</button>
                  </div>
                </div>
              )}

              <div style={{ padding: '14px 26px 0' }}>
                {entries.map((e, i) =>
                  e.kind === 'day' ? (
                    <div key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#8295A2', textTransform: 'uppercase', margin: '18px 0 10px' }}>{e.label}</div>
                  ) : (
                    <div key={i} style={{ display: 'flex', gap: 12, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: MUT, width: 44, flex: 'none', paddingTop: 1 }}>{e.time}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{e.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: (TAG_COLORS[e.tag] || TAG_COLORS.Notiz)[0], color: (TAG_COLORS[e.tag] || TAG_COLORS.Notiz)[1] }}>{e.tag}</span>
                        </div>
                        {e.detail && <div style={{ fontSize: 13, color: MUT, lineHeight: 1.45, marginTop: 3 }}>{e.detail}</div>}
                        {e.photo && <img src={e.photo} alt="Tagebuch-Foto" onClick={() => setLightbox(e.photo!)} style={{ display: 'block', width: '100%', maxHeight: 190, objectFit: 'cover', borderRadius: 10, marginTop: 9, cursor: 'zoom-in' }} />}
                      </div>
                    </div>
                  )
                )}
                {loading.diary && entries.length === 0 && <SkeletonCards n={3} />}
                {!loading.diary && entries.length === 0 && (
                  <div style={{ padding: '34px 6px', textAlign: 'center', color: MUT, fontSize: 14, lineHeight: 1.6 }}>
                    Noch keine Einträge.<br />Halten Sie Ihre erste Mahlzeit mit „Foto" oder „Eintrag" fest.
                  </div>
                )}
              </div>
              <div style={{ margin: '18px 26px 0', textAlign: 'center', fontSize: 12, color: '#A9B7C1' }}>🔒 Verschlüsselt in der EU — Ihre Einträge und Fotos sieht nur Ihr Coach.</div>
            </div>
          )}

          {/* ---------- PLAN ---------- */}
          {tab === 'plan' && (
            <div style={{ padding: '0 0 22px', animation: 'mp-rise .35s ease' }}>
              {plan ? (
                <div style={{ padding: '12px 26px 0', animation: 'mp-rise .3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: ACC, paddingTop: 5 }}>Für {payload.name}</div>
                    <a
                      href={`/.netlify/functions/portal-plan-pdf?t=${encodeURIComponent(token || '')}`}
                      target="_blank"
                      rel="noopener"
                      style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 12, border: `1px solid ${LINE}`, background: '#fff', color: INK, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACC_DK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      PDF
                    </a>
                  </div>
                  {plan.title && <div style={{ ...serif, fontSize: 27, lineHeight: 1.12, color: INK, margin: '6px 0 0' }}>{plan.title}</div>}
                  {plan.intro && <div style={{ fontSize: 15, lineHeight: 1.65, color: '#4A6071', margin: '10px 0 0' }}><RichText text={plan.intro} /></div>}
                  <PlanBody sections={plan.sections} />
                  {plan.updatedAt && <div style={{ margin: '26px 0 0', textAlign: 'center', fontSize: 12, color: '#A9B7C1' }}>🔒 Aktualisiert am {formatPlanDate(plan.updatedAt)} · verschlüsselt in der EU</div>}
                </div>
              ) : (
                <>
                  <div style={{ padding: '14px 26px 8px' }}>
                    <div style={{ ...serif, fontSize: 26, color: INK }}>Ihr Plan</div>
                    <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Ernährung &amp; Training</div>
                  </div>
                  {/* Platzhalter — bis Ajanth den individuellen Plan einstellt (keine Demo-Empfehlungen) */}
                  <div className="mp-card" style={{ margin: '14px 26px 0', padding: '30px 22px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: '#EAF0F4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: INK, marginBottom: 14 }}>
                      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    </div>
                    <div style={{ ...serif, fontSize: 20, color: INK, marginBottom: 9 }}>Ihr Plan folgt in Kürze</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.6, color: '#4A6071', maxWidth: 300, margin: '0 auto' }}>
                      Ihren persönlichen Ernährungs- &amp; Trainingsplan bespricht Ajanth mit Ihnen im ersten Gespräch und stellt ihn danach hier für Sie ein.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---------- KONTAKT ---------- */}
          {tab === 'kontakt' && (
            <div style={{ padding: '0 0 18px', animation: 'mp-rise .35s ease' }}>
              <div style={{ padding: '14px 26px 14px', display: 'flex', alignItems: 'center', gap: 13, borderBottom: '1px solid #EDF1F5' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15 }}>AJ</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: INK }}>Ajanth</div>
                  <div style={{ fontSize: 12.5, color: OK, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: OK, display: 'inline-block' }} />Ihr Health Coach · antwortet meist in 1 Tag</div>
                </div>
              </div>

              {pushState !== 'unsupported' && pushState !== 'denied' && (
                <div style={{ padding: '14px 26px 0' }}>
                  {pushState === 'granted' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: OK }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      Benachrichtigungen sind aktiv.
                    </div>
                  ) : (
                    <button onClick={enablePush} disabled={pushState === 'busy'} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '12px 14px', borderRadius: 12, border: `1px solid ${LINE}`, background: '#fff', color: INK, fontSize: 13.5, fontWeight: 600, cursor: pushState === 'busy' ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACC_DK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                      {pushState === 'busy' ? 'Wird aktiviert …' : 'Benachrichtigungen aktivieren'}
                    </button>
                  )}
                  {pushState !== 'granted' && <div style={{ fontSize: 11.5, color: MUT, marginTop: 7, textAlign: 'center', lineHeight: 1.45 }}>Optional — Sie werden aufs Handy erinnert, wenn Ajanth Ihnen schreibt (ohne Inhalt).</div>}
                </div>
              )}

              <div style={{ padding: '20px 26px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading.thread && thread.length === 0 && <SkeletonCards n={2} />}
                {!loading.thread && thread.length === 0 && (
                  <div style={{ padding: '26px 6px', textAlign: 'center', fontSize: 14, lineHeight: 1.6, color: MUT }}>
                    Noch keine Nachrichten. Schreiben Sie Ajanth gern — er meldet sich.
                  </div>
                )}
                {thread.map((m, i) => {
                  const me = m.from === 'me'
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '11px 14px 9px', fontSize: 14, lineHeight: 1.45, ...(me ? { background: ACC, color: '#fff', borderRadius: '18px 18px 6px 18px' } : { background: '#fff', color: INK, border: `1px solid ${LINE}`, borderRadius: '18px 18px 18px 6px' }) }}>
                        {m.audioUrl ? <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>🎙️ {m.text || 'Sprachnachricht'}</span> : m.text}
                        {m.audioUrl && <audio controls preload="none" src={m.audioUrl} style={{ display: 'block', width: '100%', marginTop: 8 }} />}
                        <span style={{ display: 'block', marginTop: 4, fontSize: 10, textAlign: 'right', color: me ? 'rgba(255,255,255,.7)' : '#A9B7C1' }}>{m.time}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={threadEndRef} />
              </div>

              <div style={{ margin: '18px 26px 0', padding: '14px 16px', background: '#F2F8FA', border: '1px solid #DCEEF3', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: ACC, flex: 'none', display: 'flex' }}><CamIcon s={22} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>Video-Gespräch</div>
                  <div style={{ fontSize: 12.5, color: MUT }}>{payload.nextCallHuman || 'Termin stimmen wir ab'}</div>
                </div>
                <a href={payload.nextCallUrl || undefined} target={payload.nextCallUrl ? '_blank' : undefined} rel="noreferrer" style={{ flex: 'none', border: 'none', background: ACC, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 10, cursor: 'pointer', textDecoration: 'none' }}>Beitreten</a>
              </div>

              <LockNote>Verschlüsselter Verlauf — kein WhatsApp nötig. Bei medizinischen Notfällen wenden Sie sich bitte an Ihre Ärztin oder den Notruf 112.</LockNote>
            </div>
          )}
        </div>

        {/* ===== COMPOSER (nur Kontakt) ===== */}
        {tab === 'kontakt' && (
          <div style={{ flex: 'none', padding: '12px 18px', borderTop: '1px solid #EDF1F5', background: '#fff' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setSent(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Nachricht an Ajanth …"
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #DEE6EC', background: '#F7F9FB', borderRadius: 22, padding: '13px 50px 13px 18px', fontFamily: 'inherit', fontSize: 14, color: INK }}
              />
              <button onClick={sendMessage} aria-label="Senden" style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, border: 'none', borderRadius: '50%', background: ACC, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* ===== TAB-LEISTE ===== */}
        <div style={{ flex: 'none', borderTop: `1px solid ${LINE}`, background: '#fff', boxShadow: '0 -1px 12px rgba(20,49,77,0.06)', display: 'flex', padding: '11px 14px calc(env(safe-area-inset-bottom) + 14px)' }}>
          <button className="mp-tab" onClick={() => setTab('start')} style={{ color: navColor('start') }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            <span style={{ fontSize: 10.5, fontWeight: navWeight('start') }}>Start</span>
          </button>
          <button className="mp-tab" onClick={() => setTab('tagebuch')} style={{ color: navColor('tagebuch') }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            <span style={{ fontSize: 10.5, fontWeight: navWeight('tagebuch') }}>Tagebuch</span>
          </button>
          <button className="mp-tab" onClick={() => setTab('plan')} style={{ color: navColor('plan') }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <span style={{ fontSize: 10.5, fontWeight: navWeight('plan') }}>Plan</span>
          </button>
          <button className="mp-tab" onClick={() => setTab('kontakt')} style={{ color: navColor('kontakt'), position: 'relative' }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>
            <span style={{ fontSize: 10.5, fontWeight: navWeight('kontakt') }}>Kontakt</span>
            {hasUnread && <span aria-label="neue Nachricht" style={{ position: 'absolute', top: 2, left: 'calc(50% + 7px)', width: 8, height: 8, borderRadius: '50%', background: '#E5484D', border: '1.5px solid #fff' }} />}
          </button>
        </div>
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,20,32,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}>
          <img src={lightbox} alt="Foto in Großansicht" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
          <button onClick={(ev) => { ev.stopPropagation(); setLightbox(null) }} aria-label="Schließen" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', right: 16, width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 24, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </div>
      )}
      <PortalStyles />
    </div>
  )
}

function PortalStyles() {
  return (
    <style>{`
.mp-page{height:100dvh;overflow:hidden;background:#DDE2E7;display:flex;align-items:stretch;justify-content:center;}
.mp-app{width:100%;max-width:420px;height:100dvh;overflow:hidden;background:#F7F9FB;display:flex;flex-direction:column;position:relative;color:#14314D;font-family:'Hanken Grotesk',-apple-system,system-ui,sans-serif;}
.mp-app *{box-sizing:border-box;}
.mp-card{background:#fff;border:1px solid #E7EDF2;border-radius:18px;}
.mp-scroll::-webkit-scrollbar{width:0;height:0;}
.mp-scroll{scrollbar-width:none;}
.mp-skel{background:linear-gradient(90deg,#EEF2F6 0%,#F6F9FB 50%,#EEF2F6 100%);background-size:200% 100%;animation:mp-shimmer 1.4s ease-in-out infinite;}
@keyframes mp-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@media (prefers-reduced-motion: reduce){.mp-app,.mp-app *{animation:none !important;}}
.mp-page ::placeholder{color:#9FB0BC;opacity:1;}
.mp-tab{flex:1;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:inherit;}
@keyframes mp-rise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
@media(min-width:480px){
  .mp-page{align-items:center;padding:3dvh 16px;}
  .mp-app{min-height:0;height:min(880px,94dvh);border-radius:40px;border:1px solid #E2E9EE;box-shadow:0 40px 90px -30px rgba(20,49,77,.45),0 4px 14px rgba(20,49,77,.12);overflow:hidden;}
}
`}</style>
  )
}
