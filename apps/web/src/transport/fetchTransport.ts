import type { ProductCatalogReadResult } from "@/lib/catalog"
import {
  TransportUnavailableError,
  type ExamTransport,
  type ExamTransportCallOptions,
} from "./types"

/**
 * O transporte do FRONT AVULSO — o `/web` rodando como SPA própria
 * (`bun dev`), com o `mcp-server` no ar.
 *
 * É o único módulo do app que chama `fetch`. Ele nasceu de
 * `src/lib/catalog.ts`, que passou a guardar só os tipos do catálogo: a
 * chamada de rede mudou de lugar, não de comportamento.
 *
 * ## Por que só o catálogo
 *
 * `GET /catalog` (`apps/mcp-server/Program.cs:107`) existe, é isento de auth
 * e tem CORS aberto por um motivo específico: `get_product_catalog` custa
 * ZERO. As tools do exame não custam zero — `generate_test_orders` e
 * `simulate_buyer_agent` queimam crédito de LLM por chamada. Expor as duas
 * como rota isenta criaria endpoint público que gasta dinheiro de quem
 * descobrir a URL; mandar o bearer para dentro do bundle vazaria a
 * credencial em todo lugar onde o HTML for servido.
 *
 * O D3 da spec fecha a porta: **nenhum ticket adiciona rota nova, isenção
 * nova ou policy CORS nova.** Então este transporte não tem como rodar o
 * exame, e diz isso em voz alta (`TransportUnavailableError`) em vez de
 * falhar com um 401 que parece problema de rede. Quem quer o exame de
 * verdade abre a view dentro do Studio (`bridgeTransport.ts`); quem quer
 * desenvolver tela usa o modo fixture.
 */
export function createFetchTransport(
  options: FetchTransportOptions = {}
): ExamTransport {
  const baseUrl = (options.baseUrl ?? DEFAULT_MCP_SERVER_URL).replace(
    /\/+$/,
    ""
  )

  return {
    kind: "fetch",

    readCatalog: (callOptions) => fetchCatalog(baseUrl, callOptions),

    writeTestOrders: () => Promise.reject(unavailable("generate_test_orders")),

    runBuyerAgent: () => Promise.reject(unavailable("simulate_buyer_agent")),
  }
}

export type FetchTransportOptions = {
  /** Base do `mcp-server`. Default `VITE_MCP_SERVER_URL`, e
   * `http://localhost:6142` (o `dotnet run`) quando nem isso existe. */
  baseUrl?: string
}

const DEFAULT_MCP_SERVER_URL = "http://localhost:6142"

/** Servidor no ar mas mudo é indistinguível de servidor fora do ar sem um
 * teto: sem isto, a tela ficaria em "carregando" para sempre — e "timeout
 * tem estado visível" é critério de aceite da issue #6. */
const CATALOG_TIMEOUT_MS = 15_000

async function fetchCatalog(
  baseUrl: string,
  callOptions: ExamTransportCallOptions = {}
): Promise<ProductCatalogReadResult> {
  const timeout = AbortSignal.timeout(CATALOG_TIMEOUT_MS)
  const signal = callOptions.signal
    ? AbortSignal.any([callOptions.signal, timeout])
    : timeout

  let response: Response
  try {
    response = await fetch(`${baseUrl}/catalog`, { signal })
  } catch (error) {
    // Um abort do CALLER (desmontagem, troca de transporte) não é falha e
    // não pode virar mensagem de erro na tela — quem cancelou já sabe.
    if (callOptions.signal?.aborted) throw error

    if (timeout.aborted) {
      throw new Error(
        `O mcp-server (${baseUrl}) não respondeu em ${CATALOG_TIMEOUT_MS / 1000}s ao ler o catálogo.`,
        { cause: error }
      )
    }

    throw new Error(
      `Não foi possível falar com o mcp-server em ${baseUrl}. Ele está no ar? (${describe(error)})`,
      { cause: error }
    )
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar o catálogo (${response.status} ${response.statusText})`
    )
  }

  return (await response.json()) as ProductCatalogReadResult
}

function unavailable(toolName: string): TransportUnavailableError {
  return new TransportUnavailableError(
    "fetch",
    `O front avulso não roda o exame: \`${toolName}\` gasta crédito de LLM por ` +
      `chamada e, por isso, não tem rota HTTP sem autenticação — só \`GET /catalog\` ` +
      `tem. Abra a view dentro do Deco Studio (onde o host chama as tools com as ` +
      `credenciais da Connection) ou rode em modo fixture ` +
      `(\`VITE_EXAM_TRANSPORT=fixture\`).`
  )
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
