# Publicação de sugestões via Task Board, não Registry Publish

A tool de publicação chama `TASK_BOARD_ITEM_CREATE` para criar um item de aprovação humana — não as tools `REGISTRY_PUBLISH_REQUEST_*`. A hipótese inicial era que `REGISTRY_PUBLISH_REQUEST_LIST`/`REVIEW` fosse o endpoint de aprovação do "CMS Agêntico" da Deco; corrigido depois de teste ao vivo (retornou vazio) e inspeção do código-fonte aberto da Studio (`decocms/studio`, `apps/api/src/tools/`) — essas tools servem para publicar apps/tools MCP no marketplace/registry privado da org, não conteúdo de PDP.

O mecanismo real é o Task Board: `TASK_BOARD_ITEM_CREATE` abre um item que um "Super Agent" da Studio transforma em PR real contra o conteúdo do storefront, seguido de `TASK_BOARD_REVIEW_DECISION` (aprovação humana) e `TASK_BOARD_PROMOTE_TO_PRODUCTION` (merge + deploy). Registrado aqui para que ninguém "corrija" a tool de volta para Registry Publish achando que é o caminho óbvio.
