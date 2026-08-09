import { deriveProductExamState } from "../catalogExam"
import type { ProductExamRow } from "../types"

/**
 * DECISÃO DE DESENHO do ticket 03 (`.scratch/catalogo-como-exame/issues/`),
 * documentada aqui e no relatório: quando a tabela filtra por pedido, o
 * veredito exibido por linha precisa ser o DAQUELE PEDIDO, não o agregado
 * sobre todos os pedidos aprovados.
 *
 * `ProductExamRow.state` é agregado por construção (`aggregateCatalogExam`,
 * ticket 01) — é o veredito da loja inteira contra TODOS os pedidos do
 * lote. Um filtro que promete "só o que o pedido X descartou" mas continua
 * exibindo esse badge agregado mente para o lojista: um produto `mixed` na
 * agregação pode ter, DENTRO do pedido X isolado, só motivos de rejeição
 * legítima (o motivo de ilegibilidade veio de outro pedido do lote) — a
 * tela mostraria "confirmou em parte" numa vista que promete falar só do
 * pedido X, quando o pedido X sozinho diria "não atende".
 *
 * É também o que torna demonstrável o par A/B do `catalogo-demo` que o
 * critério de aceite do ticket pede: o mesmo produto ✅ (passou) num pedido
 * e ⭕ (rejeição legítima) noutro. Com o badge agregado os dois filtros
 * mostrariam o MESMO estado; só a derivação por pedido troca o veredito
 * junto com o filtro.
 *
 * A derivação REUSA `deriveProductExamState` de `catalogExam.ts` — a mesma
 * função que a agregação usa para ir de `reasons[].kind` a
 * `ProductExamState` — nunca uma cópia da lógica. Só os motivos ATRIBUÍDOS
 * àquele pedido (`reason.orderIds.includes(orderId)`) entram na derivação;
 * se nenhum motivo veio daquele pedido, o produto não foi descartado por
 * ele, e a função devolve `null` — quem filtra (`filterCatalogExamRows`) o
 * exclui, honrando "só o que o pedido X descartou" (a frase do ticket).
 */
export function deriveRowForOrder(
  row: ProductExamRow,
  orderId: string
): ProductExamRow | null {
  const reasonsForOrder = row.reasons.filter((reason) =>
    reason.orderIds.includes(orderId)
  )

  if (reasonsForOrder.length === 0) return null

  return {
    ...row,
    state: deriveProductExamState(true, reasonsForOrder),
    reasons: reasonsForOrder,
  }
}
