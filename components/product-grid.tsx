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
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="card grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 p-3 hover:border-[#b45309] sm:grid-cols-[92px_minmax(0,1fr)] sm:gap-4"
          >
            <img src={product.imageUrl} alt="" className="h-[72px] w-[72px] shrink-0 rounded-md object-cover sm:h-[92px] sm:w-[92px]" />
            <div className="min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 max-w-full break-words text-base font-bold leading-snug text-[#1c1917]">{product.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-[#57534e]">{product.productType || "Uncategorized"} · {product.inventoryQty} in stock</p>
                </div>
                {rec && <RecommendationPill state={rec.state} />}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-[#57534e]">Price</div>
                  <div className="mono truncate font-bold">{currency(product.price)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[#57534e]">Revenue 30d</div>
                  <div className="mono truncate font-bold">{currency(product.revenue30d)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[#57534e]">CVR</div>
                  <div className="mono truncate font-bold">{percent(product.conversionRate, 2)}</div>
                </div>
              </div>
              {rec && <p className="mt-3 line-clamp-2 break-words text-sm leading-5 text-[#1c1917]">{rec.reason}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
