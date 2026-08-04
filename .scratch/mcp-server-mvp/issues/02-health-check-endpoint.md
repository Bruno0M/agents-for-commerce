# 02 — Health check endpoint

**What to build:** um endpoint leve `GET /health`, fora do path do MCP e fora da exigência de Bearer token (ticket 01), que responde 200 quando o processo está de pé — sem depender de nenhuma integração externa (Shopify, AI Gateway, Studio) estar disponível. Vai ser usado pelo `healthcheck` do Docker Compose (ticket 08) para travar o deploy até o serviço subir de verdade.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `GET /health` retorna 200 com o serviço rodando normalmente
- [x] `/health` não exige Bearer token
- [x] `/health` não faz chamada a nenhum serviço externo (Shopify, AI Gateway, Task Board)
