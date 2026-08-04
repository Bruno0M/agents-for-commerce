# 10 — MCP prompts expostos pelo servidor

**What to build:** o melhor custo/benefício da lista P1. Expor 3–4 prompts MCP (ex.: "Auditar GEO do catálogo", "Simular agente comprador para este SKU", "Gerar conteúdo otimizado para este produto") transforma as tools em pontos de entrada visíveis dentro do Studio: viram icebreakers do agente, menções `/` no chat e cards na home da org. São strings — não exige SDK nem código novo de integração.

Depois deste ticket, quem abre o chat da org vê o que dá para fazer sem precisar saber o nome das tools.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] O servidor anuncia os prompts pelo protocolo MCP e eles aparecem no Studio
- [ ] Cada prompt orienta o agente a orquestrar as tools na ordem certa, incluindo o loop gerar → simular → comparar
- [ ] Os prompts que precisam de entrada declaram seus argumentos
- [ ] Pelo menos um prompt foi executado ponta a ponta pelo chat da org, com o resultado registrado nos comentários
