# 08 — Aterrissagem do dado por produto em metafields da Shopify

**What to build:** o conteúdo otimizado tem duas naturezas diferentes, e só uma delas cabe no Task Board. A **capacidade** (fazer a PDP emitir JSON-LD completo) é código e vai por PR — é o ticket 07. O **dado por produto** (as specs e a FAQ extraídas de cada descrição) não tem onde aterrissar no código: `.deco/blocks/*.json` guarda configuração de seção e layout, não conteúdo por produto. O lugar dele é metafield na Shopify, que o loader da deco já consome.

Depois deste ticket, aprovar uma sugestão faz as specs extraídas virarem metafields do produto na loja, e a PDP publicada passa a exibi-las — fechando o circuito do agente comprador externo.

**Decisão em aberto a fechar dentro deste ticket:** a escrita de metafields acontece antes ou depois do gate de aprovação humana? Antes é mais simples de demonstrar; depois é mais coerente com o "nunca publica sozinho" que o projeto vende. Registrar a escolha e a razão nos comentários.

**Blocked by:** 01, **17**. A 17 congela o catálogo "antes" num arquivo versionado, e este
ticket é justamente o que destrói esse estado na loja — escrever metafield antes de a linha
de base estar salva inutiliza o número do ticket 04, de forma irreversível e só parcialmente
visível (ver a justificativa na 17).

**Status:** in-progress — blocked on `.deco/blocks/PDP Loader.json` not declaring any metafield identifiers (see Comments)

- [x] A decisão sobre o momento da escrita (antes ou depois do gate) está tomada e registrada
- [x] As specs extraídas de um produto do catálogo de demo viram metafields na loja
- [x] O escopo de permissão da app da Shopify cobre escrita de metafield
- [ ] A PDP publicada exibe o dado escrito, comprovando que o loader o consome
- [x] Existe caminho de rollback: dá para limpar os metafields e voltar a loja ao estado "antes" para regravar a demo

## Comments

**06/08/2026 — decisão: escrita depois do gate, e código implementado (não validado ao vivo ainda).**

**Decisão.** Escrita acontece **depois** da aprovação humana no Task Board, não antes. O
próprio ticket já se compromete com isso no segundo parágrafo ("aprovar uma sugestão faz
as specs extraídas virarem metafields") — "antes" é mais fácil de demonstrar, mas
significaria o servidor escrevendo na loja por iniciativa própria, o oposto exato do que
`publish_suggestion` promete ("nunca aplica a mudança direto na loja"). Nada aqui impõe
essa ordem mecanicamente — não existe, neste código, uma chamada que leia de volta o
status de aprovação de um item do Task Board — a garantia é a mesma que `publish_suggestion`
já usa para "nunca publica sozinho": documental, carregada pela description da tool que um
agente lê antes de chamar.

**Implementado** (`Tools/ProductMetafieldTools.cs`, novo `MetafieldKeySlugifierTests.cs`):

- `write_product_metafields`: recebe o mesmo `ContentGenerationResult` já passado para
  `publish_suggestion` e grava `OptimizedCatalog.GeneratedProperties` como metafields do
  produto (`OptimizedCatalog.Id`) via `metafieldsSet`, no namespace `geo`. Nome legível da
  spec (ex: "Cancelamento de ruído") vira chave via `MetafieldKeySlugifier` (remove acento,
  minúscula, `[^a-z0-9]+` → `_`, limite de 64 chars) — não fica legível de verdade porque o
  loader da Shopify (`@decocms/apps-shopify`, `transform.ts:225`) usa a `key` crua do
  metafield como `additionalProperty.name`, sem acesso ao nome de exibição da definição do
  metafield; é a aproximação mais legível possível sem tocar o loader.
- `clear_product_metafields`: caminho de rollback pedido no último critério — lê os
  metafields existentes no namespace `geo` de um produto e remove todos via
  `metafieldsDelete`. Só apaga o que este ticket escreve; não toca metafields de outros
  namespaces.
- `dotnet test` a partir de `apps/mcp-server/`: **55 passed, 0 failed** (45 existentes + 10
  novos em `MetafieldKeySlugifierTests`, que cobrem só a parte pura — a chamada de escrita em
  si segue o padrão já estabelecido por `CatalogReadTools`/`PublishTools`, nenhum dos dois
  tem teste unitário porque `GraphService` da ShopifySharp não é mockável sem um harness
  próprio; validação é ao vivo, igual às tickets 04/06).

**06/08/2026 — escopo concedido pelo usuário; validado ao vivo contra a loja real.**
Harness descartável (mesmo padrão da 04/06 — fora do repo, em `/tmp`, apagado depois de
confirmar), instanciando os serviços como `Program.cs` faz, contra `aurora-nc7`
(`gid://shopify/Product/9291231854804`, `afc-store-o7xzc4c2.myshopify.com`):

- **Antes:** 0 metafields — confere com a linha de base congelada na 17, sem deriva.
- `generate_optimized_content` extraiu 8 specs; `write_product_metafields` gravou as 8 sem
  `userErrors` — confirma que o escopo `write_products` está de fato concedido e efetivo (não
  só declarado). Chaves geradas por `MetafieldKeySlugifier` sobre nomes reais, sem colisão:
  `cancelamento_de_ruido`, `autonomia_da_bateria`, `carga_rapida`,
  `conectividade_bluetooth`, `peso`, `resistencia_a_agua`, `ponteiras_inclusas`,
  `codecs_de_audio`.
- Uma leitura independente (`get_product_content` de novo, não o retorno da própria tool de
  escrita) confirmou as 8 presentes no produto com key/value batendo — fecha os critérios 2 e 3.
- `clear_product_metafields` removeu as 8 sem `userErrors`; uma terceira leitura independente
  confirmou 0 metafields `geo` restantes — produto de volta ao estado exato de antes do teste.
  Fecha o critério 5.
- `dotnet test` depois do teste: segue 55/55. `git status` do `apps/mcp-server` idêntico
  antes/depois do harness — nada vazou pro repo.

**Bloqueio restante para o último critério: a PDP não busca metafield nenhum hoje.**
Achado ao investigar como fechar o critério 4: o loader do storefront
(`@decocms/apps-shopify`, `ProductDetailsPage.ts` → Storefront API `metafields(identifiers:
$identifiers)`) só busca os pares `{namespace, key}` explicitamente declarados numa prop
`metafields` — não existe wildcard "todo metafield do namespace X" na Storefront API.
`.deco/blocks/PDP Loader.json` hoje não declara nenhum identifier, então o loader busca zero
metafields, independente do que a Admin API tenha gravado. Diferente do bloqueio de escopo
(ação externa do usuário), este é código — `.deco/blocks/*.json` é exatamente o tipo de
arquivo que a introdução deste ticket descreve como "capacidade" e atribui ao caminho de PR
via Task Board (mesmo mecanismo da 07), não a esta tool. Como as chaves são por-produto e
dinâmicas (nome da spec varia por produto), fechar isto para a demo significa declarar as
chaves conhecidas do produto de demo escolhido (as 8 acima, para `aurora-nc7`) no loader —
decisão e execução ainda em aberto, não tomada unilateralmente aqui porque envolve criar um
item no Task Board (mudança visível/compartilhada).
