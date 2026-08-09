import { describe, expect, it } from "vitest"
import { lojaRealSemGabaritoCatalog } from "../fixtures/loja-real-sem-gabarito"
import {
  simulationAgentFailureScenario,
  simulationAgentNoPassScenario,
  simulationAgentNormalScenario,
} from "../fixtures/simulationAgentPayloads"
import { runBuyerAgent, runSimulationAgent, writeTestOrders } from "./runSimulationAgent"

const catalog = lojaRealSemGabaritoCatalog.products

describe("runSimulationAgent", () => {
  describe("writeTestOrders (etapa 1)", () => {
    it("por padrão devolve o cenário normal, sem esperar o delay real quando delayMs é 0", async () => {
      const result = await writeTestOrders(catalog, { delayMs: 0 })

      expect(result).toEqual(simulationAgentNormalScenario.testOrderGeneration)
    })

    it("é uma Promise — resolve/rejeita como o chamador futuro (transporte HTTP) vai precisar tratar", () => {
      const outcome = writeTestOrders(catalog, { delayMs: 0 })
      expect(outcome).toBeInstanceOf(Promise)
    })

    it("cenário 'no-pass' devolve o payload de lote sem correspondência válida", async () => {
      const result = await writeTestOrders(catalog, {
        delayMs: 0,
        scenario: "no-pass",
      })

      expect(result).toEqual(simulationAgentNoPassScenario.testOrderGeneration)
    })

    it("cenário 'failure' rejeita com a mensagem de erro da etapa 1 — o jeito de forçar a falha para a UI", async () => {
      await expect(
        writeTestOrders(catalog, { delayMs: 0, scenario: "failure" })
      ).rejects.toThrow(simulationAgentFailureScenario.writeTestOrdersErrorMessage)
    })

    it("aplica um atraso artificial real quando delayMs não é zerado", async () => {
      const start = Date.now()
      await writeTestOrders(catalog, { delayMs: 30 })
      expect(Date.now() - start).toBeGreaterThanOrEqual(25)
    })
  })

  describe("runBuyerAgent (etapa 2)", () => {
    it("por padrão devolve o cenário normal, sem esperar o delay real quando delayMs é 0", async () => {
      const orders = simulationAgentNormalScenario.testOrderGeneration.orders
      const result = await runBuyerAgent(catalog, orders, { delayMs: 0 })

      expect(result).toEqual(simulationAgentNormalScenario.simulationBatch)
    })

    it("cenário 'no-pass' devolve o batch em que nenhum produto passa", async () => {
      const orders = simulationAgentNoPassScenario.testOrderGeneration.orders
      const result = await runBuyerAgent(catalog, orders, {
        delayMs: 0,
        scenario: "no-pass",
      })

      expect(result).toEqual(simulationAgentNoPassScenario.simulationBatch)
    })

    it("cenário 'failure' rejeita com a mensagem de erro da etapa 2", async () => {
      const orders = simulationAgentNormalScenario.testOrderGeneration.orders
      await expect(
        runBuyerAgent(catalog, orders, { delayMs: 0, scenario: "failure" })
      ).rejects.toThrow(simulationAgentFailureScenario.runBuyerAgentErrorMessage)
    })
  })

  describe("o namespace runSimulationAgent expõe as duas etapas separadamente", () => {
    it("writeTestOrders e runBuyerAgent estão disponíveis como métodos do mesmo import", async () => {
      expect(runSimulationAgent.writeTestOrders).toBe(writeTestOrders)
      expect(runSimulationAgent.runBuyerAgent).toBe(runBuyerAgent)
    })

    it("a etapa 1 resolve antes da etapa 2 começar — a tela pode mostrar os pedidos antes do resultado", async () => {
      const events: string[] = []

      const orders = await runSimulationAgent
        .writeTestOrders(catalog, { delayMs: 0 })
        .then((result) => {
          events.push("orders")
          return result.orders
        })

      await runSimulationAgent
        .runBuyerAgent(catalog, orders, { delayMs: 0 })
        .then(() => {
          events.push("outcomes")
        })

      expect(events).toEqual(["orders", "outcomes"])
    })
  })
})
