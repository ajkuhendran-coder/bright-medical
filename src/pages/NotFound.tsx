import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="pt-24 pb-16 min-h-screen flex items-center bg-navy">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Fehler 404</span>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mt-4 mb-2">
            Seite nicht gefunden
          </h1>
          <div className="h-1 w-20 bg-teal mx-auto mt-6 mb-8 rounded-full" />
        </div>

        <p className="text-lg text-white/70 leading-relaxed mb-3">
          Diese Seite existiert leider nicht — oder sie wurde verschoben.
        </p>
        <p className="text-sm text-white/50 mb-10">
          Kein Problem. Finden wir gemeinsam den richtigen Weg.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all no-underline shadow-xl shadow-teal/30 inline-flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Zur Startseite
          </Link>
          <button
            onClick={() => window.history.back()}
            className="border-2 border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer bg-transparent hover:bg-white/5 inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Zurück
          </button>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-xs text-white/40 mb-3">Schnellzugriff</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/#programme" className="text-white/60 hover:text-teal transition-colors no-underline">Programme</Link>
            <Link to="/#ueber-mich" className="text-white/60 hover:text-teal transition-colors no-underline">Über mich</Link>
            <Link to="/#faq" className="text-white/60 hover:text-teal transition-colors no-underline">FAQ</Link>
            <Link to="/#kontakt" className="text-white/60 hover:text-teal transition-colors no-underline">Kontakt</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
