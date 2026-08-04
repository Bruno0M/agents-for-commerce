# 03 — Filtro de relevância nas propriedades geradas

**What to build:** o smoke test real produziu propriedades de baixo valor (`Title: "Default Title"`, `binding_mount: "Optimistic"`), que poluem o output e enfraquecem tanto a demo quanto o argumento. Depois deste ticket, a geração só emite propriedades que um comprador humano ou agêntico usaria para decidir: specs verificáveis, restrições numéricas, características de produto — e descarta ruído de plataforma, valores placeholder e nomes internos da Shopify.

Verificável ao rodar a geração contra o catálogo de demo: as propriedades que saem são as que os pedidos de teste consultam.

**Blocked by:** 01, 02.

**Status:** done

- [x] Propriedades com valor placeholder (ex: "Default Title") nunca chegam ao resultado
- [x] Nomes de campo internos da plataforma não viram propriedade voltada ao comprador
- [x] Rodar a geração contra os 7 produtos do catálogo de demo produz propriedades que cobrem os fatos citados nos pedidos A–D do spec
- [x] A origem de cada propriedade continua rastreável (extraída da descrição vs. vinda de variant option) — é o que prova que houve extração e não invenção
- [x] Teste automatizado cobre pelo menos um caso de ruído descartado e um caso de propriedade legítima preservada

## Comments

Implementado (2026-08-04). Novo `PropertyRelevanceFilter` (`Tools/ContentGenerationTools.cs`),
aplicado tanto ao `additionalProperty` do JSON-LD quanto a `OptimizedCatalog.GeneratedProperties`,
via duas regras explícitas e determinísticas (sem chamar o AI Gateway):

1. **Valor placeholder**: qualquer propriedade cujo valor, após trim, seja
   case-insensitively igual a `"default title"` é descartada — é a constante literal,
   em inglês e não localizável, que a Shopify usa para o par option/variant
   auto-gerado quando um produto não tem opções reais (a classe do problema é "isso não
   é uma spec, é o stand-in da plataforma para 'sem opções'", não só a string exata do
   smoke test).
2. **Nome de campo interno**: toda propriedade com `Source == "metafield"` é descartada.
   A chave de um metafield na Shopify é sempre um identificador de máquina
   (minúsculas/`_`/`-`, sem espaço) — o nome de exibição vive em
   `definition.name`, campo que `CatalogReadTools` não busca. Não existe, portanto,
   chave de metafield que um comprador reconheceria como nome de spec (`binding_mount`
   é exatamente esse caso). Aterrissar uma versão legível do dado de metafield em vez de
   simplesmente descartá-lo é trabalho do ticket 08, fora do escopo daqui.

`BuildAdditionalProperties` e o extraction prompt system continuam iguais; só o prompt de
extração (`BuildExtractionPrompt`) ganhou uma regra pedindo nomes reconhecíveis por
comprador (não jargão técnico) para as specs que o próprio LLM extrai — julgamento de
prompt, não parte determinística do filtro.

**Rastreabilidade**: `PropertyRelevanceFilter` nunca renomeia — só descarta. Toda
propriedade sobrevivente sai com `Name`/`Value`/`Source` intactos.

**Testes**: `McpServer.Tests/Tools/PropertyRelevanceFilterTests.cs`, 10 casos novos —
cobre o `Title: "Default Title"` e o `binding_mount: "Optimistic"` do smoke test real
literalmente, variação de casing/espaço no valor placeholder, valor em branco, e dois
casos de preservação (`Cor` vinda de option, spec legítima vinda de description) com
`Source` conferido no resultado. Não-decorativo: neutralizei `IsRelevant` para sempre
`true`, rodei só esses 10 testes e 8 falharam (os 2 que sobraram são os de preservação,
que não dependem de nada ser descartado) — depois restaurei a implementação real
(`diff` confirmou arquivo idêntico ao original) e os 10 voltaram a passar.

`dotnet test` a partir de `apps/mcp-server/`: **31 passed, 0 failed** (21 existentes +
10 novos).

**Critério 3 — rodado de verdade**, com credenciais reais de `apps/mcp-server/.env`
(Shopify + AI Gateway já preenchidas no working tree). Não usei o container Docker nem
o protocolo MCP via HTTP — escrevi um harness C# descartável (file-based app do .NET 10,
`#:project` apontando pro `McpServer.csproj`) que instancia
`ShopifyAccessTokenProvider`/`ShopifyGraphServiceFactory`/`AiGatewayClient` exatamente
como `Program.cs` faz, chama `CatalogReadTools.GetProductContent` e
`ContentGenerationTools.GenerateOptimizedContent` de verdade contra os 7 handles do
catálogo de demo (`aurora-nc7`, `vetor-studio-one`, `halo-air-pro`, `corvo-sport-2`,
`orbe-link-4`, `nimbo-mini`, `vetor-reference-900`), e apaguei o harness depois de
confirmar. As 7 chamadas completaram sem erro. Achados:

- Nenhum dos 7 produtos tem metafield ou opção "Title"/"Default Title" (só `Cor`) — o
  catálogo de demo é limpo por desenho (`.scratch/catalogo-demo/spec.md`: "Proibido no
  antes: ... metafields"), então a rodada real não *exercita* as duas regras de
  descarte — quem prova o descarte são os testes unitários com o ruído literal do
  smoke test. A rodada real prova a outra metade: que o filtro não derruba nada que os
  pedidos A–D precisam.
- Fatos dos pedidos A–D, todos presentes em `GeneratedProperties` (`Source: description`):
  ANC (`Cancelamento de ruído`) e bateria em todos os 7; `Resistência à água = IPX7` e
  `Autonomia da bateria = 32 horas` no Corvo Sport 2 (pedido B); `Conexão multiponto =
  Até 3 dispositivos simultâneos` no Vetor Reference 900 vs. `Conectividade = ... (um
  dispositivo por vez)` no Vetor Studio One (pedido C); preço (`Offer.price`, passa
  direto de `Variants`, não filtrado por este ticket) confere com a tabela do spec em
  todos (ex: Corvo Sport 2 R$189,00).
- Observação fora do escopo deste ticket: no pedido C, o Vetor Studio One expõe a
  negativa de multiponto dentro do valor de `Conectividade`, não com o nome
  `Conexão multiponto`/`Multiponto`. Casamento de chave exata
  (`BuyerAgentDecisionEngine`) entre o nome que a extração de conteúdo escolhe e o nome
  que a extração de requisitos do pedido escolhe é um risco estrutural — as duas vêm de
  chamadas de LLM independentes. Não dá pra garantir determinísticamente sem fixar um
  vocabulário canônico maior que só "Tipo de produto", e isso é medição/metodologia do
  ticket 04, não filtro de ruído do ticket 03. Registro aqui para o ticket 04 não ser
  pego de surpresa.

Nenhum arquivo de storefront ou mcp-app tocado. Nada commitado — mudanças ficam no
working tree.
