# 05 — Item do Task Board nasce atribuído ao super-agent

**What to build:** hoje `publish_suggestion` cria o item mandando só título e descrição. Sem informar o responsável, o item nasce em triage e fica lá para sempre — é a causa raiz dos 2 itens travados no board. Depois deste ticket, publicar uma sugestão cria um item que já sai de triage e entra na fila do super-agent, avançando sozinho para o fluxo de execução.

Verificável ao vivo: chamar a tool e ver o item mudar de estado no board sem intervenção manual.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A criação do item informa o responsável (`super-agent`), além de título e descrição
- [x] Um item criado pela tool sai de triage sozinho e é pego pelo super-agent
- [x] Os 2 itens travados hoje no board estão resolvidos ou removidos, para o board refletir só o fluxo novo
- [x] Teste automatizado cobre que o campo de responsável vai no payload

## Comments

**04/08/2026 — confirmado no board.** `TASK_BOARD_ITEM_LIST` devolve exatamente 2 itens, ambos com `status: "triage"` e `assigneeId: null`:

- `board_kY--IB4lSiaArT96dnZLb` — "[GEO] Otimizar conteúdo da PDP the-collection-snowboard-liquid" (03/08)
- `board_NFxliyya_ST4ZXv71qa4x` — "[Teste] Adicionar schema.org Product na PDP de teste" (02/08)

O primeiro é o item real do smoke test, e ele mostra os dois defeitos de uma vez: parou em triage por falta de assignee, e o `additionalProperty` gerado é `Title: "Default Title"` + `binding_mount: "Optimistic"` — o caso que o ticket 03 tem que matar. Também registra, na própria descrição, que a rodada antes/depois falhou nas duas passadas.

**Implementado (2026-08-04).**

**Descoberta do id do responsável.** O ticket chuta `super-agent` como nome, mas o
payload de `TASK_BOARD_ITEM_CREATE`/`TASK_BOARD_ITEM_UPDATE` quer um `assigneeId`.
`ORGANIZATION_GET` mostra que a org `bruno-feijoada` só tem um member (o owner,
humano) — não há usuário/membro "super-agent" para procurar ali. O id correto veio
de `COLLECTION_VIRTUAL_MCP_LIST`: a org tem um agente Studio Pack
`studio-task-manager_{org}` ("Task Manager") cujas próprias instructions documentam
o mecanismo, literalmente: *"Use the assignee id `super-agent` only when the user
explicitly asks to delegate work to the Super Agent [...] that delegation always
enters To Do and queues a run."* Ou seja, `"super-agent"` não é um id de membro —
é uma string reservada que o próprio Task Manager da Studio usa para essa
delegação. Confirmado ao vivo (ver abaixo): o item criado com esse valor nasceu já
em `status: "todo"` e um `status_changed` automático (`actorId: null`) para
`in_progress` ocorreu ~1.5s depois, com uma thread `"Super Agent: [...]"` vinculada.

**Código.** `StudioTaskBoardClient.CreateItemAsync`
(`Infrastructure/StudioTaskBoardClient.cs`) ganhou um terceiro parâmetro
`assigneeId`; a montagem do dicionário `arguments` (antes inline no método) virou o
método estático testável `BuildCreateItemArguments(title, description, assigneeId)`
— só inclui a chave `assigneeId` quando o valor não é vazio/whitespace, mesmo padrão
já usado para `description`. A classe ganhou a constante pública
`StudioTaskBoardClient.SuperAgentAssigneeId = "super-agent"`, documentada com a
citação das instructions do Task Manager acima. `PublishTools.PublishSuggestion`
(`Tools/PublishTools.cs`) agora chama
`CreateItemAsync(title, description, StudioTaskBoardClient.SuperAgentAssigneeId, cancellationToken)`
— sempre delega ao Super Agent, sem exigir um parâmetro extra na tool pública (o
ticket não pede escolha de responsável pelo chamador).

**Teste (critério 4).** Não havia, no repo, nenhum teste existente que isole um
`HttpClient`/handler para os clients de infra (`AiGatewayClient`,
`StudioTaskBoardClient`) — o padrão citado no ticket não existe ainda.
`StudioTaskBoardClient.CreateItemAsync` abre uma sessão MCP real
(JSON-RPC sobre Streamable HTTP), inviável de fakear em teste unitário sem
reimplementar boa parte do transporte. Por isso o teste novo
(`McpServer.Tests/Infrastructure/StudioTaskBoardClientTests.cs`, 6 casos) mira o
método `BuildCreateItemArguments` — o mesmo dicionário que `CreateItemAsync` passa
para `CallToolAsync`, não uma reimplementação — e prova que `assigneeId` entra no
payload quando informado e some quando nulo/vazio/whitespace. Não-decorativo:
comentei temporariamente o bloco que adiciona `assigneeId` (simulando a assinatura
de 2 parâmetros de antes do ticket) e rodei só esse arquivo — 2 dos 6 testes
falharam (`KeyNotFoundException` / `Assert.True` com `False`); restaurei o código e
os 6 voltaram a passar. Também não seria possível nem compilar esse teste contra a
assinatura antiga de `CreateItemAsync` (2 parâmetros, sem `assigneeId`).

`dotnet test` a partir de `apps/mcp-server/`: **37 passed, 0 failed** (31 existentes
+ 6 novos).

**Critério 2 — verificação ao vivo, rodada real.** O processo `McpServer` que já
rodava em `localhost:6142` (dev local, não Docker) era um binário antigo — reiniciei
com o build atual (`dotnet build McpServer.csproj` + relançar o binário com
`apps/mcp-server/.env` carregado) para garantir que a chamada exercitasse o código
novo. Sequência real, via as tools MCP (`get_product_content` →
`generate_optimized_content` → `publish_suggestion`) contra o produto
`the-collection-snowboard-liquid`:

- Item criado: `board_dxy3Zej9yv9qnccfKFXLN`, título
  "[GEO] Otimizar conteúdo da PDP the-collection-snowboard-liquid".
- Resposta do `TASK_BOARD_ITEM_CREATE` (embutida no retorno da tool): já nasceu com
  `"status":"todo"` e `"assigneeId":"super-agent"` — não em `triage`.
- `TASK_BOARD_ACTIVITY_LIST` para esse item mostra 2 eventos:
  `created` (actor = usuário humano) e, ~1.5s depois,
  `status_changed` com `{"from":"todo","to":"in_progress"}` e `actorId: null` —
  transição automática, sem eu tocar em nada.
- `TASK_BOARD_ITEM_LIST` logo em seguida confirma o estado final observado:
  `status: "in_progress"`, `assigneeId: "super-agent"`, e uma `thread` vinculada
  (`thrd_AqF9A0ffmPKdWZcPRdLXW`, título "Super Agent: [GEO] Otimizar conteúdo da
  PDP the-collection-snowboard-liquid", `status: "in_progress"`) — o Super Agent
  pegou o item e está com uma thread de execução ativa nele.
- Esse item de verificação foi deixado como está (`in_progress`, sendo trabalhado
  pelo Super Agent) — não é um dos 2 itens travados do critério 3 e não apaguei
  nem toquei nele depois da observação, para não interferir na execução real que
  ele disparou.

**Critério 3 — os 2 itens travados, resolvidos via update (não delete).**
`TASK_BOARD_ITEM_UPDATE` com `status: "done"` em cada um, sem tocar em
`assigneeId`/descrição — confirmado por `TASK_BOARD_ITEM_LIST` logo depois:

- `board_kY--IB4lSiaArT96dnZLb`: `triage` → `done`.
- `board_NFxliyya_ST4ZXv71qa4x`: `triage` → `done`.

Nenhum `TASK_BOARD_ITEM_DELETE` foi chamado.
