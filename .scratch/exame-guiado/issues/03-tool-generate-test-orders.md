# 05 — Tool `generate_test_orders`

**What to build:** hoje não existe origem para o pedido. `simulate_buyer_agent` e
`compare_buyer_agent_rounds` recebem `naturalLanguageOrder` como entrada **obrigatória**, e a
chamada de LLM que existe dentro deles transforma um pedido **em** requisitos — ela nunca
inventa o pedido. Os pedidos que existem são 4 frases escritas à mão num markdown. Sem pedido
não há requisito, sem requisito não há filtro, sem filtro a tela fica vazia. Depois deste
ticket a ferramenta produz seus próprios casos de teste a partir do catálogo lido.

Isso passa no critério de corte do projeto com folga: escrever os casos de teste **é** medição.
Mas a versão ingênua destrói o número, e evitar isso é o conteúdo intelectual do ticket.

## A circularidade que este ticket existe para quebrar

```
gerador de pedidos          lê a prosa das descrições → pede ANC, 20h de bateria
generate_optimized_content  lê a MESMA prosa          → estrutura ANC, 28h de bateria
                                                      → delta positivo GARANTIDO por construção
```

As duas pontas leem a mesma fonte. O delta vira propriedade do gerador, não da loja — e um test
suite que passa sempre não mede nada.

Isso não é hipótese: o `.scratch/catalogo-demo/spec.md` tem a regra em negrito — *"todo fato
citado no pedido precisa existir na prosa do 'antes', solto, sem estrutura"*. Foi engenharia
deliberada de vitrine, e para uma demo está certo. **Automatizar essa regra e apontar para a
loja de um cliente constrói uma máquina que sempre devolve delta positivo.**

## As três regras que são o contrato do prompt

1. **Entrada agregada, não prosa por produto.** O gerador recebe categoria, tipos de produto,
   faixa de preço e títulos — **não** as descrições completas. O conhecimento de como as pessoas
   compram naquela categoria vem do modelo, que é fonte externa ao catálogo. Esta regra é
   estrutural: se a descrição completa entrar na chamada, o ticket falhou, por melhor que o
   prompt esteja escrito.
2. **Uma fração dos pedidos deve não ter resposta válida.** O agente responder "nenhum produto
   atende" é **acerto**, não falha — é a lógica dos 4 controles do catálogo de demo,
   generalizada.
3. **Variar o eixo da restrição de propósito.** Nenhum gerador produz isto se você pedir só
   "pedidos realistas"; precisa estar no prompt como instrução explícita:
   - um pedido que faz **vencer** o produto que outro pedido **rejeitou** — prova que a rejeição
     foi do requisito, não do produto
   - um pedido cujo requisito não é campo estruturado em lugar nenhum, enterrado numa frase
   - um pedido com poucas restrições, que alarga o desempate

Uma propriedade que vale registrar: **é a primeira tool cujo output é um caso de teste, não
conteúdo.** É parte da resposta a quem perguntar por que isto é um exame e não um gerador.

O teste é de **contrato, não de conteúdo**: verifica-se N pedidos, ao menos um sem resposta
válida esperada, eixos de restrição distintos entre eles. O texto em si é não-determinístico e
não se testa por igualdade.

**Blocked by:** 01

**Status:** done

- [x] A tool recebe um resumo **agregado** do catálogo e a contagem desejada, e devolve N
      pedidos em linguagem natural
- [x] A descrição completa de nenhum produto entra na chamada de LLM — a entrada agregada é
      construída antes, e isso é verificável no teste
- [x] Cada pedido devolvido declara se espera ter resposta válida no catálogo, e ao menos um
      espera **não** ter
- [x] O prompt instrui explicitamente os três eixos de restrição da regra 3
- [x] Um pedido é 1 chamada de LLM para os N — não 1 por pedido
- [x] O teste é de contrato (quantidade, presença do caso sem resposta, eixos distintos) e não
      compara texto por igualdade
- [x] A saída pode ser passada direto como `naturalLanguageOrder` para `simulate_buyer_agent` e
      `compare_buyer_agent_rounds`
