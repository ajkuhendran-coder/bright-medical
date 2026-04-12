import { ChevronDown } from 'lucide-react'

export default function Hero() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="relative min-h-screen flex flex-col lg:flex-row items-stretch overflow-hidden">
      {/* Desktop: Left side - Navy with text */}
      <div className="hidden lg:flex relative z-10 bg-navy w-1/2 items-center">
        <div className="px-16 xl:px-20 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8">
            <span className="text-teal text-sm font-medium">Gewicht</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Hormone</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Darm</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Longevity</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
            Endlich dauerhaft abnehmen —{' '}
            <span className="text-teal">ärztlich begleitet</span>, mit messbaren Ergebnissen.
          </h1>

          <p className="text-lg text-white/80 leading-relaxed mb-4 font-[var(--font-body)] max-w-xl">
            Stellen Sie sich vor, Sie wachen morgens auf und fühlen sich endlich wieder energiegeladen. Kein Jo-Jo. Kein nächster Versuch. Sondern ein Plan, der auf Ihrer Biologie basiert.
          </p>
          <p className="text-sm text-white/50 mb-10 font-[var(--font-body)]">
            Bright Medical beginnt dort, wo die Kassenmedizin aufhört.
          </p>

          <div className="flex flex-row gap-4">
            <button onClick={() => scrollTo('#kontakt')} className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-xl shadow-teal/30">
              Kostenloses Erstgespräch sichern
            </button>
            <button onClick={() => scrollTo('#programme')} className="border-2 border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer bg-transparent hover:bg-white/5">
              Programme ansehen
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Right side - Doctor photo */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src="/images/doctor-hero.webp" alt="Dr. med. Ajanth Kuhendran" className="w-full h-full object-cover object-[center_15%]" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-navy to-transparent" />
      </div>

      {/* Mobile: Emergent-Technik — Bild fullscreen, Text links mit horizontalem Gradient */}
      <div className="lg:hidden relative min-h-screen">
        {/* Fullscreen Background Photo */}
        <img src="/images/doctor-hero.webp" alt="" className="absolute inset-0 w-full h-full object-cover object-[center_top]" />

        {/* Horizontaler Gradient: Navy links (Text lesbar) → Transparent rechts (Gesicht sichtbar) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,42,85,0.95) 0%, rgba(15,42,85,0.9) 30%, rgba(15,42,85,0.4) 40%, transparent 50%)' }} />

        {/* Top gradient for navbar area */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy/60 to-transparent z-[1]" />

        {/* Text Overlay — links positioniert, padding-right drückt Text weg vom Gesicht */}
        <div className="absolute inset-0 z-[2] flex items-center" style={{ paddingRight: '55%', paddingTop: '12vh' }}>
          <div className="px-5 sm:px-8">
            <h1 className="text-[clamp(1.4rem,5vw,1.8rem)] font-bold text-white leading-tight mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              Endlich dauerhaft abnehmen —{' '}
              <span className="text-teal">ärztlich begleitet</span>.
            </h1>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-2 font-[var(--font-body)]" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Coaching mit ärztlicher Expertise. Messbar. Strukturiert. Persönlich begleitet.
            </p>
            <p className="text-[11px] text-white/50 mb-5 font-[var(--font-body)]">
              Bright Medical beginnt dort, wo die Kassenmedizin aufhört.
            </p>

            <div className="flex flex-col gap-3">
              <button onClick={() => scrollTo('#kontakt')} className="bg-teal hover:bg-teal-dark text-white px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer border-none shadow-xl shadow-teal/30 w-fit">
                Erstgespräch sichern
              </button>
              <button onClick={() => scrollTo('#programme')} className="border-2 border-white/30 text-white px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer bg-transparent w-fit">
                Programme ansehen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button onClick={() => scrollTo('#trust')} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none scroll-indicator z-20" aria-label="Nach unten scrollen">
        <ChevronDown size={32} />
      </button>
    </section>
  )
}
