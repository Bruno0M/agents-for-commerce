# Checklist de teste manual — MCP Server (Agente de GEO)

Status: in-progress

Fluxo ponta a ponta para validar as tickets 01-08 contra a dev store real, com o
container já rodando localmente (`docker compose up -d` em `apps/mcp-server/`).

## Infra

- [x] Health check — `GET http://localhost:6142/health` responde `200`
- [x] Boot/config — container sobe "healthy" sem erro de env var faltando (`.env`
      completo: `MCP_BEARER_TOKEN`, `AI_GATEWAY_ORG_SLUG`, `AI_GATEWAY_API_KEY`,
      `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`,
      `STUDIO_API_KEY`)

## Fluxo GEO (ticket por ticket)

- [x] **Auth (ticket 01)** — sem `Authorization` → `401`; bearer errado → `401`;
      bearer correto → `200`
- [x] **`get_product_content` (ticket 04)** — produto `9289653551316` ("The
      Collection Snowboard: Liquid", R$749,95, sem markup schema.org). Confirma
      integração com a Shopify Admin API e o token de 24h via client credentials
- [x] **`generate_optimized_content` (ticket 05)** — gerou JSON-LD Product
      completo (brand, offer com preço/moeda BRL, `additionalProperty` a partir
      da option "Title" + metafield `binding_mount`). Confirma chamada real ao
      AI Gateway (descrição composta a partir de vendor/categoria, não só
      fallback do título). Sem FAQPage — esperado, produto sem `descriptionHtml`
      não tem base factual suficiente
- [x] **`simulate_buyer_agent` — rodada "antes" (ticket 06)** — pedido "quero
      uma prancha de snowboard até R$800" contra o produto 9289653551316 (só
      Options+Metafields originais). Falhou: `Sem dado estruturado para
      confirmar 'Tipo de produto'`
- [x] **`simulate_buyer_agent` — rodada "depois" (ticket 06)** — mesmo pedido,
      catálogo com `hasSchemaOrgMarkup: true`/descrição otimizada. **Mesmo
      resultado da rodada "antes"** — falhou pelo mesmo motivo.
      **Achado (na época)**: atribuído a `generate_optimized_content` não criar
      option/metafield novo para "tipo de produto", e a `ToCandidateProduct`
      não ler `productType`.

      **Resolvido — atualização de 04/08/2026.** O diagnóstico estava só
      metade certo, e a metade mecânica foi corrigida:
      `ToCandidateProduct` (`Tools/BuyerAgentSimulatorTools.cs:120-181`) hoje lê
      todas as fontes estruturadas — `Options`, `Metafields`,
      `GeneratedProperties`, e os fallbacks `ProductType` ("Tipo de produto") e
      `DescriptionHtml` ("Descrição"). O nome `"Tipo de produto"` está ancorado
      nos dois lados: constante em `BuyerAgentSimulatorTools.cs:187` e regra
      explícita no prompt de extração de requisitos. E `ContentGenerationResult`
      passou a devolver `OptimizedCatalog` no mesmo shape que
      `simulate_buyer_agent` consome, então a rodada "depois" roda de verdade
      contra a versão otimizada.

      **O que continua verdade**: a geração só extrai o que já está na
      descrição — ela nunca inventa (ver o prompt em
      `Tools/ContentGenerationTools.cs`). Um produto com `descriptionHtml`
      vazio, como este snowboard de seed, continua sem nada a estruturar. É
      exatamente por isso que o catálogo de demo do ticket 02 foi curado com
      prosa de marketing corrida: o fato está no texto, só não está em campo.

      **O risco que sobra** não é este, é o **alinhamento de vocabulário**: a
      extração de requisitos e a geração de specs são duas chamadas de LLM
      independentes, e o filtro casa nome de atributo por igualdade. Fora de
      `"Tipo de produto"`, nada garante que as duas escolham a mesma string.
- [x] **`publish_suggestion` (ticket 07)** — item criado no Task Board:
      id `board_kY--IB4lSiaArT96dnZLb`, status `triage`, título "[GEO]
      Otimizar conteúdo da PDP the-collection-snowboard-liquid". Fica
      pendente de aprovação humana, não é reversível sozinho por essa tool
- [ ] **Conferir na Studio** — abrir o Task Board da org e confirmar que o item
      `board_kY--IB4lSiaArT96dnZLb` aparece com título/descrição corretos
      (aprovar/rejeitar é revisão humana, fora do escopo do MCP server — ver
      ADR 0004)

## Comments
