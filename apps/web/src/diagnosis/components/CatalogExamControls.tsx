import type * as React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EXAM_STATE_LABELS } from "../lib/examStateLabels"
import type { CatalogExamRowFilters } from "../lib/filterCatalogExamRows"
import { CATALOG_EXAM_SORT_DESCRIPTION } from "../lib/rankCatalogExamRows"
import type { ProductExamState } from "../types"

/**
 * O suficiente do pedido para o dropdown de filtro (rótulo + identidade) —
 * não mais `HandwrittenOrder` (redesenho do botão único removeu o pedido
 * digitado à mão desta tela; ver `.scratch/catalogo-como-exame/`). Quem
 * chama adapta `GeneratedTestOrder` (`id`, `text`) para este shape.
 */
export type FilterableOrderSummary = {
  id: string
  label: string
}

const STATE_FILTER_OPTIONS: ProductExamState[] = [
  "illegible",
  "mixed",
  "legitimatelyRejected",
  "passed",
]

type CatalogExamControlsProps = {
  filters: CatalogExamRowFilters
  onFiltersChange: (filters: CatalogExamRowFilters) => void
  orders: FilterableOrderSummary[]
  visibleRowCount: number
  totalRowCount: number
}

/**
 * Os controles de ordenação e filtro do ticket 03
 * (`.scratch/catalogo-como-exame/issues/`). Duas coisas que a tela precisa
 * dizer em voz alta, não só implementar:
 *
 * 1) O CRITÉRIO DE ORDENAÇÃO — critério de aceite explícito: "está visível
 *    na tela, não só no código". `CATALOG_EXAM_SORT_DESCRIPTION` vem de
 *    `rankCatalogExamRows.ts`, a mesma constante que documenta a degradação
 *    do desempate — uma fonte só, texto e comportamento nunca divergem.
 *
 * 2) A CONTAGEM DO RECORTE ATUAL É O SEGUNDO NÚMERO, NUNCA O PRIMEIRO — a
 *    regra dura do ticket (D1 da spec): a faixa de placar acima
 *    (`CatalogExamStrip`) continua falando da loja inteira; "mostrando X de
 *    Y" aqui é informação do recorte, não substitui nem se mistura com o
 *    placar.
 */
export function CatalogExamControls({
  filters,
  onFiltersChange,
  orders,
  visibleRowCount,
  totalRowCount,
}: CatalogExamControlsProps) {
  const stateItems: Record<string, React.ReactNode> = {
    all: "Todos os estados",
    ...Object.fromEntries(
      STATE_FILTER_OPTIONS.map((state) => [state, EXAM_STATE_LABELS[state]])
    ),
  }

  const orderItems: Record<string, React.ReactNode> = {
    all: "Todos os pedidos",
    ...Object.fromEntries(orders.map((order) => [order.id, order.label])),
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Estado
          <Select
            items={stateItems}
            value={filters.state}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                state: (value ?? "all") as ProductExamState | "all",
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {STATE_FILTER_OPTIONS.map((state) => (
                <SelectItem key={state} value={state}>
                  {EXAM_STATE_LABELS[state]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Pedido
          <Select
            items={orderItems}
            value={filters.orderId}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, orderId: value ?? "all" })
            }
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[420px]">
              <SelectItem value="all">Todos os pedidos</SelectItem>
              {orders.map((order) => (
                <SelectItem
                  key={order.id}
                  value={order.id}
                  className="[&>div]:whitespace-normal"
                >
                  {order.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Buscar por título ou handle
          <Input
            type="search"
            placeholder="Ex.: Aurora NC7 ou aurora-nc7"
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p>
          Ordenação padrão: <span className="font-medium">{CATALOG_EXAM_SORT_DESCRIPTION}</span>
        </p>
        <p className="tabular-nums">
          Mostrando {visibleRowCount} de {totalRowCount} produtos do catálogo
        </p>
      </div>
    </div>
  )
}
