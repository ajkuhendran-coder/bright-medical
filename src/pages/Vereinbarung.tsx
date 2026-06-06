import { useEffect, useMemo, useState } from 'react'

// Gegenzeichnungs-Seite für den Coaching-Vertrag (nach Zahlung).
// Liest Paket + Vorbefüllung aus dem signierten JWT (?t=...).
// Der Klient ergänzt seine Daten, liest die Bedingungen, bestätigt + tippt seinen Namen.
// Die Signatur prüft der Server (submit-vereinbarung) — clientseitig nur Anzeige.

type VereinbarungPayload = {
  sub: string
  exp: number
  scope: string
  paketKey: string
  paketLabel: string
  paketPreis: string
  name?: string
  subjectId?: string
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function readUrlToken(): string | null {
  if (typeof window === 'undefined') return null
  const t = new URL(window.location.href).searchParams.get('t')
  if (!t) return null
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) return null
  return t
}

function decodePayload(token: string): VereinbarungPayload | null {
  try {
    const b64url = token.split('.')[0]
    const pad = b64url.length % 4 === 0 ? '' : '='.repeat(4 - (b64url.length % 4))
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const p = JSON.parse(json) as VereinbarungPayload
    if (p.scope !== 'vereinbarung' || !p.paketKey || !p.paketLabel) return null
    return p
  } catch {
    return null
  }
}

export default function Vereinbarung() {
  const token = useMemo(readUrlToken, [])
  const payload = useMemo(() => (token ? decodePayload(token) : null), [token])

  const [name, setName] = useState('')
  const [anschrift, setAnschrift] = useState('')
  const [geburtsdatum, setGeburtsdatum] = useState('')
  const [telefon, setTelefon] = useState('')
  const [accept, setAccept] = useState(false)
  const [signature, setSignature] = useState('')
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' })

  useEffect(() => {
    document.title = 'Coaching-Vereinbarung | Bright Medical'
    let m = document.querySelector('meta[name="robots"]')
    if (!m) {
      m = document.createElement('meta')
      m.setAttribute('name', 'robots')
      document.head.appendChild(m)
    }
    m.setAttribute('content', 'noindex,nofollow')
  }, [])

  useEffect(() => {
    if (payload?.name && !name) setName(payload.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const expired = payload ? payload.exp < Date.now() : false
  const ready =
    name.trim().length > 1 &&
    anschrift.trim().length > 3 &&
    geburtsdatum.trim().length > 3 &&
    telefon.trim().length > 4 &&
    accept &&
    signature.trim().length > 1

  async function send() {
    if (!token || !ready) return
    setSubmit({ kind: 'submitting' })
    try {
      const res = await fetch('/.netlify/functions/submit-vereinbarung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: name.trim(),
          anschrift: anschrift.trim(),
          geburtsdatum: geburtsdatum.trim(),
          telefon: telefon.trim(),
          signature: signature.trim(),
          accept: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setSubmit({ kind: 'success' })
      } else if (res.status === 429) {
        setSubmit({ kind: 'error', message: 'Zu viele Anfragen, bitte später erneut versuchen.' })
      } else if (res.status === 401) {
        setSubmit({ kind: 'error', message: 'Dieser Link ist abgelaufen. Bitte fordern Sie eine neue Einladung an: info@brightmedical.de' })
      } else {
        setSubmit({ kind: 'error', message: data.error || `Fehler ${res.status}. Bitte erneut versuchen.` })
      }
    } catch {
      setSubmit({ kind: 'error', message: 'Netzwerk-Fehler, bitte Verbindung prüfen und erneut versuchen.' })
    }
  }

  // ---- Invalid / expired link ----
  if (!token || !payload || expired) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <h1 className="font-heading text-2xl text-[var(--color-navy)] mb-4">Link nicht gültig</h1>
          <p className="text-slate-600 leading-relaxed mb-8">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie eine neue
            Einladung an unter{' '}
            <a href="mailto:info@brightmedical.de" className="text-[var(--color-teal)] underline">
              info@brightmedical.de
            </a>.
          </p>
          <a href="/" className="inline-block px-6 py-3 rounded-full bg-[var(--color-navy)] text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  // ---- Success ----
  if (submit.kind === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--color-success)] mx-auto flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 12 10 17 19 8" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl text-[var(--color-navy)] mb-4">Vielen Dank!</h1>
          <p className="text-slate-600 leading-relaxed mb-8">
            Ihre Coaching-Vereinbarung ist bestätigt. Sie erhalten gleich eine
            Bestätigung per E-Mail — mit der vollständigen Vereinbarung als PDF.
            Ich melde mich in Kürze, damit wir starten.
          </p>
          <a href="/" className="inline-block px-6 py-3 rounded-full bg-[var(--color-navy)] text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[var(--color-teal)] focus:ring-2 focus:ring-[var(--color-teal)]/20 outline-none transition-all text-sm'

  // ---- Form ----
  return (
    <div className="min-h-[80vh] bg-[var(--color-slate-light)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-teal)] font-semibold mb-3">
            Coaching-Vereinbarung
          </p>
          <h1 className="font-heading text-3xl md:text-4xl text-[var(--color-navy)] leading-tight mb-3">
            Vereinbarung bestätigen
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Bitte prüfen Sie Ihre Angaben, lesen Sie die Bedingungen und bestätigen Sie die
            Coaching-Vereinbarung. Die vollständige Vereinbarung erhalten Sie anschließend als PDF.
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          {/* Paket-Karte */}
          <div className="rounded-xl bg-[var(--color-slate-light)] p-5 mb-7">
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-1">Ihr Paket</div>
            <div className="font-medium text-[var(--color-navy)]">{payload.paketLabel}</div>
            <div className="text-sm text-slate-500 mt-0.5">{payload.paketPreis}</div>
          </div>

          {/* Persönliche Daten */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">Name, Vorname</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="anschrift" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">Anschrift</label>
              <input id="anschrift" type="text" value={anschrift} onChange={(e) => setAnschrift(e.target.value)} maxLength={200} placeholder="Straße Nr., PLZ Ort" className={inputCls} autoComplete="street-address" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="geburtsdatum" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">Geburtsdatum</label>
                <input id="geburtsdatum" type="text" value={geburtsdatum} onChange={(e) => setGeburtsdatum(e.target.value)} maxLength={20} placeholder="TT.MM.JJJJ" className={inputCls} />
              </div>
              <div>
                <label htmlFor="telefon" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">Telefon</label>
                <input id="telefon" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} maxLength={40} className={inputCls} autoComplete="tel" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">E-Mail</label>
              <input type="email" value={payload.sub} readOnly className={inputCls + ' bg-slate-50 text-slate-500'} />
            </div>
          </div>

          {/* Bedingungen */}
          <div className="mt-7 rounded-xl border border-slate-200 p-5 text-sm text-slate-600 leading-relaxed">
            <div className="font-medium text-[var(--color-navy)] mb-2">Wichtigste Bedingungen</div>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Gewerbliche Coaching-Dienstleistung — <strong>keine ärztliche Behandlung, keine Therapie, kein Heilversprechen</strong>. Ärztliche Leistungen werden separat über die Praxis nach GOÄ abgerechnet.</li>
              <li>Dienstvertrag nach § 611 BGB — geschuldet ist die ordnungsgemäße Leistung, kein bestimmter Erfolg.</li>
              <li>Individuelle Beratung, kein Lehrgang/Fernunterricht (FernUSG).</li>
              <li><strong>14 Tage Widerrufsrecht</strong> ab Vertragsschluss (Widerrufsbelehrung in der PDF-Bestätigung).</li>
            </ul>
            <p className="mt-3">
              Die vollständigen Bedingungen finden Sie in den{' '}
              <a href="/agb" target="_blank" rel="noopener" className="text-[var(--color-teal)] underline">AGB</a>{' '}
              und in der Vereinbarung, die Sie nach der Bestätigung als PDF erhalten.
            </p>
          </div>

          {/* Zustimmung */}
          <label className="mt-6 flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--color-teal)] shrink-0" />
            <span className="text-sm text-slate-700 leading-relaxed">
              Ich habe die Coaching-Vereinbarung und die Widerrufsbelehrung gelesen und stimme dem Vertrag zu.
            </span>
          </label>

          {/* Unterschrift */}
          <div className="mt-5">
            <label htmlFor="signature" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
              Unterschrift — Ihr vollständiger Name in Druckbuchstaben
            </label>
            <input id="signature" type="text" value={signature} onChange={(e) => setSignature(e.target.value)} maxLength={120} placeholder="z. B. MAX MUSTERMANN" className={inputCls} />
          </div>

          {submit.kind === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {submit.message}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={send}
              disabled={!ready || submit.kind === 'submitting'}
              className="w-full px-6 py-4 rounded-full bg-[var(--color-teal)] text-white font-semibold hover:bg-[var(--color-teal-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submit.kind === 'submitting' ? 'Wird bestätigt …' : 'Vereinbarung verbindlich bestätigen'}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-6">
            Ihre Bestätigung wird mit Datum und Uhrzeit protokolliert (Textform gem. § 11).
          </p>
        </div>
      </div>
    </div>
  )
}
