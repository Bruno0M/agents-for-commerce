# 02 — Tipo do motivo de rejeição

**What to build:** o `BuyerAgentDecisionEngine` já produz o motivo certo, mas só como frase
pronta. A natureza do motivo — **ilegibilidade** (o agente não conseguiu avaliar o produto)
versus **rejeição legítima** (o agente avaliou e o produto não atende) — existe hoje apenas
implícita no texto da string. Depois deste ticket ela é um dado do contrato, produzido no
engine e carregado até a saída da comparação.

Isso é a decisão D3 da spec, e ela é o que resolve o buraco 3 do Problem Statement: a taxa de
sucesso depende de `expectedOutcomes`, um gabarito que **não existe numa loja real** — ninguém
sabe quais dos 400 produtos deviam atender ao pedido. A métrica "produtos que o agente não
conseguiu sequer avaliar" não precisa de gabarito nenhum, funciona no primeiro run de qualquer
loja, e continua sendo um fato sobre a **loja**, não sobre o pedido — o que a torna resistente
ao viés que o ticket 03 pode introduzir.

A classificação por natureza, conforme a tabela do D3:

| Motivo | Natureza |
| --- | --- |
| Sem dado estruturado para confirmar `'X'` | ilegibilidade |
| Sem dado estruturado para confirmar `'X'` (mínimo N) | ilegibilidade |
| Sem preço estruturado para confirmar o limite de N | ilegibilidade |
| `'X' = 'Y'` não tem valor numérico reconhecível para o mínimo de N | ilegibilidade — o dado existe, mas em prosa |
| `'X' = 'Y'` não confirma `'Z'` | rejeição legítima |
| `'X' = 'Y'` abaixo do mínimo de N | rejeição legítima |
| Preço X acima do limite de Y | rejeição legítima |

O tipo nasce **no ponto onde o motivo é criado**, não de uma releitura da frase depois. Derivar
o tipo por parsing da string em qualquer camada acima — na tool, na UI — é exatamente o que
este ticket existe para impedir: seria frágil e ficaria errado no primeiro ajuste de fraseado.

A frase legível continua existindo e não muda de texto; o tipo vem ao lado dela.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Cada requisito não atendido carrega, além da frase, o tipo do motivo (ilegibilidade /
      rejeição legítima) como valor do contrato, não como string livre
- [x] O tipo é atribuído no ponto onde o motivo é produzido — nenhuma camada acima infere o
      tipo relendo a frase
- [x] O tipo chega até a saída de `compare_buyer_agent_rounds`, não para no engine
- [x] As frases legíveis existentes continuam com o mesmo texto — nenhuma quebra para quem já
      consome a saída
- [x] Há teste no engine (lógica pura, sem rede) cobrindo os 7 motivos da tabela acima
- [x] Um produto pode acumular motivos de naturezas diferentes no mesmo pedido, e os dois tipos
      aparecem separadamente
