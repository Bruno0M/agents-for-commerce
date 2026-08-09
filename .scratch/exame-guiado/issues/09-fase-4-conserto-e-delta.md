# 08 — Fase 4: conserto dos ilegíveis e o delta

**What to build:** o lojista já viu o diagnóstico. Agora ele conserta — e vê o número mudar.
Esta fase gera conteúdo otimizado **apenas nos produtos que falharam por ilegibilidade**,
re-simula com os **mesmos** pedidos, e renderiza o antes/depois.

O recorte de quais produtos são gerados é a decisão, não um detalhe de eficiência. Os produtos
que passaram não precisam de nada, e os rejeitados legitimamente não têm o que consertar —
gerar neles é queimar crédito para não mudar resultado. E o recorte cai sozinho da assimetria
de custo do sistema: `simulate_buyer_agent` é **1 chamada de LLM independente de o catálogo ter
7 ou 400 produtos**, enquanto `generate_optimized_content` é **1 por produto**. Diagnosticar 400
produtos são ~2 chamadas; otimizar 400 são 400. **O exame é quase de graça; o remédio é que
custa** — e isso é um funil, não uma limitação: diagnóstico grátis, conserto cobrado.

**Os pedidos congelam junto com o catálogo (D4).** Se o conjunto de pedidos for regerado entre
as rodadas, "antes" e "depois" não são comparáveis. É o mesmo problema que
`compare_buyer_agent_rounds` já resolve um nível abaixo — ela extrai os requisitos **uma vez**
para as duas rodadas, justamente para que o não-determinismo do LLM não mude *a pergunta* entre
elas. Aqui a disciplina sobe um andar: o conjunto aprovado na fase 2 é usado inalterado nas duas
rodadas. O **formato do artefato congelado** (pedidos salvos ao lado de `catalog-antes.json`) é
território do ticket 18 da `entrega-hackathon`; o que este ticket garante é o comportamento —
nada de regerar pedido no meio.

**A tela do resultado já existe e não é reescrita.** A `.scratch/view-antes-depois/spec.md`
produziu `ComparisonView` como função pura do `BeforeAfterComparisonResult`, e ela serve dois
consumidores: a view do Studio e o front próprio. O wizard **não** entra nela — dentro do Studio
a view roda sob CSP `default-src 'none'; connect-src 'none'` e não dispara tool nenhuma. A
orquestração desta fase é casca em volta do componente compartilhado; a view do Studio (ticket
14) continua renderizando só a fase 4, sem mudança.

**Blocked by:** 06, 08

**Status:** ready-for-agent

- [ ] A geração roda **só** nos produtos que falharam por ilegibilidade; produtos que passaram
      e rejeitados legítimos não geram chamada
- [ ] A contagem de chamadas de geração que serão feitas é mostrada **antes** de rodar — o
      lojista sabe o que está prestes a gastar
- [ ] A re-simulação usa exatamente os pedidos aprovados na fase 2, sem regerar nenhum
- [ ] O resultado é renderizado pelo `ComparisonView` existente, sem fork nem cópia do
      componente
- [ ] O drill-down mostra a informação promovida de prosa a campo estruturado, com origem e
      trecho — dado real do ticket 08, não fixture
- [ ] A view do Studio continua renderizando o mesmo componente sem nenhuma mudança e sem
      nenhuma chamada de rede
- [ ] Falha de geração num produto não derruba a fase inteira — o produto aparece como não
      consertado e o resto segue
- [ ] O delta é apresentado em cima da métrica de ilegibilidade; o percentual de classificação
      correta só aparece quando há gabarito

## Comments

**O recorte "só os que falharam por ilegibilidade" fica incompleto a partir da segunda passada.**
Numa loja que ganha produtos com o tempo, ele precisa ser *"falhou por ilegibilidade **e** ainda
não foi enviado para aprovação"* — senão a contagem de custo prévia propõe gastar de novo
exatamente nos produtos que já foram consertados. Este é o único ponto do fluxo onde a falta de
estado custa dinheiro, e é o motivo de o ticket 11 existir mesmo com persistência fora do escopo
da spec.

O estado do que já foi enviado é território do ticket 11; o que muda **aqui** é só o predicado do
recorte e o número que aparece na pré-visualização.

**08/08/2026 — o `ComparisonView` mudou de lugar.** O critério *"renderizado pelo `ComparisonView`
existente, sem fork nem cópia"* continua valendo palavra por palavra; o componente só passa a
morar dentro do `apps/web`, junto com suas fixtures e testes (ticket 04). O
`apps/comparison-view` foi aposentado como app.

A regra anti-fork **ganha importância** com a mudança, em vez de perder: antes ela era sustentada
pelo componente viver noutro app; agora só a disciplina segura. Reescrever a tela em shadcn
"porque já estamos no `apps/web`" é o fork que este critério existe para impedir.
