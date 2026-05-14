import { AppShell } from "@/components/app-shell";
import { ProductGrid } from "@/components/product-grid";
import { getDashboardData } from "@/lib/data";

export default async function ProductsPage() {
  const data = await getDashboardData();
  return (
    <AppShell data={data}>
      <div className="space-y-5">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#65676b]">Shopify monitor</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">Products</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#65676b]">Live Shopify sync will update product status, price, inventory, product type, and image here.</p>
        </section>
        <ProductGrid products={data.products} recommendations={data.recommendations} />
      </div>
    </AppShell>
  );
}
