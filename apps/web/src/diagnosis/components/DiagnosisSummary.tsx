import { PercentIcon } from "lucide-react"
import type { DiagnosisResult } from "../types"

type DiagnosisSummaryProps = {
  result: DiagnosisResult
}

/**
 * A métrica de topo (D3 da spec) e a declaração explícita de escopo e de
 * ausência de gabarito. Dois critérios de aceite do ticket 06 vivem aqui:
 * o número de topo é a contagem, não um percentual; e a ausência do
 * percentual é dita em voz alta, não um "0%" mudo que pareceria um
 * resultado real.
 */
export function DiagnosisSummary({ result }: DiagnosisSummaryProps) {
  const orderWord = result.orderCount === 1 ? "pedido" : "pedidos"

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Produtos que o agente nem conseguiu avaliar
      </p>

      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tabular-nums">
          {result.illegibleProductCount}
        </span>
        <span className="text-xl text-muted-foreground">
          de {result.totalProductCount}
        </span>
      </p>

      <p className="mt-3 text-sm text-muted-foreground">
        Escopo: catálogo inteiro ({result.totalProductCount} produtos),
        simulado contra {result.orderCount} {orderWord} digitado
        {result.orderCount === 1 ? "" : "s"} à mão.
      </p>

      <p className="mt-4 flex items-start gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        <PercentIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Sem percentual de classificação correta nesta fase, de propósito:
          essa métrica depende de um gabarito — quais produtos deviam
          atender cada pedido — que uma loja real não tem no primeiro run.
          A ausência não é um "0%"; é a métrica de topo acima, que não
          precisa de gabarito nenhum para significar algo.
        </span>
      </p>
    </div>
  )
}
