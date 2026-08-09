import type { ComparisonResult } from "../types"
import { noProductPassedEitherRound } from "../lib/grid"
import { Header } from "./Header"
import { RequirementsGrid } from "./RequirementsGrid"
import { Scoreboard } from "./Scoreboard"

type ComparisonViewProps = {
  result: ComparisonResult
}

export function ComparisonView({ result }: ComparisonViewProps) {
  const nobodyPassed = noProductPassedEitherRound(result.products)

  return (
    <main className="comparison-surface mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <Header
        naturalLanguageOrder={result.naturalLanguageOrder}
        requirements={result.requirements}
        maxPrice={result.maxPrice}
      />
      <Scoreboard
        before={result.before}
        after={result.after}
        successRateDeltaCount={result.successRateDeltaCount}
      />
      {nobodyPassed && (
        <p className="mt-8 flex gap-3 rounded-md border border-cv-warn-line bg-cv-warn-soft px-4 py-3 text-sm text-cv-warn">
          <span
            aria-hidden="true"
            className="font-cv-mono text-xs font-semibold"
          >
            !
          </span>
          <span>
            Nenhum produto confirmou todos os requisitos obrigatórios em nenhuma
            das rodadas. Isso não é necessariamente catálogo fraco — confira se
            alguma coluna abaixo está destacada no cabeçalho: é sinal de bug de
            extração, não de característica ausente.
          </span>
        </p>
      )}
      <RequirementsGrid products={result.products} />
    </main>
  )
}
