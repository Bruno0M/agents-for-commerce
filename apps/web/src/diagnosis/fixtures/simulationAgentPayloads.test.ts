import { describe, expect, it } from "vitest"
import { aggregateExamOutcomes } from "../catalogExam"
import {
  simulationAgentFailureScenario,
  simulationAgentNoPassScenario,
  simulationAgentNormalScenario,
} from "./simulationAgentPayloads"

/**
 * Confirma que os três cenários mockados do redesenho de botão único
 * (`.scratch/catalogo-como-exame/`) de fato provam o que os nomes prometem —
 * mesmo espírito de `loja-real-sem-gabarito.test.ts`: qualquer um pode rodar
 * este teste para saber o que cada fixture cobre, sem abrir a tela.
 */
describe("fixture: payloads do agente de simulação", () => {
  describe("cenário normal", () => {
    const { testOrderGeneration, simulationBatch, catalog } =
      simulationAgentNormalScenario

    it("o resumo do catálogo bate com o catálogo real (7 produtos)", () => {
      expect(testOrderGeneration.catalogSummary.productCount).toBe(7)
      expect(testOrderGeneration.catalogSummary.titles).toHaveLength(7)
    })

    it("cada pedido em prosa tem um id estável que a etapa 2 usa para atribuição", () => {
      const orderIds = testOrderGeneration.orders.map((order) => order.id)
      const outcomeOrderIds = simulationBatch.outcomes.map(
        (outcome) => outcome.orderId
      )
      expect(orderIds.sort()).toEqual(outcomeOrderIds.sort())
    })

    it("agregada, a mistura tem pelo menos um produto 'mixed' e um 'legitimatelyRejected'", () => {
      const result = aggregateExamOutcomes(catalog, simulationBatch.outcomes)
      const states = new Set(result.rows.map((row) => row.state))

      expect(states.has("mixed")).toBe(true)
      expect(states.has("legitimatelyRejected")).toBe(true)
      expect(states.has("passed")).toBe(true)
      expect(states.has("illegible")).toBe(true)
    })

    it("o par A/B: Fone Nebula Pro vence o pedido completo e é rejeitado no pedido de viagem só por preço", () => {
      const completo = simulationBatch.outcomes.find(
        (outcome) => outcome.orderId === "pedido-fone-completo"
      )
      const viagem = simulationBatch.outcomes.find(
        (outcome) => outcome.orderId === "pedido-fone-viagem"
      )
      const nebulaNoCompleto = completo?.products.find(
        (product) => product.handle === "fone-nebula-pro"
      )
      const nebulaNaViagem = viagem?.products.find(
        (product) => product.handle === "fone-nebula-pro"
      )

      expect(nebulaNoCompleto?.passed).toBe(true)
      expect(nebulaNaViagem?.passed).toBe(false)
      expect(
        nebulaNaViagem?.unmetRequirements.every(
          (reason) => reason.kind === "legitimateRejection"
        )
      ).toBe(true)
    })
  })

  describe("cenário 'nenhum produto passou'", () => {
    const { simulationBatch, catalog } = simulationAgentNoPassScenario

    it("nenhuma linha agregada fica 'passed'", () => {
      const result = aggregateExamOutcomes(catalog, simulationBatch.outcomes)

      expect(result.examined).toBe(true)
      expect(result.rows.length).toBeGreaterThan(0)
      expect(result.rows.every((row) => row.state !== "passed")).toBe(true)
    })
  })

  describe("cenário de falha", () => {
    it("não é um payload de sucesso — só o catálogo e as mensagens de erro por etapa", () => {
      expect(simulationAgentFailureScenario.catalog.length).toBeGreaterThan(0)
      expect(
        simulationAgentFailureScenario.writeTestOrdersErrorMessage
      ).toMatch(/pedidos de teste/)
      expect(
        simulationAgentFailureScenario.runBuyerAgentErrorMessage
      ).toMatch(/agente comprador/)
    })
  })
})
