# 06 — Fixar a view na org

> **Migrado para o GitHub: [#9](https://github.com/Bruno0M/agents-for-commerce/issues/9).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** a view vira uma aba fixada na org, com nome e ícone próprios, e abre em dois
cliques a partir da home. É o que transforma "a tool tem uma UI" em "o exame é um lugar no
Studio".

**Como funciona, verificado no clone em `apps/studio/`:** uma view fixada é
`{connectionId, toolName, label, icon}` — **uma tool**, não uma URL
(`apps/api/src/tools/virtual/pinned-views-update.ts:16`). Só entram como candidatas as tools em
que `getUIResourceUri(t._meta)` resolve
(`apps/web/src/views/virtual-mcp/layout-tab-content.tsx:83`), e a chave da aba é
`ext-apps:${connectionId}:${toolName}` (mesmo arquivo, linha 302).

Dois caminhos para fixar, e vale saber que existem os dois:

- Pela UI, na aba de layout do virtual MCP — é onde a lista de candidatas aparece.
- Pela tool `VIRTUAL_MCP_PINNED_VIEWS_UPDATE`, que **substitui todos os pins de uma vez**
  (`destructiveHint: true`). Se for por aqui, ler os pins atuais antes de escrever, ou os
  existentes somem.

O mesmo `metadata.ui` guarda `layout.defaultMainView`, que decide o que abre por padrão. Apontar
para a nossa view é o que faz "dois cliques" virar "zero cliques" — mas isso desloca o que já
estiver configurado, então é decisão consciente, registrada em Comments.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A view está fixada na org e aparece como aba na área principal
- [ ] O `label` e o `icon` são nossos, e não o nome cru da tool
- [ ] A view abre em, no máximo, dois cliques a partir da home da org
- [ ] Está registrado em Comments se o `defaultMainView` foi alterado e o que havia antes
- [ ] Se a fixação foi feita por `VIRTUAL_MCP_PINNED_VIEWS_UPDATE`, os pins que já existiam
      continuam lá
- [ ] O passo está documentado — qual org, qual connection, qual tool — para ser refeito numa org
      limpa sem arqueologia
