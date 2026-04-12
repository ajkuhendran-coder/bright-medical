import { Stethoscope, FlaskConical, BookOpen, MapPin } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const trustItems = [
  { icon: Stethoscope, label: 'Facharzt fuer Allgemeinmedizin' },
  { icon: FlaskConical, label: 'Funktionelle Medizin' },
  { icon: BookOpen, label: 'Wissenschaftlich fundiert' },
  { icon: MapPin, label: 'Online & in Bruchsal' },
]

export default function TrustBar() {
  const ref = useScrollAnimation()

  return (
    <section id="trust" className="bg-white py-8 border-b border-gray-100" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-on-scroll grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 justify-center">
              <item.icon size={20} className="text-teal shrink-0" />
              <span className="text-sm text-slate-body/70 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
