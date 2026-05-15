import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, PauseCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricStrip } from "@/components/metric-strip";
import { RecommendationPill } from "@/components/status-pill";
import { CampaignPerformance } from "@/components/campaign-performance";
import { SyncButton } from "@/components/sync-button";
import { getDashboardData, getOverviewKpis } from "@/lib/data";
import { currency, number as formatNumber, percent, roas } from "@/lib/format";
import type { AdCampaign, DashboardData, Product, Recommendation } from "@/lib/types";

type Channel = "all" | "meta" | "google";
type PieSegment = {
  label: string;
  value: number;
  color: string;
};

export default async function OverviewPage({ searchParams }: { searchParams?: Promise<{ channel?: string | string[] }> }) {
  const data = await getDashboardData();
  const params = await searchParams;
  const channel = parseChannel(params?.channel);
  const channelView = getChannelView(data, channel);
  const viewData = { ...data, campaigns: channelView.campaigns };
  const kpis = getChannelKpis(viewData, channel, channelView.stale);
  const scaleRecs = data.recommendations.filter((rec) => rec.state === "scale" || rec.state === "test");
  const blockedRecs = data.recommendations.filter((rec) => rec.state === "do_not_advertise" || rec.state === "fix_first" || rec.state === "hold");
  const profitablePaused = channelView.campaigns.filter((campaign) => campaign.delivery !== "active" && campaign.revenue30d / Math.max(campaign.spend30d, 1) >= 2.5);
  const revenue = channelView.campaigns.reduce((sum, campaign) => sum + campaign.revenue30d, 0);
  const spend = channelView.campaigns.reduce((sum, campaign) => sum + campaign.spend30d, 0);
  const topProducts = [...data.products].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 4);

  return (
    <AppShell data={data}>
      <div className="space-y-4">
        <section className="flex flex-col gap-3 pt-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">{data.client.name}</p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#1c1917]">Performance overview</h1>
            <p className="mt-1 text-sm text-[#57534e]">Here is what is selling, spending, and ready for ads today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChannelToggle selected={channel} data={data} />
            <SyncButton source="all" label="Recompute" appearance="primary-pill" />
          </div>
        </section>

        <MetricStrip kpis={kpis} />

        <CampaignPerformance campaigns={channelView.campaigns} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-[#57534e]">{channelView.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${channelView.stale ? "bg-[#fef3c7] text-[#b45309]" : "bg-emerald-50 text-emerald-700"}`}>
                      {channelView.stale ? "Stale view" : "Live view"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <div className="mono text-[28px] font-bold tracking-[-0.03em] text-[#1c1917]">{currency(revenue, data.client.currency)}</div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{roas(revenue / Math.max(spend, 1))}</span>
                    <span className="text-[11px] text-[#78716c]">with {currency(spend, data.client.currency)} ad spend · {channelView.helper}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#57534e]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Revenue
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#b45309]" />
                    Ad spend
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <AdsSalesChart channel={channel} stale={channelView.stale} />
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Top products</div>
                  <h2 className="mt-1 text-base font-bold text-[#1c1917]">By product signal</h2>
                  <p className="text-[11px] text-[#78716c]">Last 30 days</p>
                </div>
                <Link href="/products" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
                  View all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-4 space-y-2.5">
                {topProducts.map((product, index) => (
                  <TopProductRow key={product.id} product={product} index={index} maxRevenue={topProducts[0]?.revenue30d || 1} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ShopifySalesSessionCard data={data} />
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Needs attention</div>
                  <h2 className="mt-1 text-base font-bold text-[#1c1917]">Open items</h2>
                </div>
                <span className="mono rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-bold text-[#b45309]">{blockedRecs.length + profitablePaused.length}</span>
              </div>
              <div className="mt-4 space-y-2.5">
                <AttentionItem
                  icon={<PauseCircle className="h-4 w-4" />}
                  tone="warn"
                  title={`${profitablePaused.length} profitable campaign is not active`}
                  body="CRG Sales is profitable, but delivery is inactive. Reactivate carefully with fresh creative."
                />
                <AttentionItem
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tone="bad"
                  title={`${blockedRecs.length} products should not receive spend yet`}
                  body="Inventory, page, or conversion checks should be fixed before traffic is sent."
                />
                <AttentionItem
                  icon={<Check className="h-4 w-4" />}
                  tone="good"
                  title="Shopify monitor is ready"
                  body="Products, price, inventory, status, and images update when credentials are added."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Ad opportunities</h2>
                <p className="text-[11px] text-[#57534e]">Clear product moves for the next ads cycle.</p>
              </div>
              <Link href="/opportunities" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
                Open
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {scaleRecs.slice(0, 2).map((rec) => (
                <OpportunityCard key={rec.id} recommendation={rec} product={data.products.find((product) => product.id === rec.productId)} />
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold">Channel split</h2>
            <div className="mt-4 space-y-2.5">
              {(["meta", "google_ads"] as const).map((source) => {
                const campaigns = data.campaigns.filter((campaign) => campaign.source === source);
                const sourceSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend30d, 0);
                const sourceRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue30d, 0);
                const href = source === "meta" ? "/ads/meta" : "/ads/google";
                return (
                  <Link key={source} href={href} className="flex items-center gap-3 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] px-3 py-3 hover:border-[#fbbf24] hover:bg-[#fef3c7]">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#b45309] text-xs font-black text-white">
                      {source === "meta" ? "M" : "G"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{source === "meta" ? "Meta Ads" : "Google Ads"}</div>
                      <div className="text-[11px] text-[#57534e]">{currency(sourceSpend, data.client.currency)} spent</div>
                    </div>
                    <div className="mono text-sm font-bold text-emerald-700">{roas(sourceRevenue / Math.max(sourceSpend, 1))}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ShopifySalesSessionCard({ data }: { data: DashboardData }) {
  const insights = data.shopifyInsights;
  const revenue = insights?.revenue30d ?? data.products.reduce((sum, product) => sum + product.revenue30d, 0);
  const sessions = insights?.sessions30d ?? data.products.reduce((sum, product) => sum + product.sessions30d, 0);
  const orders = insights?.orders30d ?? data.products.reduce((sum, product) => sum + product.unitsSold30d, 0);
  const salesSegments = buildProductSegments(data.products, "revenue30d");
  const sessionSegments = buildProductSegments(data.products, "sessions30d");
  const salesTotal = salesSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#78716c]">Shopify signal</div>
          <h2 className="mt-1 text-base font-bold text-[#1c1917]">Sales and sessions</h2>
          <p className="text-[11px] text-[#78716c]">Last 30 days</p>
        </div>
        <Link href="/products" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b45309]">
          Open
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatBlock
          label="Sales"
          value={currency(revenue, data.client.currency)}
          sub={`${formatNumber(orders)} orders`}
        />
        <StatBlock
          label="Sessions"
          value={sessions > 0 ? formatNumber(sessions) : "—"}
          sub={sessions > 0 ? `${percent(orders / Math.max(sessions, 1), 2)} order rate` : "Coming soon"}
          dim={sessions === 0}
        />
      </div>

      {salesTotal > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#78716c]">Top sales sources</div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#e7e5e4]">
            {salesSegments.map((segment) => (
              <span key={segment.label} style={{ width: `${(segment.value / salesTotal) * 100}%`, background: segment.color }} />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {salesSegments.slice(0, 3).map((segment) => (
              <li key={segment.label} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: segment.color }} />
                <span className="min-w-0 flex-1 truncate text-[#1c1917]">{segment.label}</span>
                <span className="mono shrink-0 font-bold text-[#57534e]">{percent(segment.value / salesTotal, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-[#d6d3d1] px-3 py-3 text-[11px] text-[#78716c]">
          Waiting for Shopify orders.
        </div>
      )}

      <div className="mt-4 border-t border-[#e7e5e4] pt-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#78716c]">Top session sources</div>
        {sessionSegments.length > 0 ? (
          <ul className="space-y-1.5">
            {sessionSegments.slice(0, 3).map((segment) => (
              <li key={segment.label} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: segment.color }} />
                <span className="min-w-0 flex-1 truncate text-[#1c1917]">{segment.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-[#78716c]">Coming soon, analytics integration in progress.</p>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub, dim }: { label: string; value: string; sub: string; dim?: boolean }) {
  return (
    <div className="rounded-lg border border-[#e7e5e4] bg-[#fafaf9] p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#78716c]">{label}</div>
      <div className={`mono mt-2 text-xl font-bold leading-none tracking-[-0.02em] ${dim ? "text-[#a8a29e]" : "text-[#1c1917]"}`}>{value}</div>
      <div className="mt-1.5 text-[11px] text-[#57534e]">{sub}</div>
    </div>
  );
}

function buildProductSegments(products: Product[], metric: "revenue30d" | "sessions30d"): PieSegment[] {
  const colors = ["#15803d", "#b45309", "#1c1917", "#fcd34d"];
  const sorted = [...products]
    .filter((product) => product[metric] > 0)
    .sort((a, b) => b[metric] - a[metric]);

  const top = sorted.slice(0, 3).map((product, index) => ({
    label: product.title,
    value: product[metric],
    color: colors[index]
  }));

  const other = sorted.slice(3).reduce((sum, product) => sum + product[metric], 0);
  if (other > 0) top.push({ label: "Other products", value: other, color: colors[3] });
  return top;
}

function ChannelToggle({ selected, data }: { selected: Channel; data: DashboardData }) {
  const options: Array<{ channel: Channel; label: string; href: string }> = [
    { channel: "all", label: "All", href: overviewHref("all") },
    { channel: "meta", label: "Meta", href: overviewHref("meta") },
    { channel: "google", label: "Google", href: overviewHref("google") }
  ];

  return (
    <div className="inline-flex rounded-full border border-[#d6d3d1] bg-white p-0.5 text-xs shadow-sm">
      {options.map((option) => {
        const active = selected === option.channel;
        const stale = getChannelView(data, option.channel).stale;
        return (
          <Link
            key={option.channel}
            href={option.href}
            className={`rounded-full px-3 py-1.5 font-semibold transition ${
              active ? "bg-[#1c1917] text-white" : stale ? "text-[#b45309] hover:bg-[#fef3c7]" : "text-[#57534e] hover:bg-[#f5f5f4]"
            }`}
            title={stale ? `${option.label} is showing stale/demo data` : `${option.label} is connected`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function AttentionItem({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: "good" | "warn" | "bad" }) {
  const toneClass = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-[#fef3c7] text-[#b45309]",
    bad: "bg-[#fef3c7] text-[#b45309]"
  };
  return (
    <div className="flex gap-3 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{title}</div>
        <p className="mt-1 text-xs leading-5 text-[#57534e]">{body}</p>
      </div>
    </div>
  );
}

function TopProductRow({ product, index, maxRevenue }: { product: Product; index: number; maxRevenue: number }) {
  const colors = ["bg-[#b45309]", "bg-emerald-500", "bg-[#1c1917]", "bg-[#fcd34d]"];
  const width = Math.max(8, Math.round((product.revenue30d / maxRevenue) * 100));
  return (
    <Link href={`/products/${product.id}`} className="flex items-center gap-3 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] px-3 py-2.5 hover:border-[#fbbf24] hover:bg-[#fef3c7]">
      <div className={`h-10 w-10 shrink-0 rounded-full ${colors[index % colors.length]}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#1c1917]">{product.title}</div>
        <div className="text-[11px] text-[#57534e]">{product.unitsSold30d} sold · {product.inventoryQty} in stock · {percent(product.conversionRate, 2)} CVR</div>
      </div>
      <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-[#d6d3d1] sm:block">
        <div className="h-full rounded-full bg-[#1c1917]" style={{ width: `${width}%` }} />
      </div>
      <div className="mono w-20 text-right text-sm font-bold">{currency(product.revenue30d)}</div>
    </Link>
  );
}

function OpportunityCard({ recommendation, product }: { recommendation: Recommendation; product?: Product }) {
  if (!product) return null;
  return (
    <Link href={`/products/${product.id}`} className="grid grid-cols-[92px_1fr] gap-4 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-3 hover:border-[#fbbf24] hover:bg-[#fef3c7]">
      <img src={product.imageUrl} alt="" className="h-[92px] w-[92px] rounded-xl object-cover" />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{product.title}</h3>
            <p className="text-xs text-[#57534e]">{product.productType} · {product.inventoryQty} in stock</p>
          </div>
          <RecommendationPill state={recommendation.state} />
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#44403c]">{recommendation.reason}</p>
      </div>
    </Link>
  );
}

function AdsSalesChart({ channel, stale }: { channel: Channel; stale: boolean }) {
  const width = 760;
  const height = 230;
  const series = getChartSeries(channel, stale);
  const revenue = series.revenue;
  const spend = series.spend;
  const pathFor = (values: number[]) => {
    const step = width / (values.length - 1);
    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - 24 - value;
        if (index === 0) return `M${x},${y}`;
        const previousX = (index - 1) * step;
        const previousY = height - 24 - values[index - 1];
        const controlX = (previousX + x) / 2;
        return `C${controlX},${previousY} ${controlX},${y} ${x},${y}`;
      })
      .join(" ");
  };
  const revenuePath = pathFor(revenue);
  const spendPath = pathFor(spend);
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] w-full">
        <defs>
          <linearGradient id="overview-revenue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="overview-spend" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((index) => (
          <line key={index} x1="0" x2={width} y1={24 + index * 42} y2={24 + index * 42} stroke="#d6d3d1" strokeDasharray="3 7" />
        ))}
        <path d={`${revenuePath} L${width},${height} L0,${height} Z`} fill="url(#overview-revenue)" />
        <path d={`${spendPath} L${width},${height} L0,${height} Z`} fill="url(#overview-spend)" />
        <path d={revenuePath} fill="none" stroke="#059669" strokeLinecap="round" strokeWidth="2.5" />
        <path d={spendPath} fill="none" stroke="#b45309" strokeLinecap="round" strokeWidth="2.5" />
        <circle cx="617" cy="62" r="4" fill="#059669" stroke="white" strokeWidth="2" />
      </svg>
      <div className="-mt-2 flex justify-between px-2 text-[10px] text-[#78716c]">
        {["15 Apr", "17 Apr", "19 Apr", "21 Apr", "23 Apr", "25 Apr", "27 Apr", "29 Apr", "1 May", "3 May", "5 May", "7 May"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function parseChannel(value: string | string[] | undefined): Channel {
  const channel = Array.isArray(value) ? value[0] : value;
  if (channel === "meta" || channel === "google") return channel;
  return "all";
}

function overviewHref(channel: Channel) {
  const params = new URLSearchParams();
  if (channel !== "all") params.set("channel", channel);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function getChannelKpis(data: DashboardData, channel: Channel, stale: boolean) {
  const sourceLabel = channel === "all" ? "Meta and Google" : channel === "meta" ? "Meta" : "Google";
  const staleLabel = stale ? "Stale/demo " : "";
  return getOverviewKpis(data).map((kpi) => {
    if (kpi.label === "Tracked Revenue") {
      return { ...kpi, helper: `${staleLabel}${sourceLabel} attributed sales` };
    }
    if (kpi.label === "Ad Spend") {
      return { ...kpi, helper: `${staleLabel}last 30 days on ${sourceLabel}` };
    }
    return kpi;
  });
}

function getChannelView(data: DashboardData, channel: Channel) {
  const metaConnected = data.integrations.some((integration) => integration.type === "meta" && integration.status === "connected");
  const googleConnected = data.integrations.some((integration) => integration.type === "google_ads" && integration.status === "connected");
  const campaigns = getChannelCampaigns(data.campaigns, channel);
  const noLiveChannel = channel === "all" ? !metaConnected && !googleConnected : channel === "meta" ? !metaConnected : !googleConnected;

  const title = channel === "all" ? "All ads overview" : channel === "meta" ? "Meta Ads overview" : "Google Ads overview";
  const helper =
    channel === "all"
      ? metaConnected && googleConnected
        ? "Meta and Google live"
        : metaConnected
        ? "Meta live, Google stale"
        : googleConnected
        ? "Google live, Meta stale"
        : "stale Meta and Google data"
      : noLiveChannel
      ? `${channel === "meta" ? "Meta" : "Google"} is not connected yet`
      : `${channel === "meta" ? "Meta" : "Google"} live data`;

  return {
    campaigns,
    title,
    helper,
    stale: noLiveChannel
  };
}

function getChannelCampaigns(campaigns: AdCampaign[], channel: Channel) {
  if (channel === "meta") return campaigns.filter((campaign) => campaign.source === "meta");
  if (channel === "google") return campaigns.filter((campaign) => campaign.source === "google_ads");
  return campaigns.filter((campaign) => campaign.source === "meta" || campaign.source === "google_ads");
}

function getChartSeries(channel: Channel, stale: boolean) {
  const series = {
    all: {
      revenue: [82, 110, 166, 136, 112, 120, 128, 140, 132, 146, 124, 154, 140, 116, 168, 174, 146, 168, 10, 9, 9, 9],
      spend: [72, 72, 70, 75, 73, 68, 69, 66, 64, 67, 66, 61, 65, 62, 66, 68, 66, 64, 8, 8, 8, 8]
    },
    meta: {
      revenue: [74, 96, 148, 123, 101, 106, 118, 126, 124, 133, 112, 141, 129, 105, 151, 160, 132, 154, 9, 8, 8, 8],
      spend: [62, 63, 61, 66, 64, 61, 59, 57, 58, 56, 54, 53, 56, 54, 57, 59, 58, 56, 7, 7, 7, 7]
    },
    google: {
      revenue: [24, 30, 38, 34, 29, 32, 36, 39, 37, 43, 38, 45, 42, 35, 46, 49, 41, 44, 11, 10, 10, 10],
      spend: [18, 18, 19, 20, 19, 18, 18, 17, 18, 18, 17, 17, 18, 17, 18, 19, 18, 18, 8, 8, 8, 8]
    }
  } satisfies Record<Channel, { revenue: number[]; spend: number[] }>;

  if (!stale) return series[channel];
  return {
    revenue: series[channel].revenue.map((value, index) => (index > 17 ? value : Math.round(value * 0.72))),
    spend: series[channel].spend.map((value, index) => (index > 17 ? value : Math.round(value * 0.9)))
  };
}
