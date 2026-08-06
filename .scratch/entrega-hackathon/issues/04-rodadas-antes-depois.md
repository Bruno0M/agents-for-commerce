# 04 — A rodada antes/depois: o número

**What to build:** o número do pitch. Rodar o pedido A do spec do catálogo contra a versão
congelada do catálogo atual (ticket 17) e contra a versão otimizada do mesmo catálogo, com o
mesmo pedido, e produzir a taxa de sucesso de cada rodada e o delta entre elas.

Este ticket foi reduzido ao núcleo. A cobertura dos pedidos B, C e D, o congelamento do
resultado e a publicação da metodologia saíram para o **ticket 18** — o caminho crítico é só
o número existir. Enquanto ele não existe, todo o resto do projeto é embalagem em volta de
um vazio.

Sucesso é a métrica binária já definida: o agente confirmou todos os requisitos obrigatórios
via dado estruturado e, havendo mais de um candidato, justificou a escolha com base em
diferenciais também estruturados. O denominador é classificação correta — passou quem devia
passar, e rejeitou quem devia rejeitar pelo motivo previsto no spec.

**A saída precisa ser dado estruturado, não relatório impresso.** A view do ticket 14 roda
sob CSP `default-src 'none'; connect-src 'none'`: ela não pode buscar nada, e só mostra o que
chega pelo resultado da tool. Se este ticket imprimir texto em stdout, o número vai ser
construído duas vezes. O resultado da comparação — por produto, requisitos confirmados e
faltantes, nas duas rodadas — tem que sair como objeto serializável de uma tool.

O custo importa — são US$ 6,99 de crédito de AI Gateway no total. Medir o custo desta rodada
antes de a 18 disparar os outros três pedidos.

**Blocked by:** 17 (a linha de base precisa estar congelada antes de rodar).

**Status:** done

- [x] Existe um procedimento único, documentado, que roda as duas rodadas do pedido A e imprime taxa de sucesso e delta
- [x] O resultado da comparação sai como dado estruturado por produto (confirmado vs. faltante, antes e depois), consumível por uma tool — não só como texto
- [x] O pedido A rejeita os 4 controles, cada um pelo motivo previsto no spec (sem ANC / 14h < 20h / ambos / preço acima do teto)
- [x] Na rodada "antes", os 3 candidatos legítimos falham por ausência de dado estruturado; na rodada "depois", passam — é o delta
- [x] O custo em créditos desta rodada está medido e registrado

## Comments

**05/08/2026 — risco herdado da 03.** O comentário final do ticket 03 registra que a
confirmação de requisito casa por **nome de chave exato**
(`BuyerAgentDecisionEngine.cs:42-43`), e que o nome escolhido pela extração de conteúdo e o
escolhido pela extração de requisitos vêm de duas chamadas de LLM independentes. No pedido A
os nomes são diretos (ANC, bateria, preço), então o risco é baixo aqui — ele morde no pedido
C, que é escopo da 18. Se aparecer já no A, é mudança de código no `BuyerAgentDecisionEngine`
e precisa de prioridade imediata.

**05/08/2026 — implementado, e o risco acima se confirmou (com dois amigos que ele não
tinha previsto).** Rodei o pedido A de verdade, contra a loja/AI Gateway reais
(`apps/mcp-server/.env`), e a primeira execução deu **delta zero**. Três problemas
distintos, todos de desalinhamento de vocabulário entre chamadas de LLM independentes —
não bugs de lógica isolados, mas a mesma classe de risco batendo em três lugares:

1. **Nome de chave exato quebrou de verdade.** A extração do pedido nomeou o requisito
   `"Duração da bateria"`; `generate_optimized_content` extraiu a mesma spec como
   `"Autonomia da bateria"`. Igualdade exata nunca casava os dois.
2. **Substring não expressa "≥ N".** O pedido pede "pelo menos 20 horas", mas o dado
   estruturado é prosa (`"Até 28 horas com o estojo"`) — não existe, nem existiria,
   confirmação por substring para uma comparação numérica de mínimo. Essa exigência nunca
   tinha sido implementada para nada além de `MaxPrice`.
3. **Substring positivo em cima de frase negada.** O Corvo Sport 2 (controle "sem ANC")
   tem descrição real "Ele não tem cancelamento de ruído ativo, e isso foi decisão de
   projeto" — a extração aterrissa isso como `"Não possui cancelamento de ruído ativo"`,
   que **contém literalmente a palavra "ativo"**. `Contains("ativo")` confirmava o
   requisito com um produto que explicitamente não tem a característica.

**O que mudou** (`Tools/BuyerAgentDecisionEngine.cs`, `Tools/BuyerAgentSimulatorTools.cs`,
novo `Tools/BeforeAfterComparisonTools.cs`):

- Nova tool MCP `compare_buyer_agent_rounds`: extrai os requisitos do pedido **uma única
  vez** e aplica o mesmo `BuyerOrderRequirements` às duas rodadas (evita que
  não-determinismo do AI Gateway mude o que está sendo perguntado entre "antes" e
  "depois", não só o que o catálogo consegue confirmar). Devolve
  `BeforeAfterComparisonResult`: por produto, confirmado/faltante nas duas rodadas,
  classificação esperada vs. real, e o resumo de cada rodada (contagem, taxa, delta) —
  é o objeto serializável que o ticket exige; a view do ticket 14 consome isso direto.
- `BuyerFilterOutcome` ganhou `ConfirmedRequirements` (antes só tinha
  `UnmetRequirements`) — necessário para o "confirmado vs. faltante" estruturado.
- Casamento de nome de atributo ganhou um fallback: exato primeiro, e se não achar,
  qualquer palavra significativa (>2 letras, sem preposição) compartilhada entre o nome
  do requisito e a chave do atributo. Resolve o caso #1 sem hardcodar vocabulário.
- Novo `BuyerNumericMinimumRequirement` (nome, valor mínimo, unidade) tratado à parte de
  `BuyerAttributeRequirement`, igual o `MaxPrice` já era: extrai o primeiro número do
  valor estruturado (regex) e compara numericamente. Resolve o caso #2. A extração de
  requisitos ganhou o campo `minNumericRequirements` no prompt e no parsing.
- Confirmação de valor ganhou detecção de negação: acha o match, isola a cláusula (corta
  em `. ; , :`) e rejeita se essa cláusula contém `não/nao/nunca/nenhum/sem `. Resolve o
  caso #3. Também ajustei o prompt de extração para nunca usar `"sim"/"não"` como
  `expectedValue` de uma característica liga/desliga (pedia para descrever a condição
  como uma ficha técnica descreveria — "ativo", "IPX7" — não uma resposta binária),
  porque `"sim"` como termo de busca é curto demais para ser seguro contra falso positivo
  por substring.
- Prompt de extração também parou de promover "bluetooth" (mencionado só como parte de
  "fone bluetooth") a requisito próprio — a primeira tentativa de consertar "Tipo de
  produto" criou um requisito `"Conectividade"` que a geração nunca preenche com esse
  nome exato, derrubando os 3 candidatos legítimos por um motivo que o spec da demo nunca
  pretendeu ser um gate.
- 8 testes novos em `BuyerAgentDecisionEngineTests` (mínimo numérico atingido/não
  atingido, casamento por sinônimo de chave, negação na mesma cláusula vs. cláusula
  anterior) e 3 em `BeforeAfterComparisonToolsTests` (delta ponta a ponta, produto sem
  expectativa fica fora do denominador, catálogos com handles diferentes lançam erro).
  `dotnet test` a partir de `apps/mcp-server/`: **45 passed, 0 failed**.

**Resultado real, pedido A, contra o catálogo congelado da 17** (harness C# descartável,
mesmo padrão da 03 — instancia os serviços como o `Program.cs` faz e chama as tools de
verdade; apagado depois de confirmar; catálogo "depois" gerado com
`generate_optimized_content` real, não hardcoded):

| Rodada | Classificados corretamente | Taxa |
|---|---|---|
| Antes | 4/7 | 57% |
| Depois | 7/7 | 100% |
| **Delta** | **+3** | **+43pp** |

Os 4 controles são rejeitados nas duas rodadas, e na rodada "depois" cada um pelo motivo
exato previsto no spec: Corvo Sport 2 → `"Não possui cancelamento ativo (isolamento
passivo)" não confirma 'ativo'`; Orbe Link 4 → `'Bateria' = '14h' abaixo do mínimo de
20.0h`; Nimbo Mini → os dois motivos juntos; Vetor Reference 900 → `Preço R$1.290,00
acima do limite de R$300,00`. Os 3 candidatos legítimos (Aurora NC7, Vetor Studio One,
Halo Air Pro) falham em "antes" por ausência de dado estruturado e passam em "depois" —
é o delta que o ticket pede. Resultado completo salvo em
`.scratch/catalogo-demo/comparison-pedido-a.json` (saída real de `compare_buyer_agent_rounds`,
não reconstruído à mão).

**Custo.** Saldo do AI Gateway (`AI_PROVIDER_CREDITS`, provider `deco`) antes de qualquer
chamada desta sessão de trabalho: **631 centavos**. Depois da rodada final limpa (7
chamadas de `generate_optimized_content` + 1 de extração de requisitos = 8 chamadas de
AI Gateway): **577 centavos** — mas esse número inclui também as chamadas gastas
depurando os três problemas acima (múltiplas rodadas completas + chamadas avulsas de
diagnóstico). Uma rodada limpa isolada (comparada a uma medição intermediária feita a
meio do trabalho) ficou em **~9 centavos para as 8 chamadas** — bem abaixo do orçamento
de US$ 6,99 e compatível com a 18 rodar os outros três pedidos sem risco de estourar.
