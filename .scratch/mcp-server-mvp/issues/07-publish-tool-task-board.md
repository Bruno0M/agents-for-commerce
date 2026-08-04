# 07 — Publish tool (PublishTools) + API key da Studio

**What to build:** provisionar a API key da org `bruno-feijoada` no Deco Studio (para o servidor .NET chamar de volta a Studio) e implementar a quarta tool MCP do MVP: publicação via `TASK_BOARD_ITEM_CREATE`, enviando a sugestão gerada (ex: output do ticket 05) para o fluxo de aprovação humana do Task Board, em vez de publicar direto na loja.

**Blocked by:** None — can start immediately

**Status:** done

- [x] API key da org `bruno-feijoada` gerada e guardada como secret/env var no servidor .NET
- [x] Tool registrada como `[McpServerToolType]`
- [x] Chamar a tool com um payload estruturado cria um item real e visível no Task Board da Studio
- [x] A tool nunca aprova ou publica sozinha — só cria o item de aprovação (nenhuma chamada a `TASK_BOARD_REVIEW_DECISION` ou `TASK_BOARD_PROMOTE_TO_PRODUCTION` dentro desta tool)

## Comments

Implementado `PublishTools.PublishSuggestion` + `Infrastructure/StudioTaskBoardClient.cs` (2026-08-03). Sem testes automatizados, por pedido explícito.

- O acesso à Studio a partir do servidor .NET não é REST (diferente do AI Gateway, ticket 03): é uma sessão MCP real (Streamable HTTP, `ModelContextProtocol.Client`) contra `https://studio.decocms.com/api/{org}/mcp/self` — o MCP de "management tools" da própria Studio (Task Board, API keys, etc.), no mesmo org slug (`AI_GATEWAY_ORG_SLUG`) já usado pelo AI Gateway.
- Chama `TASK_BOARD_ITEM_CREATE` (`title` obrigatório, `description` com a sugestão formatada em markdown — descrição otimizada + JSON-LD de Product/FAQPage). Uma sessão MCP nova é aberta por chamada (stateless, mesma linha da ADR 0001) em vez de manter uma sessão viva.
- Nova env var `STUDIO_API_KEY`, **separada** da `AI_GATEWAY_API_KEY` — a key do AI Gateway só tem permissão `ORGANIZATION_GET` e não pode chamar Task Board. Key `mcp-server-task-board` provisionada ao vivo via `API_KEY_CREATE` com `{"self": ["TASK_BOARD_ITEM_CREATE"]}` (2026-08-03), guardada em `apps/mcp-server/.env` (gitignored).
- **Validado ponta a ponta ao vivo (2026-08-03):** servidor rodado localmente, `publish_suggestion` chamado via MCP real (`tools/call`) com um payload de smoke test → criou `board_ZTJtCGYz6Tq2T7xS3GYus` de verdade, confirmado via `TASK_BOARD_ITEM_LIST` (status `triage`, visível ao lado do item de teste manual `board_NFxliyya_ST4ZXv71qa4x` já existente) e depois removido via `TASK_BOARD_ITEM_DELETE` para não deixar lixo no board real.
