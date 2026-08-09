import {
  AlertCircleIcon,
  ChevronDownIcon,
  InfoIcon,
  Loader2Icon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CatalogSimulationRunState } from "@/diagnosis/lib/simulationRun"
import type { CatalogExamResult, GeneratedTestOrder } from "@/diagnosis/types"

type CatalogExamOrdersPanelProps = {
  runState: CatalogSimulationRunState
  /** O catálogo carregado agora — só para a frase de escopo antes da
   * primeira rodada ("sobre N produtos"), o mesmo número que a faixa de
   * placar já declara. */
  totalProductCount: number
  /** O resultado da última rodada bem-sucedida, ou `null` quando o exame
   * nunca rodou. Decide qual dos dois botões aparece: `null` é sempre
   * "Rodar Agente de Simulação"; um resultado presente troca para o
   * split-button "Gerar otimizado" (com "Rodar simulação novamente" no
   * menu), mesmo que uma rodada mais nova tenha falhado — o resultado
   * anterior continua válido até uma nova rodada suceder. */
  examResult: CatalogExamResult | null
  onRun: () => void
}

/**
 * A faixa EXAME do redesenho de botão único (`.scratch/catalogo-como-exame/`,
 * decisão literal do dono do projeto que substitui o ticket 04 original):
 * antes da primeira rodada, **um botão só**, "Rodar Agente de Simulação". O
 * lojista não aprova nada e não edita nada — clicou, o botão dispara as duas
 * chamadas de `runSimulationAgent` (`../lib/runSimulationAgent.ts`) e este
 * painel só MOSTRA o que chega, nunca coleta entrada.
 *
 * Depois de um resultado (`examResult` não-nulo), o botão principal vira
 * "Gerar otimizado" — a ação de consertar só os produtos `illegible` do
 * diagnóstico — com "Rodar simulação novamente" escondido atrás do chevron
 * do split-button, porque rodar de novo deixou de ser a ação mais comum
 * depois que já existe um veredito. "Gerar otimizado" ainda não tem backend
 * (`generate_optimized_content` não existe — ver `types.ts:219`) — o botão
 * fica desabilitado com tooltip em vez de fingir que funciona.
 *
 * POR ENQUANTO (pedido direto do dono do projeto, ver
 * `.scratch/catalogo-como-exame/issues/04-faixa-do-exame-pedidos-persistentes-e-execucao.md`,
 * seção "Comments"): este painel NÃO desenha mais os cartões de pedido
 * (texto em prosa + eixo de restrição + `expectsValidMatch` + rationale).
 * Isso é só a RENDERIZAÇÃO que saiu — o dado continua fluindo por inteiro:
 * `GeneratedTestOrder[]` segue sendo produzido pela etapa 1, carregado pelo
 * reducer (`CatalogSimulationRunState.running-agent`/`success`/`error`) e
 * repassado por `catalog-page.tsx` para `CatalogExamControls` (filtro por
 * pedido) e para a agregação — nada nesse caminho foi tocado. Voltar a
 * mostrar os cartões é reverter esta função, não redesenhar o resto da
 * tela.
 *
 * As duas etapas reais (`writeTestOrders`, depois `runBuyerAgent`) aparecem
 * como progresso HONESTO, não decorativo: os atrasos artificiais de
 * `runSimulationAgent` existem exatamente para o painel poder renderizar
 * "escrevendo os pedidos..." e depois "rodando o agente..." como dois
 * momentos reais, cada um com o escopo declarado. Falha em qualquer etapa
 * tem `Alert` com a mensagem exata e um botão de retentativa — nunca tela
 * branca, nunca spinner infinito.
 */
export function CatalogExamOrdersPanel({
  runState,
  totalProductCount,
  examResult,
  onRun,
}: CatalogExamOrdersPanelProps) {
  const isRunning =
    runState.status === "writing-orders" || runState.status === "running-agent"

  const orders: GeneratedTestOrder[] =
    runState.status === "running-agent" || runState.status === "success"
      ? runState.orders
      : runState.status === "error" && runState.orders !== null
        ? runState.orders
        : []

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      data-testid="catalog-exam-orders-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pedidos do exame</p>
          <p className="text-xs text-muted-foreground">
            {orders.length > 0 ? (
              <>
                {orders.length} pedido{orders.length === 1 ? "" : "s"} gerado
                {orders.length === 1 ? "" : "s"} nesta rodada.
              </>
            ) : (
              <>
                Ainda não há pedidos. Um clique faz o agente escrever os
                pedidos de teste e rodar a simulação sobre {totalProductCount}{" "}
                produto{totalProductCount === 1 ? "" : "s"}.
              </>
            )}
          </p>
        </div>

        {examResult ? (
          <ButtonGroup className="min-w-56">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    disabled
                    focusableWhenDisabled
                    className="grow aria-disabled:opacity-50"
                  />
                }
              >
                <SparklesIcon className="size-3.5" aria-hidden="true" />
                Gerar otimizado
                {examResult.illegibleProductCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                    {examResult.illegibleProductCount}
                  </span>
                )}
              </TooltipTrigger>
              <TooltipContent>
                Ainda não disponível — o servidor não gera conteúdo otimizado
                nesta etapa do projeto.
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Mais ações do exame"
                    disabled={isRunning}
                  />
                }
              >
                {isRunning ? (
                  <Loader2Icon
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDownIcon className="size-3.5" aria-hidden="true" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onRun} disabled={isRunning}>
                  <PlayIcon className="size-3.5" aria-hidden="true" />
                  Rodar simulação novamente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        ) : (
          <Button type="button" onClick={onRun} disabled={isRunning}>
            {isRunning ? (
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <PlayIcon className="size-3.5" aria-hidden="true" />
            )}
            Rodar Agente de Simulação
          </Button>
        )}
      </div>

      {runState.status === "writing-orders" && (
        <span
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          Escrevendo os pedidos de teste sobre {runState.scope.productCount}{" "}
          produto{runState.scope.productCount === 1 ? "" : "s"}…
        </span>
      )}

      {runState.status === "running-agent" && (
        <span
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          Rodando o agente comprador contra {runState.orders.length} pedido
          {runState.orders.length === 1 ? "" : "s"} e{" "}
          {runState.scope.productCount} produto
          {runState.scope.productCount === 1 ? "" : "s"}…
        </span>
      )}

      {runState.status === "error" && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            {runState.stage === "writing-orders"
              ? "Não foi possível escrever os pedidos de teste"
              : "Não foi possível rodar o agente comprador"}
          </AlertTitle>
          <AlertDescription>{runState.message}</AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRun}
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Rodar o exame não gera conteúdo nenhum — o agente escreve os
          pedidos e mede a loja como ela está agora, contra o catálogo cru.
          Estruturar conteúdo é uma ação separada, sempre depois de ver o
          resultado.
        </span>
      </p>
    </section>
  )
}
