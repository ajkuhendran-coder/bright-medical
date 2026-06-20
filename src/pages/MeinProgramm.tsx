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
type ThreadMsg = { from: 'coach' | 'me'; text: string; time: string }
type Entry =
  | { kind: 'day'; label: string }
  | { kind: 'entry'; time: string; title: string; tag: string; detail: string; photo?: string }

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

// --- kleine Bausteine ---
function Dot() {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACC, flex: 'none', marginTop: 7 }} />
}
function PlanItem({ title, detail, last }: { title: string; detail: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: last ? 0 : 13 }}>
      <Dot />
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{title}</div>
        <div style={{ fontSize: 13, color: MUT, marginTop: 2, lineHeight: 1.45 }}>{detail}</div>
      </div>
    </div>
  )
}
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

export default function MeinProgramm() {
  const token = useMemo(readUrlToken, [])
  const payload = useMemo(() => (token ? decodePayload(token) : null), [token])

  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'start'
    const v = new URL(window.location.href).searchParams.get('view')
    return (['tagebuch', 'plan', 'kontakt'] as Tab[]).includes(v as Tab) ? (v as Tab) : 'start'
  })
  const [focusDone, setFocusDone] = useState(false)
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState(false)
  // TODO(Supabase): Thread + Tagebuch + Glukose kommen später aus Supabase (EU);
  // hier Demo-/Client-State zur Darstellung.
  const [thread, setThread] = useState<ThreadMsg[]>([
    { from: 'coach', text: 'Hallo Sandra! Toll, dass Sie schon eine Mahlzeit umgestellt haben. Wie hat sich der Abend angefühlt?', time: 'Mo' },
    { from: 'me', text: 'Hat überraschend gut funktioniert, ich war abends weniger müde.', time: 'Mo' },
    { from: 'coach', text: 'Sehr schön — genau das sehen wir auch in den Werten. Lassen Sie uns das am Dienstag besprechen.', time: 'Di' },
  ])
  const [entries, setEntries] = useState<Entry[]>([
    { kind: 'day', label: 'Heute · Mi 18. Juni' },
    { kind: 'entry', time: '08:10', title: 'Frühstück', tag: 'Mahlzeit', detail: 'Skyr mit Beeren & Haferflocken' },
    { kind: 'entry', time: '12:40', title: 'Spaziergang', tag: 'Bewegung', detail: '25 Min nach dem Mittagessen' },
    { kind: 'entry', time: '19:20', title: 'Abendessen', tag: 'Mahlzeit', detail: 'Lachs mit Ofengemüse — nach neuem Plan' },
    { kind: 'day', label: 'Gestern · Di 17. Juni' },
    { kind: 'entry', time: '07:55', title: 'Frühstück', tag: 'Mahlzeit', detail: 'Vollkornbrot mit Ei & Avocado' },
    { kind: 'entry', time: '14:10', title: 'Energietief', tag: 'Notiz', detail: 'Nach dem Mittag müde — Kaffee geholfen' },
    { kind: 'entry', time: '22:30', title: 'Schlaf', tag: 'Schlaf', detail: 'Im Bett, ruhiger als sonst' },
  ])
  const fileRef = useRef<HTMLInputElement>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteTag, setNoteTag] = useState('Notiz')
  const [writeError, setWriteError] = useState('')

  useEffect(() => {
    document.title = 'Mein Programm | Bright Medical'
    let m = document.querySelector('meta[name="robots"]')
    if (!m) {
      m = document.createElement('meta')
      m.setAttribute('name', 'robots')
      document.head.appendChild(m)
    }
    m.setAttribute('content', 'noindex,nofollow')
    if (!document.getElementById('mp-fonts')) {
      const l = document.createElement('link')
      l.id = 'mp-fonts'
      l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap'
      document.head.appendChild(l)
    }
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
  }, [token])

  useEffect(() => { void loadThread() }, [loadThread])
  useEffect(() => { void loadDiary() }, [loadDiary])

  const expired = payload ? payload.exp < Date.now() : false

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
    for (const f of files) {
      let dataUrl: string
      try { dataUrl = await compressImage(f) } catch { continue }
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

  const initials = payload.initials || payload.name.slice(0, 2).toUpperCase()
  const focusTitle = payload.focusTitle || 'Erste Erkenntnisse'
  const focusText = payload.focusText || 'Ihre Werte nach dem Abendessen werden schon ruhiger. Daran setzen wir an.'
  const focusStep = payload.focusStep || 'Eine Mahlzeit nach dem neuen Plan ausprobieren.'

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
        <div className="mp-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

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
                  onClick={() => setFocusDone((v) => !v)}
                  style={{ marginTop: 16, width: '100%', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', border: `1.5px solid ${focusDone ? OK : 'transparent'}`, background: focusDone ? '#E8F5EE' : INK, color: focusDone ? OK : '#fff' }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: focusDone ? OK : 'rgba(255,255,255,.18)', color: '#fff' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  {focusDone ? 'Erledigt — gut gemacht!' : 'Als erledigt markieren'}
                </button>
              </div>

              {/* Glukose */}
              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>Glukose · letzte 24 h</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: ACC, background: '#E7F6FA', padding: '4px 9px', borderRadius: 20 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACC, display: 'inline-block' }} />2 Sensoren
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 600, color: INK, letterSpacing: '-.02em' }}>98</span>
                  <span style={{ fontSize: 13, color: MUT }}>mg/dL</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: OK }}>stabiler abends ↘</span>
                </div>
                <svg viewBox="0 0 320 88" width="100%" height="78" preserveAspectRatio="none" style={{ display: 'block', marginTop: 6 }}>
                  <defs><linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ACC} stopOpacity="0.18" /><stop offset="1" stopColor={ACC} stopOpacity="0" /></linearGradient></defs>
                  <path d="M0 58 C30 56 48 36 70 34 S110 62 132 60 S168 26 192 32 S230 56 252 54 S292 40 320 44 L320 88 L0 88 Z" fill="url(#hGrad)" />
                  <path d="M0 58 C30 56 48 36 70 34 S110 62 132 60 S168 26 192 32 S230 56 252 54 S292 40 320 44" fill="none" stroke={ACC} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <div style={{ fontSize: 12, color: '#8295A2', marginTop: 10 }}>Aus FreeStyle Libre · besprechen wir im Gespräch</div>
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

              {/* Plan-Zeile */}
              <button onClick={() => setTab('plan')} style={{ margin: '14px 26px 0', width: 'calc(100% - 52px)', textAlign: 'left', padding: '18px 22px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: '#EAF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK, flex: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: INK }}>Ihr Ernährungs- & Lifestyle-Plan</span>
                  <span style={{ display: 'block', fontSize: 13, color: MUT, marginTop: 2 }}>Aktualisiert {payload.planUpdated || 'kürzlich'}</span>
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
                <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={onPickPhoto} hidden />
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: OFF, width: 44, flex: 'none', paddingTop: 1 }}>{e.time}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{e.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: (TAG_COLORS[e.tag] || TAG_COLORS.Notiz)[0], color: (TAG_COLORS[e.tag] || TAG_COLORS.Notiz)[1] }}>{e.tag}</span>
                        </div>
                        {e.detail && <div style={{ fontSize: 13, color: MUT, lineHeight: 1.45, marginTop: 3 }}>{e.detail}</div>}
                        {e.photo && <img src={e.photo} alt="Tagebuch-Foto" style={{ display: 'block', width: '100%', maxHeight: 190, objectFit: 'cover', borderRadius: 10, marginTop: 9 }} />}
                      </div>
                    </div>
                  )
                )}
              </div>
              <div style={{ margin: '18px 26px 0', textAlign: 'center', fontSize: 12, color: '#A9B7C1' }}>🔒 Verschlüsselt in der EU — Ihre Einträge und Fotos sieht nur Ihr Coach.</div>
            </div>
          )}

          {/* ---------- PLAN ---------- */}
          {tab === 'plan' && (
            <div style={{ padding: '0 0 18px', animation: 'mp-rise .35s ease' }}>
              <div style={{ padding: '14px 26px 8px' }}>
                <div style={{ ...serif, fontSize: 26, color: INK }}>Ihr Plan</div>
                <div style={{ fontSize: 13, color: MUT, marginTop: 2 }}>Ernährung & Lifestyle · v3 · {payload.planUpdated || 'aktuell'}</div>
              </div>

              <div style={{ margin: '14px 26px 0', padding: '20px 22px', background: INK, borderRadius: 18, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>AJ</div>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: '#9DC6D6', textTransform: 'uppercase' }}>Notiz von Ajanth</div>
                </div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: '#EAF2F6' }}>„Wir verschieben das Abendessen etwas nach vorn und reduzieren schnelle Kohlenhydrate. Die Werte schauen wir uns am Dienstag gemeinsam an."</div>
              </div>

              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: ACC, textTransform: 'uppercase', marginBottom: 14 }}>Morgens</div>
                <PlanItem title="Eiweißreiches Frühstück" detail="Skyr, Beeren, Haferflocken — sättigt und hält die Werte ruhig." />
                <PlanItem title="Erst Licht & Bewegung, dann Kaffee" detail="5 Minuten ans Fenster oder vor die Tür." last />
              </div>

              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: ACC, textTransform: 'uppercase', marginBottom: 14 }}>Mittags</div>
                <PlanItem title="Gemüse zuerst" detail="Erst Gemüse & Eiweiß, dann Beilage — flachere Kurve." />
                <PlanItem title="10 Min Spaziergang danach" detail="Glättet den Anstieg nach dem Essen spürbar." last />
              </div>

              <div style={{ position: 'relative', margin: '24px 26px 0', padding: '20px 22px', background: '#fff', border: `2px solid ${ACC}`, borderRadius: 18 }}>
                <span style={{ position: 'absolute', top: -10, left: 20, background: ACC, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20 }}>Fokus diese Woche</span>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: ACC, textTransform: 'uppercase', marginBottom: 14 }}>Abends</div>
                <PlanItem title="Abendessen vor 19:30 Uhr" detail="Mehr Abstand zur Nachtruhe = ruhigere Nachtwerte." />
                <PlanItem title="Wenig schnelle Kohlenhydrate" detail="Lieber Eiweiß & Gemüse — z. B. Lachs mit Ofengemüse." last />
              </div>

              <div className="mp-card" style={{ margin: '14px 26px 0', padding: '20px 22px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: ACC, textTransform: 'uppercase', marginBottom: 14 }}>Bewegung & Schlaf</div>
                <PlanItem title="7.000 Schritte am Tag" detail="Verteilt über den Tag, kein Leistungssport nötig." />
                <PlanItem title="Feste Schlafenszeit" detail="Möglichst gleiche Uhrzeit — auch am Wochenende." last />
              </div>
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

              <div style={{ padding: '20px 26px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: '#A9B7C1', textTransform: 'uppercase' }}>Diese Woche</div>
                {thread.map((m, i) => {
                  const me = m.from === 'me'
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', padding: '11px 14px 9px', fontSize: 14, lineHeight: 1.45, ...(me ? { background: ACC, color: '#fff', borderRadius: '18px 18px 6px 18px' } : { background: '#fff', color: INK, border: `1px solid ${LINE}`, borderRadius: '18px 18px 18px 6px' }) }}>
                        {m.text}
                        <span style={{ display: 'block', marginTop: 4, fontSize: 10, textAlign: 'right', color: me ? 'rgba(255,255,255,.7)' : '#A9B7C1' }}>{m.time}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ margin: '18px 26px 0', padding: '14px 16px', background: '#F2F8FA', border: '1px solid #DCEEF3', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: ACC, flex: 'none', display: 'flex' }}><CamIcon s={22} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>Video-Gespräch · {payload.nextCallHuman ? payload.nextCallHuman.split('·')[0].trim() : 'Termin folgt'}</div>
                  <div style={{ fontSize: 12.5, color: MUT }}>15:00 Uhr · ca. 30 Min</div>
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
        <div style={{ flex: 'none', borderTop: `1px solid ${LINE}`, background: '#fff', display: 'flex', padding: '11px 14px calc(env(safe-area-inset-bottom) + 14px)' }}>
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
          <button className="mp-tab" onClick={() => setTab('kontakt')} style={{ color: navColor('kontakt') }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></svg>
            <span style={{ fontSize: 10.5, fontWeight: navWeight('kontakt') }}>Kontakt</span>
          </button>
        </div>
      </div>
      <PortalStyles />
    </div>
  )
}

function PortalStyles() {
  return (
    <style>{`
.mp-page{min-height:100dvh;background:#DDE2E7;display:flex;align-items:stretch;justify-content:center;}
.mp-app{width:100%;max-width:420px;min-height:100dvh;background:#F7F9FB;display:flex;flex-direction:column;position:relative;color:#14314D;font-family:'Hanken Grotesk',-apple-system,system-ui,sans-serif;}
.mp-app *{box-sizing:border-box;}
.mp-card{background:#fff;border:1px solid #E7EDF2;border-radius:18px;}
.mp-scroll::-webkit-scrollbar{width:0;height:0;}
.mp-scroll{scrollbar-width:none;}
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
