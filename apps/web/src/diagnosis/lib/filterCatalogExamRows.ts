import type { ProductExamRow, ProductExamState } from "../types"
import { deriveRowForOrder } from "./deriveRowForOrder"

/**
 * Os filtros mínimos do ticket 03 (`.scratch/catalogo-como-exame/issues/`):
 * por estado (os quatro do D2), por pedido, e busca por título/handle.
 * Filtro por tipo de produto ficou de fora — não é o que este ticket existe
 * para provar (a frase é do próprio ticket). Filtro e ordenação rodam no
 * cliente, sobre o `CatalogExamResult` já carregado; paginação não é
 * requisito.
 */
export type CatalogExamRowFilters = {
  /** "all" ou um dos quatro estados do D2. */
  state: ProductExamState | "all"
  /**
   * "all" ou o id de um pedido aprovado. Quando um pedido é escolhido, a
   * lista se restringe ao que ELE especificamente descartou (nunca ao
   * agregado) e o veredito de cada linha é recalculado só com os motivos
   * daquele pedido — ver `deriveRowForOrder.ts` para a decisão de desenho
   * completa (é o que torna o par A/B do `catalogo-demo` demonstrável).
   */
  orderId: string | "all"
  /** Substring, case-insensitive, contra título OU handle. "" = sem busca. */
  search: string
}

export const DEFAULT_CATALOG_EXAM_ROW_FILTERS: CatalogExamRowFilters = {
  state: "all",
  orderId: "all",
  search: "",
}

/** Usado pela UI para decidir se vale oferecer "limpar filtros". */
export function catalogExamRowFiltersAreDefault(
  filters: CatalogExamRowFilters
): boolean {
  return (
    filters.state === "all" &&
    filters.orderId === "all" &&
    filters.search.trim() === ""
  )
}

/**
 * Aplica os três filtros do ticket 03 sobre as linhas do exame — pensada
 * para rodar depois de `sortCatalogExamRows` (filtrar não deveria mexer na
 * ordem relativa das linhas que sobram).
 *
 * REGRA DURA (D1 da spec, invariante do ticket 03): esta função nunca deve
 * alimentar `illegibleProductCount` nem qualquer outro número da faixa de
 * placar. A faixa fala da loja inteira e lê `CatalogExamResult` cru; quem
 * chama esta função é responsável por manter as duas fontes separadas — o
 * retorno daqui vira a TABELA, nunca o PLACAR.
 */
export function filterCatalogExamRows(
  rows: ProductExamRow[],
  filters: CatalogExamRowFilters
): ProductExamRow[] {
  const rowsForOrder =
    filters.orderId === "all"
      ? rows
      : rows
          .map((row) => deriveRowForOrder(row, filters.orderId))
          .filter((row): row is ProductExamRow => row !== null)

  const searchTerm = filters.search.trim().toLowerCase()

  return rowsForOrder.filter((row) => {
    if (filters.state !== "all" && row.state !== filters.state) return false

    if (searchTerm === "") return true
    return (
      row.title.toLowerCase().includes(searchTerm) ||
      row.handle.toLowerCase().includes(searchTerm)
    )
  })
}
