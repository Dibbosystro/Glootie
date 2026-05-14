import { AppShell } from "@/components/app-shell";
import { AdsPieCard } from "@/components/ads-pie-card";
import { AdsTable } from "@/components/ads-table";
import { CampaignCategorySummary } from "@/components/campaign-category-summary";
import { MetricStrip } from "@/components/metric-strip";
import { getDashboardData, getSourceKpis } from "@/lib/data";
import { currency, number } from "@/lib/format";

export default async function MetaAdsPage() {
  const data = await getDashboardData();
  const campaigns = data.campaigns.filter((campaign) => campaign.source === "meta");
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend30d, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue30d, 0);

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Ads Manager · {data.client.name}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Meta Ads performance</h1>
            <p className="mt-2 text-sm text-[#65676b]">Last 30 days · Website purchase attribution · client-readable highlights.</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-[#f2ecff] px-3 py-2 text-xs font-bold text-[#6d28d9]">Last 30 days</span>
            <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#65676b]">All campaigns</span>
          </div>
        </section>

        <MetricStrip kpis={getSourceKpis(data, "meta")} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Daily spend and purchase signal</h2>
                <p className="text-sm text-[#65676b]">Daily pacing plus campaign-level pie charts. Live API sync will replace this with daily rows.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex h-[240px] items-end gap-1 border-b border-l border-[#e8e4ef] px-3 pb-3">
                  {Array.from({ length: 30 }).map((_, index) => {
                    const height = 34 + ((index * 17) % 54);
                    const purchase = index % 2 === 1 || index === 26;
                    return <div key={index} title={`Day ${index + 1}`} className={`flex-1 rounded-t-sm ${purchase ? "bg-[#31a24c]" : "bg-[#6d28d9]"}`} style={{ height: `${height}%` }} />;
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-[#65676b]">
                  <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#6d28d9]" /> Spend day</span>
                  <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#31a24c]" /> Purchase day</span>
                  <span className="ml-auto">Total: {currency(totalSpend)} spent · {currency(totalRevenue)} revenue</span>
                </div>
              </div>
              <div className="grid gap-3">
                <AdsPieCard title="Spend split" campaigns={campaigns} metric="spend30d" />
                <AdsPieCard title="Purchase split" campaigns={campaigns} metric="purchases30d" />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-bold">Highlights</h2>
            <div className="mt-4 space-y-3">
              <Highlight title="Profitable at account level" body="Every dollar in Meta spend returned roughly three dollars in tracked revenue. This is worth reactivating carefully with fresh creative." />
              <Highlight title="CRG - Sales is a bundle campaign" body="This is not one Shopify product. It should be read as a bundle/offer campaign across core electrical parts, control modules, lighting, and seat-related traffic." />
              <Highlight title="One weak ad angle" body="Seat Bundle is near break-even. Hold spend until the product page or offer improves." />
            </div>
          </div>
        </section>

        <CampaignCategorySummary campaigns={campaigns} products={data.products} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Campaigns</h2>
              <p className="text-sm text-[#65676b]">{number(campaigns.length)} campaigns in this view</p>
            </div>
          </div>
          <AdsTable campaigns={campaigns} products={data.products} />
        </section>
      </div>
    </AppShell>
  );
}

function Highlight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-[#e4e6eb] p-4">
      <div className="font-bold">{title}</div>
      <p className="mt-1 text-sm text-[#65676b]">{body}</p>
    </div>
  );
}
