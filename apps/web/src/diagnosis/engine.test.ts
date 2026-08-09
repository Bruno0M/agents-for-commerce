import { describe, expect, it } from "vitest"
import type { HandwrittenOrder } from "./types"
import { evaluateProduct, toCandidateProduct, type CandidateProduct } from "./engine"
import type { ProductCatalogContent } from "@/lib/catalog"

function candidate(overrides: Partial<CandidateProduct> = {}): CandidateProduct {
  return {
    productId: "gid://shopify/Product/1",
    handle: "produto-teste",
    title: "Produto Teste",
    price: null,
    attributes: {},
    ...overrides,
  }
}

function order(overrides: Partial<HandwrittenOrder> = {}): HandwrittenOrder {
  return {
    id: "pedido-1",
    label: "pedido de teste",
    attributeRequirements: [],
    numericMinimumRequirements: [],
    maxPrice: null,
    ...overrides,
  }
}

// Os sete motivos da tabela do D3 (spec do exame guiado) / ticket 02 — a
// mesma tabela que `BuyerAgentDecisionEngineTests.cs` cobre no C#. Cada
// teste verifica a frase (que não pode mudar de texto) e a natureza (o
// dado novo) juntas, exatamente como o teste do engine original faz.
describe("evaluateProduct — natureza dos sete motivos", () => {
  it("atributo sem dado estruturado é ilegibilidade", () => {
    const outcome = evaluateProduct(
      candidate({ attributes: {} }),
      order({ attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }] })
    )

    expect(outcome.passed).toBe(false)
    expect(outcome.unmetRequirements).toEqual([
      { message: "Sem dado estruturado para confirmar 'Cor'.", kind: "illegibility" },
    ])
  })

  it("mínimo numérico sem dado estruturado é ilegibilidade", () => {
    const outcome = evaluateProduct(
      candidate({ attributes: {} }),
      order({
        numericMinimumRequirements: [
          { attributeName: "Autonomia da bateria", minValue: 20, unit: "h" },
        ],
      })
    )

    expect(outcome.unmetRequirements).toEqual([
      {
        message: "Sem dado estruturado para confirmar 'Autonomia da bateria' (mínimo 20h).",
        kind: "illegibility",
      },
    ])
  })

  it("preço máximo exigido sem preço estruturado é ilegibilidade", () => {
    const outcome = evaluateProduct(
      candidate({ price: null }),
      order({ maxPrice: 300 })
    )

    expect(outcome.unmetRequirements).toHaveLength(1)
    expect(outcome.unmetRequirements[0].message).toMatch(
      /^Sem preço estruturado para confirmar o limite de/
    )
    expect(outcome.unmetRequirements[0].kind).toBe("illegibility")
  })

  it("valor numérico não reconhecível (dado em prosa) é ilegibilidade", () => {
    const outcome = evaluateProduct(
      candidate({
        attributes: { "Autonomia da bateria": "Dura o dia inteiro sem precisar recarregar" },
      }),
      order({
        numericMinimumRequirements: [
          { attributeName: "Autonomia da bateria", minValue: 20, unit: "h" },
        ],
      })
    )

    expect(outcome.unmetRequirements).toEqual([
      {
        message:
          "'Autonomia da bateria' = 'Dura o dia inteiro sem precisar recarregar' não tem valor numérico reconhecível para confirmar o mínimo de 20h.",
        kind: "illegibility",
      },
    ])
  })

  it("atributo presente mas que não confirma o valor esperado é rejeição legítima", () => {
    const outcome = evaluateProduct(
      candidate({ attributes: { "Cancelamento de ruído": "passivo" } }),
      order({
        attributeRequirements: [
          { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
        ],
      })
    )

    expect(outcome.unmetRequirements).toEqual([
      {
        message: "'Cancelamento de ruído' = 'passivo' não confirma 'ativo'.",
        kind: "legitimateRejection",
      },
    ])
  })

  it("valor numérico abaixo do mínimo é rejeição legítima", () => {
    const outcome = evaluateProduct(
      candidate({ attributes: { "Autonomia da bateria": "14 horas" } }),
      order({
        numericMinimumRequirements: [
          { attributeName: "Autonomia da bateria", minValue: 20, unit: "h" },
        ],
      })
    )

    expect(outcome.unmetRequirements).toEqual([
      {
        message: "'Autonomia da bateria' = '14h' abaixo do mínimo de 20h.",
        kind: "legitimateRejection",
      },
    ])
  })

  it("preço estruturado acima do limite é rejeição legítima", () => {
    const outcome = evaluateProduct(candidate({ price: 350 }), order({ maxPrice: 300 }))

    expect(outcome.unmetRequirements).toHaveLength(1)
    expect(outcome.unmetRequirements[0].message).toMatch(/^Preço/)
    expect(outcome.unmetRequirements[0].message).toContain("acima do limite de")
    expect(outcome.unmetRequirements[0].kind).toBe("legitimateRejection")
  })
})

describe("evaluateProduct — comportamento herdado do engine C#", () => {
  it("produto confirmando tudo passa e acumula as frases de confirmação", () => {
    const outcome = evaluateProduct(
      candidate({
        price: 279,
        attributes: {
          "Tipo de produto": "Fone bluetooth over-ear",
          "Cancelamento de ruído": "Ativo (híbrido)",
        },
      }),
      order({
        attributeRequirements: [
          { attributeName: "Tipo de produto", expectedValue: "fone bluetooth" },
          { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
        ],
        maxPrice: 300,
      })
    )

    expect(outcome.passed).toBe(true)
    expect(outcome.unmetRequirements).toHaveLength(0)
  })

  it("rejeita apesar do match literal de substring quando a cláusula nega o requisito", () => {
    // Mesmo bug real do catálogo de demo (Corvo Sport 2, ticket 04): o valor
    // é "Não possui cancelamento de ruído ativo" — Contains ingênuo confirmaria.
    const outcome = evaluateProduct(
      candidate({
        attributes: { "Cancelamento de ruído": "Não possui cancelamento de ruído ativo" },
      }),
      order({
        attributeRequirements: [
          { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
        ],
      })
    )

    expect(outcome.passed).toBe(false)
  })

  it("uma negação numa cláusula anterior não bloqueia confirmação numa cláusula posterior", () => {
    const outcome = evaluateProduct(
      candidate({
        attributes: {
          "Cancelamento de ruído":
            "Sem bateria fraca aqui; cancelamento de ruído ativo com três níveis",
        },
      }),
      order({
        attributeRequirements: [
          { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
        ],
      })
    )

    expect(outcome.passed).toBe(true)
  })

  it("casa por palavra significativa compartilhada quando o nome exato não bate (sinônimo)", () => {
    const outcome = evaluateProduct(
      candidate({ attributes: { "Autonomia da bateria": "28 horas" } }),
      order({
        numericMinimumRequirements: [
          { attributeName: "Duração da bateria", minValue: 20, unit: "h" },
        ],
      })
    )

    expect(outcome.passed).toBe(true)
  })

  it("um produto pode acumular motivos das duas naturezas na mesma avaliação", () => {
    const outcome = evaluateProduct(
      candidate({ price: 350, attributes: {} }),
      order({
        attributeRequirements: [{ attributeName: "Cor", expectedValue: "azul" }],
        maxPrice: 300,
      })
    )

    expect(outcome.unmetRequirements).toHaveLength(2)
    expect(outcome.unmetRequirements.map((r) => r.kind)).toEqual([
      "illegibility",
      "legitimateRejection",
    ])
  })
})

describe("toCandidateProduct", () => {
  function catalogProduct(
    overrides: Partial<ProductCatalogContent> = {}
  ): ProductCatalogContent {
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

  it("expõe opções, metafields e tipo de produto como atributos estruturados", () => {
    const result = toCandidateProduct(
      catalogProduct({
        productType: "Fone de ouvido",
        options: [{ name: "Cor", values: ["Preto", "Branco"] }],
        metafields: [{ namespace: "custom", key: "Bateria", value: "28h", type: "single_line_text_field" }],
      })
    )

    expect(result.attributes["Cor"]).toBe("Preto, Branco")
    expect(result.attributes["Bateria"]).toBe("28h")
    expect(result.attributes["Tipo de produto"]).toBe("Fone de ouvido")
  })

  it("ignora metafield com valor vazio ou nulo", () => {
    const result = toCandidateProduct(
      catalogProduct({
        metafields: [{ namespace: "custom", key: "Vazio", value: "", type: "single_line_text_field" }],
      })
    )

    expect(result.attributes["Vazio"]).toBeUndefined()
  })

  it("usa o menor preço entre variantes com preço parseável, e null quando nenhuma tem preço", () => {
    const withPrices = toCandidateProduct(
      catalogProduct({
        variants: [
          { id: "v1", title: "P", sku: null, price: "199.00", availableForSale: true, inventoryQuantity: null, selectedOptions: [] },
          { id: "v2", title: "G", sku: null, price: "179.00", availableForSale: true, inventoryQuantity: null, selectedOptions: [] },
        ],
      })
    )
    expect(withPrices.price).toBe(179)

    const withoutPrices = toCandidateProduct(catalogProduct({ variants: [] }))
    expect(withoutPrices.price).toBeNull()
  })
})
