import { useEffect, useMemo, useState } from 'react'

// Terminwahl-Seite für das Erstgespräch.
// Liest die vom Arzt vorgewählten Slots aus dem signierten JWT (?t=...),
// zeigt sie zur Auswahl ODER bietet "kein Termin passt" mit Freitext-Wunsch.
// Die Signatur prüft der Server — clientseitig wird der Payload nur angezeigt.

type Slot = { id: string; start: string; dauer: number }
type TerminPayload = { sub: string; exp: number; scope: string; slots: Slot[] }

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; mode: 'selected' | 'wunsch'; human?: string }
  | { kind: 'error'; message: string }

function readUrlToken(): string | null {
  if (typeof window === 'undefined') return null
  const t = new URL(window.location.href).searchParams.get('t')
  if (!t) return null
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) return null
  return t
}

function decodePayload(token: string): TerminPayload | null {
  try {
    const b64url = token.split('.')[0]
    const pad = b64url.length % 4 === 0 ? '' : '='.repeat(4 - (b64url.length % 4))
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const p = JSON.parse(json) as TerminPayload
    if (p.scope !== 'termin' || !Array.isArray(p.slots) || p.slots.length === 0) return null
    return p
  } catch {
    return null
  }
}

function formatSlot(startISO: string): { datum: string; zeit: string } {
  const d = new Date(startISO)
  if (isNaN(d.getTime())) return { datum: startISO, zeit: '' }
  const datum = d.toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  })
  const zeit = d.toLocaleTimeString('de-DE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  })
  return { datum, zeit }
}

export default function Termin() {
  const token = useMemo(readUrlToken, [])
  const payload = useMemo(() => (token ? decodePayload(token) : null), [token])
  const [selected, setSelected] = useState<string>('')
  const [telefon, setTelefon] = useState('')
  const [wunschMode, setWunschMode] = useState(false)
  const [wunschText, setWunschText] = useState('')
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' })

  useEffect(() => {
    document.title = 'Terminwahl | Bright Medical'
    let m = document.querySelector('meta[name="robots"]')
    if (!m) {
      m = document.createElement('meta')
      m.setAttribute('name', 'robots')
      document.head.appendChild(m)
    }
    m.setAttribute('content', 'noindex,nofollow')
  }, [])

  const expired = payload ? payload.exp < Date.now() : false

  async function post(payloadBody: Record<string, unknown>): Promise<any> {
    const res = await fetch('/.netlify/functions/submit-termin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBody),
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  }

  function handleError(res: Response, data: any) {
    if (res.status === 429) {
      setSubmit({ kind: 'error', message: 'Zu viele Anfragen, bitte später erneut versuchen.' })
    } else if (res.status === 401) {
      setSubmit({ kind: 'error', message: 'Dieser Link ist abgelaufen. Bitte fragen Sie eine neue Einladung an: info@brightmedical.de' })
    } else {
      setSubmit({ kind: 'error', message: data.error || `Fehler ${res.status}. Bitte erneut versuchen.` })
    }
  }

  async function chooseSlot() {
    if (!token || !selected || telefon.trim().length < 5) return
    setSubmit({ kind: 'submitting' })
    try {
      const { res, data } = await post({ token, slotId: selected, telefon: telefon.trim() })
      if (res.ok && data.ok) setSubmit({ kind: 'success', mode: 'selected', human: data.slot?.human || '' })
      else handleError(res, data)
    } catch {
      setSubmit({ kind: 'error', message: 'Netzwerk-Fehler, bitte Verbindung prüfen und erneut versuchen.' })
    }
  }

  async function sendWunsch() {
    if (!token || !wunschText.trim()) return
    setSubmit({ kind: 'submitting' })
    try {
      const { res, data } = await post({ token, wunsch: wunschText.trim(), ...(telefon.trim() ? { telefon: telefon.trim() } : {}) })
      if (res.ok && data.ok) setSubmit({ kind: 'success', mode: 'wunsch' })
      else handleError(res, data)
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
            Dieser Termin-Link ist ungültig oder abgelaufen. Bitte fragen Sie eine neue
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
    const isWunsch = submit.mode === 'wunsch'
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--color-success)] mx-auto flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 12 10 17 19 8" />
            </svg>
          </div>
          {isWunsch ? (
            <>
              <h1 className="font-heading text-3xl text-[var(--color-navy)] mb-4">Danke!</h1>
              <p className="text-slate-600 leading-relaxed mb-8">
                Ihre Rückmeldung ist bei mir angekommen. Ich melde mich in Kürze persönlich
                mit passenderen Terminvorschlägen bei Ihnen.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-heading text-3xl text-[var(--color-navy)] mb-4">Termin reserviert!</h1>
              {submit.human && <p className="text-[var(--color-navy)] font-medium mb-2">{submit.human}</p>}
              <p className="text-slate-600 leading-relaxed mb-8">
                Sie bekommen gleich eine Bestätigung per E-Mail — mit Kalender-Eintrag zum
                Hinzufügen. Ich melde mich zur vereinbarten Zeit bei Ihnen.
              </p>
            </>
          )}
          <a href="/" className="inline-block px-6 py-3 rounded-full bg-[var(--color-navy)] text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  // ---- Selection / Wunsch ----
  return (
    <div className="min-h-[80vh] bg-[var(--color-slate-light)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-teal)] font-semibold mb-3">
            Erstgespräch
          </p>
          <h1 className="font-heading text-3xl md:text-4xl text-[var(--color-navy)] leading-tight mb-3">
            {wunschMode ? 'Wann passt es Ihnen besser?' : 'Wählen Sie Ihren Wunschtermin.'}
          </h1>
          <p className="text-slate-600 leading-relaxed">
            {wunschMode
              ? 'Sagen Sie mir kurz, wann es Ihnen zeitlich am besten passt — ich melde mich mit passenden Terminen.'
              : 'Bitte wählen Sie einen der folgenden Termine für unser kostenloses Erstgespräch.'}
          </p>
        </header>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">

          {!wunschMode && (
            <>
              <div className="space-y-3">
                {payload.slots.map((s) => {
                  const { datum, zeit } = formatSlot(s.start)
                  const active = selected === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className={
                        'w-full text-left rounded-xl border-2 px-5 py-4 transition-all flex items-center justify-between gap-4 ' +
                        (active
                          ? 'border-[var(--color-teal)] bg-[var(--color-teal)]/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white')
                      }
                    >
                      <span>
                        <span className="block font-medium text-[var(--color-navy)]">{datum}</span>
                        <span className="block text-sm text-slate-500 mt-0.5">{zeit} Uhr · {s.dauer} Min</span>
                      </span>
                      <span
                        className={
                          'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ' +
                          (active ? 'border-[var(--color-teal)] bg-[var(--color-teal)]' : 'border-slate-300')
                        }
                        aria-hidden="true"
                      >
                        {active && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="5 12 10 17 19 8" />
                          </svg>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6">
                <label htmlFor="telefon" className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
                  Ihre Telefonnummer
                </label>
                <input
                  id="telefon"
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  maxLength={40}
                  placeholder="+49 …"
                  autoComplete="tel"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[var(--color-teal)] focus:ring-2 focus:ring-[var(--color-teal)]/20 outline-none transition-all text-sm"
                />
                <p className="mt-1.5 text-xs text-slate-400">Unter dieser Nummer erreiche ich Sie zum Erstgespräch.</p>
              </div>

              {submit.kind === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {submit.message}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={chooseSlot}
                  disabled={!selected || telefon.trim().length < 5 || submit.kind === 'submitting'}
                  className="w-full px-6 py-4 rounded-full bg-[var(--color-teal)] text-white font-semibold hover:bg-[var(--color-teal-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submit.kind === 'submitting' ? 'Wird reserviert …' : 'Termin verbindlich wählen'}
                </button>
                <button
                  type="button"
                  onClick={() => { setWunschMode(true); setSubmit({ kind: 'idle' }) }}
                  className="w-full mt-3 text-sm text-slate-500 hover:text-[var(--color-navy)] underline underline-offset-2 transition-colors"
                >
                  Keiner dieser Termine passt?
                </button>
              </div>
            </>
          )}

          {wunschMode && (
            <>
              <label htmlFor="wunsch" className="block text-sm font-medium text-[var(--color-navy)] mb-2">
                Ihr Terminwunsch
              </label>
              <textarea
                id="wunsch"
                rows={4}
                value={wunschText}
                onChange={(e) => setWunschText(e.target.value)}
                maxLength={1500}
                placeholder="z. B. „Am besten Montag- oder Mittwochnachmittag, oder freitags vormittags."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[var(--color-teal)] focus:ring-2 focus:ring-[var(--color-teal)]/20 outline-none transition-all text-sm resize-none"
              />

              {submit.kind === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {submit.message}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={sendWunsch}
                  disabled={!wunschText.trim() || submit.kind === 'submitting'}
                  className="w-full px-6 py-4 rounded-full bg-[var(--color-teal)] text-white font-semibold hover:bg-[var(--color-teal-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submit.kind === 'submitting' ? 'Wird gesendet …' : 'Terminwunsch absenden'}
                </button>
                <button
                  type="button"
                  onClick={() => { setWunschMode(false); setSubmit({ kind: 'idle' }) }}
                  className="w-full mt-3 text-sm text-slate-500 hover:text-[var(--color-navy)] underline underline-offset-2 transition-colors"
                >
                  Zurück zur Terminauswahl
                </button>
              </div>
            </>
          )}

          <p className="text-xs text-slate-400 text-center mt-6">
            Kostenloses Erstgespräch · keine Diagnose, keine Behandlung
          </p>
        </div>
      </div>
    </div>
  )
}
