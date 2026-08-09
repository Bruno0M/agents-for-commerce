/// <reference types="vite/client" />

/**
 * As variáveis `VITE_*` que este app lê. Declaradas para que
 * `import.meta.env` seja tipado no ponto onde a escolha de transporte
 * acontece (`transport/standalone.ts`) — sem isso, `import.meta.env` não é
 * atribuível a nada e a escolha viraria `any`.
 */
interface ImportMetaEnv {
  /** Base do `mcp-server` para o transporte `fetch`. Default
   * `http://localhost:6142` (o `dotnet run`). */
  readonly VITE_MCP_SERVER_URL?: string
  /** Qual transporte usar FORA do Studio: `fixture` (default) ou `fetch`.
   * Dentro do Studio isso é ignorado — lá o transporte é sempre o bridge. */
  readonly VITE_EXAM_TRANSPORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
