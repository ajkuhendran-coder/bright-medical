import { Search, FileText, Users } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const pillars = [
  {
    icon: Search,
    title: 'Wir analysieren',
    description: 'Umfassende Diagnostik, die über den Kassenstandard hinausgeht. Wir schauen auf das, was andere übersehen — damit wir verstehen, warum Ihr Körper nicht mitspielt.',
  },
  {
    icon: FileText,
    title: 'Wir stabilisieren',
    description: 'Ihr individueller Plan: Ernährung, Bewegung, Schlaf, Supplemente — maßgeschneidert auf Ihre Biologie. Kein Schema F, kein Trend. Sondern das, was für SIE funktioniert.',
  },
  {
    icon: Users,
    title: 'Wir sichern langfristig',
    description: 'Regelmäßige Coaching-Calls, WhatsApp-Support und ärztliche Kontrollen. Sie sind nie allein — und Ihre Ergebnisse bleiben.',
  },
]

export default function Approach() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Der Dirigent</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Medizin, die zusammendenkt
          </h2>
          <p className="text-lg text-slate-body/70 max-w-3xl mx-auto">
            Ein Orchester mit 20 Spezialisten spielt Lärm, wenn niemand den Takt vorgibt.
            Der Kardiologe optimiert das Herz, der Endokrinologe die Schilddrüse — aber niemand sieht das Gesamtbild.
            Bright Medical hält alle Fäden zusammen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => (
            <div
              key={i}
              className="animate-on-scroll text-center p-8"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
                <pillar.icon size={28} className="text-teal" />
              </div>
              <h3 className="text-2xl font-bold text-navy mb-4">{pillar.title}</h3>
              <p className="text-slate-body/70 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
