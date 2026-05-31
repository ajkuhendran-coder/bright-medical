import { Check, X } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const isIt = [
  'Strukturierte Begleitung in Ernährung, Bewegung, Schlaf, Stressregulation',
  'Individueller Plan auf Basis Ihrer Biologie und Ziele',
  'Regelmäßige Coaching-Calls und Impulse zwischen den Terminen',
  'Wissen, Struktur und Motivation für nachhaltige Veränderung',
]

const isNot = [
  'Keine ärztliche Heilbehandlung oder Therapie',
  'Keine Diagnose- oder Rezeptausstellung',
  'Keine Kassenleistung und kein Ersatz für den Arztbesuch',
  'Keine Versprechen: Ihr Ergebnis hängt von Ihrer Mitarbeit ab',
]

export default function ScopeDefinition() {
  const ref = useScrollAnimation()

  return (
    <section id="abgrenzung" className="py-20 lg:py-28 bg-slate-light" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Klar abgegrenzt</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Was Bright Medical ist. Und was nicht.
          </h2>
          <p className="text-slate-body/70 max-w-2xl mx-auto leading-relaxed">
            Transparenz von Anfang an. Damit Sie wissen, worauf Sie sich einlassen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-on-scroll">
          {/* Das ist Bright Medical */}
          <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center shrink-0">
                <Check size={20} className="text-teal" />
              </div>
              <h3 className="text-xl font-bold text-navy">Das ist Bright Medical</h3>
            </div>
            <ul className="space-y-3">
              {isIt.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check size={16} className="text-teal shrink-0 mt-1" />
                  <span className="text-slate-body/80 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Das ist es nicht */}
          <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-body/10 rounded-full flex items-center justify-center shrink-0">
                <X size={20} className="text-slate-body/60" />
              </div>
              <h3 className="text-xl font-bold text-navy">Das ist es nicht</h3>
            </div>
            <ul className="space-y-3">
              {isNot.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X size={16} className="text-slate-body/50 shrink-0 mt-1" />
                  <span className="text-slate-body/80 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Hinweis */}
        <div className="mt-8 animate-on-scroll bg-navy/5 border-l-4 border-teal rounded-r-xl px-6 py-5">
          <p className="text-sm text-slate-body/80 leading-relaxed">
            <strong className="text-navy">Klare Trennung:</strong>{' '}
            Ärztliche Behandlungen, Diagnostik und Therapie erfolgen ausschließlich in der{' '}
            <strong className="text-navy">Praxis Kuhendran</strong> im Rahmen der kassen&shy;ärztlichen
            Regelversorgung. Bright Medical ist ein eigen&shy;ständiges Coaching-Angebot im
            zweiten Gesundheits&shy;markt, unabhängig von der Praxis&shy;tätigkeit.
          </p>
        </div>
      </div>
    </section>
  )
}
