import { deriveProductExamState } from "../catalogExam"
import type {
  BuyerAgentOrderOutcome,
  GeneratedTestOrder,
  ProductExamState,
  UnmetRequirement,
} from "../types"

/**
 * Ticket 05 da `.scratch/catalogo-como-exame/` — o drill-down é a transposta
 * da tabela: um produto, N pedidos, em vez de um pedido, N produtos. A tabela
 * (`ProductExamRow`) só carrega o veredito AGREGADO e a lista de motivos já
 * deduplicada por frase (`reasons`, com `orderIds` de atribuição, mas sem
 * `confirmedRequirements` nenhum) — não dá pra reconstruir, a partir dela, o
 * que aconteceu num pedido isolado quando o produto passou nele. Por isso
 * esta função lê o veredito CRU por (produto, pedido)
 * (`BuyerAgentOrderOutcome[]`, o que `simulationRun.ts` agora carrega no
 * estado `success`) em vez do `CatalogExamResult` agregado.
 *
 * O estado por pedido é derivado com `deriveProductExamState` — a MESMA
 * função que `aggregateExamOutcomes` (`catalogExam.ts`) e `deriveRowForOrder`
 * (`deriveRowForOrder.ts`) já reusam para ir de `kind` a `ProductExamState`.
 * Nenhuma cópia da regra kind→estado nasce aqui.
 */
export type ProductOrderVerdict = {
  orderId: string
  orderText: string
  state: ProductExamState
  confirmedRequirements: string[]
  unmetRequirements: UnmetRequirement[]
}

export function buildProductDrillDown(
  productId: string,
  orders: GeneratedTestOrder[],
  outcomes: BuyerAgentOrderOutcome[]
): ProductOrderVerdict[] {
  return orders.map((order) => {
    const outcome = outcomes.find((entry) => entry.orderId === order.id)
    const product = outcome?.products.find(
      (candidate) => candidate.productId === productId
    )

    // Defensivo: todo pedido avalia o catálogo inteiro, então em produção
    // normal SEMPRE existe um outcome de produto para cada pedido. Se faltar
    // (lote incompleto, fixture parcial), a leitura mais segura é "sem
    // motivo nenhum contra o produto naquele pedido" — o mesmo critério de
    // vacuidade que `aggregateExamOutcomes` já aplica a um produto nunca
    // visto em outcome algum — em vez de quebrar o drill-down inteiro.
    if (!product) {
      return {
        orderId: order.id,
        orderText: order.text,
        state: "passed",
        confirmedRequirements: [],
        unmetRequirements: [],
      }
    }

    return {
      orderId: order.id,
      orderText: order.text,
      state: deriveProductExamState(
        product.unmetRequirements.length > 0,
        product.unmetRequirements
      ),
      confirmedRequirements: product.confirmedRequirements,
      unmetRequirements: product.unmetRequirements,
    }
  })
}
