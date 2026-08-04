# 14 — MCP App: "o que o agente comprador viu vs. o que faltou"

**What to build:** uma view MCP App fixada na org que mostra, produto a produto, o que o agente comprador conseguiu confirmar e o que faltava — e, ao lado, o mesmo produto depois da otimização. É o número do ticket 04 virando imagem: em vez de uma taxa de sucesso dita em voz alta, o jurado vê a rejeição acontecendo e o motivo dela.

Restrições que definem o que dá para construir: o contrato é MCP puro (a view é um recurso HTML lido pelo protocolo), HTML estático não funciona — a página precisa de JS fazendo o handshake por `postMessage` dentro de 15 segundos —, e a CSP bloqueia qualquer rede: tudo inline, sem CDN, sem fetch.

**Regra de corte:** se o P0 escorregar para 07/08, cortar este ticket sem hesitar. Um número limpo com UI feia ganha de uma UI bonita sem número.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] O servidor expõe a view como recurso e a declara nas tools que a usam
- [ ] A view completa o handshake dentro do timeout e renderiza dentro do Studio
- [ ] Todo CSS e JS é inline; a página não faz nenhuma requisição de rede
- [ ] A tela mostra, por produto, requisitos confirmados e requisitos que faltaram, no antes e no depois
- [ ] A view está fixada na org e abre em dois cliques a partir da home

## Comments

**04/08/2026 — ponto de partida.** `apps/mcp-app/` já existe, mas é o scaffold cru do template deco (`api/tools/hello.ts`) — nenhuma tool ou view nossa.

**Atenção:** `apps/mcp-app/` tem o próprio `.git` (histórico do template, último commit `3fc9bd1`). Como repo aninhado, ele não entra no repositório público direito — vira gitlink vazio ou some. Resolver antes de submeter: remover o `.git` interno e commitar como código normal, ou tirar do repo. Está anotado também no ticket 15.
