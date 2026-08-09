# 06 — Fase 2: revisar, editar e aprovar os pedidos

**What to build:** a fase 3 já roda com pedidos digitados à mão (ticket 06) e o gerador já
existe (ticket 03). Este ticket é o que liga os dois com a etapa humana no meio: os pedidos
gerados aparecem para o lojista, ele entende de onde saíram, edita o que quiser, descarta o que
não fizer sentido, e **aprova** — e só então a fase 3 roda.

A etapa de aprovação não é cortesia de UX. O gerador de pedidos é o ponto do sistema mais fácil
de trapacear: um pedido conveniente demais produz um exame que a loja passa sem merecer. Sem
esta tela a ferramenta pede confiança cega exatamente onde ela é menos defensável — e o lojista
não tem como testar isso sozinho. É a user story: *"quero entender de onde saíram as perguntas
que o robô fez, e poder mudá-las — porque se as perguntas forem convenientes demais o exame não
vale nada."*

A tela precisa mostrar o que cada pedido é, não só o texto: qual eixo de restrição ele exercita
e se ele **espera não ter resposta válida** — porque um pedido sem resposta parece um bug para
quem não sabe que é controle. "Nenhum produto atende" é acerto.

Escrever um pedido do zero continua sendo possível. O gerador é uma sugestão com bom ponto de
partida, não uma dependência.

**Blocked by:** 03, 06

**Status:** ready-for-agent

- [ ] O lojista dispara a geração e vê os pedidos propostos antes de qualquer simulação rodar
- [ ] Cada pedido pode ser editado, descartado ou escrito do zero
- [ ] Um pedido que espera **não** ter resposta válida está marcado como tal na tela, com o
      motivo de existir explicado — não parece defeito
- [ ] A fase 3 só roda sobre o conjunto **aprovado**; nada é simulado antes do aprovar
- [ ] O conjunto aprovado fica disponível para as fases seguintes como uma unidade — é ele que
      o ticket 09 congela
- [ ] Falha ou demora na geração não impede o lojista de seguir com pedidos escritos à mão
- [ ] A tela é desenvolvível e testável com fixture, sem servidor no ar
