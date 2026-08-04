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
      **Achado**: `generate_optimized_content` não cria nenhum
      option/metafield novo para "tipo de produto"/categoria — só reaproveita
      `options`/`metafields` já existentes como `additionalProperty` do
      JSON-LD (ver `ToCandidateProduct` em
      `Tools/BuyerAgentSimulatorTools.cs:114-131`, que não lê `productType`).
      Para este produto (sem descrição rica, sem metafield de categoria), a
      otimização não teve como preencher esse requisito — o antes/depois só
      mostra melhora em catálogos onde a descrição original já carrega dado
      suficiente para o AI Gateway extrair, ou onde `productType`/categoria
      vira estrutura nova. Vale investigar se isso é esperado (talvez o
      catálogo de teste do MVP precise de produtos com descrição mais rica)
      ou se falta mapear `productType` para um additionalProperty na geração
- [x] **`publish_suggestion` (ticket 07)** — item criado no Task Board:
      id `board_kY--IB4lSiaArT96dnZLb`, status `triage`, título "[GEO]
      Otimizar conteúdo da PDP the-collection-snowboard-liquid". Fica
      pendente de aprovação humana, não é reversível sozinho por essa tool
- [ ] **Conferir na Studio** — abrir o Task Board da org e confirmar que o item
      `board_kY--IB4lSiaArT96dnZLb` aparece com título/descrição corretos
      (aprovar/rejeitar é revisão humana, fora do escopo do MCP server — ver
      ADR 0004)

## Comments
