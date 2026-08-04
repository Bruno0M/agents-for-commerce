# 09 — Servidor MCP no ar em `agentscommerce.ollim.dev`

**What to build:** o Dockerfile multi-stage já existe e foi validado localmente em `linux/arm64`, mas o domínio não resolve DNS hoje — na prática o servidor não existe para o Studio nem para os jurados. Depois deste ticket, `https://agentscommerce.ollim.dev` responde com certificado válido, o health check passa, e uma Custom Connection do Studio apontando para ele lista as 4 tools.

O trabalho é cross-repo: o compose e o `.conf` do nginx vivem em `ollim-infra`, não aqui. Este ticket só termina quando o serviço está acessível de fora, não quando o arquivo foi escrito.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A imagem está publicada no GHCR e os secrets necessários estão configurados no GitHub
- [ ] O compose e o vhost do nginx existem em `ollim-infra` e o serviço sobe na VPS
- [ ] O registro DNS aponta para a VPS e o domínio resolve
- [ ] `GET /health` responde 200 pela internet, com TLS válido
- [ ] Requisição sem bearer token válido leva 401 — o auth continua valendo em produção
- [ ] Uma Custom Connection no Studio apontando para a URL pública lista as 4 tools e executa uma delas com sucesso
