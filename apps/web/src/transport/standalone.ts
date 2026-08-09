import { createFetchTransport } from "./fetchTransport"
import { createFixtureTransport } from "./fixtureTransport"
import type { ExamTransport } from "./types"

/**
 * Qual transporte o `/web` usa quando NÃO está dentro do Studio — a escolha
 * entre os dois modos avulsos, feita por variável de ambiente do Vite.
 *
 * O default é `fixture`, e isso é deliberado: é exatamente o que o `bun dev`
 * já fazia antes desta issue (catálogo de exemplo, exame mockado, nada de
 * servidor). Quem quiser ver o catálogo da loja de verdade no front avulso
 * põe `VITE_EXAM_TRANSPORT=fetch` — aí o catálogo vem do `GET /catalog`, e
 * o exame passa a dizer que só roda dentro do Studio (ver
 * `fetchTransport.ts`).
 */
export function createStandaloneTransport(
  env: StandaloneTransportEnv = import.meta.env
): ExamTransport {
  const requested = env.VITE_EXAM_TRANSPORT?.trim()

  if (requested === "fetch") {
    return createFetchTransport({ baseUrl: env.VITE_MCP_SERVER_URL })
  }

  if (requested !== undefined && requested !== "" && requested !== "fixture") {
    // Não derruba a tela por causa de um typo em `.env` — mas também não
    // engole: cair para fixture em silêncio é como alguém acaba
    // apresentando dados de exemplo achando que são da loja.
    console.error(
      `VITE_EXAM_TRANSPORT="${requested}" não é um transporte conhecido (use "fixture" ou "fetch"). Seguindo em modo fixture.`
    )
  }

  return createFixtureTransport()
}

export type StandaloneTransportEnv = {
  VITE_EXAM_TRANSPORT?: string
  VITE_MCP_SERVER_URL?: string
}
