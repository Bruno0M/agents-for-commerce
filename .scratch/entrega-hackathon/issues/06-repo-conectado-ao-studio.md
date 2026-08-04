# 06 — Repo do GitHub conectado como projeto no Studio

**What to build:** sem o repositório conectado como projeto na org `bruno-feijoada`, o item do Task Board avança até review e para — nunca vira PR. Depois deste ticket, a cadeia completa roda ponta a ponta: sugestão publicada → super-agent edita o repo → PR aberto com preview → review (qa / code_review) → promoção para produção faz o merge.

É esse caminho que dá o momento de aprovação humana do vídeo, e ele precisa estar demonstrável em uma passada só.

**Blocked by:** 05.

**Status:** in-progress (aguardando revisão humana — ver comentários)

- [x] O repositório `Bruno0M/agents-for-commerce` está conectado como projeto na org do Studio
- [x] Um item criado por `publish_suggestion` chega a abrir um PR de verdade no repo
- [ ] O ciclo de review é exercitado nas duas direções: pedir mudanças devolve ao agente, e aprovar libera o merge
- [ ] O caminho inteiro (publicar → PR → aprovar → merge) foi percorrido pelo menos uma vez e está registrado nos comentários deste ticket

## Comments

**04/08/2026 — cadeia publicar → PR percorrida ao vivo.**

Pré-requisitos resolvidos antes da validação: o repo foi importado como **code agent**
(Agents → "Importar do GitHub"), não como Connection — em Studio, um repositório é o campo
`githubRepo` na metadata de um virtual MCP, e Connections só provê a autenticação. O sandbox
subiu com Package manager `bun` **fixado explicitamente**: o auto-detect sonda apenas a raiz
do repositório e este é um monorepo sem lockfile na raiz, então a detecção retornava null e o
sandbox era provisionado clone-only ("no install, no dev server"). Env vars `DECO_SITE_NAME`,
`DECO_ENV_NAME` e `SHOPIFY_STOREFRONT_TOKEN` injetadas no start (o `.env` do storefront é
gitignored e não vai no clone).

Fluxo real, com o **Corvo Sport 2** do catálogo de demo (não o snowboard de seed):
`get_product_content` → `generate_optimized_content` → `publish_suggestion`.

Item **`board_1ysxm0Qc9orlvJdggbVNo`**, transições observadas em `TASK_BOARD_ACTIVITY_LIST`:

| Quando | Transição | Ator |
|---|---|---|
| 23:53:32 | `created` (status `todo`, `assigneeId: super-agent`) | usuário |
| 23:53:33 | `todo → in_progress` | `null` (Super Agent) |
| 23:56:14 | `in_progress → in_review` | `null` (Super Agent) |

PR aberto no mesmo instante do `in_review`: **[#1](https://github.com/Bruno0M/agents-for-commerce/pull/1)**,
branch `geo/pdp-corvo-sport-2`, `+79/-0` em 1 arquivo
(`.scratch/catalogo-demo/suggestions/corvo-sport-2.md`), `MERGEABLE`, sem checks.

Diff conferido antes de qualquer decisão de review: é puramente aditivo, não toca código, cita
a ADR 0004, referencia o produto 4 do spec do catálogo (o controle deliberado de ANC) e defere
explicitamente a aplicação em produção para o ticket 08. Nenhum fato inventado — a descrição
extrai só o que já estava na prosa original.

**Por que os critérios 3 e 4 continuam abertos.** `TASK_BOARD_REVIEW_DECISION` exige um
`reviewToken` entregue no prompt do reviewer (`qa` ou `code_review`); a própria descrição da
tool diz que uma aprovação sem token válido "é registrada mas NÃO conta para o merge
automático". Não há como um agente externo aprovar de forma legítima — a aprovação real é do
humano, pela UI. Isso é coerente com o desenho da plataforma: `TASK_BOARD_REVIEW_DECISION` e
`TASK_BOARD_PROMOTE_TO_PRODUCTION` são **deliberadamente removidos** do conjunto de tools
exposto à run do agente, com o motivo escrito no código-fonte da Studio: *"an agent must not
approve or merge its own work"*. O merge do PR #1 fica com o revisor humano.

**Ressalva no conteúdo do PR (não bloqueia):** o arquivo gerado se intitula "Conteúdo
otimizado **aprovado**" e marca `[x] Aprovação humana e materialização em PR real` — mas a
aprovação humana ainda não aconteceu no momento em que o PR foi aberto. É o agente
pré-marcando o próprio checkbox. Vale corrigir o texto antes de mergear, ou aceitar como
impreciso.
