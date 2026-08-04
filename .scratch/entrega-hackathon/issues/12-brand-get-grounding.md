# 12 — Geração de conteúdo grounded no brand context

**What to build:** hoje a geração escreve a partir apenas da descrição do produto. Puxando o brand context da org pelo binding well-known do Studio, o conteúdo gerado passa a respeitar tom de voz, terminologia e restrições da marca — e o pitch muda de "gera texto" para "gera conteúdo grounded no brand context do CMS".

Depois deste ticket, dá para mostrar lado a lado a mesma geração com e sem brand context e ver a diferença de linguagem.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] A geração busca o brand context da org e o injeta no prompt
- [ ] Sem brand context configurado, a geração continua funcionando com degradação limpa — não quebra
- [ ] O conteúdo gerado com brand context respeita tom e terminologia declarados, comprovado num exemplo do catálogo de demo
- [ ] A extração de fatos continua sendo extração: o brand context muda a linguagem, não inventa spec
