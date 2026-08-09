## O que estamos construindo

Leia `docs/o-que-estamos-construindo.md` antes de propor escopo. Ele é a âncora do
projeto e vence qualquer outro doc em caso de conflito.

Resumo de uma linha, para não derivar: isto é um **test suite de legibilidade
agêntica** — o simulador de agente comprador é o produto, o gerador de conteúdo
otimizado é só o `--fix`. Enriquecer conteúdo para IA é commodity (Adobe Catalog
Agent, PDP Optimizer da Deco); **medir o antes/depois é o diferencial**.

Critério de corte para qualquer ideia nova: *isso fortalece a **medição** ou o
**enriquecimento**?* Se for enriquecimento, corta. O projeto ataca o estágio de
**decisão** do funil (o agente entende e decide comprar), não o de **descoberta**
(o agente acha o produto) — descoberta segue fora de escopo.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `Bruno0M/agents-for-commerce`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

As specs antigas em `.scratch/<feature-slug>/` ficam de pé como histórico; trabalho novo entra no GitHub.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout — a root `CONTEXT-MAP.md` points to per-app `CONTEXT.md` files under `apps/`. See `docs/agents/domain.md`.
