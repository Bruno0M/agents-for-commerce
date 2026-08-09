import { lojaRealSemGabaritoCatalog } from "@/diagnosis/fixtures/loja-real-sem-gabarito"
import {
  runSimulationAgent,
  type SimulationAgentOptions,
} from "@/diagnosis/lib/runSimulationAgent"
import type { ExamTransport } from "./types"

/**
 * O transporte de FIXTURE — o modo em que as telas se desenvolvem sem loja
 * no ar, e o único que funciona com o `mcp-server` fora do ar. Ele não é um
 * resto do passado: é um dos modos que a issue #6 manda manter vivos.
 *
 * Não há código novo de mock aqui de propósito. O corpo dos dois métodos do
 * exame é `runSimulationAgent` (`@/diagnosis/lib/runSimulationAgent`), que
 * já existia e continua sendo o dono dos payloads congelados, dos atrasos
 * artificiais (que dão à UI dois estados de progresso REAIS) e dos três
 * cenários (`normal`/`no-pass`/`failure`). Este módulo só o veste com a
 * interface comum.
 *
 * As chamadas passam pelo objeto-namespace (`runSimulationAgent.x(...)`) e
 * não pelas funções nomeadas importadas soltas — assim um
 * `vi.spyOn(runSimulationAgent, "writeTestOrders")` continua interceptando,
 * que é como os testes de tela já forçam cenário e falha.
 */
export function createFixtureTransport(
  options: SimulationAgentOptions = {}
): ExamTransport {
  return {
    kind: "fixture",

    // O catálogo do modo fixture é sempre `lojaRealSemGabaritoCatalog`: os
    // desfechos congelados de `simulationAgentPayloads.ts` são chaveados nos
    // ids DESTES sete produtos. Servir outro catálogo aqui produziria linhas
    // de exame sem produto correspondente.
    readCatalog: () => Promise.resolve(lojaRealSemGabaritoCatalog),

    writeTestOrders: (catalog) =>
      runSimulationAgent.writeTestOrders(catalog, options),

    runBuyerAgent: (catalog, orders) =>
      runSimulationAgent.runBuyerAgent(catalog, orders, options),
  }
}
