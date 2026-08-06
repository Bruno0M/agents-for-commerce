# 18 — Metodologia reprodutível das rodadas

**What to build:** a 04 produz o número com o pedido A. Este ticket é o que faz um terceiro
que clone o repo chegar no mesmo número — ou entender exatamente por que não chegou. Cobre
os outros três pedidos do spec do catálogo, congela o resultado e publica a metodologia.

Não existe seed no AI Gateway, e há duas chamadas de LLM não-determinísticas no caminho: a
extração de requisitos do pedido (`BuyerAgentSimulatorTools.cs:45`, `temperature: 0.1`) e a
extração de propriedades da descrição. "Reprodutível", aqui, significa: modelo e temperature
fixados e registrados, catálogo "depois" congelado em arquivo (como a 17 fez com o "antes"),
e saída completa das simulações versionada ao lado. Quem divergir tem que conseguir apontar
em qual chamada divergiu.

O denominador da taxa de sucesso é **classificação correta por pedido**: dos 7 produtos,
quantos o agente tratou como o spec prevê — passou quem devia passar, e rejeitou quem devia
rejeitar *pelo motivo previsto*. Não é "quantos produtos passaram": 4 dos 7 são controles
que devem falhar, e um denominador que os conte como fracasso mede a coisa errada. A
mudança de motivo entre as rodadas ("sem dado estruturado para confirmar X" → "14h < 20h")
é a demonstração inteira.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] Os pedidos B, C e D do spec estão cobertos, além do A já coberto pela 04
- [ ] O pedido B faz vencer o Corvo Sport 2 — o mesmo produto rejeitado em A, prova de que a rejeição foi do requisito, não do produto
- [ ] O pedido C está resolvido ou documentado: o desalinhamento de vocabulário (`Conectividade` vs. `Conexão multiponto`) entre as duas extrações de LLM, registrado nos comentários da 03
- [ ] O catálogo "depois" está congelado em arquivo versionado, e a rodada replica sem gastar crédito e sem depender da loja no ar
- [ ] Modelo, temperature e data de cada rodada estão registrados junto do resultado
- [ ] A metodologia (mesmo catálogo, mesmos pedidos, determinismo, definição de sucesso e denominador) está publicada no README
