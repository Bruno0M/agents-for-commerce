# 04 — Rodadas antes/depois com metodologia reprodutível

**What to build:** o número do pitch. Rodar os pedidos de teste do spec do catálogo contra a versão atual e contra a versão otimizada do mesmo catálogo, com os mesmos pedidos e a mesma seed, e produzir a taxa de sucesso de cada rodada e o delta entre elas. O resultado precisa ser reproduzível por um terceiro que clone o repo: quem repetir o procedimento chega no mesmo número, ou entende exatamente por que não chegou.

Sucesso é a métrica binária já definida: o agente confirmou todos os requisitos obrigatórios via dado estruturado e, havendo mais de um candidato, justificou a escolha com base em diferenciais também estruturados.

O custo importa — são US$ 6,99 de crédito de AI Gateway para N produtos × M pedidos × 2 rodadas. Medir o custo de uma rodada antes de disparar o catálogo inteiro.

**Blocked by:** 01, 02, 03.

**Status:** ready-for-agent

- [ ] Existe um procedimento único, documentado, que roda as duas rodadas e imprime taxa de sucesso e delta
- [ ] Os pedidos A, B, C e D do spec do catálogo estão cobertos, e cada rejeição sai com o motivo
- [ ] O pedido A rejeita os 4 controles, cada um pelo motivo previsto no spec (sem ANC / 14h < 20h / ambos / preço acima do teto)
- [ ] O pedido B faz vencer justamente o produto rejeitado em A — a prova de que a rejeição foi do requisito, não do produto
- [ ] A metodologia (mesmo catálogo, mesmos pedidos, mesma seed, definição de sucesso) está publicada no README
- [ ] O custo em créditos de uma rodada completa está medido e registrado
