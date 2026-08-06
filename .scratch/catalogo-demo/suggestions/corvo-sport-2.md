# [GEO] Conteúdo otimizado aprovado — corvo-sport-2

> Gerado automaticamente pelo agente de GEO (`generate_optimized_content`) e publicado
> como item do Task Board para aprovação humana antes de virar publicação real na
> Shopify (ver `apps/mcp-server/docs/adr/0004-task-board-nao-registry-publish.md`).
> Este arquivo é o registro, versionado no repo, do conteúdo aprovado — a aplicação em
> produção (descrição do produto + metafields na Shopify) é o objeto do ticket
> `08-metafields-shopify`.

**Produto:** Corvo Sport 2 (`handle`: `corvo-sport-2`, `productID`:
`gid://shopify/Product/9291232608468`)

**Notas do ticket:** validação ao vivo do ticket `06-repo-conectado-ao-studio` — confirma
que um item do Task Board vira PR real neste repositório agora que ele está conectado
como projeto na Studio. Antes do repo conectado, a run caía no fallback Decopilot e não
abria PR.

## Descrição otimizada

O Corvo Sport 2 é um fone de ouvido esportivo com aleta de silicone para fixação na
orelha durante atividades físicas. Possui certificação IPX7, bateria com autonomia de 32
horas incluindo o estojo, conexão Bluetooth 5.2 com suporte a dois dispositivos
simultâneos, e isolamento passivo de ruído (sem cancelamento ativo).

> Nota de fidelidade: o produto é o **controle de ANC** do catálogo de demo (ver
> `.scratch/catalogo-demo/spec.md`, produto 4) — a descrição extrai apenas os fatos já
> presentes na prosa original (`descriptionHtml` "antes"), incluindo a ausência
> deliberada de cancelamento de ruído ativo. Nenhum fato foi inventado.

## schema.org Product (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Corvo Sport 2",
  "description": "O Corvo Sport 2 é um fone de ouvido esportivo com aleta de silicone para fixação na orelha durante atividades físicas. Possui certificação IPX7, bateria com autonomia de 32 horas incluindo o estojo, conexão Bluetooth 5.2 com suporte a dois dispositivos simultâneos, e isolamento passivo de ruído (sem cancelamento ativo).",
  "productID": "gid://shopify/Product/9291232608468",
  "brand": { "@type": "Brand", "name": "Corvo" },
  "category": "Fones de ouvido",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "Cor", "value": "Preto, Verde-limão" },
    { "@type": "PropertyValue", "name": "Resistência à água", "value": "IPX7 (pode ser submerso)" },
    { "@type": "PropertyValue", "name": "Autonomia da bateria", "value": "32 horas com o estojo" },
    { "@type": "PropertyValue", "name": "Versão Bluetooth", "value": "5.2" },
    { "@type": "PropertyValue", "name": "Conexão múltipla", "value": "Sim, conecta a dois dispositivos simultaneamente" },
    { "@type": "PropertyValue", "name": "Cancelamento de ruído", "value": "Não possui cancelamento ativo; isolamento passivo pela ponteira" },
    { "@type": "PropertyValue", "name": "Sistema de fixação", "value": "Aleta de silicone" }
  ],
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "BRL",
    "offerCount": 2,
    "lowPrice": 189.00,
    "highPrice": 189.00
  }
}
```

## schema.org FAQPage (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "O Corvo Sport 2 é resistente à água?", "acceptedAnswer": { "@type": "Answer", "text": "Sim, possui certificação IPX7, o que permite submersão e uso sob suor ou chuva forte." } },
    { "@type": "Question", "name": "O Corvo Sport 2 tem cancelamento de ruído ativo?", "acceptedAnswer": { "@type": "Answer", "text": "Não. O fone conta apenas com isolamento passivo proporcionado pela ponteira, permitindo ouvir sons externos como carros durante corridas na rua." } },
    { "@type": "Question", "name": "Quanto tempo dura a bateria do Corvo Sport 2?", "acceptedAnswer": { "@type": "Answer", "text": "A bateria dura 32 horas contando com o estojo de carregamento." } },
    { "@type": "Question", "name": "O Corvo Sport 2 pode ser conectado a mais de um dispositivo ao mesmo tempo?", "acceptedAnswer": { "@type": "Answer", "text": "Sim, ele utiliza Bluetooth 5.2 e permite conexão simultânea com dois aparelhos." } }
  ]
}
```

## Status

- [x] Conteúdo gerado por `generate_optimized_content` e publicado via `publish_suggestion` (Task Board).
- [x] Aprovação humana e materialização em PR real registradas neste arquivo (ticket 06).
- [ ] Aplicação em produção (descrição + metafields na Shopify) — ver ticket `08-metafields-shopify`.
