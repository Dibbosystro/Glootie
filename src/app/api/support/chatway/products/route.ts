import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth";
import { searchProductsWithUrls } from "@/lib/integrations/shopify";

export const runtime = "nodejs";
export const maxDuration = 10;

// Live product search for the inbox product picker. Returns top matches with
// their public storefront URLs so the human can drop a product link into a reply.
export async function GET(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ products: [] });

  try {
    const products = await searchProductsWithUrls(q, 5);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product search failed." },
      { status: 502 }
    );
  }
}
