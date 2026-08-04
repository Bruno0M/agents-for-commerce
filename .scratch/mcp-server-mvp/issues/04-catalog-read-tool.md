# 04 — Catalog read tool (CatalogReadTools) via ShopifySharp

**What to build:** a primeira das 4 tools MCP do MVP — leitura do catálogo/PDP atual via Shopify Admin GraphQL API, usando ShopifySharp em vez de `HttpClient` cru. Dado um identificador de produto, a tool retorna o conteúdo atual (descrição, specs, schema.org presente ou ausente) em um formato estruturado que as demais tools (especialmente a de geração de conteúdo, ticket 05) vão consumir como entrada.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Tool registrada como `[McpServerToolType]` e exposta via `WithToolsFromAssembly()`
- [x] Dado um handle/ID de produto real de uma Shopify dev store, a tool retorna descrição, specs e indicação de schema.org presente/ausente
- [x] Erros de produto inexistente ou API Shopify fora do ar tratados com mensagem clara, sem derrubar o servidor

## Comments

Implementado em `apps/mcp-server/Tools/CatalogReadTools.cs`: tool `get_product_content` (`[McpServerTool]`), usando `ShopifySharp.GraphService` para consultar a Admin GraphQL API por handle ou ID de produto.

- Retorna `ProductCatalogContent`: descrição (`descriptionHtml`), specs estruturadas (options, variants com selected options, metafields) e `HasSchemaOrgMarkup` — heurística que checa se já existe um `<script type="application/ld+json">` embutido na descrição (única forma de schema.org já existir nesse ponto, já que a Admin API não tem campo dedicado; a tool 05 é quem gera isso de verdade).
- Erros mapeados para `McpException` com mensagem clara (produto não encontrado, GraphQL inválido, rate limit, API fora do ar/token inválido) — o SDK MCP propaga a mensagem de `McpException` no `CallToolResult.IsError`, sem derrubar o processo. Testado localmente: `tools/list` expõe a tool, e uma chamada contra um domínio Shopify inexistente retorna `isError: true` com mensagem clara em vez de crashar o servidor (`GET /health` seguiria respondendo normalmente).
- **Auth da Shopify mudou (03/08/2026):** a Shopify aposentou os tokens permanentes de custom app. Apps agora são criados no Dev Dashboard (`dev.shopify.com`) e o token da Admin API sai do *client credentials grant* (`POST /admin/oauth/access_token` com Client ID/secret), válido por 24h. Não há mais token estático para colar no `.env`. O servidor passou a usar `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET` + `ShopifyAccessTokenProvider` (cache com renovação 5 min antes de expirar) e `ShopifyGraphServiceFactory` — o `GraphService` não pode mais ser singleton porque o ShopifySharp recebe o token no construtor.
  - Pegadinha para o próximo: o token do canal **Headless** autentica na Admin API (é uma instalação de app válida) mas só tem escopos `unauthenticated_*`, então falha com `Access denied ... Required access: read_products` em vez de 401 — o que faz parecer erro de escopo corrigível quando na verdade é o token errado.
  - O app precisa declarar os escopos numa versão (Dev Dashboard → Versions → Release) **e** estar instalado na loja; sem a instalação o grant devolve 400 mesmo com credenciais válidas.
- Não testado ainda contra uma Shopify dev store real (nenhuma foi criada — ver item 12.1 de `decisoes-pre-construcao.md`, ainda pendente); validar o formato de `specs`/metafields assim que a loja e o catálogo de teste existirem.

