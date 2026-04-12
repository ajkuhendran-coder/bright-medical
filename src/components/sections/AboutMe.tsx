import { Check } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const qualifications = [
  'Facharzt für Allgemeinmedizin',
  'Funktionelle Medizin & erweiterte Diagnostik',
  'Longevity-Medizin & Biohacking',
  'Eigene Erfahrung — ich praktiziere, was ich empfehle',
]

export default function AboutMe() {
  const ref = useScrollAnimation()

  return (
    <section id="ueber-mich" className="py-20 lg:py-28 bg-slate-light" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Photo */}
          <div className="animate-on-scroll">
            <div className="relative">
              <div className="absolute -inset-4 bg-teal/10 rounded-3xl -rotate-3" />
              <img
                src="/images/doctor-coat.png"
                alt="Dr. med. Ajanth Kuhendran"
                className="relative rounded-2xl w-full max-w-md mx-auto lg:mx-0 shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>

          {/* Content */}
          <div className="animate-on-scroll" style={{ transitionDelay: '200ms' }}>
            <span className="text-teal text-sm font-semibold tracking-wider uppercase">Ihr Arzt & Coach</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy mt-4 mb-6">
              Dr. med. Ajanth Kuhendran
            </h2>
            <p className="text-lg text-slate-body/60 mb-2">
              Facharzt für Allgemeinmedizin | Praxis KUHENDRAN, Bruchsal
            </p>

            <div className="space-y-4 mt-8 mb-8">
              <p className="text-slate-body/80 leading-relaxed">
                Ich habe jahrelang in der klassischen Kassenmedizin gearbeitet — und dabei immer wieder dasselbe erlebt:
                Menschen sitzen vor mir, ihre Blutwerte sind „in Ordnung", aber sie fühlen sich alles andere als gut.
                15-Minuten-Termine reichen nicht, um wirklich hinzuschauen.
              </p>
              <p className="text-slate-body/80 leading-relaxed">
                Das hat mich nicht losgelassen. Ich wollte verstehen, warum der Körper Signale sendet,
                die im Kassenstandard untergehen. Heute verbinde ich ärztliches Wissen mit persönlichem
                Coaching — für Menschen, die mehr wollen als „das ist halt so".
              </p>
              <p className="text-slate-body/80 leading-relaxed italic font-[var(--font-heading)] text-navy text-lg">
                „Ich praktiziere selbst, was ich empfehle — vom CGM-Monitoring über Wearable-Tracking
                bis zur gezielten Supplementierung. Nicht weil es modern ist, sondern weil es funktioniert."
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {qualifications.map((q) => (
                <li key={q} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-teal/10 rounded-full flex items-center justify-center shrink-0">
                    <Check size={14} className="text-teal" />
                  </div>
                  <span className="text-sm font-medium text-slate-body">{q}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => document.querySelector('#kontakt')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-lg shadow-teal/25"
            >
              Lernen Sie mich kennen — im kostenlosen Erstgespräch
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
