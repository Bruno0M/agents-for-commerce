# 13 — Automation com trigger cron sobre as nossas tools

**What to build:** uma automation no Studio, disparada por cron sobre um vMCP com as nossas tools, que roda a auditoria do catálogo periodicamente e publica sugestão no Task Board quando encontra produto com legibilidade agêntica baixa. É configuração, não código — e compra a narrativa "roda sozinho", que é diferente de "alguém precisa lembrar de rodar".

Depois deste ticket, o sistema deixa de ser uma ferramenta acionada à mão e vira um agente que trabalha sem ninguém pedir.

**Blocked by:** 09, 10.

**Status:** ready-for-agent

- [ ] Existe um vMCP na org agregando as nossas tools
- [ ] A automation está criada com trigger cron e um schedule declarado
- [ ] Uma execução manual da automation percorre o fluxo completo e produz um item no Task Board
- [ ] Pelo menos uma execução agendada disparou sozinha, com o registro visível nas estatísticas de run
- [ ] O consumo de créditos por execução está medido — automation rodando sozinha em cima de US$ 6,99 precisa de teto
