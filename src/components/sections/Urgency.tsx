import { Clock, Users } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

export default function Urgency() {
  const ref = useScrollAnimation()

  return (
    <section className="py-12 lg:py-16 bg-teal" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-on-scroll flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-white shrink-0" />
            <p className="text-white font-semibold text-base sm:text-lg">
              Nur 8 neue Plätze pro Quartal
            </p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/30" />
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-white shrink-0" />
            <p className="text-white/90 text-sm sm:text-base">
              Damit wir jedem Teilnehmer die volle Aufmerksamkeit geben können.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
