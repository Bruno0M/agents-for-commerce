# 07 — Validação ponta a ponta dentro do Studio

> **Migrado para o GitHub: [#10](https://github.com/Bruno0M/agents-for-commerce/issues/10).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** rodar o exame inteiro de dentro da view, contra a loja de verdade, sem
`localhost` aberto em lugar nenhum e sem ninguém rodar comando. É o ticket que prova que a spec
fechou — não escreve funcionalidade nova.

**O percurso a validar** é o que o apresentador vai fazer no vídeo: abrir a org → clicar na aba →
ler o catálogo → gerar os pedidos de teste → rodar o agente comprador → ver o diagnóstico → ver a
comparação antes/depois. Cada passo desses é uma tool chamada pelo bridge, executada pelo host.

**O que precisa ser medido e escrito, não só observado:**

- **Custo.** Quantas chamadas de LLM o percurso completo dispara e quanto custou. É o mesmo tipo
  de medição do ticket 12 da `exame-guiado`, e existe porque uma demo que gasta um valor
  desconhecido por execução não pode ser repetida na frente de jurado.
- **Tempo.** Quanto demora do clique na aba até a tela com dado. Se houver passo que passa de
  poucos segundos sem estado visível, isso é achado e vira item.

**O que testar de propósito, porque a demo vai encontrar de qualquer jeito:** tool que falha,
tool que demora, catálogo vazio e sessão sem permissão. Nenhum desses pode virar tela branca ou
spinner infinito — o critério é o mesmo que já vale no ticket 05 da `exame-guiado`.

**Este ticket fecha os critérios da `.scratch/entrega-hackathon/issues/14-mcp-app-view.md`.** Ao
resolvê-lo, atualizar a 14 apontando para cá.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [ ] O percurso completo roda de dentro da view, contra a loja real, sem `localhost` no circuito
- [ ] Nenhuma credencial nossa está no bundle — verificado no HTML servido, não só no código
- [ ] Falha de tool, timeout, catálogo vazio e falta de permissão têm estado visível
- [ ] Custo em chamadas de LLM e em dinheiro do percurso completo está medido e registrado
- [ ] O tempo do clique até a primeira tela com dado está registrado
- [ ] Existe uma captura de tela da view dentro do Studio, utilizável no README de submissão
- [ ] O ticket 14 da `entrega-hackathon` foi atualizado com o resultado e apontado para esta spec
