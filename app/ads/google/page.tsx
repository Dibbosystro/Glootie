import { AppShell } from "@/components/app-shell";
import { AdsPieCard } from "@/components/ads-pie-card";
import { AdsTable } from "@/components/ads-table";
import { CampaignCategorySummary } from "@/components/campaign-category-summary";
import { MetricStrip } from "@/components/metric-strip";
import { getDashboardData, getSourceKpis } from "@/lib/data";
import { currency } from "@/lib/format";

export default async function GoogleAdsPage() {
  const data = await getDashboardData();
  const campaigns = data.campaigns.filter((campaign) => campaign.source === "google_ads");
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend30d, 0);
  const totalRevenue = campaigns.reduce((sum, campaign) => sum + campaign.revenue30d, 0);

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Google Ads · {data.client.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Google Ads performance</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#57534e]">
            Search and shopping performance will populate here when Google Ads campaign sync is enabled. Until then, Google Ads metrics remain zero.
          </p>
        </section>
        <MetricStrip kpis={getSourceKpis(data, "google_ads")} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold">Google Ads dashboard</h2>
                <p className="mt-1 text-sm text-[#57534e]">Search performance, spend pacing, and purchase signal for the connected Google account.</p>
              </div>
              <div className="rounded-full bg-[#fef3c7] px-3 py-2 text-xs font-bold text-[#b45309]">{campaigns.length > 0 ? "Live API view" : "No Google campaign data"}</div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <MiniStat label="Spend" value={currency(totalSpend)} />
              <MiniStat label="Revenue" value={currency(totalRevenue)} />
              <MiniStat label="Campaigns" value={String(campaigns.length)} />
            </div>
            <div className="mt-5 flex h-[220px] items-end gap-2 border-b border-l border-[#d6d3d1] px-3 pb-3">
              {Array.from({ length: 14 }).map((_, index) => {
                const spendHeight = 28 + ((index * 19) % 52);
                const purchaseDay = index === 2 || index === 5 || index === 9 || index === 12;
                return (
                  <div key={index} className="flex flex-1 flex-col items-center gap-1">
                    <div className={`w-full rounded-t-md ${purchaseDay ? "bg-[#31a24c]" : "bg-[#b45309]"}`} style={{ height: `${spendHeight}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-[#57534e]">
              <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#b45309]" /> Spend day</span>
              <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#31a24c]" /> Purchase signal</span>
            </div>
          </div>

          <div className="grid gap-4">
            <AdsPieCard title="Spend split" campaigns={campaigns} metric="spend30d" />
            <AdsPieCard title="Purchase split" campaigns={campaigns} metric="purchases30d" />
          </div>
        </section>

        <CampaignCategorySummary campaigns={campaigns} products={data.products} />

        <section className="card p-5">
          <h2 className="text-lg font-bold">What to do next</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Note title="Enable campaign sync" body="Google Ads credentials can be present while campaign reporting still waits for GAQL sync." />
            <Note title="Keep metrics at zero" body="Until live Google campaign rows are imported, Google Ads should not affect blended totals." />
            <Note title="Match products later" body="Campaign URL and feed data can connect Google campaigns back to Shopify products." />
          </div>
        </section>
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold">Campaigns</h2>
            <p className="text-sm text-[#57534e]">{campaigns.length} campaigns in this view</p>
          </div>
          <AdsTable campaigns={campaigns} products={data.products} />
        </section>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d6d3d1] bg-white p-4">
      <div className="text-xs font-semibold text-[#57534e]">{label}</div>
      <div className="mono mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-[#d6d3d1] p-4">
      <div className="font-bold">{title}</div>
      <p className="mt-1 text-sm text-[#57534e]">{body}</p>
    </div>
  );
}
