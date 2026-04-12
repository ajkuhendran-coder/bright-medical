import { Check, X as XIcon, Minus } from 'lucide-react'
import { comparisonData } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

function CellContent({ cell }: { cell: string }) {
  if (cell === 'Ja, inklusive' || cell.startsWith('Ja')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success font-semibold">
        <Check size={16} /> {cell}
      </span>
    )
  }
  if (cell.startsWith('Nein')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-400">
        <XIcon size={16} /> {cell}
      </span>
    )
  }
  if (cell.startsWith('Nur') || cell.startsWith('Standardisiert') || cell.startsWith('Oft') || cell.startsWith('Abo') || cell.startsWith('Unterschiedlich') || cell.startsWith('Selten')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-500">
        <Minus size={16} /> {cell}
      </span>
    )
  }
  return <>{cell}</>
}

export default function Comparison() {
  const ref = useScrollAnimation()

  return (
    <section className="py-20 lg:py-28 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <span className="text-teal text-sm font-semibold tracking-wider uppercase">Der Unterschied</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mt-4 mb-6">
            Warum Bright Medical?
          </h2>
          <p className="text-lg text-slate-body/70 max-w-2xl mx-auto">
            Bei anderen Coaches zahlen Sie den Arzt extra. Bei uns ist er inklusive.
          </p>
        </div>

        {/* Mobile: Card Layout — Bright Medical prominent */}
        <div className="lg:hidden animate-on-scroll space-y-4">
          {comparisonData.rows.map((row, ri) => (
            <div key={ri} className="rounded-2xl border border-gray-100 overflow-hidden">
              {/* Feature Name */}
              <div className="bg-gray-50 px-5 py-3">
                <span className="font-semibold text-navy text-sm">{row[0]}</span>
              </div>
              {/* Bright Medical — highlighted */}
              <div className="bg-teal/5 px-5 py-3 border-l-4 border-teal">
                <span className="text-xs text-teal font-semibold uppercase tracking-wider">Bright Medical</span>
                <div className="text-sm text-navy font-medium mt-1">
                  <CellContent cell={row[3]} />
                </div>
              </div>
              {/* Competitors */}
              <div className="px-5 py-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-body/40 font-medium">Typischer Coach</span>
                  <div className="text-slate-body/60 mt-0.5">
                    <CellContent cell={row[1]} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-body/40 font-medium">Telemedizin</span>
                  <div className="text-slate-body/60 mt-0.5">
                    <CellContent cell={row[2]} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table Layout */}
        <div className="animate-on-scroll hidden lg:block">
          <table className="w-full">
            <thead>
              <tr>
                {comparisonData.headers.map((header, i) => (
                  <th
                    key={i}
                    className={`text-left py-4 px-6 text-sm font-semibold ${
                      i === 3
                        ? 'bg-teal/10 text-navy rounded-t-2xl'
                        : 'text-slate-body/60'
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonData.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-gray-100">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`py-4 px-6 text-sm ${
                        ci === 0
                          ? 'font-semibold text-navy'
                          : ci === 3
                            ? 'bg-teal/5 font-medium text-navy'
                            : 'text-slate-body/60'
                      } ${ri === comparisonData.rows.length - 1 && ci === 3 ? 'rounded-b-2xl' : ''}`}
                    >
                      <CellContent cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA after comparison */}
        <div className="animate-on-scroll text-center mt-12">
          <button
            onClick={() => document.querySelector('#kontakt')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-teal hover:bg-teal-dark text-white px-8 py-4 rounded-full text-base font-semibold transition-all cursor-pointer border-none shadow-lg shadow-teal/25"
          >
            Jetzt herausfinden, ob wir Ihnen helfen können
          </button>
        </div>
      </div>
    </section>
  )
}
