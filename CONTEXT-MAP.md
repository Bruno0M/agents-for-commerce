# Context Map

## Contexts

- [MCP Server](./apps/mcp-server/CONTEXT.md) — agente de GEO: lê catálogo, gera conteúdo otimizado, simula agente comprador, publica sugestões
- Storefront (`apps/storefront/`) — TanStack Start + React 19 + Cloudflare Workers, Shopify como backend. Ainda sem `CONTEXT.md` — só o `AGENTS.md` existente com notas de stack/conteúdo `.deco/`.
- Web (`apps/web/`) — Vite + React + shadcn/ui; a view do exame, servida pelo MCP Server como MCP App dentro do Studio. Ainda sem `CONTEXT.md`.

Criar cada `CONTEXT.md` quando a primeira decisão/termo específico daquele contexto for resolvido.

`apps/studio/` é um clone local do repositório open-source do deco Studio, mantido só para consulta — não é um contexto deste projeto.

## Relationships

- **MCP Server → Storefront**: o MCP Server publica sugestões via Task Board; um Super Agent da Studio as transforma em PR real contra o conteúdo do storefront, com aprovação humana antes do merge/deploy (ver `apps/mcp-server/docs/adr/0004-task-board-nao-registry-publish.md`).
