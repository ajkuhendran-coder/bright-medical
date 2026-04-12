import { MessageCircle, ClipboardList, PlayCircle, HeartHandshake } from 'lucide-react'
import { processSteps } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const icons = [MessageCircle, ClipboardList, PlayCircle, HeartHandshake]

export default function ProcessSteps() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">So starten Sie</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            In 4 Schritten zu Ihrem Coaching
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {processSteps.map((step, i) => {
            const Icon = icons[i]
            return (
              <div
                key={i}
                className="animate-on-scroll text-center relative"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Connector */}
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-0.5 bg-gray-200" />
                )}

                <div className="w-20 h-20 bg-navy rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                  <Icon size={32} className="text-teal" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-3 font-[var(--font-heading)]">{step.title}</h3>
                <p className="text-slate-body/70 text-sm leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
