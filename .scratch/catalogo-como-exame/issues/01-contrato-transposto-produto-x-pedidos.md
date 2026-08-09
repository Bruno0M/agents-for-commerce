# 01 — O contrato transposto: o produto como unidade do exame

**What to build:** a função pura que transforma N resultados de simulação (um por pedido
aprovado) em **uma linha por produto do catálogo**, com estado, perda silenciosa e atribuição de
qual pedido produziu cada motivo. É o dado que a tabela inteira consome, e hoje ninguém o produz.

O desencontro está no D5 da spec e vale repetir porque é a razão de este ticket existir antes de
qualquer pixel:

| Contrato | Forma | Quem produz |
| --- | --- | --- |
| `DiagnosisResult` | catálogo × N pedidos → produtos **descartados** | `diagnosis/aggregate.ts` ✅ |
| `ComparisonResult` | **um** pedido → N produtos, com antes/depois | servidor, 1 por pedido |
| o que a tabela precisa | **um produto** → N pedidos | **ninguém** |

`ComparisonResult.naturalLanguageOrder` é singular. O `aggregateDiagnosis` já faz metade do
trabalho — roda todos os pedidos contra o catálogo inteiro e deduplica motivos por (produto,
frase) — mas perde duas coisas que a tabela precisa:

1. **Os produtos que passaram somem.** `discardedProducts` só tem descarte. A tabela é o catálogo
   inteiro; produto que passou é uma linha ✅, não uma ausência.
2. **Não se sabe qual pedido produziu qual motivo.** A dedup por frase colapsa a origem. Sem
   atribuição não existe perda silenciosa (a ordenação do ticket 03) nem drill-down por pedido
   (ticket 05).

**Os quatro estados são derivados, não digitados.** `passed`, `illegible`, `mixed`,
`legitimatelyRejected` saem da natureza dos motivos acumulados, e a natureza vem do `kind` que
nasce em `engine.ts` no ponto de criação do motivo. **Nenhuma linha deste ticket pode inferir
natureza relendo `message`** — é a regra dura do ticket 02 do `exame-guiado`, e este é o primeiro
lugar onde a tentação aparece de verdade.

**Não muda nada no servidor** (§"O que muda no servidor" da spec). Se este ticket concluir que
precisa de campo novo no C#, ele para e o assunto volta para o `exame-guiado`.

O `aggregateDiagnosis` **não é reescrito nem apagado**: a fase 3 do wizard ainda o consome e o
wizard só sai no ticket 08. O caminho barato é o novo agregador chamar o mesmo `evaluateProduct`
/ `toCandidateProduct` de `engine.ts`, e as duas agregações coexistirem até lá.

**Blocked by:** None — construível inteiro sobre `diagnosis/engine.ts` e as fixtures existentes.

**Status:** done

- [x] Existe um tipo de linha por produto cobrindo o catálogo **inteiro**, não só os descartados
- [x] Cada linha carrega um dos quatro estados do D2, derivado da natureza dos motivos
- [x] Cada motivo carrega **quais** pedidos o produziram — a dedup por frase não apaga a origem
- [x] A perda silenciosa (em quantos pedidos o produto foi descartado por ilegibilidade) é campo
      do contrato, não cálculo espalhado na UI
- [x] Produto que passa num pedido e é ilegível noutro tem estado `illegible`, e o teste que
      prova isso existe
- [x] Produto de motivo misto fica fora do número de topo e presente na lista, com os dois
      motivos visíveis — mesma decisão já documentada em `aggregate.ts`
- [x] O agregado de topo (total, ilegíveis, examinado ou não) sai do mesmo contrato que as linhas,
      sem a UI recontar
- [x] Nenhuma camada infere natureza de motivo relendo string, e nenhum teste precisa disso para
      passar
- [x] Nada no servidor muda
- [x] `aggregateDiagnosis` continua funcionando e a fase 3 do wizard continua verde

## Comments

Implementado em `apps/web/src/diagnosis/catalogExam.ts` (função `aggregateCatalogExam`) com os
tipos novos em `apps/web/src/diagnosis/types.ts` (`ProductExamState`, `AttributedUnmetRequirement`,
`ProductExamRow`, `CatalogExamResult`). Testes em `apps/web/src/diagnosis/catalogExam.test.ts`,
mesmo padrão de `aggregate.test.ts` (helpers `product()`/`order()`).

Decisões de modelagem que exigiram escolha (documentadas também no cabeçalho de `catalogExam.ts`):

- **Perda silenciosa é contada por pedido, não pelo acumulado do produto.** Um produto pode ter,
  dentro do MESMO pedido, um motivo de ilegibilidade e um de rejeição legítima simultaneamente
  (ex: sem cor estruturada + preço acima do limite, no mesmo pedido). Nesse caso o pedido não conta
  para `silentLossCount`, porque consertar o conteúdo não recupera aquela venda — o motivo legítimo
  daquele pedido continua de pé. O critério é o mesmo do estado `illegible` (todos os motivos
  precisam ser `illegibility`), só que aplicado pedido a pedido em vez de sobre o acumulado do
  produto. Isso significa que um produto `mixed` ainda pode ter `silentLossCount > 0` — ele só fica
  fora de `illegibleProductCount` porque, no acumulado, sobra pelo menos um motivo de rejeição
  legítima em algum pedido.
- **`examined: boolean`** foi o campo escolhido para a distinção "examinado / não examinado" do D1
  (em vez de, por exemplo, um union type `"not-run" | "run"`), porque é derivável de forma trivial
  (`orders.length > 0`) e o contrato só precisa expor o resultado já calculado para a UI não
  reimplementar a checagem — não há estado adicional para modelar.
- **A ordem das `rows` segue a ordem do `catalog` de entrada.** A ordenação por perda silenciosa
  (D4) é responsabilidade explícita de quem consome este contrato (ticket 03), não deste
  agregador — documentado no tipo `CatalogExamResult.rows`.
- **Nada ficou de fora do ticket.** Não houve bloqueio de servidor: a agregação é só aritmética
  sobre `evaluateProduct`/`toCandidateProduct`, que já existiam. `aggregateDiagnosis` não foi
  tocado.
