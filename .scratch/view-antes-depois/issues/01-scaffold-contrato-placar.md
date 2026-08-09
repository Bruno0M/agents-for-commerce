# 01 — Scaffold, contrato e o placar

**What to build:** o app existe e mostra o número. Rodando `dev` em `apps/comparison-view/`,
a página abre com o pedido em linguagem natural em destaque, os requisitos que o agente
comprador extraiu daquele pedido como chips, e o placar da rodada: taxa de sucesso antes,
depois, e o delta como o elemento tipograficamente dominante da página. Abaixo do número, o
produto que o agente escolheu em cada rodada — incluindo "nenhum", que é o caso mais forte.

Este ticket também estabelece as duas fundações que todos os outros usam: o **contrato de
dados** que a tela consome e a **primeira fixture** que o preenche.

O contrato é um espelho enriquecido do `BeforeAfterComparisonResult` que o servidor .NET
devolve hoje, com duas diferenças deliberadas registradas na spec: evidência estruturada por
requisito em vez de frases prontas, e `before`/`after` aninhados em vez de campos achatados
com sufixo. A forma exata está na spec — vale copiar de lá, não reinventar:

```ts
type RequirementEvidence = {
  requirement: string;
  expected: string;
  confirmed: boolean;
  foundValue: string | null;
  source: "option" | "metafield" | "generated" | "productType" | "price" | null;
  message: string;
};
```

O preço entra como mais um `RequirementEvidence` (`requirement: "Preço"`, `source: "price"`)
para a grade da 02 ter colunas homogêneas.

A fixture `pedidoA-delta-positivo` é o cenário do pitch, construída à mão a partir do catálogo
de demo: 7 produtos, 3 candidatos legítimos que reprovam antes e passam depois, 4 controles
rejeitados nas duas rodadas.

Stack fixada pela spec: React 19 + TypeScript + Vite, Tailwind v4 via `@import "tailwindcss"`
sem arquivo de config, Vitest + Testing Library. Sem router, sem gerenciador de estado, sem
nenhuma dependência de rede, fonte externa ou CDN — o hábito de manter tudo local é o que
evita retrabalho quando a CSP do ticket 14 chegar.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `apps/comparison-view/` roda com `dev` e mostra a tela, sem nenhuma requisição de rede
- [x] O contrato `ComparisonResult` está tipado conforme a spec, com evidência estruturada por requisito
- [x] A fixture `pedidoA-delta-positivo` existe, tipada contra o contrato, com os 7 produtos do catálogo de demo
- [x] O cabeçalho mostra o pedido em linguagem natural, os requisitos extraídos como chips e o limite de preço
- [x] O placar mostra as duas taxas como fração, o delta em destaque, e o produto escolhido em cada rodada
- [x] Um teste renderiza o componente de topo com a fixture e afirma que o delta e as duas taxas aparecem

## Comments

Implementado. `apps/comparison-view/` scaffolded com Vite (react-ts) + Tailwind v4
(`@import "tailwindcss"`, sem config file) + Vitest + Testing Library. Contrato em
`src/types.ts`, fixture em `src/fixtures/pedidoA-delta-positivo.ts` construída à mão a
partir de `.scratch/catalogo-demo/{comparison-pedido-a.json,catalog-antes.json}` — os 3
candidatos legítimos (Aurora NC7, Vetor Studio One, Halo Air Pro) reprovam antes e passam
depois, os 4 controles (Corvo Sport 2, Orbe Link 4, Nimbo Mini, Vetor Reference 900) são
rejeitados nas duas rodadas. `source: "generated"` usado para valores confirmados via
descrição/conteúdo gerado (Cancelamento de ruído, Bateria), `"productType"` e `"price"`
para os dados nativos do catálogo — nenhum vem de `"option"`/`"metafield"` nesta fixture,
o que é esperado dado que o catálogo de demo não tem metafields hoje.
Componente de topo `ComparisonView` (cabeçalho + placar apenas — grade e drill-down ficam
para as tickets 02/03) renderizado e verificado visualmente via PinchTab; `bun run test` e
`bun run build` passam.
