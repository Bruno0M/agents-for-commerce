import { CheckIcon } from "lucide-react"

import type { ProductCatalogContent } from "@/lib/catalog"
import { priceRange } from "@/components/catalog-page"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExamStateBadge } from "@/diagnosis/components/ExamStateBadge"
import { NatureBadge } from "@/diagnosis/components/NatureBadge"
import {
  buildProductDrillDown,
  type ProductOrderVerdict,
} from "@/diagnosis/lib/buildProductDrillDown"
import type {
  BuyerAgentOrderOutcome,
  GeneratedTestOrder,
  ProductExamRow,
} from "@/diagnosis/types"

/**
 * Ticket 05 da `.scratch/catalogo-como-exame/` — o modal de drill-down: um
 * produto, o breakdown por pedido ("Produto atual", sempre populado) e,
 * quando faz sentido, a ausência explícita de um "depois" (o conserto em
 * lote é o ticket 06, ainda não construído). Nunca fabrica um "depois"
 * copiando o "antes" — ver o comentário de `buildProductDrillDown.ts` e o
 * plano aprovado para o porquê.
 *
 * `open` é derivado de `product`/`examRow`, não de um terceiro booleano — a
 * mesma decisão que o resto da tela já toma (`exam.status` deriva tudo):
 * um dos dois nulo já significa "nada selecionado", não há estado paralelo
 * para dessincronizar.
 */
type ProductDrillDownDialogProps = {
  product: ProductCatalogContent | null
  examRow: ProductExamRow | null
  orders: GeneratedTestOrder[]
  outcomes: BuyerAgentOrderOutcome[]
  onOpenChange: (open: boolean) => void
}

export function ProductDrillDownDialog({
  product,
  examRow,
  orders,
  outcomes,
  onOpenChange,
}: ProductDrillDownDialogProps) {
  const open = product !== null && examRow !== null

  const verdicts =
    product !== null
      ? buildProductDrillDown(product.id, orders, outcomes)
      : []

  // A coluna "Após melhoria" só faz sentido nos dois estados em que
  // conserto de conteúdo é uma ação possível (D2 da spec) — `passed` não
  // tem o que consertar, `legitimatelyRejected` tem uma nota própria
  // abaixo, nunca uma coluna vazia ao lado.
  const showAfterPanel =
    examRow !== null &&
    (examRow.state === "illegible" || examRow.state === "mixed")
  const showNoActionNote =
    examRow !== null && examRow.state === "legitimatelyRejected"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={showAfterPanel ? "sm:max-w-3xl" : "sm:max-w-lg"}
      >
        {product && examRow && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle>{product.title}</DialogTitle>
                <ExamStateBadge state={examRow.state} />
              </div>
              <DialogDescription>
                {product.handle} · {product.vendor ?? "—"} ·{" "}
                {priceRange(product.variants.map((variant) => variant.price))}
              </DialogDescription>
            </DialogHeader>

            <div
              className={
                showAfterPanel
                  ? "grid gap-6 sm:grid-cols-2"
                  : "flex flex-col gap-4"
              }
            >
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Produto atual
                </h3>
                <div className="flex flex-col gap-3">
                  {verdicts.map((verdict) => (
                    <OrderVerdictCard key={verdict.orderId} verdict={verdict} />
                  ))}
                </div>
              </div>

              {showAfterPanel && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Após melhoria
                  </h3>
                  <div className="flex flex-1 flex-col justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p>
                      Este produto ainda não passou pelo conserto. Quando o
                      conserto em lote rodar (ticket 06), o antes e o depois
                      aparecem aqui lado a lado.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {showNoActionNote && (
              <p className="rounded-md border border-quiet-line bg-quiet-soft px-3 py-2 text-xs text-quiet-ink">
                O dado que nega o requisito já existe e está correto —
                nenhuma ação de conserto se aplica.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Um pedido, o veredito daquele produto isoladamente naquele pedido — o
 * badge é o mesmo `ExamStateBadge` da linha da tabela, só em escala menor
 * (`scale-90`), pra ficar visualmente distinto do badge do cabeçalho sem
 * precisar de um segundo componente de estado.
 */
function OrderVerdictCard({ verdict }: { verdict: ProductOrderVerdict }) {
  const hasAnyRequirement =
    verdict.confirmedRequirements.length > 0 ||
    verdict.unmetRequirements.length > 0

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm">{verdict.orderText}</p>
        <span className="inline-block shrink-0 origin-right scale-90">
          <ExamStateBadge state={verdict.state} />
        </span>
      </div>

      {verdict.confirmedRequirements.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {verdict.confirmedRequirements.map((message) => (
            <li
              key={message}
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <CheckIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      )}

      {verdict.unmetRequirements.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {verdict.unmetRequirements.map((reason) => (
            <li
              key={reason.message}
              className="flex items-start gap-1.5 text-xs"
            >
              <NatureBadge kind={reason.kind} />
              <span className="mt-0.5">{reason.message}</span>
            </li>
          ))}
        </ul>
      )}

      {!hasAnyRequirement && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nenhum requisito deste pedido se aplica a este produto.
        </p>
      )}
    </div>
  )
}
