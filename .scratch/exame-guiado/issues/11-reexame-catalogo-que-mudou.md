# 12 — Reexame de um catálogo que mudou: linha de base e passadas

**What to build:** o fluxo das 5 fases mede a loja **uma vez**. No instante em que o lojista
sobe um produto novo, o número na tela fica errado e nada diz isso — não há data, não há escopo,
não há noção de que o catálogo medido não é mais o catálogo que existe. Depois deste ticket a
ferramenta sabe responder "o que mudou desde a última vez, e o que isso fez com o número".

Isto é o "passo seguinte" que o Out of Scope da spec nomeia ao adiar persistência. Ele continua
adiado na forma forte — **histórico multi-passada não entra**. O que entra é o mínimo sem o qual
a pergunta não tem resposta: a **última** passada, e a linha de base contra a qual ela foi
medida.

## O D4 sobe mais um andar

O D4 congela os requisitos entre as duas **rodadas** (cru vs. otimizado) para o não-determinismo
do LLM não mudar *a pergunta* entre elas. Entre duas **passadas** — hoje, e daqui a duas semanas
com 12 produtos novos — o problema volta inteiro: reextrair do mesmo texto de pedido devolve
requisitos ligeiramente diferentes, e a variação do número vira ruído de LLM disfarçado de fato
sobre a loja. A 18 da `entrega-hackathon` já registra as duas chamadas não-determinísticas do
caminho e a ausência de seed no AI Gateway.

**O artefato congelado tem que ser o `BuyerOrderRequirements`, não o texto do pedido.** Essa é a
única mudança de servidor deste ticket, e é a que não dá para adiar sem retrabalho: sem ela a
linha de base não existe e toda comparação ao longo do tempo é ruído.

Há um bônus que cai sozinho dessa mudança. A única chamada de LLM em
`CompareBuyerAgentRounds` é `ExtractRequirementsAsync`; `BuildComparison` e
`BuyerAgentDecisionEngine.Simulate` são lógica pura, sem rede
(`BeforeAfterComparisonTools.cs:54`). Com os requisitos já congelados, **reexaminar um catálogo
que cresceu custa zero chamadas.**

## Passada e linha de base

Duas entidades, e a distinção precisa aparecer na tela — não só no dado:

- **Linha de base** — o conjunto de requisitos congelado. É o exame.
- **Passada** — um catálogo lido num instante, medido contra uma linha de base.

Passadas da **mesma** linha de base são comparáveis. Mexer nos pedidos cria uma linha de base
**nova**, e a série anterior termina ali. A UI precisa dizer isso em vez de desenhar uma linha
contínua que mistura duas perguntas diferentes e chama de evolução.

Isso força uma escolha real quando o catálogo cresce, e a escolha é do lojista: reexaminar (mesma
linha de base, comparável, grátis) ou revisar os pedidos (nova linha de base, não comparável).
Por isso as duas ações não podem ter o mesmo peso visual.

## Cobertura: o modo de falha silencioso

Produto novo pode trazer um tipo que **nenhum pedido aprovado testa**. O número fica verde
porque ninguém fez a pergunta — e um exame que não cobre o que entrou não está medindo a loja,
está medindo a parte dela que envelheceu.

A tela mostra a cobertura (tipos de produto no catálogo vs. tipos que os pedidos aprovados
tocam) e sinaliza os produtos novos que caem fora dela. Não decide nada sozinha: sinaliza, e a
decisão de adicionar pedido — com o custo de perder comparabilidade — é do lojista.

## Reexaminar é grátis; consertar é que custa

Mesma assimetria que ordena o fluxo inteiro, aplicada ao eixo do tempo: **não existe motivo para
diagnóstico incremental.** Reexamina-se o catálogo inteiro, sempre — é uma passada de lógica
pura sobre requisitos congelados.

O incremental pertence à **fase 4**, e por um motivo concreto: sem saber o que já foi enviado
para aprovação, a pré-visualização de custo propõe gastar de novo exatamente nos produtos que já
foram consertados. É o único ponto do fluxo onde a falta de estado custa dinheiro.

## A armadilha, que é a mesma forma do erro que o D1 previne

O desenho intuitivo para "chegou produto novo" é **gerar conteúdo otimizado nele
automaticamente**. Isso transforma a ferramenta em gerador de conteúdo rodando em background com
um painel de métricas ao lado — exatamente a commodity contra a qual o projeto se define.

A reentrada é pelo **exame**: *"você adicionou 12 produtos; 5 são invisíveis"* é o mesmo gancho
da primeira passada, repetido. O conserto continua atrás do gate humano e da contagem de custo
prévia. Nada neste ticket dispara geração sozinho.

## O que isto desbloqueia

O `o-que-estamos-construindo.md` chama o projeto de **test suite de legibilidade agêntica**. Um
test suite que roda uma vez é uma auditoria. **Adicionar produto é o commit; o exame é o CI.** O
caso que prova isso é a **regressão** — produto que passava e parou de passar porque alguém
editou a descrição e tirou a estrutura. Hoje ele não tem lugar nenhum na ferramenta, e é o caso
de maior valor da recorrência.

**Blocked by:** 04 — a casca é quem carrega o estado do fluxo entre as fases.

**Status:** ready-for-agent

- [ ] O servidor aceita requisitos já extraídos, além do texto do pedido, e reexaminar com eles
      não faz nenhuma chamada de LLM
- [ ] A linha de base (requisitos congelados) é persistida junto da passada, e reexaminar reusa
      exatamente ela — sem reextração
- [ ] Alterar o conjunto de pedidos cria uma linha de base nova, e a UI declara que a série
      anterior terminou em vez de continuar a mesma linha
- [ ] Cada produto do catálogo é classificado como novo, alterado ou inalterado em relação à
      última passada, por identidade de handle e hash do conteúdo — sem chamada de LLM
- [ ] O resultado exibido carrega quando foi medido e sobre quantos produtos, e um catálogo que
      mudou desde então é sinalizado como tal
- [ ] Produtos novos cujo tipo nenhum pedido aprovado cobre aparecem como lacuna de cobertura,
      sem a ferramenta decidir sozinha o que fazer a respeito
- [ ] Regressão — produto que passava na passada anterior e não passa agora — é um estado
      visível, não some no total
- [ ] A métrica de topo continua sendo a da loja inteira; o recorte do que mudou é o segundo
      número, nunca o primeiro
- [ ] Nenhuma geração de conteúdo é disparada por produto novo entrar
- [ ] Persistência é o mínimo — a última passada e sua linha de base. Histórico multi-passada
      continua fora
