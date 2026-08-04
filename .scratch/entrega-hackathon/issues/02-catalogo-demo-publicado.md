# 02 — Catálogo de demo de áudio publicado na Shopify

**What to build:** a loja `afc-store-o7xzc4c2` tinha só os produtos de seed da Shopify, com `descriptionHtml` vazio — não havia de onde extrair dado, então nenhuma otimização produzia delta. Este ticket põe no ar o catálogo curado descrito em `.scratch/catalogo-demo/spec.md`: 7 fones de ouvido com prosa de marketing corrida onde cada fato citado nos pedidos de teste está embutido em frase, sem lista, sem tabela, sem metafield, sem spec em variant option (exceto Cor, que é proposital).

**Blocked by:** None — can start immediately.

**Status:** done (verificado na loja em 04/08/2026)

- [x] Os 7 produtos do spec existem na loja, publicados no canal Online Store
- [x] Os produtos de seed (snowboards) estão arquivados e não aparecem na vitrine
- [x] Cada PDP tem imagem com alt text, preço e descrição visíveis
- [x] Nenhum produto tem spec estruturada no "antes" — sem metafields, sem listas, sem tabela; Cor é a única variant option
- [x] A checagem final de `.scratch/catalogo-demo/spec.md` está toda marcada

## Comments

**04/08/2026 — verificação contra a loja real.** Consultado via `get_product_content` (os 7 handles) e via Admin GraphQL (`products.status/publishedAt/media`):

- 24 produtos no total: **8 ativos**, 16 arquivados ou rascunho. Os de seed saíram da vitrine — confirmado individualmente em `the-collection-snowboard-liquid` (`status: ARCHIVED`).
- Os 7 de áudio estão `ACTIVE`, com `publishedAt` preenchido e imagem com alt text preenchido.
- `descriptionHtml` bate com a prosa do spec, palavra por palavra, incluindo as negativas intencionais ("um aparelho por vez" no Studio One, "não tem cancelamento de ruído ativo" no Sport 2).
- `metafields: []` em todos os 7, e `Cor` é a única option — o "antes" está limpo como o spec exige.
- `hasSchemaOrgMarkup: false` em todos — a linha de base do delta está estabelecida.

**Ponta solta (não bloqueia nada):** o produto `gift-card` padrão da Shopify continua ativo e publicado, então a vitrine tem 8 itens, não 7. Se ele aparecer na gravação, arquivar antes de rodar o vídeo (ticket 15). Não afeta o simulador — `productType` é gift card, não entra em nenhum pedido de teste.
