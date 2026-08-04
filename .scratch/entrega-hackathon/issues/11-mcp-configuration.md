# 11 — `MCP_CONFIGURATION` com state schema e scopes

**What to build:** implementar a tool de configuração que o Studio procura, devolvendo o schema de estado e os scopes que a conexão precisa. Com isso o Studio renderiza um formulário de configuração nativo para a nossa connection, em vez de exigir que o usuário cole valores à mão — e, se o schema declarar o tipo constante esperado, ele oferece seletores de connection companion, o mesmo mecanismo do produto flagship da deco.

Depois deste ticket, adicionar o nosso servidor a uma org é preencher um form, não seguir um passo a passo.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] O servidor responde à tool de configuração com schema de estado e scopes
- [ ] O Studio renderiza o formulário de configuração nativo a partir do schema
- [ ] Os campos que apontam para outra connection aparecem como seletor, não como texto livre
- [ ] Configurar a connection pelo formulário e executar uma tool funciona de ponta a ponta
