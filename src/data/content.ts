export const painPoints = [
  {
    icon: 'Scale',
    title: 'Das Hemd spannt — und die nächste Diät bringt nichts',
    description: 'Sie stehen morgens vor dem Spiegel und wissen: So kann es nicht weitergehen. Low Carb, Intervallfasten, Kalorien zählen — nichts hat dauerhaft funktioniert. Nicht weil Sie zu wenig Disziplin haben. Sondern weil das Problem tiefer liegt als auf dem Teller.',
  },
  {
    icon: 'Battery',
    title: 'Abends erschöpft auf der Couch — obwohl der Tag nicht hart war',
    description: 'Früher haben Sie Projekte gerissen und abends noch Sport gemacht. Heute reicht die Energie kaum bis zum Feierabend. Kaffee bringt Sie durch den Tag, aber das Gefühl von echter Vitalität? Lange her.',
  },
  {
    icon: 'Activity',
    title: '„Alles in Ordnung" — aber Sie fühlen sich nicht in Ordnung',
    description: 'Ihr Hausarzt hat 8 Minuten, schaut auf drei Werte und sagt: „Alles normal." Aber Sie spüren, dass etwas nicht stimmt. Vielleicht liegt es daran, dass „normal" und „optimal" zwei verschiedene Dinge sind.',
  },
  {
    icon: 'Moon',
    title: 'Der Körper hat sich verändert — und niemand erklärt warum',
    description: 'Ab 40 verändert sich alles: Schlaf, Stimmung, Gewicht, Leistung. Sie machen das Gleiche wie früher — aber der Körper reagiert nicht mehr. Das ist kein Schicksal. Das sind Hormone, die aus dem Gleichgewicht geraten sind.',
  },
  {
    icon: 'Brain',
    title: 'Gehirnnebel — wo früher Klarheit war',
    description: 'Im Meeting den Faden verlieren. Namen vergessen. Aufgaben dreimal lesen. Sie waren mal scharf und fokussiert. Jetzt fühlt sich alles zäher an. Das ist kein normales Altern — das ist ein Signal.',
  },
  {
    icon: 'HeartPulse',
    title: 'Verdauungsprobleme, an die Sie sich gewöhnt haben',
    description: 'Blähungen nach dem Essen, unregelmäßiger Stuhlgang, Lebensmittel die plotzlich nicht mehr gehen. Sie haben sich arrangiert. Aber Ihr Darm beeinflusst alles: Energie, Stimmung, Immunsystem — sogar Ihr Gewicht.',
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
    description: 'Stellen Sie sich vor, Sie steigen morgens auf die Waage und es bewegt sich — dauerhaft. Kein Jo-Jo, keine Crash-Diät. Sondern ein Plan, der auf Ihrer Biologie basiert, nicht auf dem nächsten Trend.',
    targetGroup: 'Für Sie, wenn Diäten immer wieder scheitern und Sie endlich verstehen wollen, warum Ihr Körper nicht mitspielt.',
    isLead: true,
    features: [
      { text: 'Persönliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Individuelles Ernährungs- & Bewegungskonzept' },
      { text: 'Stoffwechselanalyse & Verlaufskontrolle' },
      { text: 'Supplement-Protokoll auf Ihre Werte abgestimmt' },
      { text: 'Direkter WhatsApp-Support zwischen den Calls' },
      { text: 'CGM- und Wearable-Auswertung' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Ärztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOÄ abgerechnet.',
  },
  {
    id: 'hormone',
    icon: 'Zap',
    title: 'Hormonoptimierung',
    subtitle: 'Vitalität zurückgewinnen',
    description: 'Erinnern Sie sich an das Gefühl, morgens voller Energie aufzuwachen? Wenn Schlaf sich nach Erholung anfühlte und der Tag nicht mit Anlaufproblemen begann? Hormone steuern genau das — und sie lassen sich gezielt optimieren.',
    targetGroup: 'Für Männer und Frauen ab 40, die spüren, dass sich etwas verändert hat — und wissen wollen, warum.',
    features: [
      { text: 'Persönliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Lifestyle-Audit & Schlaf-Optimierung' },
      { text: 'Stress-Management & Regenerationsprotokoll' },
      { text: 'Individuelles Trainingsprotokoll' },
      { text: 'Supplement-Empfehlungen' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Ärztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOÄ abgerechnet.',
  },
  {
    id: 'darm',
    icon: 'Leaf',
    title: 'Darmgesundheit & Erschöpfung',
    subtitle: 'Ursachen statt Symptome',
    description: 'Seit Monaten — vielleicht Jahren — kämpfen Sie mit Müdigkeit, Blähungen oder Unverträglichkeiten. Sie haben sich damit abgefunden. Aber was wenn Ihr Darm der Schlüssel ist, der alles andere beeinflusst?',
    targetGroup: 'Für Sie bei chronischer Müdigkeit, Reizdarm, anhaltender Erschöpfung oder unerklärlichen Verdauungsproblemen.',
    features: [
      { text: 'Persönliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Ernährungsprotokoll für Darmgesundheit' },
      { text: 'Stressachsen- & Regenerationsanalyse' },
      { text: 'Supplement-Protokoll' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Ärztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOÄ abgerechnet.',
  },
  {
    id: 'longevity',
    icon: 'Sparkles',
    title: 'Longevity & Anti-Aging',
    subtitle: 'Biologisch jünger altern',
    description: 'Sie wollen nicht einfach alt werden — Sie wollen vital bleiben. Mit 60 die Energie eines 45-Jährigen haben. Gesund altern ist kein Zufall — es ist eine Entscheidung und ein System.',
    targetGroup: 'Für gesundheitsbewusste Menschen, die proaktiv in ihre Langlebigkeit investieren möchten.',
    features: [
      { text: 'Persönliche Coaching-Calls mit Ihrem Arzt' },
      { text: 'Umfassende Longevity-Diagnostik-Begleitung' },
      { text: 'Individuelles Anti-Aging-Protokoll' },
      { text: 'Biohacking-Strategien' },
      { text: 'Supplement- & Lifestyle-Optimierung' },
      { text: 'WhatsApp-Support (Mo–Fr)' },
    ],
    duration: 'Ab 4 Wochen — individuell nach Ihren Zielen',
    note: 'Ärztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOÄ abgerechnet.',
  },
]

export const testimonials = [
  {
    initials: 'M.',
    age: 47,
    program: 'Gewichtsoptimierung',
    quote: 'Endlich ein Arzt, der mich als Ganzes sieht. Keine nächste Diät, sondern ein Plan, der zu meinem Leben passt. Zum ersten Mal habe ich das Gefühl, dass sich wirklich etwas nachhaltig verändert — und ich verstehe endlich, warum es vorher nicht geklappt hat.',
  },
  {
    initials: 'S.',
    age: 52,
    program: 'Hormonoptimierung',
    quote: 'Ich dachte, Erschöpfung gehört einfach zum Älterwerden dazu. Dass man sich mit 52 wieder so vital fühlen kann, hätte ich nicht für möglich gehalten. Die Kombination aus ärztlichem Wissen und persönlichem Coaching — das gibt es sonst nirgends.',
  },
  {
    initials: 'T.',
    age: 39,
    program: 'Darmgesundheit',
    quote: 'Nach Jahren mit Reizdarm endlich jemand, der nach Ursachen sucht statt nur Symptome zu behandeln. Zum ersten Mal fühle ich mich verstanden und nicht mit einem „Da müssen Sie halt mit leben" abgespeist.',
  },
]

export const faqs = [
  {
    question: 'Was kostet das Coaching?',
    answer: 'Die Investition hängt von Ihrer individuellen Situation und dem gewählten Programm ab. Im persönlichen Beratungsgespräch besprechen wir transparent, welche Optionen für Sie sinnvoll sind und was die Investition beinhaltet. Ärztliche Leistungen (Labor, Rezepte, Kontrollen) werden separat nach GOÄ abgerechnet.',
  },
  {
    question: 'Wie läuft das Erstgespräch ab?',
    answer: 'Nach Ihrer Anfrage erhalten Sie einen kurzen Fragebogen. Damit können wir prüfen, ob unser Coaching zu Ihrer Situation passt. Im anschließenden kostenlosen Erstgespräch (ca. 15 Minuten) lernen wir uns kennen und besprechen Ihre Ziele. Das Gespräch findet per Video-Call statt — bequem von zuhause.',
  },
  {
    question: 'Ist das Coaching auch online möglich?',
    answer: 'Ja, alle Coaching-Calls finden per Video-Call statt. Sie können von überall aus teilnehmen. Für bestimmte ärztliche Leistungen (z.B. Blutabnahme, körperliche Untersuchung) kann ein persönlicher Termin in unserer Praxis in Bruchsal sinnvoll sein. Viele unserer Teilnehmer kommen nicht aus Bruchsal.',
  },
  {
    question: 'Was ist der Unterschied zwischen Coaching und ärztlicher Behandlung?',
    answer: 'Das Coaching ist eine gewerbliche Dienstleistung. Es umfasst Lebensstil-Optimierung, Ernährungsberatung, Stressmanagement und persönliche Begleitung. Ärztliche Leistungen wie Labordiagnostik, Rezepte und medizinische Kontrollen werden separat in der ärztlichen Sprechstunde erbracht und nach GOÄ abgerechnet. Sie erhalten beides aus einer Hand — aber sauber getrennt.',
  },
  {
    question: 'Warum sollte es diesmal anders sein als bei meinen bisherigen Versuchen?',
    answer: 'Weil wir nicht an der Oberfläche bleiben. Die meisten Diäten und Programme behandeln nur Symptome. Wir schauen auf Ihre Biologie — Hormone, Stoffwechsel, Darmgesundheit, Stressachsen. Wenn Sie verstehen, WARUM Ihr Körper nicht mitspielt, können Sie gezielt handeln statt wieder nur zu hoffen.',
  },
  {
    question: 'Übernimmt die Krankenkasse die Kosten?',
    answer: 'Das Coaching ist eine Selbstzahlerleistung und wird nicht von gesetzlichen Krankenkassen übernommen. Private Krankenversicherungen erstatten in einigen Fällen Teile der ärztlichen Leistungen (Labor, Beratung nach GOÄ). Wir stellen Ihnen gerne die entsprechenden Unterlagen zur Einreichung aus.',
  },
  {
    question: 'Wie viel Zeit muss ich pro Woche investieren?',
    answer: 'Planen Sie ca. 2–3 Stunden pro Woche ein: einen Coaching-Call (45–60 Minuten) plus die Umsetzung der besprochenen Maßnahmen im Alltag. Das Programm ist so konzipiert, dass es sich in einen vollen Berufsalltag integrieren lässt.',
  },
  {
    question: 'Welche Voraussetzungen muss ich mitbringen?',
    answer: 'Die wichtigste Voraussetzung: die ehrliche Bereitschaft, etwas zu verändern. Wir begleiten Sie mit dem Plan und der Expertise — aber die Umsetzung liegt bei Ihnen. Wenn Sie bereit sind, Verantwortung für Ihre Gesundheit zu übernehmen, können wir zusammen Großes erreichen.',
  },
]

export const notForYouItems = [
  'Sie suchen eine Wunderpille oder schnelle Lösung ohne eigenes Zutun.',
  'Sie sind nicht bereit, Gewohnheiten ehrlich zu hinterfragen.',
  'Sie erwarten Ergebnisse, ohne selbst aktiv zu werden.',
  'Sie möchten eine reine Kassenleistung ohne Eigeninvestition.',
  'Sie suchen eine klassische ärztliche Behandlung — kein Coaching.',
]

export const comparisonData = {
  headers: ['', 'Typischer Coach', 'Telemedizin-Anbieter', 'Bright Medical'],
  rows: [
    ['Facharzt inklusive', 'Nein — Arzt extern, zusätzliche Kosten', 'Nur Online-Arzt', 'Ja — Ihr Arzt ist Ihr Coach'],
    ['Persönlicher Kontakt', 'Ja, aber kein Arzt', 'Nein, nur digital', 'Ja — online & vor Ort'],
    ['Individuelle Diagnostik', 'Selten, meist Standard', 'Standardisiert', 'Umfassend & individuell'],
    ['Ganzheitlicher Ansatz', 'Oft nur ein Thema', 'Nur Medikament', 'Alle Fäden in einer Hand'],
    ['Langzeitbegleitung', 'Unterschiedlich', 'Abo-Modell, unpersönlich', 'Individuell, bis zu 12 Monate'],
  ],
}

export const timelineSteps = [
  {
    weeks: 'Woche 1–2',
    title: 'Diagnostik & Erstgespräch',
    description: 'Wir hören zu. Analyse Ihrer Situation, Laborwerte, Ziele — das Fundament für alles Weitere.',
  },
  {
    weeks: 'Woche 3–4',
    title: 'Ihr persönlicher Plan',
    description: 'Ernährung, Bewegung, Supplemente — alles maßgeschneidert auf Ihre Biologie. Kein Standard, kein Schema F.',
  },
  {
    weeks: 'Woche 5–8',
    title: 'Anpassung & erste Erfolge',
    description: 'Regelmäßige Calls, Feintuning. Sie spüren die ersten Veränderungen — mehr Energie, besserer Schlaf, klarerer Kopf.',
  },
  {
    weeks: 'Woche 9–12',
    title: 'Stabilisierung & neue Normalität',
    description: 'Neue Gewohnheiten werden zur Routine. Messbare Ergebnisse. Ein Körper, dem Sie wieder vertrauen können.',
  },
]

export const metrics = [
  {
    icon: 'Scale',
    title: 'Körperkomposition',
    description: 'Präzise Messung statt Waage: Fettmasse, Muskelmasse, Wasserhaushalt — Sie sehen, was sich wirklich verändert.',
  },
  {
    icon: 'TestTubes',
    title: 'Laborwerte',
    description: 'Hormone, Entzündungsmarker, Nährstoffe — nicht nur „normal", sondern optimal. Wir schauen genauer hin.',
  },
  {
    icon: 'Heart',
    title: 'Vitalparameter',
    description: 'HRV, CGM, Schlafqualität — datenbasierte Entscheidungen statt Bauchgefühl.',
  },
  {
    icon: 'Smile',
    title: 'Lebensqualität',
    description: 'Energie, Schlaf, Stimmung, Fokus — das, was Sie jeden Tag spüren. Denn darauf kommt es am Ende an.',
  },
]

export const processSteps = [
  {
    step: 1,
    title: 'Anfrage & Fragebogen',
    description: 'Sie füllen einen kurzen Fragebogen aus. So können wir prüfen, ob wir Ihnen wirklich helfen können.',
  },
  {
    step: 2,
    title: 'Erstgespräch',
    description: 'Kostenlos & unverbindlich per Video-Call. Wir lernen uns kennen und besprechen Ihre Situation.',
  },
  {
    step: 3,
    title: 'Beratungsgespräch',
    description: 'Vertieftes Gespräch zu Ihren Zielen, Ihrem Plan und den nächsten Schritten. Transparent und ohne Druck.',
  },
  {
    step: 4,
    title: 'Coaching-Start',
    description: 'Ihr persönliches Protokoll beginnt. Regelmäßige Calls, kontinuierliche Begleitung — Sie sind nie allein.',
  },
]
