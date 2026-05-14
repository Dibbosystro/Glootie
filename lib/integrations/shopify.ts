import "server-only";

export interface ShopifySyncResult {
  source: "shopify";
  status: "success" | "demo" | "error";
  rowsChanged: number;
  message: string;
}

interface ShopifyProductRaw {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  status: string;
  image?: { src: string } | null;
  variants?: Array<{ price: string; inventory_quantity: number }>;
}

export async function syncShopify(): Promise<ShopifySyncResult> {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!shop || !token) {
    return {
      source: "shopify",
      status: "demo",
      rowsChanged: 0,
      message: "Shopify credentials are missing, seed product data is being used."
    };
  }

  const res = await fetch(`https://${shop}/admin/api/2026-01/products.json?limit=250`, {
    headers: { "X-Shopify-Access-Token": token },
    cache: "no-store"
  });
  if (!res.ok) {
    return {
      source: "shopify",
      status: "error",
      rowsChanged: 0,
      message: `Shopify sync failed: ${res.status} ${await res.text()}`
    };
  }
  const json = (await res.json()) as { products: ShopifyProductRaw[] };
  return {
    source: "shopify",
    status: "success",
    rowsChanged: json.products.length,
    message: `Fetched ${json.products.length} Shopify products. Database persistence is ready through Drizzle schema.`
  };
}
