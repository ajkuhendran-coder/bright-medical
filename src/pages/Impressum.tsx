import { useEffect } from 'react'

export default function Impressum() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-navy mb-8">Impressum</h1>

        <div className="prose prose-slate max-w-none space-y-6">

          {/* Anbieterkennung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Angaben gem&auml;&szlig; &sect; 5 TMG</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Bright Medical<br />
              Inhaber: Ajanth Kuhendran<br />
              Am Alten G&uuml;terbahnhof 24<br />
              76646 Bruchsal
            </p>
          </div>

          {/* Kontakt */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Kontakt</h2>
            <p className="text-slate-body/80 leading-relaxed">
              E-Mail: info@brightmedical.de<br />
              Telefon: Auf Anfrage
            </p>
          </div>

          {/* Umsatzsteuer */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Umsatzsteuer-Identifikationsnummer</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Umsatzsteuer-Identifikationsnummer gem&auml;&szlig; &sect; 27a Umsatzsteuergesetz:<br />
              <em>[wird nach Erteilung erg&auml;nzt]</em>
            </p>
          </div>

          {/* Berufsrechtliche Angaben */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Berufsrechtliche Angaben</h2>
            <p className="text-slate-body/80 leading-relaxed">
              <strong>Berufsbezeichnung:</strong> Facharzt f&uuml;r Allgemeinmedizin<br />
              <strong>Verliehen in:</strong> Bundesrepublik Deutschland<br />
              <strong>Zust&auml;ndige Kammer:</strong> Landes&auml;rztekammer Baden-W&uuml;rttemberg, Jahnstra&szlig;e 40, 70597 Stuttgart<br />
              <strong>Berufsordnung:</strong> Berufsordnung der Landes&auml;rztekammer Baden-W&uuml;rttemberg, einsehbar unter{' '}
              <a
                href="https://www.aerztekammer-bw.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bright-coral underline"
              >
                www.aerztekammer-bw.de
              </a>
            </p>
          </div>

          {/* Hinweis zur Taetigkeit */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Hinweis zur T&auml;tigkeit</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Bright Medical erbringt ausschlie&szlig;lich gewerbliche Coaching-Dienstleistungen
              im Bereich Ern&auml;hrung, Lebensstiloptimierung und Stressmanagement. Diese
              Dienstleistungen stellen <strong>keine &auml;rztliche Behandlung, Therapie oder
              Heilkunde</strong> dar. &Auml;rztliche Leistungen (Diagnostik, Laboruntersuchungen,
              Rezeptausstellung) werden ausschlie&szlig;lich in der Praxis KUHENDRAN nach der
              Geb&uuml;hrenordnung f&uuml;r &Auml;rzte (GO&Auml;) erbracht und separat abgerechnet.
            </p>
          </div>

          {/* Aufsichtsbehoerde */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Zust&auml;ndige Aufsichtsbeh&ouml;rde</h2>
            <p className="text-slate-body/80 leading-relaxed">
              F&uuml;r die gewerbliche T&auml;tigkeit:<br />
              Ordnungsamt der Stadt Bruchsal, 76646 Bruchsal
            </p>
          </div>

          {/* Streitschlichtung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">EU-Streitschlichtung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Die Europ&auml;ische Kommission stellt eine Plattform zur Online-Streitbeilegung
              (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bright-coral underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder
              verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </div>

          {/* Haftung fuer Inhalte */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Haftung f&uuml;r Inhalte</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Als Diensteanbieter sind wir gem&auml;&szlig; &sect; 7 Abs. 1 TMG f&uuml;r eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
              &sect;&sect; 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
              &uuml;bermittelte oder gespeicherte fremde Informationen zu &uuml;berwachen oder
              nach Umst&auml;nden zu forschen, die auf eine rechtswidrige T&auml;tigkeit hinweisen.
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
              allgemeinen Gesetzen bleiben hiervon unber&uuml;hrt. Eine diesbez&uuml;gliche Haftung
              ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
              m&ouml;glich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
              Inhalte umgehend entfernen.
            </p>
          </div>

          {/* Haftung fuer Links */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Haftung f&uuml;r Links</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Unser Angebot enth&auml;lt Links zu externen Websites Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Deshalb k&ouml;nnen wir f&uuml;r diese fremden Inhalte auch
              keine Gew&auml;hr &uuml;bernehmen. F&uuml;r die Inhalte der verlinkten Seiten ist stets
              der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
              wurden zum Zeitpunkt der Verlinkung auf m&ouml;gliche Rechtsverst&ouml;&szlig;e
              &uuml;berpr&uuml;ft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
              erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne
              konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </div>

          {/* Urheberrecht */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">Urheberrecht</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielf&auml;ltigung, Bearbeitung,
              Verbreitung und jede Art der Verwertung au&szlig;erhalb der Grenzen des Urheberrechtes
              bed&uuml;rfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              Downloads und Kopien dieser Seite sind nur f&uuml;r den privaten, nicht kommerziellen
              Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
              wurden, werden die Urheberrechte Dritter beachtet. Sollten Sie trotzdem auf eine
              Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis.
              Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
