# Raciocínio de LLM via AI Gateway da Deco, não MCP Sampling nativo

As tools de geração de conteúdo e simulação de comprador chamam o AI Gateway da Deco (org `bruno-feijoada`) com uma key própria provisionada, em vez de usar MCP Sampling nativo (`server.SampleAsync`) — o mecanismo que o próprio protocolo MCP desenhou para esse caso, e que seria o argumento mais forte de "MCP de verdade" no pitch. Não foi adotado como caminho principal porque não há confirmação de que o Deco Studio implementa o lado cliente de sampling.

**Status:** accepted — revisitar se o suporte a sampling no Deco Studio for confirmado (registrar uma conexão de teste e checar se uma `CreateMessage` request é respondida). Ver ticket de stretch goal.
