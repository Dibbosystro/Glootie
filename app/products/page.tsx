import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MetricStrip } from "@/components/metric-strip";
import { RecommendationPill } from "@/components/status-pill";
import { getDashboardData } from "@/lib/data";
import { currency, number, percent } from "@/lib/format";
import type { Kpi, Product, Recommendation, RecommendationState } from "@/lib/types";

type Verdict = "all" | RecommendationState;
type SortKey = "revenue" | "stock" | "name";

const verdictOrder: RecommendationState[] = ["scale", "test", "hold", "fix_first", "do_not_advertise"];

const verdictLabel: Record<Verdict, string> = {
  all: "All",
  scale: "Advertise this",
  test: "Test next",
  hold: "Hold",
  fix_first: "Fix first",
  do_not_advertise: "Do not advertise"
};

type Row = { product: Product; rec?: Recommendation };

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ verdict?: string | string[]; sort?: string | string[] }> }) {
  const data = await getDashboardData();
  const insights = data.shopifyInsights;
  const productCount = insights?.totalProducts ?? data.products.length;
  const activeCount = insights?.activeProducts ?? data.products.filter((product) => product.status === "active").length;
  const outOfStockCount = insights?.outOfStockProducts ?? data.products.filter((product) => product.inventoryQty <= 0).length;

  const params = await searchParams;
  const verdict = parseVerdict(params?.verdict);
  const sort = parseSort(params?.sort);

  const recByProduct = new Map(data.recommendations.map((rec) => [rec.productId, rec]));
  const onlineProducts = data.products.filter((product) => product.status === "active");
  const onlineRows: Row[] = onlineProducts.map((product) => ({ product, rec: recByProduct.get(product.id) }));
  const counts = countByVerdict(onlineRows);
  const filteredRows = verdict === "all" ? onlineRows : onlineRows.filter((row) => row.rec?.state === verdict);
  const sortedRows = sortRows(filteredRows, sort);

  const draftProducts = [...data.products]
    .filter((product) => product.status === "draft")
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <AppShell data={data}>
      <div className="space-y-6">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Shopify monitor</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-[#1c1917]">Shopify</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#57534e]">Store sales, order signal, inventory health, and product readiness for the next ads cycle.</p>
        </section>

        <MetricStrip kpis={getShopifyKpis(insights)} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InsightCard label="Product catalog" value={`${number(activeCount)} active`} helper={`${number(productCount)} total products`} />
          <InsightCard label="Inventory units" value={number(insights?.totalInventory ?? 0)} helper={`${number(outOfStockCount)} products out of stock`} />
          <InsightCard
            label="Data status"
            value={insights?.sessions30d ? "Analytics connected" : "Sales connected"}
            helper={insights?.sessions30d ? "Sessions and CVR are live" : "Sessions and CVR coming soon"}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Online products</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#1c1917]">Active in Shopify</h2>
              <p className="mt-1 text-sm text-[#57534e]">Filter by ad verdict, sort by revenue, stock, or name.</p>
            </div>
            <SortToggle selected={sort} verdict={verdict} />
          </div>

          <VerdictFilter selected={verdict} counts={counts} total={onlineRows.length} sort={sort} />

          <div className="space-y-2">
            {sortedRows.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[#57534e]">No online products match this filter.</div>
            ) : (
              sortedRows.map(({ product, rec }) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="card flex items-center gap-4 p-3 transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[#1c1917]">{product.title}</h3>
                      {rec && <RecommendationPill state={rec.state} />}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#57534e]">{product.productType || "Uncategorised"} · {product.vendor || "No vendor"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#78716c]">
                      <span>{currency(product.price)} price</span>
                      <span>{number(product.inventoryQty)} in stock</span>
                      <span>{currency(product.revenue30d)} 30d revenue</span>
                      <span>{percent(product.conversionRate, 2)} CVR</span>
                    </div>
                  </div>
                  <div className="hidden flex-col items-end text-right sm:flex">
                    <div className="mono text-lg font-bold text-[#1c1917]">{number(product.unitsSold30d)}</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#78716c]">units 30d</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Drafts</p>
              <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[#1c1917]">Draft products in Shopify</h2>
              <p className="mt-1 text-sm text-[#57534e]">Not yet published. Excluded from ad recommendations until they go live.</p>
            </div>
            <span className="mono rounded-full bg-[#e7e5e4] px-3 py-1 text-xs font-bold text-[#44403c]">{draftProducts.length}</span>
          </div>

          <div className="space-y-2">
            {draftProducts.length === 0 ? (
              <div className="card p-6 text-center text-sm text-[#57534e]">No draft products in Shopify.</div>
            ) : (
              draftProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="card flex items-center gap-4 p-3 transition hover:border-[#fbbf24] hover:bg-[#fffbeb]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[#1c1917]">{product.title}</h3>
                      <span className="inline-flex shrink-0 justify-center rounded-full bg-[#e7e5e4] px-2.5 py-1 text-xs font-bold text-[#44403c]">Draft</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#57534e]">{product.productType || "Uncategorised"} · {product.vendor || "No vendor"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#78716c]">
                      <span>{currency(product.price)} price</span>
                      <span>{number(product.inventoryQty)} in stock</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function VerdictFilter({ selected, counts, total, sort }: { selected: Verdict; counts: Record<RecommendationState, number>; total: number; sort: SortKey }) {
  const options: Verdict[] = ["all", ...verdictOrder];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected === option;
        const count = option === "all" ? total : counts[option];
        return (
          <Link
            key={option}
            href={productsHref(option, sort)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active ? "border-[#1c1917] bg-[#1c1917] text-white" : "border-[#d6d3d1] bg-white text-[#44403c] hover:border-[#fbbf24] hover:bg-[#fef3c7]"
            }`}
          >
            <span>{verdictLabel[option]}</span>
            <span className={`mono rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/15 text-white" : "bg-[#f5f5f4] text-[#b45309]"}`}>{count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SortToggle({ selected, verdict }: { selected: SortKey; verdict: Verdict }) {
  const options: Array<{ key: SortKey; label: string }> = [
    { key: "revenue", label: "Revenue" },
    { key: "stock", label: "Stock" },
    { key: "name", label: "Name" }
  ];
  return (
    <div className="inline-flex rounded-full border border-[#d6d3d1] bg-white p-0.5 text-xs">
      {options.map((option) => {
        const active = selected === option.key;
        return (
          <Link
            key={option.key}
            href={productsHref(verdict, option.key)}
            className={`rounded-full px-3 py-1.5 transition ${active ? "bg-[#1c1917] font-semibold text-white" : "text-[#57534e] hover:bg-[#f5f5f4]"}`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function parseVerdict(value: string | string[] | undefined): Verdict {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (verdictOrder as string[]).includes(raw)) return raw as RecommendationState;
  return "all";
}

function parseSort(value: string | string[] | undefined): SortKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "stock" || raw === "name") return raw;
  return "revenue";
}

function productsHref(verdict: Verdict, sort: SortKey) {
  const params = new URLSearchParams();
  if (verdict !== "all") params.set("verdict", verdict);
  if (sort !== "revenue") params.set("sort", sort);
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function countByVerdict(rows: Row[]): Record<RecommendationState, number> {
  const tally: Record<RecommendationState, number> = {
    scale: 0,
    test: 0,
    hold: 0,
    fix_first: 0,
    do_not_advertise: 0
  };
  for (const row of rows) {
    if (row.rec) tally[row.rec.state] += 1;
  }
  return tally;
}

function sortRows(rows: Row[], sort: SortKey): Row[] {
  const copy = [...rows];
  if (sort === "name") {
    copy.sort((a, b) => a.product.title.localeCompare(b.product.title));
    return copy;
  }
  if (sort === "stock") {
    copy.sort((a, b) => b.product.inventoryQty - a.product.inventoryQty);
    return copy;
  }
  copy.sort((a, b) => b.product.revenue30d - a.product.revenue30d);
  return copy;
}

function getShopifyKpis(insights = {
  revenue30d: 0,
  orders30d: 0,
  unitsSold30d: 0,
  sessions30d: 0,
  conversionRate: 0,
  activeProducts: 0,
  totalProducts: 0,
  totalInventory: 0,
  outOfStockProducts: 0
}): Kpi[] {
  return [
    {
      label: "Sales 30d",
      value: currency(insights.revenue30d),
      helper: `${number(insights.unitsSold30d)} units. Σ (price × qty − discount), excludes tax and shipping, may differ from Shopify total`,
      tone: insights.revenue30d > 0 ? "good" : "neutral"
    },
    {
      label: "Orders 30d",
      value: number(insights.orders30d),
      helper: "Pulled from Shopify orders, last 30 days",
      tone: insights.orders30d > 0 ? "good" : "neutral"
    },
    {
      label: "Sessions 30d",
      value: number(insights.sessions30d),
      helper: insights.sessions30d > 0 ? "From store analytics" : "Coming soon, analytics integration in progress",
      tone: insights.sessions30d > 0 ? "good" : "neutral"
    },
    {
      label: "Conversion Rate",
      value: percent(insights.conversionRate, 2),
      helper: insights.sessions30d > 0 ? "Orders divided by sessions" : "Coming soon with analytics integration",
      tone: insights.conversionRate > 0.01 ? "good" : "neutral"
    }
  ];
}

function InsightCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="card p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">{label}</div>
      <div className="mono mt-2 text-2xl font-bold tracking-[-0.02em] text-[#1c1917]">{value}</div>
      <div className="mt-2 text-xs font-semibold text-[#b45309]">{helper}</div>
    </div>
  );
}
