# Deploy via Docker na infra compartilhada existente (ollim-infra), não pipeline próprio

O deploy segue o runbook já existente da infra própria (`ollim-infra/docs/04-novo-projeto.md`, Caminho B — docker compose + proxy nginx compartilhado), em vez de um pipeline novo, Caddy próprio, ou systemd + Kestrel direto. A VPS já resolve TLS, proxy reverso e deploy de forma padronizada entre projetos; reaproveitar evita reinventar isso e reduz risco no prazo curto do hackathon. O `docker-compose.yml` e a config do nginx vivem em `ollim-infra`, não neste repo — este repo só contém o `Dockerfile`.
