# 10 — Validação ponta a ponta na loja real, com custo medido

**What to build:** o fluxo inteiro rodado uma vez, contra a loja real, do zero até o item no
Task Board — sem fixture, sem harness, sem passo manual costurando fases. É o ticket que prova
que as 5 fases são um fluxo e não cinco telas que funcionam separadamente.

Junto com o resultado, o **custo**. O consumo é medido antes e depois via
`AI_PROVIDER_CREDITS`, como o ticket 04 da `entrega-hackathon` fez, e o orçamento restante é o
teto — se a passada não couber nele, o resultado do ticket é essa descoberta, registrada, e não
uma passada pela metade.

A medição tem um segundo produto além do número final: ela verifica na prática a assimetria de
custo que ordena o fluxo. A expectativa declarada pela spec é que o diagnóstico das fases 1–3
custe quase nada (o exame são ~2 chamadas independentemente do tamanho do catálogo) e que
praticamente todo o gasto esteja na fase 4 (1 chamada por produto consertado). Se a passada real
contradisser isso, é achado de primeira ordem — o funil "diagnóstico grátis, conserto cobrado"
depende dessa forma.

**Dependência externa dura:** nada disso roda enquanto o ticket 09 da `entrega-hackathon`
(servidor no ar em `agentscommerce.ollim.dev`) estiver aberto. O domínio não resolve DNS, e o
processo local que atende a porta 6142 é um build antigo que expõe só 4 das 7 tools.

**Blocked by:** 10 (a fase 5 precisa existir para haver passada completa) **e** o ticket 09 da
`entrega-hackathon` (servidor no ar) — a numeração antiga dizia só "09" e era ambígua entre as
duas pastas.

**Status:** ready-for-agent

- [ ] Uma passada completa das fases 1 a 5 foi executada contra a loja real, sem fixture e sem
      passo manual entre fases
- [ ] O custo foi medido antes e depois via `AI_PROVIDER_CREDITS` e está registrado
- [ ] O custo está quebrado entre diagnóstico (fases 1–3) e conserto (fase 4), e a comparação
      com a assimetria esperada está registrada
- [ ] O item criado no Task Board foi verificado de fato, com `assigneeId: "super-agent"`
- [ ] A saída da passada está versionada — número, pedidos usados e catálogo, para que alguém
      possa reler o que aconteceu
- [ ] Qualquer divergência entre o que a spec previa e o que a loja real produziu está
      registrada, em vez de ajustada silenciosamente
