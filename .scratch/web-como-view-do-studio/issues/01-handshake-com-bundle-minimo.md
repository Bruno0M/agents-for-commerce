# 01 — Handshake de pé com um bundle mínimo

> **Migrado para o GitHub: [#4](https://github.com/Bruno0M/agents-for-commerce/issues/4).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** o `mcp-server` .NET passa a servir um HTML trivial como resource MCP, e uma
tool nulária o declara via `_meta.ui.resourceUri`. O objetivo é ver **qualquer coisa** renderizar
dentro do Studio. Nenhuma linha do `apps/web/` entra aqui.

O conteúdo do HTML é um "hello" de poucas linhas que completa o handshake e escreve o próprio
estado de conexão na tela. Nada mais.

**Por que assim:** é o D5 da spec. Se o `/web` completo subisse de primeira e nada aparecesse, o
suspeito seria qualquer coisa entre a serialização do `_meta` em C#, o mime type, o timeout de
15s, o tamanho do bundle, a CSP e um `import()` que escapou. Com um bundle trivial sobra um
suspeito por vez.

**O que já está confirmado, e não precisa ser redescoberto:**

- O SDK C# 1.2.0 tem `McpServerResource`, `WithResourcesFromAssembly`, `TextResourceContents`
  com `MimeType`, e `Meta` (serializado como `_meta`) — nada de pacote novo.
- O mime type é `text/html;profile=mcp-app` (`packages/shared/src/mcp-apps/types.test.ts:11` do
  clone em `apps/studio/`).
- O URI do resource segue o esquema `ui://` (`packages/shared/src/mcp-apps/types.ts`,
  `UI_RESOURCE_URI_SCHEME`).
- A validação não precisa de agente nem de provider: a aba **UI** da Connection roda a tool e
  mostra o card (`apps/web/src/components/details/connection/connection-ui-tab.tsx`), conforme
  `docs/deco-studio-internals.md` §6.

**O risco real deste ticket** não é o C# — é o handshake. O `_meta` pode serializar num formato
que o `getUIResourceUri` do host não reconhece (ele aceita tanto `ui.resourceUri` aninhado quanto
a chave achatada `"ui/resourceUri"` — ver `packages/shared/src/mcp-apps/types.test.ts`), e um
`_meta` que sai errado falha silenciosamente: a tool simplesmente não aparece como candidata a
view.

**Blocked by:** —

**Status:** ready-for-agent

- [x] O servidor expõe um resource `ui://` com `mimeType` `text/html;profile=mcp-app`
- [x] Uma tool nulária declara `_meta.ui.resourceUri` apontando para esse resource, e o `_meta`
      chega ao host no formato que o `getUIResourceUri` reconhece
- [ ] A página completa o handshake dentro dos 15s e renderiza dentro do Studio, verificado na
      aba UI da Connection
- [ ] A tool aparece como candidata a view fixada na tela de layout do virtual MCP
- [x] Todo CSS e JS é inline; a página não faz nenhuma requisição de rede
- [x] Existe teste no `McpServer.Tests` afirmando o `_meta` da tool e o `mimeType` do resource
- [x] Está registrado no ticket — em Comments — qual formato de `_meta` funcionou, e se o SDK C#
      exigiu algum contorno para emiti-lo

## Comments

**Formato de `_meta` que funcionou:** `[McpMeta("ui", JsonValue = """{"resourceUri":"ui://hello-handshake/app"}""")]`
(opção 1 da ordem de tentativa do ticket). Isso serializa para
`{"ui":{"resourceUri":"ui://hello-handshake/app"}}` — a forma **aninhada** de verdade (não uma
string escapada dentro de `_meta.ui`), verificado tanto num script de reflexão isolado (com o SDK
1.2.0 real, sem projeto) quanto no teste `HelloHandshakeToolsTests.ProtocolTool_Meta_HasNestedUiResourceUri_MatchingTheResource`,
que navega o `JsonObject` (`meta["ui"]` precisa ser `JsonObject`, não `JsonValue`/string) em vez
de comparar string bruta.

**Contorno exigido:** nenhum registro programático foi necessário — o caminho declarativo
funcionou. O único cuidado foi **não** usar o construtor `(string name, string value)` do
`McpMetaAttribute` com `"ui.resourceUri"` como `name`: essa forma óbvia falha em silêncio, porque
o atributo usa `name` como chave *literal* do `JsonObject` (sem split por ponto) — produziria
`_meta["ui.resourceUri"]` (uma chave com ponto), que o host não reconhece. A saída foi usar a
propriedade `JsonValue` (que sobrescreve o valor do construtor) com um objeto JSON literal sob a
chave `"ui"`, o que produz o aninhamento real. Confirmado que essa é a armadilha exata via teste
de regressão (`ProtocolTool_Meta_DoesNotContainTheLiteralDottedKey`).

Como bônus, referenciar `HelloHandshakeResource.ResourceUri` (um `const string`) dentro da
string interpolada bruta (`$$"""...{{HelloHandshakeResource.ResourceUri}}..."""`) do
`JsonValue` também é constante de tempo de compilação em C# 10+ quando todas as interpolações
são, elas mesmas, `const string` — então o argumento do atributo compila normalmente e a URI do
resource e do `_meta` da tool não podem divergir silenciosamente.

**O que falta de validação humana:** os dois critérios que dependem do Studio real (handshake
completando dentro dos 15s na aba UI da Connection, e a tool aparecendo como candidata a view
fixada na tela de layout do virtual MCP) não foram verificados — exigem rodar contra o host de
verdade.
