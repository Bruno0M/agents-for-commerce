using System.Net;
using System.Text;
using System.Text.Json;
using McpServer.Infrastructure;
using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 05 — <c>generate_test_orders</c>. Per <c>spec.md</c>'s testing decision, this
/// is a <b>contract</b> test suite, never an equality test on generated text: the model's
/// output is non-deterministic prose, so nothing here asserts a specific <c>Order</c>
/// string. What's asserted is structural — count, presence of the "no valid match"
/// control, distinct constraint axes — plus the ticket's central, verifiable claim: that
/// no product description ever reaches the AI Gateway request body. That last one is
/// checked against a real <see cref="AiGatewayClient"/> wired to a fake
/// <see cref="HttpMessageHandler"/> that records the outgoing request, not against a
/// reimplementation of the tool's plumbing — same idea as
/// <c>BeforeAfterComparisonToolsTests</c> exercising production code directly instead of
/// re-deriving its logic.
/// </summary>
public class TestOrderGenerationToolsTests
{
    // ---- fixtures -----------------------------------------------------------------

    private const string DescriptionSentinel = "SENTINEL-DESCRICAO-7f3a";
    private const string MetafieldSentinel = "SENTINEL-METAFIELD-9c1b";
    private const string GeneratedPropertySentinel = "SENTINEL-GENERATED-4e2d";

    private static ProductCatalogContent ProductWithSentinels() => new(
        Id: "gid://shopify/Product/aurora-nc7",
        Handle: "aurora-nc7",
        Title: "Aurora NC7",
        DescriptionHtml: $"Descrição solta contendo o segredo {DescriptionSentinel}, sem estrutura nenhuma.",
        Vendor: "Marca Aurora",
        ProductType: "Fone Bluetooth",
        Status: "ACTIVE",
        Tags: [],
        OnlineStoreUrl: null,
        Options: [],
        Variants: [new ProductVariantContent("v1", "Padrão", "SKU-1", "289.90", true, 10, [])],
        Metafields: [new ProductMetafieldContent("custom", "nota_interna", MetafieldSentinel, "single_line_text_field")],
        HasSchemaOrgMarkup: false,
        GeneratedProperties: [new GeneratedAdditionalProperty("Observação", GeneratedPropertySentinel, "description")]);

    // Canned AI Gateway completion: 4 orders spanning 3 distinct axes (contraste x2,
    // requisito-em-prosa, restritivo) with one ExpectsValidMatch == false — a batch
    // that satisfies GenerateTestOrders' own default count (4) and validation rules,
    // so the "happy path" tests below don't also have to fight ValidateOrderBatch.
    private const string CannedOrdersJson = """
        {
          "orders": [
            {
              "order": "quero um fone bluetooth com cancelamento de ruído ativo, até uns 300 reais",
              "expectsValidMatch": true,
              "constraintAxis": "contraste",
              "rationale": "deve vencer o produto com ANC ativo do lote"
            },
            {
              "order": "procuro um fone sem cancelamento de ruído nenhum, não curto esse recurso",
              "expectsValidMatch": true,
              "constraintAxis": "contraste",
              "rationale": "deve vencer o produto sem ANC, provando que a rejeição do pedido anterior foi do requisito"
            },
            {
              "order": "queria algo bom pra ouvir música o dia inteiro sem cansar o ouvido, sabe?",
              "expectsValidMatch": true,
              "constraintAxis": "requisito-em-prosa",
              "rationale": "conforto para uso prolongado não é campo estruturado em lugar nenhum"
            },
            {
              "order": "só aceito um fone com autonomia de bateria de pelo menos 200 horas",
              "expectsValidMatch": false,
              "constraintAxis": "restritivo",
              "rationale": "nenhum produto do catálogo atende esse mínimo — controle deliberado"
            }
          ]
        }
        """;

    private static string BuildCannedCompletionResponseBody(string content) =>
        JsonSerializer.Serialize(new
        {
            id = "cmpl-test",
            model = "anthropic/claude-sonnet-5",
            choices = new[]
            {
                new { message = new { role = "assistant", content }, finish_reason = "stop" },
            },
        });

    // Records every outgoing request (URI + body) and always answers with the same
    // canned OpenAI-shaped completion body — see AiGatewayCompletionResponse in
    // Infrastructure/AiGatewayClient.cs for the envelope this fakes. Fully offline:
    // no request ever leaves the process.
    private sealed class RecordingHandler(string responseBody) : HttpMessageHandler
    {
        public List<(Uri? RequestUri, string Body)> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            Requests.Add((request.RequestUri, body));

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            };
        }
    }

    private static (TestOrderGenerationTools Tool, RecordingHandler Handler) BuildToolWithCannedResponse(
        string cannedOrdersJson)
    {
        var handler = new RecordingHandler(BuildCannedCompletionResponseBody(cannedOrdersJson));
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://fake.invalid/") };
        var aiGatewayClient = new AiGatewayClient(httpClient);
        var aiGatewayOptions = new AiGatewayOptions("anthropic/claude-sonnet-5");

        return (new TestOrderGenerationTools(aiGatewayClient, aiGatewayOptions), handler);
    }

    // ---- 1. no description reaches the model (the ticket's key criterion) ---------

    [Fact]
    public async Task GenerateTestOrders_NeverSendsProductDescriptionMetafieldOrGeneratedPropertyValuesToTheModel()
    {
        var (tool, handler) = BuildToolWithCannedResponse(CannedOrdersJson);
        var catalog = new List<ProductCatalogContent> { ProductWithSentinels() };

        await tool.GenerateTestOrders(catalog, count: null, CancellationToken.None);

        var request = Assert.Single(handler.Requests);

        // None of the three sentinels — planted in DescriptionHtml, a metafield value
        // and a GeneratedProperties entry — may appear anywhere in the request body
        // sent to the AI Gateway.
        Assert.DoesNotContain(DescriptionSentinel, request.Body, StringComparison.Ordinal);
        Assert.DoesNotContain(MetafieldSentinel, request.Body, StringComparison.Ordinal);
        Assert.DoesNotContain(GeneratedPropertySentinel, request.Body, StringComparison.Ordinal);

        // The assertion above isn't vacuous: the aggregate fields (title, product
        // type) genuinely did go through.
        Assert.Contains("Aurora NC7", request.Body, StringComparison.Ordinal);
        Assert.Contains("Fone Bluetooth", request.Body, StringComparison.Ordinal);
    }

    // ---- 2. one LLM call for N orders ----------------------------------------------

    [Fact]
    public async Task GenerateTestOrders_MakesExactlyOneAiGatewayCall_RegardlessOfHowManyOrdersComeBack()
    {
        var (tool, handler) = BuildToolWithCannedResponse(CannedOrdersJson);
        var catalog = new List<ProductCatalogContent> { ProductWithSentinels() };

        var result = await tool.GenerateTestOrders(catalog, count: null, CancellationToken.None);

        Assert.Single(handler.Requests);
        Assert.True(result.Orders.Count >= 3);
    }

    // ---- 3. SummarizeCatalog --------------------------------------------------------

    private static ProductCatalogContent Minimal(
        string id, string title, string? productType, string? vendor, params string?[] prices) => new(
        Id: id,
        Handle: id,
        Title: title,
        DescriptionHtml: null,
        Vendor: vendor,
        ProductType: productType,
        Status: "ACTIVE",
        Tags: [],
        OnlineStoreUrl: null,
        Options: [],
        Variants: [.. prices.Select((p, i) => new ProductVariantContent($"v{i}", "Padrão", null, p, true, null, []))],
        Metafields: [],
        HasSchemaOrgMarkup: false,
        GeneratedProperties: []);

    [Fact]
    public void SummarizeCatalog_DistinctsProductTypesAndVendorsCaseInsensitively_SkippingBlank()
    {
        var catalog = new List<ProductCatalogContent>
        {
            Minimal("1", "A", "Fone Bluetooth", "Marca X"),
            Minimal("2", "B", "fone bluetooth", "marca x"), // same as above, different case
            Minimal("3", "C", "Tênis de Corrida", null),
            Minimal("4", "D", "  ", "   "), // blank — skipped
        };

        var summary = TestOrderGenerationTools.SummarizeCatalog(catalog);

        Assert.Equal(4, summary.ProductCount);
        Assert.Equal(["Fone Bluetooth", "Tênis de Corrida"], summary.ProductTypes);
        Assert.Equal(["Marca X"], summary.Vendors);
    }

    [Fact]
    public void SummarizeCatalog_DerivesPriceRangeFromVariants_IgnoringUnparseablePrices()
    {
        var catalog = new List<ProductCatalogContent>
        {
            Minimal("1", "A", "Fone", "Marca", "100.00", "not-a-price"),
            Minimal("2", "B", "Fone", "Marca", "50.00", "300.00"),
        };

        var summary = TestOrderGenerationTools.SummarizeCatalog(catalog);

        Assert.Equal(50.00m, summary.MinPrice);
        Assert.Equal(300.00m, summary.MaxPrice);
    }

    [Fact]
    public void SummarizeCatalog_NoParseablePriceAnywhere_LeavesBothPriceBoundsNull()
    {
        var catalog = new List<ProductCatalogContent>
        {
            Minimal("1", "A", "Fone", "Marca", "not-a-price", null),
        };

        var summary = TestOrderGenerationTools.SummarizeCatalog(catalog);

        Assert.Null(summary.MinPrice);
        Assert.Null(summary.MaxPrice);
    }

    [Fact]
    public void SummarizeCatalog_TitlesPassThroughAsIs_TheTicketExplicitlyAllowsThem()
    {
        var catalog = new List<ProductCatalogContent>
        {
            Minimal("1", "Aurora NC7", "Fone", "Marca"),
            Minimal("2", "Corvo Sport 2", "Fone", "Marca"),
        };

        var summary = TestOrderGenerationTools.SummarizeCatalog(catalog);

        Assert.Equal(["Aurora NC7", "Corvo Sport 2"], summary.Titles);
    }

    // ---- 4. BuildOrderGenerationPrompt ----------------------------------------------

    [Fact]
    public void BuildOrderGenerationPrompt_RendersCountAndAggregateFields_NothingElse()
    {
        var summary = new CatalogSummary(
            ProductCount: 2,
            ProductTypes: ["Fone Bluetooth"],
            Vendors: ["Marca Aurora"],
            Titles: ["Aurora NC7", "Corvo Sport 2"],
            MinPrice: 189.90m,
            MaxPrice: 289.90m);

        var prompt = TestOrderGenerationTools.BuildOrderGenerationPrompt(summary, count: 5);

        Assert.Contains("5", prompt, StringComparison.Ordinal);
        Assert.Contains("Fone Bluetooth", prompt, StringComparison.Ordinal);
        Assert.Contains("Marca Aurora", prompt, StringComparison.Ordinal);
        Assert.Contains("Aurora NC7", prompt, StringComparison.Ordinal);
        Assert.Contains("189.90", prompt, StringComparison.Ordinal);
        Assert.Contains("289.90", prompt, StringComparison.Ordinal);
    }

    // ---- 5. parse + validation -------------------------------------------------------

    [Fact]
    public void ParseTestOrders_ValidPayload_RoundTripsFieldsExactly()
    {
        var orders = TestOrderGenerationTools.ParseTestOrders(CannedOrdersJson);

        Assert.Equal(4, orders.Count);
        Assert.Equal(
            "quero um fone bluetooth com cancelamento de ruído ativo, até uns 300 reais", orders[0].Order);
        Assert.True(orders[0].ExpectsValidMatch);
        Assert.Equal("contraste", orders[0].ConstraintAxis);
        Assert.False(orders[3].ExpectsValidMatch);
        Assert.Equal("restritivo", orders[3].ConstraintAxis);
    }

    [Fact]
    public void ParseTestOrders_UnknownConstraintAxis_ThrowsMcpException()
    {
        const string json = """
            { "orders": [
                { "order": "algo", "expectsValidMatch": true, "constraintAxis": "eixo-inventado", "rationale": "x" }
            ] }
            """;

        Assert.Throws<ModelContextProtocol.McpException>(() => TestOrderGenerationTools.ParseTestOrders(json));
    }

    [Fact]
    public void ParseTestOrders_ConstraintAxisWithDifferentCasingOrPadding_IsNormalizedNotRejected()
    {
        // Casing/whitespace variance is representation noise on a closed vocabulary —
        // rejecting it would fail a whole batch (and cost another LLM call) over
        // something that carries no information.
        const string json = """
            { "orders": [
                { "order": "algo", "expectsValidMatch": true, "constraintAxis": "Contraste", "rationale": "x" },
                { "order": "outra", "expectsValidMatch": false, "constraintAxis": " requisito-em-prosa ", "rationale": "y" }
            ] }
            """;

        var orders = TestOrderGenerationTools.ParseTestOrders(json);

        Assert.Equal(TestOrderGenerationTools.AxisContraste, orders[0].ConstraintAxis);
        Assert.Equal(TestOrderGenerationTools.AxisRequisitoEmProsa, orders[1].ConstraintAxis);
    }

    [Fact]
    public void ParseTestOrders_MissingExpectsValidMatch_ThrowsInsteadOfDefaultingToFalse()
    {
        // Defaulting a missing field to false would invent the rule-2 control ("ao menos
        // um espera não ter resposta válida") out of nothing, letting ValidateOrderBatch
        // pass vacuously on a batch the model never actually declared a control for.
        const string json = """
            { "orders": [
                { "order": "algo", "constraintAxis": "contraste", "rationale": "x" }
            ] }
            """;

        Assert.Throws<ModelContextProtocol.McpException>(() => TestOrderGenerationTools.ParseTestOrders(json));
    }

    [Fact]
    public void ParseTestOrders_BlankOrderText_ThrowsMcpException()
    {
        const string json = """
            { "orders": [
                { "order": "   ", "expectsValidMatch": true, "constraintAxis": "contraste", "rationale": "x" }
            ] }
            """;

        Assert.Throws<ModelContextProtocol.McpException>(() => TestOrderGenerationTools.ParseTestOrders(json));
    }

    private static GeneratedTestOrder Order(string axis, bool expectsValidMatch) =>
        new($"pedido eixo {axis}", expectsValidMatch, axis, "razão");

    [Fact]
    public void ValidateOrderBatch_EveryOrderExpectsAMatch_ThrowsMcpException()
    {
        var orders = new List<GeneratedTestOrder>
        {
            Order(TestOrderGenerationTools.AxisContraste, true),
            Order(TestOrderGenerationTools.AxisRequisitoEmProsa, true),
            Order(TestOrderGenerationTools.AxisPoucasRestricoes, true),
        };

        Assert.Throws<ModelContextProtocol.McpException>(
            () => TestOrderGenerationTools.ValidateOrderBatch(orders, count: 3));
    }

    [Fact]
    public void ValidateOrderBatch_TooFewDistinctAxes_ThrowsMcpException()
    {
        var orders = new List<GeneratedTestOrder>
        {
            Order(TestOrderGenerationTools.AxisContraste, true),
            Order(TestOrderGenerationTools.AxisContraste, true),
            Order(TestOrderGenerationTools.AxisContraste, false),
        };

        Assert.Throws<ModelContextProtocol.McpException>(
            () => TestOrderGenerationTools.ValidateOrderBatch(orders, count: 3));
    }

    [Fact]
    public void ValidateOrderBatch_FewerOrdersThanRequested_ThrowsMcpException()
    {
        var orders = new List<GeneratedTestOrder>
        {
            Order(TestOrderGenerationTools.AxisContraste, true),
            Order(TestOrderGenerationTools.AxisRestritivo, false),
        };

        var ex = Assert.Throws<ModelContextProtocol.McpException>(
            () => TestOrderGenerationTools.ValidateOrderBatch(orders, count: 4));

        Assert.Contains("2", ex.Message, StringComparison.Ordinal);
        Assert.Contains("4", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateOrderBatch_MoreOrdersThanRequested_IsTrimmedToCount_NotAnError()
    {
        var orders = new List<GeneratedTestOrder>
        {
            Order(TestOrderGenerationTools.AxisContraste, true),
            Order(TestOrderGenerationTools.AxisRequisitoEmProsa, true),
            Order(TestOrderGenerationTools.AxisPoucasRestricoes, true),
            Order(TestOrderGenerationTools.AxisRestritivo, false),
            Order(TestOrderGenerationTools.AxisRestritivo, false),
        };

        var result = TestOrderGenerationTools.ValidateOrderBatch(orders, count: 4);

        Assert.Equal(4, result.Count);
    }

    // ---- 6. feeds the downstream tools -----------------------------------------------

    [Fact]
    public async Task GeneratedTestOrder_Order_IsAssignableDirectlyToNaturalLanguageOrder()
    {
        var (tool, _) = BuildToolWithCannedResponse(CannedOrdersJson);
        var result = await tool.GenerateTestOrders(
            [ProductWithSentinels()], count: null, CancellationToken.None);

        // Compile-checked assertion (mirrors CatalogReadToolsTests'
        // AssembleCatalog_ProducesTheSameShapeGetProductContentReturns): this line only
        // compiles if GeneratedTestOrder.Order is a plain string assignable straight
        // into simulate_buyer_agent/compare_buyer_agent_rounds' naturalLanguageOrder
        // parameter — the compiler is the assertion, nothing to run at test time.
        string naturalLanguageOrder = result.Orders[0].Order;

        Assert.False(string.IsNullOrWhiteSpace(naturalLanguageOrder));
    }

    // ---- 7. axis-spread contract on a parsed batch ------------------------------------

    [Fact]
    public void ParsedBatch_HasDistinctAxesAcrossTheBatch_AndAtLeastOneOrderExpectingNoMatch()
    {
        var orders = TestOrderGenerationTools.ParseTestOrders(CannedOrdersJson);

        // Three, not "more than one": rule 3 names exactly three axes of purpose, and
        // that's the threshold ValidateOrderBatch enforces for any batch of 3+.
        var distinctAxes = orders.Select(o => o.ConstraintAxis).Distinct().Count();
        Assert.True(distinctAxes >= 3, $"esperados ao menos 3 eixos distintos, veio {distinctAxes}");
        Assert.Contains(orders, o => !o.ExpectsValidMatch);
    }
}
