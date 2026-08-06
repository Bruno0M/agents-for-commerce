# 17 — Congelar o catálogo "antes" num artefato versionado

**What to build:** hoje a linha de base do delta é o *estado da loja*, não um arquivo. A 02
verificou que os 7 produtos estão com `metafields: []` e sem spec estruturada, mas essa
verificação é uma foto num comentário — não um artefato que alguém possa reler. Qualquer
escrita na loja destrói o "antes" de forma irreversível, e com ele o número inteiro. A 08
escreve metafield por produto, e `ToCandidateProduct` lê metafield direto para os atributos
estruturados do candidato (`BuyerAgentSimulatorTools.cs:136`), sem passar pelo filtro da 03 —
então a contaminação é real e, pior, *parcial*: a chave de metafield é identificador de
máquina (`anc_ativo`), que às vezes casa com o nome do requisito e às vezes não. Um "antes"
meio estruturado produz um número que não dá para explicar.

Depois deste ticket, o catálogo "antes" existe como JSON commitado no repo, capturado de
`get_product_content` sobre os 7 handles do spec. As rodadas da 04 leem esse arquivo em vez
da loja ao vivo, e a 08 fica livre para escrever sem cuidado especial.

Custo: leitura pura, sem AI Gateway, sem crédito consumido. É trabalho de minutos, e é a
primeira coisa a fazer — antes da 04 e obrigatoriamente antes da 08.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Existe um JSON versionado com a saída de `get_product_content` para os 7 handles do catálogo de demo
- [x] O arquivo registra a data da captura e contra qual loja foi capturado
- [x] A foto confere com o que a 02 verificou: nenhum dos 7 tem metafield ou spec estruturada, e `Cor` é a única option
- [ ] A rodada "antes" da 04 consome esse arquivo, não a loja ao vivo — depende do código da 04, que ainda não existe; fica registrado aqui como contrato para quando a 04 for implementada

## Comments

**06/08/2026 — artefato criado.** `.scratch/catalogo-demo/catalog-antes.json` — chamado `get_product_content` uma vez por handle contra `afc-store-o7xzc4c2.myshopify.com` (2026-08-06T02:15:25Z) e salvo o retorno bruto de cada um, no formato `ProductCatalogContent` (o mesmo tipo que `SimulateBuyerAgent` espera como `catalog`). Bloco `_meta` no topo registra data, loja, método de captura e os 7 handles.

Confere com a verificação da 02: os 7 têm `metafields: []`, `hasSchemaOrgMarkup: false`, `generatedProperties: []`, e `Cor` é a única entrada em `options` em todos. Validado por script (`json.load` + asserts nos 7 produtos).

A última caixa fica em aberto de propósito: a 04 ainda não tem código, então "consumir o arquivo em vez da loja ao vivo" não é algo que dê pra marcar hoje — é o contrato que a 04 precisa respeitar quando for implementada (ler `catalog-antes.json` e desserializar para `IReadOnlyList<ProductCatalogContent>` em vez de chamar `GetProductContent` nos 7 handles).
