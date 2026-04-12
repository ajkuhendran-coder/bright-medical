import { Quote } from 'lucide-react'
import { testimonials } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

export default function Testimonials() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Erfahrungen</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Was Teilnehmer berichten
          </h2>
          <p className="text-sm text-slate-body/50">
            Beispielhafte Erfahrungsberichte — individuelle Ergebnisse können variieren.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="animate-on-scroll premium-card bg-slate-light rounded-2xl p-8 relative"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <Quote size={32} className="text-teal/20 mb-4" />
              <p className="text-slate-body/80 leading-relaxed mb-6 italic font-[var(--font-heading)]">
                „{t.quote}"
              </p>
              <div className="border-t border-gray-200 pt-4">
                <p className="font-semibold text-navy text-sm">
                  {t.initials}, {t.age} Jahre
                </p>
                <p className="text-xs text-teal">{t.program}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
