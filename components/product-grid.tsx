import Link from "next/link";
import type { Product, Recommendation } from "@/lib/types";
import { currency, percent } from "@/lib/format";
import { RecommendationPill } from "@/components/status-pill";

export function ProductGrid({ products, recommendations }: { products: Product[]; recommendations: Recommendation[] }) {
  const recByProduct = new Map(recommendations.map((rec) => [rec.productId, rec]));
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {products.map((product) => {
        const rec = recByProduct.get(product.id);
        return (
          <Link key={product.id} href={`/products/${product.id}`} className="card grid grid-cols-[92px_1fr] gap-4 p-3 hover:border-[#6d28d9]">
            <img src={product.imageUrl} alt="" className="h-[92px] w-[92px] rounded-md object-cover" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="truncate text-base font-bold text-[#1c1e21]">{product.title}</h3>
                  <p className="text-xs text-[#65676b]">{product.productType} · {product.inventoryQty} in stock</p>
                </div>
                {rec && <RecommendationPill state={rec.state} />}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[#65676b]">Price</div>
                  <div className="mono font-bold">{currency(product.price)}</div>
                </div>
                <div>
                  <div className="text-[#65676b]">Revenue 30d</div>
                  <div className="mono font-bold">{currency(product.revenue30d)}</div>
                </div>
                <div>
                  <div className="text-[#65676b]">CVR</div>
                  <div className="mono font-bold">{percent(product.conversionRate, 2)}</div>
                </div>
              </div>
              {rec && <p className="mt-3 line-clamp-2 text-sm text-[#1c1e21]">{rec.reason}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
