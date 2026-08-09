# 03 — Ranking por perda silenciosa e filtros

**What to build:** a ordenação e os filtros que respondem a pergunta operacional do lojista —
**por qual produto eu começo?** — e que fazem a tabela sobreviver a um catálogo de 400 linhas.

Este é o ticket que conserta o defeito 2 do Problem Statement. A fase 3 do wizard empilha um
cartão por produto descartado; com o catálogo de demo funciona, com a loja real vira rolagem sem
resposta. Uma lista de 180 problemas sem ordem é equivalente a nenhum diagnóstico.

**A ordenação padrão é declarada, não alfabética:**

1. **Perda silenciosa** — em quantos dos pedidos aprovados o produto foi descartado por
   ilegibilidade. É a promessa da ferramenta expressa por linha: *quantas vendas este produto
   está perdendo sem ninguém saber*. O campo vem pronto do ticket 01.
2. **Consertabilidade** — desempate. Quando o `descriptionExcerpt` existir (ticket 08 do
   `exame-guiado`), o produto cuja informação **já está na prosa** vem primeiro: conserto de alta
   confiança, e é a prova de que o produto nunca foi ruim, só ilegível. Enquanto aquele ticket
   estiver aberto, o desempate degrada para **menor número de motivos distintos de ilegibilidade**
   — menos campos faltando, conserto mais barato. A degradação é deliberada e precisa estar no
   código como decisão, não como acidente.

Ordenar por "pior produto" seria a escolha intuitiva e é a errada: ela põe no topo o produto que
nenhum pedido testou a fundo. **Ordena-se por retorno do conserto.** Efeito colateral que vale
registrar: com essa ordem, as cinco primeiras linhas **são** o pitch — a demo não precisa de
curadoria manual.

**Os filtros mínimos:** por estado (os quatro do D2), por pedido (só o que o pedido X descartou —
é o que torna o par A/B do `catalogo-demo` visível: o mesmo produto ✅ num pedido e ⭕ noutro), e
busca por título/handle. Filtro por tipo de produto entra se for barato; não é o que este ticket
existe para provar.

**Um invariante que nenhum filtro pode quebrar:** a faixa de placar continua falando da **loja
inteira**. Filtrar a tabela não pode mexer no número de topo — a pergunta do lojista é "quantos
produtos meus são invisíveis", não "quantos dos que estou olhando agora". Se o recorte precisar de
número, ele é o segundo número, nunca o primeiro. (Mesma regra que o ticket 11 do `exame-guiado`
já fixa para o recorte do que mudou.)

**Blocked by:** 02

**Status:** done

- [x] A ordenação padrão é perda silenciosa decrescente, e o critério está visível na tela — não
      só no código
- [x] O desempate por consertabilidade existe, com a degradação documentada para enquanto o
      ticket 08 do `exame-guiado` estiver aberto
- [x] A ordenação é determinística e tem teste de ordem sobre um conjunto conhecido de linhas
- [x] Dá para filtrar por cada um dos quatro estados
- [x] Dá para filtrar por pedido, e o par A/B (mesmo produto ✅ num pedido, ⭕ noutro) fica
      demonstrável por essa via
- [x] Existe busca por título/handle
- [x] Filtrar ou ordenar **não** altera o número da faixa de placar
- [x] O estado vazio de um filtro diz o que foi filtrado — não é a mesma tela do catálogo vazio
- [x] A tabela continua legível e usável com um catálogo grande (ordenação e filtro no cliente
      são aceitáveis; paginação não é requisito deste ticket)

## Comments

**Arquivos novos:**

- `diagnosis/lib/rankCatalogExamRows.ts` (+ `.test.ts`) — `sortCatalogExamRows`, a ordenação pura
  (perda silenciosa desc · menos motivos de ilegibilidade · título · productId), e
  `CATALOG_EXAM_SORT_DESCRIPTION`, o texto que a UI mostra em voz alta (fonte única — texto e
  comportamento nunca divergem).
- `diagnosis/lib/filterCatalogExamRows.ts` (+ `.test.ts`) — `filterCatalogExamRows`,
  `CatalogExamRowFilters`, `DEFAULT_CATALOG_EXAM_ROW_FILTERS`, `catalogExamRowFiltersAreDefault`.
- `diagnosis/lib/deriveRowForOrder.ts` (+ `.test.ts`) — a derivação do veredito por pedido isolado
  (decisão do filtro por pedido, ver abaixo).
- `diagnosis/lib/examStateLabels.ts` — `EXAM_STATE_LABELS` extraído de `ExamStateBadge.tsx` para
  módulo próprio (badge e dropdown de filtro precisam do mesmo texto; deixá-lo dentro do arquivo
  do componente quebra `react-refresh/only-export-components`, o mesmo padrão que já explica o
  erro pré-existente em `components/ui/*`).
- `diagnosis/components/CatalogExamControls.tsx` — os três controles (estado, pedido, busca) mais
  o critério de ordenação e "mostrando X de Y" (o segundo número).

**Arquivos alterados:**

- `diagnosis/catalogExam.ts` — `deriveProductExamState` passou a ser exportada, para
  `deriveRowForOrder` reusar a MESMA função que a agregação usa (nunca uma cópia).
- `diagnosis/components/ExamStateBadge.tsx` — `EXAM_STATE_LABELS` movida para
  `diagnosis/lib/examStateLabels.ts` (ver acima); o componente só importa de volta.
- `components/catalog-page.tsx` — liga tudo: estado de filtros (`useState`, sem `useEffect`),
  `sortCatalogExamRows` + `filterCatalogExamRows` derivados durante o render, tabela com 7
  colunas (ver decisão de colunas abaixo), estado vazio de filtro dedicado, botão "Limpar
  filtros" e reset de filtros no `toggleFixtureMode`.
- `components/catalog-page.test.tsx` — 14 testes novos de UI (ordem visível, invariante do
  placar, quatro filtros de estado, busca por título/handle, par A/B por pedido, estado vazio de
  filtro ≠ estado vazio de catálogo, limpar filtros).

**Decisão: filtro por pedido — escolhi (b), o veredito exibido é o do pedido isolado.**
`ProductExamRow.state` é agregado por construção; um filtro que promete "só o que o pedido X
descartou" mas continua mostrando o badge agregado mentiria sempre que o produto for `mixed` na
agregação mas, isolado naquele pedido, só tiver motivos de uma natureza — a tela diria "confirmou
em parte" numa vista que promete falar só do pedido X. `deriveRowForOrder(row, orderId)` reusa
`deriveProductExamState` (agora exportada de `catalogExam.ts`) sobre os motivos filtrados por
`orderIds.includes(orderId)`; devolve `null` quando o pedido não produziu motivo nenhum (o
produto passou naquele pedido), e `filterCatalogExamRows` exclui esses `null`, honrando "só o que
o pedido X descartou" (a frase do próprio ticket). É o que torna o par A/B demonstrável: Fone
Nebula Pro (fixture `loja-real-sem-gabarito`) some do filtro `pedido-fone-completo` (✅, confirmou
tudo) e aparece como "Não atende" no filtro `pedido-fone-viagem` (⭕, preço acima do limite) — os
dois lados do par, cobertos em teste puro (`deriveRowForOrder.test.ts`,
`filterCatalogExamRows.test.ts`) e em teste de UI (`catalog-page.test.tsx`).

**Degradação do desempate — onde está registrada.** O comentário de topo de
`rankCatalogExamRows.ts` documenta as três camadas do critério e nomeia a degradação
explicitamente: o critério real seria `descriptionExcerpt` (produto cuja informação já está na
prosa vem primeiro), mas o ticket 08 do `exame-guiado`
(`.scratch/exame-guiado/issues/08-evidencia-estruturada-source-e-excerto.md`) segue com
`Status: ready-for-agent` — aberto — e hoje `descriptionExcerpt` só existe em
`comparison/types.ts`, nunca chegou a `ProductExamRow`. Enquanto isso, o desempate usa menor
número de motivos DISTINTOS DE ILEGIBILIDADE (não motivos totais — testado explicitamente em
`rankCatalogExamRows.test.ts`, caso "motivos de rejeição legítima não contam para o desempate").

**Colunas cortadas: Schema.org e Variantes.** A tabela tinha 8 colunas antes deste ticket; a
"perda silenciosa" (critério de ordenação padrão) precisa ser visível na linha, e os três
controles novos já competem por espaço acima da tabela. Cortei "Schema.org" (o flag de JSON-LD
presente/ausente é ortogonal ao exame do agente comprador — este ticket lê atributos
estruturados de opção/metafield/tipo/descrição, nunca o schema.org markup) e "Variantes"
(contagem que não participa da narrativa do exame). Ficaram 7: Produto, Perdido em, O robô
conseguiu avaliar?, Motivo, Vendor, Tipo, Preço — front-loading as quatro colunas do exame (mais
perto do diagrama da spec: produto/estado/perdido-em/motivo) com Vendor/Tipo/Preço como contexto
de reconhecimento do SKU.

**O que ficou de fora (fora de escopo, por decisão do ticket):** filtro por tipo de produto (o
ticket permite só "se sair de graça" — não implementado, para não ganhar escopo não pedido);
paginação/virtualização; drill-down por linha (ticket 05); qualquer ação de conserto (ticket 06).

**Onde hesitei:** se o "Perdido em" deveria recalcular ao filtrar por pedido (mostrar só a perda
daquele pedido, 0 ou 1, em vez do agregado). Decidi manter o agregado (perda silenciosa da loja
inteira para aquele produto) mesmo sob filtro de pedido — é uma métrica de produto, não de
pedido, e só o veredito (`state`/`reasons`) precisava da relativização por pedido para não
mentir. Documentado no comentário de `filterCatalogExamRows.ts` e no relatório da tarefa.
