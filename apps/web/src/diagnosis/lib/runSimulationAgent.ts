import type { ProductCatalogContent } from "@/lib/catalog"
import type {
  BuyerAgentSimulationBatchResult,
  GeneratedTestOrder,
  TestOrderGenerationResult,
} from "../types"
import {
  simulationAgentFailureScenario,
  simulationAgentNoPassScenario,
  simulationAgentNormalScenario,
} from "../fixtures/simulationAgentPayloads"

/**
 * O botão único "Rodar Agente de Simulação"
 * (`.scratch/catalogo-como-exame/`): a tela não aprova nem edita pedido
 * nenhum, só clica — e por baixo dos panos rodam DUAS chamadas assíncronas
 * que, em produção, são `generate_test_orders` e N × `simulate_buyer_agent`
 * no servidor C# (`apps/mcp-server/Tools/TestOrderGenerationTools.cs`,
 * `BuyerAgentSimulatorTools.cs`). Este módulo é o SEAM do transporte futuro:
 * as duas funções abaixo (`writeTestOrders`, `runBuyerAgent`) já têm a
 * assinatura que uma implementação real por HTTP teria — quando o ticket 05
 * do `exame-guiado` (transporte autenticado) existir, o corpo de cada uma
 * troca para um `fetch`, e NADA muda em quem chama.
 *
 * DECISÃO DE DESENHO — por que duas funções e não uma só que devolve os dois
 * payloads juntos: a tela precisa mostrar os pedidos assim que eles
 * "chegam", antes do resultado do exame (a faixa EXAME da spec mostra "N
 * pedidos" na hora, assim que o gerador escreve — não espera o resultado
 * para aparecer). Um
 * `runSimulationAgent(catalog)` que devolvesse uma Promise só de tudo junto
 * esconderia esse estado intermediário atrás de um único `await`. As duas
 * chamadas de rede reais serão sequenciais de qualquer forma (a segunda
 * precisa dos pedidos que a primeira escreveu) — expor os dois passos é
 * modelar a mecânica real, não uma escolha de UI.
 *
 * `runSimulationAgent` (o nome que o ticket desta etapa pede) é o
 * NAMESPACE — `runSimulationAgent.writeTestOrders(...)` seguido de
 * `runSimulationAgent.runBuyerAgent(...)` — para as duas etapas continuarem
 * descobríveis sob um import só, sem forçar quem chama a esperar as duas
 * de uma vez.
 */

const DEFAULT_WRITE_ORDERS_DELAY_MS = 900
const DEFAULT_RUN_BUYER_AGENT_DELAY_MS = 1400

/**
 * Qual payload mockado devolver — os três cenários de
 * `../fixtures/simulationAgentPayloads.ts`. `"normal"` é o default: a
 * mistura dos quatro estados que a demo quer mostrar. `"no-pass"` e
 * `"failure"` existem para a UI ter, sem depender de rede real caindo de
 * verdade, os dois estados que "e se der errado" da tela precisa provar —
 * é o "jeito de forçar a falha" que o ticket desta etapa pede.
 */
export type SimulationAgentScenario = "normal" | "no-pass" | "failure"

export type SimulationAgentOptions = {
  /** Default `"normal"`. */
  scenario?: SimulationAgentScenario
  /**
   * Atraso artificial (ms) desta chamada — existe para os estados de
   * progresso da UI (spinner de "escrevendo pedidos...", depois "rodando o
   * agente...") serem reais, não decorativos: sem atraso nenhum, os dois
   * `await` resolveriam no mesmo tick e a tela nunca renderizaria o estado
   * intermediário. Cada função tem seu próprio default (abaixo); passe `0`
   * nos testes para não esperar de verdade.
   */
  delayMs?: number
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Etapa 1 — "escrevendo os pedidos". Mock fiel de `generate_test_orders`: o
 * catálogo entra (para a assinatura já ficar igual à chamada real, que
 * manda o catálogo lido por `get_product_catalog`), mas o conteúdo devolvido
 * é sempre o payload congelado do cenário escolhido — não há geração de
 * verdade nesta etapa do projeto. Ver o cabeçalho de
 * `../fixtures/simulationAgentPayloads.ts` para como cada cenário foi
 * derivado.
 */
export async function writeTestOrders(
  catalog: ProductCatalogContent[],
  options: SimulationAgentOptions = {}
): Promise<TestOrderGenerationResult> {
  const scenario = options.scenario ?? "normal"
  await wait(options.delayMs ?? DEFAULT_WRITE_ORDERS_DELAY_MS)

  if (scenario === "failure") {
    throw new Error(simulationAgentFailureScenario.writeTestOrdersErrorMessage)
  }

  // O parâmetro `catalog` não determina o conteúdo devolvido — é o mesmo
  // limite que qualquer mock tem (não há geração de verdade para rodar
  // contra um catálogo arbitrário). Documentado aqui em vez de escondido:
  // quem passar um catálogo diferente de `lojaRealSemGabaritoCatalog` ainda
  // recebe um payload coerente (o do cenário), só que sobre OUTRO catálogo
  // do que o que pediu — aceitável para o modo fixture desta etapa, e o
  // primeiro lugar a revisitar quando o transporte real existir.
  void catalog

  return scenario === "no-pass"
    ? simulationAgentNoPassScenario.testOrderGeneration
    : simulationAgentNormalScenario.testOrderGeneration
}

/**
 * Etapa 2 — "rodando o agente". Mock fiel de N × `simulate_buyer_agent`
 * agregadas num payload só (ver `BuyerAgentSimulationBatchResult` em
 * `../types.ts`). Recebe os pedidos que `writeTestOrders` devolveu — mesma
 * razão de `orders` estar aqui e não em `writeTestOrders`: numa chamada real
 * a etapa 2 despacha uma simulação POR PEDIDO, e só sabe quais pedidos
 * existem depois que a etapa 1 respondeu.
 */
export async function runBuyerAgent(
  catalog: ProductCatalogContent[],
  orders: GeneratedTestOrder[],
  options: SimulationAgentOptions = {}
): Promise<BuyerAgentSimulationBatchResult> {
  const scenario = options.scenario ?? "normal"
  await wait(options.delayMs ?? DEFAULT_RUN_BUYER_AGENT_DELAY_MS)

  if (scenario === "failure") {
    throw new Error(simulationAgentFailureScenario.runBuyerAgentErrorMessage)
  }

  // Mesma limitação documentada em `writeTestOrders`: o mock não roda o
  // engine contra `orders`/`catalog` de verdade, devolve o batch congelado
  // do cenário. `orders` continua no parâmetro pela mesma razão de
  // `catalog`: é o shape que a chamada real vai ter.
  void catalog
  void orders

  return scenario === "no-pass"
    ? simulationAgentNoPassScenario.simulationBatch
    : simulationAgentNormalScenario.simulationBatch
}

/**
 * O namespace que a tela importa — `runSimulationAgent.writeTestOrders(...)`
 * seguido de `runSimulationAgent.runBuyerAgent(...)`, ambos com o MESMO
 * `scenario` para o par ficar coerente (o payload de "nenhum produto
 * passou" da etapa 1 é sempre servido junto com o batch de "nenhum produto
 * passou" da etapa 2 — nunca um cenário cruzado com outro). As duas funções
 * continuam exportadas nomeadas acima para quem preferir importar só uma.
 */
export const runSimulationAgent = {
  writeTestOrders,
  runBuyerAgent,
}
