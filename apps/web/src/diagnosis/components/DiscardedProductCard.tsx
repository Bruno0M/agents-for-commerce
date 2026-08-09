import { AlertTriangleIcon, ScaleIcon, SplitIcon } from "lucide-react"
import type { DiscardedProduct } from "../types"
import { discardGroup, type DiscardGroup } from "../lib/groups"
import { NatureBadge } from "./NatureBadge"

const GROUP_LABEL: Record<DiscardGroup, string> = {
  illegibilityOnly: "O agente não conseguiu avaliar",
  mixed: "Motivo misto — conserto não recupera esta venda",
  legitimateOnly: "Rejeição legítima — não é falha da loja",
}

const GROUP_ICON: Record<DiscardGroup, typeof AlertTriangleIcon> = {
  illegibilityOnly: AlertTriangleIcon,
  mixed: SplitIcon,
  legitimateOnly: ScaleIcon,
}

const GROUP_CARD_STYLE: Record<DiscardGroup, string> = {
  illegibilityOnly: "border-caution-line bg-caution-soft/60",
  mixed: "border-border bg-muted/30",
  legitimateOnly: "border-border bg-card",
}

const GROUP_EXPLANATION: Record<DiscardGroup, string> = {
  illegibilityOnly:
    "Conta na métrica de topo: o produto pode atender na prática, a loja só não provou de forma legível. É o que o conserto (fase 4) resolve.",
  mixed:
    "Mesmo depois de consertar o conteúdo ilegível, este produto continua sendo rejeitado por um motivo legítimo — por isso fica fora da métrica de topo, mas continua visível aqui.",
  legitimateOnly:
    "O dado estruturado existe e nega o requisito. Descarte correto do exame, não um problema da loja.",
}

type DiscardedProductCardProps = {
  product: DiscardedProduct
}

export function DiscardedProductCard({ product }: DiscardedProductCardProps) {
  const group = discardGroup(product)
  const Icon = GROUP_ICON[group]

  return (
    <li
      className={`rounded-lg border p-4 ${GROUP_CARD_STYLE[group]}`}
      data-testid="discarded-product-card"
      data-discard-group={group}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{product.title}</h3>
          <p className="text-xs text-muted-foreground">{product.handle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" aria-hidden="true" />
          {GROUP_LABEL[group]}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {GROUP_EXPLANATION[group]}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {product.reasons.map((reason) => (
          <li
            key={reason.message}
            className="flex flex-wrap items-start gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-sm"
          >
            <NatureBadge kind={reason.kind} />
            <span className="flex-1">{reason.message}</span>
          </li>
        ))}
      </ul>
    </li>
  )
}
