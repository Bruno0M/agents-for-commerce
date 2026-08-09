import { useState } from "react"
import { PlusIcon, PlayIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { ProductCatalogReadResult } from "@/lib/catalog"
import { aggregateDiagnosis } from "@/diagnosis/aggregate"
import { discardGroup } from "@/diagnosis/lib/groups"
import { OrderEditor } from "@/diagnosis/components/OrderEditor"
import { DiagnosisSummary } from "@/diagnosis/components/DiagnosisSummary"
import { DiscardedProductCard } from "@/diagnosis/components/DiscardedProductCard"
import type { HandwrittenOrder } from "@/diagnosis/types"
import type { ApprovedTestOrderSet, DiagnosisResult } from "../flow-state"

let orderIdCounter = 0
function nextOrderId(): string {
  orderIdCounter += 1
  return `pedido-mao-${orderIdCounter}`
}

function blankOrder(): HandwrittenOrder {
  return {
    id: nextOrderId(),
    label: "",
    attributeRequirements: [],
    numericMinimumRequirements: [],
    maxPrice: null,
  }
}

// Convenience de demo (modo fixture): um pedido pronto para clicar e ver o
// diagnóstico rodar de verdade contra QUALQUER catálogo já carregado — não
// há número chumbado aqui, a simulação é a mesma que roda para um pedido
// digitado à mão. Contra o catálogo de exemplo de PhaseConectar.tsx (dois
// produtos "Fone de ouvido", sem nenhum outro dado estruturado), este
// pedido descarta os dois por ilegibilidade pura — um resultado didático,
// não decorado.
function exampleOrders(): HandwrittenOrder[] {
  return [
    {
      id: nextOrderId(),
      label:
        "Quero um fone bluetooth com cancelamento de ruído ativo, até R$300.",
      attributeRequirements: [
        { attributeName: "Tipo de produto", expectedValue: "fone" },
        { attributeName: "Cancelamento de ruído", expectedValue: "ativo" },
      ],
      numericMinimumRequirements: [],
      maxPrice: 300,
    },
  ]
}

type PhaseDiagnosticoProps = {
  fixtureMode: boolean
  catalog: ProductCatalogReadResult
  // Só leitura: a fase 3 nunca recebe um jeito de reescrever o conjunto
  // aprovado — só a fase 2 tem esse poder (D4).
  approvedOrders: ApprovedTestOrderSet
  diagnosis: DiagnosisResult | null
  onDiagnosisReady: (diagnosis: DiagnosisResult) => void
}

export function PhaseDiagnostico({
  fixtureMode,
  catalog,
  approvedOrders,
  diagnosis,
  onDiagnosisReady,
}: PhaseDiagnosticoProps) {
  const [orders, setOrders] = useState<HandwrittenOrder[]>([blankOrder()])

  function updateOrder(id: string, updated: HandwrittenOrder) {
    setOrders((current) => current.map((o) => (o.id === id ? updated : o)))
  }

  function removeOrder(id: string) {
    setOrders((current) => current.filter((o) => o.id !== id))
  }

  function addOrder() {
    setOrders((current) => [...current, blankOrder()])
  }

  function runDiagnosis(ordersToRun: HandwrittenOrder[]) {
    const result = aggregateDiagnosis(catalog.products, ordersToRun)
    onDiagnosisReady(result)
  }

  function runExample() {
    const example = exampleOrders()
    setOrders(example)
    runDiagnosis(example)
  }

  const canRun =
    orders.length > 0 &&
    catalog.products.length > 0 &&
    orders.some(
      (order) =>
        order.attributeRequirements.length > 0 ||
        order.numericMinimumRequirements.length > 0 ||
        order.maxPrice !== null
    )

  if (diagnosis) {
    const groups = {
      illegibilityOnly: diagnosis.discardedProducts.filter(
        (product) => discardGroup(product) === "illegibilityOnly"
      ),
      mixed: diagnosis.discardedProducts.filter(
        (product) => discardGroup(product) === "mixed"
      ),
      legitimateOnly: diagnosis.discardedProducts.filter(
        (product) => discardGroup(product) === "legitimateOnly"
      ),
    }

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14">
        <div>
          <h1 className="text-xl font-semibold">Diagnóstico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A loja como ela está hoje, sem nenhuma chamada de geração de
            conteúdo — a rodada "antes".
          </p>
        </div>

        <DiagnosisSummary result={diagnosis} />

        {diagnosis.discardedProducts.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum produto foi descartado pelos pedidos rodados.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.illegibilityOnly.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold">
                  Ilegibilidade pura ({groups.illegibilityOnly.length})
                </h2>
                <ul className="mt-2 flex flex-col gap-3">
                  {groups.illegibilityOnly.map((product) => (
                    <DiscardedProductCard key={product.productId} product={product} />
                  ))}
                </ul>
              </section>
            )}

            {groups.mixed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold">
                  Motivo misto ({groups.mixed.length})
                </h2>
                <ul className="mt-2 flex flex-col gap-3">
                  {groups.mixed.map((product) => (
                    <DiscardedProductCard key={product.productId} product={product} />
                  ))}
                </ul>
              </section>
            )}

            {groups.legitimateOnly.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold">
                  Rejeição legítima ({groups.legitimateOnly.length})
                </h2>
                <ul className="mt-2 flex flex-col gap-3">
                  {groups.legitimateOnly.map((product) => (
                    <DiscardedProductCard key={product.productId} product={product} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-14">
      <div>
        <h1 className="text-xl font-semibold">Diagnóstico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {`Simula o conjunto ${approvedOrders.id} contra a loja como ela está — sem gerar nada. Os ${approvedOrders.orders.length} pedidos aprovados na fase 2 ainda são texto livre (a extração por IA que os transformaria em requisito é fora do escopo deste ticket); digite abaixo, já como requisito, o(s) pedido(s) que esta fase de fato roda.`}
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {orders.map((order, index) => (
          <OrderEditor
            key={order.id}
            order={order}
            index={index}
            onChange={(updated) => updateOrder(order.id, updated)}
            onRemove={() => removeOrder(order.id)}
          />
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={addOrder}>
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Adicionar pedido
        </Button>
      </div>

      <Separator />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={!canRun}
          onClick={() => runDiagnosis(orders)}
        >
          <PlayIcon className="size-3.5" aria-hidden="true" />
          Rodar diagnóstico
        </Button>

        {fixtureMode && (
          <Button type="button" variant="outline" onClick={runExample}>
            <SparklesIcon className="size-3.5" aria-hidden="true" />
            Rodar diagnóstico de exemplo
          </Button>
        )}
      </div>
    </div>
  )
}
