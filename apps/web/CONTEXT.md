# Contexto — `apps/web`

A view do exame: Vite + React + shadcn/ui. Roda de dois jeitos — como SPA
própria (`bun dev`) e como MCP App dentro do Deco Studio, servida pelo
`mcp-server` como resource. É a MESMA árvore de componentes nos dois; o que
troca é o transporte.

## Termos

**Transporte** — de onde o dado da tela vem. Uma interface
(`src/transport/types.ts`) com três implementações, escolhida uma vez no
entry point (`src/transport/TransportGate.tsx`) e entregue por contexto.
Nenhum componente de tela sabe qual está ativa; se algum precisar saber para
funcionar, o desenho quebrou.

| Transporte | Catálogo | Exame | Quando |
| --- | --- | --- | --- |
| `bridge` | `get_product_catalog` via `app.callServerTool` | tools reais via bridge | dentro do Studio |
| `fetch` | `GET /catalog` | **não roda** (ver abaixo) | front avulso com o servidor no ar |
| `fixture` | payload congelado | payload congelado | default do `bun dev`, e o único modo que funciona com o servidor fora do ar |

**Modo fixture** — não é dívida técnica. É como as telas se desenvolvem sem
loja no ar, e continua sendo o default fora do Studio.

## Decisões

**O transporte do Studio não fala rede.** Dentro do iframe, o `/web` chama
`app.callServerTool` (`@modelcontextprotocol/ext-apps`); quem fala com o
`mcp-server` é o host, com as credenciais que a Connection já guarda. É o
que tira o bearer token do bundle e dispensa CORS, rota isenta e proxy — e
é verificável: a CSP default do Studio tem `connect-src 'none'`.

**O front avulso não roda o exame, e isso é permanente.**
`generate_test_orders` e `simulate_buyer_agent` gastam crédito de LLM por
chamada. Expor as duas como rota isenta criaria endpoint público que gasta
dinheiro de quem descobrir a URL; mandar o bearer para dentro do bundle
vazaria a credencial. Nenhuma rota nova, nenhuma isenção nova, nenhuma
policy CORS nova. `GET /catalog` continua isento porque `get_product_catalog`
custa zero.

**Tool que gasta crédito só sai de clique.** Nunca de render, nunca de
efeito de montagem, nunca de retentativa automática — toda retentativa da
tela é um botão. `readCatalog` é a única exceção, e só porque custa zero.

**A detecção de host é explícita, não um timeout.** Fora de iframe
(`window.parent === window.self`) a decisão é imediata, sem nem criar o
`App` do SDK. Dentro de um iframe, o handshake tem um prazo curto nosso
(2,5s) — bem antes dos 15s do SDK — e um caminho de fallback visível.

**A tradução do payload do C# mora num lugar só**
(`src/transport/bridgeTransport.ts`). O MCP serializa enum como string
PascalCase e OMITE propriedade nula; o `GET /catalog` escreve os nulos. A
tela recebe uma forma só.

## Ligações

- Servidor e tools: [`apps/mcp-server/CONTEXT.md`](../mcp-server/CONTEXT.md)
- Spec da view no Studio: [issue #3](https://github.com/Bruno0M/agents-for-commerce/issues/3)
