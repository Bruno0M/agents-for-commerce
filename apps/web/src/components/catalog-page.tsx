import { useReducer, useState } from "react"
import { FilterXIcon } from "lucide-react"

import type { ProductCatalogContent } from "@/lib/catalog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CatalogExamControls,
  type FilterableOrderSummary,
} from "@/diagnosis/components/CatalogExamControls"
import { CatalogExamOrdersPanel } from "@/diagnosis/components/CatalogExamOrdersPanel"
import {
  CatalogExamStrip,
  type CatalogExamState,
} from "@/diagnosis/components/CatalogExamStrip"
import { ExamStateBadge } from "@/diagnosis/components/ExamStateBadge"
import { NatureBadge } from "@/diagnosis/components/NatureBadge"
import { ProductDrillDownDialog } from "@/diagnosis/components/ProductDrillDownDialog"
import { aggregateExamOutcomes } from "@/diagnosis/catalogExam"
import { lojaRealSemGabaritoCatalog } from "@/diagnosis/fixtures/loja-real-sem-gabarito"
import { EXAM_STATE_LABELS } from "@/diagnosis/lib/examStateLabels"
import {
  DEFAULT_CATALOG_EXAM_ROW_FILTERS,
  filterCatalogExamRows,
  type CatalogExamRowFilters,
} from "@/diagnosis/lib/filterCatalogExamRows"
import { sortCatalogExamRows } from "@/diagnosis/lib/rankCatalogExamRows"
import { runSimulationAgent } from "@/diagnosis/lib/runSimulationAgent"
import {
  catalogSimulationRunReducer,
  INITIAL_CATALOG_SIMULATION_RUN_STATE,
} from "@/diagnosis/lib/simulationRun"
import type { GeneratedTestOrder, ProductExamRow } from "@/diagnosis/types"

// O catálogo desta tela é SEMPRE a fixture `lojaRealSemGabaritoCatalog` —
// decisão literal do dono do projeto: "enquanto não tiver conexão com api,
// vai ser sempre dado mockado, remova esse toggle". As fixtures do agente A
// (`diagnosis/fixtures/simulationAgentPayloads.ts`) são chaveadas nos
// produtos deste catálogo; misturar um catálogo lido de verdade
// (`fetchCatalog`, `@/lib/catalog`) com desfechos mockados produziria linhas
// sem produto correspondente. `fetchCatalog` continua existindo e intacto —
// só sem uso NESTA tela — para religar barato quando o transporte real
// existir (ticket 05 do `exame-guiado`). Por não haver mais leitura
// assíncrona nenhuma para o catálogo, não existe `useState`/`useEffect` de
// carregamento aqui: o catálogo é uma constante do módulo.
const catalog = lojaRealSemGabaritoCatalog

export function priceRange(prices: (string | null)[]): string {
  const values = prices
    .filter((price): price is string => price !== null)
    .map(Number)
    .filter((value) => !Number.isNaN(value))

  if (values.length === 0) {
    return "—"
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max
    ? `R$ ${min.toFixed(2)}`
    : `R$ ${min.toFixed(2)} – R$ ${max.toFixed(2)}`
}

export function CatalogPage() {
  // O estado de EXECUÇÃO do botão único "Rodar Agente de Simulação" —
  // `writing-orders` (etapa 1) → `running-agent` (etapa 2, já com os
  // pedidos da etapa 1) → `success`/`error`. `catalogSimulationRunReducer`
  // é lógica pura testada isoladamente
  // (`diagnosis/lib/simulationRun.test.ts`). Substitui o par
  // `approvedOrders`/`runState` do ticket 04 original (desenho rejeitado):
  // não há mais pedido aprovado para guardar, só o resultado de uma
  // simulação que o próprio botão dispara ponta a ponta.
  const [runState, dispatchRun] = useReducer(
    catalogSimulationRunReducer,
    INITIAL_CATALOG_SIMULATION_RUN_STATE
  )
  // Ordenação e filtro do ticket 03 (`.scratch/catalogo-como-exame/issues/`)
  // — só fazem sentido depois que o exame rodou, então os controles só
  // aparecem com o resultado pronto. As linhas visíveis e a ordenação são
  // DERIVADAS aqui embaixo, durante o render, nunca num `useEffect`: não
  // existe estado a sincronizar, só uma função pura (`sortCatalogExamRows` /
  // `filterCatalogExamRows`) aplicada ao resultado já carregado.
  const [filters, setFilters] = useState<CatalogExamRowFilters>(
    DEFAULT_CATALOG_EXAM_ROW_FILTERS
  )

  // O drill-down do ticket 05 (`.scratch/catalogo-como-exame/`) — qual
  // produto está com o modal aberto, ou nenhum. Deriva `product`/`examRow`
  // do catálogo/resultado já carregados em vez de guardar uma cópia deles
  // aqui: um único id evita os dois lados dessincronizarem quando o
  // resultado do exame muda.
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  )

  // O botão único: uma chamada orquestra as duas etapas reais —
  // `writeTestOrders` (o agente escreve os pedidos em prosa) e
  // `runBuyerAgent` (o agente compra contra eles) — e agrega o resultado
  // com `aggregateExamOutcomes` (o mesmo agregador que o servidor vai
  // alimentar quando o transporte existir). O lojista não aprova nem edita
  // nada entre as duas chamadas: elas disparam em sequência, sem passo
  // intermediário nem navegação.
  async function runSimulation() {
    const scope = { productCount: catalog.products.length }
    dispatchRun({ type: "start", scope })

    let generation: Awaited<
      ReturnType<typeof runSimulationAgent.writeTestOrders>
    >
    try {
      generation = await runSimulationAgent.writeTestOrders(catalog.products)
    } catch (error) {
      dispatchRun({
        type: "failure",
        stage: "writing-orders",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao escrever os pedidos de teste.",
      })
      return
    }

    // Os pedidos da etapa 1 ficam visíveis na hora — o painel read-only já
    // os renderiza enquanto a etapa 2 está em voo (ver o comentário de
    // cabeçalho de `CatalogExamOrdersPanel`).
    dispatchRun({ type: "ordersWritten", orders: generation.orders })

    try {
      const batch = await runSimulationAgent.runBuyerAgent(
        catalog.products,
        generation.orders
      )
      const result = aggregateExamOutcomes(catalog.products, batch.outcomes)
      dispatchRun({ type: "success", result, outcomes: batch.outcomes })
    } catch (error) {
      dispatchRun({
        type: "failure",
        stage: "running-agent",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao rodar o agente comprador.",
      })
    }
  }

  // O RESULTADO (para o placar e a tabela) é derivado do estado de
  // execução — "examinado" só quando a rodada terminou com sucesso.
  // `CatalogExamStrip` (ticket 02) continua consumindo o mesmo
  // `CatalogExamState` de sempre; ela não precisa saber que agora existem
  // dois estados intermediários (`writing-orders`/`running-agent`) por trás.
  const exam: CatalogExamState =
    runState.status === "success"
      ? { status: "examined", result: runState.result }
      : { status: "not-examined" }

  const productsById = new Map(
    catalog.products.map((product) => [product.id, product])
  )

  // A ordenação (D4 da spec) roda sobre o resultado do exame CRU — a faixa
  // de placar acima (`CatalogExamStrip`) sempre lê `exam.result` direto,
  // nunca `visibleRows`, porque filtrar/ordenar NÃO PODE mexer no número de
  // topo (regra dura do ticket 03, D1 da spec: o placar fala da loja
  // inteira, o recorte é sempre o segundo número).
  const visibleRows =
    exam.status === "examined"
      ? filterCatalogExamRows(sortCatalogExamRows(exam.result.rows), filters)
      : []

  const tableRows: { product: ProductCatalogContent; examRow: ProductExamRow | null }[] =
    exam.status === "examined"
      ? visibleRows.flatMap((examRow) => {
          const product = productsById.get(examRow.productId)
          return product ? [{ product, examRow }] : []
        })
      : catalog.products.map((product) => ({ product, examRow: null }))

  // Os pedidos que o agente escreveu — visíveis assim que a etapa 1
  // resolve (`running-agent`), continuam visíveis com o resultado
  // (`success`) e continuam visíveis junto de um erro da etapa 2
  // (`error` com `orders` não nulo — a etapa 1 tinha terminado). Uma falha
  // da etapa 1 (`error` com `orders: null`) não tem pedido nenhum para
  // mostrar.
  const examOrders: GeneratedTestOrder[] =
    runState.status === "running-agent" || runState.status === "success"
      ? runState.orders
      : runState.status === "error" && runState.orders !== null
        ? runState.orders
        : []

  const orderSummaries: FilterableOrderSummary[] = examOrders.map((order) => ({
    id: order.id,
    label: order.text,
  }))

  // O produto e a linha do modal de drill-down — `examRow` só existe quando
  // o exame já rodou (a linha vem de `exam.result.rows`, nunca recalculada
  // aqui). `ProductDrillDownDialog` decide sozinho que `open` é os dois não
  // nulos ao mesmo tempo.
  const selectedProduct = productsById.get(selectedProductId ?? "") ?? null
  const selectedExamRow =
    exam.status === "examined" && selectedProductId !== null
      ? (exam.result.rows.find((row) => row.productId === selectedProductId) ??
        null)
      : null
  const selectedOutcomes =
    runState.status === "success" ? runState.outcomes : []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Loja de exemplo sem gabarito — modo fixture, sem servidor no ar.
        </p>
      </div>

      <CatalogExamStrip
        totalProductCount={catalog.products.length}
        exam={exam}
      />

      {catalog.products.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilterXIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhum produto ativo</EmptyTitle>
            <EmptyDescription>
              A loja configurada não tem produtos com status:ACTIVE no
              momento.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <CatalogExamOrdersPanel
            runState={runState}
            totalProductCount={catalog.products.length}
            examResult={exam.status === "examined" ? exam.result : null}
            onRun={runSimulation}
          />

          {exam.status === "examined" && (
            <CatalogExamControls
              filters={filters}
              onFiltersChange={setFilters}
              orders={orderSummaries}
              visibleRowCount={visibleRows.length}
              totalRowCount={exam.result.rows.length}
            />
          )}

          {exam.status === "examined" && visibleRows.length === 0 ? (
            <CatalogExamFilterEmptyState
              filters={filters}
              orders={orderSummaries}
              totalRowCount={exam.result.rows.length}
              onClearFilters={() => setFilters(DEFAULT_CATALOG_EXAM_ROW_FILTERS)}
            />
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Perdido em</TableHead>
                    <TableHead>O robô conseguiu avaliar?</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.map(({ product, examRow }) => (
                    <TableRow
                      key={product.id}
                      onClick={
                        examRow
                          ? () => setSelectedProductId(product.id)
                          : undefined
                      }
                      className={
                        examRow ? "cursor-pointer hover:bg-muted/50" : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        {examRow ? (
                          <span className="hover:underline">
                            {product.title}
                          </span>
                        ) : (
                          product.title
                        )}
                      </TableCell>
                      <TableCell>
                        <SilentLossCell
                          examRow={examRow}
                          orderCount={
                            exam.status === "examined" ? exam.result.orderCount : 0
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {examRow ? (
                          <ExamStateBadge state={examRow.state} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ExamReasonsCell row={examRow} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.vendor ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.productType ?? "—"}
                      </TableCell>
                      <TableCell>
                        {priceRange(product.variants.map((v) => v.price))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <ProductDrillDownDialog
        product={selectedProduct}
        examRow={selectedExamRow}
        orders={examOrders}
        outcomes={selectedOutcomes}
        onOpenChange={(open) => {
          if (!open) setSelectedProductId(null)
        }}
      />
    </div>
  )
}

/**
 * A perda silenciosa (D4 da spec, ticket 03) como informação DE LINHA — é o
 * critério de ordenação padrão, então precisa estar visível na própria
 * linha que ele ordena, não só implícito na posição. Lê `silentLossCount`
 * pronto do ticket 01; nenhum cálculo novo aqui.
 */
function SilentLossCell({
  examRow,
  orderCount,
}: {
  examRow: ProductExamRow | null
  orderCount: number
}) {
  if (!examRow) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <span className="text-sm tabular-nums">
      {examRow.silentLossCount} de {orderCount} pedido
      {orderCount === 1 ? "" : "s"}
    </span>
  )
}

/**
 * O estado vazio de um FILTRO — critério de aceite do ticket 03: precisa
 * dizer o que foi filtrado, e não pode ser a mesma tela do catálogo vazio
 * ("Nenhum produto ativo", acima). Aquele estado significa "a loja não tem
 * produto nenhum"; este significa "a loja tem produtos, o recorte atual
 * (estado/pedido/busca) é que não bate com nenhum" — e por isso sempre
 * mostra `totalRowCount` (> 0) e um jeito de voltar (`onClearFilters`).
 */
function CatalogExamFilterEmptyState({
  filters,
  orders,
  totalRowCount,
  onClearFilters,
}: {
  filters: CatalogExamRowFilters
  orders: FilterableOrderSummary[]
  totalRowCount: number
  onClearFilters: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FilterXIcon />
        </EmptyMedia>
        <EmptyTitle>Nenhum produto corresponde aos filtros</EmptyTitle>
        <EmptyDescription>
          Filtro ativo: {describeActiveFilters(filters, orders)}. O catálogo
          tem {totalRowCount} produto{totalRowCount === 1 ? "" : "s"}
          examinado{totalRowCount === 1 ? "" : "s"} — o recorte atual é que
          não bate com nenhum deles, o catálogo não está vazio.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function describeActiveFilters(
  filters: CatalogExamRowFilters,
  orders: FilterableOrderSummary[]
): string {
  const parts: string[] = []

  if (filters.state !== "all") {
    parts.push(`estado "${EXAM_STATE_LABELS[filters.state]}"`)
  }
  if (filters.orderId !== "all") {
    const order = orders.find((candidate) => candidate.id === filters.orderId)
    parts.push(`pedido "${order?.label ?? filters.orderId}"`)
  }
  if (filters.search.trim() !== "") {
    parts.push(`busca "${filters.search.trim()}"`)
  }

  return parts.length > 0 ? parts.join(", ") : "nenhum"
}

/**
 * O motivo aparece na linha com a frase exata do engine (`reason.message`),
 * sem reescrita — critério de aceite do ticket 02. A natureza de cada
 * motivo vem de `reason.kind`, nunca de reler a frase.
 */
function ExamReasonsCell({ row }: { row: ProductExamRow | null }) {
  if (!row || row.reasons.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {row.reasons.map((reason) => (
        <li key={reason.message} className="flex items-start gap-1.5 text-xs">
          <NatureBadge kind={reason.kind} />
          <span className="mt-0.5">{reason.message}</span>
        </li>
      ))}
    </ul>
  )
}
