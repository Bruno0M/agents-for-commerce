# 02 — A tabela do exame: os quatro estados e o placar fixo

**What to build:** `catalog-page.tsx` deixa de ser uma tabela descritiva e passa a ser a
superfície do exame. Ganha a coluna de veredito do robô, com os quatro estados, e ganha **acima
dela uma faixa de placar sempre visível**.

**O placar é o ticket, a coluna é o detalhe.** O modo de falha desta migração inteira é conhecido
e está na spec: uma tabela com badge verde/vermelho **é um linter**. O
`o-que-estamos-construindo.md` §2 diz que o produto é *"aquele número saindo de 34 pra 38"* — um
placar é um número, uma tabela é um estado. Se este ticket entregar as colunas e não a faixa, ele
converteu o exame em ferramenta de qualidade de conteúdo, que é a commodity contra a qual o
projeto se define. A faixa vem primeiro, inclusive na ordem de implementação.

Antes de o exame rodar a faixa **não some** — ela diz "não examinado", que é informação. O estado
inicial da tabela é o catálogo inteiro em cinza, e rodar o exame é um evento visível que pinta
tudo de uma vez. Isso não é enfeite: é o gancho da demo, e é mais forte no bloco do que era no
cartão da fase 3.

**Os quatro estados, e por que não são dois:**

| Estado | Definição | Ação |
| --- | --- | --- |
| ✅ `passed` | não descartado por nenhum pedido | nenhuma |
| ⚠️ `illegible` | descartado, **todos** os motivos de ilegibilidade | conserto |
| ◐ `mixed` | descartado, motivos das duas naturezas | conserto, com ressalva |
| ⭕ `legitimatelyRejected` | descartado, **todos** os motivos legítimos | **nenhuma** |

Colapsar ⚠️ e ⭕ em "precisa melhoria" empurra o lojista a pagar `generate_optimized_content` —
**1 chamada de LLM por produto** — em produto que não tem defeito de conteúdo. O funil
"diagnóstico grátis, conserto cobrado" cai sozinho do sistema se a coluna for honesta, e some se
ela for binária.

**O rótulo fala do robô, não de qualidade.** `"O robô conseguiu avaliar?"` com valores como
`Não confirmou 'ANC'`. Um cabeçalho escrito `Score` constrói um SEO checker por acidente de copy.

**O que não entra aqui:** ordenação e filtros (ticket 03), a faixa de pedidos e o disparo do exame
(ticket 04), o drill-down (ticket 05). Este ticket renderiza o contrato do ticket 01 a partir de
fixture; a tela é desenvolvível e testável inteira sem servidor.

**Blocked by:** 01

**Status:** done

- [x] A faixa de placar é fixa acima da tabela e mostra a métrica de ilegibilidade da **loja
      inteira**, com o escopo declarado (quantos produtos, quantos pedidos)
- [x] Antes do exame a faixa mostra "não examinado" explicitamente — não um zero, não um vazio
- [x] A coluna de veredito distingue visualmente os quatro estados, e `legitimatelyRejected` não
      é apresentado como falha da loja
- [x] O rótulo e os valores da coluna falam do robô comprador; a palavra "score" não aparece
- [x] A tabela cobre o catálogo inteiro — produto que passou é linha ✅, não ausência
- [x] O motivo aparece na linha com a frase exata do engine, sem reescrita
- [x] O percentual de classificação correta não aparece; quando não há gabarito, a ausência é
      explícita
- [x] Estados de carregamento, erro e catálogo vazio continuam funcionando como hoje
- [x] A tela é desenvolvível e testável inteira em modo fixture, sem servidor no ar
- [x] Nenhuma ação de conserto ou de geração de conteúdo existe nesta tela ainda (D1 do
      `exame-guiado`)

## Comments

**Arquivos:** `apps/web/src/components/catalog-page.tsx` (reescrito), `apps/web/src/diagnosis/components/CatalogExamStrip.tsx` (novo, a faixa), `apps/web/src/diagnosis/components/ExamStateBadge.tsx` (novo, os quatro estados), `apps/web/src/components/catalog-page.test.tsx` (novo, 11 casos).

**Decisão do `Scoreboard` (a pergunta do ticket):** faixa nova, não a variante do `Scoreboard`
existente. O `Scoreboard` de `comparison/components/` é acoplado a `ComparisonResult`
(`before`/`after`/`successRateDeltaCount`) e aos tokens `cv-*` de `comparison.css` — os dois
existem porque o componente precisa embutir num bundle single-file sob CSP para o ticket 14 da
`entrega-hackathon`. Neste ticket não existe antes→depois: o antes→depois só nasce com o conserto
(ticket 06). Forkar o `Scoreboard` para mostrar uma contagem sem rodada anterior quebraria a
pureza que o D9 exige (`ComparisonView` nunca sabe que existe tabela em volta) e herdaria tokens
`cv-*` fora de contexto. `CatalogExamStrip` foi construído no design system do app
(shadcn/tailwind), no espírito do `DiagnosisSummary` (número de topo + escopo declarado + ausência
de percentual dita em voz alta). A variante do `Scoreboard` fica para o ticket 06, quando o delta
realmente existe — decisão documentada também no comentário de cabeçalho do componente.

**Modo fixture (a outra decisão do ticket):** `fixtureMode` (padrão ligado, mesmo padrão do
`ExamWizard`/`PhaseConectar`). Ligado, o catálogo vem de `lojaRealSemGabaritoCatalog` — nenhuma
chamada a `fetchCatalog` acontece — e um botão "Rodar exame com pedidos de exemplo" chama
`aggregateCatalogExam(catalog.products, lojaRealSemGabaritoOrders)` diretamente no cliente, sem
rede nova. Desligado, o comportamento de hoje (`fetchCatalog()` contra `apps/mcp-server`, com
loading/erro/vazio) continua idêntico; como não existe fonte de pedidos fora do modo fixture
(ticket 04), o botão de rodar o exame só aparece com o modo fixture ligado. Trocar de modo reseta
o exame para "não examinado" (e, saindo do fixture, a leitura para "loading") porque o catálogo
muda por baixo — sem o reset a faixa ficaria mostrando um resultado calculado contra um catálogo
que não é mais o exibido na tabela.

**Ficou de fora, de propósito:** ordenação/filtros (ticket 03), a faixa de pedidos aprovados e o
disparo real do exame (ticket 04 — aqui só o botão de conveniência em modo fixture), o drill-down
por linha (ticket 05), qualquer botão de conserto ou geração de conteúdo (D1 do `exame-guiado`).

**Ponto de hesitação:** as seis colunas descritivas originais (Vendor, Tipo, Preço, Variantes,
Schema.org) foram mantidas e as duas novas colunas (veredito, motivo) foram só adicionadas ao
final, em vez de recortar a tabela para as três colunas do diagrama da spec (`produto │ estado │
motivo`). A spec fala em "deixa de ser tabela descritiva"; li isso como "ganha julgamento", não
"perde as colunas que já tinha" — o ticket não pede remoção e remover é fora do escopo que ele
declara. Se a leitura certa era recortar, é ajuste pequeno e sem risco no ticket 03.

**Verificação (a partir de `apps/web/`, com bun):**
- `bun run test` — 11 arquivos, 107 testes, todos verdes (96 pré-existentes + 11 novos)
- `bun run typecheck` — limpo
- `bun run lint` — 4 erros, todos pré-existentes (`badge.tsx`, `button.tsx`, `sidebar.tsx`,
  `use-mobile.ts`); nenhum novo
