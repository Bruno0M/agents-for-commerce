# 05 — Content generation tool (ContentGenerationTools)

**What to build:** a segunda tool MCP do MVP — recebe o conteúdo atual de um produto (formato produzido pelo ticket 04) e gera, via AI Gateway (cliente do ticket 03), a versão otimizada: schema.org completo (Product, Offer, e FAQPage quando aplicável), specs estruturadas e respostas diretas a perguntas de comparação. Este ticket também fecha a decisão em aberto do formato exato das propriedades schema.org mínimas a gerar — hoje isso não está definido.

**Blocked by:** 03 (cliente do AI Gateway), 04 (formato real de entrada vindo da leitura de catálogo)

**Status:** done

- [x] Tool registrada como `[McpServerToolType]`
- [x] Dado o output real da tool de leitura de catálogo (ticket 04) para um produto com descrição solta, a tool retorna schema.org Product + Offer válidos
- [x] Quando há pergunta de comparação relevante, a tool também gera uma seção de FAQ estruturada (FAQPage)
- [x] Formato de saída documentado (quais propriedades schema.org são geradas e por quê)

## Comments

Implementado em `apps/mcp-server/Tools/ContentGenerationTools.cs`: tool `generate_optimized_content`, recebendo o `ProductCatalogContent` de `get_product_content` (ticket 04) e um `currencyCode` opcional (default `"BRL"` — a Admin API não expõe moeda no formato lido pelo ticket 04).

**Divisão de responsabilidade — o que vem do AI Gateway vs. o que é montado deterministicamente em C#:**
Só a parte que exige entender texto solto vai para o AI Gateway (`AiGatewayClient`, ticket 03; modelo configurável via `AI_GATEWAY_MODEL`, default `anthropic/claude-sonnet-5`): uma descrição factual curta, specs soltas mencionadas na `descriptionHtml` mas ainda não estruturadas, e perguntas de comparação com resposta factual direta (FAQ vazio se não houver base o suficiente — a tool nunca deixa o modelo inventar). O restante (preço, SKU, disponibilidade, opções de variante, metafields) já é estruturado desde o ticket 04 e é montado em JSON-LD puramente em C#, sem passar pelo modelo — evita que o LLM "reinvente" dado que já é confiável.

**Propriedades schema.org geradas (decisão fechada por este ticket):**
- `Product`: `name`, `description` (gerada), `productID` (Shopify GID), `sku` (do primeiro variant com SKU), `brand.name` (vendor), `category` (productType), `url` (onlineStoreUrl), `additionalProperty` (lista de `PropertyValue`).
- `additionalProperty`: uma entrada por *option* de variante (ex. "Cor" → valores concatenados), por metafield com valor não vazio, e por spec solta extraída da descrição pelo AI Gateway — cada entrada carrega `Source` (`"option"` | `"metafield"` | `"description"`) no retorno da tool (não no JSON-LD) para o revisor humano no Task Board (ticket 07) ver o que é novo vs. já existia.
- `offers`: `Offer` único se o produto tem 1 variant; `AggregateOffer` (`lowPrice`/`highPrice`/`offerCount` + lista de `Offer` por variant) se tem mais de um. Cada `Offer` traz `sku`, `price`, `priceCurrency`, `availability` (`InStock`/`OutOfStock` via `availableForSale`) e `url`.
- `FAQPage`: só gerada quando o AI Gateway retorna ao menos uma entrada de FAQ com base factual na descrição; `mainEntity` é uma lista de `Question`/`acceptedAnswer` (`Answer`). Ausente (`null`) quando não há pergunta de comparação respondível.

Retorno da tool (`ContentGenerationResult`): `ProductId`, `OptimizedDescription`, `SchemaOrgProductJsonLd` (string JSON-LD indentada, pronta para `<script type="application/ld+json">`), `SchemaOrgFaqPageJsonLd` (idem, nullable) e `AdditionalProperties` (lista com `Source` para revisão humana).

Sem testes unitários por decisão explícita (ao contrário do ticket 06, que pede xUnit para a lógica pura de filtragem/desempate) — a lógica de montagem de JSON-LD aqui é direta o bastante e a parte não-determinística depende do AI Gateway ao vivo. Build validado (`dotnet build McpServer.slnx`); não testado ainda contra uma Shopify dev store real (mesma pendência do ticket 04).
