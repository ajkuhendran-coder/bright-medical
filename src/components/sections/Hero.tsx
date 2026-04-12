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

      {/* Mobile: Full background image with text overlay */}
      <div className="lg:hidden relative min-h-screen flex items-end">
        {/* Background photo */}
        <div className="absolute inset-0">
          <img src="/images/doctor-hero.webp" alt="" className="w-full h-full object-cover object-[center_15%]" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/50 via-30% to-navy/95" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 px-6 pb-10 pt-28">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
            <span className="text-teal text-xs font-medium">Gewicht</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-xs font-medium">Hormone</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-xs font-medium">Darm</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-xs font-medium">Longevity</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
            Endlich dauerhaft abnehmen —{' '}
            <span className="text-teal">ärztlich begleitet</span>, mit messbaren Ergebnissen.
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-3 font-[var(--font-body)]">
            Stellen Sie sich vor, Sie wachen morgens auf und fühlen sich endlich wieder energiegeladen. Kein Jo-Jo. Kein nächster Versuch. Sondern ein Plan, der auf Ihrer Biologie basiert.
          </p>
          <p className="text-xs text-white/50 mb-8 font-[var(--font-body)]">
            Bright Medical beginnt dort, wo die Kassenmedizin aufhört.
          </p>

          <div className="flex flex-col gap-3">
            <button onClick={() => scrollTo('#kontakt')} className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-xl shadow-teal/30">
              Kostenloses Erstgespräch sichern
            </button>
            <button onClick={() => scrollTo('#programme')} className="border-2 border-white/30 text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer bg-transparent">
              Programme ansehen
            </button>
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
