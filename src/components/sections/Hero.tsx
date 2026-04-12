import { ChevronDown } from 'lucide-react'

export default function Hero() {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/doctor-hero.png"
          alt=""
          className="w-full h-full object-cover object-[center_20%] lg:object-[70%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/85 via-50% to-navy/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-transparent to-navy/60 lg:hidden" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-0">
        <div className="max-w-2xl">
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
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Endlich dauerhaft abnehmen —{' '}
            <span className="text-teal">ärztlich begleitet</span>, mit messbaren Ergebnissen.
          </h1>

          {/* Subline */}
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-4 font-[var(--font-body)] max-w-2xl">
            Stellen Sie sich vor, Sie wachen morgens auf und fühlen sich endlich wieder energiegeladen. Kein Jo-Jo. Kein nächster Versuch. Sondern ein Plan, der auf Ihrer Biologie basiert.
          </p>
          <p className="text-base text-white/50 mb-10 font-[var(--font-body)]">
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

      {/* Scroll Indicator */}
      <button
        onClick={() => scrollTo('#trust')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none scroll-indicator"
        aria-label="Nach unten scrollen"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  )
}
