import { describe, expect, it } from "vitest"
import type { ProductCatalogContent } from "@/lib/catalog"
import type { BuyerAgentOrderOutcome, HandwrittenOrder } from "./types"
import { aggregateCatalogExam, aggregateExamOutcomes } from "./catalogExam"
import { evaluateProduct, toCandidateProduct } from "./engine"

function product(overrides: Partial<ProductCatalogContent> = {}): ProductCatalogContent {
  return {
    id: "gid://shopify/Product/1",
    handle: "produto-teste",
    title: "Produto Teste",
    descriptionHtml: null,
    vendor: null,
    productType: null,
    status: "ACTIVE",
    tags: [],
    onlineStoreUrl: null,
    options: [],
    variants: [],
    metafields: [],
    hasSchemaOrgMarkup: false,
    generatedProperties: [],
    ...overrides,
  }
}

function order(overrides: Partial<HandwrittenOrder> = {}): HandwrittenOrder {
  return {
    id: "pedido",
    label: "pedido de teste",
    attributeRequirements: [],
    numericMinimumRequirements: [],
    maxPrice: null,
    ...overrides,
  }
}

describe("aggregateCatalogExam", () => {
  it("produto que nunca é descartado tem estado 'passed'", () => {
    const catalog = [product({ id: "1", productType: "Fone de ouvido" })]
    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].state).toBe("passed")
    expect(result.rows[0].reasons).toEqual([])
    expect(result.rows[0].silentLossCount).toBe(0)
  })

  it("produto descartado só por motivos de ilegibilidade tem estado 'illegible'", () => {
    const catalog = [product({ id: "1" })] // sem nenhum atributo estruturado
    const orders = [
      order({ attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }] }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows[0].state).toBe("illegible")
    expect(result.illegibleProductCount).toBe(1)
  })

  it("produto descartado só por rejeição legítima tem estado 'legitimatelyRejected'", () => {
    const catalog = [product({ id: "1", productType: "Tênis" })]
    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows[0].state).toBe("legitimatelyRejected")
    expect(result.illegibleProductCount).toBe(0)
  })

  it("produto com motivo de ilegibilidade e de rejeição legítima tem estado 'mixed', fora do número de topo, com os dois motivos visíveis", () => {
    const catalog = [
      product({
        id: "1",
        variants: [
          {
            id: "v1",
            title: "Único",
            sku: null,
            price: "350.00",
            availableForSale: true,
            inventoryQuantity: null,
            selectedOptions: [],
          },
        ],
      }),
    ]
    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
        maxPrice: 300, // produto custa 350 -> rejeição legítima
      }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row.state).toBe("mixed")
    expect(row.reasons.map((r) => r.kind)).toEqual(["illegibility", "legitimateRejection"])
    // misto fica fora do número de topo de ilegíveis...
    expect(result.illegibleProductCount).toBe(0)
    // ...mas continua presente na lista de linhas.
    expect(result.rows.map((r) => r.productId)).toContain("1")
  })

  it("produto que passa num pedido e é ilegível noutro tem estado 'illegible'", () => {
    const catalog = [product({ id: "1", productType: "Fone de ouvido" })]
    const orders = [
      order({
        id: "pedido-tipo",
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }), // passa: tipo de produto confere
      order({
        id: "pedido-cor",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }), // ilegível: sem cor estruturada
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows[0].state).toBe("illegible")
    expect(result.rows[0].reasons).toHaveLength(1)
  })

  it("perda silenciosa conta em quantos pedidos, de N, o produto foi descartado inteiramente por ilegibilidade", () => {
    const catalog = [product({ id: "1", productType: "Fone de ouvido" })]
    const orders = [
      order({
        id: "p1",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }), // ilegível: sem cor estruturada
      order({
        id: "p2",
        attributeRequirements: [
          { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
        ],
      }), // ilegível: sem cancelamento de ruído estruturado
      order({
        id: "p3",
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }), // passa: tipo de produto confere
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.orderCount).toBe(3)
    expect(result.rows[0].state).toBe("illegible")
    expect(result.rows[0].silentLossCount).toBe(2)
  })

  it("perda silenciosa não conta pedido em que o mesmo produto tem motivo misto", () => {
    const catalog = [
      product({
        id: "1",
        variants: [
          {
            id: "v1",
            title: "Único",
            sku: null,
            price: "350.00",
            availableForSale: true,
            inventoryQuantity: null,
            selectedOptions: [],
          },
        ],
      }),
    ]
    const orders = [
      order({
        id: "p1",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }), // ilegível puro: sem cor
      order({
        id: "p2",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
        maxPrice: 300, // ilegibilidade (sem cor) + rejeição legítima (preço 350 > 300) no mesmo pedido
      }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows[0].state).toBe("mixed")
    // só p1 conta: p2 tem motivo misto dentro do próprio pedido, então não é
    // uma venda recuperável só com conserto de conteúdo.
    expect(result.rows[0].silentLossCount).toBe(1)
  })

  it("atribuição: motivo deduplicado por frase mantém todos os pedidos de origem", () => {
    const catalog = [product({ id: "1" })] // sem atributos -> sempre ilegível para 'Cor'
    const orders = [
      order({
        id: "p1",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }),
      order({
        id: "p2",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }),
    ]

    const result = aggregateCatalogExam(catalog, orders)

    expect(result.rows[0].reasons).toHaveLength(1)
    expect(result.rows[0].reasons[0].message).toBe(
      "Sem dado estruturado para confirmar 'Cor'."
    )
    expect(result.rows[0].reasons[0].orderIds).toEqual(["p1", "p2"])
  })

  it("o agregado de topo bate com as linhas", () => {
    const illegible = product({ id: "1" }) // sem tipo de produto -> ilegibilidade
    const legitimate = product({ id: "2", productType: "Tênis" }) // tipo errado -> rejeição legítima
    const passing = product({ id: "3", productType: "Fone de ouvido" })

    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateCatalogExam([illegible, legitimate, passing], orders)

    expect(result.totalProductCount).toBe(3)
    expect(result.rows).toHaveLength(3)
    expect(result.orderCount).toBe(1)
    expect(result.examined).toBe(true)
    expect(result.illegibleProductCount).toBe(
      result.rows.filter((row) => row.state === "illegible").length
    )
    expect(result.illegibleProductCount).toBe(1)
  })

  it("sem pedidos, o exame não rodou: 'examined' é false e todo produto sai 'passed' por vacuidade", () => {
    const catalog = [product({ id: "1" }), product({ id: "2" })]

    const result = aggregateCatalogExam(catalog, [])

    expect(result.examined).toBe(false)
    expect(result.orderCount).toBe(0)
    expect(result.rows.every((row) => row.state === "passed")).toBe(true)
    expect(result.illegibleProductCount).toBe(0)
  })
})

/**
 * Converte (catálogo, pedidos estruturados) em `BuyerAgentOrderOutcome[]` —
 * a mesma transformação que `aggregateCatalogExam` faz internamente antes de
 * delegar para `aggregateExamOutcomes` — para os testes abaixo poderem
 * simular "veredito já computado, vindo do servidor" sem duplicar a lógica
 * de avaliação em cada `it`.
 */
function outcomesFrom(
  catalog: ProductCatalogContent[],
  orders: HandwrittenOrder[]
): BuyerAgentOrderOutcome[] {
  const candidates = catalog.map(toCandidateProduct)
  return orders.map((currentOrder) => ({
    orderId: currentOrder.id,
    products: candidates.map((candidate) => {
      const result = evaluateProduct(candidate, currentOrder)
      return {
        productId: candidate.productId,
        handle: candidate.handle,
        title: candidate.title,
        passed: result.passed,
        confirmedRequirements: result.confirmedRequirements,
        unmetRequirements: result.unmetRequirements,
      }
    }),
  }))
}

describe("aggregateExamOutcomes", () => {
  it("agrega veredito já computado (sem chamar o engine) para o mesmo resultado que aggregateCatalogExam produziria dos mesmos pedidos", () => {
    const catalog = [
      product({ id: "1" }), // sem atributos -> sempre ilegível para 'Cor'
      product({ id: "2", productType: "Tênis" }), // tipo errado -> rejeição legítima
      product({ id: "3", productType: "Fone de ouvido" }), // passa
    ]
    const orders = [
      order({
        id: "p1",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }),
      order({
        id: "p2",
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const viaOrders = aggregateCatalogExam(catalog, orders)
    const viaOutcomes = aggregateExamOutcomes(catalog, outcomesFrom(catalog, orders))

    expect(viaOutcomes).toEqual(viaOrders)
  })

  it("produto que nunca aparece descartado em nenhum outcome é 'passed' por vacuidade", () => {
    const catalog = [product({ id: "1" }), product({ id: "2" })]
    const outcomes: BuyerAgentOrderOutcome[] = [
      {
        orderId: "p1",
        products: [
          {
            productId: "1",
            handle: "produto-teste",
            title: "Produto Teste",
            passed: true,
            confirmedRequirements: [],
            unmetRequirements: [],
          },
          {
            productId: "2",
            handle: "produto-teste",
            title: "Produto Teste",
            passed: true,
            confirmedRequirements: [],
            unmetRequirements: [],
          },
        ],
      },
    ]

    const result = aggregateExamOutcomes(catalog, outcomes)

    expect(result.rows.every((row) => row.state === "passed")).toBe(true)
    expect(result.illegibleProductCount).toBe(0)
  })

  it("dedup por frase mantém a atribuição de todos os orderIds que a produziram, lendo direto do outcome (sem releitura de mensagem)", () => {
    const catalog = [product({ id: "1" })]
    const reason = {
      message: "Sem dado estruturado para confirmar 'Cor'.",
      kind: "illegibility" as const,
    }
    const outcomes: BuyerAgentOrderOutcome[] = [
      {
        orderId: "p1",
        products: [
          { productId: "1", handle: "produto-teste", title: "Produto Teste", passed: false, confirmedRequirements: [], unmetRequirements: [reason] },
        ],
      },
      {
        orderId: "p2",
        products: [
          { productId: "1", handle: "produto-teste", title: "Produto Teste", passed: false, confirmedRequirements: [], unmetRequirements: [reason] },
        ],
      },
    ]

    const result = aggregateExamOutcomes(catalog, outcomes)

    expect(result.rows[0].reasons).toHaveLength(1)
    expect(result.rows[0].reasons[0].orderIds).toEqual(["p1", "p2"])
    expect(result.rows[0].state).toBe("illegible")
  })

  it("produto com motivo de ilegibilidade e de rejeição legítima no mesmo outcome é 'mixed', fora do número de topo", () => {
    const catalog = [product({ id: "1" })]
    const outcomes: BuyerAgentOrderOutcome[] = [
      {
        orderId: "p1",
        products: [
          {
            productId: "1",
            handle: "produto-teste",
            title: "Produto Teste",
            passed: false,
            confirmedRequirements: [],
            unmetRequirements: [
              { message: "Sem dado estruturado para confirmar 'Cor'.", kind: "illegibility" },
              { message: "Preço acima do limite.", kind: "legitimateRejection" },
            ],
          },
        ],
      },
    ]

    const result = aggregateExamOutcomes(catalog, outcomes)

    expect(result.rows[0].state).toBe("mixed")
    expect(result.illegibleProductCount).toBe(0)
  })

  it("sem outcomes, o exame não rodou: 'examined' é false e todo produto sai 'passed' por vacuidade", () => {
    const catalog = [product({ id: "1" }), product({ id: "2" })]

    const result = aggregateExamOutcomes(catalog, [])

    expect(result.examined).toBe(false)
    expect(result.orderCount).toBe(0)
    expect(result.rows.every((row) => row.state === "passed")).toBe(true)
  })

  it("as linhas seguem a ordem do catálogo de entrada, não a ordem dos outcomes", () => {
    const catalog = [product({ id: "1" }), product({ id: "2" }), product({ id: "3" })]
    const outcomes: BuyerAgentOrderOutcome[] = []

    const result = aggregateExamOutcomes(catalog, outcomes)

    expect(result.rows.map((row) => row.productId)).toEqual(["1", "2", "3"])
  })
})
