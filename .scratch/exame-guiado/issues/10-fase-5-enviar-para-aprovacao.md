# 09 — Fase 5: enviar para aprovação

**What to build:** o último passo do fluxo. O lojista viu o diagnóstico, viu o conserto, viu o
delta — e agora manda a mudança para revisão. O botão diz **"enviar para aprovação"**, não
"publicar", e a tela termina num estado de **"aguardando revisão"** com link para o item, não
num spinner que vira "pronto".

Isso é o D6 e não é preciosismo de copy. `publish_suggestion` cria um item no Task Board com
`assigneeId: "super-agent"`; o PR vem do Super Agent e a aprovação é humana, por design (ADR
0004). Chamar isso de "publicar" na UI seria mentir sobre o que aconteceu — o conteúdo **não
está na loja** quando o botão termina. E o gate humano é argumento de venda, não limitação a
esconder: é a user story *"quero aprovar a mudança antes de ela ir para a loja — porque conteúdo
de PDP é responsabilidade minha, não de um robô."*

O caminho direto para a loja (`write_product_metafields`) existe, mas está travado no ticket 08
da `entrega-hackathon` (o `PDP Loader.json` não declara identificador de metafield). Ele **não
é** o caminho desta fase.

Aprovar, mergear ou promover a produção pela UI está fora de escopo — o ADR 0004 põe isso fora
de propósito. A UI leva até o Task Board e mostra o estado; a decisão acontece lá.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] O lojista escolhe o que enviar e dispara o envio a partir do resultado da fase 4
- [ ] O texto do botão e da confirmação fala em **aprovação**, nunca em publicação — em nenhum
      ponto a UI afirma que o conteúdo está na loja
- [ ] O estado final é "aguardando revisão", com link navegável para o item criado no Task Board
- [ ] Enviar mais de um produto deixa claro o estado de cada um, incluindo falha parcial
- [ ] A UI não oferece aprovar, mergear ou promover a produção
- [ ] Reenviar o mesmo produto não cria item duplicado silenciosamente — o estado anterior é
      visível antes
