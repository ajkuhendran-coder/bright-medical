import { useState, useEffect, useMemo } from 'react'
import {
  STEPS,
  questionsForStep,
  totalSteps,
  type Answers,
  type Question,
} from '../data/fragebogen-questions'

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

// Lese Token aus URL `?t=...`, wird beim Submit mitgegeben.
// Frontend macht KEINE Token-Validation, Server ist die Wahrheit.
// Wir prüfen nur: Token vorhanden ja/nein, und ob er strukturell aussieht wie JWT.
function readUrlToken(): string | null {
  if (typeof window === 'undefined') return null
  const u = new URL(window.location.href)
  const t = u.searchParams.get('t')
  if (!t) return null
  // Sehr leichte Strukturprüfung: <payload>.<signature>
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) return null
  return t
}

export default function Fragebogen() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' })
  const [honeypot, setHoneypot] = useState('')
  const token = useMemo(readUrlToken, [])

  useEffect(() => {
    document.title = 'Qualifizierungsfragebogen | Bright Medical'
    let m = document.querySelector('meta[name="robots"]')
    if (!m) {
      m = document.createElement('meta')
      m.setAttribute('name', 'robots')
      document.head.appendChild(m)
    }
    m.setAttribute('content', 'noindex,nofollow')
  }, [])

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step, submit.kind])

  const total = totalSteps()
  const currentStepDef = STEPS[step - 1]
  const currentQuestions = useMemo(() => questionsForStep(step), [step])
  const progressPct = (step / total) * 100

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors((e) => ({ ...e, [id]: '' }))
  }

  function validateStep(): boolean {
    const stepErrors: Record<string, string> = {}
    for (const q of currentQuestions) {
      if (!q.required) continue
      const v = (answers[q.id] || '').trim()
      if (!v) stepErrors[q.id] = 'Bitte ausfüllen.'
    }
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  function next() {
    if (!validateStep()) return
    if (step < total) setStep((step + 1) as 1 | 2 | 3 | 4 | 5)
  }
  function prev() {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4 | 5)
  }

  async function onSubmit() {
    if (!validateStep()) return
    setSubmit({ kind: 'submitting' })
    try {
      const res = await fetch('/.netlify/functions/submit-questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          honeypot,
          token: token || undefined,
          startedAt: new Date().toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setSubmit({ kind: 'success' })
      } else if (res.status === 429) {
        setSubmit({ kind: 'error', message: 'Zu viele Anfragen, bitte später erneut versuchen.' })
      } else if (res.status === 401) {
        setSubmit({
          kind: 'error',
          message:
            data.reason === 'expired'
              ? 'Ihr Einladungs-Link ist abgelaufen. Bitte fragen Sie eine neue Einladung an: info@brightmedical.de'
              : 'Diese Einladung ist nicht (mehr) gültig. Bitte fragen Sie eine neue Einladung an: info@brightmedical.de',
        })
      } else {
        setSubmit({
          kind: 'error',
          message: data.error || `Fehler ${res.status}. Bitte erneut versuchen.`,
        })
      }
    } catch (e: any) {
      setSubmit({
        kind: 'error',
        message: 'Netzwerk-Fehler, bitte Verbindung prüfen und erneut versuchen.',
      })
    }
  }

  // ---- Success Screen ----
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
          <p className="text-slate-600 leading-relaxed mb-2">
            Ihre Antworten sind bei mir angekommen.
          </p>
          <p className="text-slate-600 leading-relaxed mb-8">
            Ich melde mich innerhalb von 24 Stunden persönlich bei Ihnen, entweder mit
            einem Vorschlag für unser kostenloses Erstgespräch oder mit weiteren Fragen.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-full bg-[var(--color-navy)] text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors"
          >
            Zur Startseite
          </a>
        </div>
      </div>
    )
  }

  // ---- Form Wizard ----
  return (
    <div className="min-h-[80vh] bg-[var(--color-slate-light)] py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-teal)] font-semibold mb-3">
            Qualifizierungsfragebogen
          </p>
          <h1 className="font-heading text-3xl md:text-4xl text-[var(--color-navy)] leading-tight mb-3">
            Erzählen Sie mir kurz von sich.
          </h1>
          <p className="text-slate-600 leading-relaxed">
            5 Schritte, ca. 5–7 Minuten. Ihre Antworten helfen mir, unser kostenloses
            Erstgespräch optimal vorzubereiten.
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8" aria-label="Fortschritt">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-slate-600">
              Schritt <strong className="text-[var(--color-navy)]">{step}</strong> von {total}
            </span>
            <span className="text-slate-500">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-teal)] to-[var(--color-teal-dark)] transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm">

          {/* Step heading */}
          <div className="mb-8">
            <h2 className="font-heading text-2xl text-[var(--color-navy)] mb-2">
              {currentStepDef.title}
            </h2>
            {currentStepDef.description && (
              <p className="text-sm text-slate-600">{currentStepDef.description}</p>
            )}
          </div>

          {/* Honeypot (hidden) */}
          <div style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
            <label>
              Bitte nicht ausfüllen
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          {/* Questions */}
          <div className="space-y-7">
            {currentQuestions.map((q) => (
              <QuestionField
                key={q.id}
                q={q}
                value={answers[q.id] || ''}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
          </div>

          {/* Submit error */}
          {submit.kind === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {submit.message}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={prev}
                disabled={submit.kind === 'submitting'}
                className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                ← Zurück
              </button>
            ) : (
              <span />
            )}

            {step < total ? (
              <button
                type="button"
                onClick={next}
                className="px-6 py-3 rounded-full bg-[var(--color-navy)] text-white font-medium hover:bg-[var(--color-navy-light)] transition-colors"
              >
                Weiter →
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submit.kind === 'submitting'}
                className="px-8 py-3 rounded-full bg-gradient-to-b from-[var(--color-teal)] to-[var(--color-teal-dark)] text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
              >
                {submit.kind === 'submitting' ? 'Wird gesendet …' : 'Antworten abschicken'}
              </button>
            )}
          </div>
        </div>

        {/* Privacy hint */}
        <p className="mt-6 text-xs text-slate-500 text-center leading-relaxed max-w-md mx-auto">
          Ihre Angaben sind vertraulich und werden ausschließlich für die Vorbereitung
          des Erstgesprächs verwendet. Mehr in unserer{' '}
          <a href="/datenschutz" className="text-[var(--color-teal)] underline">
            Datenschutzerklärung
          </a>
          .
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function QuestionField({
  q,
  value,
  error,
  onChange,
}: {
  q: Question
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const id = `q-${q.id}`
  return (
    <div>
      <label htmlFor={q.type === 'radio' ? undefined : id} className="block">
        <span className="block font-medium text-[var(--color-navy)] mb-1">
          {q.label}
          {q.required && <span className="text-[var(--color-teal)] ml-1">*</span>}
          {!q.required && <span className="text-slate-400 ml-1 text-sm">(optional)</span>}
        </span>
        {q.hint && <span className="block text-xs text-slate-500 mb-2">{q.hint}</span>}
      </label>

      {q.type === 'text' && (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          className={`w-full px-4 py-3 rounded-xl border ${
            error ? 'border-red-300' : 'border-slate-300'
          } focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent transition-shadow`}
        />
      )}

      {q.type === 'textarea' && (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          rows={4}
          className={`w-full px-4 py-3 rounded-xl border ${
            error ? 'border-red-300' : 'border-slate-300'
          } focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent transition-shadow resize-y`}
        />
      )}

      {q.type === 'radio' && q.options && (
        <fieldset className="space-y-2 mt-2">
          <legend className="sr-only">{q.label}</legend>
          {q.options.map((opt) => {
            const checked = value === opt
            return (
              <label
                key={opt}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? 'border-[var(--color-teal)] bg-[var(--color-teal)]/5'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={checked}
                  onChange={(e) => onChange(e.target.value)}
                  className="mt-1 accent-[var(--color-teal)]"
                />
                <span className="text-sm text-slate-700 leading-relaxed">{opt}</span>
              </label>
            )
          })}
        </fieldset>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
