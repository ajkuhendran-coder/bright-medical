import { useState } from 'react'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function Contact() {
  const ref = useScrollAnimation()
  const [formState, setFormState] = useState<FormState>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    privacy: false,
    honeypot: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target
    const value = target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value
    setFormData((prev) => ({ ...prev, [target.name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.honeypot) return

    setFormState('submitting')

    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Fehler beim Senden')

      setFormState('success')
      setFormData({ name: '', email: '', phone: '', message: '', privacy: false, honeypot: '' })
    } catch {
      setFormState('error')
    }
  }

  if (formState === 'success') {
    return (
      <section id="kontakt" className="py-20 lg:py-28 bg-navy" ref={ref}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-on-scroll">
            <CheckCircle size={64} className="text-teal mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Vielen Dank für Ihre Anfrage!
            </h2>
            <p className="text-white/70 mb-4">
              Wir haben Ihre Nachricht erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.
            </p>
            <p className="text-white/50 text-sm">
              Sie erhalten in Kürze eine Bestätigungsemail mit weiteren Informationen.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="kontakt" className="py-20 lg:py-28 bg-navy" ref={ref}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Der erste Schritt</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
            Kostenloses Erstgespräch sichern
          </h2>
          <p className="text-white/60">
            Erzählen Sie uns kurz, was Sie beschäftigt — wir melden uns innerhalb von 24 Stunden.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="animate-on-scroll bg-white rounded-2xl p-8 shadow-2xl">
          {/* Honeypot */}
          <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm" placeholder="Vor- und Nachname" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">E-Mail *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm" placeholder="ihre@email.de" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-navy mb-1.5">Telefon (optional)</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm" placeholder="+49 ..." />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-navy mb-1.5">Was beschäftigt Sie gerade? *</label>
            <textarea name="message" value={formData.message} onChange={handleChange} required rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none transition-all text-sm resize-none" placeholder="Beschreiben Sie kurz Ihre Situation — Gewicht, Energie, Hormone, oder etwas anderes..." />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="privacy" checked={formData.privacy} onChange={handleChange} required className="mt-0.5 w-5 h-5 rounded border-gray-300 text-teal focus:ring-teal" />
              <span className="text-xs text-slate-body/60 leading-relaxed">
                Ich habe die Datenschutzerklärung gelesen und bin mit der Verarbeitung meiner Daten
                zur Beantwortung meiner Anfrage einverstanden. *
              </span>
            </label>
          </div>

          {formState === 'error' && (
            <div className="mb-4 flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
              <AlertCircle size={18} />
              <span>Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.</span>
            </div>
          )}

          <button type="submit" disabled={formState === 'submitting'} className="w-full bg-teal hover:bg-teal-dark text-white py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-lg shadow-teal/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {formState === 'submitting' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send size={18} />
                Erstgespräch anfragen
              </>
            )}
          </button>

          <p className="text-xs text-center text-slate-body/40 mt-4">
            Kostenlos & unverbindlich. Coaching-Dienstleistung im zweiten Gesundheitsmarkt.
          </p>
        </form>
      </div>
    </section>
  )
}
