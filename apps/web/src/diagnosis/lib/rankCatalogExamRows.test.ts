import { describe, expect, it } from "vitest"
import type { ProductExamRow } from "../types"
import { sortCatalogExamRows } from "./rankCatalogExamRows"

function row(overrides: Partial<ProductExamRow> = {}): ProductExamRow {
  return {
    productId: "1",
    handle: "produto",
    title: "Produto",
    state: "illegible",
    reasons: [],
    silentLossCount: 0,
    ...overrides,
  }
}

describe("sortCatalogExamRows", () => {
  it("ordena por perda silenciosa decrescente", () => {
    const rows = [
      row({ productId: "baixa", title: "Baixa perda", silentLossCount: 1 }),
      row({ productId: "alta", title: "Alta perda", silentLossCount: 5 }),
      row({ productId: "media", title: "Média perda", silentLossCount: 3 }),
    ]

    const sorted = sortCatalogExamRows(rows)

    expect(sorted.map((r) => r.productId)).toEqual(["alta", "media", "baixa"])
  })

  it("desempata perda silenciosa igual por menor número de motivos distintos de ilegibilidade", () => {
    const rows = [
      row({
        productId: "muitos-motivos",
        title: "Muitos motivos",
        silentLossCount: 2,
        reasons: [
          { message: "a", kind: "illegibility", orderIds: ["p1"] },
          { message: "b", kind: "illegibility", orderIds: ["p1"] },
          { message: "c", kind: "illegibility", orderIds: ["p1"] },
        ],
      }),
      row({
        productId: "poucos-motivos",
        title: "Poucos motivos",
        silentLossCount: 2,
        reasons: [{ message: "a", kind: "illegibility", orderIds: ["p1"] }],
      }),
    ]

    const sorted = sortCatalogExamRows(rows)

    expect(sorted.map((r) => r.productId)).toEqual([
      "poucos-motivos",
      "muitos-motivos",
    ])
  })

  it("motivos de rejeição legítima não contam para o desempate de consertabilidade", () => {
    const rows = [
      row({
        productId: "so-ilegibilidade",
        title: "A produto",
        silentLossCount: 1,
        reasons: [{ message: "a", kind: "illegibility", orderIds: ["p1"] }],
      }),
      row({
        productId: "misto-com-mais-motivos-no-total",
        title: "B produto",
        silentLossCount: 1,
        reasons: [
          { message: "a", kind: "illegibility", orderIds: ["p1"] },
          { message: "b", kind: "legitimateRejection", orderIds: ["p1"] },
          { message: "c", kind: "legitimateRejection", orderIds: ["p1"] },
        ],
      }),
    ]

    const sorted = sortCatalogExamRows(rows)

    // os dois têm 1 motivo de ILEGIBILIDADE -> empatam nesse critério e o
    // desempate cai pro título ("A produto" < "B produto"). Se motivos de
    // rejeição legítima contassem, "misto-com-mais-motivos-no-total" perderia
    // o desempate por ter mais motivos no total (3 vs 1) — não é isso que
    // acontece.
    expect(sorted.map((r) => r.productId)).toEqual([
      "so-ilegibilidade",
      "misto-com-mais-motivos-no-total",
    ])
  })

  it("desempate final por título, depois productId, para ser determinístico", () => {
    const rows = [
      row({ productId: "2", title: "Mesmo Título", silentLossCount: 0 }),
      row({ productId: "1", title: "Mesmo Título", silentLossCount: 0 }),
    ]

    const sorted = sortCatalogExamRows(rows)

    expect(sorted.map((r) => r.productId)).toEqual(["1", "2"])
  })

  it("é determinística: a mesma entrada sempre produz a mesma sequência", () => {
    const rows = [
      row({ productId: "c", title: "C", silentLossCount: 1 }),
      row({ productId: "a", title: "A", silentLossCount: 2 }),
      row({ productId: "b", title: "B", silentLossCount: 2 }),
    ]

    const first = sortCatalogExamRows(rows).map((r) => r.productId)
    const second = sortCatalogExamRows(rows).map((r) => r.productId)

    expect(first).toEqual(second)
    expect(first).toEqual(["a", "b", "c"])
  })

  it("não muta o array recebido", () => {
    const rows = [
      row({ productId: "a", silentLossCount: 1 }),
      row({ productId: "b", silentLossCount: 2 }),
    ]
    const originalOrder = rows.map((r) => r.productId)

    sortCatalogExamRows(rows)

    expect(rows.map((r) => r.productId)).toEqual(originalOrder)
  })
})
