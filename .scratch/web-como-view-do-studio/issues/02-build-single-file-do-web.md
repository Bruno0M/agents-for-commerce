# 02 — Build single-file do `apps/web`

> **Migrado para o GitHub: [#5](https://github.com/Bruno0M/agents-for-commerce/issues/5).** Este arquivo é histórico — edite a issue, não este arquivo.

**What to build:** um modo de build de produção do `apps/web/` que cospe **um** arquivo HTML,
com todo JS e CSS embutidos e nenhuma referência externa. O `bun dev` e o `bun build` atuais
continuam funcionando como estão.

**Como se constrói:** `vite-plugin-singlefile`, num modo separado do build normal — não
substituindo. O `vite.config.ts` de hoje já tem `react()`, `tailwindcss()` e o alias `@`; o
plugin entra sob condição do modo, para o desenvolvimento diário não passar a gerar um monólito.

**As restrições que a CSP impõe** (`DEFAULT_CSP` em
`packages/shared/src/mcp-apps/csp-injector.ts` do clone em `apps/studio/`), e o que cada uma
custa:

- `font-src data:` → o `@fontsource-variable/geist` **precisa virar data URI ou sair**. Uma
  variable font inteira em base64 dentro do HTML não é de graça; medir o peso e, se for
  desproporcional, cair para font stack do sistema. A decisão fica em Comments, com o número.
- `script-src`/`style-src` só com `'unsafe-inline'` → zero arquivo externo, zero code splitting,
  zero `import()` dinâmico. Se alguma dependência fizer import dinâmico, isso aparece aqui.
- `base-uri 'none'` → nada de roteamento por URL. O `App.tsx` já navega por
  `useState<Destination>` — isso deixa de ser acaso e vira requisito registrado.
- `img-src * data: blob:` é aberto, e `lucide-react` é SVG inline: ícone e imagem não são
  problema.

**A parte que não é opcional:** a asserção automatizada. "Um arquivo só, sem referência externa"
é exatamente o tipo de propriedade que quebra em silêncio quando alguém adiciona uma dependência
três semanas depois, e o sintoma no Studio é uma tela branca sem mensagem de erro. Inspeção
manual não sobrevive a isso.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Existe um modo de build que produz exatamente um arquivo, e o `bun dev` continua igual
- [ ] O HTML gerado não tem nenhum `src=`/`href=` para http, https, `//` ou caminho relativo
- [ ] Um teste roda esse build e falha se qualquer uma das duas condições acima quebrar
- [ ] Um teste falha se a string do bearer token, ou o nome da variável de ambiente que o
      carrega, aparecer no HTML gerado
- [ ] A decisão sobre a fonte está tomada e registrada em Comments, com o peso medido
- [ ] O tamanho final do HTML está registrado em Comments — é o insumo para saber se o handshake
      de 15s do ticket 01 corre risco
