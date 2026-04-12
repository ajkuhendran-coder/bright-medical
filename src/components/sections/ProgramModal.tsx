import { X, Check } from 'lucide-react'
import type { Program } from '../../data/content'

interface ProgramModalProps {
  program: Program
  onClose: () => void
}

export default function ProgramModal({ program, onClose }: ProgramModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className="sticky top-0 bg-navy text-white p-6 rounded-t-2xl z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            aria-label="Schliessen"
          >
            <X size={24} />
          </button>
          <h3 className="text-2xl font-bold pr-8">{program.title}</h3>
          <p className="text-white/70 text-sm mt-1">{program.subtitle}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <p className="text-slate-body/80 leading-relaxed">{program.description}</p>

          {/* Target Group */}
          <div className="bg-slate-light rounded-xl p-4">
            <p className="text-sm text-slate-body/70">
              <span className="font-semibold text-navy">Fuer wen?</span> {program.targetGroup}
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-bold text-navy mb-4 font-[var(--font-heading)]">Was Sie erwartet</h4>
            <ul className="space-y-3">
              {program.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check size={18} className="text-success shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-body/80">{feature.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Duration */}
          <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">
            <p className="text-sm text-navy font-medium">{program.duration}</p>
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              onClose()
              document.querySelector('#kontakt')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full bg-teal hover:bg-teal-dark text-white py-4 rounded-full font-semibold transition-all cursor-pointer border-none shadow-lg shadow-teal/25"
          >
            Unverbindliches Erstgespraech vereinbaren
          </button>

          {/* Note */}
          <p className="text-xs text-slate-body/50 text-center leading-relaxed border-t border-gray-100 pt-4">
            {program.note}
          </p>
        </div>
      </div>
    </div>
  )
}
