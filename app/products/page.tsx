import { AppShell } from "@/components/app-shell";
import { MetricStrip } from "@/components/metric-strip";
import { ProductGrid } from "@/components/product-grid";
import { getDashboardData } from "@/lib/data";
import { currency, number, percent } from "@/lib/format";
import type { Kpi } from "@/lib/types";

export default async function ProductsPage() {
  const data = await getDashboardData();
  const insights = data.shopifyInsights;
  const productCount = insights?.totalProducts ?? data.products.length;
  const activeCount = insights?.activeProducts ?? data.products.filter((product) => product.status === "active").length;
  const outOfStockCount = insights?.outOfStockProducts ?? data.products.filter((product) => product.inventoryQty <= 0).length;

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Shopify monitor</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Shopify</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#65676b]">
            Store sales, order signal, inventory health, and product readiness for the next ads cycle.
          </p>
        </section>

        <MetricStrip kpis={getShopifyKpis(insights)} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <InsightCard label="Product catalog" value={`${number(activeCount)} active`} helper={`${number(productCount)} total products`} />
          <InsightCard label="Inventory units" value={number(insights?.totalInventory ?? 0)} helper={`${number(outOfStockCount)} products out of stock`} />
          <InsightCard
            label="Data status"
            value={insights?.sessions30d ? "Analytics connected" : "Sales connected"}
            helper={insights?.sessions30d ? "Sessions and CVR are live" : "Sessions and CVR need analytics connection"}
          />
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold">Products</h2>
              <p className="text-sm text-[#65676b]">Ranked by Shopify sales signal, stock, and ad readiness.</p>
            </div>
            <span className="text-xs font-semibold text-[#6d28d9]">{number(data.products.length)} products loaded</span>
          </div>
          <ProductGrid products={data.products} recommendations={data.recommendations} />
        </section>
      </div>
    </AppShell>
  );
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
      helper: `${number(insights.unitsSold30d)} units sold`,
      tone: insights.revenue30d > 0 ? "good" : "neutral"
    },
    {
      label: "Orders 30d",
      value: number(insights.orders30d),
      helper: "Pulled from Shopify orders",
      tone: insights.orders30d > 0 ? "good" : "neutral"
    },
    {
      label: "Sessions 30d",
      value: number(insights.sessions30d),
      helper: insights.sessions30d > 0 ? "From store analytics" : "Connect analytics for sessions",
      tone: insights.sessions30d > 0 ? "good" : "neutral"
    },
    {
      label: "Conversion Rate",
      value: percent(insights.conversionRate, 2),
      helper: insights.sessions30d > 0 ? "Orders divided by sessions" : "Waiting for sessions data",
      tone: insights.conversionRate > 0.01 ? "good" : "neutral"
    }
  ];
}

function InsightCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-[#6f6b78]">{label}</div>
      <div className="mono mt-2 text-2xl font-bold tracking-[-0.02em] text-[#111014]">{value}</div>
      <div className="mt-2 text-xs font-semibold text-[#6d28d9]">{helper}</div>
    </div>
  );
}
