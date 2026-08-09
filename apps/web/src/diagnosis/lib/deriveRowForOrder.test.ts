import { describe, expect, it } from "vitest"
import type { ProductExamRow } from "../types"
import { deriveRowForOrder } from "./deriveRowForOrder"

function row(overrides: Partial<ProductExamRow> = {}): ProductExamRow {
  return {
    productId: "1",
    handle: "produto",
    title: "Produto",
    state: "mixed",
    reasons: [],
    silentLossCount: 0,
    ...overrides,
  }
}

describe("deriveRowForOrder", () => {
  it("devolve null quando o pedido não produziu motivo nenhum para o produto (o produto passou naquele pedido)", () => {
    const productRow = row({
      state: "illegible",
      reasons: [
        { message: "sem cor", kind: "illegibility", orderIds: ["outro-pedido"] },
      ],
    })

    expect(deriveRowForOrder(productRow, "pedido-x")).toBeNull()
  })

  it("restringe os motivos aos do pedido informado e recalcula o estado só a partir deles", () => {
    // agregado: ilegibilidade (pedido-a) + rejeição legítima (pedido-b) -> 'mixed'
    const productRow = row({
      state: "mixed",
      reasons: [
        { message: "sem dado", kind: "illegibility", orderIds: ["pedido-a"] },
        { message: "preço alto", kind: "legitimateRejection", orderIds: ["pedido-b"] },
      ],
    })

    const derivedForA = deriveRowForOrder(productRow, "pedido-a")
    expect(derivedForA?.state).toBe("illegible")
    expect(derivedForA?.reasons).toEqual([
      { message: "sem dado", kind: "illegibility", orderIds: ["pedido-a"] },
    ])

    const derivedForB = deriveRowForOrder(productRow, "pedido-b")
    expect(derivedForB?.state).toBe("legitimatelyRejected")
    expect(derivedForB?.reasons).toEqual([
      { message: "preço alto", kind: "legitimateRejection", orderIds: ["pedido-b"] },
    ])
  })

  it("um motivo atribuído a mais de um pedido continua contando para cada um deles", () => {
    const productRow = row({
      state: "illegible",
      reasons: [
        {
          message: "sem tipo",
          kind: "illegibility",
          orderIds: ["pedido-a", "pedido-b"],
        },
      ],
    })

    expect(deriveRowForOrder(productRow, "pedido-a")?.state).toBe("illegible")
    expect(deriveRowForOrder(productRow, "pedido-b")?.state).toBe("illegible")
  })

  it("preserva os demais campos da linha (produto, handle, título, perda silenciosa)", () => {
    const productRow = row({
      productId: "42",
      handle: "produto-42",
      title: "Produto 42",
      silentLossCount: 3,
      reasons: [{ message: "x", kind: "illegibility", orderIds: ["p1"] }],
    })

    const derived = deriveRowForOrder(productRow, "p1")

    expect(derived?.productId).toBe("42")
    expect(derived?.handle).toBe("produto-42")
    expect(derived?.title).toBe("Produto 42")
    expect(derived?.silentLossCount).toBe(3)
  })

  it("par A/B: o mesmo produto sai null (✅) num pedido e com veredito (⭕) noutro", () => {
    // Fone Nebula Pro na fixture 'loja-real-sem-gabarito': confirma tudo no
    // pedido-fone-completo e é rejeitado por preço no pedido-fone-viagem.
    const nebula = row({
      productId: "nebula",
      handle: "fone-nebula-pro",
      title: "Fone Nebula Pro",
      state: "legitimatelyRejected",
      reasons: [
        {
          message: "Preço R$ 279,00 acima do limite de R$ 250,00.",
          kind: "legitimateRejection",
          orderIds: ["pedido-fone-viagem"],
        },
      ],
    })

    expect(deriveRowForOrder(nebula, "pedido-fone-completo")).toBeNull()
    expect(deriveRowForOrder(nebula, "pedido-fone-viagem")?.state).toBe(
      "legitimatelyRejected"
    )
  })
})
