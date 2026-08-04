# Transporte MCP em modo stateless

O servidor usa Streamable HTTP via ASP.NET Core (`WithHttpTransport` + `MapMcp()`) em modo stateless (`options.Stateless = true`) como padrão do MVP, porque nenhuma das 4 tools do MVP precisa de requests servidor→cliente (sampling/elicitation). Se a geração de conteúdo ou o simulador de comprador migrarem para MCP Sampling nativo no futuro (ver ADR 0002), essa tool específica vai exigir sessão stateful — o resto do servidor pode continuar stateless.
