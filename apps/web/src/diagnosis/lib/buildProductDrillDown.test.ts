import { describe, expect, it } from "vitest"
import type { BuyerAgentOrderOutcome, GeneratedTestOrder } from "../types"
import { buildProductDrillDown } from "./buildProductDrillDown"

function order(overrides: Partial<GeneratedTestOrder> = {}): GeneratedTestOrder {
  return {
    id: "pedido-1",
    text: "Quero um fone bluetooth até R$300",
    expectsValidMatch: true,
    constraintAxis: "contraste",
    rationale: "Teste.",
    ...overrides,
  }
}

function outcomeFor(
  orderId: string,
  overrides: Partial<BuyerAgentOrderOutcome["products"][number]> = {}
): BuyerAgentOrderOutcome {
  return {
    orderId,
    products: [
      {
        productId: "produto-1",
        handle: "produto-1",
        title: "Produto 1",
        passed: true,
        confirmedRequirements: [],
        unmetRequirements: [],
        ...overrides,
      },
    ],
  }
}

describe("buildProductDrillDown", () => {
  it("pedido em que o produto passou: estado 'passed', com requisitos confirmados e sem motivos", () => {
    const orders = [order({ id: "pedido-1" })]
    const outcomes = [
      outcomeFor("pedido-1", {
        passed: true,
        confirmedRequirements: ["'Preço' <= 'R$300,00'."],
        unmetRequirements: [],
      }),
    ]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown).toEqual([
      {
        orderId: "pedido-1",
        orderText: order().text,
        state: "passed",
        confirmedRequirements: ["'Preço' <= 'R$300,00'."],
        unmetRequirements: [],
      },
    ])
  })

  it("pedido em que o produto é puramente ilegível: estado 'illegible'", () => {
    const orders = [order({ id: "pedido-1" })]
    const outcomes = [
      outcomeFor("pedido-1", {
        passed: false,
        confirmedRequirements: [],
        unmetRequirements: [
          { message: "Cor não encontrada como dado estruturado.", kind: "illegibility" },
        ],
      }),
    ]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown[0].state).toBe("illegible")
    expect(drillDown[0].unmetRequirements).toEqual([
      { message: "Cor não encontrada como dado estruturado.", kind: "illegibility" },
    ])
  })

  it("pedido em que o produto é rejeitado legitimamente: estado 'legitimatelyRejected'", () => {
    const orders = [order({ id: "pedido-1" })]
    const outcomes = [
      outcomeFor("pedido-1", {
        passed: false,
        confirmedRequirements: [],
        unmetRequirements: [
          {
            message: "Preço R$ 279,00 acima do limite de R$ 250,00.",
            kind: "legitimateRejection",
          },
        ],
      }),
    ]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown[0].state).toBe("legitimatelyRejected")
  })

  it("pedido com motivo misto (ilegibilidade + rejeição legítima) no mesmo pedido: estado 'mixed'", () => {
    const orders = [order({ id: "pedido-1" })]
    const outcomes = [
      outcomeFor("pedido-1", {
        passed: false,
        confirmedRequirements: [],
        unmetRequirements: [
          { message: "Sem cor estruturada.", kind: "illegibility" },
          {
            message: "Preço R$ 279,00 acima do limite de R$ 250,00.",
            kind: "legitimateRejection",
          },
        ],
      }),
    ]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown[0].state).toBe("mixed")
  })

  it("defensivo: pedido sem outcome correspondente (ou sem o produto no outcome) vira 'passed' vazio, em vez de quebrar", () => {
    const orders = [order({ id: "pedido-1" }), order({ id: "pedido-2" })]
    // Só existe outcome para pedido-1 — pedido-2 fica sem correspondência.
    const outcomes = [outcomeFor("pedido-1")]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown[1]).toEqual({
      orderId: "pedido-2",
      orderText: order({ id: "pedido-2" }).text,
      state: "passed",
      confirmedRequirements: [],
      unmetRequirements: [],
    })
  })

  it("preserva a ordem de 'orders', não a ordem de 'outcomes'", () => {
    const orders = [order({ id: "pedido-b" }), order({ id: "pedido-a" })]
    const outcomes = [outcomeFor("pedido-a"), outcomeFor("pedido-b")]

    const drillDown = buildProductDrillDown("produto-1", orders, outcomes)

    expect(drillDown.map((verdict) => verdict.orderId)).toEqual([
      "pedido-b",
      "pedido-a",
    ])
  })
})
