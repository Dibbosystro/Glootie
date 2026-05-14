import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdsTable } from "@/components/ads-table";
import { RecommendationPill } from "@/components/status-pill";
import { getDashboardData, getProductById, getProductCampaigns, getRecommendationForProduct } from "@/lib/data";
import { currency, percent } from "@/lib/format";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getDashboardData();
  const { id } = await params;
  const product = getProductById(data, id);
  if (!product) notFound();
  const recommendation = getRecommendationForProduct(data, product.id);
  const campaigns = getProductCampaigns(data, product.id);

  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <Link href="/products" className="text-sm font-bold text-[#b45309]">Back to products</Link>
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <div className="card overflow-hidden">
            <img src={product.imageUrl} alt="" className="h-[280px] w-full object-cover" />
            <div className="p-5">
              <h1 className="text-2xl font-bold">{product.title}</h1>
              <p className="mt-1 text-sm text-[#57534e]">{product.productType} · {product.vendor}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Fact label="Price" value={currency(product.price)} />
                <Fact label="Inventory" value={`${product.inventoryQty} units`} />
                <Fact label="Status" value={product.status} />
                <Fact label="CVR" value={percent(product.conversionRate, 2)} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {recommendation && (
              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#57534e]">Recommendation</p>
                    <h2 className="mt-1 text-2xl font-bold">{recommendation.headline}</h2>
                  </div>
                  <RecommendationPill state={recommendation.state} />
                </div>
                <p className="mt-3 text-[#1c1917]">{recommendation.reason}</p>
                <div className="mt-4 rounded-md bg-[#fef3c7] p-4">
                  <div className="text-sm font-bold">Next action</div>
                  <p className="mt-1 text-sm text-[#57534e]">{recommendation.nextAction}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {recommendation.signals.map((signal) => <span key={signal} className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#b45309]">{signal}</span>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FactCard label="Revenue 30d" value={currency(product.revenue30d)} />
              <FactCard label="Units sold" value={String(product.unitsSold30d)} />
              <FactCard label="Sessions" value={product.sessions30d.toLocaleString()} />
            </div>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Linked ad campaigns</h2>
          <AdsTable campaigns={campaigns} products={data.products} />
        </section>
      </div>
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[#57534e]">{label}</div>
      <div className="mono mt-1 font-bold">{value}</div>
    </div>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[#57534e]">{label}</div>
      <div className="mono mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}
