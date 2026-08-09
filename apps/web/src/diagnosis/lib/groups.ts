import type { DiscardedProduct } from "../types"

/**
 * Como a UI agrupa um produto descartado para exibição — lê só o campo
 * tipado `reasons[].kind` (nunca a frase `message`), a mesma regra dura do
 * ticket 06. `illegibilityOnly` é o grupo que conta para
 * `illegibleProductCount` (ver `aggregate.ts`); `mixed` e `legitimateOnly`
 * ficam de fora do número de topo mas continuam visíveis, cada um com seu
 * próprio tratamento visual.
 */
export type DiscardGroup = "illegibilityOnly" | "mixed" | "legitimateOnly"

export function discardGroup(product: DiscardedProduct): DiscardGroup {
  const hasIllegibility = product.reasons.some(
    (reason) => reason.kind === "illegibility"
  )
  const hasLegitimateRejection = product.reasons.some(
    (reason) => reason.kind === "legitimateRejection"
  )

  if (hasIllegibility && hasLegitimateRejection) return "mixed"
  if (hasIllegibility) return "illegibilityOnly"
  return "legitimateOnly"
}
