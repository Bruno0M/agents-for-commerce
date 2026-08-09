# 08 — Aposentar o wizard

**What to build:** remover o `ExamWizard` como navegação, agora que cada uma das cinco fases tem
substituto funcionando na tabela. O app passa a ter uma superfície só.

**Este ticket é o último de propósito.** Apagar navegação antes de o substituto existir troca uma
tela imperfeita por nenhuma. Cada critério abaixo só pode ser marcado com o ticket correspondente
desta spec entregue:

| Fase | Substituto | Ticket |
| --- | --- | --- |
| 1 Conectar | estado vazio da tabela + rótulo da loja | 02 |
| 2 Definir o exame | faixa do exame + sheet | 04 |
| 3 Diagnóstico | colunas + placar + ordenação | 02, 03 |
| 4 Conserto e delta | seleção em lote + drill-down | 05, 06 |
| 5 Enviar para aprovação | ação e estado por linha | 07 |

**O que sai:** `wizard/ExamWizard.tsx`, `wizard/WizardStepper.tsx`, `wizard/flow-state.ts`, as
cinco `wizard/phases/*`, e a escolha de destino em `App.tsx` (`destination === "wizard"`) junto
com a entrada correspondente na `app-sidebar`.

**O que fica, e não pode ser levado junto por engano:**

- `diagnosis/engine.ts`, `diagnosis/aggregate.ts`, `diagnosis/types.ts` e seus testes — é a
  porta em TypeScript do `BuyerAgentDecisionEngine` e é o motor do exame, não parte do wizard.
- `diagnosis/fixtures/loja-real-sem-gabarito.ts` — fixture de desenvolvimento padrão da tabela.
- `diagnosis/components/OrderEditor.tsx` — hospedado pelo sheet do ticket 04.
- `diagnosis/components/NatureBadge.tsx` — a distinção de natureza continua na coluna.
- Todo o módulo `comparison/` — `ComparisonView` continua função pura e continua servindo a view
  do Studio (ticket 14 da `entrega-hackathon`).

`aggregateDiagnosis` pode ser removido **se e somente se** nenhum caminho vivo o consumir depois
da remoção do wizard; ele coexiste com o agregador do ticket 01 justamente até aqui. Se ainda
houver consumidor, ele fica — e o ticket não força a unificação na véspera.

**A verificação que importa não é o build passar.** É a view do Studio continuar renderizando sem
nenhuma mudança e sem nenhuma chamada de rede: a regra que o D7 do `exame-guiado` protegia
sobreviveu à mudança de forma porque a fronteira sempre foi orquestração vs. renderização, e este
é o ticket onde essa afirmação é testada de verdade.

**Blocked by:** 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] `ExamWizard`, o stepper, o `flow-state` e as cinco fases saíram do app
- [ ] `App.tsx` e a sidebar não oferecem mais o destino "Exame guiado"
- [ ] `diagnosis/engine.ts`, `aggregate.ts`, `types.ts`, a fixture de loja sem gabarito, o
      `OrderEditor` e o `NatureBadge` continuam no repo e em uso
- [ ] O módulo `comparison/` não foi tocado; `ComparisonView` continua puro e sem rede
- [ ] A view do Studio renderiza igual, sob CSP `connect-src 'none'`, sem nenhuma mudança
- [ ] Nenhum teste foi apagado sem substituto — cobertura que existia sobre o engine e a
      agregação continua existindo
- [ ] `npm run build` e a suíte passam
- [ ] Nenhum caminho da tabela regrediu para depender de código do wizard

## Comments

**Nota de reconciliação (09/08/2026):** a linha "2 Definir o exame | faixa do exame + sheet | 04"
da tabela acima está desatualizada. O ticket 04 teve o desenho de sheet + `OrderEditor` + gate de
aprovação rejeitado pelo dono do projeto e reescrito para um botão único, sem sheet nenhum — ver
`## Comments` de `04-faixa-do-exame-pedidos-persistentes-e-execucao.md`. O substituto real da fase
2 é "a faixa EXAME — um botão, pedidos sempre visíveis, sem edição" (mesma redação já corrigida em
`spec.md`). Isso não muda o critério de aceite deste ticket: a fase 2 continua tendo substituto
funcionando em `04` (que está `done`), só a FORMA do substituto mudou. Nenhuma ação necessária
aqui além desta nota — o `Blocked by: 04` continua satisfeito.
