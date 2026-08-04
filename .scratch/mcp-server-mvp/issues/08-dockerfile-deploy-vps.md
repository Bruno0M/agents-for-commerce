# 08 — Dockerfile + deploy na VPS Oracle

**What to build:** `Dockerfile` multi-stage (build com SDK .NET 10, runtime com ASP.NET Core 10) para `apps/mcp-server/`, buildado para `linux/arm64` (a VPS é `aarch64`), seguindo o runbook de infra já existente (Caminho B — servidor via docker compose). O `docker-compose.yml` e o `.conf` do nginx **não vivem neste repo** — vivem em `ollim-infra` (`/opt/ollim/agents-for-commerce/`), e o registro DNS (`A` record, nuvem laranja) é feito no painel da Cloudflare. Este ticket cobre a parte que vive neste repo (o Dockerfile) e deixa registrado o trabalho cross-repo/infra que ainda falta, para não perder o rastro.

**Blocked by:** 02 (health check precisa existir para o `healthcheck` do compose funcionar)

**Status:** ready-for-agent

- [x] `Dockerfile` multi-stage em `apps/mcp-server/` builda com sucesso para `linux/arm64`
- [x] Imagem exposta na porta interna correta (`ASPNETCORE_URLS`, ex. 8080) via `expose:`, não `ports:`
- [x] Container rodando localmente responde em `/health` com 200
- [ ] Registrado (fora deste repo): criar `docker-compose.yml` + `proxy/conf.d/agentscommerce.ollim.dev.conf` em `ollim-infra`, secrets `VPS_HOST`/`VPS_USER`/`SSH_KEY` no GitHub deste repo, login no GHCR privado na VPS, e o `A` record de `agentscommerce.ollim.dev` na Cloudflare

## Comments

- Dockerfile pronto (`apps/mcp-server/Dockerfile`): build cross-compila com `-a $TARGETARCH` a partir do `$BUILDPLATFORM`, então `--platform linux/arm64` não precisa de qemu. Verificado: `docker buildx build --platform linux/arm64` passa.
- A stage de runtime não tem nenhum `RUN` de propósito — instalar curl via apt exigiria emulação da arquitetura alvo. O healthcheck usa um busybox estático copiado (`COPY --from=busybox:uclibc`).
- Adicionado também `apps/mcp-server/compose.yaml`, mas **só para desenvolvimento local** (usa `ports: 6142:8080`). O compose de produção com `expose:` continua sendo item da `ollim-infra`.
- Smoke test local: healthcheck fica `healthy`, `/health` → 200, `POST /` sem token → 401, com token → `tools/list` responde. Container roda como `uid=1654(app)`.
