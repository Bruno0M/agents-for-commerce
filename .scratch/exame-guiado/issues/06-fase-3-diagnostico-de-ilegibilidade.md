# 04 — Fase 3: diagnóstico de ilegibilidade

**What to build:** a tela que faz a ferramenta existir. O lojista, com o catálogo já lido na
fase 1, roda o exame contra a loja **como ela está hoje** — sem nenhuma geração de conteúdo — e
vê a resposta que dá o gancho inteiro: **"N produtos o agente nem conseguiu avaliar. Olha o
motivo."** Com o produto, e com a frase exata.

Esta é a fase que carrega o produto, e a regra que ordena todo o fluxo está aqui: **a primeira
coisa que o lojista vê é uma rejeição, não uma sugestão.** Nenhuma chamada de
`generate_optimized_content` acontece nesta tela. O fluxo intuitivo — gerar, e depois medir
para confirmar o que já foi feito — é a forma do Adobe Catalog Agent, e inverter isso é a
diferença entre a ferramenta se apresentar como instrumento de medição ou como mais um gerador
de conteúdo que também mede.

**Os pedidos entram digitados à mão neste ticket.** O gerador é o ticket 03 e a tela de revisão
é o 07; nenhum dos dois bloqueia este. Isso é deliberado: a spec afirma que a fase 3 é
entregável sozinha, e este ticket é onde essa afirmação se prova. Se o tempo acabar aqui, o que
foi entregue ainda é o exame — que é o produto.

A métrica de topo é a **contagem de produtos que o agente não conseguiu avaliar**, e a meta é
zero. O percentual de classificação correta **não aparece em primeiro plano**: ele depende de
`expectedOutcomes`, que numa loja real não existe. Ele continua existindo como métrica
secundária e só quando há gabarito — ou seja, na demo curada.

A agregação por natureza de motivo é aritmética sobre o tipo que o ticket 02 produz. Ela não
volta a ler frase nenhuma.

**Blocked by:** 02, 05

**Status:** done

- [x] Com um ou mais pedidos digitados, a tela roda a simulação contra o catálogo cru e mostra
      a contagem de produtos que o agente não conseguiu avaliar como número de topo
- [x] Nenhuma chamada de geração de conteúdo acontece nesta fase
- [x] Cada produto descartado aparece com a frase exata do motivo e com a natureza dele
      (ilegibilidade vs. rejeição legítima) visualmente distinguível
- [x] Rejeição legítima não é contada como falha da loja — a distinção fica clara na tela, não
      só no dado
- [x] Com vários pedidos, a contagem agrega sem contar o mesmo produto duas vezes pelo mesmo
      motivo
- [x] O percentual de classificação correta não aparece em primeiro plano; quando não há
      gabarito, ele não aparece de forma alguma — e a ausência é explícita, não um zero
- [x] Existe uma fixture nova de **loja real sem gabarito** (nenhum `expectedOutcomes`), e a
      tela é desenvolvível e testável inteira contra ela
- [x] A agregação por natureza de motivo tem teste, e nenhuma camada da UI infere natureza
      relendo string

## Comments

**Esta tela assume catálogo estático, e ele não é.** No instante em que o lojista sobe um produto
novo, o número aqui fica errado e nada na tela diz isso — não há data nem escopo da medição. O
ticket 11 é dono do modelo (passada / linha de base) e do estado por produto (novo / alterado /
inalterado); o que cai **nesta** tela é consumo daquele estado: marcação dos produtos que
mudaram, filtro "só o que mudou", e regressão — produto que passava antes e não passa agora —
como estado visível.

Regra que não muda com isso: a métrica de topo continua sendo a da **loja inteira**. A pergunta
do lojista é "quantos produtos meus são invisíveis", não "quantos dos que subi ontem". O recorte
do que mudou é o segundo número.

**Implementado.** Novo módulo `apps/web/src/diagnosis/` (mesmo padrão de `comparison/`:
`types.ts`, engine puro, `lib/`, `components/`, `fixtures/`, testes co-localizados):

- `types.ts` — `DiagnosisResult`, `DiscardedProduct`, `HandwrittenOrder` etc. `flow-state.ts`
  reexporta `DiagnosisResult` daqui (mesmo padrão que já usava para `ComparisonResult`).
- `engine.ts` — porta em TypeScript da etapa 1 (filtragem à risca) de
  `BuyerAgentDecisionEngine.EvaluateProduct` e de `BuyerAgentSimulatorTools.ToCandidateProduct`
  (mcp-server): mesmas frases, mesma atribuição de `kind` no ponto de criação do motivo, zero
  rede. `engine.test.ts` cobre os sete motivos da tabela do D3/ticket 02.
- `aggregate.ts` — `aggregateDiagnosis(catalog, orders)`, com as duas decisões de modelagem que
  este ticket deixava em aberto resolvidas e documentadas em comentário no próprio arquivo:
  dedup por (produto, motivo) via a frase (`message`) como chave, e produto de motivo misto
  (ilegibilidade + rejeição legítima) fora de `illegibleProductCount` mas presente em
  `discardedProducts` com `onlyIllegibilityReasons: false`. Testado em `aggregate.test.ts`.
- `fixtures/loja-real-sem-gabarito.ts` — a fixture pedida pelo critério de aceite: catálogo de
  7 produtos sem `expectedOutcomes`, cobrindo os três estados de descarte mais o controle
  "nunca aparece" (produto que confirma tudo). Verificada em `loja-real-sem-gabarito.test.ts`.
- `wizard/phases/PhaseDiagnostico.tsx` deixou de ser placeholder: formulário para digitar
  pedido(s) já como requisito estruturado (nome + valor esperado, mínimo numérico, preço
  máximo — ver comentário em `types.ts` sobre por que "digitado à mão" neste ticket não passa
  por extração de linguagem natural, que exigiria uma chamada de IA sem transporte disponível),
  botão "Rodar diagnóstico" que chama `aggregateDiagnosis` contra `catalog.products`, e a tela
  de resultado com a métrica de topo, o escopo (loja inteira, N pedidos) e os produtos
  descartados agrupados visualmente em ilegibilidade pura / motivo misto / rejeição legítima
  pura — cada motivo com a frase exata e um badge de natureza (`NatureBadge`, âmbar para
  ilegibilidade, neutro para rejeição legítima). Testado em `PhaseDiagnostico.test.tsx`, contra
  a fixture nova e contra um catálogo cru simples, incluindo uma checagem de que `fetch` nunca é
  chamado nesta fase.
- `wizard/ExamWizard.tsx` passa `state.catalog` para `PhaseDiagnostico` (prop nova; a fase
  precisa do catálogo cru para simular). `approvedOrders` continua chegando só leitura (D4).

Fora do escopo do ticket, mas corrigido porque bloqueava `npm run build` (`tsc -b`): um prop
`nativeButton` inválido para a versão instalada de `@base-ui/react` em
`PhaseDefinirExame.tsx:122` (ticket 07) — removido, comportamento preservado.
