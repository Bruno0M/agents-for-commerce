# 11 — A casca do wizard: navegação, app hospedeiro e estado do fluxo

**What to build:** as cinco fases têm ticket próprio (03, 06, 04, 08, 09) e cada um deles
assume que existe uma casca por onde o lojista anda. Ela não existe, e ninguém é dono dela. Este
ticket é o contrato da casca: **qual app hospeda o fluxo, como se navega entre as fases, como o
estado passa de uma para a outra, e como o `ComparisonView` é consumido sem fork.**

A spec deixou "UI detalhada das fases 1, 2, 3 e 5" fora de escopo por bom motivo — ela fixa
fluxo, contrato e ordem, não desenho de tela. Mas a **navegação** não é desenho de tela: ela
decide se a ordem que a spec fixou sobrevive ao uso. Por isso está aqui e não em cada fase.

## A navegação é o argumento, não a moldura

A regra que ordena a spec inteira é: **a primeira coisa que o lojista vê é uma rejeição, não uma
sugestão.** Isso é uma afirmação sobre **ordem**, e ordem que a UI não impõe não existe.

Cinco itens de sidebar deixam qualquer um pular direto para a fase 4 e ver conteúdo otimizado
antes de ver um único descarte. O fluxo vira "gerar, e depois medir para confirmar" — que é
exatamente a forma do Adobe Catalog Agent que o D1 existe para evitar. Numa demo, na frente de
um jurado, um clique errado desfaz o posicionamento inteiro.

O outro extremo — empilhar as cinco fases como seções da tela de catálogo que já existe — quebra
por outro lado: as fases 3 e 4 são densas (lista de descartados com a frase de cada motivo;
placar, grade e drill-down) e não cabem como acordeão.

O desenho que preserva as duas coisas: **stepper linear de 5 passos no topo, corpo em página
inteira por fase, avanço travado, volta liberada.** Voltar é livre porque reler o diagnóstico
depois de ver o delta é justamente o que convence; avançar é travado porque cada fase consome o
que a anterior produziu.

## O wizard mora no `apps/web`, não no `apps/comparison-view`

O D7 e o ticket 05 dizem que o wizard vive no `apps/comparison-view/`. **Isso mudou depois que
os dois foram escritos** e o desvio precisa ficar registrado em vez de descoberto na véspera:

- `apps/comparison-view/` é inteiramente movido por fixture — o `App.tsx` só troca qual objeto
  mockado o `ComparisonView` renderiza. Nenhuma linha fala com o servidor.
- `apps/web/` já tem shell de navegação, shadcn, e o único **transporte real** que existe:
  `fetchCatalog` → `GET /catalog`.

O wizard vai para onde o transporte já está. **O que o D7 protege continua intacto** e é o que
importa dele: o `ComparisonView` segue uma função pura do `BeforeAfterComparisonResult`, a view
do Studio segue renderizando só a fase 4 sob CSP `connect-src 'none'`, e nenhuma orquestração
entra no componente compartilhado.

### O `apps/comparison-view` é aposentado como app, e o conteúdo dele migra

A `.scratch/view-antes-depois/` entregou seus tickets 01–04: ~1.100 linhas de
`ComparisonView`, `RequirementsGrid`, `EvidencePanel`, `Scoreboard`, `lib/grid.ts`, `types.ts`,
5 fixtures e os testes de `grid.ts` e da view. **Isso é ativo, não protótipo** — as fixtures são
o que faz o modo fixture das cinco fases existir.

O que não se sustenta é manter um segundo app Vite no ar só para hospedar esse componente. Ele
migra para dentro do `apps/web`, com os testes, e o `apps/comparison-view` deixa de ser app.

**A regra que sobrevive à migração é uma propriedade do componente, não do app:** o
`ComparisonView` continua **função pura do `BeforeAfterComparisonResult`** — sem fetch, sem ler
estado do wizard, sem contexto de fase. Era isso que o D7 protegia de verdade, e é isso que o
ticket 14 da `entrega-hackathon` precisa para embutir a mesma tela num bundle single-file sob
CSP `default-src 'none'; connect-src 'none'`.

O risco novo que a migração cria, e que o critério abaixo endereça: dentro do `apps/web` o
componente passa a conviver com shadcn, Tailwind v4 e `@fontsource-variable/geist`. Se ele for
reescrito nesses termos sem cuidado, o bundle do ticket 14 herda uma fonte que precisa virar
data URI e um CSS que ninguém orçou. **Nada que exija requisição de rede em runtime pode entrar
no componente.**

## O estado do fluxo é uma unidade

Cada fase produz o insumo da seguinte, e é isso que dá sentido ao avanço travado:

```
fase 1 → catálogo lido
fase 2 → conjunto de pedidos APROVADO   (é este que o D4 congela)
fase 3 → diagnóstico + quais produtos falharam por ilegibilidade
fase 4 → resultado da comparação
fase 5 → itens enviados e o estado de cada um
```

O conjunto aprovado atravessa as fases 3 e 4 **inalterado** — nada de regerar pedido no meio
(D4). A casca é quem garante isso na prática: se cada fase buscar seus próprios pedidos, "antes"
e "depois" deixam de ser comparáveis e o número perde o sentido.

Sem router e sem persistência entre sessões: o fluxo é stateless no primeiro corte, por decisão
da própria spec. Estado local no topo do wizard basta.

## O modo fixture atravessa as cinco fases

Hoje o modo fixture existe só para a fase 4. Ele precisa cobrir o fluxo inteiro, e não é conforto
de desenvolvimento: **o ticket 09 da `entrega-hackathon` está aberto** — sem servidor no ar, o
modo fixture é o único jeito de a demo acontecer. Uma casca que só anda com rede é uma casca que
pode não andar no dia.

A tela de catálogo atual não morre nem é absorvida: ela continua acessível como consulta avulsa,
fora do fluxo.

**Relação com os outros tickets:** o critério *"existe uma casca de navegação entre as 5 fases"*
do ticket 05 passa a ser satisfeito por este, deixando o 05 como transporte puro. O conteúdo de
cada fase continua sendo dos tickets 05, 06, 07, 09 e 10 — este ticket não redefine nenhum
critério deles.

**Blocked by:** None — o modo fixture torna a casca construível antes do transporte existir.

**Status:** done

- [x] O fluxo é um stepper linear de 5 passos com corpo em página inteira, e não uma navegação
      livre entre cinco destinos
- [x] Avançar para uma fase exige que a anterior tenha produzido seu insumo; voltar é sempre
      permitido e não descarta o que já foi produzido
- [x] O stepper mostra em que fase o lojista está e quais já foram concluídas
- [x] O wizard vive no `apps/web`, e o `apps/comparison-view` deixa de ser um app — componentes,
      `lib/grid.ts`, `types.ts`, fixtures e testes migram para o `apps/web`
- [x] Os testes que vieram junto continuam passando no novo lugar; nenhuma fixture se perde na
      migração
- [x] Não existe segunda cópia do componente no repositório depois da migração
- [x] O `ComparisonView` continua função pura do `BeforeAfterComparisonResult` — não faz
      requisição, não lê estado do wizard e não sabe que existe uma fase em volta dele
- [x] Nada no componente exige requisição de rede em runtime (fonte, ícone, CSS externo), para
      que o ticket 14 da `entrega-hackathon` continue possível a partir do mesmo fonte
- [x] O conjunto de pedidos aprovado na fase 2 chega às fases 3 e 4 como a mesma unidade, sem
      ponto no fluxo que o regere
- [x] O fluxo inteiro é percorrível ponta a ponta em modo fixture, sem servidor no ar
- [x] A tela de catálogo continua acessível fora do fluxo
- [x] Nenhum critério das fases 05, 06, 07, 09 e 10 é reimplementado aqui — a casca não sabe o
      que cada fase renderiza dentro dela

## Comments

**08/08/2026 — o `apps/comparison-view` sai de cena.** A decisão de seguir só com o `apps/web`
tornou o D7 da spec factualmente errado na premissa (ele descreve dois apps consumindo uma tela).
A revisão do D7 está anexada ao fim da spec; este ticket passou a ser dono da migração, e não só
da escolha de app hospedeiro.

O que **não** mudou, e é o que importa preservar: o ticket 14 da `entrega-hackathon` continua
`ready-for-agent` e continua precisando embutir esta tela num bundle single-file sob CSP
`connect-src 'none'`. Ele nunca dependeu de o `comparison-view` existir como app — dependia de o
componente ser puro. Essa propriedade virou critério explícito acima, porque com a migração ela
deixa de ser garantida pelo isolamento do app e passa a depender de disciplina.

**08/08/2026 — implementado.** Duas entregas, nesta ordem:

*Migração.* A ilha vive em `apps/web/src/comparison/` (`components/`, `fixtures/`, `lib/grid.ts`,
`types.ts`, `comparison.css`); `apps/comparison-view/` foi removido. Os 32 testes que vieram junto
passam no lugar novo. O `apps/web` ganhou vitest + testing-library + jsdom e o script `test`.

O ponto onde a migração quase quebrou, e que vale registrar: o `@theme` do `comparison-view`
colidia com o tema shadcn em `--color-accent`, `--color-neutral*`, `--font-sans` e `--font-mono`.
**Todos os tokens da ilha passaram a ter prefixo `cv-`** (`--color-cv-ink-faint`, `--font-cv-mono`,
…) e as classes utilitárias dos componentes foram reescritas em cima disso. As regras de `@layer
base` do app antigo (fundo paper, textura em data-URI, `tabular-nums`, `:focus-visible`) não viraram
globais — estão escopadas numa classe `.comparison-surface` aplicada na raiz do `ComparisonView`.
Nenhuma webfont entrou na ilha: Fraunces/IBM Plex continuam nomes de família com fallback de
sistema, e a ilha não importa shadcn, lucide nem `@fontsource-variable/geist` — é o que mantém o
ticket 14 barato. Único descarte consciente: `html { scroll-behavior: smooth }`, que não tem como
ser escopado ao componente.

*Casca.* `apps/web/src/wizard/` — `flow-state.ts` (estado + regra de avanço), `WizardStepper.tsx`,
`ExamWizard.tsx`, `phases/`. O avanço é derivado, não guardado: `maxReachablePhase(state)` percorre
as fases e para na primeira cujo predecessor não produziu insumo; o reducer recusa `GO_TO_PHASE`
acima disso, então nem stepper nem botão conseguem furar a ordem. Voltar nunca zera campo de insumo.

**O D4 está garantido pela forma dos props, não por comentário:** só a `PhaseDefinirExame` tem
`onOrdersApproved` na assinatura. As fases 3 e 4 declaram `approvedOrders: ApprovedTestOrderSet` e
**não existe setter** para esse campo no tipo delas — não há por onde regerar.

As fases 1, 2, 3 e 5 são placeholders que nomeiam o ticket dono (05, 07, 06, 10); a 4 é a exceção
e renderiza o `ComparisonView` de verdade, recebendo só `result`. Modo fixture é um toggle no
cabeçalho, **ligado por padrão** porque o ticket 09 da `entrega-hackathon` segue aberto; desligado,
os placeholders dizem que dependem do transporte do ticket 05 e o avanço trava. O catálogo continua
acessível como destino avulso na sidebar, por estado local — sem router, como a spec pediu.
