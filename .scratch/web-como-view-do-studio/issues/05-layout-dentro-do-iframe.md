# 05 — Layout do `/web` dentro do iframe

> **Migrado para o GitHub: [#8](https://github.com/Bruno0M/agents-for-commerce/issues/8).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** fazer o `apps/web/` caber e se comportar dentro do iframe do Studio. É o
ticket de acabamento visual, e o único desta spec que só se resolve olhando.

**O que o host oferece, verificado no clone em `apps/studio/`:**

- A aba principal renderiza em `displayMode: "fullscreen"` — `apps/web/src/routes/project-app-view.tsx`
  (`handleRequestDisplayMode` devolve `"fullscreen"` para tudo que não é inline), e
  `apps/web/src/components/home/home-grid.tsx:311-322` passa `maxHeight` 4000.
- Os presets de altura estão em `MCP_APP_DISPLAY_MODES` (`packages/shared/src/mcp-apps/types.ts`):
  `view` é `{400, 800}` e `fullscreen` é `{600, 1200}` — mas o call site pode passar `minHeight`/
  `maxHeight` próprios, e a home passa.
- O auto-resize vem de graça pelo `useApp()`; o app reporta altura por `sendSizeChanged` e o
  renderer clampa entre min e max.
- O sandbox é `allow-scripts allow-same-origin allow-forms allow-popups allow-downloads`
  (`apps/web/src/mcp-apps/mcp-app-renderer.tsx:167`).

**As três coisas que precisam de decisão, e que ninguém tomou ainda:**

1. **A sidebar.** O `/web` hoje é app de sidebar + header + conteúdo. Dentro de um iframe que já
   está dentro do chrome do Studio, isso vira duas camadas de navegação empilhadas. Pode ficar,
   pode virar navegação horizontal, pode sumir com os destinos virando abas — é escolha, e a
   escolha vai no Comments com o motivo.
2. **Dialog e sheet.** `ProductDrillDownDialog` e os componentes de sheet do shadcn usam portal
   para `document.body`. Dentro do iframe isso é o próprio documento, então funcionam — mas um
   dialog alto dentro de um iframe que se auto-dimensiona é o caso clássico de conteúdo cortado
   ou de altura oscilando. Só se avalia rodando.
3. **Altura.** Um app de página inteira sob auto-resize pode entrar em loop de crescimento
   (conteúdo cresce → iframe cresce → layout recalcula → cresce de novo). Se acontecer, a saída é
   fixar a altura em `100%` do viewport do iframe em vez de deixar o conteúdo ditar.

**Fora de escopo:** redesenhar tela. Se a resposta para qualquer um dos três pontos acima for
"vamos repensar a tela X", isso vira ticket na spec que é dona daquela tela
(`catalogo-como-exame` ou `exame-guiado`), não aqui.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A view ocupa a área principal sem barra de rolagem dupla e sem conteúdo cortado
- [ ] A altura não oscila nem cresce indefinidamente com o conteúdo
- [ ] Dialog e sheet abrem, ficam legíveis e fecham dentro do iframe
- [ ] A decisão sobre a sidebar está tomada e registrada em Comments, com o motivo
- [ ] A view é legível em captura de tela estática — é requisito de apresentação, não de conforto
- [ ] Nenhuma tela foi redesenhada; o que mudou foi contenção e layout de moldura
