import { describe, expect, it } from "vitest"
import { aggregateDiagnosis } from "../aggregate"
import {
  lojaRealSemGabaritoCatalog,
  lojaRealSemGabaritoOrders,
} from "./loja-real-sem-gabarito"

/**
 * Confirma que a fixture "loja real sem gabarito" (a que o critério de
 * aceite do ticket 06 pede) de fato exercita os três estados de
 * `DiscardedProduct` mais o controle "nunca aparece" — documentado no
 * comentário do topo do arquivo da fixture. Isto é o que deixa a tela
 * "desenvolvível e testável inteira contra ela": qualquer um pode rodar
 * este teste para saber, sem abrir o wizard, o que a fixture prova.
 */
describe("fixture: loja real sem gabarito", () => {
  const result = aggregateDiagnosis(
    lojaRealSemGabaritoCatalog.products,
    lojaRealSemGabaritoOrders
  )

  function discarded(handle: string) {
    const product = result.discardedProducts.find((p) => p.handle === handle)
    if (!product) throw new Error(`produto '${handle}' não foi descartado`)
    return product
  }

  it("mede a loja inteira contra os dois pedidos digitados", () => {
    expect(result.totalProductCount).toBe(7)
    expect(result.orderCount).toBe(2)
  })

  it("Aurora NC7 é ilegibilidade pura — conta na métrica de topo", () => {
    const product = discarded("aurora-nc7")
    expect(product.onlyIllegibilityReasons).toBe(true)
    expect(product.reasons.every((r) => r.kind === "illegibility")).toBe(true)
  })

  it("Fone Nebula Pro é rejeição legítima pura — fora da métrica de topo", () => {
    const product = discarded("fone-nebula-pro")
    expect(product.onlyIllegibilityReasons).toBe(false)
    expect(
      product.reasons.every((r) => r.kind === "legitimateRejection")
    ).toBe(true)
  })

  it("Corvo Sport 2, Tênis Runner X, Capa Protetora X1 e Fone Compacto Lite são motivo misto", () => {
    for (const handle of [
      "corvo-sport-2",
      "tenis-runner-x",
      "capa-protetora-x1",
      "fone-compacto-lite",
    ]) {
      const product = discarded(handle)
      expect(product.onlyIllegibilityReasons).toBe(false)
      const kinds = new Set(product.reasons.map((r) => r.kind))
      expect(kinds.has("illegibility")).toBe(true)
      expect(kinds.has("legitimateRejection")).toBe(true)
    }
  })

  it("Fone Zenith Air confirma tudo nos dois pedidos e nunca aparece descartado", () => {
    expect(
      result.discardedProducts.some((p) => p.handle === "fone-zenith-air")
    ).toBe(false)
  })

  it("a métrica de topo conta só os produtos de ilegibilidade pura", () => {
    expect(result.illegibleProductCount).toBe(1)
    expect(result.discardedProducts).toHaveLength(6)
  })

  it("deduplica a mesma frase de rejeição vinda dos dois pedidos (Tipo de produto = fone)", () => {
    const product = discarded("tenis-runner-x")
    const sameMessage = product.reasons.filter(
      (r) => r.message === "'Tipo de produto' = 'Tênis de corrida' não confirma 'fone'."
    )
    expect(sameMessage).toHaveLength(1)
  })
})
