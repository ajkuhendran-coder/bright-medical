import { Scale, TestTubes, Heart, Smile } from 'lucide-react'
import { metrics } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const iconMap: Record<string, React.ElementType> = {
  Scale, TestTubes, Heart, Smile,
}

export default function Metrics() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-slate-light" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Messbare Ergebnisse</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Wir messen, was sich verändert
          </h2>
          <p className="text-lg text-slate-body/70 max-w-2xl mx-auto">
            Nicht nur auf der Waage — sondern in allen Dimensionen Ihrer Gesundheit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, i) => {
            const Icon = iconMap[metric.icon]
            return (
              <div
                key={i}
                className="animate-on-scroll premium-card bg-white rounded-2xl p-6 text-center border border-gray-100"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={28} className="text-teal" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2 font-[var(--font-heading)]">{metric.title}</h3>
                <p className="text-sm text-slate-body/70 leading-relaxed">{metric.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
