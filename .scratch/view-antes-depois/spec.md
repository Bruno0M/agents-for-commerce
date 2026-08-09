# Spec — A tela do exame: "o que o agente comprador viu vs. o que faltou"

**Status:** ready-for-agent

**Escopo desta spec:** só a UI/UX, num app React/TS/Vite novo em `apps/`, alimentado por
**dados mockados**. Nenhuma chamada de rede, nenhuma mudança no servidor .NET, nenhum
handshake de MCP App. O objetivo é ver as telas de pé e descobrir, olhando, o que o contrato
de dados precisa carregar.

**Relação com o issue tracker:** é o desdobramento de
`.scratch/entrega-hackathon/issues/14-mcp-app-view.md`. A 14 continua sendo o ticket da
integração (resource MCP + `_meta.ui.resourceUri` + handshake); esta spec é a tela que a 14
vai renderizar, construída antes e separada dela.

---

## Problem Statement

O número do projeto — "3 de 7 produtos passaram antes, 6 depois" — hoje existe só como um JSON
de 9 KB em `.scratch/catalogo-demo/comparison-pedido-a.json`. Ninguém que não escreveu o
código consegue olhar aquilo e entender o que aconteceu.

Isso é um problema porque **o produto é o exame, não o remédio**
(`docs/o-que-estamos-construindo.md` §5). Um número dito em voz alta — "34 vira 38" — é uma
afirmação que o ouvinte tem que aceitar por confiança. E confiança é exatamente o que falta,
porque a objeção óbvia contra qualquer ferramenta desse tipo é: *"vocês não consertaram nada,
vocês só afrouxaram o filtro na segunda rodada"*.

Quem olha o resultado hoje — o jurado da hackathon, o lojista, e quem está depurando as
rodadas — não tem como responder três perguntas, e elas vêm sempre nesta ordem:

1. **Quanto da minha loja é invisível pra IA?** — o número.
2. **Quais produtos, e por quê?** — a rejeição, produto a produto, com o motivo.
3. **Como sei que isso não é mentira?** — a evidência: o que o robô procurou, o que a loja
   realmente tinha, e onde a informação estava o tempo todo.

A pergunta 3 é a que ninguém responde, e é a que separa um exame de mais um dashboard. Sem
ela, a tela lê como ferramenta de conteúdo — que é commodity — em vez de instrumento de
medição, que é o fosso.

Há ainda um problema secundário, real e presente: a rodada gravada em
`comparison-pedido-a.json` tem **delta zero**. Os 3 candidatos legítimos continuam reprovando
no "depois" porque `'Tipo de produto' = 'Fones de ouvido'` não confirma `'fone bluetooth'` e
`'Duração da bateria'` nunca foi extraída. É o risco de desalinhamento de vocabulário
registrado no comentário de 05/08 do ticket 04, mordendo já no pedido A. Hoje só se descobre
isso lendo JSON com o olho.

## Solution

Um app React/TS/Vite em `apps/comparison-view/` que recebe um resultado de comparação
antes/depois e o desenha como um **exame**: placar no topo, grade produto × requisito no meio,
evidência por requisito no drill-down.

Nesta spec o resultado vem de fixtures mockadas — várias, cobrindo o cenário do pitch, o
cenário de delta zero que a rodada real produz hoje, e os estados de borda. A tela é uma
função pura do dado; de onde o dado vem é problema de outra spec.

A regra visual que sustenta a resposta à pergunta 3, e que é a decisão de design mais
importante desta spec:

> **Cor significa acerto de classificação. Símbolo significa passou ou foi rejeitado.**

Um produto de controle que *devia* ser rejeitado e foi rejeitado é **verde** com símbolo de
rejeição. Se cor significasse "passou", os 4 controles apareceriam como falha vermelha e o
delta pareceria vir de afrouxar o filtro — que é exatamente a objeção. Com essa regra, a tela
mostra o agente acertando ao rejeitar, e o delta fica honesto.

---

## User Stories

**Como jurado da hackathon, olhando a tela por 40 segundos**

1. Como jurado, quero ver o pedido em linguagem natural que originou o teste, para entender
   que o insumo é uma frase de gente, não uma configuração.
2. Como jurado, quero ver os requisitos que o agente extraiu daquele pedido, para entender
   que existe uma leitura de máquina no meio e qual foi ela.
3. Como jurado, quero ver o número antes e depois lado a lado com o delta em destaque, para
   captar o resultado sem ler nada mais.
4. Como jurado, quero ver qual produto o agente escolheu em cada rodada, para entender que
   antes ele saía da loja sem comprar nada.
5. Como jurado, quero ver os produtos separados entre "deviam passar" e "deviam ser
   rejeitados", para saber que existe gabarito e que o teste não é auto-confirmatório.
6. Como jurado, quero ver os controles sendo rejeitados nas duas rodadas e isso contando como
   acerto, para descartar a hipótese de que o filtro foi afrouxado.
7. Como jurado, quero clicar num produto rejeitado e ver o motivo exato, para confirmar que o
   sistema sabe explicar a própria decisão.
8. Como jurado, quero ver o trecho da descrição onde a informação já estava escrita, para
   entender que o produto nunca foi ruim — só ilegível.

**Como lojista, tentando entender o que fazer com isso**

9. Como lojista, quero ver quais dos meus produtos foram descartados, para saber onde estou
   perdendo venda sem saber.
10. Como lojista, quero ver, por produto, quais requisitos foram confirmados e quais faltaram,
    para saber o que exatamente está faltando em cada um.
11. Como lojista, quero ver de onde veio cada dado confirmado (opção de variante, metafield,
    tipo de produto, extraído da descrição), para saber onde preencher.
12. Como lojista, quero ver o valor que o agente encontrou quando ele encontrou algo mas
    rejeitou mesmo assim, para entender que o problema pode ser o valor, não a ausência.
13. Como lojista, quero ver a taxa de sucesso como fração e não só como porcentagem, para
    entender o tamanho da amostra.
14. Como lojista, quero distinguir "o agente não achou o dado" de "o agente achou e o dado
    reprovou", porque são dois consertos diferentes.

**Como apresentador, gravando o vídeo de submissão**

15. Como apresentador, quero que a mesma tela mostre antes e depois simultaneamente, para não
    depender de corte de vídeo entre dois estados.
16. Como apresentador, quero que a transição de uma célula vermelha para verde seja
    visualmente evidente numa varredura de olho, para que o espectador veja a mudança sem eu
    narrar célula a célula.
17. Como apresentador, quero que a tela seja legível em captura de tela estática, para poder
    usá-la no README de submissão sem gravar nada.
18. Como apresentador, quero poder trocar entre fixtures durante a apresentação, para mostrar
    mais de um pedido sem recarregar nada.

**Como quem está depurando as rodadas (o desenvolvedor)**

19. Como desenvolvedor, quero ver a rodada de delta zero renderizada sem a tela parecer
    quebrada, porque é o resultado real de hoje e eu preciso lê-lo.
20. Como desenvolvedor, quero ver lado a lado o nome do requisito que o agente procurou e o
    nome do atributo que o produto tem, para diagnosticar desalinhamento de vocabulário de
    relance.
21. Como desenvolvedor, quero que um requisito que falha em *todos* os produtos nas duas
    rodadas seja visualmente destacado, porque isso quase sempre é bug de extração, não
    catálogo pobre.
22. Como desenvolvedor, quero ver produtos que estão fora do denominador da taxa de sucesso
    marcados como tal, para não confundir "não avaliado" com "reprovado".
23. Como desenvolvedor, quero trocar de fixture pela própria interface, para conferir os
    estados de borda sem editar código.
24. Como desenvolvedor, quero que a tela funcione com qualquer quantidade de produtos e
    requisitos, para ela não quebrar quando a 18 rodar os pedidos B, C e D.

**Estados de borda**

25. Como usuário da tela, quero ver uma mensagem clara quando nenhum produto passou em nenhuma
    das duas rodadas, em vez de uma grade toda vermelha sem explicação.
26. Como usuário da tela, quero ver o delta zero apresentado como resultado legítimo e não
    como erro, com o motivo visível na grade.
27. Como usuário da tela, quero ver um delta negativo apresentado honestamente, caso a
    otimização piore alguma classificação.
28. Como usuário da tela, quero que um produto sem expectativa registrada apareça na grade mas
    fora da contagem, com essa condição sinalizada.
29. Como usuário da tela, quero que a tela seja utilizável em telas estreitas, com a grade
    rolando na horizontal em vez de espremer as colunas.

---

## Implementation Decisions

### Onde mora

App novo em `apps/comparison-view/`, irmão de `apps/mcp-server/` e `apps/storefront/`. Nome em
inglês para acompanhar os irmãos, e alinhado ao vocabulário do domínio: a tool é
`compare_buyer_agent_rounds`, o tipo de retorno é `BeforeAfterComparisonResult`.

### Stack

- **React 19 + TypeScript + Vite.**
- **Tailwind v4** (`@import "tailwindcss"`, sem arquivo de config). Escolhido por velocidade e
  porque compila para um único bloco de CSS — o que mantém aberto o caminho de inlinar tudo
  num arquivo só quando a 14 for feita.
- **Sem router.** É uma página; o drill-down é estado local.
- **Sem gerenciador de estado.** O dado é uma prop; o único estado é qual linha está
  expandida e qual fixture está selecionada.
- **Nenhuma dependência de rede, fonte externa ou CDN**, mesmo sem CSP nesta etapa — é o
  hábito que evita retrabalho quando a restrição chegar.

### O contrato que a UI consome

A UI é tipada contra um espelho **enriquecido** do `BeforeAfterComparisonResult` do servidor.
Duas diferenças deliberadas em relação ao que o .NET devolve hoje:

1. **Evidência estruturada em vez de frases prontas.** Hoje o engine devolve
   `ConfirmedRequirements`/`UnmetRequirements` como `IReadOnlyList<string>` já formatada em
   PT-BR (`"Sem dado estruturado para confirmar 'Cancelamento de ruído'."`). Isso é suficiente
   para listar frases e insuficiente para montar grade por requisito ou mostrar origem do
   dado. A UI assume um record por requisito.
2. **`before`/`after` aninhados** em vez de oito campos achatados com sufixo. É a mesma
   informação, mais fácil de percorrer numa tabela.

```ts
type RequirementEvidence = {
  requirement: string;   // "Cancelamento de ruído" — o que o agente procurou
  expected: string;      // "ativo"
  confirmed: boolean;
  foundValue: string | null;  // "Ativo, com captação por microfone duplo" | null
  source: DataSource | null;  // de onde o valor veio; null quando nada foi achado
  message: string;            // a frase pronta em PT-BR, para tooltip e leitura corrida
};

type DataSource = "option" | "metafield" | "generated" | "productType" | "price";

type RoundOutcome = {
  passed: boolean;
  correctlyClassified: boolean | null;  // null quando não há expectativa registrada
  evidence: RequirementEvidence[];      // um por requisito, na mesma ordem em todos os produtos
};

type ProductComparison = {
  productId: string;
  handle: string;
  title: string;
  descriptionExcerpt: string | null;  // o trecho onde a informação já estava — a prova
  expectedToPass: boolean | null;
  before: RoundOutcome;
  after: RoundOutcome;
};

type RoundSummary = {
  correctlyClassifiedCount: number;
  totalClassifiedProducts: number;
  successRate: number;
  chosenProductTitle: string | null;
  justification: string;
};

type ComparisonResult = {
  naturalLanguageOrder: string;
  requirements: { name: string; expected: string }[];
  maxPrice: number | null;
  products: ProductComparison[];
  before: RoundSummary;
  after: RoundSummary;
  successRateDeltaCount: number;
  successRateDelta: number;
};
```

O preço entra como mais um `RequirementEvidence`, com `requirement: "Preço"` e
`source: "price"`, para a grade ter colunas homogêneas. O `MaxPrice` no topo continua
existindo para exibição no cabeçalho.

**Consequência assumida:** quando a integração real for feita, ou o record .NET é enriquecido
para produzir essa forma, ou se escreve um adaptador fino. Qual dos dois é decisão de outra
spec. O que esta spec fixa é *o que a tela precisa* — e o `descriptionExcerpt` e o `source`
são dados que o servidor **não produz hoje**, o que é o principal achado a ser levado adiante.

### Composição da tela

Três blocos, uma página, de cima para baixo:

**1. Cabeçalho — o placar.**
O pedido em linguagem natural em destaque, entre aspas. Abaixo dele, os requisitos extraídos
como chips (`Tipo de produto = fone bluetooth`, `Preço ≤ R$ 300`), deixando visível a leitura
que a máquina fez da frase. À direita, o número: `3/7 → 6/7` com o delta (`+3`) como elemento
tipograficamente dominante da página inteira. Sob o número, uma linha secundária com o produto
escolhido em cada rodada — incluindo, quando for o caso, "nenhum", que é o dado mais forte da
tela.

**2. Grade — o exame.**
Linhas são produtos, colunas são requisitos. A grade é dividida em dois grupos rotulados,
**"Deviam passar"** e **"Deviam ser rejeitados"**, e produtos sem expectativa vão para um
terceiro grupo, **"Fora da contagem"**.

Cada célula carrega os dois estados, antes e depois, como dois marcadores adjacentes — não
duas grades lado a lado. Uma grade só é o que faz a transição vermelho → verde ser lida numa
varredura de olho e o que mantém a tela útil em captura estática.

Cada linha tem, à esquerda, o título do produto e um selo de veredito da linha mostrando a
transição de classificação (por exemplo, errou antes → acertou depois).

A regra de cor e símbolo, aplicada em toda a grade:

| | símbolo | cor |
| --- | --- | --- |
| Devia passar e passou | passou | acerto |
| Devia passar e foi rejeitado | rejeitou | erro |
| Devia ser rejeitado e foi rejeitado | rejeitou | **acerto** |
| Devia ser rejeitado e passou | passou | erro |
| Sem expectativa registrada | conforme o resultado | neutro |

Uma coluna de requisito que falha em todos os produtos nas duas rodadas recebe destaque no
cabeçalho — é o sinal de desalinhamento de vocabulário, e é diagnóstico, não decoração.

**3. Drill-down — a evidência.**
Clicar numa linha expande um painel embaixo dela, sem sair da página. Para cada requisito,
três colunas: o que o agente procurou (nome + valor esperado), o que a loja tinha antes (valor
encontrado e origem, ou a ausência explícita), e o que a loja tinha depois. Quando existe
`descriptionExcerpt`, ele aparece com o trecho relevante destacado, sob um rótulo que diz o
que ele significa — que a informação estava lá o tempo todo, em prosa, e a máquina não teve
como confirmá-la. É a imagem do currículo descartado de
`docs/o-que-estamos-construindo.md` §2, e é a resposta à pergunta 3.

### Fixtures

Em `src/fixtures/`, tipadas contra `ComparisonResult`, com um seletor no canto da tela para
alternar entre elas:

| Fixture | Origem | Para que serve |
| --- | --- | --- |
| `pedidoA-delta-positivo` | construída à mão a partir do catálogo de demo | o cenário do pitch: 3 candidatos passam a passar, 4 controles rejeitados nas duas rodadas |
| `pedidoA-delta-zero` | derivada de `.scratch/catalogo-demo/comparison-pedido-a.json` | o resultado **real** de hoje: delta zero por desalinhamento de vocabulário |
| `nenhum-passou` | à mão | nenhum produto confirma nada nas duas rodadas |
| `delta-negativo` | à mão | uma classificação piora depois da otimização |
| `sem-expectativas` | à mão | produtos fora do denominador |

A fixture `pedidoA-delta-zero` não é enfeite: é o estado que o projeto está vivendo, e a tela
tem que torná-lo legível em vez de parecer quebrada. Os campos que o servidor ainda não produz
(`source`, `descriptionExcerpt`) são preenchidos à mão nela, o que já vale como demonstração
do que precisa ser adicionado ao contrato.

### Módulos

- Um componente de topo que recebe `ComparisonResult` e desenha tudo. Ele é a fronteira
  pública do app — o `App` só escolhe a fixture e o passa adiante. Quando a integração real
  vier, é esse componente que os dois consumidores (front próprio e view do Studio)
  compartilham sem alteração.
- Um módulo puro de derivações (classificação de célula, veredito de linha, detecção de coluna
  que falha em tudo, agrupamento por expectativa). Sem React, testável direto.
- Componentes de apresentação para cabeçalho, grade e painel de evidência.

---

## Testing Decisions

**O que é um bom teste aqui.** Comportamento externo observável na tela renderizada, dada uma
fixture — não estrutura de componente, não nome de classe CSS, não estado interno. Um teste
que quebra quando a cor muda de tom é ruim; um que quebra quando um controle rejeitado passa a
ser contado como erro é bom.

**O seam.** Um só, e é o mais alto disponível: o componente de topo renderizado com uma
fixture. Tudo — cabeçalho, grade, drill-down — é observável a partir dali, e é exatamente a
fronteira que os dois consumidores futuros vão usar. Testar os componentes internos
separadamente multiplicaria seams sem cobrir nada a mais.

**Ferramenta.** Vitest + Testing Library. Vitest já vem com o Vite, então não entra toolchain
novo no repositório.

**Prior art.** Não há testes de front no repo — `apps/storefront/` não tem suíte. A referência
de estilo é o que `apps/mcp-server/McpServer.Tests/` já faz e que vale trazer: nome de teste
descrevendo o comportamento e a condição
(`BuildComparison_LegitimateCandidateFailsBeforeAndPassesAfter_MatchesExpectedClassificationBothRounds`),
e fixtures que espelham o catálogo de demo real em vez de dados genéricos.

**O que é testado**, com uma fixture por caso:

1. O delta e as duas taxas aparecem com os valores da fixture.
2. Um controle rejeitado nas duas rodadas é apresentado como acerto, não como falha — é a
   asserção que protege a decisão de design central.
3. Um candidato legítimo que reprova antes e passa depois mostra a transição na linha.
4. A fixture de delta zero renderiza a grade completa sem estado de erro.
5. Expandir uma linha revela o valor encontrado e a origem do dado daquele produto.
6. Um produto sem expectativa registrada aparece na grade e fora da contagem.

**O que não é testado.** Aparência, layout, responsividade e animação — validados a olho. A
fidelidade das fixtures ao servidor também não, porque nesta etapa não há servidor no
circuito.

---

## Out of Scope

- **Toda a integração MCP**: resource HTML, `_meta.ui.resourceUri`, handshake `ui/initialize`,
  bundle em arquivo único, fixar a view na org. É o ticket 14.
- **Qualquer mudança no servidor .NET**, incluindo o enriquecimento do contrato que esta spec
  assume. Vira ticket próprio, informado pelo que a tela mostrar.
- **Chamada de rede de qualquer natureza**, e portanto CORS, token no browser e cliente
  JSON-RPC. Os dados são fixtures no bundle.
- **Deploy.** Roda em `dev` local.
- **Re-rodar a comparação com outro pedido.** O seletor troca de fixture, não dispara nada.
- **Histórico de rodadas, comparação entre pedidos diferentes, gráficos de tendência.** Nada
  disso responde às três perguntas, e histórico é o que puxaria banco de dados — que
  continua fora: a linha de base já é artefato versionado (ticket 17) e o resultado congelado
  é escopo da 18.
- **Navegação de catálogo, edição de produto, tela de configuração, autenticação.**
- **Internacionalização.** A tela é em PT-BR, como o resto do material de submissão.

---

## Further Notes

**Por que a UI antes da integração.** O risco do ticket 14 é o handshake, não o CSS. Separar
as duas coisas deixa cada uma falhar sozinha: se o handshake não subir, a tela ainda existe e
é apresentável no front próprio; se a tela ficar feia, o handshake já está provado. A ordem
inversa — integrar primeiro, desenhar depois — coloca as duas incertezas no mesmo passo.

**O que esta spec deve produzir além da tela.** Uma lista do que o contrato do servidor
precisa passar a carregar. Já se sabe de dois itens, ambos necessários para a pergunta 3 e
ambos ausentes hoje: a **origem de cada dado confirmado** (`source`) e o **trecho da descrição
onde a informação já estava** (`descriptionExcerpt`). Se a construção da tela revelar outros,
eles entram na mesma lista.

**A tela é ferramenta de diagnóstico, não só peça de pitch.** A fixture de delta zero existe
por isso. O desalinhamento de vocabulário registrado no ticket 04 — `'Fones de ouvido'` não
confirmando `'fone bluetooth'`, `'Duração da bateria'` nunca extraída — é hoje invisível fora
do JSON, e é o risco existencial do projeto segundo `docs/briefing-consolidado.md` §9. Uma
coluna inteira em vermelho nas duas rodadas nomeia esse bug de relance.

**Vocabulário.** A tela usa os termos de `apps/mcp-server/CONTEXT.md`: *agente comprador*,
*requisito obrigatório*, *sucesso de compra*, *legibilidade agêntica*. Não usa "conversão",
"filtro", "critério de busca" nem "qualidade de conteúdo", que são os `Avoid` registrados lá.
Na tela em si, os três termos proibidos para leigo em
`docs/o-que-estamos-construindo.md` §4 — MCP, schema.org e GEO — não aparecem.

**Nome do app.** `comparison-view` acompanha `BeforeAfterComparisonResult` e
`compare_buyer_agent_rounds`. Se a tela crescer para além da comparação antes/depois, o nome
precisa ser revisto junto.

---

## Emendas

### 08/08/2026 — o app foi aposentado; a tela, não

Os tickets 01–04 desta spec estão `done` e entregaram ~1.100 linhas — `ComparisonView`,
`RequirementsGrid`, `EvidencePanel`, `Scoreboard`, `lib/grid.ts`, `types.ts`, 5 fixtures e
testes. **Esse resultado continua inteiro.** O que muda é o endereço: o desenvolvimento passou a
seguir só no `apps/web/`, e `apps/comparison-view/` deixa de ser um app — o conteúdo migra, com
os testes. Ticket 04 da `exame-guiado` é o dono da migração.

A questão do nome, levantada acima, resolveu-se sozinha por esse caminho: a tela não cresceu para
além da comparação antes/depois — **o que cresceu foi o que existe em volta dela** (as 5 fases do
exame guiado), e isso ficou fora do componente de propósito. Ele continua função pura do
`BeforeAfterComparisonResult`, que é o que permite a view do Studio (ticket 14 da
`entrega-hackathon`) usar o mesmo fonte sob CSP `connect-src 'none'`.

As fixtures são o ativo menos óbvio da migração e o mais fácil de perder: são elas que fazem o
modo fixture das cinco fases existir enquanto o servidor não está no ar.

O ticket 05 (`achados-do-contrato`) segue aberto e não é afetado — ele virou os tickets 02 e 08
da `exame-guiado`, que são de servidor.
