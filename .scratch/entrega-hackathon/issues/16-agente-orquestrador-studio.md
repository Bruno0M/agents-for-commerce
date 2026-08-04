# 16 — Agente no Studio que orquestra as 4 tools

**What to build:** a org `bruno-feijoada` hoje tem só os 8 agentes do Studio Pack (Agent Manager, Task Manager, etc.) e 3 connections padrão — nenhuma delas aponta para o nosso servidor. Ou seja: **as 4 tools existem, mas não há nada no Studio que as use.** O `AG` do diagrama de arquitetura do briefing, que orquestra `get_product_content → generate_optimized_content → simulate_buyer_agent → publish_suggestion`, não existe.

Sem isso não há o que gravar dentro do Studio: a demo seria chamar tool por tool à mão, que é exatamente o oposto da tese de "um agente que faz".

Depois deste ticket, abrir o chat da org e pedir "audita o catálogo de fones e me mostra o antes e depois" faz o agente rodar o loop inteiro sozinho e terminar publicando a sugestão no Task Board.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] Existe uma Custom Connection na org apontando para o servidor MCP público, com o bearer token configurado, e ela lista as 4 tools
- [ ] Existe um agente (vMCP) com instruções que descrevem o loop: ler → gerar → simular as duas rodadas → comparar o delta → só então publicar
- [ ] As instruções deixam explícito que o agente **nunca publica direto na loja** — a saída é sempre item no Task Board
- [ ] Um pedido em linguagem natural no chat da org dispara o loop completo, sem o usuário nomear tool nenhuma
- [ ] O agente relata o delta antes/depois na resposta, em texto que serve de narração para o vídeo
