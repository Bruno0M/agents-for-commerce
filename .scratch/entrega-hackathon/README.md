# Entrega hackathon — índice

Tickets derivados de `docs/briefing-consolidado.md`. Prazo de submissão: **09/08/2026, 23h59**.

O MVP do servidor MCP (4 tools, auth, health, testes, Dockerfile) está em `.scratch/mcp-server-mvp/` e já foi construído. Estes tickets cobrem o que falta para existir projeto.

**Os números são identificadores estáveis, não ordem de execução.** A ordem está nas fases abaixo — é ela que manda.

## Ordem de execução

### Fase 1 — o núcleo: o número existe

| # | Ticket | Bloqueado por | Por quê aqui |
|---|--------|---------------|--------------|
| 09 | Servidor MCP no ar em `agentscommerce.ollim.dev` | — | roda em paralelo: propagação de DNS é tempo de relógio, e destrava a 16 |

A 04 (o desconhecido que sobrava) está concluída — ver `issues/04-rodadas-antes-depois.md`.
O risco estrutural herdado da 03 (casamento de nome entre duas extrações independentes)
se confirmou de verdade nessa rodada, e trouxe mais dois problemas da mesma família
(comparação numérica de mínimo e falso-positivo de substring sobre frase negada) — os
três foram corrigidos no `BuyerAgentDecisionEngine` antes do número final: 4/7 (57%)
antes, 7/7 (100%) depois.

### Fase 2 — o loop fecha

| # | Ticket | Bloqueado por | Por quê aqui |
|---|--------|---------------|--------------|
| 08 | Aterrissagem do dado por produto em metafields | 01, 17 (concluído) | as specs extraídas chegam na loja — só depois de o "antes" estar congelado |
| 06 | Repo do GitHub conectado como projeto no Studio | 05 | em revisão humana; destrava a 07 |
| 07 | JSON-LD completo na PDP do storefront | 06 | a PDP publicada passa a emitir o dado — é o fim do circuito |
| 16 | Agente no Studio que orquestra as 4 tools | 09 | é o que se grava: um pedido em linguagem natural dispara o loop inteiro |
| 18 | Metodologia reprodutível das rodadas | 04 | pedidos B/C/D, resultado congelado, metodologia no README |

**07 e 08 são um par.** A 07 conserta o componente que descarta as propriedades; a 08 é quem coloca as specs extraídas na loja para o loader ler. Uma sem a outra emite JSON-LD do catálogo pobre.

Ao fim da Fase 2 a demo do vídeo existe inteira: catálogo pobre → auditoria → geração → número → aprovação no Task Board → PDP com JSON-LD.

### Fase 3 — a UI

| # | Ticket | Bloqueado por |
|---|--------|---------------|
| 14 | View do MCP: "o que o agente viu vs. o que faltou" | 04 |

Promovida de P2 a prioridade explícita. A view roda sob CSP sem rede, então renderiza a saída estruturada da 04 — é por isso que a 04 tem de produzir dado, não relatório impresso.

### Fase 4 — guarnição, só se sobrar tempo

| # | Ticket | Bloqueado por |
|---|--------|---------------|
| 12 | Geração de conteúdo grounded no brand context | 01 |
| 10 | MCP prompts expostos pelo servidor | 09 |
| 11 | `MCP_CONFIGURATION` com state schema e scopes | 09 |
| 13 | Automation com trigger cron | 09, 10 |

Nenhuma fortalece a medição — todas compram narrativa. Cortar da 13 para cima, nessa ordem.

### Fase 5 — entrega

| # | Ticket | Bloqueado por |
|---|--------|---------------|
| 15 | Pacote de submissão do hackathon | 04, 07, 16, 18 |

## Concluídos

| # | Ticket |
|---|--------|
| 01 | Unificar o contrato de catálogo entre geração e simulação |
| 02 | Catálogo de demo de áudio publicado na Shopify |
| 03 | Filtro de relevância nas propriedades geradas |
| 04 | A rodada antes/depois: o número |
| 05 | Item do Task Board nasce atribuído ao super-agent |
| 17 | Congelar o catálogo "antes" num artefato versionado |

## Reorganização de 05/08/2026

A ordem anterior foi refeita. O que mudou e por quê:

- **`apps/mcp-app/` foi removido do disco** — era teste. Some com ele a premissa da 14 (MCP App separado do template) e o problema do repo git aninhado, que era checkbox da 15. A view passa a ser servida pelo próprio servidor .NET como resource.
- **A 04 foi partida.** O núcleo (pedido A, custo medido, delta real) ficou na 04; a metodologia completa virou a **18**. Só o núcleo é caminho crítico.
- **A 04 passou a exigir saída estruturada**, não relatório impresso — pré-requisito da view da 14, que não pode buscar dado pela rede.
- **Nasceu a 17**, extraída como pré-condição dura da 08. A dependência é real: `ToCandidateProduct` lê metafield direto para os atributos do candidato, então escrever metafield antes de congelar o "antes" contamina a rodada de base.
- **A 14 subiu** de P2 para fase própria, e perdeu a regra de corte.
- **10, 11, 12 e 13 desceram** para "se sobrar tempo".

## Verificação de 04/08/2026

Todos os tickets foram checados contra o estado real (código, loja Shopify, org do Studio). O que a varredura confirmou em aberto — parte já resolvida desde então:

- **03, 08, 10, 11, 12** — nenhum vestígio no código (sem filtro de relevância, sem escrita de metafield, sem prompts, sem `MCP_CONFIGURATION`, sem brand context). A 03 foi concluída depois disso.
- **06** — nenhuma connection na org aponta para o repo; só as 3 padrão.
- **07** — `apps/storefront/src/` não menciona `additionalProperty`; o único patch é o `@decocms/blocks@7.20.7` herdado do template (a versão instalada é outra).
- **09** — `agentscommerce.ollim.dev` não resolve DNS. O MCP que responde hoje é `localhost:6142`.
- **13** — `AUTOMATION_LIST` devolve vazio.
- **16** — a org tem só os 8 agentes do Studio Pack. Não existe agente nosso.
