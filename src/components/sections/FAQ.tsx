import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqs } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useScrollAnimation()

  return (
    <section id="faq" className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Häufige Fragen</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Ihre Fragen, beantwortet
          </h2>
        </div>

        <div className="animate-on-scroll space-y-3" role="list">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
              role="listitem"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-slate-light transition-colors cursor-pointer border-none"
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
                id={`faq-question-${i}`}
              >
                <span className="font-semibold text-navy pr-4">{faq.question}</span>
                <ChevronDown
                  size={20}
                  className={`text-teal shrink-0 transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <p className="px-5 pb-5 text-slate-body/70 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
