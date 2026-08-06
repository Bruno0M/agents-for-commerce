# 07 — JSON-LD completo na PDP do storefront

**What to build:** o dado estruturado já existe na memória do app — o loader da deco mapeia opções, descrição, tipo de produto e metafields para propriedades adicionais no `Product` interno, que já é schema.org-shaped. Mas o componente que a PDP renderiza descarta essas propriedades, ignora variantes e não emite `FAQPage`. Ou seja: o dado nunca chega ao HTML e é invisível para o agente comprador externo.

Depois deste ticket, abrir uma PDP publicada e ler o JSON-LD mostra as propriedades adicionais e, quando houver FAQ, o bloco de `FAQPage` — que é exatamente o que um agente comprador de terceiros extrai.

Esta é a **capacidade** do §6 do briefing, e é o conteúdo natural do PR gerado pelo ticket 06: fluir por Task Board → PR → aprovação humana → merge é o que torna a mudança demonstrável no vídeo, em vez de um commit direto. O pacote é open source, então a correção pode virar PR upstream — bônus de pitch, não pré-requisito.

**Blocked by:** 06.

**Status:** in-progress (código mergeado; falta evidência de PDP publicada — ver comentários)

- [x] O JSON-LD de produto emitido pela PDP inclui as propriedades adicionais que o loader já monta
- [x] Quando o produto tem FAQ, a página emite `FAQPage` válido
- [ ] O JSON-LD gerado passa em validação de schema.org sem erro
- [x] A mudança chegou ao repo pelo fluxo do Task Board (PR + aprovação), não por commit direto
- [ ] Uma PDP do catálogo de demo, publicada, serve de evidência — com o HTML capturado para o vídeo

## Comments

**06/08/2026 — correção implementada, publicada via Task Board, PR mergeado.**

Bug real confirmado por investigação de código: o loader Shopify (`toProduct` em
`apps/storefront/node_modules/@decocms/apps-shopify/src/utils/transform.ts`) já monta
`additionalProperty` (opções, `descriptionHtml`, `productType`, metafields) e `isVariantOf`
no `Product`, mas `ProductJsonLd` (`@decocms/blocks/src/hooks/JsonLd.tsx`) tinha um tipo local
`JsonLdProduct` que só lia `name/description/url/sku/productID/gtin/brand/image/offers/
aggregateRating` — o resto era descartado antes de chegar ao HTML. Não existia `FAQPageJsonLd`.

Correção implementada e verificada localmente (typecheck limpo, smoke test com
`renderToStaticMarkup` confirmando saída correta contra o vocabulário schema.org —
`additionalProperty` → `PropertyValue[]`, `isVariantOf` → `ProductGroup.hasVariant` →
`Product[]`, `FAQPage.mainEntity` → `Question[].acceptedAnswer` → `Answer`, com entradas
vazias/incompletas descartadas), depois entregue pelo fluxo do Task Board (critério 4): item
`board_ldHxjaSQCkW_yreDBfDB2` criado com `assigneeId: "super-agent"`, pego automaticamente
(`todo → in_progress` ~2s depois, confirmado via `TASK_BOARD_ACTIVITY_LIST`), materializou
**[PR #2](https://github.com/Bruno0M/agents-for-commerce/pull/2)** (`+205/-1`, só
`apps/storefront/patches/@decocms%2Fblocks@7.20.7.patch` e
`apps/storefront/src/sections/Product/ProductDetails.tsx`) — mergeado pelo humano.

**Por que os critérios 3 e 5 continuam abertos.** A validação do critério 3 até agora é
manual/estrutural (revisão de código + smoke test local contra o vocabulário schema.org), não
uma passada por um validador externo de verdade (Rich Results Test / schema.org validator) —
isso só é possível contra uma PDP publicada de verdade, que é também o que falta no critério 5.
`additionalProperty` de metafields e `FAQPage` como um todo dependem de dado por produto que
ainda não existe na Shopify (ticket 08) — nenhum dado de FAQ foi inventado aqui. As
propriedades de opções/descrição/tipo de produto e `isVariantOf` aparecem sempre,
independente do ticket 08.
