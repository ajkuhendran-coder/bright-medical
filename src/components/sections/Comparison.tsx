import { Check, X as XIcon, Minus } from 'lucide-react'
import { comparisonData } from '../../data/content'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

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

        <div className="animate-on-scroll overflow-x-auto">
          <table className="w-full min-w-[600px]">
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
                      {cell === 'Ja, inklusive' ? (
                        <span className="inline-flex items-center gap-1.5 text-success font-semibold">
                          <Check size={16} /> {cell}
                        </span>
                      ) : cell.startsWith('Nein') ? (
                        <span className="inline-flex items-center gap-1.5 text-red-400">
                          <XIcon size={16} /> {cell}
                        </span>
                      ) : cell.startsWith('Nur') || cell.startsWith('Standardisiert') ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-500">
                          <Minus size={16} /> {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
