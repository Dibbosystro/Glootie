import "server-only";

import type { Product } from "@/lib/types";
import { getServerEnv } from "@/lib/server-env";
import { getCredentialValue } from "@/lib/db/credentials";
import { persistShopifySnapshot, recordSyncRun } from "@/lib/db/persistence";
import { seedClient } from "@/lib/seed";

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

interface ShopifyOrderRaw {
  id: number;
  cancelled_at: string | null;
  line_items?: Array<{
    product_id: number | null;
    quantity: number;
    price: string;
    total_discount?: string;
  }>;
}

interface ProductSalesSignal {
  unitsSold30d: number;
  revenue30d: number;
}

export interface ShopifyInsights {
  revenue30d: number;
  orders30d: number;
  unitsSold30d: number;
  sessions30d: number;
  conversionRate: number;
  activeProducts: number;
  totalProducts: number;
  totalInventory: number;
  outOfStockProducts: number;
}

export async function syncShopify(): Promise<ShopifySyncResult> {
  const shop = await getShopifyStoreDomain();
  const token = await getShopifyAccessToken();
  if (!shop || !token) {
    const result = {
      source: "shopify",
      status: "demo",
      rowsChanged: 0,
      message: "Shopify credentials are missing, seed product data is being used."
    } as const;
    await recordSyncRun(seedClient, result);
    return result;
  }

  try {
    const { products, ordersRead } = await fetchShopifyProducts();
    const persistence = await persistShopifySnapshot(seedClient, products);
    const result = {
      source: "shopify",
      status: "success",
      rowsChanged: products.length,
      message: `Fetched ${products.length} Shopify products${ordersRead ? " with 30-day order signals" : ""}${persistence.persisted ? " and saved them to the database" : ""}.`
    } as const;
    await recordSyncRun(seedClient, result);
    return result;
  } catch (error) {
    const result = {
      source: "shopify",
      status: "error",
      rowsChanged: 0,
      message: `Shopify sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    } as const;
    await recordSyncRun(seedClient, result);
    return result;
  }
}

export async function fetchShopifyProducts(): Promise<{ products: Product[]; insights: ShopifyInsights; ordersRead: boolean }> {
  const shop = await getShopifyStoreDomain();
  const token = await getShopifyAccessToken();
  if (!shop || !token) return { products: [], insights: emptyShopifyInsights(), ordersRead: false };

  const rawProducts = await fetchAllShopifyPages<ShopifyProductRaw>(
    `https://${shop}/admin/api/2026-01/products.json?limit=250&fields=id,title,handle,vendor,product_type,status,image,variants`
  );

  let salesResult = { salesByProduct: new Map<string, ProductSalesSignal>(), orders30d: 0 };
  let ordersRead = false;

  try {
    salesResult = await fetchProductSalesSignals(shop, token);
    ordersRead = true;
  } catch {
    // Product catalog access is enough for the monitor. Order access improves
    // recommendations, but some Shopify tokens may not include read_orders.
  }

  const products = rawProducts.map((product) => mapShopifyProduct(product, salesResult.salesByProduct.get(String(product.id))));

  return {
    products,
    insights: buildShopifyInsights(products, salesResult.orders30d),
    ordersRead
  };
}

async function fetchProductSalesSignals(shop: string, token: string): Promise<{ salesByProduct: Map<string, ProductSalesSignal>; orders30d: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const orders = await fetchAllShopifyPages<ShopifyOrderRaw>(
    `https://${shop}/admin/api/2026-01/orders.json?limit=250&status=any&created_at_min=${encodeURIComponent(since)}&fields=id,cancelled_at,line_items`,
    token
  );
  const salesByProduct = new Map<string, ProductSalesSignal>();
  let orders30d = 0;

  for (const order of orders) {
    if (order.cancelled_at) continue;
    orders30d += 1;
    for (const item of order.line_items ?? []) {
      if (!item.product_id) continue;
      const productId = String(item.product_id);
      const current = salesByProduct.get(productId) ?? { unitsSold30d: 0, revenue30d: 0 };
      const quantity = Number(item.quantity || 0);
      const revenue = Math.max(0, Number(item.price || 0) * quantity - Number(item.total_discount || 0));
      salesByProduct.set(productId, {
        unitsSold30d: current.unitsSold30d + quantity,
        revenue30d: current.revenue30d + revenue
      });
    }
  }

  return { salesByProduct, orders30d };
}

async function fetchAllShopifyPages<T>(firstUrl: string, providedToken?: string): Promise<T[]> {
  const token = providedToken ?? (await getShopifyAccessToken());
  if (!token) return [];

  const rows: T[] = [];
  let url: string | null = firstUrl;

  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token },
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { products?: T[]; orders?: T[] };
    rows.push(...(json.products ?? json.orders ?? []));
    url = getNextPageUrl(res.headers.get("link"));
  }

  return rows;
}

function mapShopifyProduct(product: ShopifyProductRaw, sales?: ProductSalesSignal): Product {
  const variants = product.variants ?? [];
  const firstVariant = variants[0];
  const inventoryQty = variants.reduce((sum, variant) => sum + Number(variant.inventory_quantity || 0), 0);
  const revenue30d = Number((sales?.revenue30d ?? 0).toFixed(2));
  const unitsSold30d = sales?.unitsSold30d ?? 0;
  return {
    id: `shopify-${product.id}`,
    shopifyId: String(product.id),
    title: product.title,
    handle: product.handle,
    vendor: product.vendor || "",
    productType: product.product_type || "Uncategorized",
    price: Number(firstVariant?.price ?? 0),
    cost: 0,
    imageUrl: product.image?.src || fallbackProductImage(product.title),
    inventoryQty,
    status: normalizeShopifyStatus(product.status),
    unitsSold30d,
    revenue30d,
    sessions30d: 0,
    conversionRate: unitsSold30d > 0 ? 0.01 : 0
  };
}

function buildShopifyInsights(products: Product[], orders30d: number): ShopifyInsights {
  const revenue30d = products.reduce((sum, product) => sum + product.revenue30d, 0);
  const unitsSold30d = products.reduce((sum, product) => sum + product.unitsSold30d, 0);
  const activeProducts = products.filter((product) => product.status === "active").length;
  const totalInventory = products
    .filter((product) => product.status === "active")
    .reduce((sum, product) => sum + Math.max(0, product.inventoryQty), 0);
  const outOfStockProducts = products.filter((product) => product.status === "active" && product.inventoryQty <= 0).length;
  return {
    revenue30d: Number(revenue30d.toFixed(2)),
    orders30d,
    unitsSold30d,
    sessions30d: 0,
    conversionRate: 0,
    activeProducts,
    totalProducts: products.length,
    totalInventory,
    outOfStockProducts
  };
}

function emptyShopifyInsights(): ShopifyInsights {
  return {
    revenue30d: 0,
    orders30d: 0,
    unitsSold30d: 0,
    sessions30d: 0,
    conversionRate: 0,
    activeProducts: 0,
    totalProducts: 0,
    totalInventory: 0,
    outOfStockProducts: 0
  };
}

function getNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const nextPart = linkHeader.split(",").find((part) => part.includes('rel="next"'));
  const match = nextPart?.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

function normalizeShopifyStatus(status: string): Product["status"] {
  if (status === "draft" || status === "archived") return status;
  return "active";
}

async function getShopifyStoreDomain() {
  const raw = (await getCredentialValue("shopify", "SHOPIFY_STORE_DOMAIN")) || getServerEnv("SHOPIFY_CRG_STORE");
  return raw?.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function getShopifyAccessToken() {
  return (await getCredentialValue("shopify", "SHOPIFY_ADMIN_ACCESS_TOKEN")) || getServerEnv("SHOPIFY_CRG_TOKEN");
}

function fallbackProductImage(title: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#f5f5f4"/><circle cx="120" cy="120" r="72" fill="#b45309" opacity=".16"/><text x="120" y="126" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#1c1917">${escapeSvg(title.slice(0, 2).toUpperCase())}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] ?? char));
}
