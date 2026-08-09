# 03 — Fase 1: conectar e ler o catálogo no front

**What to build:** hoje o `apps/comparison-view/` é inteiramente movido por fixture — o `App`
só troca qual objeto mockado o `ComparisonView` renderiza. **Não existe transporte**: nenhuma
linha do front fala com o servidor MCP. Depois deste ticket o lojista abre o front, vê a loja a
que está conectado e vê os produtos dela lidos de verdade, vindos da tool do ticket 01.

Este é o ticket que derruba os desconhecidos de infraestrutura cedo, e por isso vem antes da
fase 3 mesmo a spec recomendando construir a fase 1 por último. A recomendação parte de "a
fase 1 é casca" — e a tela é mesmo, mas ela **carrega o transporte**, que não é. Autenticação
por bearer token, CORS entre o front e o servidor .NET, e a forma de invocar tool por MCP a
partir do browser são risco desconhecido, e nenhuma outra fase existe sem eles resolvidos.

Duas coisas nascem aqui, além do transporte:

- **A casca de fases.** O wizard tem 5 fases e o front hoje não tem nenhuma noção de etapa. A
  estrutura de navegação entre fases entra neste ticket, com só a fase 1 preenchida.
- **A honestidade do D5.** "Conectar a loja" é fachada e a tela precisa dizer isso. O domínio e
  as credenciais da Shopify são lidos no boot do servidor e o factory é singleton para **uma**
  loja só; multi-loja com OAuth é eixo arquitetural inteiro e está fora de escopo. A tela mostra
  a loja única já configurada — não é um formulário, e ninguém pode descobrir isso na véspera.

O modo fixture **não morre**: ele continua sendo como as fases se desenvolvem e se testam sem
loja no ar, e é o único modo que funciona enquanto o ticket 09 da `entrega-hackathon` estiver
aberto.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] O front invoca uma tool do servidor MCP de verdade e renderiza o resultado
- [ ] O bearer token não está hardcoded no bundle — vem de configuração
- [ ] A fase 1 mostra a loja configurada e a contagem de produtos lidos, com o resultado da
      leitura disponível para as fases seguintes
- [ ] A tela deixa explícito que a loja é a única configurada no servidor, e não oferece um
      formulário de conexão que não existe
- [ ] ~~Existe uma casca de navegação entre as 5 fases, com as fases 2 a 5 ainda vazias~~ —
      passou a ser do ticket 04, ver Comments
- [ ] Falha de rede, 401 e catálogo vazio têm estado visível — não tela branca nem spinner
      infinito
- [ ] O modo fixture continua funcionando sem servidor no ar
- [ ] Nada disso toca a view do Studio: `ComparisonView` continua uma função pura do resultado
      (D7)

## Comments

**Parte do transporte já existe, e num formato que este ticket não previa.** O
`apps/web/src/lib/catalog.ts` chama `GET /catalog` (`Program.cs:107`) — uma rota JSON simples que
espelha a tool `get_product_catalog`, isenta do `BearerTokenAuthMiddleware` e aberta por uma
policy CORS `AllowAnyOrigin().WithMethods("GET")`. O browser não fala o JSON-RPC do MCP, e essa
foi a saída. O critério *"o front invoca uma tool do servidor MCP de verdade"* já está satisfeito
no espírito, por outro meio.

**O que sobra deste ticket é a parte difícil, e ela tem um custo que a rota `/catalog` não
tinha.** As fases seguintes precisam de `generate_test_orders`, `compare_buyer_agent_rounds` e
`publish_suggestion` — POST, e **cada chamada gasta crédito de LLM**. Estender a isenção de auth
para elas cria endpoint público que queima dinheiro de quem achar a URL; `generate_optimized_content`
é 1 chamada por produto. A leitura de catálogo custa zero e por isso podia ser exposta; estas não
podem, e o critério *"o bearer token não está hardcoded no bundle"* continua valendo. Caminho
provável: proxy de dev do Vite com o bearer do lado do servidor, em vez de mais rotas isentas.

**O front hospedeiro mudou:** o wizard vai para o `apps/web`, não para o `apps/comparison-view`.
Motivo e consequências no ticket 04, que também assumiu o critério da casca de navegação —
riscado acima para este ticket ficar sendo transporte puro.

**Falta um dado para a fase 1:** `ProductCatalogReadResult` não carrega o domínio da loja, e a
tela precisa mostrar a qual loja está conectada (D5). Ou o endpoint passa a devolver, ou vem de
variável `VITE_` no front — decisão deste ticket.

**Esta fase tem duas caras, e só uma delas está descrita acima.** Na primeira passada ela é o que
o ticket diz: conectar e ler. Da segunda em diante, a porta de entrada útil não é "ler o catálogo
de novo" e sim o **estado da loja** — último número, quando foi medido, e o que mudou no catálogo
desde então, com "reexaminar" e "revisar os pedidos" como ações de pesos diferentes. O modelo por
trás disso é do ticket 11; fica registrado aqui para a fase 1 não ser construída assumindo que
existe só o caso da loja nunca examinada.

**O seam para `generate_test_orders`/`simulate_buyer_agent` já existe do lado do front, esperando
este ticket.** O redesenho de botão único do `.scratch/catalogo-como-exame/issues/04` (botão
"Rodar Agente de Simulação") roda inteiro sobre mock hoje —
`apps/web/src/diagnosis/lib/runSimulationAgent.ts` exporta `writeTestOrders`/`runBuyerAgent` com a
assinatura exata que uma chamada HTTP real teria, e o contrato do payload
(`TestOrderGenerationResult`/`BuyerAgentSimulationBatchResult` em `diagnosis/types.ts`) já é cópia
campo a campo dos records C# (`TestOrderGenerationTools.cs`, `BuyerAgentSimulatorTools.cs`).
Quando este ticket resolver o transporte POST com crédito de LLM (a lacuna já registrada acima),
plugar as duas tools é trocar o CORPO dessas duas funções por `fetch`, sem mudar quem chama —
nenhum redesenho de tela necessário. Ver ticket 04 da `catalogo-como-exame` para o detalhe do
seam e o critério de aceite sugerido para quando este ticket for retomado.
