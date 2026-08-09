import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  HandwrittenAttributeRequirement,
  HandwrittenNumericMinimumRequirement,
  HandwrittenOrder,
} from "../types"

type OrderEditorProps = {
  order: HandwrittenOrder
  index: number
  onChange: (order: HandwrittenOrder) => void
  onRemove: () => void
}

/**
 * A ficha de UM pedido digitado à mão: o texto em linguagem natural (só
 * leitura humana — ver comentário em `../types.ts`) e os requisitos
 * estruturados que o motor de fato avalia. Esta é a diferença desta fase
 * para a fase 2 (`PhaseDefinirExame`, ticket 07): lá o pedido é só prosa
 * gerada; aqui, sem extração por IA disponível, o lojista escreve a
 * asserção diretamente — no espírito do "test suite" (`docs/o-que-estamos-
 * construindo.md` §5).
 */
export function OrderEditor({
  order,
  index,
  onChange,
  onRemove,
}: OrderEditorProps) {
  function updateLabel(label: string) {
    onChange({ ...order, label })
  }

  function updateMaxPrice(raw: string) {
    const parsed = raw.trim() === "" ? null : Number(raw)
    onChange({
      ...order,
      maxPrice: parsed !== null && Number.isFinite(parsed) ? parsed : null,
    })
  }

  function addAttributeRequirement() {
    onChange({
      ...order,
      attributeRequirements: [
        ...order.attributeRequirements,
        { attributeName: "", expectedValue: "" },
      ],
    })
  }

  function updateAttributeRequirement(
    position: number,
    patch: Partial<HandwrittenAttributeRequirement>
  ) {
    onChange({
      ...order,
      attributeRequirements: order.attributeRequirements.map((req, i) =>
        i === position ? { ...req, ...patch } : req
      ),
    })
  }

  function removeAttributeRequirement(position: number) {
    onChange({
      ...order,
      attributeRequirements: order.attributeRequirements.filter(
        (_, i) => i !== position
      ),
    })
  }

  function addNumericRequirement() {
    onChange({
      ...order,
      numericMinimumRequirements: [
        ...order.numericMinimumRequirements,
        { attributeName: "", minValue: 0, unit: null },
      ],
    })
  }

  function updateNumericRequirement(
    position: number,
    patch: Partial<HandwrittenNumericMinimumRequirement>
  ) {
    onChange({
      ...order,
      numericMinimumRequirements: order.numericMinimumRequirements.map(
        (req, i) => (i === position ? { ...req, ...patch } : req)
      ),
    })
  }

  function removeNumericRequirement(position: number) {
    onChange({
      ...order,
      numericMinimumRequirements: order.numericMinimumRequirements.filter(
        (_, i) => i !== position
      ),
    })
  }

  return (
    <li
      className="rounded-lg border p-4"
      data-testid="order-editor"
      aria-label={`Pedido ${index + 1}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pedido {index + 1}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remover pedido ${index + 1}`}
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Remover
        </Button>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Pedido em linguagem natural (referência para leitura — o motor avalia
        só os requisitos abaixo)
        <Input
          value={order.label}
          onChange={(event) => updateLabel(event.target.value)}
          placeholder="Ex: fone bluetooth com cancelamento de ruído até R$300"
        />
      </label>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requisitos de atributo
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAttributeRequirement}
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Requisito
          </Button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {order.attributeRequirements.map((requirement, position) => (
            <li
              key={position}
              className="flex items-center gap-2"
            >
              <Input
                value={requirement.attributeName}
                onChange={(event) =>
                  updateAttributeRequirement(position, {
                    attributeName: event.target.value,
                  })
                }
                placeholder="Nome (ex: Cancelamento de ruído)"
                aria-label={`Nome do requisito ${position + 1}`}
              />
              <Input
                value={requirement.expectedValue}
                onChange={(event) =>
                  updateAttributeRequirement(position, {
                    expectedValue: event.target.value,
                  })
                }
                placeholder="Valor esperado (ex: ativo)"
                aria-label={`Valor esperado do requisito ${position + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAttributeRequirement(position)}
                aria-label={`Remover requisito de atributo ${position + 1}`}
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mínimos numéricos
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addNumericRequirement}
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Mínimo
          </Button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {order.numericMinimumRequirements.map((requirement, position) => (
            <li
              key={position}
              className="flex items-center gap-2"
            >
              <Input
                value={requirement.attributeName}
                onChange={(event) =>
                  updateNumericRequirement(position, {
                    attributeName: event.target.value,
                  })
                }
                placeholder="Nome (ex: Bateria)"
                aria-label={`Nome do mínimo numérico ${position + 1}`}
              />
              <Input
                type="number"
                value={requirement.minValue}
                onChange={(event) =>
                  updateNumericRequirement(position, {
                    minValue: Number(event.target.value),
                  })
                }
                placeholder="Mínimo (ex: 20)"
                aria-label={`Valor mínimo do mínimo numérico ${position + 1}`}
                className="max-w-24"
              />
              <Input
                value={requirement.unit ?? ""}
                onChange={(event) =>
                  updateNumericRequirement(position, {
                    unit: event.target.value.trim() === "" ? null : event.target.value,
                  })
                }
                placeholder="Unidade (ex: h)"
                aria-label={`Unidade do mínimo numérico ${position + 1}`}
                className="max-w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeNumericRequirement(position)}
                aria-label={`Remover mínimo numérico ${position + 1}`}
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <label className="mt-4 flex max-w-48 flex-col gap-1 text-xs font-medium text-muted-foreground">
        Preço máximo (opcional)
        <Input
          type="number"
          value={order.maxPrice ?? ""}
          onChange={(event) => updateMaxPrice(event.target.value)}
          placeholder="Ex: 300"
        />
      </label>
    </li>
  )
}
