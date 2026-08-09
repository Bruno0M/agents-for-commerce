import type {
  ProductCatalogContent,
  ProductCatalogReadResult,
} from "@/lib/catalog"
import type {
  BuyerAgentSimulationBatchResult,
  GeneratedTestOrder,
  TestOrderGenerationResult,
} from "@/diagnosis/types"

/**
 * A INTERFACE DE TRANSPORTE (D2 da spec `web-como-view-do-studio`, issue #6).
 *
 * Uma árvore de componentes, N transportes. Nenhum componente de tela sabe
 * qual está ativo: o entry point escolhe um (`TransportGate`), põe no
 * contexto (`context.tsx`) e a tela só chama os três métodos daqui.
 *
 * As três implementações, e por que são três e não duas:
 *
 * - `bridge` (`bridgeTransport.ts`) — dentro do Studio. Chama as tools do
 *   próprio `mcp-server` por `app.callServerTool`, sem NENHUMA requisição de
 *   rede: quem executa é o host, com as credenciais que a Connection já
 *   guarda. É o D1 da spec, e a razão de o bearer token não precisar existir
 *   dentro do bundle.
 * - `fetch` (`fetchTransport.ts`) — front avulso com o servidor no ar. Lê o
 *   catálogo por `GET /catalog`, a única rota isenta de auth (ela custa zero,
 *   ver `apps/mcp-server/Program.cs:107`). NÃO roda o exame: as tools do
 *   exame gastam crédito de LLM por chamada e não têm — nem vão ganhar, o D3
 *   proíbe — rota HTTP sem autenticação. Isso não é um buraco desta
 *   implementação, é o Problem Statement inteiro da spec: o `/web` não tem
 *   como completar o próprio transporte enquanto viver fora do Studio.
 * - `fixture` (`fixtureTransport.ts`) — o modo em que as telas se
 *   desenvolvem, e o único que funciona com o servidor fora do ar. Não morre
 *   com a chegada dos outros dois; continua sendo o default do `bun dev`.
 *
 * Cada transporte é COERENTE ponta a ponta — catálogo e exame vêm sempre da
 * mesma origem. Misturar (catálogo real + desfechos mockados) produziria
 * linhas de exame sem produto correspondente, que é exatamente o que o
 * comentário de `components/catalog-page.tsx` já avisava.
 */
export interface ExamTransport {
  /** Qual implementação está ativa — a tela usa só para se DESCREVER ao
   * usuário (ver `EXAM_TRANSPORT_DESCRIPTIONS`), nunca para ramificar
   * comportamento. Se alguma tela precisar de um `if (kind === ...)` para
   * funcionar, o D2 está sendo violado. */
  readonly kind: ExamTransportKind

  /**
   * Espelha a tool `get_product_catalog` (`CatalogReadTools.cs`). Custa
   * ZERO — não passa por LLM nenhum — e por isso é a única das três que pode
   * ser disparada por efeito de montagem.
   */
  readCatalog(
    options?: ExamTransportCallOptions
  ): Promise<ProductCatalogReadResult>

  /**
   * Etapa 1 do botão único — espelha `generate_test_orders`
   * (`TestOrderGenerationTools.cs`). **GASTA CRÉDITO DE LLM.** Só pode sair
   * de uma ação explícita do usuário: nunca de render, nunca de efeito de
   * montagem, nunca de retentativa automática.
   */
  writeTestOrders(
    catalog: ProductCatalogContent[],
    options?: ExamTransportCallOptions
  ): Promise<TestOrderGenerationResult>

  /**
   * Etapa 2 do botão único — espelha N × `simulate_buyer_agent`
   * (`BuyerAgentSimulatorTools.cs`), uma chamada por pedido, agregadas num
   * payload só. **GASTA CRÉDITO DE LLM, N vezes.** Mesma regra da etapa 1.
   */
  runBuyerAgent(
    catalog: ProductCatalogContent[],
    orders: GeneratedTestOrder[],
    options?: ExamTransportCallOptions
  ): Promise<BuyerAgentSimulationBatchResult>
}

export type ExamTransportKind = "fixture" | "fetch" | "bridge"

/** O que todo método aceita. `signal` é honrado pelos transportes de rede;
 * o de fixture o ignora (não há o que cancelar num payload congelado). */
export type ExamTransportCallOptions = {
  signal?: AbortSignal
}

/** A frase que a tela mostra para o usuário saber de onde o dado veio —
 * o transporte ativo é informação, não detalhe interno. */
export const EXAM_TRANSPORT_DESCRIPTIONS: Record<ExamTransportKind, string> = {
  fixture: "Modo fixture — loja de exemplo sem gabarito, sem servidor no ar.",
  fetch:
    "Front avulso — catálogo lido do mcp-server; o exame só roda dentro do Studio.",
  bridge:
    "Dentro do Studio — catálogo e exame rodam pelas tools do mcp-server, sem rede.",
}

/**
 * A operação não existe NESTE transporte por decisão de desenho, não por
 * falha. Tipo próprio (e não um `Error` cru) para a tela poder dizer "esse
 * modo não faz isso, veja onde faz" em vez de "deu erro, tente de novo" —
 * retentar nunca vai resolver.
 */
export class TransportUnavailableError extends Error {
  override readonly name = "TransportUnavailableError"
  readonly transportKind: ExamTransportKind

  constructor(transportKind: ExamTransportKind, message: string) {
    super(message)
    this.transportKind = transportKind
  }
}

/**
 * A chamada foi ATÉ o servidor e voltou com algo que não tem a forma
 * combinada — payload vazio, JSON inválido, um `kind` de motivo fora do
 * vocabulário fechado. Separado de `TransportUnavailableError` porque este
 * aqui é sempre um bug (nosso ou de contrato), e de um erro de tool porque
 * a tool nem chegou a reclamar.
 */
export class TransportProtocolError extends Error {
  override readonly name = "TransportProtocolError"
  readonly transportKind: ExamTransportKind

  constructor(transportKind: ExamTransportKind, message: string) {
    super(message)
    this.transportKind = transportKind
  }
}

/**
 * A tool rodou no servidor e devolveu erro (`isError: true`, ou um
 * `McpException` do C#). A mensagem é a do servidor, sem reescrita — é ela
 * que aparece no `Alert` da tela.
 */
export class TransportToolError extends Error {
  override readonly name = "TransportToolError"
  readonly transportKind: ExamTransportKind
  readonly toolName: string

  constructor(
    transportKind: ExamTransportKind,
    toolName: string,
    message: string
  ) {
    super(message)
    this.transportKind = transportKind
    this.toolName = toolName
  }
}
