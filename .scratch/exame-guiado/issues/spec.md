# Spec — O exame guiado: o fluxo do lojista, do diagnóstico à publicação

**Status:** ready-for-agent

**Escopo desta spec:** o fluxo ponta a ponta que um lojista percorre na ferramenta —
conectar, diagnosticar, consertar, re-medir, publicar — e as capacidades que o servidor
.NET precisa ganhar para sustentá-lo. Cobre o desenho do fluxo e o contrato de dados.
**Não** cobre implementação de UI detalhada (isso é extensão da
`.scratch/view-antes-depois/spec.md`), multi-loja, nem o handshake de MCP App.

**Relação com o que já existe:**

- `.scratch/view-antes-depois/spec.md` produziu a **tela do resultado** (placar, grade,
  drill-down). Esta spec produz o **caminho até o resultado**. A tela existente vira a
  fase 4 deste fluxo, não o app inteiro.
- `.scratch/entrega-hackathon/issues/04-rodadas-antes-depois.md` é dono do contrato de
  saída da comparação. Esta spec pede duas mudanças nele — registradas em §"O que o
  servidor precisa passar a produzir".
- `.scratch/catalogo-demo/spec.md` tem os 4 pedidos escritos à mão. Esta spec automatiza
  a produção deles — e explica por que a regra de ouro daquele spec **não pode** ser
  automatizada.

---

## Problem Statement

A ferramenta funciona e já produziu o número, mas **não tem porta de entrada**. As 7 tools
do MCP são peças soltas; a orquestração que produziu `comparison-pedido-a.json` foi um
harness C# descartável, escrito, rodado e apagado. Um lojista não tem por onde começar, e
um jurado não tem o que clicar.

Três lacunas concretas, na ordem em que aparecem para quem chega:

1. **Não existe leitura de catálogo.** `get_product_content` lê **um** handle por chamada.
   Não há tool que devolva "todos os produtos da loja". Os 7 do catálogo de demo foram
   capturados um a um, por script.

2. **Não existe origem para o pedido.** `simulate_buyer_agent` e
   `compare_buyer_agent_rounds` recebem `naturalLanguageOrder` como entrada obrigatória.
   A chamada de LLM que existe dentro deles transforma um pedido **em** requisitos — ela
   nunca inventa o pedido. Hoje os pedidos são 4 frases escritas à mão num markdown. Sem
   pedido não há requisito, sem requisito não há filtro, sem filtro a tela fica vazia.

3. **A taxa de sucesso não é calculável fora da demo.** O denominador é *classificação
   correta*, e ele depende de `expectedOutcomes` — o gabarito de quem **devia** passar,
   que veio do `catalogo-demo/spec.md`. **Numa loja real esse gabarito não existe.**
   Ninguém sabe quais dos 400 produtos deviam atender ao pedido. A métrica que sustenta o
   pitch inteiro não sobrevive ao contato com um cliente.

### O erro de desenho que esta spec existe para evitar

O fluxo intuitivo — e o primeiro que foi proposto — é este:

```
conectar → ler catálogo → GERAR OTIMIZADO → ver antes/depois do conteúdo
         → simular → ver % de melhoria → publicar
```

Ele está errado, e o motivo é o critério de corte do projeto. Nesse fluxo o lojista vê o
**remédio** antes de ver o **exame**; a simulação vira o passo 3, uma confirmação do que
já foi feito. É exatamente a forma do Adobe Catalog Agent, e o `o-que-estamos-construindo.md`
§5 é explícito sobre isso: *"todo mundo está vendendo o remédio, ninguém entrega o exame"*.

O mesmo doc já descreve a ordem correta, na descrição da rodada 1:

> **Rodada 1:** ele tenta comprar na sua loja **como ela está hoje**. Dos seus 40 produtos,
> 6 ele descarta — e ele diz exatamente por quê.

A rodada "antes" não precisa de geração nenhuma. Ela roda contra o catálogo cru. Inverter
isso não é preferência estética: é a diferença entre a ferramenta se apresentar como
instrumento de medição (o fosso) ou como gerador de conteúdo que também mede (a commodity).

## Solution

Um fluxo de 5 fases no front próprio (`apps/comparison-view/`), com uma regra que
determina toda a ordenação:

> **A primeira coisa que o lojista vê é uma rejeição, não uma sugestão.**

```
FASE 1  Conectar          → lê o catálogo inteiro
FASE 2  Definir o exame   → gera pedidos de teste; lojista revisa/edita/aprova
FASE 3  Diagnóstico       → simula contra a loja COMO ELA ESTÁ
                            "18 produtos o agente nem conseguiu avaliar. Olha o motivo."
FASE 4  Conserto          → gera otimizado só nos que falharam por ilegibilidade
                            re-simula → o delta
FASE 5  Publicar          → envia para aprovação humana
```

### A assimetria de custo que confirma a ordem

Não é só argumento de posicionamento — o desenho do sistema já empurra para cá:

| Operação | Chamadas de LLM |
| --- | --- |
| `get_product_content` | **zero** — Admin GraphQL puro |
| `generate_test_orders` (nova) | **1**, para N pedidos |
| `simulate_buyer_agent` | **1**, independente de o catálogo ter 7 ou 400 produtos |
| `generate_optimized_content` | **1 por produto** |

**O exame é quase de graça; o remédio é que custa.** Diagnosticar 400 produtos são ~2
chamadas. Otimizar 400 são 400 chamadas. Rodar geração no catálogo inteiro antes de medir
queima crédito exatamente nos produtos que já passavam, e joga fora um funil que cai
sozinho do sistema: **diagnóstico grátis, conserto cobrado.**

A fase 4 gera **só nos produtos que falharam por ilegibilidade**. Os que passaram não
precisam, e os rejeitados legitimamente não têm o que consertar.

---

## User Stories

**Como lojista que nunca ouviu falar de schema.org**, quero conectar minha loja e, sem
configurar nada, ver quantos produtos meus um robô de compra não consegue avaliar — para
descobrir que existe um problema que eu não sabia que tinha.

**Como lojista**, quero ver *qual* produto foi descartado e a frase exata do motivo — para
acreditar no diagnóstico em vez de aceitar um percentual por confiança.

**Como lojista**, quero entender de onde saíram as perguntas que o robô fez, e poder
mudá-las — porque se as perguntas forem convenientes demais o exame não vale nada, e eu
preciso conseguir testar isso eu mesmo.

**Como lojista**, quero ver a informação que já estava escrita na minha descrição sendo
promovida a campo estruturado — para entender que o produto nunca foi ruim, só ilegível.

**Como lojista**, quero aprovar a mudança antes de ela ir para a loja — porque conteúdo de
PDP é responsabilidade minha, não de um robô.

**Como jurado da hackathon**, quero ver a rejeição acontecendo ao vivo antes de ver
qualquer conteúdo gerado — porque é isso que separa esta ferramenta das que já existem.

---

## Implementation Decisions

### D1 — Medir antes de gerar (a decisão que ordena todo o resto)

A fase 3 roda contra o catálogo cru, sem nenhuma chamada de geração. Motivo em
"Problem Statement" acima. Consequência prática: a fase 3 é entregável sozinha e já é uma
demo completa — "sua loja tem 18 produtos invisíveis" é o gancho inteiro, mesmo sem
nenhuma linha da fase 4 existir.

### D2 — Os pedidos são gerados, mas **nunca a partir da prosa por produto**

Gerar os pedidos passa no critério de corte com folga: escrever os casos de teste **é**
medição. Mas a versão ingênua — passar o catálogo e pedir "sugira pedidos" — tem uma
circularidade que destrói o número:

```
gerador de pedidos  lê a prosa das descrições → pede ANC, 20h de bateria
generate_optimized_content lê a MESMA prosa   → estrutura ANC, 28h de bateria
                                              → delta positivo GARANTIDO por construção
```

As duas pontas leem a mesma fonte. O delta vira propriedade do gerador, não da loja — um
test suite que passa sempre não mede nada.

Isso não é hipótese. O `.scratch/catalogo-demo/spec.md` tem a regra em negrito:

> **Todo fato citado no pedido precisa existir na prosa do "antes", solto, sem estrutura.**

Foi engenharia deliberada de vitrine, e para uma demo está certo. **Automatizar essa regra
e apontar para a loja de um cliente constrói uma máquina que sempre devolve delta
positivo** — e o exame deixa de ser exame.

Três regras que quebram a circularidade, e que são o contrato do prompt de
`generate_test_orders`:

1. **Entrada agregada, não prosa por produto.** O gerador recebe categoria, tipos de
   produto, faixa de preço e títulos — **não** as descrições completas. O conhecimento de
   como as pessoas compram naquela categoria vem do modelo, que é fonte externa ao
   catálogo.
2. **Uma fração dos pedidos deve não ter resposta válida.** O agente responder "nenhum
   produto atende" é **acerto**, não falha. É a lógica dos 4 controles do catálogo de demo,
   generalizada.
3. **Variar o eixo da restrição de propósito.** Os 4 pedidos escritos à mão têm
   propriedades que nenhum gerador produz se você pedir só "pedidos realistas", e elas
   precisam estar no prompt como instrução explícita:
   - um pedido que faz **vencer** o produto que outro pedido **rejeitou** (prova que a
     rejeição foi do requisito, não do produto — é o par A/B do spec do catálogo)
   - um pedido cujo requisito não é campo estruturado em lugar nenhum (o C: multipoint,
     enterrado numa frase)
   - um pedido com poucas restrições, que alarga o desempate (o D)

O lojista revisa, edita e aprova os pedidos antes da fase 3. Sem essa etapa a ferramenta
pede confiança cega justamente no ponto onde ela é mais fácil de trapacear.

### D3 — A métrica principal é **rejeição por ilegibilidade**, não o percentual

Resolve o buraco 3 do Problem Statement sem gabarito nenhum. Os motivos que o
`BuyerAgentDecisionEngine` já produz são de duas naturezas, e a natureza é derivável da
string:

| Motivo produzido hoje | Natureza |
| --- | --- |
| `Sem dado estruturado para confirmar 'X'.` | **ilegibilidade** |
| `Sem dado estruturado para confirmar 'X' (mínimo N).` | **ilegibilidade** |
| `Sem preço estruturado para confirmar o limite de N.` | **ilegibilidade** |
| `'X' = 'Y' não tem valor numérico reconhecível para confirmar o mínimo de N.` | **ilegibilidade** (o dado existe, mas em prosa) |
| `'X' = 'Y' não confirma 'Z'.` | rejeição **legítima** |
| `'X' = 'Y' abaixo do mínimo de N.` | rejeição **legítima** |
| `Preço X acima do limite de Y.` | rejeição **legítima** |

A métrica de topo passa a ser **"produtos que o agente não conseguiu sequer avaliar"**, e
a meta é zero. Três propriedades que o percentual não tem:

- **Não precisa de gabarito.** Funciona em qualquer loja, no primeiro run.
- **É mais visceral.** "18 produtos foram descartados sem o agente conseguir avaliá-los" é
  mais forte que "taxa de 57%".
- **É resistente ao viés do D2.** Mesmo que o gerador escreva um pedido generoso demais,
  `Sem dado estruturado para confirmar 'X'` continua sendo um fato sobre a **loja**, não
  sobre o pedido.

O percentual de classificação correta continua existindo, como métrica secundária, e só
aparece quando há `expectedOutcomes` — ou seja, na demo curada. Não é o que a UI mostra
em primeiro plano para uma loja real.

### D4 — Os pedidos congelam junto com o catálogo

Se os pedidos forem regerados entre as rodadas, "antes" e "depois" não são comparáveis —
é o mesmo problema que `compare_buyer_agent_rounds` já resolve um nível abaixo (extrai os
requisitos **uma vez** para as duas rodadas, para que o não-determinismo do LLM não mude
*a pergunta* entre elas). A disciplina sobe um andar: o conjunto de pedidos é gerado uma
vez, salvo ao lado de `catalog-antes.json`, e reusado. Território do ticket 18 da
`entrega-hackathon`.

### D5 — "Conectar a loja" é fachada, e isso fica explícito

`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID` e `SHOPIFY_CLIENT_SECRET` são lidos no boot
(`Program.cs:RequireConfig`) e o `ShopifyGraphServiceFactory` é singleton para uma loja
só. Multi-loja com OAuth é eixo arquitetural novo inteiro e **não entra**. A fase 1 é uma
tela sobre a loja única já configurada. Registrado aqui para ninguém descobrir isso na
véspera achando que era um formulário.

### D6 — O botão final diz "enviar para aprovação", não "publicar"

`publish_suggestion` cria item no Task Board com `assigneeId: "super-agent"`; o PR vem do
Super Agent e a aprovação é humana, por design (ADR 0004). A UI precisa de um estado
**"aguardando revisão"** com link para o item — não de um spinner que termina em "pronto".
O caminho direto para a loja (`write_product_metafields`) existe mas está travado no
ticket 08 da `entrega-hackathon` (`PDP Loader.json` não declara identificador de metafield).

Chamar isso de "publicar" na UI seria mentir sobre o que aconteceu, e o gate humano é
justamente um argumento de venda — não uma limitação a esconder.

### D7 — O wizard vive só no front próprio

A `.scratch/view-antes-depois/spec.md` decidiu que a tela é escrita uma vez e serve a dois
consumidores (view no Studio e front próprio), diferindo só na origem do
`BeforeAfterComparisonResult`. **O wizard quebra isso**: dentro do Studio a view roda sob
CSP `default-src 'none'; connect-src 'none'` e não dispara tool nenhuma — ela só renderiza
o que chega pelo handshake.

A decisão que preserva as duas coisas: **a fase 4 continua sendo o componente compartilhado**
(`ComparisonView`, uma função pura do resultado). As fases 1, 2, 3 e 5 são casca de
orquestração que existe **apenas** no front próprio. A view do Studio (ticket 14 da
`entrega-hackathon`) continua renderizando só a fase 4, sem mudança.

> **Revisado em 08/08/2026** — a premissa de dois apps caiu. Ver "Emendas" no fim desta spec.

---

## O que o servidor precisa passar a produzir

Consolidação dos achados — é a lista que a `.scratch/view-antes-depois/issues/05` pedia
que fosse registrada, agora com os itens deste fluxo.

| # | O que falta | Por quê | Sem isso |
| --- | --- | --- | --- |
| 1 | **Tool de leitura do catálogo inteiro** (ou `get_product_content` aceitando lista) | Hoje é 1 handle por chamada | A fase 1 não existe |
| 2 | **Tool `generate_test_orders(catalogSummary, count)`** | Origem dos pedidos, com as regras do D2 | A fase 2 não existe; o lojista tem que digitar sem saber o quê |
| 3 | **Tipo do motivo de rejeição** no `BeforeAfterProductComparison` | Hoje o motivo é frase pronta; o tipo está implícito na string | O D3 vira parsing de string na UI — frágil e errado |
| 4 | **`source`** por dado confirmado (opção / metafield / tipo / extraído da descrição) | Já registrado no 05 da `view-antes-depois` | Sem drill-down de evidência |
| 5 | **`descriptionExcerpt`** — o trecho da prosa onde a informação já estava | Idem | Some a prova de que o produto nunca foi ruim, só ilegível |

O item 2 tem uma propriedade que vale registrar: **é a primeira tool cujo output é um caso
de teste, não conteúdo.** Ela é parte da resposta a quem perguntar por que isto é um exame
e não um gerador.

---

## Testing Decisions

- **`generate_test_orders` tem teste de contrato, não de conteúdo.** O que se verifica é
  estrutural: N pedidos, ao menos um sem resposta válida esperada, eixos de restrição
  distintos entre eles. O texto em si é não-determinístico e não se testa por igualdade.
- **A classificação do motivo (D3) é testada no engine, não na UI.** É lógica pura, sem
  rede — mesmo padrão que `BuyerAgentDecisionEngineTests` já usa.
- **Fixture nova na `comparison-view`: loja real sem gabarito.** Todas as fixtures atuais
  têm `expectedOutcomes`. Falta o caso que será a norma fora da demo — sem gabarito,
  métrica de ilegibilidade em primeiro plano, percentual ausente.
- **O fluxo ponta a ponta é validado uma vez contra a loja real**, com o custo medido antes
  e depois (`AI_PROVIDER_CREDITS`), como o ticket 04 da `entrega-hackathon` fez. O orçamento
  restante é o teto.

---

## Out of Scope

- **Multi-loja / OAuth de instalação** — ver D5.
- **Aprovar, mergear ou promover a produção pela UI** — ADR 0004 põe isso fora de
  propósito. A UI leva até o Task Board e mostra o estado.
- **Descoberta** (robots.txt, sitemap, SearchAction) — critério de corte do
  `o-que-estamos-construindo.md` §6: o projeto ataca decisão, não descoberta.
- **Transformar a view do Studio em wizard** — ver D7.
- **Persistência entre sessões / histórico de scores** — o fluxo pode ser stateless no
  primeiro corte. Histórico é o passo seguinte, não este.
- **UI detalhada das fases 1, 2, 3 e 5** — esta spec fixa o fluxo, o contrato e a ordem.
  O desenho das telas é extensão da `view-antes-depois`.

---

## Further Notes

**Ordem de construção recomendada.** As fases não têm o mesmo risco. A 3 é a que carrega o
produto e a que já tem quase tudo pronto (falta só a leitura de catálogo). A 2 é a que tem
a decisão intelectual difícil (D2). A 1 e a 5 são casca. Construir na ordem 3 → 2 → 4 → 5 → 1
entrega valor demonstrável mais cedo do que seguir a numeração.

**Dependência externa dura.** Nada disso demonstra coisa alguma enquanto o ticket 09 da
`entrega-hackathon` (servidor no ar em `agentscommerce.ollim.dev`) estiver aberto — o domínio não resolve DNS
hoje, e o processo local que atende a porta 6142 é um build de 06/08 que expõe só 4 das 7
tools. Um gerador de pedidos sem loja acessível não é demonstrável.

**Risco reconhecido.** Esta spec aumenta o escopo num momento em que 09, 18 e 14 estão
abertos. A mitigação é a ordem acima: a fase 3 isolada já é um incremento honesto sobre o
que existe, e cada fase seguinte é opcional em relação a ela. Se o tempo acabar na fase 3,
o que foi entregue ainda é o exame — que é o produto.

---

## Emendas

### 08/08/2026 — D7 revisado: um app só

O D7 dizia que o wizard vive no `apps/comparison-view/` e que a tela serve a dois apps. **A
premissa mudou:** o desenvolvimento segue só no `apps/web/`, que é onde o transporte real já
está (`GET /catalog`), e o `apps/comparison-view/` é aposentado como app — seus componentes,
fixtures e testes migram para lá. Detalhe e critérios no ticket 04.

O que o D7 protegia **continua valendo, e virou critério explícito**: o `ComparisonView` é
função pura do `BeforeAfterComparisonResult` — sem rede, sem estado de wizard, sem saber que
existe uma fase em volta. Essa propriedade nunca dependeu de haver dois apps; ela é o que
permite a mesma tela ser embutida num bundle single-file sob CSP `connect-src 'none'` para a
view do Studio (ticket 14 da `entrega-hackathon`, ainda aberto).

A releitura correta do D7, então: **as fases 1, 2, 3 e 5 são casca de orquestração; a fase 4 é
um componente puro que a casca renderiza.** A fronteira é entre orquestração e renderização, não
entre dois diretórios — e é a fronteira que sempre importou.

### 08/08/2026 — a navegação saiu do wizard; as regras ficaram

`.scratch/catalogo-como-exame/spec.md` substitui o **wizard de 5 fases** pela **tabela do
catálogo** como superfície única. Ela não revoga nenhuma decisão desta spec — D1 (medir antes de
gerar), D2 (as três regras anti-circularidade dos pedidos), D3 (ilegibilidade como métrica de
topo), D4 (pedidos congelados), D6 (aprovação, não publicação) e a pureza do `ComparisonView`
continuam valendo palavra por palavra, e esta spec continua sendo a dona delas.

O que mudou: as fases deixaram de ser **navegação** e viraram **estado da mesma tela**. O motivo é
que três defeitos não se consertam dentro da forma "wizard" — a fase 1 é um passo decorativo (o
próprio D5 admite), a fase 3 não escala além do catálogo de demo, e um test suite que se apresenta
como fluxo de mão única diz que roda uma vez, quando o ticket 11 desta pasta já mostra que a
segunda passada é o caso normal.

Consequências para os tickets desta pasta:

- **05** (transporte), **08** (evidência) e **11** (linha de base) continuam válidos e sem
  mudança — a `catalogo-como-exame` depende dos três e não os reescreve. O **11** sobe de "passo
  seguinte" a pré-requisito duro do conserto.
- **07** (fase 2), **09** (fase 4) e **10** (fase 5) têm suas regras preservadas, mas a tela que
  as implementa passa a ser a da outra spec (tickets 04, 06 e 07 de lá).
- **04** (casca do wizard) fica como histórico: o que ele construiu é removido no ticket 08 da
  `catalogo-como-exame`, e só depois de cada fase ter substituto funcionando.

### 08/08/2026 — tickets renumerados para a ordem de execução

Os arquivos passaram a ser numerados na ordem em que devem ser feitos, para que `ls` já
responda "o que vem agora". **Os números de fase do fluxo não mudaram** — a fase 3 é a fase 3
em qualquer lugar desta spec; o que mudou foi o número do *ticket* que a implementa. Os slugs
mantêm `fase-N` justamente para a distinção não se perder.

| Ordem | Ticket | Era | Status |
| --- | --- | --- | --- |
| — | 01 leitura do catálogo inteiro | 01 | done |
| — | 02 tipo do motivo de rejeição | 02 | done |
| — | 03 tool `generate_test_orders` | 05 | done |
| 1 | 04 casca do wizard + migração da view | 11 | ready |
| 2 | 05 fase 1 — conectar (transporte) | 03 | ready |
| 3 | 06 fase 3 — diagnóstico | 04 | ready |
| 4 | 07 fase 2 — revisar pedidos | 06 | ready |
| 5 | 08 evidência (`source` / excerto) | 07 | ready |
| 6 | 09 fase 4 — conserto e delta | 08 | ready |
| 7 | 10 fase 5 — enviar para aprovação | 09 | ready |
| 8 | 11 reexame de catálogo que mudou | 12 | ready |
| 9 | 12 validação ponta a ponta | 10 | ready |

A ordem difere da recomendação de "Further Notes" (3 → 2 → 4 → 5 → 1, em número de **fase**)
num ponto: a fase 1 subiu, porque ela carrega o transporte, que é risco desconhecido e não
casca. O 04 vem antes de tudo por ser construível em modo fixture, sem servidor, e por a
migração da view ser pré-requisito do 09.

Uma ambiguidade foi corrigida no caminho: o `Blocked by: 09` do ticket de validação ponta a
ponta podia ser lido como a fase 5 **ou** como o deploy da `entrega-hackathon`. Agora diz os
dois, por extenso.
