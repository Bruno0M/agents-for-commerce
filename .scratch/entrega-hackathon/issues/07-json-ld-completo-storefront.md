# 07 — JSON-LD completo na PDP do storefront

**What to build:** o dado estruturado já existe na memória do app — o loader da deco mapeia opções, descrição, tipo de produto e metafields para propriedades adicionais no `Product` interno, que já é schema.org-shaped. Mas o componente que a PDP renderiza descarta essas propriedades, ignora variantes e não emite `FAQPage`. Ou seja: o dado nunca chega ao HTML e é invisível para o agente comprador externo.

Depois deste ticket, abrir uma PDP publicada e ler o JSON-LD mostra as propriedades adicionais e, quando houver FAQ, o bloco de `FAQPage` — que é exatamente o que um agente comprador de terceiros extrai.

Esta é a **capacidade** do §6 do briefing, e é o conteúdo natural do PR gerado pelo ticket 06: fluir por Task Board → PR → aprovação humana → merge é o que torna a mudança demonstrável no vídeo, em vez de um commit direto. O pacote é open source, então a correção pode virar PR upstream — bônus de pitch, não pré-requisito.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] O JSON-LD de produto emitido pela PDP inclui as propriedades adicionais que o loader já monta
- [ ] Quando o produto tem FAQ, a página emite `FAQPage` válido
- [ ] O JSON-LD gerado passa em validação de schema.org sem erro
- [ ] A mudança chegou ao repo pelo fluxo do Task Board (PR + aprovação), não por commit direto
- [ ] Uma PDP do catálogo de demo, publicada, serve de evidência — com o HTML capturado para o vídeo
