# 03 — Transporte por bridge: o `/web` chama tools sem rede

> **Migrado para o GitHub: [#6](https://github.com/Bruno0M/agents-for-commerce/issues/6).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** o `apps/web/` ganha uma **interface de transporte** com duas implementações —
`fetch` (front avulso) e `callServerTool` (dentro do Studio) — escolhida uma vez no entry point.
Nenhum componente passa a saber qual está ativa.

É o maior volume de código desta spec e o menor risco de descoberta: dá para desenvolver e testar
inteiro com o bridge mockado, sem Studio no ar e sem depender dos tickets 01 e 02.

**O seam já existe.** `apps/web/src/diagnosis/lib/runSimulationAgent.ts` se descreve como "o SEAM
do transporte futuro", com `writeTestOrders` e `runBuyerAgent` já na assinatura que uma
implementação real teria. **Emenda ao que aquele arquivo prevê:** ele diz que o corpo troca para
um `fetch`. Para o alvo Studio, troca para `callServerTool` — e é por isso que a troca vira uma
interface com duas implementações, e não uma substituição.

O outro ponto de rede de hoje é `apps/web/src/lib/catalog.ts`, que chama `GET /catalog`
(`apps/mcp-server/Program.cs:107`). Ele vira a implementação `fetch` da leitura de catálogo; a
implementação Studio chama `get_product_catalog` pelo bridge.

**Como o guest chama a tool:** `app.callServerTool({ name, arguments })`
(`@modelcontextprotocol/ext-apps@1.7.1`, `dist/src/app.d.ts:917`). Quem executa é o host, com as
credenciais que a Connection já guarda — o `AppBridge` recebe o cliente MCP do host e auto-liga
`oncalltool` (`apps/web/src/mcp-apps/use-app-bridge.ts:325` do clone em `apps/studio/`). Nenhum
bearer token entra no bundle. Nenhuma rota nova, nenhuma isenção nova, nenhuma policy CORS nova —
é o D3 da spec.

**O que muda no entry point:** o `main.tsx` passa a fazer o handshake (`useApp()` do
`ext-apps/react`) e a só renderizar quando conectado. Fora do Studio não há host, o handshake não
completa, e o entry point cai para a implementação `fetch` — essa detecção precisa ser explícita e
ter um caminho de fallback, não um timeout de 15s de tela branca.

**O modo fixture não morre.** Continua sendo como as telas se desenvolvem sem loja no ar, e
continua sendo o único modo que funciona com o servidor fora do ar.

**Cuidado com custo:** `generate_test_orders`, `simulate_buyer_agent`, `compare_buyer_agent_rounds`,
`generate_optimized_content` e `publish_suggestion` **gastam crédito de LLM por chamada**. Nenhuma
delas pode ser disparada por render, por efeito de montagem ou por retry automático — só por ação
explícita do usuário.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Existe uma interface de transporte com as duas implementações, e o entry point escolhe uma
- [ ] Nenhum componente de tela importa `fetch` nem o SDK do bridge diretamente
- [ ] A implementação Studio chama as tools via `callServerTool` e não faz nenhuma requisição de rede
- [ ] O entry point detecta a ausência de host e cai para o modo avulso sem tela branca e sem
      esperar o timeout
- [ ] O front avulso (`bun dev`) continua funcionando exatamente como antes
- [ ] O modo fixture continua funcionando sem servidor no ar
- [ ] Nenhuma tool que gasta crédito de LLM é disparada sem ação explícita do usuário
- [ ] Testes cobrem as duas implementações contra a mesma interface, com o bridge mockado — e
      nenhum componente é testado duas vezes por causa disso
- [ ] Falha de tool, timeout e resultado vazio têm estado visível nos dois transportes
