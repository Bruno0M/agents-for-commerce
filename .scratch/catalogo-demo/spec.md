# Catálogo de demo — áudio pessoal

Fecha os itens 12.2 e 12.9 do `decisoes-pre-construcao`.

## Por que áudio

Categoria densa em spec. O comprador pede coisas verificáveis (ANC, horas de bateria,
resistência a água, multipoint, preço) e nenhuma delas é subjetiva. É o oposto de
vestuário, onde o pedido é tamanho/cor — já estruturado por padrão como variant option —
e o resto é caimento e estilo, que nenhum schema resolve.

## A regra que determina se a demo mostra um número

**Todo fato citado no pedido precisa existir na prosa do "antes", solto, sem estrutura.**

A otimização é *extração*, não invenção. O teste com snowboard deu 0% → 0% porque os
produtos de seed têm `descriptionHtml` vazio — não havia de onde extrair. Por isso cada
descrição abaixo é prosa de marketing corrida, com os fatos embutidos em frases.

Proibido no "antes":
- listas `<ul>` de specs
- tabelas
- metafields
- qualquer spec em variant option, **exceto Cor** (ver abaixo)

**Cor é variant option de propósito.** Ela entra no `additionalProperty` pelo loader da
deco (`transform.ts:230`, `selectedOptions` → `additionalProperty`), o que faz o
`GeneratedAdditionalProperty.Source` marcar `option` nela e `description` em todo o
resto. Essa diferença na tela é a prova de que não trapaceamos: dá pra contar quantas
propriedades saíram de texto solto.

## Os 7 produtos

Vendor fictício em todos. Nenhuma marca real.

| # | Produto | Preço | ANC | Bateria | Tipo | Papel na demo |
|---|---------|-------|-----|---------|------|----------------|
| 1 | Aurora NC7 | 289,00 | sim | 28h | intra TWS | passa — candidato |
| 2 | Vetor Studio One | 279,00 | sim | 40h | over-ear | passa — candidato |
| 3 | Halo Air Pro | 299,00 | sim | 22h | intra TWS | passa — candidato |
| 4 | Corvo Sport 2 | 189,00 | **não** | 32h | intra TWS | **controle: falha em ANC** |
| 5 | Orbe Link 4 | 249,00 | sim | **14h** | on-ear | **controle: falha em bateria** |
| 6 | Nimbo Mini | 149,00 | **não** | 18h | on-ear | falha em ANC + bateria |
| 7 | Vetor Reference 900 | 1.290,00 | sim | 60h | over-ear | **controle: falha em preço** |

Faixa de 149 a 1290 — a restrição "até R$300" morde de verdade, e o 7 existe justamente
pra ela ter em quem morder.

Os controles são deliberadamente **atraentes em outros eixos** (o Corvo é o mais barato
com melhor bateria da faixa; o Reference 900 é o melhor produto da loja). Se o produto
rejeitado fosse obviamente ruim, a rejeição não provaria nada.

---

### 1. Aurora NC7 — R$ 289,00

- `handle`: aurora-nc7
- `vendor`: Aurora
- `productType`: Fones de ouvido
- `tags`: tws, anc, bluetooth
- Opção **Cor**: Preto, Areia
- Imagem: `https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=1600&q=80`
- alt: "Fone intra-auricular sem fio Aurora NC7 com estojo de carregamento"

`descriptionHtml` (ANTES — não estruturar):

```html
<p>O Aurora NC7 começou com uma pergunta chata: por que cancelamento de ruído ativo precisa custar o preço de um celular? Colocamos captação por microfone duplo no mesmo padrão de modelos três vezes mais caros, e o silêncio aparece no primeiro segundo — no busão, no open space, no voo das seis da manhã.</p>
<p>O estojo recarrega o fone quase três vezes, o que na prática dá 28 horas longe da tomada. Esqueceu de carregar? Dez minutos na base devolvem cerca de duas horas de música. O Bluetooth 5.3 mantém dois aparelhos conectados ao mesmo tempo, então a reunião que entra no notebook não briga com o que está tocando no celular.</p>
<p>São 4,8 g em cada lado, certificação IPX4 para chuva leve e treino puxado, e três tamanhos de ponteira na caixa até você achar a vedação certa. Transmissão em AAC e SBC.</p>
```

Fatos plantados: ANC sim · 28h · carga rápida 10min/2h · BT 5.3 · multipoint · 4,8 g · IPX4 · AAC, SBC

---

### 2. Vetor Studio One — R$ 279,00

- `handle`: vetor-studio-one
- `vendor`: Vetor
- `productType`: Fones de ouvido
- `tags`: over-ear, anc, bluetooth
- Opção **Cor**: Preto
- Imagem: `https://images.unsplash.com/photo-1520170350707-b2da59970118?w=1600&q=80`
- alt: "Fone over-ear Vetor Studio One em preto fosco"

`descriptionHtml` (ANTES):

```html
<p>O Studio One é o fone que a gente queria ter quando começou a mixar em casa. Concha fechada que abraça a orelha inteira, driver de 40 mm com resposta que não infla o grave pra impressionar, e cancelamento de ruído ativo que você liga quando o vizinho resolve furar a parede.</p>
<p>A autonomia é o ponto em que ele não tem concorrente na faixa: 40 horas com o ANC ligado. Dá pra atravessar uma semana de trabalho sem lembrar que ele tem bateria. Carrega por USB-C e aceita cabo P2 se acabar de vez.</p>
<p>Pesa 265 g, com haste de aço e espuma com memória revestida em couro sintético. Conecta por Bluetooth 5.2 — um aparelho por vez, então se você alterna entre notebook e celular o tempo todo, vale olhar o Reference 900. Não tem proteção contra água: esse é fone de mesa, não de corrida.</p>
```

Fatos plantados: ANC sim · 40h · driver 40 mm · USB-C · P2 · 265 g · BT 5.2 · **sem multipoint** · **sem resistência a água**

> A negativa explícita é intencional: dá ao simulador algo verificável para *rejeitar* no
> pedido C sem que o produto seja ruim.

---

### 3. Halo Air Pro — R$ 299,00

- `handle`: halo-air-pro
- `vendor`: Halo
- `productType`: Fones de ouvido
- `tags`: tws, anc, bluetooth, ldac
- Opção **Cor**: Grafite, Azul-noite
- Imagem: `https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=1600&q=80`
- alt: "Fone intra-auricular Halo Air Pro com estojo em azul-noite"

`descriptionHtml` (ANTES):

```html
<p>O Air Pro é para quem escutou um arquivo em alta resolução uma vez e não conseguiu mais voltar. Ele fala LDAC, o que significa que o áudio chega no seu ouvido com muito mais informação do que o Bluetooth comum entrega — e a diferença aparece nos discos que você já conhece de cor.</p>
<p>O cancelamento de ruído ativo tem três níveis e um modo ambiente que deixa a voz do atendente passar sem tirar o fone. Bluetooth 5.3, com dois aparelhos pareados ao mesmo tempo.</p>
<p>São 22 horas contando o estojo, o suficiente para a semana de escritório com uma recarga no meio. Cada lado tem 5,2 g e certificação IPX5, então chuva de verdade não é problema.</p>
```

Fatos plantados: ANC sim (3 níveis + ambiente) · LDAC · BT 5.3 · multipoint · 22h · 5,2 g · IPX5

---

### 4. Corvo Sport 2 — R$ 189,00 — **CONTROLE (falha em ANC)**

- `handle`: corvo-sport-2
- `vendor`: Corvo
- `productType`: Fones de ouvido
- `tags`: tws, esportivo, bluetooth
- Opção **Cor**: Preto, Verde-limão
- Imagem: `https://images.unsplash.com/photo-1578319439584-104c94d37305?w=1600&q=80`
- alt: "Fone esportivo sem fio Corvo Sport 2 com estojo"

`descriptionHtml` (ANTES):

```html
<p>O Sport 2 foi feito para uma coisa só: não cair da sua orelha. A aleta de silicone trava na concha e continua lá no sprint, no burpee e no décimo quilômetro. Testamos com corredores de rua por seis meses antes de liberar.</p>
<p>Certificação IPX7 — ele aguenta ser submerso, então suor e chuva forte são detalhe. Passe em água corrente depois do treino, sem medo.</p>
<p>A bateria dura 32 horas com o estojo, o que dá mais de um mês de treinos para a maioria das pessoas. Conecta por Bluetooth 5.2 e emenda dois aparelhos ao mesmo tempo.</p>
<p>Ele não tem cancelamento de ruído ativo, e isso foi decisão de projeto: quem corre na rua precisa ouvir o carro chegando. O isolamento é passivo, o da própria ponteira.</p>
```

Fatos plantados: **ANC não** (com justificativa) · IPX7 · 32h · BT 5.2 · multipoint · isolamento passivo

> Este é o produto que **deve ser rejeitado nas duas rodadas** no pedido A. É o mais
> barato e tem a melhor bateria — se ele passasse, o filtro não estaria filtrando nada.

---

### 5. Orbe Link 4 — R$ 249,00 — **CONTROLE (falha em bateria)**

- `handle`: orbe-link-4
- `vendor`: Orbe
- `productType`: Fones de ouvido
- `tags`: on-ear, anc, bluetooth
- Opção **Cor**: Prata
- Imagem: `https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=1600&q=80`
- alt: "Fone on-ear Orbe Link 4 em prata"

`descriptionHtml` (ANTES):

```html
<p>O Link 4 é o fone de dobrar e enfiar na mochila. Concha on-ear que apoia sobre a orelha em vez de envolver, arco que fecha em três partes e cabe no bolso do casaco. Prata escovado com detalhe em couro.</p>
<p>Tem cancelamento de ruído ativo — modesto, mas resolve o zumbido do ar-condicionado e o ruído do metrô. Bluetooth 5.1.</p>
<p>A autonomia é de 14 horas, e a gente prefere ser honesto sobre isso: é um fone de trajeto e reunião, não de viagem longa. Carrega por USB-C em pouco mais de uma hora. Certificação IPX4 dá conta de garoa.</p>
```

Fatos plantados: ANC sim · **14h** · BT 5.1 · USB-C · IPX4 · on-ear dobrável

> Segundo controle, e o mais importante dos dois: ele falha num requisito **numérico**,
> não booleano. Rejeitar por "não tem ANC" pode parecer casamento de palavra-chave.
> Rejeitar por "14h < 20h" só funciona se o filtro leu o número.

---

### 6. Nimbo Mini — R$ 149,00

- `handle`: nimbo-mini
- `vendor`: Nimbo
- `productType`: Fones de ouvido
- `tags`: on-ear, bluetooth, entrada
- Opção **Cor**: Preto, Vermelho
- Imagem: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&q=80`
- alt: "Fone on-ear Nimbo Mini sobre fundo amarelo"

`descriptionHtml` (ANTES):

```html
<p>O Nimbo Mini é o primeiro fone sem fio de muita gente, e a gente projetou pensando exatamente nisso. Pareia apertando um botão, toca por 18 horas e não pede mais nada de você.</p>
<p>Driver de 32 mm com um grave generoso, do tipo que funciona bem em pop e funk. Bluetooth 5.0, alcance de uns dez metros dentro de casa.</p>
<p>Não espere cancelamento de ruído ativo nem resistência à água nesta faixa — é um fone honesto de casa e escritório, com 190 g e almofada de espuma que você troca quando gastar.</p>
```

Fatos plantados: **ANC não** · **18h** · driver 32 mm · BT 5.0 · alcance 10 m · 190 g · **sem resistência a água**

---

### 7. Vetor Reference 900 — R$ 1.290,00 — **CONTROLE (falha em preço)**

- `handle`: vetor-reference-900
- `vendor`: Vetor
- `productType`: Fones de ouvido
- `tags`: over-ear, anc, bluetooth, ldac, premium
- Opção **Cor**: Preto, Grafite
- Imagem: `https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1600&q=80`
- alt: "Fone over-ear premium Vetor Reference 900"

`descriptionHtml` (ANTES):

```html
<p>O Reference 900 é o topo da linha Vetor e não pede desculpa por isso. Estrutura em alumínio usinado, concha over-ear em couro de verdade e driver de 45 mm com diafragma de fibra de carbono — a curva de resposta sai calibrada uma a uma na fábrica, e a folha de medição vem na caixa.</p>
<p>São oito microfones fazendo o cancelamento de ruído ativo, com ajuste automático conforme a pressão da cabine em voo. É o silêncio mais completo que já colocamos num produto.</p>
<p>A bateria entrega 60 horas com o ANC ligado. Fala LDAC e aptX Adaptive, mantém três aparelhos conectados ao mesmo tempo e troca entre eles sozinho quando um começa a tocar. Pesa 330 g, apesar do alumínio.</p>
```

Fatos plantados: ANC sim (8 mics) · 60h · LDAC + aptX Adaptive · **multipoint 3 aparelhos** · driver 45 mm · alumínio · 330 g

---

## Pedidos em linguagem natural (para o simulador)

### A — pedido principal da demo
> "Quero um fone bluetooth com cancelamento de ruído ativo, até R$ 300, e que a bateria dure pelo menos 20 horas."

- Passam: **Aurora NC7** (28h), **Vetor Studio One** (40h), **Halo Air Pro** (22h) → 3 candidatos, **desempate roda**
- Rejeitados, cada um por um motivo diferente:
  - Corvo Sport 2 → sem ANC
  - Orbe Link 4 → 14h < 20h
  - Nimbo Mini → sem ANC e 18h < 20h
  - Vetor Reference 900 → R$ 1.290 > R$ 300

Essa é a rodada que vai pro vídeo. Quatro rejeições por quatro razões distintas é o que
responde o jurado que perguntar "isso não está só dizendo sim pra tudo?".

### B — restrição diferente, vencedor diferente
> "Preciso de um fone pra correr, que aguente suor, com pelo menos 30 horas de bateria, até R$ 200."

- Vence: **Corvo Sport 2** (IPX7, 32h, R$ 189) — o mesmo produto rejeitado em A
- Serve para mostrar que a rejeição em A foi do *requisito*, não do produto

### C — requisito que só existe na prosa
> "Fone over-ear com cancelamento de ruído para escritório, que eu possa alternar entre o notebook e o celular sem reparear."

- Vence: **Vetor Reference 900** (multipoint de 3, sem teto de preço no pedido)
- Rejeitado: **Vetor Studio One** — tem ANC, é over-ear, mas a prosa diz "um aparelho por vez"
- Exercita o caso mais difícil: o requisito não é campo estruturado em lugar nenhum,
  está no meio de uma frase

### D — desempate largo
> "Fone com cancelamento de ruído até R$ 300."

- Passam 4: Aurora NC7, Vetor Studio One, Halo Air Pro, Orbe Link 4
- Sem restrição de bateria, o Orbe entra — mostra que o filtro é do pedido, não fixo

## Checagem antes de gravar

- [ ] Os 16 snowboards de seed estão arquivados (loja só mostra áudio)
- [ ] Os 7 produtos aparecem na vitrine da deco (publicados no canal Online Store)
- [ ] Cada PDP tem imagem, preço e descrição visíveis
- [ ] Rodada "antes" do pedido A: os 3 candidatos não têm `additionalProperty` de ANC/bateria
- [ ] Rodada "depois": as propriedades extraídas aparecem com `Source = description`
- [ ] Cor aparece com `Source = option` — o contraste que prova que não houve trapaça
