import { describe, expect, it } from "vitest"
import type { ProductCatalogContent } from "@/lib/catalog"
import type { HandwrittenOrder } from "./types"
import { aggregateDiagnosis } from "./aggregate"

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

describe("aggregateDiagnosis", () => {
  it("relata o escopo: catálogo inteiro e quantos pedidos rodaram", () => {
    const catalog = [product({ id: "1" }), product({ id: "2" }), product({ id: "3" })]
    const orders = [order({ id: "p1" }), order({ id: "p2" })]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.totalProductCount).toBe(3)
    expect(result.orderCount).toBe(2)
  })

  it("não descarta um produto que passa em todos os pedidos", () => {
    const catalog = [product({ id: "1", productType: "Fone de ouvido" })]
    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts).toHaveLength(0)
    expect(result.illegibleProductCount).toBe(0)
  })

  it("dedup: o mesmo motivo vindo de dois pedidos diferentes conta uma vez só no produto", () => {
    const catalog = [product({ id: "1" })] // sem atributos — sempre ilegível para 'Cor'
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

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts).toHaveLength(1)
    expect(result.discardedProducts[0].reasons).toEqual([
      { message: "Sem dado estruturado para confirmar 'Cor'.", kind: "illegibility" },
    ])
    // Um único produto, contado uma vez — não duas, mesmo com dois pedidos
    // batendo no mesmo motivo.
    expect(result.illegibleProductCount).toBe(1)
  })

  it("motivos diferentes do mesmo produto, vindos de pedidos diferentes, aparecem lado a lado", () => {
    const catalog = [product({ id: "1" })]
    const orders = [
      order({
        id: "p1",
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
      }),
      order({
        id: "p2",
        numericMinimumRequirements: [
          { attributeName: "Bateria", minValue: 20, unit: "h" },
        ],
      }),
    ]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts).toHaveLength(1)
    expect(result.discardedProducts[0].reasons.map((r) => r.message)).toEqual([
      "Sem dado estruturado para confirmar 'Cor'.",
      "Sem dado estruturado para confirmar 'Bateria' (mínimo 20h).",
    ])
    expect(result.illegibleProductCount).toBe(1)
  })

  it("produto só com motivo de ilegibilidade conta na métrica de topo", () => {
    const catalog = [product({ id: "1" })]
    const orders = [
      order({ attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }] }),
    ]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts[0].onlyIllegibilityReasons).toBe(true)
    expect(result.illegibleProductCount).toBe(1)
  })

  it("produto só com motivo de rejeição legítima aparece na lista mas fica fora da métrica de topo", () => {
    const catalog = [product({ id: "1", productType: "Tênis" })]
    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts).toHaveLength(1)
    expect(result.discardedProducts[0].onlyIllegibilityReasons).toBe(false)
    expect(result.discardedProducts[0].reasons[0].kind).toBe("legitimateRejection")
    expect(result.illegibleProductCount).toBe(0)
  })

  it("produto de motivo misto (ilegibilidade + rejeição legítima) fica fora da métrica de topo, mas continua na lista", () => {
    // Um pedido exige preço até 300 (o produto custa 350 — rejeição
    // legítima) e cor azul (sem dado nenhum — ilegibilidade). Mesmo depois
    // do conserto de conteúdo, o preço continua acima do limite: essa venda
    // não volta, então o produto não pode contar como "recuperável".
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
        maxPrice: 300,
      }),
    ]

    const result = aggregateDiagnosis(catalog, orders)

    expect(result.discardedProducts).toHaveLength(1)
    const discarded = result.discardedProducts[0]
    expect(discarded.onlyIllegibilityReasons).toBe(false)
    expect(discarded.reasons.map((r) => r.kind)).toEqual([
      "illegibility",
      "legitimateRejection",
    ])
    expect(result.illegibleProductCount).toBe(0)
  })

  it("agrega vários produtos independentemente — cada um com seu próprio veredito de topo", () => {
    const illegible = product({ id: "1" }) // sem tipo de produto -> ilegibilidade
    const legitimate = product({ id: "2", productType: "Tênis" }) // tipo errado -> rejeição legítima
    const passing = product({ id: "3", productType: "Fone de ouvido" })

    const orders = [
      order({
        attributeRequirements: [{ attributeName: "Tipo de produto", expectedValue: "fone" }],
      }),
    ]

    const result = aggregateDiagnosis([illegible, legitimate, passing], orders)

    expect(result.totalProductCount).toBe(3)
    expect(result.discardedProducts).toHaveLength(2)
    expect(result.illegibleProductCount).toBe(1)
  })
})
