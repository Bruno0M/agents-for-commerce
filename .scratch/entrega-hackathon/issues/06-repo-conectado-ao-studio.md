# 06 — Repo do GitHub conectado como projeto no Studio

**What to build:** sem o repositório conectado como projeto na org `bruno-feijoada`, o item do Task Board avança até review e para — nunca vira PR. Depois deste ticket, a cadeia completa roda ponta a ponta: sugestão publicada → super-agent edita o repo → PR aberto com preview → review (qa / code_review) → promoção para produção faz o merge.

É esse caminho que dá o momento de aprovação humana do vídeo, e ele precisa estar demonstrável em uma passada só.

**Blocked by:** 05.

**Status:** ready-for-agent

- [ ] O repositório `Bruno0M/agents-for-commerce` está conectado como projeto na org do Studio
- [ ] Um item criado por `publish_suggestion` chega a abrir um PR de verdade no repo
- [ ] O ciclo de review é exercitado nas duas direções: pedir mudanças devolve ao agente, e aprovar libera o merge
- [ ] O caminho inteiro (publicar → PR → aprovar → merge) foi percorrido pelo menos uma vez e está registrado nos comentários deste ticket
