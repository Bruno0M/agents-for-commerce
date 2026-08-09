import {
  CircleOffIcon,
  CircleSlashIcon,
  BadgeCheckIcon,
  EyeOffIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ProductCatalogReadResult } from "@/lib/catalog"
import type {
  ApprovedTestOrderSet,
  CatalogSummary,
  ConstraintAxis,
  GeneratedTestOrder,
} from "../flow-state"

// Fixture só para modo fixture (sem transporte — o ticket 05 do transporte
// segue aberto). O catálogo agregado abaixo espelha o que SummarizeCatalog
// (TestOrderGenerationTools.cs) produziria a partir do FIXTURE_CATALOG de
// PhaseConectar.tsx (mesmos títulos, marcas, tipo de produto); a faixa de
// preço é a única parte inventada aqui, porque aquele catálogo de exemplo
// não carrega preço de variante — "sem preço estruturado" também é um
// estado real (ver FormatPriceRange no C#), só não é o mais didático para
// esta demo.
const FIXTURE_CATALOG_SUMMARY: CatalogSummary = {
  productCount: 2,
  productTypes: ["Fone de ouvido"],
  vendors: ["Aurora", "Corvo"],
  titles: ["Aurora NC7", "Corvo Sport 2"],
  minPrice: 189,
  maxPrice: 899,
}

// Quatro pedidos, quatro eixos distintos — a mesma variação que
// ValidateOrderBatch exige do lado do servidor (>= 3 eixos distintos para
// um lote de 4). O pedido 4 é o controle da regra 2: expectsValidMatch
// false, e o rationale referencia de volta o pedido 1 para deixar visível
// o par de contraste (o mesmo produto vence num pedido e é rejeitado no
// outro, provando que a rejeição foi do requisito).
function createFixtureGeneratedOrders(): GeneratedTestOrder[] {
  return [
    {
      id: "pedido-1",
      naturalLanguageOrder:
        "Quero um fone bluetooth com cancelamento de ruído até R$400",
      expectsValidMatch: true,
      constraintAxis: "contraste",
      rationale:
        "Contrasta com o pedido 4: o mesmo produto que lá é rejeitado por bateria precisa vencer aqui — prova que a rejeição foi do requisito, não do produto.",
    },
    {
      id: "pedido-2",
      naturalLanguageOrder:
        "Preciso de um fone que aguente o dia inteiro sem incomodar o ouvido",
      expectsValidMatch: true,
      constraintAxis: "requisito-em-prosa",
      rationale:
        "Conforto prolongado não é campo estruturado em nenhum lugar do catálogo — testa se o agente entende a frase, não um filtro de e-commerce.",
    },
    {
      id: "pedido-3",
      naturalLanguageOrder: "Preciso de um fone para treino, sem restrição de preço",
      expectsValidMatch: true,
      constraintAxis: "poucas-restricoes",
      rationale:
        "Poucas restrições — alarga o desempate entre vários candidatos possíveis do catálogo.",
    },
    {
      id: "pedido-4",
      naturalLanguageOrder:
        "Preciso de um fone com 40 horas de bateria e microfone destacável para chamadas",
      expectsValidMatch: false,
      constraintAxis: "restritivo",
      rationale:
        "Controle: nenhum produto do catálogo combina 40h de bateria com microfone destacável — nenhuma resposta válida é o resultado certo aqui, não uma falha do exame.",
    },
  ]
}

// Rótulo humano + explicação curta de cada eixo. O slug cru
// ("requisito-em-prosa") não significa nada para quem não escreveu o
// exame — o texto vem direto do OrderGenerationSystemPrompt em
// TestOrderGenerationTools.cs, só reescrito na segunda pessoa do lojista.
const CONSTRAINT_AXIS_LABELS: Record<ConstraintAxis, string> = {
  contraste: "Contraste",
  "requisito-em-prosa": "Requisito em prosa",
  "poucas-restricoes": "Poucas restrições",
  restritivo: "Restritivo",
}

const CONSTRAINT_AXIS_DESCRIPTIONS: Record<ConstraintAxis, string> = {
  contraste:
    "Este pedido precisa fazer vencer um produto que outro pedido do lote rejeita — prova que a rejeição foi do requisito, não do produto em si.",
  "requisito-em-prosa":
    "O requisito não corresponde a nenhum campo estruturado do catálogo — está enterrado numa frase, do jeito que um comprador real escreveria.",
  "poucas-restricoes":
    "Pedido com poucas restrições, que alarga o desempate entre vários candidatos possíveis.",
  restritivo:
    "Restrição dura — tipicamente (mas não sempre) o caso sem resposta válida do lote.",
}

function formatPriceRange(summary: CatalogSummary): string {
  if (summary.minPrice === null || summary.maxPrice === null) {
    return "sem preço estruturado"
  }
  return `R$${summary.minPrice.toFixed(2)}–R$${summary.maxPrice.toFixed(2)}`
}

function ConstraintAxisBadge({ axis }: { axis: ConstraintAxis }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="appearance-none border-0 bg-transparent p-0"
        render={<Badge variant="outline" />}
      >
        {CONSTRAINT_AXIS_LABELS[axis]}
      </TooltipTrigger>
      <TooltipContent>{CONSTRAINT_AXIS_DESCRIPTIONS[axis]}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Painel "o que o modelo viu": renderiza o CatalogSummary tal como o
 * gerador recebeu — nunca as descrições. Não é enfeite (requisito 4 do
 * ticket 07 para esta view): é como o lojista audita, sem precisar ler o
 * C#, que o exame não foi escrito a partir da mesma prosa que o
 * generate_optimized_content vai estruturar na fase 4.
 */
function CatalogSummaryPanel({ summary }: { summary: CatalogSummary }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h2 className="text-sm font-semibold">O modelo viu</h2>
      <p className="mt-1 text-sm">
        {summary.productCount} produtos ·{" "}
        {summary.productTypes.length > 0
          ? summary.productTypes.join(", ")
          : "tipos não informados"}{" "}
        ·{" "}
        {summary.vendors.length > 0
          ? summary.vendors.join(", ")
          : "marcas não informadas"}{" "}
        · {formatPriceRange(summary)}
      </p>
      {summary.titles.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Títulos: {summary.titles.join(", ")}
        </p>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <EyeOffIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Sem descrições. O gerador nunca viu a prosa dos produtos — só este
          resumo agregado, para não repetir na pergunta o mesmo texto que o
          conserto (fase 4) vai estruturar na resposta.
        </span>
      </p>
    </div>
  )
}

/**
 * A ficha de um pedido: texto, o que ele testa (rationale), o eixo, e o
 * selo de expectativa. O caso `expectsValidMatch: false` (requisito 2 do
 * ticket 07 — o critério de aceite mais importante) recebe tratamento
 * visualmente distinto do caso comum: não é uma variação sutil de cor, é um
 * `Alert` com título e explicação própria, para não se ler como defeito.
 */
function OrderCard({
  order,
  index,
}: {
  order: GeneratedTestOrder
  index: number
}) {
  return (
    <li
      className="rounded-lg border p-4"
      data-testid="order-card"
      data-expects-valid-match={order.expectsValidMatch}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pedido {index + 1}</h3>
        <ConstraintAxisBadge axis={order.constraintAxis} />
      </div>

      <p className="mt-2 text-sm italic">“{order.naturalLanguageOrder}”</p>

      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Testa: </span>
        {order.rationale}
      </p>

      {order.expectsValidMatch ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-foreground/80">
          <BadgeCheckIcon className="size-4 text-pass-ink" />
          Espera resposta válida
        </p>
      ) : (
        <Alert className="mt-3 border-caution-line bg-caution-soft text-caution-ink">
          <CircleSlashIcon />
          <AlertTitle>
            Controle — espera NÃO ter resposta válida
          </AlertTitle>
          <AlertDescription className="text-caution-ink/80">
            Nenhum produto do catálogo deveria atender este pedido. Isso é o
            resultado certo — "nenhum produto atende" é acerto do exame, não
            defeito do gerador nem falha do catálogo.
          </AlertDescription>
        </Alert>
      )}
    </li>
  )
}

let fixtureOrderSetCounter = 0

type PhaseDefinirExameProps = {
  fixtureMode: boolean
  catalog: ProductCatalogReadResult
  approvedOrders: ApprovedTestOrderSet | null
  onOrdersApproved: (approvedOrders: ApprovedTestOrderSet) => void
}

export function PhaseDefinirExame({
  fixtureMode,
  catalog,
  approvedOrders,
  onOrdersApproved,
}: PhaseDefinirExameProps) {
  // Sem etapa de aprovação por enquanto: gerar já entrega o conjunto ao
  // wizard. O gate humano ("nada é simulado antes do aprovar") é critério do
  // ticket 07 e volta junto com edição/descarte — sem poder mexer nos
  // pedidos, aprovar seria um clique sem escolha do outro lado.
  // Gerado uma vez, o conjunto não é regerado: approvedOrders vira a única
  // fonte de verdade e atravessa as fases 3 e 4 como a mesma referência (D4).
  function handleGenerate() {
    fixtureOrderSetCounter += 1
    onOrdersApproved({
      id: `fixture-approved-orders-${fixtureOrderSetCounter}`,
      orders: createFixtureGeneratedOrders(),
      catalogSummary: FIXTURE_CATALOG_SUMMARY,
    })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-14">
      <div>
        <h1 className="text-xl font-semibold">Definir o exame</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gera pedidos de teste a partir dos {catalog.products.length}{" "}
          produtos lidos; o lojista revisa antes de qualquer simulação rodar.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Escrever, editar ou descartar pedido individualmente — e o gate de
        aprovação que depende disso — é do ticket 07 da{" "}
        <code className="text-xs">.scratch/exame-guiado/issues/</code> e fica
        para depois; esta tela cobre a ficha de revisão.
      </p>

      {!approvedOrders && !fixtureMode && (
        <Alert>
          <CircleOffIcon />
          <AlertTitle>Sem transporte</AlertTitle>
          <AlertDescription>
            Modo fixture está desligado, e o transporte do ticket 05 ainda
            não existe. Esta fase não produz insumo sem ele — ligue o modo
            fixture para seguir a demo.
          </AlertDescription>
        </Alert>
      )}

      {!approvedOrders && fixtureMode && (
        <div>
          <Button type="button" onClick={handleGenerate}>
            Gerar pedidos de exemplo
          </Button>
        </div>
      )}

      {approvedOrders && (
        <>
          <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            Conjunto do exame: {approvedOrders.id} (
            {approvedOrders.orders.length} pedidos).
          </p>

          <CatalogSummaryPanel summary={approvedOrders.catalogSummary} />

          <Separator />

          <ol className="flex flex-col gap-3">
            {approvedOrders.orders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
