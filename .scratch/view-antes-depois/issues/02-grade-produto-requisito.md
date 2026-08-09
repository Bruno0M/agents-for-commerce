# 02 — A grade produto × requisito

**What to build:** o exame propriamente dito. Abaixo do placar, uma grade em que cada linha é
um produto e cada coluna é um requisito obrigatório. Cada célula carrega os **dois** estados,
antes e depois, como marcadores adjacentes — uma grade só, não duas lado a lado. É isso que
faz a transição vermelho → verde ser lida numa varredura de olho e que mantém a tela útil em
captura de tela estática, sem depender de corte de vídeo.

As linhas vêm agrupadas por expectativa, com rótulo visível: **"Deviam passar"**, **"Deviam
ser rejeitados"** e **"Fora da contagem"** (produtos sem expectativa registrada, que aparecem
na grade mas não entram no denominador da taxa de sucesso). O agrupamento é o que mostra que
existe gabarito e que o teste não é auto-confirmatório.

Cada linha tem, à esquerda, o título do produto e um selo de veredito mostrando a transição de
classificação da linha — errou antes e acertou depois, acertou nas duas, e assim por diante.

**A decisão de design que este ticket implementa, e que é a mais importante da spec:**

> Cor significa **acerto de classificação**. Símbolo significa **passou ou foi rejeitado**.

| Situação | símbolo | cor |
| --- | --- | --- |
| Devia passar e passou | passou | acerto |
| Devia passar e foi rejeitado | rejeitou | erro |
| Devia ser rejeitado e foi rejeitado | rejeitou | **acerto** |
| Devia ser rejeitado e passou | passou | erro |
| Sem expectativa registrada | conforme o resultado | neutro |

Se cor significasse "passou", os 4 controles do catálogo de demo apareceriam como falha
vermelha e o delta pareceria ter vindo de afrouxar o filtro — que é precisamente a objeção que
a tela existe para derrubar. Com essa regra, a tela mostra o agente comprador acertando ao
rejeitar.

A lógica de classificação de célula, veredito de linha e agrupamento por expectativa vive num
módulo puro, sem React — é derivação de dado, e fica testável direto.

Em tela estreita a grade rola na horizontal; as colunas não espremem.

**Blocked by:** 01

**Status:** done

- [x] A grade desenha uma linha por produto e uma coluna por requisito, incluindo o preço como coluna
- [x] Cada célula mostra o estado antes e o estado depois, adjacentes, na mesma grade
- [x] As linhas estão agrupadas em "Deviam passar", "Deviam ser rejeitados" e "Fora da contagem", com rótulo visível
- [x] Cor reflete acerto de classificação e símbolo reflete passou/rejeitou, conforme a tabela acima
- [x] Cada linha mostra um selo com a transição de classificação do produto entre as rodadas
- [x] A grade rola na horizontal em telas estreitas, sem espremer colunas
- [x] Teste: um controle rejeitado nas duas rodadas é apresentado como acerto, não como falha
- [x] Teste: um candidato legítimo que reprova antes e passa depois mostra a transição na linha
- [x] Teste: um produto sem expectativa registrada aparece na grade e fora da contagem

## Comments

Implementado. Módulo puro `src/lib/grid.ts` (sem React) com `verdictFromRound` (cor =
acerto de classificação, lendo `RoundOutcome.correctlyClassified`), `classifyRowVerdict`
(transição de linha: `corrected`, `regressed`, `stayedCorrect`, `stayedIncorrect`,
`outOfCount`) e `groupByExpectation` (agrupa por `expectedToPass`). Testado direto em
`grid.test.ts`, cobrindo os três casos do checklist — controle rejeitado nas duas rodadas
vira `stayedCorrect` (acerto, não falha), candidato legítimo que reprova antes e passa
depois vira `corrected`, produto sem expectativa cai em `outOfCount` e fica fora dos grupos
`shouldPass`/`shouldReject`.

Componente `RequirementsGrid` renderiza a grade: colunas derivadas do array `evidence` do
primeiro produto (o que já inclui "Preço" por vir como mais um `RequirementEvidence`, sem
precisar de tratamento especial). Cada célula mostra dois marcadores adjacentes — antes e
depois — onde o **símbolo** vem de `evidence.confirmed` daquele requisito específico e a
**cor** vem de `verdictFromRound` da rodada inteira (não do requisito individual). Essa é a
decisão que faz o Corvo Sport 2 (controle) aparecer com célula "rejeitou" em verde: a cor
reflete que a classificação do produto naquela rodada estava certa, o símbolo reflete o que
de fato aconteceu com aquele requisito. Confirmado visualmente via PinchTab em telas larga e
estreita (375px) — nesta última, as colunas mantêm a largura e o container
`overflow-x-auto`/`min-w-max` rola na horizontal em vez de espremer.

Seguindo a decisão de arquitetura do próprio ticket ("módulo puro... fica testável
direto"), os três testes do checklist vivem em `grid.test.ts` contra dados mínimos
construídos à mão, não amarrados à fixture `pedidoA-delta-positivo` (que não tem produto
sem expectativa e cuja invariante de 7 produtos do catálogo de demo não deveria ganhar um
oitavo produto só para cobrir esse caso). `ComparisonView.test.tsx` ganhou testes adicionais
no seam de topo (grupos visíveis, coluna "Preço", selo de veredito por linha) usando a
fixture existente, sem duplicar a cobertura da lógica pura. `bun run test`, `bun run build`
e `bun run lint` passam.
