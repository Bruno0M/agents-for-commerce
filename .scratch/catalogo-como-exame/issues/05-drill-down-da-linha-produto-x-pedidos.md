# 05 — O drill-down da linha: um produto × N pedidos

**What to build:** clicar numa linha abre o detalhe daquele produto — o que o robô procurou em
cada pedido, o que ele encontrou, de onde o dado veio, e (quando houve conserto) o antes e o
depois. É onde o lojista para de aceitar um badge por confiança.

**A grade aqui é a transposta da que existe, e por isso é componente novo.** `RequirementsGrid`
(`apps/web/src/comparison/components/RequirementsGrid.tsx`) é **produtos × requisitos, para um
pedido**. O drill-down é **pedidos × requisitos, para um produto**. Não é a mesma grade girada:
muda a chave de linha, muda a dedup e muda o que é comparável entre células. O que se reaproveita
é `EvidencePanel`, os tipos de `comparison/types.ts` e as regras de célula — **não** se forka o
`RequirementsGrid`, e a regra anti-fork da `view-antes-depois` continua valendo palavra por
palavra.

**O `ComparisonView` continua puro** (D9 da spec). Ele é função pura do `ComparisonResult` — um
pedido → N produtos — e é essa propriedade que permite embutí-lo sob CSP `connect-src 'none'` na
view do Studio (ticket 14 da `entrega-hackathon`). Nada deste ticket pode dar a ele consciência de
tabela, de estado de linha ou de rede.

**São dois casos, e o segundo é fácil de esquecer.** O produto que **não precisou de conserto**
também abre drill-down: mostra o que ele tem, de onde vem, e por que passou. Sem esse caso a tela
só sabe falar de defeito, e o lojista não tem como ver o que está certo — nem como confiar no
diagnóstico dos outros. Nas quatro variações:

| Estado da linha | O que o drill-down mostra |
| --- | --- |
| ✅ `passed` | os requisitos confirmados, com origem — sem coluna "depois" |
| ⚠️ `illegible` | o que faltou, por pedido; depois do conserto, antes → depois |
| ◐ `mixed` | idem, com a ressalva de que o conserto não recupera a venda daquele pedido |
| ⭕ `legitimatelyRejected` | o dado que existe e nega o requisito — e nenhuma ação oferecida |

**A prova do argumento central mora aqui.** `source` e `descriptionExcerpt` (ticket 08 do
`exame-guiado`) são o que transforma *"o robô reescreveu meu texto"* em *"o robô promoveu a campo
estruturado a informação que você já tinha escrito"*. Enquanto aquele ticket estiver aberto, o
drill-down se desenvolve contra fixture — os tipos já declaram os campos — e a ausência do dado
real precisa aparecer como ausência, não como campo vazio disfarçado.

O botão de conserto pode existir aqui como atalho de **"selecionar só este"**, jamais como caminho
paralelo que dispara geração pulando a contagem de custo do ticket 06.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Clicar na linha abre o detalhe do produto sem sair da tabela nem perder filtro/ordenação
- [ ] O detalhe é organizado por **pedido**: para cada pedido aprovado, o que foi procurado e o
      que foi encontrado naquele produto
- [ ] Cada dado confirmado mostra a origem (opção, metafield, tipo, preço, extraído da descrição)
- [ ] O trecho da descrição onde a informação já estava aparece quando existe, e a ausência é
      explícita quando não existe
- [ ] Produto que **não precisou de conserto** tem drill-down útil, mostrando o que ele tem e por
      que passou — sem coluna "depois" inventada
- [ ] Produto rejeitado legitimamente mostra o dado que nega o requisito e **não** oferece ação
- [ ] Depois do conserto, o antes e o depois aparecem lado a lado para aquele produto
- [ ] `ComparisonView` não é modificado, forkado nem copiado, e continua sem rede
- [ ] `RequirementsGrid` não é forkado; o que é compartilhado é compartilhado de fato
- [ ] Desenvolvível e testável inteiro em fixture, incluindo o caso sem `descriptionExcerpt`

## Comments

**Nota de reconciliação (09/08/2026):** o ticket 04 desta pasta teve o desenho de aprovação/edição
explícita rejeitado pelo dono do projeto e reescrito para um botão único, sem gate de aprovação —
ver `## Comments` de `04-faixa-do-exame-pedidos-persistentes-e-execucao.md`. Isso não bloqueia nem
muda o escopo deste ticket: o produto ainda tem uma linha por produto (`ProductExamRow`) com
motivos atribuídos a pedidos (`AttributedUnmetRequirement.orderIds`), que é o dado que o
drill-down consome — só a origem e a palavra mudaram. Onde este ticket ou seus testes disserem
"pedido aprovado", leia-se "pedido que o agente escreveu e o exame rodou" — os pedidos continuam
tendo `id` estável e continuam sendo a base de atribuição do drill-down, só não existe mais um
passo de aprovação humana sobre eles antes de rodar.
