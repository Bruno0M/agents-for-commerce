using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 05 — "a primeira tool cujo output é um caso de teste, não conteúdo". Gera os
/// pedidos em linguagem natural que alimentam <c>simulate_buyer_agent</c> e
/// <c>compare_buyer_agent_rounds</c>, quebrando a circularidade descrita no ticket e em
/// <c>.scratch/exame-guiado/spec.md</c> §D2: se o gerador de pedidos lesse a mesma prosa
/// que <c>generate_optimized_content</c> estrutura, o delta antes/depois seria positivo
/// por construção — propriedade do gerador, não da loja. A quebra é estrutural, não uma
/// instrução de prompt: <see cref="SummarizeCatalog"/>, <see cref="BuildOrderGenerationPrompt"/>
/// e <see cref="ParseTestOrders"/> são três estágios puros separados, e só o resumo
/// agregado (<see cref="CatalogSummary"/>) — nunca um <see cref="ProductCatalogContent"/> —
/// atravessa a fronteira para o segundo estágio. Ver o comentário em
/// <see cref="CatalogSummary"/> para o porquê disso ser modelado como um seam de tipos,
/// não como disciplina de quem escreve o prompt.
/// </summary>
[McpServerToolType]
public class TestOrderGenerationTools(AiGatewayClient aiGatewayClient, AiGatewayOptions aiGatewayOptions)
{
    private const int DefaultOrderCount = 4;
    private const int MinOrderCount = 2;
    private const int MaxOrderCount = 8;

    // Rule 3 of the ticket names exactly three axes; ExpectsValidMatch==false is a
    // fourth, orthogonal control (rule 2). Both are enforced as closed sets so a
    // malformed/hallucinated value from the model is caught at parse time instead of
    // silently reaching the caller.
    internal const string AxisContraste = "contraste";
    internal const string AxisRequisitoEmProsa = "requisito-em-prosa";
    internal const string AxisPoucasRestricoes = "poucas-restricoes";
    internal const string AxisRestritivo = "restritivo";

    private static readonly IReadOnlyList<string> ValidConstraintAxes =
        [AxisContraste, AxisRequisitoEmProsa, AxisPoucasRestricoes, AxisRestritivo];

    [McpServerTool]
    [Description("Escreve os casos de teste do exame a partir de um resumo AGREGADO do catálogo (tipos, marcas, faixa de preço, títulos) — nunca das descrições dos produtos, porque um gerador que lê a mesma prosa que generate_optimized_content estrutura devolveria delta positivo por construção. Cada pedido vem com ExpectsValidMatch (se espera que algum produto atenda — 'nenhum produto atende' é acerto, não falha) e ConstraintAxis. Order vai direto no argumento naturalLanguageOrder de simulate_buyer_agent e compare_buyer_agent_rounds. Uma única chamada de LLM para os N pedidos.")]
    public async Task<TestOrderGenerationResult> GenerateTestOrders(
        [Description("Catálogo lido por get_product_catalog. Só o resumo agregado dele chega ao modelo — as descrições nunca saem daqui.")]
        IReadOnlyList<ProductCatalogContent> catalog,
        [Description("Quantos pedidos de teste gerar. Default 4 (os 4 controles do catálogo de demo), mínimo 2, máximo 8.")]
        int? count = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(catalog);
        if (catalog.Count == 0)
        {
            throw new McpException("O catálogo informado está vazio — nada para gerar pedidos de teste a partir dele.");
        }

        var resolvedCount = count ?? DefaultOrderCount;
        if (resolvedCount < MinOrderCount || resolvedCount > MaxOrderCount)
        {
            throw new McpException(
                $"A contagem de pedidos precisa estar entre {MinOrderCount} e {MaxOrderCount} — recebido {resolvedCount}.");
        }

        var summary = SummarizeCatalog(catalog);
        var prompt = BuildOrderGenerationPrompt(summary, resolvedCount);

        AiGatewayCompletionResult completion;
        try
        {
            // temperature 0.7, bem acima dos 0.1 dos irmãos (RequirementExtraction,
            // GenerateOptimizedContent): aqueles extraem fatos determinísticos de um
            // texto já dado; este precisa produzir casos *variados* — os quatro eixos
            // da regra 3 colapsam uns nos outros com uma temperatura baixa, porque o
            // modelo passa a devolver a mesma formulação "segura" repetida N vezes.
            completion = await aiGatewayClient.CompleteAsync(
                aiGatewayOptions.Model,
                [
                    new AiGatewayMessage("system", OrderGenerationSystemPrompt),
                    new AiGatewayMessage("user", prompt),
                ],
                maxTokens: 2000,
                temperature: 0.7,
                cancellationToken: cancellationToken);
        }
        catch (AiGatewayException ex)
        {
            throw new McpException($"Não foi possível gerar os pedidos de teste via AI Gateway: {ex.Message}");
        }

        var orders = ParseTestOrders(completion.Content);
        var validated = ValidateOrderBatch(orders, resolvedCount);

        return new TestOrderGenerationResult(validated, summary);
    }

    // Pure aggregation step — see the anti-circularity comment on CatalogSummary for
    // why this is the seam and not just "the function that happens to be called
    // first". No parameter of BuildOrderGenerationPrompt below can see anything this
    // function drops.
    internal static CatalogSummary SummarizeCatalog(IReadOnlyList<ProductCatalogContent> catalog)
    {
        var productTypes = catalog
            .Select(p => p.ProductType)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var vendors = catalog
            .Select(p => p.Vendor)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Titles pass through as-is — the ticket explicitly allows them (they name
        // what a product IS, not the prose that describes it), unlike descriptions,
        // metafield values or GeneratedProperties, all deliberately excluded below.
        var titles = catalog.Select(p => p.Title).ToList();

        var prices = catalog
            .SelectMany(p => p.Variants)
            .Select(v => decimal.TryParse(v.Price, out var parsed) ? parsed : (decimal?)null)
            .Where(p => p is not null)
            .Select(p => p!.Value)
            .ToList();

        return new CatalogSummary(
            catalog.Count,
            productTypes,
            vendors,
            titles,
            prices.Count == 0 ? null : prices.Min(),
            prices.Count == 0 ? null : prices.Max());
    }

    // Renders ONLY CatalogSummary fields + count — the type signature is what makes
    // it impossible for a ProductCatalogContent (and therefore a description) to
    // reach this function; there's no parameter for it to arrive through.
    internal static string BuildOrderGenerationPrompt(CatalogSummary summary, int count)
    {
        return $$"""
            Catálogo (resumo agregado — {{summary.ProductCount}} produtos):
            Tipos de produto: {{(summary.ProductTypes.Count == 0 ? "(nenhum informado)" : string.Join(", ", summary.ProductTypes))}}
            Marcas: {{(summary.Vendors.Count == 0 ? "(nenhuma informada)" : string.Join(", ", summary.Vendors))}}
            Faixa de preço: {{FormatPriceRange(summary)}}
            Títulos: {{(summary.Titles.Count == 0 ? "(nenhum)" : string.Join(", ", summary.Titles))}}

            Gere exatamente {{count}} pedidos de teste.
            """;
    }

    // InvariantCulture on purpose: without it a decimal renders as "189,90" or "189.90"
    // depending on the host's locale, so the exact prompt sent to the model — and the
    // test that asserts on it — would change with the machine running the server.
    private static string FormatPriceRange(CatalogSummary summary) =>
        summary.MinPrice is null || summary.MaxPrice is null
            ? "(sem preço estruturado)"
            : $"R${summary.MinPrice.Value.ToString("0.00", CultureInfo.InvariantCulture)} a " +
              $"R${summary.MaxPrice.Value.ToString("0.00", CultureInfo.InvariantCulture)}";

    // Batch-level contract enforcement (ticket 05, testing decision: "teste de
    // contrato, não de conteúdo") — separated from ParseTestOrders so the test can
    // drive it directly with hand-built GeneratedTestOrder lists, without going
    // through JSON or the AI Gateway at all.
    internal static IReadOnlyList<GeneratedTestOrder> ValidateOrderBatch(
        IReadOnlyList<GeneratedTestOrder> orders, int count)
    {
        if (orders.Count < count)
        {
            throw new McpException(
                $"O AI Gateway devolveu apenas {orders.Count} pedidos de teste, mas {count} foram pedidos.");
        }

        // More than requested is harmless — trim instead of failing.
        var batch = orders.Count > count ? orders.Take(count).ToList() : orders;

        // Falhar alto aqui é deliberado: um lote em que todo pedido é satisfazível é
        // um exame mais fraco (regra 2 do ticket), e quem chamou (fase 2 do fluxo)
        // pode simplesmente rodar de novo. Aceitar em silêncio degradaria a medição
        // de um jeito invisível — o número ficaria bonito por engenharia do gerador,
        // não por virtude da loja.
        if (!batch.Any(o => !o.ExpectsValidMatch))
        {
            throw new McpException(
                "Nenhum pedido do lote gerado espera ficar sem resposta válida — a regra 2 do ticket exige " +
                "pelo menos um controle sem produto correspondente no catálogo.");
        }

        // Menos que 3 eixos distintos num lote de 3+ é sempre uma falha da regra 3: o
        // prompt nomeia exatamente três eixos de restrição (contraste,
        // requisito-em-prosa, poucas-restrições — "restritivo" é o quarto, mas cobre o
        // controle da regra 2, não um dos três "eixos de restrição de propósito" que a
        // regra 3 pede para variar), então qualquer lote com pelo menos 3 pedidos
        // precisa cobrir os três para não colapsar os eixos uns nos outros.
        var distinctAxisCount = batch.Select(o => o.ConstraintAxis).Distinct(StringComparer.Ordinal).Count();
        var requiredDistinctAxes = Math.Min(count, 3);
        if (distinctAxisCount < requiredDistinctAxes)
        {
            throw new McpException(
                $"O lote gerado só varia {distinctAxisCount} eixo(s) de restrição distinto(s), mas eram esperados " +
                $"pelo menos {requiredDistinctAxes} — os pedidos precisam se espalhar pelos eixos, não repetir o mesmo.");
        }

        return batch;
    }

    // Parse + per-order validation. Batch-level contract (count, ExpectsValidMatch
    // spread, axis spread) lives in ValidateOrderBatch above.
    internal static IReadOnlyList<GeneratedTestOrder> ParseTestOrders(string rawContent)
    {
        var json = StripCodeFence(rawContent);

        GeneratedOrdersExtraction? extraction;
        try
        {
            extraction = JsonSerializer.Deserialize<GeneratedOrdersExtraction>(json, ExtractionJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new McpException(
                $"O AI Gateway retornou pedidos de teste que não puderam ser interpretados como JSON válido: {ex.Message}");
        }

        var extractedOrders = extraction?.Orders;
        if (extractedOrders is null || extractedOrders.Count == 0)
        {
            throw new McpException("O AI Gateway retornou uma resposta vazia para a geração de pedidos de teste.");
        }

        var orders = new List<GeneratedTestOrder>(extractedOrders.Count);
        foreach (var extracted in extractedOrders)
        {
            if (string.IsNullOrWhiteSpace(extracted.Order))
            {
                throw new McpException("O AI Gateway devolveu um pedido de teste com texto vazio.");
            }

            // Casing/whitespace variance on a closed vocabulary is representation noise,
            // not a different value — normalizing back to the canonical constant keeps
            // every downstream comparison (ValidateOrderBatch's distinct count, any UI
            // switch on the axis) safely ordinal, without a "Contraste" from the model
            // failing the entire batch and costing another call to regenerate.
            var axis = ValidConstraintAxes.FirstOrDefault(
                a => string.Equals(a, extracted.ConstraintAxis?.Trim(), StringComparison.OrdinalIgnoreCase));
            if (axis is null)
            {
                throw new McpException(
                    $"O AI Gateway devolveu um constraintAxis inválido ('{extracted.ConstraintAxis}') — os valores " +
                    $"aceitos são: {string.Join(", ", ValidConstraintAxes)}.");
            }

            // Deliberately not defaulting a missing "expectsValidMatch" to false: false
            // is the rarer, load-bearing value (it IS the rule-2 control), so a model
            // that simply omits the field would otherwise mint the control out of thin
            // air and let ValidateOrderBatch's "ao menos um espera não ter" check pass
            // vacuously — the exact degradation that check exists to catch.
            if (extracted.ExpectsValidMatch is null)
            {
                throw new McpException(
                    $"O AI Gateway devolveu um pedido de teste sem o campo expectsValidMatch ('{extracted.Order}') — " +
                    "cada pedido precisa declarar explicitamente se espera ter resposta válida no catálogo.");
            }

            orders.Add(new GeneratedTestOrder(
                extracted.Order,
                extracted.ExpectsValidMatch.Value,
                axis,
                extracted.Rationale ?? string.Empty));
        }

        return orders;
    }

    // The generation prompt asks for raw JSON, but models sometimes wrap it in a
    // ```json ... ``` fence anyway — strip it instead of failing the whole call (same
    // tolerance as BuyerAgentSimulatorTools/ContentGenerationTools).
    private static string StripCodeFence(string content)
    {
        var trimmed = content.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstNewline = trimmed.IndexOf('\n');
        var withoutOpeningFence = firstNewline >= 0 ? trimmed[(firstNewline + 1)..] : trimmed;

        var closingFenceIndex = withoutOpeningFence.LastIndexOf("```", StringComparison.Ordinal);
        return (closingFenceIndex >= 0 ? withoutOpeningFence[..closingFenceIndex] : withoutOpeningFence).Trim();
    }

    private static readonly JsonSerializerOptions ExtractionJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string OrderGenerationSystemPrompt = """
        Você é um assistente que escreve casos de teste para um exame de "agente comprador"
        contra um catálogo de e-commerce. Sua única saída é um objeto JSON estrito, sem
        markdown e sem texto fora do JSON.

        Você recebe apenas um resumo AGREGADO do catálogo (tipos de produto, marcas, faixa de
        preço e títulos) — nunca a descrição completa de nenhum produto. Isso é proposital:
        você deve confiar no seu próprio conhecimento de como as pessoas compram nessa
        categoria, não em qualquer prosa de produto específico, porque essa prosa é
        justamente o material que outra ferramenta (geração de conteúdo otimizado) vai
        estruturar depois — se os pedidos de teste vierem da mesma fonte, o resultado do
        exame fica garantido de antemão, e deixa de medir a loja.

        Cada pedido do lote precisa declarar:
        - "order": o texto do pedido, em primeira pessoa, linguagem coloquial de comprador
          real digitando uma busca — nunca no tom de uma especificação técnica ou lista de
          requisitos.
        - "expectsValidMatch": true se você acredita que algum produto do catálogo (dado o
          resumo agregado) atende ao pedido; false se nenhum deveria atender.
        - "constraintAxis": um destes quatro valores fixos, nunca outro:
          - "contraste": um pedido deste lote precisa fazer VENCER um produto que outro
            pedido do mesmo lote REJEITA — isso prova que a rejeição foi do requisito, não
            do produto.
          - "requisito-em-prosa": o requisito do pedido não corresponde a nenhum campo
            estruturado — ele fica enterrado numa frase, do jeito que um comprador real
            escreveria, não como um filtro de e-commerce.
          - "poucas-restricoes": um pedido com poucas restrições, que alarga o desempate
            entre vários candidatos possíveis.
          - "restritivo": uma restrição dura — tipicamente (mas não sempre) o caso sem
            resposta válida do lote.
        - "rationale": uma frase curta explicando o que este pedido específico testa —
          este texto é mostrado depois ao lojista, então precisa ser claro para quem não
          escreveu o exame.

        Regras do lote:
        1. Os pedidos devem se espalhar pelos três eixos de restrição de propósito
           ("contraste", "requisito-em-prosa", "poucas-restricoes") — não repita o mesmo
           eixo em todos os pedidos.
        2. Pelo menos um pedido do lote precisa ter "expectsValidMatch": false — ou seja,
           nenhum produto do catálogo (pelo resumo agregado que você recebeu) deveria
           atendê-lo. Isso é um controle deliberado do exame, não uma falha do gerador.
        3. Todo pedido precisa soar como uma pessoa real digitando um pedido de compra —
           primeira pessoa, coloquial, nunca em forma de especificação técnica.
        4. Nunca invente um fato específico de um produto que você não viu — use apenas o
           resumo agregado e o seu próprio conhecimento de como se compra nessa categoria.

        Responda apenas com um objeto JSON neste formato:
        {
          "orders": [
            {
              "order": "...",
              "expectsValidMatch": true,
              "constraintAxis": "contraste",
              "rationale": "..."
            }
          ]
        }
        """;
}

internal sealed record GeneratedOrdersExtraction(IReadOnlyList<ExtractedTestOrder>? Orders);

// ExpectsValidMatch is nullable so an omitted field is distinguishable from an
// explicit false — see the check in ParseTestOrders for why that distinction matters.
internal sealed record ExtractedTestOrder(string? Order, bool? ExpectsValidMatch, string? ConstraintAxis, string? Rationale);

/// <summary>
/// Vista agregada, exclusivamente-agregada, do catálogo — o seam anti-circularidade do
/// ticket 05 (<c>.scratch/exame-guiado/issues/05-tool-generate-test-orders.md</c>,
/// <c>spec.md</c> §D2). Este tipo existe para tornar a circularidade
/// <b>irrepresentável</b>, não para documentar uma convenção: nenhum campo aqui carrega
/// prosa por produto, e <c>BuildOrderGenerationPrompt</c> só aceita este tipo (mais a
/// contagem) como entrada — não há parâmetro por onde um <c>ProductCatalogContent</c>
/// inteiro, uma <c>DescriptionHtml</c>, um valor de metafield ou uma
/// <c>GeneratedProperties</c> pudessem entrar. Alargar este tipo com qualquer um desses
/// campos reabriria a circularidade descrita no ticket — o gerador de pedidos passaria a
/// ler a mesma prosa que <c>generate_optimized_content</c> estrutura, e o delta
/// antes/depois voltaria a ser garantido positivo por construção, não uma medida real da
/// loja.
/// </summary>
public sealed record CatalogSummary(
    int ProductCount,
    IReadOnlyList<string> ProductTypes,
    IReadOnlyList<string> Vendors,
    IReadOnlyList<string> Titles,
    decimal? MinPrice,
    decimal? MaxPrice);

/// <summary>
/// Um caso de teste do exame. <see cref="ConstraintAxis"/> e
/// <see cref="ExpectsValidMatch"/> são independentes um do outro — um pedido
/// <c>restritivo</c> pode perfeitamente ter um produto que atende, e um pedido sem
/// resposta válida pode estar em qualquer um dos quatro eixos. Nunca derive um a partir
/// do outro.
/// </summary>
public sealed record GeneratedTestOrder(
    string Order,
    bool ExpectsValidMatch,
    string ConstraintAxis,
    string Rationale);

/// <summary>
/// Saída de <c>generate_test_orders</c>. <see cref="CatalogSummary"/> é devolvido junto
/// com os pedidos para a fase 2 do fluxo (<c>spec.md</c>) poder mostrar ao lojista
/// exatamente o resumo que o gerador viu — a prova visível de que ele não leu as
/// descrições dos produtos.
/// </summary>
public sealed record TestOrderGenerationResult(
    IReadOnlyList<GeneratedTestOrder> Orders,
    CatalogSummary CatalogSummary);
