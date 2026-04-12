import { useEffect } from 'react'

export default function Datenschutz() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-navy mb-8">Datenschutzerkl&auml;rung</h1>

        <div className="prose prose-slate max-w-none space-y-6">

          {/* 1. Verantwortlicher */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">1. Verantwortlicher</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer
              nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Bright Medical<br />
              Inhaber: Ajanth Kuhendran<br />
              Am Alten G&uuml;terbahnhof 24<br />
              76646 Bruchsal<br />
              E-Mail: info@brightmedical.de
            </p>
          </div>

          {/* 2. Allgemeines zur Datenverarbeitung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">2. Allgemeines zur Datenverarbeitung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Wir verarbeiten personenbezogene Daten unserer Nutzer grunds&auml;tzlich nur, soweit
              dies zur Bereitstellung einer funktionsf&auml;higen Website sowie unserer Inhalte und
              Leistungen erforderlich ist. Die Verarbeitung personenbezogener Daten unserer Nutzer
              erfolgt regelm&auml;&szlig;ig nur nach Einwilligung des Nutzers. Eine Ausnahme gilt in
              solchen F&auml;llen, in denen eine vorherige Einholung einer Einwilligung aus
              tats&auml;chlichen Gr&uuml;nden nicht m&ouml;glich ist und die Verarbeitung der Daten
              durch gesetzliche Vorschriften gestattet ist.
            </p>
          </div>

          {/* 3. Rechtsgrundlagen */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">3. Rechtsgrundlagen der Verarbeitung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Soweit wir f&uuml;r Verarbeitungsvorg&auml;nge personenbezogener Daten eine Einwilligung
              einholen, dient Art. 6 Abs. 1 lit. a DSGVO als Rechtsgrundlage. Bei der Verarbeitung
              personenbezogener Daten, die zur Erf&uuml;llung eines Vertrages erforderlich ist, dient
              Art. 6 Abs. 1 lit. b DSGVO als Rechtsgrundlage. F&uuml;r Verarbeitungsvorg&auml;nge,
              die zur Erf&uuml;llung einer rechtlichen Verpflichtung erforderlich sind, dient Art. 6
              Abs. 1 lit. c DSGVO als Rechtsgrundlage. F&uuml;r den Fall, dass lebenswichtige
              Interessen der betroffenen Person oder einer anderen nat&uuml;rlichen Person eine
              Verarbeitung personenbezogener Daten erforderlich machen, dient Art. 6 Abs. 1 lit. d
              DSGVO als Rechtsgrundlage. Ist die Verarbeitung zur Wahrung eines berechtigten Interesses
              unseres Unternehmens oder eines Dritten erforderlich und &uuml;berwiegen die Interessen,
              Grundrechte und Grundfreiheiten des Betroffenen das erstgenannte Interesse nicht, so dient
              Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage.
            </p>
          </div>

          {/* 4. Hosting */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">4. Hosting</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Diese Website wird bei Netlify, Inc., 44 Montgomery Street, Suite 300, San Francisco,
              California 94104, USA, gehostet. Beim Aufruf unserer Website werden durch den Hosting-Anbieter
              automatisch Informationen erfasst (sog. Server-Logfiles). Hierzu geh&ouml;ren: der Browsertyp
              und die Browserversion, das verwendete Betriebssystem, die Referrer-URL, der Hostname des
              zugreifenden Rechners, die Uhrzeit der Serveranfrage sowie die IP-Adresse. Die Verarbeitung
              erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht
              in der technisch fehlerfreien Darstellung und Optimierung unserer Website.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Netlify verarbeitet Daten ggf. auch in den USA. Wir weisen darauf hin, dass nach Auffassung
              des EuGH derzeit kein angemessenes Schutzniveau f&uuml;r den Datentransfer in die USA besteht.
              Netlify hat sich jedoch zur Einhaltung der EU-Standardvertragsklauseln verpflichtet.
            </p>
          </div>

          {/* 5. SSL/TLS-Verschluesselung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">5. SSL-/TLS-Verschl&uuml;sselung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Diese Seite nutzt aus Sicherheitsgr&uuml;nden und zum Schutz der &Uuml;bertragung
              vertraulicher Inhalte eine SSL- bzw. TLS-Verschl&uuml;sselung. Eine verschl&uuml;sselte
              Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von &bdquo;http://&ldquo;
              auf &bdquo;https://&ldquo; wechselt und an dem Schlosssymbol in Ihrer Browserzeile.
              Wenn die SSL- bzw. TLS-Verschl&uuml;sselung aktiviert ist, k&ouml;nnen die Daten, die
              Sie an uns &uuml;bermitteln, nicht von Dritten mitgelesen werden.
            </p>
          </div>

          {/* 6. Kontaktformular */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">6. Kontaktformular</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem
              Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten (Name, E-Mail-Adresse,
              Telefonnummer, Nachricht) zwecks Bearbeitung der Anfrage und f&uuml;r den Fall von
              Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Die Verarbeitung der in das Kontaktformular eingegebenen Daten erfolgt somit ausschlie&szlig;lich
              auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie k&ouml;nnen diese
              Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns.
              Die Rechtm&auml;&szlig;igkeit der bis zum Widerruf erfolgten Datenverarbeitungsvorg&auml;nge
              bleibt vom Widerruf unber&uuml;hrt.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur
              L&ouml;schung auffordern, Ihre Einwilligung zur Speicherung widerrufen oder der Zweck f&uuml;r
              die Datenspeicherung entf&auml;llt. Zwingende gesetzliche Bestimmungen &ndash; insbesondere
              Aufbewahrungsfristen &ndash; bleiben unber&uuml;hrt.
            </p>
          </div>

          {/* 7. E-Mail-Versand */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">7. E-Mail-Versand (Resend)</h2>
            <p className="text-slate-body/80 leading-relaxed">
              F&uuml;r den Versand von E-Mails, die &uuml;ber das Kontaktformular ausgel&ouml;st werden,
              nutzen wir den Dienst Resend (Resend, Inc., USA). Resend verarbeitet die im Kontaktformular
              eingegebenen Daten (insbesondere E-Mail-Adresse, Name, Nachricht) in unserem Auftrag zum
              Zweck der technischen Zustellung der E-Mail. Die Verarbeitung erfolgt auf Grundlage von
              Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der zuverl&auml;ssigen Zustellung
              von Anfragen) bzw. Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Ma&szlig;nahmen). Mit Resend
              besteht ein Auftragsverarbeitungsvertrag gem&auml;&szlig; Art. 28 DSGVO. Der Datentransfer
              in die USA erfolgt auf Grundlage von EU-Standardvertragsklauseln.
            </p>
          </div>

          {/* 8. Google Fonts */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">8. Google Fonts</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Diese Website nutzt zur einheitlichen Darstellung von Schriftarten sogenannte Google Fonts,
              die von Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA, bereitgestellt
              werden. Beim Aufruf einer Seite l&auml;dt Ihr Browser die ben&ouml;tigten Schriftarten
              in Ihren Browsercache, um Texte und Schriftarten korrekt anzuzeigen. Zu diesem Zweck muss
              der von Ihnen verwendete Browser Verbindung zu den Servern von Google aufnehmen. Hierdurch
              erlangt Google Kenntnis dar&uuml;ber, dass &uuml;ber Ihre IP-Adresse unsere Website
              aufgerufen wurde.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Die Nutzung von Google Fonts erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir
              haben ein berechtigtes Interesse an der einheitlichen Darstellung des Schriftbildes auf
              unserer Website. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die
              Verarbeitung ausschlie&szlig;lich auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO.
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Weitere Informationen zu Google Fonts finden Sie unter{' '}
              <a
                href="https://developers.google.com/fonts/faq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bright-coral underline"
              >
                https://developers.google.com/fonts/faq
              </a>{' '}
              und in der Datenschutzerkl&auml;rung von Google:{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bright-coral underline"
              >
                https://policies.google.com/privacy
              </a>.
            </p>
          </div>

          {/* 9. Cookies */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">9. Cookies</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Unsere Website verwendet keine eigenen Cookies zu Tracking- oder Analysezwecken.
              Technisch notwendige Cookies k&ouml;nnen durch den Hosting-Anbieter (Netlify) gesetzt
              werden, um die ordnungsgem&auml;&szlig;e Funktion der Website sicherzustellen. Diese
              Cookies dienen ausschlie&szlig;lich technischen Zwecken und werden nicht zur Analyse
              Ihres Nutzerverhaltens eingesetzt. Rechtsgrundlage f&uuml;r technisch notwendige
              Cookies ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </div>

          {/* 10. Speicherdauer */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">10. Speicherdauer</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Personenbezogene Daten werden gel&ouml;scht, sobald der Zweck der Speicherung entf&auml;llt.
              F&uuml;r Daten aus dem Kontaktformular ist dies der Fall, wenn die jeweilige Konversation
              mit dem Nutzer beendet ist und der Sachverhalt abschlie&szlig;end gekl&auml;rt ist.
              Server-Logfiles werden in der Regel nach sp&auml;testens 30 Tagen gel&ouml;scht.
              Gesetzliche Aufbewahrungspflichten (insbesondere steuer- und handelsrechtliche
              Aufbewahrungsfristen von 6 bzw. 10 Jahren) bleiben unber&uuml;hrt.
            </p>
          </div>

          {/* 11. Rechte der Betroffenen */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">11. Ihre Rechte als betroffene Person</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Sie haben gegen&uuml;ber uns folgende Rechte hinsichtlich der Sie betreffenden
              personenbezogenen Daten:
            </p>
            <ul className="list-disc list-inside text-slate-body/80 leading-relaxed mt-2 space-y-1">
              <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO)</li>
              <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO)</li>
              <li><strong>Recht auf L&ouml;schung</strong> (Art. 17 DSGVO)</li>
              <li><strong>Recht auf Einschr&auml;nkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
              <li><strong>Recht auf Daten&uuml;bertragbarkeit</strong> (Art. 20 DSGVO)</li>
              <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
              <li><strong>Recht auf Widerruf erteilter Einwilligungen</strong> (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Zur Aus&uuml;bung Ihrer Rechte wenden Sie sich bitte an: info@brightmedical.de
            </p>
          </div>

          {/* 12. Beschwerderecht */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">12. Beschwerderecht bei einer Aufsichtsbeh&ouml;rde</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs
              steht Ihnen das Recht auf Beschwerde bei einer Aufsichtsbeh&ouml;rde zu, wenn Sie der
              Ansicht sind, dass die Verarbeitung der Sie betreffenden personenbezogenen Daten gegen
              die DSGVO verst&ouml;&szlig;t. Die f&uuml;r uns zust&auml;ndige Aufsichtsbeh&ouml;rde ist:
            </p>
            <p className="text-slate-body/80 leading-relaxed mt-2">
              Der Landesbeauftragte f&uuml;r den Datenschutz und die Informationsfreiheit
              Baden-W&uuml;rttemberg<br />
              Lautenschlagerstra&szlig;e 20<br />
              70173 Stuttgart<br />
              <a
                href="https://www.baden-wuerttemberg.datenschutz.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bright-coral underline"
              >
                www.baden-wuerttemberg.datenschutz.de
              </a>
            </p>
          </div>

          {/* 13. Aenderung */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-2">13. Aktualit&auml;t und &Auml;nderung dieser Datenschutzerkl&auml;rung</h2>
            <p className="text-slate-body/80 leading-relaxed">
              Diese Datenschutzerkl&auml;rung ist aktuell g&uuml;ltig und hat den Stand April 2026.
              Durch die Weiterentwicklung unserer Website oder aufgrund ge&auml;nderter gesetzlicher
              bzw. beh&ouml;rdlicher Vorgaben kann es notwendig werden, diese Datenschutzerkl&auml;rung
              zu &auml;ndern.
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
