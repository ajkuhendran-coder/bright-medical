// Zentrale Definition aller Fragebogen-Fragen.
// Single source of truth: Frontend rendert daraus, Backend validiert daraus,
// und der Email/Notion-Output formatiert daraus.
//
// Reihenfolge & Wording entsprechen dem produktiven Google Form
// (gespiegelt aus „Qualifizierungsfragebogen für Ihr Ärztliches Gesundheitscoaching").

export type QuestionType = 'text' | 'textarea' | 'radio'

export type Question = {
  id: string                      // stable key, wird als Notion-Property + JSON-Field benutzt
  step: 1 | 2 | 3 | 4 | 5
  label: string
  type: QuestionType
  required: boolean
  placeholder?: string
  hint?: string
  options?: string[]              // für type=radio
  maxLength?: number              // soft limit für freie Texte
}

export type StepDef = {
  step: 1 | 2 | 3 | 4 | 5
  title: string
  description?: string
}

export const STEPS: StepDef[] = [
  {
    step: 1,
    title: 'Persönliche Daten',
    description: 'Damit ich Sie persönlich ansprechen kann.',
  },
  {
    step: 2,
    title: 'Ihr Gesundheitsthema',
    description: 'Worum geht es Ihnen, und seit wann beschäftigt es Sie?',
  },
  {
    step: 3,
    title: 'Aktuelle Situation',
    description: 'Ein kurzer Blick auf Ihren aktuellen Stand.',
  },
  {
    step: 4,
    title: 'Erfahrung & Bereitschaft',
    description: 'Damit ich einschätzen kann, wie ich Sie am besten begleiten kann.',
  },
  {
    step: 5,
    title: 'Zum Abschluss',
    description: 'Letzte zwei Fragen, fast geschafft.',
  },
]

export const QUESTIONS: Question[] = [
  // --- Step 1: Persönliche Daten ---
  {
    id: 'name',
    step: 1,
    label: 'Vollständiger Name',
    type: 'text',
    required: true,
    placeholder: 'Vor- und Nachname',
    maxLength: 200,
  },
  {
    id: 'alter',
    step: 1,
    label: 'Bitte geben Sie Ihr Alter an.',
    type: 'radio',
    required: true,
    options: ['Unter 30 Jahre', '30 – 39 Jahre', '40 – 49 Jahre', '50 – 59 Jahre', '60 Jahre und älter'],
  },
  {
    id: 'geschlecht',
    step: 1,
    label: 'Welches Geschlecht geben Sie an?',
    type: 'radio',
    required: true,
    options: ['Männlich', 'Weiblich', 'Divers', 'Möchte ich nicht angeben'],
  },
  {
    id: 'koerper',
    step: 1,
    label: 'Wie groß sind Sie und wie viel wiegen Sie aktuell?',
    type: 'text',
    required: true,
    placeholder: 'z.B. 175 cm, 82 kg',
    hint: 'Hilft mir, ein realistisches Bild Ihrer Ausgangslage zu bekommen.',
    maxLength: 80,
  },

  // --- Step 2: Ihr Gesundheitsthema ---
  {
    id: 'thema',
    step: 2,
    label: 'Welches Gesundheitsthema ist für Sie aktuell am relevantesten?',
    type: 'radio',
    required: true,
    options: [
      'Gewichtsoptimierung / Abnehmen',
      'Hormonoptimierung',
      'Darmgesundheit / Erschöpfung',
      'Longevity / Anti-Aging / Prävention',
      'Sonstiges',
    ],
  },
  {
    id: 'ziel',
    step: 2,
    label: 'Beschreiben Sie bitte Ihr Hauptziel für das Coaching in 1–2 Sätzen.',
    type: 'textarea',
    required: true,
    placeholder: 'Was wollen Sie in den nächsten Monaten erreichen?',
    maxLength: 800,
  },
  {
    id: 'dauer',
    step: 2,
    label: 'Wie lange beschäftigen Sie sich bereits aktiv mit diesem Gesundheitsthema?',
    type: 'radio',
    required: true,
    options: ['Unter 3 Monate', '3 bis 12 Monate', '1 bis 3 Jahre', 'Länger als 3 Jahre'],
  },

  // --- Step 3: Aktuelle Situation ---
  {
    id: 'gesundheitszustand',
    step: 3,
    label: 'Wie würden Sie Ihren aktuellen allgemeinen Gesundheitszustand beschreiben?',
    type: 'radio',
    required: true,
    options: [
      'Im Allgemeinen gesund und symptomfrei.',
      'Ich habe leichte, gelegentliche Beschwerden.',
      'Ich habe regelmäßig Beschwerden, die mich im Alltag einschränken.',
      'Ich habe eine oder mehrere chronische Erkrankungen.',
    ],
  },
  {
    id: 'medikamente',
    step: 3,
    label: 'Nehmen Sie derzeit regelmäßig Medikamente ein? Wenn ja, welche?',
    type: 'textarea',
    required: false,
    placeholder: 'Optional, z.B. Blutdruckmedikamente, Schilddrüsenhormone …',
    hint: 'Vertraulich. Wird nur für die Coaching-Vorbereitung genutzt.',
    maxLength: 800,
  },

  // --- Step 4: Erfahrung & Bereitschaft ---
  {
    id: 'coaching_erfahrung',
    step: 4,
    label: 'Welche Erfahrungen haben Sie bisher mit professionellem Coaching oder ähnlichen Programmen gemacht?',
    type: 'radio',
    required: true,
    options: [
      'Nein, ich habe noch keine Coaching-Erfahrung.',
      'Ja, ich habe bereits an einem Programm teilgenommen.',
      'Ja, ich habe mehrfach an Programmen teilgenommen.',
    ],
  },
  {
    id: 'bereitschaft',
    step: 4,
    label: 'Wie groß ist Ihre Bereitschaft, notwendige Änderungen im Lebensstil (Ernährung, Bewegung, Stressmanagement) konsequent umzusetzen?',
    type: 'radio',
    required: true,
    options: [
      'Ja, ich bin hoch motiviert und bereit, sofort zu starten.',
      'Ja, ich möchte mich ändern, brauche aber intensive Unterstützung und Anleitung.',
      'Ich bin noch unsicher, wie viel Aufwand ich betreiben kann/möchte.',
      'Ich möchte zunächst nur unverbindlich Informationen sammeln.',
    ],
  },

  // --- Step 5: Zum Abschluss ---
  {
    id: 'aufmerksam',
    step: 5,
    label: 'Wie sind Sie auf Bright Medical aufmerksam geworden?',
    type: 'radio',
    required: true,
    options: [
      'Empfehlung (Freunde, Familie, Bekannte)',
      'Instagram oder andere Social Media',
      'Suchmaschine (Google etc.)',
      'Praxis KUHENDRAN (Bestandspatient:in)',
      'Sonstiges',
    ],
  },
  {
    id: 'sonstiges',
    step: 5,
    label: 'Möchten Sie uns sonst noch etwas mitteilen oder gibt es wichtige zusätzliche Informationen, die wir vorab wissen sollten?',
    type: 'textarea',
    required: false,
    placeholder: 'Optional, alles, was Ihnen wichtig erscheint.',
    maxLength: 1500,
  },
]

// Hilfsfunktionen ------------------------------------------------------------

export function questionsForStep(step: 1 | 2 | 3 | 4 | 5): Question[] {
  return QUESTIONS.filter((q) => q.step === step)
}

export function totalSteps(): number {
  return STEPS.length
}

export type Answers = Record<string, string>
