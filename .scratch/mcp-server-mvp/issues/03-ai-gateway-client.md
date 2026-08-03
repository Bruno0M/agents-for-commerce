# 03 — Cliente do AI Gateway da Deco + smoke test de conectividade

**What to build:** um serviço/cliente HTTP fino que chama o AI Gateway da Deco (org `bruno-feijoada`) usando uma key provisionada e configurada via variável de ambiente. O objetivo central deste ticket é confirmar na prática o formato exato do endpoint (compatível OpenAI/Anthropic) e do request/response — hoje esse formato é um item em aberto na decisão de arquitetura. O resultado é um cliente reutilizável que as tools de geração de conteúdo (ticket 05) e simulação de comprador (ticket 06) vão chamar.

**Blocked by:** None — can start immediately

**Status:** done

- [x] Key do AI Gateway provisionada (via API da Studio) e configurada como secret/env var no servidor
- [x] Cliente faz uma chamada real de completion contra o AI Gateway e recebe resposta válida
- [x] Formato de request/response documentado no código (shape confirmado, não mais suposto)
- [x] Erros da API (rate limit, key inválida, etc.) tratados sem derrubar o processo

**Notas de implementação (descobertas ao vivo, não estavam na decisão de arquitetura original):**

- O endpoint real **não** é uma chamada direta ao vendor do modelo (OpenAI/Anthropic/OpenRouter). É um proxy hospedado pela própria Studio: `POST https://studio.decocms.com/api/{org}/v1/chat/completions` (fonte: `decocms/studio`, `apps/api/src/api/routes/openai-compat.ts`).
- A auth é uma **API key da Studio** (`Authorization: Bearer`, criada via `API_KEY_CREATE`/management tools) — **não** a key gerenciada do "Deco AI Gateway" que aparece em Settings → AI Providers. Essa última fica encriptada no vault da Studio e nunca é exposta por API ou UI, por design (confirmado na doc oficial: "It's stored encrypted and never exposed to your team").
- Model IDs usam o formato `"provider/model"` (ex: `anthropic/claude-sonnet-5`). Sem prefixo `credential_id:`, a requisição roteia para a key padrão (primeira) configurada na org — que é o Deco AI Gateway, já que é a única key configurada em `bruno-feijoada`.
- Confirmado ao vivo (2026-08-03) com uma API key dedicada (`mcp-server-ai-gateway`, permissão mínima `{"self": ["ORGANIZATION_GET"]}`): request/response 200 real, e também o shape de erro (`{"error":{"message","type","param","code"}}`) para 401 (key inválida) e 400 (payload inválido).
- Pegadinha real encontrada rodando o cliente compilado (não só via curl): o schema da Studio usa Zod `.optional()`, não `.nullable()` — mandar `"max_tokens": null` explícito (comportamento padrão do `System.Text.Json`) retorna 400. O cliente usa `JsonIgnoreCondition.WhenWritingNull` pra sempre omitir campos opcionais não setados.
