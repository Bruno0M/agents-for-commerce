import { describe, expect, it } from "vitest"
import {
  catalogSimulationRunReducer,
  INITIAL_CATALOG_SIMULATION_RUN_STATE,
  type CatalogSimulationRunState,
  type SimulationRunScope,
} from "./simulationRun"
import type {
  BuyerAgentOrderOutcome,
  CatalogExamResult,
  GeneratedTestOrder,
} from "../types"

const SCOPE: SimulationRunScope = { productCount: 7 }

const ORDERS: GeneratedTestOrder[] = [
  {
    id: "pedido-1",
    text: "Quero um fone bluetooth até R$300",
    expectsValidMatch: true,
    constraintAxis: "contraste",
    rationale: "Testa o par A/B.",
  },
]

const RESULT: CatalogExamResult = {
  totalProductCount: 7,
  orderCount: 1,
  examined: true,
  illegibleProductCount: 1,
  rows: [],
}

const OUTCOMES: BuyerAgentOrderOutcome[] = [
  {
    orderId: "pedido-1",
    products: [
      {
        productId: "1",
        handle: "fone-bluetooth",
        title: "Fone Bluetooth",
        passed: true,
        confirmedRequirements: ["'Preço' <= 'R$300,00'."],
        unmetRequirements: [],
      },
    ],
  },
]

describe("catalogSimulationRunReducer", () => {
  it("estado inicial é idle", () => {
    expect(INITIAL_CATALOG_SIMULATION_RUN_STATE).toEqual({ status: "idle" })
  })

  it("start move para writing-orders, com o escopo declarado", () => {
    const next = catalogSimulationRunReducer(
      INITIAL_CATALOG_SIMULATION_RUN_STATE,
      { type: "start", scope: SCOPE }
    )
    expect(next).toEqual({ status: "writing-orders", scope: SCOPE })
  })

  it("ordersWritten a partir de writing-orders move para running-agent, com os pedidos", () => {
    const writing: CatalogSimulationRunState = {
      status: "writing-orders",
      scope: SCOPE,
    }
    const next = catalogSimulationRunReducer(writing, {
      type: "ordersWritten",
      orders: ORDERS,
    })
    expect(next).toEqual({
      status: "running-agent",
      scope: SCOPE,
      orders: ORDERS,
    })
  })

  it("success a partir de running-agent move para success, preservando escopo e pedidos", () => {
    const running: CatalogSimulationRunState = {
      status: "running-agent",
      scope: SCOPE,
      orders: ORDERS,
    }
    const next = catalogSimulationRunReducer(running, {
      type: "success",
      result: RESULT,
      outcomes: OUTCOMES,
    })
    expect(next).toEqual({
      status: "success",
      scope: SCOPE,
      orders: ORDERS,
      result: RESULT,
      outcomes: OUTCOMES,
    })
  })

  it("failure a partir de writing-orders move para error na etapa 1, sem pedido nenhum", () => {
    const writing: CatalogSimulationRunState = {
      status: "writing-orders",
      scope: SCOPE,
    }
    const next = catalogSimulationRunReducer(writing, {
      type: "failure",
      stage: "writing-orders",
      message: "Falha ao escrever os pedidos",
    })
    expect(next).toEqual({
      status: "error",
      scope: SCOPE,
      stage: "writing-orders",
      orders: null,
      message: "Falha ao escrever os pedidos",
    })
  })

  it("failure a partir de running-agent move para error na etapa 2, preservando os pedidos já escritos", () => {
    const running: CatalogSimulationRunState = {
      status: "running-agent",
      scope: SCOPE,
      orders: ORDERS,
    }
    const next = catalogSimulationRunReducer(running, {
      type: "failure",
      stage: "running-agent",
      message: "Falha ao rodar o agente comprador",
    })
    expect(next).toEqual({
      status: "error",
      scope: SCOPE,
      stage: "running-agent",
      orders: ORDERS,
      message: "Falha ao rodar o agente comprador",
    })
  })

  it("reset volta para idle a partir de qualquer estado", () => {
    const error: CatalogSimulationRunState = {
      status: "error",
      scope: SCOPE,
      stage: "running-agent",
      orders: ORDERS,
      message: "Falha",
    }
    expect(catalogSimulationRunReducer(error, { type: "reset" })).toEqual({
      status: "idle",
    })

    const success: CatalogSimulationRunState = {
      status: "success",
      scope: SCOPE,
      orders: ORDERS,
      result: RESULT,
      outcomes: OUTCOMES,
    }
    expect(catalogSimulationRunReducer(success, { type: "reset" })).toEqual({
      status: "idle",
    })
  })

  it("permite rodar de novo a partir de error (retry) — start sobrescreve o erro", () => {
    const error: CatalogSimulationRunState = {
      status: "error",
      scope: SCOPE,
      stage: "writing-orders",
      orders: null,
      message: "Falha",
    }
    const next = catalogSimulationRunReducer(error, {
      type: "start",
      scope: SCOPE,
    })
    expect(next).toEqual({ status: "writing-orders", scope: SCOPE })
  })

  it("ignora ordersWritten órfão (chegou fora de writing-orders) em vez de sobrescrever um estado mais novo", () => {
    expect(
      catalogSimulationRunReducer(INITIAL_CATALOG_SIMULATION_RUN_STATE, {
        type: "ordersWritten",
        orders: ORDERS,
      })
    ).toEqual({ status: "idle" })
  })

  it("ignora success órfão (chegou fora de running-agent) pelo mesmo motivo", () => {
    expect(
      catalogSimulationRunReducer(INITIAL_CATALOG_SIMULATION_RUN_STATE, {
        type: "success",
        result: RESULT,
        outcomes: OUTCOMES,
      })
    ).toEqual({ status: "idle" })
  })

  it("failure em idle não move para lugar nenhum (nenhuma chamada em curso para falhar)", () => {
    expect(
      catalogSimulationRunReducer(INITIAL_CATALOG_SIMULATION_RUN_STATE, {
        type: "failure",
        stage: "writing-orders",
        message: "tarde demais",
      })
    ).toEqual({ status: "idle" })
  })
})
