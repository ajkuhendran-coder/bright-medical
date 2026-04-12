import { Scale, BatteryLow, Activity, Moon, Brain, HeartPulse } from 'lucide-react'
import { painPoints } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const iconMap: Record<string, React.ElementType> = {
  Scale, Battery: BatteryLow, Activity, Moon, Brain, HeartPulse,
}

export default function PainPoints() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-slate-light" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Kennen Sie das?</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Wenn der Körper Signale sendet, die niemand hört
          </h2>
          <p className="text-lg text-slate-body/70 max-w-2xl mx-auto">
            Sie haben schon vieles versucht. Und fragen sich: Warum sollte es diesmal anders sein?
            Weil wir nicht an der Oberfläche bleiben — sondern verstehen, was Ihr Körper wirklich braucht.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {painPoints.map((point, i) => {
            const Icon = iconMap[point.icon]
            return (
              <div
                key={i}
                className="animate-on-scroll premium-card bg-white rounded-2xl p-8 border border-gray-100"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center mb-5">
                  <Icon size={24} className="text-teal" />
                </div>
                <h3 className="text-xl font-bold text-navy mb-3 font-[var(--font-heading)]">
                  {point.title}
                </h3>
                <p className="text-slate-body/70 text-sm leading-relaxed">
                  {point.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
