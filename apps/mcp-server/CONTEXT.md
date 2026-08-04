# MCP Server (Agente de GEO)

Servidor MCP em .NET que expõe as ferramentas do agente de GEO com validação por agente comprador: lê o catálogo, gera conteúdo estruturado otimizado, simula um comprador testando antes/depois, e publica sugestões para aprovação humana.

## Language

**GEO (Generative Engine Optimization)**:
Otimizar o conteúdo de uma PDP para ser lido e compreendido por agentes de IA — o alvo é a legibilidade agêntica, não palavras-chave ou ranqueamento em busca tradicional.
_Avoid_: SEO (alvo diferente — humano/motor de busca, não agente)

**Legibilidade agêntica**:
Grau em que uma PDP expõe dado estruturado suficiente (schema.org, specs, FAQ) para um agente comprador confirmar, sem ambiguidade, se um produto atende a um requisito do pedido.
_Avoid_: qualidade de conteúdo (mistura com copywriting para humano)

**Agente comprador (buyer agent)**:
Agente simulado que, a partir de um pedido em linguagem natural, tenta identificar e decidir a compra de um produto no catálogo — usado para medir o antes/depois da otimização.
_Avoid_: assistente de compras, chatbot

**Requisito obrigatório**:
Restrição extraída do pedido em linguagem natural do usuário (tipo de produto, característica, faixa de preço) que um produto precisa confirmar via dado estruturado para permanecer candidato. Aplicado à risca: sem confirmação estruturada, o produto é descartado mesmo que atenda na prática.
_Avoid_: filtro, critério de busca

**Sucesso de compra**:
Métrica binária por rodada de teste: o agente comprador confirmou todos os requisitos obrigatórios via dado estruturado e, havendo mais de um candidato, justificou a escolha com base em diferenciais também estruturados.
_Avoid_: conversão, taxa de conversão (métrica de e-commerce tradicional — não é essa)

**Sugestão** (vs publicação):
O que as tools deste servidor produzem — nunca uma mudança já aplicada na loja. Toda sugestão passa pelo Task Board do CMS Agêntico antes de virar publicação real.
_Avoid_: mudança, edição, publicação (reservado para depois da aprovação humana)

**CMS Agêntico (Task Board)**:
Mecanismo da Deco Studio pelo qual um agente sugere uma mudança de conteúdo do storefront, um humano aprova ou rejeita, e só então a mudança é promovida a produção. Ver ADR 0004 para os detalhes técnicos do mecanismo.
_Avoid_: Registry Publish (mecanismo diferente — ver ADR 0004)

**Catálogo de teste**:
Conjunto fixo de produtos (5-10) usado de forma idêntica nas rodadas "antes" e "depois", propositalmente pobre em conteúdo estruturado na versão original.
_Avoid_: catálogo de produção, catálogo real
