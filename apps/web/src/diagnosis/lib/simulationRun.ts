import type {
  BuyerAgentOrderOutcome,
  CatalogExamResult,
  GeneratedTestOrder,
} from "../types"

/**
 * O botão único "Rodar Agente de Simulação" (`.scratch/catalogo-como-exame/`)
 * substitui o fluxo antigo aprovar→rodar (ticket 04, rejeitado pelo dono do
 * projeto). Este módulo é o estado de EXECUÇÃO das duas chamadas reais que o
 * botão dispara — `runSimulationAgent.writeTestOrders` (etapa 1, "escrevendo
 * os pedidos") seguida de `runSimulationAgent.runBuyerAgent` (etapa 2,
 * "rodando o agente") — separado do estado do RESULTADO (`CatalogExamState`,
 * de `CatalogExamStrip.tsx`), que só sabe "examinado ou não".
 *
 * Substitui `catalogExamRun.ts` (apagado): aquele reducer modelava só
 * `idle → running → success/error`, o suficiente para UMA chamada síncrona
 * local. O redesenho tem duas chamadas assíncronas reais e sequenciais, e a
 * etapa 2 só começa depois que a etapa 1 devolve os pedidos — a tela precisa
 * mostrar os pedidos em prosa assim que a etapa 1 resolve, antes da etapa 2
 * terminar (é por isso que `runSimulationAgent` já expõe duas funções
 * separadas em vez de uma promessa só — ver o comentário de cabeçalho de
 * `runSimulationAgent.ts`). Por isso o estado `running-agent` carrega
 * `orders` — os pedidos já chegaram e ficam visíveis (o painel read-only os
 * renderiza) enquanto a etapa 2 ainda está em voo.
 *
 * Modelado como reducer pelo mesmo motivo do antigo: transição pura,
 * testável isolada do componente, mesmo padrão de `wizardReducer`
 * (`wizard/flow-state.ts`).
 */

/** O escopo declarado da rodada — quantos produtos do catálogo. Fica
 * disponível em todo estado depois de `start`, inclusive erro. */
export type SimulationRunScope = {
  productCount: number
}

export type CatalogSimulationRunState =
  | { status: "idle" }
  | { status: "writing-orders"; scope: SimulationRunScope }
  | {
      status: "running-agent"
      scope: SimulationRunScope
      orders: GeneratedTestOrder[]
    }
  | {
      status: "success"
      scope: SimulationRunScope
      orders: GeneratedTestOrder[]
      result: CatalogExamResult
      /** O veredito CRU por (produto, pedido) — a mesma entrada que
       * `aggregateExamOutcomes` consumiu para produzir `result`, mas antes
       * da dedup por frase de `ProductExamRow.reasons`. O drill-down do
       * ticket 05 (`.scratch/catalogo-como-exame/`) precisa disto: a versão
       * deduplicada não preserva `confirmedRequirements` nem atribui
       * `unmetRequirements` por pedido individual, só por frase agregada. */
      outcomes: BuyerAgentOrderOutcome[]
    }
  | {
      status: "error"
      scope: SimulationRunScope
      /** Qual das duas chamadas falhou — decide a mensagem de título do
       * `Alert` e se há pedidos para mostrar junto do erro. */
      stage: "writing-orders" | "running-agent"
      /** `null` quando a falha aconteceu na etapa 1 (não há pedido nenhum
       * ainda); os pedidos da etapa 1 quando a falha foi na etapa 2 — eles
       * continuam válidos e continuam auditáveis mesmo com o exame falho. */
      orders: GeneratedTestOrder[] | null
      message: string
    }

export const INITIAL_CATALOG_SIMULATION_RUN_STATE: CatalogSimulationRunState =
  {
    status: "idle",
  }

export type CatalogSimulationRunAction =
  | { type: "start"; scope: SimulationRunScope }
  | { type: "ordersWritten"; orders: GeneratedTestOrder[] }
  | {
      type: "success"
      result: CatalogExamResult
      outcomes: BuyerAgentOrderOutcome[]
    }
  | {
      type: "failure"
      stage: "writing-orders" | "running-agent"
      message: string
    }
  | { type: "reset" }

/**
 * A transição pura. `ordersWritten` só tem efeito vindo de `writing-orders`,
 * `success` só vindo de `running-agent` — uma resposta atrasada de uma
 * rodada anterior (o lojista clicou "Rodar Agente de Simulação" de novo
 * antes da primeira responder) chega como ação órfã e é ignorada, em vez de
 * sobrescrever um estado mais novo com um resultado mais velho. Mesma defesa
 * que o reducer antigo já tinha contra respostas fora de ordem.
 */
export function catalogSimulationRunReducer(
  state: CatalogSimulationRunState,
  action: CatalogSimulationRunAction
): CatalogSimulationRunState {
  switch (action.type) {
    case "start":
      return { status: "writing-orders", scope: action.scope }
    case "ordersWritten":
      if (state.status !== "writing-orders") return state
      return {
        status: "running-agent",
        scope: state.scope,
        orders: action.orders,
      }
    case "success":
      if (state.status !== "running-agent") return state
      return {
        status: "success",
        scope: state.scope,
        orders: state.orders,
        result: action.result,
        outcomes: action.outcomes,
      }
    case "failure":
      if (state.status === "writing-orders") {
        return {
          status: "error",
          scope: state.scope,
          stage: "writing-orders",
          orders: null,
          message: action.message,
        }
      }
      if (state.status === "running-agent") {
        return {
          status: "error",
          scope: state.scope,
          stage: "running-agent",
          orders: state.orders,
          message: action.message,
        }
      }
      return state
    case "reset":
      return { status: "idle" }
  }
}
