# Spec — O catálogo como superfície do exame

**Status:** ready-for-agent

**Escopo desta spec:** substituir o wizard de 5 fases por uma superfície única — a tabela do
catálogo — onde o exame acontece, o resultado mora, o conserto é disparado e o envio para
aprovação sai. Cobre o desenho da tela, o contrato de agregação que ela consome e a ordem de
construção. **Não** cobre multi-loja, descoberta, nem a mecânica interna do
`BuyerAgentDecisionEngine`.

**Relação com o que já existe:**

- `.scratch/exame-guiado/issues/spec.md` é dona do **fluxo** (medir antes de gerar, natureza do
  motivo, congelamento dos pedidos, gate humano). Esta spec **não revoga nenhuma decisão dela** —
  ela troca a *forma de navegação* (wizard → catálogo) e mantém todas as regras. Onde as duas
  falarem do mesmo assunto, o `exame-guiado` continua sendo dono da regra e esta spec, da tela.
- `.scratch/view-antes-depois/spec.md` é dona do `ComparisonView` e da regra anti-fork. Esta spec
  **preserva a pureza do componente** e explica onde ele passa a ser renderizado.
- Os tickets `05` (transporte), `08` (evidência) e `11` (linha de base) do `exame-guiado`
  **continuam válidos e não são reescritos aqui** — esta spec depende deles e diz onde.

---

## Problem Statement

O wizard existe, tem casca (`ExamWizard.tsx`), tem a fase 3 inteira funcionando
(`apps/web/src/diagnosis/`) e prova o gancho do produto. Ele também tem três defeitos
estruturais, e nenhum deles se conserta dentro da forma "wizard".

**1. A fase 1 é um passo decorativo.** O D5 do `exame-guiado` já admite: domínio e credenciais da
Shopify são lidos no boot e o factory é singleton para uma loja só. "Conectar" é uma tela que
mostra uma loja que já estava conectada. Um fluxo linear que abre com um passo que não faz nada
gasta o primeiro clique do lojista — e o primeiro clique é onde o gancho deveria estar.

**2. A fase 3 não escala.** `DiscardedProductCard` é um cartão por produto descartado. Com o
catálogo de demo (7 produtos) funciona; com a loja real que o ticket 09 da `entrega-hackathon`
vai colocar no ar, vira rolagem infinita sem ordenação, sem filtro e sem forma de responder
"por onde eu começo". A pergunta operacional do lojista — *qual produto conserto primeiro* — não
tem resposta na tela.

**3. O wizard não tem para onde voltar.** Ele é um fluxo de mão única: termina na fase 5 e acaba.
O ticket 11 do `exame-guiado` já nomeia o problema pelo lado do dado ("a fase 1 tem duas caras, e
só uma está descrita"), mas o problema é de forma: **um test suite que se apresenta como wizard
diz que roda uma vez.** O `o-que-estamos-construindo.md` chama isto de test suite; adicionar
produto é o commit e o exame é o CI. CI não é wizard.

E há uma quarta coisa, que não é defeito do wizard e sim ativo desperdiçado: **a tabela do
catálogo já existe** (`apps/web/src/components/catalog-page.tsx`), já lê a loja de verdade via
`GET /catalog` (`Program.cs:107`), e é inerte — seis colunas descritivas e nenhum juízo. É a
única tela do app que fala do objeto que o lojista tem na cabeça.

### O erro de desenho que esta spec existe para evitar

Trocar o wizard pela tabela tem um modo de falha específico, e ele é fatal:

> Uma tabela com uma coluna de status verde/vermelho **é um linter**. O `o-que-estamos-construindo.md`
> §2 diz que o produto é *"aquele número saindo de 34 pra 38"*. Um placar é um número; uma tabela
> é um estado. Se a migração perder o número, ela converte o exame em ferramenta de qualidade de
> conteúdo — que é exatamente a commodity contra a qual o projeto se define.

Toda a §"Implementation Decisions" abaixo é, em algum grau, defesa contra esse modo de falha.

## Solution

Uma superfície só, com quatro faixas empilhadas:

```
┌──────────────────────────────────────────────────────────────────┐
│ PLACAR      antes 34/40  →  depois 38/40      (+4)               │  fixo, sempre visível
├──────────────────────────────────────────────────────────────────┤
│ EXAME       [Rodar Agente de Simulação]  4 pedidos, sempre à vista │  o eixo, sempre visível
├──────────────────────────────────────────────────────────────────┤
│ CONTROLES   ordenar: perda silenciosa ▾   filtro: ⚠ ilegíveis    │
├──────────────────────────────────────────────────────────────────┤
│ TABELA      produto │ estado │ perdido em │ motivo │ ação         │  a linha abre o drill-down
└──────────────────────────────────────────────────────────────────┘
```

O fluxo das 5 fases não morre — ele deixa de ser navegação e vira **estado da mesma tela**:

| Fase do `exame-guiado` | Onde vive agora |
| --- | --- |
| 1 Conectar | estado vazio da tabela + rótulo da loja no cabeçalho |
| 2 Definir o exame | a faixa EXAME — um botão, pedidos sempre visíveis, sem edição |
| 3 Diagnóstico | as colunas da tabela + o número do placar |
| 4 Conserto e delta | seleção de linhas → ação em lote; drill-down por linha |
| 5 Enviar para aprovação | ação da faixa EXAME, com estado por linha |

A regra que ordena tudo continua sendo a do D1 do `exame-guiado`: **a primeira coisa que o
lojista vê é uma rejeição, não uma sugestão.** Nenhuma ação de conserto existe na tela antes de
o exame ter rodado.

---

## User Stories

**Como lojista com 400 produtos**, quero saber **por qual produto começar**, não receber uma
lista de 180 problemas — porque uma lista sem ordem é a mesma coisa que nenhum diagnóstico.

**Como lojista**, quero ver o produto e o veredito do robô na mesma linha, no lugar onde já
penso nos meus produtos — porque a unidade do meu trabalho é o SKU, não a etapa de um assistente.

**Como lojista**, quero distinguir *"o robô não conseguiu entender"* de *"o robô entendeu e disse
não"* sem precisar ler a frase inteira — porque só o primeiro é problema meu de conteúdo, e pagar
IA para consertar o segundo é jogar dinheiro fora.

**Como lojista**, quero ver as perguntas do exame a qualquer momento, sem refazer nada — porque
se as perguntas forem convenientes demais o exame não vale nada, e a tabela inteira é pontuada
contra elas.

**Como lojista que voltou duas semanas depois**, quero abrir a mesma tela e ver o estado atual da
loja — não recomeçar um assistente do zero.

**Como jurado da hackathon**, quero ver o catálogo inteiro mudar de cor de uma vez quando o
exame roda — porque o impacto do "sua loja é invisível" está no bloco, não no cartão.

---

## Implementation Decisions

### D1 — O placar é faixa fixa, não é a tabela

O número de topo (`illegibleProductCount`, e o antes→depois depois do conserto) mora numa faixa
sempre visível acima da tabela, e **não** é derivável visualmente contando linhas coloridas.
Motivo em "o erro de desenho" acima: sem o número, isto é um linter.

Consequência concreta: o `Scoreboard` da `view-antes-depois` (hoje `comparison/components/Scoreboard.tsx`,
desenhado para uma comparação de um pedido) ganha uma variante de faixa que fala da **loja
inteira**, agregada sobre todos os pedidos aprovados. Antes de o exame rodar a faixa não some —
ela mostra "não examinado", que é uma informação, não um vazio.

### D2 — Quatro estados por produto, nunca dois

"OK / precisa melhoria" é a forma errada do dado e custa dinheiro. Rejeição não é propriedade do
produto: é do par (produto × requisito). O `catalogo-demo/spec.md` tem de propósito o par A/B —
um pedido que faz **vencer** o produto que outro pedido **rejeitou**. Um booleano por linha apaga
essa prova.

| Estado | Definição sobre os pedidos aprovados | Ação disponível |
| --- | --- | --- |
| ✅ `passed` | não foi descartado por nenhum pedido | nenhuma |
| ⚠️ `illegible` | descartado, e **todos** os motivos são de ilegibilidade | **conserto** |
| ◐ `mixed` | descartado, com motivos das duas naturezas | conserto (com ressalva explícita) |
| ⭕ `legitimatelyRejected` | descartado, e **todos** os motivos são rejeição legítima | **nenhuma** |

O `aggregate.ts` já calcula a distinção que separa esses estados (`onlyIllegibilityReasons`) e o
`kind` nasce no ponto de criação do motivo (ticket 02 do `exame-guiado`, done) — **nenhuma camada
desta spec pode inferir natureza relendo `message`.** O que falta é a agregação manter os
produtos que passaram, hoje descartados pelo agregador.

A ressalva do `mixed` é a mesma do comentário em `aggregate.ts`: consertar o conteúdo não
recupera aquela venda, porque sobra um motivo correto. Ele não entra no número de topo e não some
da tabela.

**O rótulo da coluna fala do robô, não de qualidade.** `"O robô conseguiu avaliar?"`, com valores
como `Não confirmou 'ANC'`. Um cabeçalho escrito `Score` constrói um SEO checker por acidente de
copy.

### D3 — O eixo do exame fica visível; não é uma etapa de aprovação

> **Revisado em 09/08/2026** — a aprovação/edição explícita descrita abaixo na versão original
> desta seção foi implementada e depois cortada por decisão do dono do projeto. As falas literais
> e o porquê estão em `## Comments` do ticket 04 desta pasta; o desenho anterior (sheet +
> `OrderEditor` + gate de aprovação) fica preservado ali só como histórico. O que segue é a
> leitura atual.

Os pedidos continuam sendo a integridade do exame — a user story do `exame-guiado` não mudou uma
palavra: *"se as perguntas forem convenientes demais o exame não vale nada, e eu preciso
conseguir testar isso eu mesmo"*. O que mudou é **como** essa exigência é satisfeita. Um modal (ou
sheet) que o lojista abre e fecha continua sendo o hospedeiro errado — apaga o eixo contra o qual
cada linha foi pontuada assim que fecha, e deixa a tabela parecendo verdade absoluta sobre os
produtos. A correção não é trocar de hospedeiro: é não ter hospedeiro nenhum. Os pedidos em prosa
que o agente escreveu ficam **sempre visíveis na faixa EXAME**, sem clique nenhum para aparecer.

**Um único botão, "Rodar Agente de Simulação", substitui os dois cliques do desenho anterior**
(aprovar pedidos, depois rodar o exame). Ele dispara as duas chamadas do exame em sequência —
escrever os pedidos, depois rodar o agente comprador contra eles — e cada etapa aparece como
progresso honesto sobre a tabela conforme resolve, nunca atrás de um modal:

- **Job longo continua precisando de um hospedeiro que não seja modal** — esse motivo do desenho
  anterior não caiu. Só que agora não há modal nenhum a abrir: o progresso das duas etapas
  aparece direto na faixa EXAME, onde a mudança acontece.
- **Não existe mais edição de pedido, então não existe mais custo de comparabilidade a avisar.**
  O argumento antigo ("editar pedido cria linha de base nova", ticket 11 do `exame-guiado`) só se
  aplicava a um formulário que a tela não tem mais. O modelo de linha de base do ticket 11
  continua valendo palavra por palavra para quando o transporte existir — nada disso foi revogado,
  só deixou de ter uma affordance de edição no front para proteger.

Sem transporte real (`exame-guiado/05`, aberto), os pedidos que a tela mostra hoje são mockados no
formato exato do payload futuro — o seam é `diagnosis/lib/runSimulationAgent.ts`. "Editar um
requisito estruturado que nunca passou por geração de IA nenhuma" nunca foi auditoria de verdade;
era um formulário sobre um pedido que já entrava estruturado. Auditoria de verdade nasce com o
transporte, e nesse ponto ela já é "ver o pedido em prosa que o agente escreveu", que a faixa já
entrega.

### D4 — Ordenação por perda silenciosa, desempate por consertabilidade

"Ordenar" sem critério declarado vira alfabético, e alfabético não responde a pergunta do
lojista. A ordenação padrão é:

1. **Perda silenciosa** — em quantos dos pedidos aprovados o produto foi descartado por
   ilegibilidade. É "quantas vendas este produto está perdendo sem ninguém saber", que é a
   promessa da ferramenta expressa por linha.
2. **Consertabilidade** — desempate. Quando o `descriptionExcerpt` existir (ticket 08 do
   `exame-guiado`), produto cuja informação **já está na prosa** vem primeiro: é conserto de alta
   confiança e é a prova de que o produto nunca foi ruim, só ilegível. Enquanto aquele ticket não
   estiver pronto, o desempate degrada para menor número de motivos distintos de ilegibilidade —
   menos campos faltando, conserto mais barato.

Isso dá de graça o gancho de demo: as cinco primeiras linhas da ordenação padrão **são** o pitch.

### D5 — O contrato que a tabela consome é transposto, e ninguém o produz hoje

Este é o achado técnico mais caro da migração, e ele não aparece no desenho da tela:

| Contrato | Forma | Quem produz |
| --- | --- | --- |
| `DiagnosisResult` | catálogo × N pedidos → **produtos descartados** | `diagnosis/aggregate.ts` ✅ |
| `ComparisonResult` | **um** pedido → N produtos, com antes/depois | servidor, 1 por pedido |
| **o que a tabela precisa** | **um produto** → N pedidos, com estado, perda e antes/depois | **ninguém** |

`ComparisonResult.naturalLanguageOrder` é singular. Com 4 pedidos aprovados existem 4
`ComparisonResult`, e nada os agrega por produto. O `aggregateDiagnosis` já faz metade disso
(dedup por (produto, motivo) através dos pedidos) mas descarta os produtos que passaram e não
guarda **qual** pedido produziu cada motivo — sem essa atribuição não há perda silenciosa (D4)
nem drill-down por pedido.

**A agregação fica no front, como função pura, e o servidor não muda.** Motivo: a agregação é
aritmética sobre resultados que o servidor já sabe produzir; empurrá-la para o C# significaria um
contrato novo de saída em cima de uma véspera de entrega, para ganhar nada. O precedente já está
no repo — `aggregate.ts` foi construído assim, com as decisões de modelagem documentadas no
próprio arquivo.

### D6 — Conserto em lote, com requisitos congelados

Um botão de conserto por linha, disparando geração + re-simulação por clique, quebra duas coisas:
o custo (1 chamada de `generate_optimized_content` por produto, mais uma re-extração de
requisitos por clique) e a comparabilidade (o D4 do `exame-guiado`: reextrair do mesmo texto
devolve requisitos ligeiramente diferentes, e o delta vira ruído de LLM).

Então: seleção de linhas → **uma** passada de conserto → **um** delta no placar. A pré-visualização
de custo — *"isso vai gerar conteúdo em 12 produtos"* — aparece antes de rodar, como já exige o
ticket 09 do `exame-guiado`. O botão por linha pode existir dentro do drill-down como atalho de
"selecionar só este", nunca como caminho paralelo que pula a contagem de custo.

### D7 — A tabela é viva; o "antes" não é

`catalog-page.tsx` faz `fetchCatalog()` no mount — leitura viva da Shopify. Como tela de
consulta, correto. Como superfície do exame, é uma armadilha: depois que um conserto é publicado,
uma releitura devolve o produto **já otimizado**, e a coluna "antes" passa a mostrar o depois. O
antes/depois se apaga sozinho ao longo do tempo.

O "antes" vem da **passada congelada**, nunca de releitura. O modelo (passada / linha de base /
produto novo-alterado-inalterado) é do **ticket 11 do `exame-guiado`**, que esta spec promove de
"passo seguinte" a **pré-requisito duro** do conserto. Não o reescrevemos aqui.

### D8 — O gate de envio não é "tudo verde"

Rejeição legítima nunca fica verde: o produto de fato não tem o que o pedido exigia. Um botão de
envio condicionado a todas as linhas ✅ **nunca acende numa loja real**.

O gate é *"não há ilegibilidade pendente de conserto entre os produtos selecionados"* — ou
simplesmente nenhum gate, enviando o que foi consertado. E o botão diz **"enviar para aprovação"**,
nunca "publicar": `publish_suggestion` cria item no Task Board com `assigneeId: "super-agent"`, o
PR vem do Super Agent e a aprovação é humana (ADR 0004, D6 do `exame-guiado`). Quando o botão
termina, **o conteúdo não está na loja** — e o gate humano é argumento de venda, não limitação a
esconder.

### D9 — O `ComparisonView` continua puro, e o wizard sai por último

A emenda de 08/08 da `exame-guiado` fixou a fronteira certa: **orquestração vs. renderização**, não
dois diretórios. Ela sobrevive intacta aqui — `ComparisonView` continua função pura do
`ComparisonResult`, sem rede e sem saber que existe uma tabela em volta, porque é isso que permite
embutí-lo num bundle single-file sob CSP `connect-src 'none'` para a view do Studio (ticket 14 da
`entrega-hackathon`, aberto).

Onde ele é renderizado: no drill-down, **por pedido**. O drill-down do produto é a transposta —
um produto × N pedidos — e essa grade é componente novo. `RequirementsGrid` (produtos ×
requisitos, para um pedido) **não** serve transposto e **não** é forkado; o que se reaproveita é
`EvidencePanel`, os tipos e as regras de célula.

O wizard é removido **no último ticket**, depois que cada fase tem substituto funcionando. Apagar
navegação antes do substituto existir troca uma tela imperfeita por nenhuma.

---

## O que muda no servidor

**Nada, nesta spec.** É uma propriedade do desenho, não um acidente feliz: o D5 mantém a
agregação no front justamente para a migração da tela não abrir frente no C# na véspera.

As três dependências de servidor que o fluxo tem já existem como tickets do `exame-guiado`, e
nenhuma é criada aqui:

| Dependência | Ticket dono | Sem ela |
| --- | --- | --- |
| Transporte autenticado para as tools que gastam LLM | `exame-guiado/05` | o exame não roda fora do modo fixture — o seam já existe no front (`diagnosis/lib/runSimulationAgent.ts`, ticket 04 desta pasta) e só falta o transporte plugar nele |
| `source` e `descriptionExcerpt` | `exame-guiado/08` | o drill-down mostra afirmação sem procedência, e o desempate do D4 degrada |
| Requisitos congelados / linha de base | `exame-guiado/11` | o "antes" apodrece (D7) e o delta vira ruído |

---

## Testing Decisions

- **A agregação transposta é testada como lógica pura**, contra fixtures — mesmo padrão de
  `aggregate.test.ts` e `grid.test.ts`. Os quatro estados do D2, o produto de motivo misto, o
  produto que passa num pedido e é ilegível noutro, e a perda silenciosa têm caso cada um.
- **A ordenação do D4 tem teste de ordem, não de aparência**: dado um conjunto de linhas, a
  sequência resultante é determinística e verificável.
- **Nenhum teste desta spec pode derivar natureza de motivo por string.** Se um teste precisar
  fazer isso para passar, o bug é no contrato, não no teste (regra do ticket 02).
- **A fixture de loja real sem gabarito** (`diagnosis/fixtures/loja-real-sem-gabarito.ts`) é a
  fixture de desenvolvimento padrão da tabela — é o caso que será a norma fora da demo.
- **Modo fixture continua sendo como a tela se desenvolve sem servidor no ar.**

---

## Out of Scope

- **Mudança de contrato no servidor** — ver §"O que muda no servidor". Se um ticket daqui
  precisar de campo novo no C#, ele para e o assunto volta para o `exame-guiado`.
- **Histórico multi-passada e gráficos de evolução** — o ticket 11 do `exame-guiado` já limita a
  persistência à última passada e sua linha de base; esta spec não amplia.
- **Aprovar, mergear ou promover a produção pela UI** — ADR 0004.
- **Descoberta** (robots.txt, sitemap, `SearchAction`) — critério de corte do
  `o-que-estamos-construindo.md` §6.
- **Multi-loja / OAuth** — D5 do `exame-guiado`.
- **Edição de conteúdo do produto pela tabela.** A tabela é instrumento de medição; conteúdo se
  muda pelo conserto assistido e pelo gate humano, não por célula editável.

---

## Further Notes

**Ordem de construção.** Os tickets estão numerados na ordem de execução. O eixo é: contrato
(01) → tabela e placar (02) → operabilidade (03, 04) → drill-down (05) → conserto (06) → envio
(07) → remoção do wizard (08). Os tickets 01–05 são construíveis **inteiros em modo fixture**,
sem transporte e sem gastar crédito; só o 06 e o 07 dependem do ticket 05 do `exame-guiado`.

**Corte de emergência.** Se o tempo acabar, a linha de corte honesta é depois do **03**: tabela
com os quatro estados, placar e ordenação por perda silenciosa já é o exame completo sobre uma
loja real, e é o que o pitch precisa. O conserto é o `--fix`, e o
`o-que-estamos-construindo.md` §5 é explícito sobre qual dos dois é o produto.

**O que esta migração ganha de graça.** O wizard precisava de um sexto passo inventado para
responder "e quando o catálogo mudar?". A tabela responde por construção: é a mesma tela, com
linhas novas. O ticket 11 do `exame-guiado` deixa de ser um apêndice do fluxo e passa a ser o
estado natural da superfície.
