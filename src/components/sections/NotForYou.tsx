import { XCircle } from 'lucide-react'
import { notForYouItems } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

export default function NotForYou() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-slate-light" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-on-scroll text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-6">
            Dieses Programm ist nicht für Sie, wenn...
          </h2>
          <p className="text-slate-body/70">
            Ehrlichkeit ist uns wichtig. Unser Coaching funktioniert nur mit Ihrer aktiven Mitarbeit.
          </p>
        </div>

        <div className="animate-on-scroll space-y-4 mb-12">
          {notForYouItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-white rounded-xl p-5 border border-gray-100"
            >
              <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-slate-body/80 text-sm">{item}</p>
            </div>
          ))}
        </div>

        <div className="animate-on-scroll text-center">
          <p className="text-lg text-navy font-semibold mb-6 font-[var(--font-heading)]">
            Aber wenn Sie bereit sind, Verantwortung für Ihre Gesundheit zu übernehmen...
          </p>
          <button
            onClick={() => document.querySelector('#kontakt')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-success hover:bg-green-700 text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-lg shadow-green-500/25"
          >
            Klingt nach mir — ich möchte ein Erstgespräch
          </button>
        </div>
      </div>
    </section>
  )
}
