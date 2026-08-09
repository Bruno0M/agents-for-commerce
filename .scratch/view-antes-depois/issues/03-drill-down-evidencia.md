# 03 — Drill-down de evidência

**What to build:** a resposta à terceira pergunta — *como sei que isso não é mentira?* Clicar
numa linha da grade expande um painel logo abaixo dela, sem sair da página e sem navegação.

Para cada requisito obrigatório, o painel mostra três colunas:

1. **O que o agente comprador procurou** — nome do requisito e valor esperado.
2. **O que a loja tinha antes** — o valor encontrado e a origem do dado, ou a ausência
   declarada explicitamente. "Não achei" e "achei e não confirma" são estados diferentes e
   precisam se distinguir: são dois consertos diferentes para o lojista.
3. **O que a loja tinha depois** — o mesmo, na rodada otimizada.

A origem do dado aparece rotulada em linguagem de gente — opção de variante, metafield, tipo
de produto, extraído da descrição — porque é o que diz ao lojista *onde preencher*.

Quando o produto tem `descriptionExcerpt`, ele aparece com o trecho relevante destacado, sob
um rótulo que diz o que aquilo significa: a informação estava lá o tempo todo, escrita em
prosa, e a máquina não teve como confirmá-la. É a imagem do currículo descartado de
`docs/o-que-estamos-construindo.md` §2, e é o elemento que separa esta tela de um dashboard.

O único estado que este ticket introduz é qual linha está expandida.

**Blocked by:** 02

**Status:** done

- [x] Clicar numa linha da grade expande um painel de evidência abaixo dela, sem navegação
- [x] O painel mostra, por requisito, o que foi procurado, o que havia antes e o que havia depois
- [x] "Nenhum dado encontrado" e "dado encontrado que não confirma" são visualmente distintos
- [x] A origem de cada dado confirmado aparece rotulada em linguagem não-técnica
- [x] Quando existe trecho da descrição, ele é exibido com o destaque e o rótulo que explicam o que ele prova
- [x] Teste: expandir uma linha revela o valor encontrado e a origem do dado daquele produto

## Comments

Implementado. Módulo puro `src/lib/grid.ts` ganhou `evidenceState` (`confirmed` |
`notFound` | `foundNotConfirmed`, lendo `confirmed` e a nulidade de `foundValue` — a
distinção que separa "não achei" de "achei e não confirma") e `findEvidence`, promovido de
`RequirementsGrid.tsx` para ser compartilhado com o novo painel.

Componente `EvidencePanel` (novo) renderiza a evidência de um produto: uma linha por
requisito com três colunas — o que foi procurado (nome + esperado), antes e depois. Cada
célula usa `evidenceState` para escolher um dos três estilos (`confirmed` verde,
`foundNotConfirmed` âmbar, `notFound` cinza tracejado) e rótulo de origem em linguagem de
gente via `SOURCE_LABELS` (`option` → "opção de variante", `metafield` → "metafield",
`generated` → "extraído da descrição", `productType` → "tipo de produto", `price` →
"preço"). Quando `descriptionExcerpt` existe, aparece uma vez por produto (não por
requisito — a origem exata dentro do texto não é rastreável de forma confiável) como bloco
destacado com `<mark>`, sob o rótulo que explica que a informação já estava em prosa e a
máquina não teve como confirmar.

`RequirementsGrid` ganhou o único estado novo do ticket — `expandedProductId` via
`useState`, alternando ao clicar num `<button>` dentro do `<th scope="row">` (acessível via
teclado, com `aria-expanded`/`aria-controls`). A expansão insere uma `<tr>` extra logo
abaixo da linha do produto, com `colSpan` cobrindo todas as colunas — sem router, sem sair
da página.

Testado em `grid.test.ts` (os três estados de `evidenceState`, isolados de React) e em
`ComparisonView.test.tsx` no seam de topo: expandir revela o painel sem navegação, mostra
valor encontrado e origem em linguagem não-técnica, distingue visualmente "Nenhum dado
encontrado" de "Dado encontrado, não confirma" (usando os dois casos do Corvo Sport 2 —
controle sem dado antes, com dado que não confirma depois) e exibe o trecho da descrição
com o rótulo. Confirmado visualmente via PinchTab: clique expande o painel com as três
colunas, os dois estados de ausência de dado ficam distintos, e o trecho da descrição
aparece destacado com o rótulo. `bun run test`, `bun run lint` e `bun run build` passam.
