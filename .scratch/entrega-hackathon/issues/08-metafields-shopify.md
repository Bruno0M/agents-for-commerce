# 08 — Aterrissagem do dado por produto em metafields da Shopify

**What to build:** o conteúdo otimizado tem duas naturezas diferentes, e só uma delas cabe no Task Board. A **capacidade** (fazer a PDP emitir JSON-LD completo) é código e vai por PR — é o ticket 07. O **dado por produto** (as specs e a FAQ extraídas de cada descrição) não tem onde aterrissar no código: `.deco/blocks/*.json` guarda configuração de seção e layout, não conteúdo por produto. O lugar dele é metafield na Shopify, que o loader da deco já consome.

Depois deste ticket, aprovar uma sugestão faz as specs extraídas virarem metafields do produto na loja, e a PDP publicada passa a exibi-las — fechando o circuito do agente comprador externo.

**Decisão em aberto a fechar dentro deste ticket:** a escrita de metafields acontece antes ou depois do gate de aprovação humana? Antes é mais simples de demonstrar; depois é mais coerente com o "nunca publica sozinho" que o projeto vende. Registrar a escolha e a razão nos comentários.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] A decisão sobre o momento da escrita (antes ou depois do gate) está tomada e registrada
- [ ] As specs extraídas de um produto do catálogo de demo viram metafields na loja
- [ ] O escopo de permissão da app da Shopify cobre escrita de metafield
- [ ] A PDP publicada exibe o dado escrito, comprovando que o loader o consome
- [ ] Existe caminho de rollback: dá para limpar os metafields e voltar a loja ao estado "antes" para regravar a demo
