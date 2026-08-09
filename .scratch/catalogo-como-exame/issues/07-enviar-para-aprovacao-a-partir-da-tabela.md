# 07 — Enviar para aprovação a partir da tabela

**What to build:** o envio das mudanças para revisão humana, disparado da tabela, com estado
visível por linha. É a fase 5 do `exame-guiado` na forma da superfície única.

**O gate não é "tudo verde", e essa é a decisão deste ticket.** O desenho intuitivo — habilitar o
envio quando todas as linhas estiverem ✅ — **nunca acende numa loja real**: rejeição legítima não
vira verde nunca, porque o produto de fato não tem o que o pedido exigia. Um botão que depende de
uma condição inalcançável é um botão morto.

O gate correto é *"não há ilegibilidade pendente de conserto entre os produtos selecionados"* — ou
nenhum gate, enviando o que já foi consertado. O que **não** pode acontecer é a tela condicionar o
envio ao desaparecimento de uma classe de resultado que é, por definição, permanente.

**O botão diz "enviar para aprovação", nunca "publicar".** `publish_suggestion` cria item no Task
Board com `assigneeId: "super-agent"`; o PR vem do Super Agent e a aprovação é humana, por design
(ADR 0004, D6 do `exame-guiado`). Quando o botão termina, **o conteúdo não está na loja**. Chamar
isso de publicar é mentir sobre o que aconteceu — e o gate humano é a user story *"quero aprovar a
mudança antes de ela ir para a loja, porque conteúdo de PDP é responsabilidade minha, não de um
robô"*, ou seja, argumento de venda e não limitação a esconder.

O caminho direto para a loja (`write_product_metafields`) existe mas está travado no ticket 08 da
`entrega-hackathon` (o `PDP Loader.json` não declara identificador de metafield). Ele **não** é o
caminho deste ticket.

Aprovar, mergear ou promover a produção pela UI está fora de escopo — o ADR 0004 põe isso fora de
propósito. A tabela leva até o Task Board e mostra o estado; a decisão acontece lá.

**O estado de envio é por linha**, e vira coluna: `aguardando revisão` com link para o item. É o
mesmo estado que o ticket 06 consulta para não recontar custo em produto já enviado — os dois
tickets leem a mesma verdade, não cada um a sua.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] O envio parte da seleção na tabela e o lojista vê exatamente o que vai ser enviado
- [ ] O gate é ausência de ilegibilidade pendente na seleção — nunca "todas as linhas verdes"
- [ ] O texto do botão e da confirmação fala em **aprovação**; em nenhum ponto a UI afirma que o
      conteúdo está na loja
- [ ] Cada linha enviada mostra "aguardando revisão" com link navegável para o item do Task Board
- [ ] Falha parcial num envio de vários produtos deixa claro o estado de cada um
- [ ] Reenviar o mesmo produto não cria item duplicado silenciosamente — o estado anterior é
      visível antes
- [ ] A UI não oferece aprovar, mergear nem promover a produção
- [ ] O estado de envio por linha é a mesma fonte que o ticket 06 usa para excluir produto já
      enviado da contagem de custo
