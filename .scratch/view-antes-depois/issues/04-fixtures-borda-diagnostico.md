# 04 — Fixtures de borda, seletor e diagnóstico

**What to build:** a tela deixa de servir só ao cenário feliz. Entram as quatro fixtures
restantes, um seletor no canto para alternar entre elas sem recarregar nada, e o tratamento
honesto dos estados que hoje fariam a tela parecer quebrada.

| Fixture | Origem | O que exercita |
| --- | --- | --- |
| `pedidoA-delta-zero` | derivada de `.scratch/catalogo-demo/comparison-pedido-a.json` | o resultado **real** de hoje: delta zero por desalinhamento de vocabulário |
| `nenhum-passou` | à mão | nenhum produto confirma nada nas duas rodadas |
| `delta-negativo` | à mão | uma classificação piora depois da otimização |
| `sem-expectativas` | à mão | produtos fora do denominador da taxa de sucesso |

A `pedidoA-delta-zero` não é enfeite. É o estado que o projeto está vivendo: na rodada gravada,
os 3 candidatos legítimos continuam reprovando no "depois" porque `'Tipo de produto' = 'Fones
de ouvido'` não confirma `'fone bluetooth'` e `'Duração da bateria'` nunca foi extraída — o
risco de desalinhamento de vocabulário registrado no comentário de 05/08 do ticket 04 da
`entrega-hackathon`, mordendo já no pedido A. Os campos que o servidor ainda não produz
(`source`, `descriptionExcerpt`) são preenchidos à mão nela, o que já demonstra o que precisa
entrar no contrato.

Daí sai o recurso de diagnóstico deste ticket: **uma coluna de requisito que falha em todos os
produtos nas duas rodadas recebe destaque no cabeçalho.** Isso quase nunca é catálogo pobre —
quase sempre é bug de extração, e hoje só se descobre lendo JSON com o olho. O destaque nomeia
o bug de relance.

Delta zero e delta negativo são apresentados como resultados legítimos, com o motivo visível
na grade — não como erro, não como tela vazia. Um exame que só sabe mostrar boas notícias não
é um exame.

**Blocked by:** 02

**Status:** done

- [x] As quatro fixtures existem, tipadas contra o contrato, e a de delta zero deriva da rodada real gravada
- [x] Um seletor permite alternar entre todas as fixtures sem recarregar a página
- [x] Delta zero e delta negativo renderizam a grade completa, sem estado de erro e sem tela vazia
- [x] Quando nenhum produto passa em nenhuma das rodadas, a tela explica isso em vez de mostrar só vermelho
- [x] Uma coluna de requisito que falha em todos os produtos nas duas rodadas é destacada no cabeçalho
- [x] Teste: a fixture de delta zero renderiza a grade completa sem estado de erro

## Comments

**07/08/2026 — implementado, com um achado que corrige a premissa do ticket.**
`.scratch/catalogo-demo/comparison-pedido-a.json` **não é mais** a rodada delta-zero. O
comentário de 05/08 do ticket 04 (`entrega-hackathon`) registra duas fases na mesma sessão:
uma primeira execução real deu delta zero (três problemas de desalinhamento de vocabulário),
o time consertou os três bugs, e a rodada final — a que ficou congelada no JSON — já é a
corrigida (delta +3, a mesma que `pedidoA-delta-positivo.ts` usa desde a 02/03). Ou seja, o
estado "real de hoje" que este ticket queria capturar já não existe em lugar nenhum como dado
salvo; só existe como descrição em prosa no comentário da 04.

`pedidoA-delta-zero.ts` reconstrói essa rodada anterior ao conserto a partir dessa descrição —
reaproveitando produto, handle e `descriptionExcerpt` reais do mesmo catálogo, mas com os dois
problemas que o comentário nomeia: 'Tipo de produto' passou a exigir 'fone bluetooth' (nenhum
tipo estruturado bate) e 'Bateria' nunca casa porque o pedido extraiu 'Duração da bateria' e a
geração produziu 'Autonomia da bateria'. O comentário original de 04 cita como resolvido; a
fixture mostra o estado que motivou o conserto, não o estado atual do servidor. Isso está
documentado no cabeçalho do arquivo para quem for comparar com o JSON e estranhar a
divergência.

**O que mais foi implementado:**

- `lib/grid.ts` ganhou `alwaysFailingRequirements` (coluna que falha em 100% dos produtos nas
  duas rodadas — o destaque de diagnóstico) e `noProductPassedEitherRound` (dispara o aviso
  textual quando `passed` é falso para todo mundo nas duas rodadas). Ambas puramente
  funcionais, cobertas em `grid.test.ts`.
- `RequirementsGrid.tsx` destaca o cabeçalho da coluna sinalizada (borda/fundo âmbar, ícone
  ⚠, tooltip explicando "provável bug de extração, não catálogo fraco").
- `ComparisonView.tsx` mostra um banner âmbar acima da grade quando `noProductPassedEitherRound`
  é verdadeiro — testado tanto para a fixture `nenhum-passou` (dispara) quanto para
  `pedidoA-delta-positivo` (não dispara).
- `delta-negativo.ts` reaproveita o Corvo Sport 2 real, mas encena o terceiro bug do mesmo
  comentário de 04 (positivo de substring dentro de frase negada) para produzir uma regressão:
  um controle que rejeitava corretamente passa a ser aprovado por engano, e o "produto
  escolhido" da rodada depois vira o próprio controle — delta -1.
- `sem-expectativas.ts` é a única sem lastro em incidente real: dois acessórios inventados
  (`expectedToPass: null`) para provar que ficam fora do denominador da taxa de sucesso sem
  precisar tocar em `groupByExpectation`, que já existia da 02.
- `FixtureSelector.tsx` + `fixtures/index.ts` dão o seletor no canto superior direito;
  `App.tsx` guarda a fixture selecionada em `useState`, sem navegação.
- Verificação visual com PinchTab contra `bun run dev`: as 5 fixtures renderizam corretamente
  (grade completa, sem tela vazia, colunas destacadas, banner, delta negativo em vermelho,
  grupo "Fora da contagem"). `bun run test` (32 testes), `tsc -b` e `oxlint` limpos.
