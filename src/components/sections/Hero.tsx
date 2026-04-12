import { ChevronDown } from 'lucide-react'

export default function Hero() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="relative min-h-screen flex flex-col lg:flex-row items-stretch overflow-hidden">
      {/* Left side - Navy with text */}
      <div className="relative z-10 bg-navy w-full lg:w-1/2 flex items-center order-2 lg:order-1">
        <div className="px-6 sm:px-10 lg:px-16 xl:px-20 py-12 lg:py-0 max-w-2xl">
          {/* Small Tag */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8">
            <span className="text-teal text-sm font-medium">Gewicht</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Hormone</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Darm</span>
            <span className="text-white/30">|</span>
            <span className="text-teal text-sm font-medium">Longevity</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
            Endlich dauerhaft abnehmen —{' '}
            <span className="text-teal">ärztlich begleitet</span>, mit messbaren Ergebnissen.
          </h1>

          {/* Subline */}
          <p className="text-base sm:text-lg text-white/80 leading-relaxed mb-4 font-[var(--font-body)] max-w-xl">
            Stellen Sie sich vor, Sie wachen morgens auf und fühlen sich endlich wieder energiegeladen. Kein Jo-Jo. Kein nächster Versuch. Sondern ein Plan, der auf Ihrer Biologie basiert.
          </p>
          <p className="text-sm text-white/50 mb-10 font-[var(--font-body)]">
            Bright Medical beginnt dort, wo die Kassenmedizin aufhört.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => scrollTo('#kontakt')}
              className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-xl shadow-teal/30 hover:shadow-teal/40"
            >
              Kostenloses Erstgespräch sichern
            </button>
            <button
              onClick={() => scrollTo('#programme')}
              className="border-2 border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer bg-transparent hover:bg-white/5"
            >
              Programme ansehen
            </button>
          </div>
        </div>
      </div>

      {/* Right side / Top on mobile - Doctor photo */}
      <div className="w-full lg:w-1/2 relative order-1 lg:order-2 h-[50vh] sm:h-[60vh] lg:h-auto">
        <img
          src="/images/doctor-hero.png"
          alt="Dr. med. Ajanth Kuhendran"
          className="w-full h-full object-cover object-[center_15%]"
        />
        {/* Gradient overlay on bottom edge (mobile) for smooth transition to navy */}
        <div className="lg:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-navy to-transparent" />
        {/* Gradient overlay on left edge (desktop) for smooth transition */}
        <div className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-navy to-transparent" />
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={() => scrollTo('#trust')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none scroll-indicator z-20"
        aria-label="Nach unten scrollen"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  )
}
