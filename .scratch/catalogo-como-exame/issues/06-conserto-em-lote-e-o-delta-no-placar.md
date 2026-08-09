# 06 — Conserto em lote e o delta no placar

**What to build:** seleção de linhas → **uma** passada de conserto → **um** delta na faixa de
placar. É a fase 4 do `exame-guiado` na forma da tabela, e é o primeiro ticket desta spec que
gasta dinheiro.

**Por que em lote, e não um botão por linha.** O desenho intuitivo — cada linha vermelha com seu
próprio "consertar e re-simular" — quebra duas coisas:

- **Custo.** `generate_optimized_content` é **1 chamada de LLM por produto**, e cada clique
  disparando sua própria re-simulação multiplica também a extração de requisitos. Diagnosticar 400
  produtos são ~2 chamadas; otimizar 400 são 400. O exame é quase de graça, o remédio é que custa
  — e a contagem prévia de custo só existe se houver um lote para contar.
- **Comparabilidade.** O D4 do `exame-guiado` congela os requisitos entre as duas rodadas
  justamente porque reextrair do mesmo texto devolve requisitos ligeiramente diferentes. Uma
  re-simulação por clique reintroduz o não-determinismo que aquela decisão eliminou, e o delta
  vira ruído de LLM disfarçado de fato sobre a loja.

**O recorte de quem entra no lote é a decisão, não uma otimização.** Só produtos que falharam por
**ilegibilidade**. Produto que passou não precisa; produto rejeitado legitimamente não tem o que
consertar — gerar neles é queimar crédito para não mudar resultado. É a razão de a coluna do
ticket 02 ter quatro estados e não dois: com dois, este recorte não existe.

A partir da segunda passada o recorte precisa ser *"falhou por ilegibilidade **e** ainda não foi
enviado para aprovação"*, senão a contagem prévia propõe gastar de novo exatamente nos produtos já
consertados. É o único ponto do fluxo onde a falta de estado custa dinheiro.

**O "antes" vem da passada congelada, nunca de releitura** (D7 da spec). `catalog-page.tsx` faz
`fetchCatalog()` no mount — leitura viva da Shopify. Depois que um conserto é publicado, uma
releitura devolve o produto já otimizado e a coluna "antes" passa a mostrar o depois; o
antes/depois se apaga sozinho ao longo do tempo. O modelo de passada e linha de base é do
**ticket 11 do `exame-guiado`**, que é pré-requisito duro deste — não é reescrito aqui.

**O delta é sobre a métrica de ilegibilidade.** O percentual de classificação correta depende de
`expectedOutcomes`, que numa loja real não existe; ele só aparece quando há gabarito, e nunca em
primeiro plano.

**Blocked by:** 04, 05, e os tickets **05** (transporte) e **11** (linha de base) do
`.scratch/exame-guiado/issues/`

**Status:** ready-for-agent

- [ ] Dá para selecionar linhas e disparar **uma** passada de conserto sobre a seleção
- [ ] A seleção só admite produtos com ilegibilidade; passados e rejeitados legítimos não são
      selecionáveis, e a tela diz por quê
- [ ] A contagem de chamadas de geração aparece **antes** de rodar — o lojista sabe o que está
      prestes a gastar
- [ ] A re-simulação usa exatamente os pedidos aprovados, com os requisitos congelados, sem
      regerar nem reextrair
- [ ] O "antes" exibido vem da passada congelada, não de releitura do catálogo
- [ ] O delta aparece na faixa de placar, sobre a métrica de ilegibilidade
- [ ] O percentual de classificação correta só aparece quando há gabarito
- [ ] Falha de geração num produto não derruba o lote — aquele produto fica como não consertado e
      o resto segue
- [ ] Produto já enviado para aprovação não volta a entrar na contagem de custo
- [ ] Nenhuma geração é disparada automaticamente por produto novo entrar no catálogo

## Comments

**Nota de reconciliação (09/08/2026):** o ticket 04 (`Blocked by` acima) teve o desenho de
aprovação/edição explícita de pedidos rejeitado pelo dono do projeto e reescrito para um botão
único ("Rodar Agente de Simulação"), sem gate de aprovação nem `OrderEditor` — ver `## Comments`
de `04-faixa-do-exame-pedidos-persistentes-e-execucao.md`. O bloqueio em si continua satisfeito
(04 está `done`); o que mudou é uma premissa implícita: os arquivos que o ticket 04 original
criava para modelar uma "linha de base aprovada" (`diagnosis/lib/approvedOrders.ts`,
`ApprovedOrderSet`) **foram apagados** e não existem mais. Quando este ticket for construído, os
pedidos "congelados" contra os quais a re-simulação roda vêm de onde quer que o ticket 11 do
`exame-guiado` (linha de base, pré-requisito duro deste ticket) passar a persisti-los — não de um
`approvedOrders` local que não existe mais no front. A "segunda passada" que este ticket descreve
(recorte por ilegibilidade **e** ainda não enviado para aprovação) continua sendo lógica sobre
`ProductExamRow`/estado de envio, e não é afetada pelo corte da aprovação de pedidos.
