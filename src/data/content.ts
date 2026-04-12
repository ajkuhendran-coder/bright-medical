export const painPoints = [
  {
    icon: 'Scale',
    title: 'Das Hemd spannt — und die naechste Diaet bringt nichts',
    description: 'Sie stehen morgens vor dem Spiegel und wissen: So kann es nicht weitergehen. Low Carb, Intervallfasten, Kalorien zaehlen — nichts hat dauerhaft funktioniert. Nicht weil Sie zu wenig Disziplin haben. Sondern weil das Problem tiefer liegt als auf dem Teller.',
  },
  {
    icon: 'Battery',
    title: 'Abends erschoepft auf der Couch — obwohl der Tag nicht hart war',
    description: 'Frueher haben Sie Projekte gerissen und abends noch Sport gemacht. Heute reicht die Energie kaum bis zum Feierabend. Kaffee bringt Sie durch den Tag, aber das Gefuehl von echter Vitalitaet? Lange her.',
  },
  {
    icon: 'Activity',
    title: '„Alles in Ordnung" — aber Sie fuehlen sich nicht in Ordnung',
    description: 'Ihr Hausarzt hat 8 Minuten, schaut auf drei Werte und sagt: „Alles normal." Aber Sie spueren, dass etwas nicht stimmt. Vielleicht liegt es daran, dass „normal" und „optimal" zwei verschiedene Dinge sind.',
  },
  {
    icon: 'Moon',
    title: 'Der Koerper hat sich veraendert — und niemand erklaert warum',
    description: 'Ab 40 veraendert sich alles: Schlaf, Stimmung, Gewicht, Leistung. Sie machen das Gleiche wie frueher — aber der Koerper reagiert nicht mehr. Das ist kein Schicksal. Das sind Hormone, die aus dem Gleichgewicht geraten sind.',
  },
  {
    icon: 'Brain',
    title: 'Gehirnnebel — wo frueher Klarheit war',
    description: 'Im Meeting den Faden verlieren. Namen vergessen. Aufgaben dreimal lesen. Sie waren mal scharf und fokussiert. Jetzt fuehlt sich alles zaeher an. Das ist kein normales Altern — das ist ein Signal.',
  },
  {
    icon: 'HeartPulse',
    title: 'Verdauungsprobleme, an die Sie sich gewoehnt haben',
    description: 'Blaehungen nach dem Essen, unregelmaessiger Stuhlgang, Lebensmittel die plotzlich nicht mehr gehen. Sie haben sich arrangiert. Aber Ihr Darm beeinflusst alles: Energie, Stimmung, Immunsystem — sogar Ihr Gewicht.',
  },
]

export interface ProgramFeature {
  text: string
}

export interface Program {
  id: string
  icon: string
  title: string
  subtitle: string
  description: string
  targetGroup: string
  isLead?: boolean
  features: ProgramFeature[]
  duration: string
  note: string
}

export const programs: Program[] = [
  {
    id: 'gewicht',
    icon: 'Scale',
    title: 'Gewichtsoptimierung & Stoffwechsel',
    subtitle: 'Unser Hauptprogramm',
    description: 'Stellen Sie sich vor, Sie steigen morgens auf die Waage und es bewegt sich — dauerhaft. Kein Jo-Jo, keine Crash-Diaet. Sondern ein Plan, der auf Ihrer Biologie basiert, nicht auf dem naechsten Trend.',
    targetGroup: 'Fuer Sie, wenn Diaeten immer wieder scheitern und Sie endlich verstehen wollen, warum Ihr Koerper nicht mitspielt.',
    isLead: true,
    features: [
      { text: 'Persoenliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Individuelles Ernaehrungs- & Bewegungskonzept' },
      { text: 'Stoffwechselanalyse & Verlaufskontrolle' },
      { text: 'Supplement-Protokoll auf Ihre Werte abgestimmt' },
      { text: 'Direkter WhatsApp-Support zwischen den Calls' },
      { text: 'CGM- und Wearable-Auswertung' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Aerztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOAe abgerechnet.',
  },
  {
    id: 'hormone',
    icon: 'Zap',
    title: 'Hormonoptimierung',
    subtitle: 'Vitalitaet zurueckgewinnen',
    description: 'Erinnern Sie sich an das Gefuehl, morgens voller Energie aufzuwachen? Wenn Schlaf sich nach Erholung anfuehlte und der Tag nicht mit Anlaufproblemen begann? Hormone steuern genau das — und sie lassen sich gezielt optimieren.',
    targetGroup: 'Fuer Maenner und Frauen ab 40, die spueren, dass sich etwas veraendert hat — und wissen wollen, warum.',
    features: [
      { text: 'Persoenliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Lifestyle-Audit & Schlaf-Optimierung' },
      { text: 'Stress-Management & Regenerationsprotokoll' },
      { text: 'Individuelles Trainingsprotokoll' },
      { text: 'Supplement-Empfehlungen' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Aerztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOAe abgerechnet.',
  },
  {
    id: 'darm',
    icon: 'Leaf',
    title: 'Darmgesundheit & Erschoepfung',
    subtitle: 'Ursachen statt Symptome',
    description: 'Seit Monaten — vielleicht Jahren — kaempfen Sie mit Muedigkeit, Blaehungen oder Unvertraeglichkeiten. Sie haben sich damit abgefunden. Aber was wenn Ihr Darm der Schluessel ist, der alles andere beeinflusst?',
    targetGroup: 'Fuer Sie bei chronischer Muedigkeit, Reizdarm, Post-COVID-Symptomen oder unerklärlichen Verdauungsproblemen.',
    features: [
      { text: 'Persoenliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Ernaehrungsprotokoll fuer Darmgesundheit' },
      { text: 'Stressachsen- & Regenerationsanalyse' },
      { text: 'Supplement-Protokoll' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Aerztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOAe abgerechnet.',
  },
  {
    id: 'longevity',
    icon: 'Sparkles',
    title: 'Longevity & Anti-Aging',
    subtitle: 'Biologisch juenger altern',
    description: 'Sie wollen nicht einfach alt werden — Sie wollen vital bleiben. Mit 60 die Energie eines 45-Jaehrigen haben. Gesund altern ist kein Zufall — es ist eine Entscheidung und ein System.',
    targetGroup: 'Fuer gesundheitsbewusste Menschen, die proaktiv in ihre Langlebigkeit investieren moechten.',
    features: [
      { text: 'Persoenliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Umfassende Longevity-Diagnostik-Begleitung' },
      { text: 'Individuelles Anti-Aging-Protokoll' },
      { text: 'Biohacking-Strategien' },
      { text: 'Supplement- & Lifestyle-Optimierung' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Aerztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOAe abgerechnet.',
  },
]

export const testimonials = [
  {
    initials: 'M.',
    age: 47,
    program: 'Gewichtsoptimierung',
    quote: 'Endlich ein Arzt, der mich als Ganzes sieht. Keine naechste Diaet, sondern ein Plan, der zu meinem Leben passt. Zum ersten Mal habe ich das Gefuehl, dass sich wirklich etwas nachhaltig veraendert — und ich verstehe endlich, warum es vorher nicht geklappt hat.',
  },
  {
    initials: 'S.',
    age: 52,
    program: 'Hormonoptimierung',
    quote: 'Ich dachte, Erschoepfung gehoert einfach zum Aelterwerden dazu. Dass man sich mit 52 wieder so vital fuehlen kann, haette ich nicht fuer moeglich gehalten. Die Kombination aus aerztlichem Wissen und persoenlichem Coaching — das gibt es sonst nirgends.',
  },
  {
    initials: 'T.',
    age: 39,
    program: 'Darmgesundheit',
    quote: 'Nach Jahren mit Reizdarm endlich jemand, der nach Ursachen sucht statt nur Symptome zu behandeln. Zum ersten Mal fuehle ich mich verstanden und nicht mit einem „Da muessen Sie halt mit leben" abgespeist.',
  },
]

export const faqs = [
  {
    question: 'Was kostet das Coaching?',
    answer: 'Die Investition haengt von Ihrer individuellen Situation und dem gewaehlten Programm ab. Im persoenlichen Beratungsgespraech besprechen wir transparent, welche Optionen fuer Sie sinnvoll sind und was die Investition beinhaltet. Aerztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOAe abgerechnet.',
  },
  {
    question: 'Wie laeuft das Erstgespraech ab?',
    answer: 'Nach Ihrer Anfrage erhalten Sie einen kurzen Fragebogen. Damit koennen wir pruefen, ob unser Coaching zu Ihrer Situation passt. Im anschliessenden kostenlosen Erstgespraech (ca. 15 Minuten) lernen wir uns kennen und besprechen Ihre Ziele. Das Gespraech findet per Video-Call statt — bequem von zuhause.',
  },
  {
    question: 'Ist das Coaching auch online moeglich?',
    answer: 'Ja, alle Coaching-Calls finden per Video-Call statt. Sie koennen von ueberall aus teilnehmen. Fuer bestimmte aerztliche Leistungen (z.B. Blutabnahme, koerperliche Untersuchung) kann ein persoenlicher Termin in unserer Praxis in Bruchsal sinnvoll sein. Viele unserer Teilnehmer kommen nicht aus Bruchsal.',
  },
  {
    question: 'Was ist der Unterschied zwischen Coaching und aerztlicher Behandlung?',
    answer: 'Das Coaching ist eine gewerbliche Dienstleistung. Es umfasst Lebensstil-Optimierung, Ernaehrungsberatung, Stressmanagement und persoenliche Begleitung. Aerztliche Leistungen wie Labordiagnostik, Rezepte und medizinische Kontrollen werden separat in der aerztlichen Sprechstunde erbracht und nach GOAe abgerechnet. Sie erhalten beides aus einer Hand — aber sauber getrennt.',
  },
  {
    question: 'Warum sollte es diesmal anders sein als bei meinen bisherigen Versuchen?',
    answer: 'Weil wir nicht an der Oberflaeche bleiben. Die meisten Diaeten und Programme behandeln nur Symptome. Wir schauen auf Ihre Biologie — Hormone, Stoffwechsel, Darmgesundheit, Stressachsen. Wenn Sie verstehen, WARUM Ihr Koerper nicht mitspielt, koennen Sie gezielt handeln statt wieder nur zu hoffen.',
  },
  {
    question: 'Uebernimmt die Krankenkasse die Kosten?',
    answer: 'Das Coaching ist eine Selbstzahlerleistung und wird nicht von gesetzlichen Krankenkassen uebernommen. Private Krankenversicherungen erstatten in einigen Faellen Teile der aerztlichen Leistungen (Labor, Beratung nach GOAe). Wir stellen Ihnen gerne die entsprechenden Unterlagen zur Einreichung aus.',
  },
  {
    question: 'Wie viel Zeit muss ich pro Woche investieren?',
    answer: 'Planen Sie ca. 2–3 Stunden pro Woche ein: einen Coaching-Call (45–60 Minuten) plus die Umsetzung der besprochenen Massnahmen im Alltag. Das Programm ist so konzipiert, dass es sich in einen vollen Berufsalltag integrieren laesst.',
  },
  {
    question: 'Welche Voraussetzungen muss ich mitbringen?',
    answer: 'Die wichtigste Voraussetzung: die ehrliche Bereitschaft, etwas zu veraendern. Wir begleiten Sie mit dem Plan und der Expertise — aber die Umsetzung liegt bei Ihnen. Wenn Sie bereit sind, Verantwortung fuer Ihre Gesundheit zu uebernehmen, koennen wir zusammen Grosses erreichen.',
  },
]

export const notForYouItems = [
  'Sie suchen eine Wunderpille oder schnelle Loesung ohne eigenes Zutun.',
  'Sie sind nicht bereit, Gewohnheiten ehrlich zu hinterfragen.',
  'Sie erwarten Ergebnisse, ohne selbst aktiv zu werden.',
  'Sie moechten eine reine Kassenleistung ohne Eigeninvestition.',
  'Sie suchen eine klassische aerztliche Behandlung — kein Coaching.',
]

export const comparisonData = {
  headers: ['', 'Typischer Coach', 'Telemedizin-Anbieter', 'Bright Medical'],
  rows: [
    ['Facharzt inklusive', 'Nein — Arzt extern, zusaetzliche Kosten', 'Nur Online-Arzt', 'Ja — Ihr Arzt ist Ihr Coach'],
    ['Persoenlicher Kontakt', 'Ja, aber kein Arzt', 'Nein, nur digital', 'Ja — online & vor Ort'],
    ['Individuelle Diagnostik', 'Selten, meist Standard', 'Standardisiert', 'Umfassend & individuell'],
    ['Ganzheitlicher Ansatz', 'Oft nur ein Thema', 'Nur Medikament', 'Alle Faeden in einer Hand'],
    ['Langzeitbegleitung', 'Unterschiedlich', 'Abo-Modell, unpersoenlich', 'Individuell, bis zu 12 Monate'],
  ],
}

export const timelineSteps = [
  {
    weeks: 'Woche 1–2',
    title: 'Diagnostik & Erstgespraech',
    description: 'Wir hoeren zu. Analyse Ihrer Situation, Laborwerte, Ziele — das Fundament fuer alles Weitere.',
  },
  {
    weeks: 'Woche 3–4',
    title: 'Ihr persoenlicher Plan',
    description: 'Ernaehrung, Bewegung, Supplemente — alles massgeschneidert auf Ihre Biologie. Kein Standard, kein Schema F.',
  },
  {
    weeks: 'Woche 5–8',
    title: 'Anpassung & erste Erfolge',
    description: 'Regelmaessige Calls, Feintuning. Sie spueren die ersten Veraenderungen — mehr Energie, besserer Schlaf, klarerer Kopf.',
  },
  {
    weeks: 'Woche 9–12',
    title: 'Stabilisierung & neue Normalitaet',
    description: 'Neue Gewohnheiten werden zur Routine. Messbare Ergebnisse. Ein Koerper, dem Sie wieder vertrauen koennen.',
  },
]

export const metrics = [
  {
    icon: 'Scale',
    title: 'Koerperkomposition',
    description: 'Praezise Messung statt Waage: Fettmasse, Muskelmasse, Wasserhaushalt — Sie sehen, was sich wirklich veraendert.',
  },
  {
    icon: 'TestTubes',
    title: 'Laborwerte',
    description: 'Hormone, Entzuendungsmarker, Naehrstoffe — nicht nur „normal", sondern optimal. Wir schauen genauer hin.',
  },
  {
    icon: 'Heart',
    title: 'Vitalparameter',
    description: 'HRV, CGM, Schlafqualitaet — datenbasierte Entscheidungen statt Bauchgefuehl.',
  },
  {
    icon: 'Smile',
    title: 'Lebensqualitaet',
    description: 'Energie, Schlaf, Stimmung, Fokus — das, was Sie jeden Tag spueren. Denn darauf kommt es am Ende an.',
  },
]

export const processSteps = [
  {
    step: 1,
    title: 'Anfrage & Fragebogen',
    description: 'Sie fuellen einen kurzen Fragebogen aus. So koennen wir pruefen, ob wir Ihnen wirklich helfen koennen.',
  },
  {
    step: 2,
    title: 'Erstgespraech',
    description: 'Kostenlos & unverbindlich per Video-Call. Wir lernen uns kennen und besprechen Ihre Situation.',
  },
  {
    step: 3,
    title: 'Beratungsgespraech',
    description: 'Vertieftes Gespraech zu Ihren Zielen, Ihrem Plan und den naechsten Schritten. Transparent und ohne Druck.',
  },
  {
    step: 4,
    title: 'Coaching-Start',
    description: 'Ihr persoenliches Protokoll beginnt. Regelmaessige Calls, kontinuierliche Begleitung — Sie sind nie allein.',
  },
]
