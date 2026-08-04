# Context Map

## Contexts

- [MCP Server](./apps/mcp-server/CONTEXT.md) — agente de GEO: lê catálogo, gera conteúdo otimizado, simula agente comprador, publica sugestões

Storefront (`apps/storefront/`) ainda não tem `CONTEXT.md` — só o `AGENTS.md` existente com notas de stack/conteúdo `.deco/`. Criar quando a primeira decisão/termo específico daquele contexto for resolvido.

## Relationships

- **MCP Server → Storefront**: o MCP Server publica sugestões via Task Board; um Super Agent da Studio as transforma em PR real contra o conteúdo do storefront, com aprovação humana antes do merge/deploy (ver `apps/mcp-server/docs/adr/0004-task-board-nao-registry-publish.md`).
