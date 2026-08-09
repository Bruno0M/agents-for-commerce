# 07 — Evidência estruturada: `source` e `descriptionExcerpt`

**What to build:** os itens 4 e 5 da tabela "o que o servidor precisa passar a produzir". Hoje
o requisito confirmado é uma frase pronta — `'Cancelamento de ruído' = 'ANC ativo'.` — e ela
não diz **de onde** o valor veio nem **onde ele já estava escrito**. Depois deste ticket, cada
dado confirmado carrega sua origem, e cada produto carrega o trecho da própria descrição onde a
informação já existia em prosa.

Não é enriquecimento cosmético; são as duas coisas sem as quais o drill-down de evidência não
existe, e a segunda é a **prova** do argumento central da ferramenta:

- **`source`** — opção de variante, metafield, tipo de produto, preço, ou extraído da descrição.
  Sem isso o lojista vê uma afirmação e tem que acreditar. Com isso ele vê a afirmação e a
  procedência.
- **`descriptionExcerpt`** — o trecho onde a informação já estava, solta, sem estrutura. É a
  prova de que **o produto nunca foi ruim, só ilegível**. Sem ele, a fase 4 vira "o robô
  reescreveu meu texto" em vez de "o robô promoveu a campo estruturado o que eu já tinha
  escrito". É a diferença entre a ferramenta parecer um gerador e parecer um exame.

Isto já estava registrado como achado da `.scratch/view-antes-depois/issues/05` — a tela foi
construída consumindo esses campos de fixture, e o servidor não os produz de forma alguma. O
`types.ts` da `comparison-view` já os declara; este é o ticket que faz o dado real aparecer no
lugar do mock.

**Sobre a aresta de bloqueio:** o 02 não gate este ticket por lógica, e sim por mecânica — os
dois mexem no mesmo par de records de saída, e em paralelo se atropelam. Sequenciar evita
reescrever o adaptador da view duas vezes.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Cada requisito confirmado carrega a origem do dado como valor do contrato (opção,
      metafield, tipo de produto, preço, extraído da descrição) — não embutida na frase
- [ ] Cada produto carrega o trecho da descrição onde a informação já aparecia em prosa, quando
      existe
- [ ] Quando não existe trecho, o campo é explicitamente ausente — não string vazia disfarçada
- [ ] Os campos chegam até a saída de `compare_buyer_agent_rounds`, não param no engine
- [ ] A forma dos campos casa com o que o `types.ts` da `comparison-view` já declara — a tela
      passa a consumir dado real sem mudar de shape
- [ ] As frases legíveis existentes continuam com o mesmo texto
- [ ] Há teste no engine cobrindo cada origem possível e o caso sem trecho
