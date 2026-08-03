# 01 — Bearer token auth middleware

**What to build:** um middleware ASP.NET Core no servidor MCP que exige `Authorization: Bearer <token>` em toda requisição, validando contra um secret lido de variável de ambiente. Requisições sem o header, ou com token incorreto, recebem `401 Unauthorized` antes de qualquer lógica de MCP rodar. O endpoint de health check (ticket 02) fica fora dessa exigência.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Requisição ao endpoint MCP sem `Authorization` header retorna 401
- [x] Requisição com Bearer token incorreto retorna 401
- [x] Requisição com Bearer token correto (lido de env var) passa e chega na lógica de MCP normalmente
- [x] Token nunca aparece em log
