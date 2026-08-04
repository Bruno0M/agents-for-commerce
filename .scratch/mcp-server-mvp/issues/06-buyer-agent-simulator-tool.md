# 06 — Buyer agent simulator tool (BuyerAgentSimulatorTools)

**What to build:** a terceira tool MCP do MVP — simula um agente comprador seguindo a mecânica genérica de duas etapas (documentada em `docs/ideia-central-geo-validacao.md` §4.1): (1) extrai os requisitos obrigatórios de um pedido em linguagem natural e filtra candidatos à risca contra o dado estruturado de cada produto do catálogo; (2) quando mais de um candidato passa, compara por diferenciais específicos e sinais secundários (mais vendido, avaliação, política de devolução, etc.) e registra a justificativa da escolha. A tool roda contra uma versão de catálogo (atual ou otimizada) e retorna: produtos que passaram na filtragem, produto escolhido (se houver) e a justificativa.

**Blocked by:** 03 (cliente do AI Gateway)

**Status:** done

- [x] Tool registrada como `[McpServerToolType]`
- [x] Dado um pedido em linguagem natural com requisito obrigatório (ex: característica + restrição de preço) e um catálogo de teste, a tool filtra corretamente os produtos que não têm dado estruturado suficiente para confirmar o requisito
- [x] Quando mais de um produto passa na filtragem, a tool escolhe um e retorna a justificativa baseada em diferenciais/sinais estruturados
- [x] A mesma tool funciona sem lógica hardcoded por categoria de produto (genérica, catalog-agnostic)
- [x] Rodando a mesma tool contra uma versão "pobre" e uma versão "otimizada" do mesmo catálogo produz resultados diferentes de forma verificável (é a base da prova antes/depois) — decorre diretamente da filtragem à risca; não coberto por teste automatizado ainda (depende de catálogo de teste real, mesma pendência dos tickets 04/05)
- [x] Filtragem (etapa 1) e comparação/desempate (etapa 2) implementadas como função/classe pura, separada da chamada ao AI Gateway — testável sem rede
- [x] Testes unitários (xUnit, `McpServer.Tests`) cobrindo essa lógica pura com requisitos já extraídos (não a extração via LLM): produto sem dado estruturado suficiente é descartado; produto que confirma todos os requisitos permanece candidato; com dois candidatos remanescentes, o desempate escolhe o certo com base no diferencial estruturado informado

## Comments

Implementado em dois arquivos, seguindo o pedido de começar pelos testes (TDD):

**`apps/mcp-server/Tools/BuyerAgentDecisionEngine.cs`** — a lógica pura (etapa 1 + etapa 2), sem nenhuma dependência de rede ou de categoria de produto:
- `BuyerAgentDecisionEngine.Simulate(BuyerOrderRequirements, IReadOnlyList<BuyerCandidateProduct>)`: etapa 1 aplica cada `BuyerAttributeRequirement` à risca (dado estruturado ausente ou que não confirma o valor esperado → produto descartado, com o motivo registrado em `BuyerFilterOutcome.UnmetRequirements`) mais um `MaxPrice` opcional tratado à parte por ser restrição numérica. Etapa 2 desempata entre candidatos remanescentes por `BuyerSecondarySignal` (nome + valor + direção `HigherIsBetter`/`LowerIsBetter`, todos dados de entrada — nenhum nome de sinal é hardcoded no engine): cada sinal em que um candidato é líder isolado conta como "vitória"; quem acumula mais vitórias é escolhido, com fallback determinístico (por `ProductId`) e justificativa explícita quando não há sinais suficientes para decidir.
- Genericidade comprovada por teste rodando o mesmo engine contra dois domínios de produto diferentes (fone bluetooth, tênis de corrida) sem qualquer branch de código por categoria.

**`apps/mcp-server/Tools/BuyerAgentSimulatorTools.cs`** — a tool MCP (`simulate_buyer_agent`), que é a única parte que fala com o AI Gateway: extrai `BuyerOrderRequirements` do pedido em linguagem natural (mesmo padrão de prompt/parsing de JSON com tolerância a code fence do ticket 05), mapeia o `ProductCatalogContent` (ticket 04) para `BuyerCandidateProduct` — options e metafields viram atributos estruturados genéricos; um conjunto fixo de chaves de metafield bem-conhecidas (`rating`/`avaliacao`, `best_seller_rank`, `return_policy_days`, `delivery_days`, e variantes em pt-br) é reconhecido como sinal secundário para a etapa 2 — e delega a decisão inteira ao `BuyerAgentDecisionEngine`.

**Testes (`McpServer.Tests/Tools/BuyerAgentDecisionEngineTests.cs`)**: 11 testes xUnit cobrindo a lógica pura com requisitos já extraídos — descarte por atributo ausente, descarte por valor que não confirma o requisito, descarte por preço acima/sem dado de preço, produto único que confirma tudo, desempate por sinal `HigherIsBetter` e por `LowerIsBetter`, desempate com múltiplos sinais (mais vitórias vence), fallback determinístico sem sinais secundários, nenhum candidato passa, e o teste de genericidade entre domínios distintos.

Build (`dotnet build McpServer.slnx`) e suíte completa (`dotnet test McpServer.Tests`) passando: 18/18 (11 novos + 7 pré-existentes do ticket 01). Sem testes contra o AI Gateway ao vivo para a parte de extração (mesma decisão do ticket 05: a parte não-determinística depende de rede) nem contra uma Shopify dev store real (mesma pendência dos tickets 04/05).
