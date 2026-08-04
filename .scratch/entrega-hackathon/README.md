# Entrega hackathon — índice

Tickets derivados de `docs/briefing-consolidado.md` (04/08/2026). Prazo de submissão: **09/08/2026, 23h59**.

O MVP do servidor MCP (4 tools, auth, health, testes, Dockerfile) está em `.scratch/mcp-server-mvp/` e já foi construído. Estes tickets cobrem o que falta para existir projeto.

## Frentes

| # | Ticket | Bloqueado por | Frente |
|---|--------|---------------|--------|
| 01 | Unificar o contrato de catálogo entre geração e simulação | — | número (P0) |
| 02 | ~~Catálogo de demo de áudio publicado na Shopify~~ ✅ | — | número (P0) |
| 03 | Filtro de relevância nas propriedades geradas | 01, 02 | número (P0) |
| 04 | Rodadas antes/depois com metodologia reprodutível | 01, 02, 03 | número (P0) |
| 05 | Item do Task Board nasce atribuído ao super-agent | — | publicação (P0) |
| 06 | Repo do GitHub conectado como projeto no Studio | 05 | publicação (P0) |
| 07 | JSON-LD completo na PDP do storefront | 06 | publicação (P0) |
| 08 | Aterrissagem do dado por produto em metafields | 01 | publicação (P0) |
| 09 | Servidor MCP no ar em `agentscommerce.ollim.dev` | — | infra (P0) |
| 10 | MCP prompts expostos pelo servidor | 09 | P1 |
| 11 | `MCP_CONFIGURATION` com state schema e scopes | 09 | P1 |
| 12 | Geração de conteúdo grounded no brand context | 01 | P1 |
| 13 | Automation com trigger cron | 09, 10 | P1 |
| 14 | MCP App: o que o agente viu vs. o que faltou | 04 | P2 |
| 15 | Pacote de submissão do hackathon | 04, 07, 16 | entrega |
| 16 | Agente no Studio que orquestra as 4 tools | 09 | P0 — faltava no recorte |

## Frentes independentes

Três tickets começam imediatamente e não dependem uns dos outros — **01**, **05** e **09**. Dá para atacar infra (09) e Task Board (05) em paralelo com o loop de prova (01).

O caminho crítico é `01 → 03 → 04 → 15`: sem o número, não há pitch. Com o 02 já feito, **o 01 é o único bloqueio real do número** — assim que ele sai, o 03 destrava.

## Verificação de 04/08/2026

Todos os tickets foram checados contra o estado real (código, loja Shopify, org do Studio). Só o **02** estava feito. O que a varredura confirmou em aberto:

- **01** — `SimulateBuyerAgent` ainda recebe `IReadOnlyList<ProductCatalogContent>`; `ToCandidateProduct` lê só options e metafields.
- **03, 08, 10, 11, 12** — nenhum vestígio no código (sem filtro de relevância, sem escrita de metafield, sem prompts, sem `MCP_CONFIGURATION`, sem brand context).
- **05** — os 2 itens do board estão em `triage` com `assigneeId: null`.
- **06** — nenhuma connection na org aponta para o repo; só as 3 padrão.
- **07** — `apps/storefront/src/` não menciona `additionalProperty`; o único patch é o `@decocms/blocks@7.20.7` herdado do template (a versão instalada é outra).
- **09** — `agentscommerce.ollim.dev` não resolve DNS. O MCP que responde hoje é `localhost:6142`.
- **13** — `AUTOMATION_LIST` devolve vazio.
- **14** — `apps/mcp-app/` é scaffold do template (`hello.ts`), e é um **repo git aninhado** — precisa ser resolvido antes de submeter.
- **16** — a org tem só os 8 agentes do Studio Pack. Não existe agente nosso.

## Regra de corte

Se o P0 escorregar para 07/08, cortar o **14** sem hesitar. Um número limpo com UI feia ganha de uma UI bonita sem número.
