import type { AdCampaign, Product } from "@/lib/types";
import { resolveCampaignCategory } from "@/lib/campaign-category";
import { currency, number } from "@/lib/format";

export function CampaignCategorySummary({ campaigns, products }: { campaigns: AdCampaign[]; products: Product[] }) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const rows = Array.from(
    campaigns.reduce((map, campaign) => {
      const product = campaign.productId ? productById.get(campaign.productId) : null;
      const resolved = resolveCampaignCategory(campaign, product);
      const current = map.get(resolved.label) ?? { label: resolved.label, campaigns: 0, spend: 0, purchases: 0 };
      current.campaigns += 1;
      current.spend += campaign.spend30d;
      current.purchases += campaign.purchases30d;
      map.set(resolved.label, current);
      return map;
    }, new Map<string, { label: string; campaigns: number; spend: number; purchases: number }>())
  ).map(([, value]) => value);

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Campaign categories</h2>
      <p className="mt-1 text-sm text-[#57534e]">Campaigns are grouped by offer/intent first, then linked to products only when there is a reliable match.</p>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-[#d6d3d1] bg-white p-3 text-sm">
            <div>
              <div className="font-bold">{row.label}</div>
              <div className="text-xs text-[#57534e]">{number(row.campaigns)} campaigns</div>
            </div>
            <div className="mono text-right font-semibold">{currency(row.spend)}</div>
            <div className="mono text-right font-semibold text-emerald-700">{number(row.purchases)} purchases</div>
          </div>
        ))}
      </div>
    </div>
  );
}
