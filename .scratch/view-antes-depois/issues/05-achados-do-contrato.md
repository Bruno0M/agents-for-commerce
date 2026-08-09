# 05 — Achados do contrato: o que o servidor precisa passar a carregar

**What to build:** o retorno desta spec para o resto do projeto. Construir a tela com fixtures
tem um segundo produto além da tela: a descoberta de **quais dados o servidor .NET precisa
passar a produzir** para que a tela funcione com dado real em vez de mock.

Dois já são conhecidos antes de a primeira linha ser escrita, e ambos são condição para o
drill-down de evidência da 03 existir:

- **`source`** — a origem de cada dado confirmado (opção de variante, metafield, tipo de
  produto, extraído da descrição). Hoje o `BuyerAgentDecisionEngine` produz só a frase pronta,
  sem dizer de onde o valor veio.
- **`descriptionExcerpt`** — o trecho da descrição onde a informação já estava escrita em
  prosa. É a prova de que o produto nunca foi ruim, só ilegível, e o servidor não o produz de
  forma alguma hoje.

A tela vai revelar outros. Este ticket é o lugar onde eles são registrados em vez de
esquecidos.

O entregável é a lista escrita, com o que falta e por que a tela precisa de cada item, levada
de volta aos tickets que vão ter de implementá-la: a **14** (`entrega-hackathon`), que é a
integração MCP, e a **04** (`entrega-hackathon`), que é dona do contrato de saída da
comparação. Nenhum código de servidor é escrito aqui — a decisão de enriquecer o record .NET
ou escrever um adaptador fino é de outra spec.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] Existe uma lista escrita de todo campo que a tela consome e o servidor não produz hoje
- [ ] Cada item registra por que a tela precisa dele e qual parte da tela deixa de funcionar sem ele
- [ ] A lista está registrada como comentário nos tickets 14 e 04 da `entrega-hackathon`
- [ ] Nenhuma mudança de código no servidor .NET foi feita neste ticket
