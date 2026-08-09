# 01 — Leitura do catálogo inteiro

**What to build:** hoje não existe forma de perguntar "quais são os produtos desta loja".
`get_product_content` lê **um** handle por chamada, e os 7 produtos do catálogo de demo foram
capturados um a um por um harness C# descartável. Depois deste ticket, uma única chamada
devolve o catálogo inteiro da loja configurada no mesmo formato `ProductCatalogContent` que o
resto da cadeia já consome — a fase 1 do fluxo passa a ter de onde tirar dado, e o buraco 1 do
Problem Statement da spec fecha.

A paginação da Admin GraphQL é resolvida dentro da tool, não pelo caller: quem chama pede o
catálogo e recebe o catálogo. A tool não faz **nenhuma** chamada de LLM — é a ponta barata da
assimetria de custo que ordena o fluxo inteiro (§"A assimetria de custo que confirma a ordem").

O formato de saída é o mesmo item que `get_product_content` já devolve, sem campo novo e sem
variação de shape. Isso não é economia de esforço: `simulate_buyer_agent`,
`compare_buyer_agent_rounds` e `generate_optimized_content` recebem esse tipo como entrada, e
qualquer divergência aqui vira conversão em três lugares.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Uma chamada devolve todos os produtos da loja configurada, sem o caller precisar saber
      handles de antemão
- [x] Cada item tem exatamente o mesmo shape que `get_product_content` devolve hoje — a saída
      pode ser passada direto para `simulate_buyer_agent` sem conversão
- [x] A paginação da Admin GraphQL é resolvida dentro da tool; catálogos acima de uma página
      voltam completos
- [x] Zero chamadas ao AI Gateway neste caminho
- [x] Existe um limite/teto explícito de produtos lidos, com o comportamento documentado na
      descrição da tool — uma loja de 400 produtos não pode virar uma resposta que ninguém
      consegue consumir por acidente
- [x] Há teste cobrindo a montagem da resposta a partir de mais de uma página de resultado
