import { describe, expect, it } from "vitest"
import type { ProductExamRow } from "../types"
import {
  DEFAULT_CATALOG_EXAM_ROW_FILTERS,
  catalogExamRowFiltersAreDefault,
  filterCatalogExamRows,
  type CatalogExamRowFilters,
} from "./filterCatalogExamRows"

function row(overrides: Partial<ProductExamRow> = {}): ProductExamRow {
  return {
    productId: "1",
    handle: "produto-1",
    title: "Produto Um",
    state: "passed",
    reasons: [],
    silentLossCount: 0,
    ...overrides,
  }
}

function withFilters(
  overrides: Partial<CatalogExamRowFilters>
): CatalogExamRowFilters {
  return { ...DEFAULT_CATALOG_EXAM_ROW_FILTERS, ...overrides }
}

const passed = row({
  productId: "1",
  handle: "aurora-nc7",
  title: "Aurora NC7",
  state: "passed",
})
const illegible = row({
  productId: "2",
  handle: "corvo-sport-2",
  title: "Corvo Sport 2",
  state: "illegible",
  reasons: [{ message: "sem cor", kind: "illegibility", orderIds: ["pedido-a"] }],
})
const mixed = row({
  productId: "3",
  handle: "tenis-runner-x",
  title: "Tênis Runner X",
  state: "mixed",
  reasons: [
    { message: "sem dado", kind: "illegibility", orderIds: ["pedido-a"] },
    { message: "preço alto", kind: "legitimateRejection", orderIds: ["pedido-b"] },
  ],
})
const legit = row({
  productId: "4",
  handle: "fone-nebula-pro",
  title: "Fone Nebula Pro",
  state: "legitimatelyRejected",
  reasons: [
    { message: "preço acima", kind: "legitimateRejection", orderIds: ["pedido-b"] },
  ],
})

const allRows = [passed, illegible, mixed, legit]

describe("filterCatalogExamRows", () => {
  it("sem filtro nenhum devolve todas as linhas, na mesma ordem", () => {
    expect(filterCatalogExamRows(allRows, DEFAULT_CATALOG_EXAM_ROW_FILTERS)).toEqual(
      allRows
    )
  })

  it("filtra por estado 'passed'", () => {
    const result = filterCatalogExamRows(allRows, withFilters({ state: "passed" }))
    expect(result.map((r) => r.productId)).toEqual(["1"])
  })

  it("filtra por estado 'illegible'", () => {
    const result = filterCatalogExamRows(allRows, withFilters({ state: "illegible" }))
    expect(result.map((r) => r.productId)).toEqual(["2"])
  })

  it("filtra por estado 'mixed'", () => {
    const result = filterCatalogExamRows(allRows, withFilters({ state: "mixed" }))
    expect(result.map((r) => r.productId)).toEqual(["3"])
  })

  it("filtra por estado 'legitimatelyRejected'", () => {
    const result = filterCatalogExamRows(
      allRows,
      withFilters({ state: "legitimatelyRejected" })
    )
    expect(result.map((r) => r.productId)).toEqual(["4"])
  })

  it("busca por título, case-insensitive, por substring", () => {
    const result = filterCatalogExamRows(allRows, withFilters({ search: "nebula" }))
    expect(result.map((r) => r.productId)).toEqual(["4"])
  })

  it("busca por handle, case-insensitive, por substring", () => {
    const result = filterCatalogExamRows(
      allRows,
      withFilters({ search: "CORVO-SPORT" })
    )
    expect(result.map((r) => r.productId)).toEqual(["2"])
  })

  it("busca sem correspondência devolve lista vazia", () => {
    const result = filterCatalogExamRows(allRows, withFilters({ search: "zzz" }))
    expect(result).toEqual([])
  })

  it("combina filtro de estado com busca", () => {
    const result = filterCatalogExamRows(
      allRows,
      withFilters({ state: "mixed", search: "tênis" })
    )
    expect(result.map((r) => r.productId)).toEqual(["3"])

    const noMatch = filterCatalogExamRows(
      allRows,
      withFilters({ state: "passed", search: "tênis" })
    )
    expect(noMatch).toEqual([])
  })

  describe("filtro por pedido — o par A/B do catalogo-demo", () => {
    // Fone Nebula Pro na fixture 'loja-real-sem-gabarito': passa no
    // pedido-fone-completo (✅) e é rejeitado por preço no
    // pedido-fone-viagem (⭕) — o par que o critério de aceite pede.
    const nebula = row({
      productId: "nebula",
      handle: "fone-nebula-pro",
      title: "Fone Nebula Pro",
      state: "legitimatelyRejected", // agregado sobre os dois pedidos
      reasons: [
        {
          message: "Preço R$ 279,00 acima do limite de R$ 250,00.",
          kind: "legitimateRejection",
          orderIds: ["pedido-fone-viagem"],
        },
      ],
    })

    it("pedido que não descartou o produto não o mostra (lado ✅ do par)", () => {
      const result = filterCatalogExamRows(
        [nebula],
        withFilters({ orderId: "pedido-fone-completo" })
      )
      expect(result).toEqual([])
    })

    it("pedido que descartou o produto o mostra com o veredito daquele pedido (lado ⭕ do par)", () => {
      const result = filterCatalogExamRows(
        [nebula],
        withFilters({ orderId: "pedido-fone-viagem" })
      )
      expect(result).toHaveLength(1)
      expect(result[0].state).toBe("legitimatelyRejected")
    })

    it("produto 'mixed' isolado por pedido pode mostrar veredito diferente do agregado", () => {
      // agregado é 'mixed' (ilegibilidade em pedido-a + rejeição legítima em
      // pedido-b); isolado no pedido-b só sobra a rejeição legítima.
      const result = filterCatalogExamRows(
        [mixed],
        withFilters({ orderId: "pedido-b" })
      )
      expect(result).toHaveLength(1)
      expect(result[0].state).toBe("legitimatelyRejected")
    })

    it("combina filtro de pedido com filtro de estado", () => {
      const result = filterCatalogExamRows(
        [nebula],
        withFilters({ orderId: "pedido-fone-viagem", state: "legitimatelyRejected" })
      )
      expect(result).toHaveLength(1)

      const noMatch = filterCatalogExamRows(
        [nebula],
        withFilters({ orderId: "pedido-fone-viagem", state: "illegible" })
      )
      expect(noMatch).toEqual([])
    })
  })
})

describe("catalogExamRowFiltersAreDefault", () => {
  it("é true para os filtros default", () => {
    expect(catalogExamRowFiltersAreDefault(DEFAULT_CATALOG_EXAM_ROW_FILTERS)).toBe(
      true
    )
  })

  it("é false quando qualquer filtro está ativo", () => {
    expect(catalogExamRowFiltersAreDefault(withFilters({ state: "mixed" }))).toBe(
      false
    )
    expect(
      catalogExamRowFiltersAreDefault(withFilters({ orderId: "pedido-a" }))
    ).toBe(false)
    expect(catalogExamRowFiltersAreDefault(withFilters({ search: "x" }))).toBe(
      false
    )
    // busca só com espaços em branco continua "sem filtro"
    expect(catalogExamRowFiltersAreDefault(withFilters({ search: "   " }))).toBe(
      true
    )
  })
})
