import { Link } from 'react-router-dom'
import { MapPin, Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logo & Tagline */}
          <div>
            <img
              src="/images/logo-dark.png"
              alt="Bright Medical"
              className="h-10 w-auto mb-4"
            />
            <p className="text-white/60 text-sm leading-relaxed">
              Ärztlich begleitet. Individuell optimiert.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <MapPin size={16} className="text-teal shrink-0" />
                <span>Bruchsal</span>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <Mail size={16} className="text-teal shrink-0" />
                <a href="mailto:info@brightmedical.de" className="hover:text-teal transition-colors text-white/70 no-underline">
                  info@brightmedical.de
                </a>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <Phone size={16} className="text-teal shrink-0" />
                <span>Telefon auf Anfrage</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 font-[var(--font-body)]">Rechtliches</h4>
            <div className="space-y-3">
              <Link to="/impressum" className="block text-white/60 hover:text-teal transition-colors text-sm no-underline">
                Impressum
              </Link>
              <Link to="/datenschutz" className="block text-white/60 hover:text-teal transition-colors text-sm no-underline">
                Datenschutzerklärung
              </Link>
              <Link to="/agb" className="block text-white/60 hover:text-teal transition-colors text-sm no-underline">
                AGB
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="text-white font-semibold mb-4 font-[var(--font-body)]">Hinweis</h4>
            <p className="text-white/50 text-xs leading-relaxed">
              Coaching-Dienstleistung im zweiten Gesundheitsmarkt. Keine Kassenleistung.
              Coaching umfasst Lebensstil, Schlaf, Ernährung, Stress, Routinen & Umsetzung.
              Diagnostik, Laboranalysen und Therapieentscheidungen erfolgen ausschließlich
              in der ärztlichen Sprechstunde gemäß GOÄ. Ärztliche Leistungen werden
              separat abgerechnet.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-xs">
            &copy; 2026 Bright Medical — Ajanth Kuhendran. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  )
}
