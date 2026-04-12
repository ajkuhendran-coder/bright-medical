import { useState } from 'react'
import { Scale, Zap, Leaf, Sparkles, ArrowRight } from 'lucide-react'
import { programs } from '../../data/content'
import type { Program } from '../../data/content'
import ProgramModal from './ProgramModal'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const iconMap: Record<string, React.ElementType> = {
  Scale, Zap, Leaf, Sparkles,
}

export default function Programs() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const ref = useScrollAnimation()

  const leadProgram = programs.find((p) => p.isLead)!
  const otherPrograms = programs.filter((p) => !p.isLead)

  return (
    <>
      <section id="programme" className="py-20 lg:py-28 bg-slate-light" ref={ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-on-scroll">
            <span className="text-teal text-sm font-semibold tracking-wider uppercase">Unsere Programme</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
              Ihr erster Schritt zu nachhaltiger Gesundheit
            </h2>
            <p className="text-lg text-slate-body/70 max-w-2xl mx-auto">
              Ein Ziel: Ihre Gesundheit nachhaltig optimieren — mit ärztlicher Expertise und persönlichem Coaching. Wir empfehlen, mit unserem Hauptprogramm zu starten.
            </p>
          </div>

          {/* Lead Program - Featured */}
          <div className="animate-on-scroll mb-12">
            {(() => {
              const Icon = iconMap[leadProgram.icon]
              return (
                <div className="premium-card bg-white rounded-2xl p-8 lg:p-10 border-2 border-teal relative max-w-3xl mx-auto">
                  <div className="absolute -top-3 right-6 bg-teal text-white text-xs font-bold px-4 py-1 rounded-full">
                    EMPFOHLEN
                  </div>

                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={28} className="text-teal" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-navy">{leadProgram.title}</h3>
                      <p className="text-sm text-teal font-medium">{leadProgram.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-slate-body/80 leading-relaxed mb-6">
                    {leadProgram.description}
                  </p>

                  <p className="text-sm text-slate-body/60 mb-6 italic">
                    {leadProgram.targetGroup}
                  </p>

                  <button
                    onClick={() => setSelectedProgram(leadProgram)}
                    className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white px-8 py-3.5 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-lg shadow-teal/25"
                  >
                    Passt das zu mir?
                    <ArrowRight size={18} />
                  </button>
                </div>
              )
            })()}
          </div>

          {/* Other Programs */}
          <div className="animate-on-scroll">
            <h3 className="text-center text-lg font-semibold text-navy/60 mb-8">Weitere Schwerpunkte</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherPrograms.map((program, i) => {
                const Icon = iconMap[program.icon]
                return (
                  <div
                    key={program.id}
                    className="premium-card bg-white rounded-2xl p-6 border border-gray-100"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
                        <Icon size={20} className="text-navy" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-navy">{program.title}</h4>
                        <p className="text-xs text-teal font-medium">{program.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-slate-body/70 text-sm leading-relaxed mb-4 line-clamp-3">
                      {program.description}
                    </p>

                    <button
                      onClick={() => setSelectedProgram(program)}
                      className="inline-flex items-center gap-2 text-navy hover:text-teal font-semibold text-sm transition-colors cursor-pointer bg-transparent border-none px-0"
                    >
                      Mehr erfahren
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedProgram && (
        <ProgramModal
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      )}
    </>
  )
}
