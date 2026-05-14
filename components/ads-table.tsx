import Link from "next/link";
import type { AdCampaign, Product } from "@/lib/types";
import { resolveCampaignCategory } from "@/lib/campaign-category";
import { currency, number, percent, roas } from "@/lib/format";
import { DeliveryPill } from "@/components/status-pill";

export function AdsTable({ campaigns, products }: { campaigns: AdCampaign[]; products: Product[] }) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const totals = campaigns.reduce(
    (acc, campaign) => {
      acc.spend += campaign.spend30d;
      acc.revenue += campaign.revenue30d;
      acc.purchases += campaign.purchases30d;
      acc.impressions += campaign.impressions30d;
      acc.clicks += campaign.clicks30d;
      return acc;
    },
    { spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0 }
  );

  return (
    <div className="card table-wrap">
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr className="border-b border-[#d6d3d1] bg-[#fafaf9] text-left text-[11px] uppercase tracking-[0.04em] text-[#57534e]">
            <th className="px-4 py-3 font-bold">Campaign</th>
            <th className="px-4 py-3 font-bold">Delivery</th>
            <th className="px-4 py-3 text-right font-bold">Spent</th>
            <th className="px-4 py-3 text-right font-bold">Revenue</th>
            <th className="px-4 py-3 text-right font-bold">ROAS</th>
            <th className="px-4 py-3 text-right font-bold">Purchases</th>
            <th className="px-4 py-3 text-right font-bold">CTR</th>
            <th className="px-4 py-3 text-right font-bold">Impressions</th>
            <th className="px-4 py-3 font-bold">Campaign category</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const product = campaign.productId ? productById.get(campaign.productId) : null;
            const category = resolveCampaignCategory(campaign, product);
            return (
              <tr key={campaign.id} className="border-b border-[#d6d3d1] bg-white hover:bg-[#fafaf9]">
                <td className="px-4 py-4">
                  <div className="font-bold text-[#1c1917]">{campaign.name}</div>
                  <div className="mt-1 text-xs text-[#57534e]">{campaign.objective} · {campaign.externalId}</div>
                </td>
                <td className="px-4 py-4"><DeliveryPill delivery={campaign.delivery} /></td>
                <td className="mono px-4 py-4 text-right font-semibold">{currency(campaign.spend30d)}</td>
                <td className="mono px-4 py-4 text-right font-semibold">{currency(campaign.revenue30d)}</td>
                <td className="mono px-4 py-4 text-right font-bold text-[#31a24c]">{roas(campaign.revenue30d / Math.max(campaign.spend30d, 1))}</td>
                <td className="mono px-4 py-4 text-right">{campaign.purchases30d}</td>
                <td className="mono px-4 py-4 text-right">{percent(campaign.ctr, 2)}</td>
                <td className="mono px-4 py-4 text-right">{number(campaign.impressions30d)}</td>
                <td className="px-4 py-4 text-sm">
                  <div>
                    <div className="font-semibold text-[#1c1917]">{category.label}</div>
                    <div className="mt-1 max-w-[260px] text-xs leading-5 text-[#57534e]">{category.detail}</div>
                    {product ? <Link className="mt-1 inline-block text-xs font-semibold text-[#b45309]" href={`/products/${product.id}`}>Linked product: {product.title}</Link> : null}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-[#fafaf9] font-bold">
            <td className="px-4 py-4 text-[#57534e]">Totals</td>
            <td />
            <td className="mono px-4 py-4 text-right">{currency(totals.spend)}</td>
            <td className="mono px-4 py-4 text-right">{currency(totals.revenue)}</td>
            <td className="mono px-4 py-4 text-right">{roas(totals.revenue / Math.max(totals.spend, 1))}</td>
            <td className="mono px-4 py-4 text-right">{totals.purchases}</td>
            <td className="mono px-4 py-4 text-right">{percent(totals.clicks / Math.max(totals.impressions, 1), 2)}</td>
            <td className="mono px-4 py-4 text-right">{number(totals.impressions)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
