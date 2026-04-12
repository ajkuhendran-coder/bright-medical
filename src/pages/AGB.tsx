import { useEffect } from 'react'

export default function AGB() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-navy mb-8">Allgemeine Gesch&auml;ftsbedingungen (AGB)</h1>

        <div className="prose prose-slate max-w-none space-y-6">

          {/* § 1 Geltungsbereich */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 1 Geltungsbereich</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Diese Allgemeinen Gesch&auml;ftsbedingungen (nachfolgend &bdquo;AGB&ldquo;) gelten
              f&uuml;r alle Vertr&auml;ge &uuml;ber Coaching-Dienstleistungen zwischen Bright Medical,
              Inhaber Ajanth Kuhendran, Am Alten G&uuml;terbahnhof 24, 76646 Bruchsal
              (nachfolgend &bdquo;Anbieter&ldquo;) und dem Klienten (nachfolgend &bdquo;Klient&ldquo;).
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Abweichende Bedingungen des Klienten werden nicht anerkannt, es sei denn, der
              Anbieter stimmt ihrer Geltung ausdr&uuml;cklich schriftlich zu.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Der Klient ist Verbraucher, soweit der Zweck der bestellten Leistungen nicht
              &uuml;berwiegend seiner gewerblichen oder selbst&auml;ndigen beruflichen T&auml;tigkeit
              zugerechnet werden kann. Unternehmer ist jede nat&uuml;rliche oder juristische Person,
              die beim Abschluss des Vertrages in Aus&uuml;bung ihrer gewerblichen oder
              selbst&auml;ndigen beruflichen T&auml;tigkeit handelt.
            </p>
          </div>

          {/* § 2 Vertragsgegenstand */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 2 Vertragsgegenstand</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Gegenstand des Vertrages ist die Erbringung individueller Coaching-Beratung
              im Bereich Ern&auml;hrung, Lebensstiloptimierung und Stressmanagement. Das Coaching
              ist eine gewerbliche Dienstleistung im zweiten Gesundheitsmarkt.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Die konkreten Inhalte, der Umfang und die Dauer des Coachings ergeben sich aus
              der jeweiligen Leistungsbeschreibung des gebuchten Coaching-Programms.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Das Coaching wird als individuelle Beratung erbracht. Es handelt sich nicht um
              einen systematischen, lehrplangebundenen Fernunterricht im Sinne des Fernunterrichtsschutzgesetzes
              (FernUSG).
            </p>
          </div>

          {/* § 3 KERNPARAGRAPH: Abgrenzung */}
          <div className="border-l-4 border-bright-coral pl-4">
            <h2 className="text-xl font-bold text-navy mb-2">
              &sect; 3 Abgrenzung zur &auml;rztlichen Behandlung (KERNKLAUSEL)
            </h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Die Coaching-Dienstleistungen des Anbieters stellen <strong>keine &auml;rztliche
              Behandlung, Therapie, Diagnostik oder sonstige Heilkunde</strong> im Sinne des
              Heilpraktikergesetzes oder der Berufsordnung f&uuml;r &Auml;rzte dar. Das Coaching
              ersetzt keine &auml;rztliche Beratung, Untersuchung oder Behandlung.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Der Anbieter, Ajanth Kuhendran, ist als Facharzt f&uuml;r
              Allgemeinmedizin approbiert. Die &auml;rztliche T&auml;tigkeit wird jedoch
              ausschlie&szlig;lich in der <strong>Praxis KUHENDRAN</strong> (nicht &uuml;ber
              Bright Medical) und nach der Geb&uuml;hrenordnung f&uuml;r &Auml;rzte (GO&Auml;)
              erbracht. &Auml;rztliche Leistungen wie Labordiagnostik, Befunderhebungen und
              Rezeptausstellungen unterliegen einem <strong>separaten Behandlungsvertrag</strong> nach
              &sect;&sect; 630a ff. BGB und werden unabh&auml;ngig vom Coaching-Vertrag abgerechnet.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Der Abschluss eines Coaching-Vertrages ist <strong>keine Voraussetzung</strong> f&uuml;r
              die Inanspruchnahme &auml;rztlicher Leistungen in der Praxis KUHENDRAN. Umgekehrt
              ist die Inanspruchnahme &auml;rztlicher Leistungen keine Voraussetzung f&uuml;r
              das Coaching. Beide Leistungsbereiche sind rechtlich und wirtschaftlich
              voneinander unabh&auml;ngig.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (4) Der Anbieter gibt im Rahmen des Coachings <strong>keine Heilversprechen</strong> ab.
              Die Coaching-Inhalte dienen der allgemeinen Information und individuellen Beratung zu
              Ern&auml;hrung und Lebensstil. Ergebnisse k&ouml;nnen individuell variieren. Bei
              gesundheitlichen Beschwerden wird dem Klienten empfohlen, einen Arzt aufzusuchen.
            </p>
          </div>

          {/* § 4 Vertragsschluss */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 4 Vertragsschluss</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Die Darstellung der Coaching-Programme auf der Website stellt kein rechtlich
              bindendes Angebot, sondern eine Aufforderung zur Abgabe eines Angebots dar.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Durch die Buchung eines Coaching-Programms gibt der Klient ein verbindliches
              Angebot zum Abschluss eines Coaching-Vertrages ab. Der Vertrag kommt durch die
              Best&auml;tigung des Anbieters per E-Mail zustande.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Der Vertragstext wird vom Anbieter nicht gespeichert. Der Klient kann diese
              AGB vor Vertragsschluss &uuml;ber die Website abrufen und ausdrucken.
            </p>
          </div>

          {/* § 5 Verguetung und Zahlung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 5 Verg&uuml;tung und Zahlung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Die Verg&uuml;tung f&uuml;r das Coaching ergibt sich aus der jeweiligen
              Leistungsbeschreibung zum Zeitpunkt der Buchung. Alle Preise verstehen sich als
              Endpreise inklusive der gesetzlichen Umsatzsteuer, sofern diese anf&auml;llt.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Die Verg&uuml;tung ist als Einmalzahlung im Voraus f&auml;llig. Die Zahlung
              erfolgt per &Uuml;berweisung oder &uuml;ber die auf der Website angebotenen
              Zahlungswege.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Die Coaching-Verg&uuml;tung wird ausschlie&szlig;lich von Bright Medical in
              Rechnung gestellt. &Auml;rztliche Leistungen der Praxis KUHENDRAN werden separat
              nach GO&Auml; abgerechnet und sind nicht Gegenstand dieser AGB.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (4) Das Coaching ist keine Leistung der gesetzlichen oder privaten Krankenversicherung.
              Eine Kostenerstattung durch Krankenkassen oder Versicherungen ist in der Regel nicht
              m&ouml;glich.
            </p>
          </div>

          {/* § 6 Widerruf */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 6 Widerrufsbelehrung</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-slate-body/80 leading-relaxed font-semibold">Widerrufsrecht</p>
              <p className="text-slate-body/80 leading-relaxed mt-2">
                Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gr&uuml;nden diesen Vertrag
                zu widerrufen. Die Widerrufsfrist betr&auml;gt vierzehn Tage ab dem Tag des
                Vertragsabschlusses.
              </p>
              <p className="text-slate-body/80 leading-relaxed mt-2">
                Um Ihr Widerrufsrecht auszu&uuml;ben, m&uuml;ssen Sie uns &ndash; Bright Medical,
                Inhaber Ajanth Kuhendran, Am Alten G&uuml;terbahnhof 24, 76646 Bruchsal,
                E-Mail: info@brightmedical.de &ndash; mittels einer eindeutigen Erkl&auml;rung
                (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) &uuml;ber Ihren
                Entschluss, diesen Vertrag zu widerrufen, informieren.
              </p>
              <p className="text-slate-body/80 leading-relaxed mt-2">
                Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung &uuml;ber die
                Aus&uuml;bung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
              </p>

              <p className="text-slate-body/80 leading-relaxed font-semibold mt-4">Folgen des Widerrufs</p>
              <p className="text-slate-body/80 leading-relaxed mt-2">
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
                erhalten haben, unverz&uuml;glich und sp&auml;testens binnen vierzehn Tagen ab dem Tag
                zur&uuml;ckzuzahlen, an dem die Mitteilung &uuml;ber Ihren Widerruf dieses Vertrages
                bei uns eingegangen ist. F&uuml;r diese R&uuml;ckzahlung verwenden wir dasselbe
                Zahlungsmittel, das Sie bei der urspr&uuml;nglichen Transaktion eingesetzt haben, es
                sei denn, mit Ihnen wurde ausdr&uuml;cklich etwas anderes vereinbart; in keinem Fall
                werden Ihnen wegen dieser R&uuml;ckzahlung Entgelte berechnet.
              </p>
              <p className="text-slate-body/80 leading-relaxed mt-2">
                Haben Sie verlangt, dass die Dienstleistung w&auml;hrend der Widerrufsfrist beginnen
                soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu
                dem Zeitpunkt, zu dem Sie uns von der Aus&uuml;bung des Widerrufsrechts hinsichtlich
                dieses Vertrages unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum
                Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
              </p>
            </div>
          </div>

          {/* § 7 Mitwirkungspflichten */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 7 Mitwirkungspflichten des Klienten</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Der Klient ist verpflichtet, vereinbarte Coaching-Termine einzuhalten und
              p&uuml;nktlich wahrzunehmen. Termine, die nicht mindestens 24 Stunden vorher
              abgesagt werden, gelten als wahrgenommen.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Der Klient verpflichtet sich, dem Anbieter alle f&uuml;r das Coaching relevanten
              Informationen wahrheitsgem&auml;&szlig; mitzuteilen, insbesondere bestehende
              Vorerkrankungen, Medikamenteneinnahme und &auml;rztliche Behandlungen.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Der Coaching-Erfolg h&auml;ngt wesentlich von der aktiven Mitwirkung des Klienten
              ab. Der Anbieter &uuml;bernimmt keine Garantie f&uuml;r einen bestimmten Erfolg.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (4) Der Klient wird darauf hingewiesen, dass das Coaching eine eigenverantwortliche
              Umsetzung der besprochenen Inhalte voraussetzt. Bei gesundheitlichen Bedenken oder
              Beschwerden ist stets ein Arzt aufzusuchen.
            </p>
          </div>

          {/* § 8 Haftung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 8 Haftung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Der Anbieter haftet unbeschr&auml;nkt f&uuml;r Sch&auml;den aus der Verletzung
              des Lebens, des K&ouml;rpers oder der Gesundheit, die auf einer vors&auml;tzlichen
              oder fahrl&auml;ssigen Pflichtverletzung des Anbieters beruhen.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) F&uuml;r sonstige Sch&auml;den haftet der Anbieter nur bei Vorsatz und grober
              Fahrl&auml;ssigkeit sowie bei der Verletzung wesentlicher Vertragspflichten
              (Kardinalpflichten). Bei der Verletzung wesentlicher Vertragspflichten ist die Haftung
              auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Der Anbieter haftet nicht f&uuml;r Sch&auml;den, die aus der eigenverantwortlichen
              Umsetzung von Coaching-Inhalten durch den Klienten entstehen. Insbesondere haftet
              der Anbieter nicht f&uuml;r gesundheitliche Folgen, die aus der Nichteinhaltung
              &auml;rztlicher Empfehlungen resultieren.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (4) Die Haftung nach dem Produkthaftungsgesetz bleibt unber&uuml;hrt.
            </p>
          </div>

          {/* § 9 Vertraulichkeit */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 9 Vertraulichkeit und Datenschutz</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Der Anbieter verpflichtet sich, alle im Rahmen des Coachings erhaltenen
              Informationen vertraulich zu behandeln und nicht an Dritte weiterzugeben, es sei
              denn, der Klient hat ausdr&uuml;cklich eingewilligt oder eine gesetzliche
              Offenbarungspflicht besteht.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Die Verarbeitung personenbezogener Daten erfolgt gem&auml;&szlig; unserer
              Datenschutzerkl&auml;rung, die auf der Website einsehbar ist.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Es wird ausdr&uuml;cklich darauf hingewiesen, dass die Coaching-Daten
              nicht der &auml;rztlichen Schweigepflicht nach &sect; 203 StGB unterliegen. Die
              &auml;rztliche Schweigepflicht gilt ausschlie&szlig;lich f&uuml;r Daten, die im
              Rahmen der &auml;rztlichen T&auml;tigkeit in der Praxis KUHENDRAN erhoben werden.
            </p>
          </div>

          {/* § 10 Kuendigung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 10 K&uuml;ndigung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Der Coaching-Vertrag endet mit Erbringung der vereinbarten Leistung oder mit Ablauf
              der vereinbarten Laufzeit.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Das Recht zur au&szlig;erordentlichen K&uuml;ndigung aus wichtigem Grund bleibt
              f&uuml;r beide Vertragsparteien unber&uuml;hrt. Ein wichtiger Grund liegt insbesondere
              vor, wenn dem K&uuml;ndigenden die Fortsetzung des Vertragsverh&auml;ltnisses unter
              Ber&uuml;cksichtigung aller Umst&auml;nde des Einzelfalls und unter Abw&auml;gung
              der beiderseitigen Interessen nicht zugemutet werden kann.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Bei einer K&uuml;ndigung durch den Klienten nach Beginn des Coachings erfolgt
              keine anteilige R&uuml;ckerstattung der Verg&uuml;tung, es sei denn, die K&uuml;ndigung
              beruht auf einem wichtigen Grund, den der Anbieter zu vertreten hat.
              Das Widerrufsrecht gem&auml;&szlig; &sect; 6 bleibt unber&uuml;hrt.
            </p>
          </div>

          {/* § 11 Schlussbestimmungen */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">&sect; 11 Schlussbestimmungen</h2>
            <p className="text-slate-body/80 leading-relaxed">
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (2) Ist der Klient Kaufmann, juristische Person des &ouml;ffentlichen Rechts oder
              &ouml;ffentlich-rechtliches Sonderverm&ouml;gen, ist ausschlie&szlig;licher
              Gerichtsstand f&uuml;r alle Streitigkeiten aus diesem Vertrag der Gesch&auml;ftssitz
              des Anbieters. Gegen&uuml;ber Verbrauchern gilt der gesetzliche Gerichtsstand.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (3) Sollten einzelne Bestimmungen dieses Vertrages unwirksam sein oder werden, so
              wird hierdurch die Wirksamkeit der &uuml;brigen Bestimmungen nicht ber&uuml;hrt. An
              die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              (4) Die Vertragssprache ist Deutsch.
            </p>
          </div>

          {/* Stand */}
          <div>
            <p className="text-slate-body/80 leading-relaxed italic">
              Stand: April 2026
            </p>
          </div>

          {/* Hinweiskasten */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <p className="text-amber-800 text-sm">
              <strong>Hinweis:</strong> Diese Texte wurden mit KI-Unterst&uuml;tzung erstellt und
              sollten von einem Fachanwalt gepr&uuml;ft werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
