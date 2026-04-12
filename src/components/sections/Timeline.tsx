import { timelineSteps } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

export default function Timeline() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-navy" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Ihr Weg</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
            Was Sie in den ersten 12 Wochen erwartet
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {timelineSteps.map((step, i) => (
            <div
              key={i}
              className="animate-on-scroll relative"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Connector line */}
              {i < timelineSteps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-0.5 bg-teal/30" />
              )}

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="w-10 h-10 bg-teal rounded-full flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-sm">{i + 1}</span>
                </div>
                <span className="text-teal text-xs font-semibold tracking-wider uppercase">
                  {step.weeks}
                </span>
                <h3 className="text-lg font-bold text-white mt-2 mb-3 font-[var(--font-heading)]">
                  {step.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
