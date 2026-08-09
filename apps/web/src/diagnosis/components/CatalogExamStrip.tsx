import { InfoIcon } from "lucide-react"
import type { CatalogExamResult } from "../types"

export type CatalogExamState =
  { status: "not-examined" } | { status: "examined"; result: CatalogExamResult }

type CatalogExamStripProps = {
  /** O catálogo carregado agora, examinado ou não — é o escopo declarado
   * antes do exame rodar (ver comentário abaixo sobre o D1). */
  totalProductCount: number
  exam: CatalogExamState
}

/**
 * A faixa de placar do ticket 02 da `.scratch/catalogo-como-exame/` — o D1
 * da spec: o número de topo mora numa faixa sempre visível acima da tabela,
 * nunca é derivável contando linhas coloridas, e antes de o exame rodar ela
 * não some — mostra "não examinado" explicitamente, que é informação.
 *
 * DECISÃO DE DESENHO (documentada aqui e no relatório do ticket): o D1 da
 * spec cogita o `Scoreboard` de `comparison/components/` ganhar uma
 * variante para a loja inteira. Não é isso que este componente faz. O
 * `Scoreboard` é acoplado a `ComparisonResult` — um antes→depois de UMA
 * comparação (`before`/`after`/`successRateDeltaCount`) — e aos tokens
 * `cv-*` de `comparison.css`, que existem para o bundle single-file sob CSP
 * do ticket 14 da `entrega-hackathon`. Neste ticket não existe antes→depois:
 * o antes→depois só nasce com o conserto (ticket 06 desta spec); o dado
 * aqui é `CatalogExamResult`, uma contagem só, sem rodada anterior para
 * comparar. Forkar o `Scoreboard` para um "antes" que não existe quebraria
 * a pureza documentada no D9 (`ComparisonView` nunca deve saber que existe
 * uma tabela em volta) e obrigaria a faixa a herdar tokens `cv-*` que não
 * fazem sentido fora do bundle de comparação. Por isso: faixa nova, no
 * design system do app (shadcn/tailwind), no mesmo espírito do
 * `DiagnosisSummary` — que já resolve "número de topo + escopo declarado +
 * ausência de percentual dita em voz alta" para a fase 3 do wizard. A
 * variante do `Scoreboard` fica para o ticket 06, onde o delta de fato
 * existe.
 */
export function CatalogExamStrip({
  totalProductCount,
  exam,
}: CatalogExamStripProps) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Produtos que o robô comprador não conseguiu confirmar
      </p>

      {exam.status === "not-examined" ? (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-muted-foreground">
              Não examinado
            </span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Escopo pronto: {totalProductCount} produto
            {totalProductCount === 1 ? "" : "s"} no catálogo, aguardando o
            agente de simulação escrever os pedidos e rodar o exame.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums">
              {exam.result.illegibleProductCount}
            </span>
            <span className="text-xl text-muted-foreground">
              de {exam.result.totalProductCount}
            </span>
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            Escopo: catálogo inteiro ({exam.result.totalProductCount} produtos),
            simulado contra {exam.result.orderCount} pedido
            {exam.result.orderCount === 1 ? "" : "s"} escrito
            {exam.result.orderCount === 1 ? "" : "s"} pelo agente de
            simulação.
          </p>

          <p className="mt-4 flex items-start gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Sem percentual de classificação correta aqui, de propósito: essa
              métrica depende de um gabarito que uma loja real não tem no
              primeiro exame. A ausência não é um "0%"; é a contagem acima, que
              não precisa de gabarito nenhum para significar algo.
            </span>
          </p>
        </>
      )}
    </section>
  )
}
