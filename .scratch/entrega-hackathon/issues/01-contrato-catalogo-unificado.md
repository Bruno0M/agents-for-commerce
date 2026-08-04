# 01 — Unificar o contrato de catálogo entre geração e simulação

**What to build:** hoje é impossível rodar a rodada "depois" do loop de prova. `simulate_buyer_agent` recebe uma lista do shape cru da Shopify, enquanto `generate_optimized_content` devolve um tipo diferente — não existe caminho para alimentar o simulador com a versão otimizada. Depois deste ticket, o mesmo simulador roda contra as duas versões do catálogo (atual e otimizada) e produz taxas de sucesso comparáveis: o agente que orquestra chama gerar → simular sem conversão manual no meio.

Junto com isso, a montagem do candidato usado no filtro passa a considerar todo o dado estruturado disponível — as propriedades geradas, a descrição e o tipo de produto — e não só as opções de variante e os metafields. É essa lacuna, e não a pobreza do catálogo, que fez o teste manual dar antes = depois.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Existe um único tipo de catálogo que tanto a leitura quanto a geração produzem, e que o simulador consome
- [x] Rodar o simulador contra a saída da geração não exige nenhuma conversão manual pelo chamador
- [x] O candidato avaliado pelo filtro enxerga propriedades geradas, descrição e tipo de produto, além de opções e metafields
- [x] Um teste automatizado prova que um produto que falha na rodada "antes" passa na rodada "depois" quando a propriedade exigida foi extraída
- [x] Os testes xUnit existentes continuam verdes

## Comments

Implementado (2026-08-04). `ProductCatalogContent` (`Tools/CatalogReadTools.cs`) ganhou o
campo `GeneratedProperties`; `ContentGenerationTools.GenerateOptimizedContent` agora produz
esse mesmo tipo via `product with { DescriptionHtml = ..., GeneratedProperties = ... }`,
exposto como `ContentGenerationResult.OptimizedCatalog` — o chamador passa
`generated.OptimizedCatalog` direto para `simulate_buyer_agent`, sem remapeamento de campos.
`BuyerAgentSimulatorTools.ToCandidateProduct` passou a ler `GeneratedProperties`,
`ProductType` (como atributo `"Tipo de produto"`) e `DescriptionHtml` (como `"Descrição"`),
além de options/metafields. `dotnet test` a partir de `apps/mcp-server/`: 21 passed, 0 failed
(18 existentes + 3 novos em `BuyerAgentSimulatorToolsTests.cs`). O teste principal
(`ProductFailingBeforeRound_PassesAfterRound_WhenRequiredPropertyWasExtracted`) foi
verificado revertendo manualmente o trecho novo de `ToCandidateProduct` e confirmando que os
3 novos testes falham nesse estado (KeyNotFoundException / coleção vazia), depois restaurando
o fix — prova de que o teste não é decorativo.
