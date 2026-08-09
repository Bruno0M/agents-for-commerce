# 04 — O bundle do `/web` servido como resource do `mcp-server`

> **Migrado para o GitHub: [#7](https://github.com/Bruno0M/agents-for-commerce/issues/7).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** o HTML de um arquivo produzido pelo ticket 02 substitui o "hello" do ticket 01.
A partir daqui, abrir a view no Studio mostra o `apps/web/` de verdade.

É o ticket que junta as três pontas: o bundle (02), o transporte (03) e a plumbing de resource
já provada (01).

**Como o bundle entra no servidor:** `EmbeddedResource` no `.csproj`, servido a partir do
assembly. Sem arquivo solto no disco e sem caminho relativo que muda entre `dotnet run` e
publish — é o D7 da spec.

**O custo que isso cobra, e que precisa ficar registrado:** o ciclo de iteração da view passa a
ser rebuild do .NET. Não temos o hot reload que o tutorial da deco mostra, porque aquilo é um
projeto full-code hospedado pelo próprio Studio, e o nosso servidor é externo. O desenvolvimento
de tela continua no `bun dev` (D2); o bundle só é regerado quando se quer ver a coisa dentro do
Studio.

**Precisa existir um passo de build documentado** que gere o HTML e o coloque onde o `.csproj` o
encontra. Se esse passo for um comando que só quem escreveu sabe rodar, o ticket não fechou.

**Onde isso provavelmente dói:** o `/web` completo é ordens de grandeza maior que o "hello" do
ticket 01. O handshake tem 15s, e o HTML é entregue via `resources/read` antes de a página sequer
começar a executar. Se o tamanho medido no ticket 02 for grande, é aqui que aparece — e o
sintoma será timeout de handshake, não erro de rede. O ticket 01 deixa o caminho curto provado,
então a diferença entre os dois é o suspeito.

**Blocked by:** 01, 02, 03

**Status:** ready-for-agent

- [ ] O bundle do `apps/web` é embedded resource do assembly e é servido no lugar do "hello"
- [ ] Existe um passo de build documentado que regenera o bundle, e ele está no README do
      `apps/web` ou do `mcp-server`
- [ ] A view abre no Studio e renderiza o `/web` de verdade, com a navegação entre destinos
      funcionando dentro do iframe
- [ ] A view completa o handshake dentro dos 15s com o bundle real — se não completar, o tamanho
      medido e o que foi feito a respeito estão em Comments
- [ ] A view não declara `_meta.ui.csp.connectDomains` e roda sob a CSP default (D1)
- [ ] O `GET /catalog` continua de pé para o modo avulso, e nenhuma rota nova foi adicionada
