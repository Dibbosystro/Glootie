import type { AdCampaign, CampaignCategory, Product } from "@/lib/backend-types";

const categoryLabels: Record<CampaignCategory, string> = {
  bundle_offer: "Bundle / offer campaign",
  product_specific: "Product-specific campaign",
  brand_search: "Brand search",
  generic_search: "Generic search",
  shopping_catalog: "Shopping / catalog",
  performance_max: "Performance Max",
  retargeting: "Retargeting",
  prospecting: "Prospecting",
  account_wide: "Account-wide campaign"
};

const categoryDetails: Record<CampaignCategory, string> = {
  bundle_offer: "Campaign promotes a bundle, offer, or mixed product set rather than one Shopify product.",
  product_specific: "Campaign appears focused on one Shopify product or SKU.",
  brand_search: "Search traffic from people already looking for the brand.",
  generic_search: "Non-brand search intent around product/category keywords.",
  shopping_catalog: "Catalog, feed, or shopping-style campaign across multiple products.",
  performance_max: "Google automated campaign that can span Search, Shopping, Display, and YouTube.",
  retargeting: "Audience campaign aimed at people who already engaged with the store or ads.",
  prospecting: "Audience campaign aimed at new potential customers.",
  account_wide: "Account-level campaign not safely tied to one product."
};

export function resolveCampaignCategory(campaign: AdCampaign, product?: Product | null) {
  const category = campaign.campaignCategory ?? inferCampaignCategory(campaign, Boolean(product));
  return {
    category,
    label: campaign.campaignCategoryLabel ?? (product && category === "product_specific" ? product.title : categoryLabels[category]),
    detail: campaign.campaignCategoryDetail ?? (product && category === "product_specific" ? `${product.productType} · direct product campaign.` : categoryDetails[category])
  };
}

export function inferCampaignCategory(campaign: AdCampaign, hasProductMatch = false): CampaignCategory {
  const text = `${campaign.name} ${campaign.objective}`.toLowerCase();

  if (hasProductMatch) return "product_specific";
  if (/\bbundle\b|\boffer\b|\bkit\b|\bpack\b|\bset\b|\bcarousel\b/.test(text)) return "bundle_offer";
  if (/\bretarget|remarket|warm|viewcontent|add.?to.?cart|checkout\b/.test(text)) return "retargeting";
  if (/\bprospect|broad|interest|lookalike|cold\b/.test(text)) return "prospecting";

  if (campaign.source === "google_ads") {
    if (/\bbrand\b|cafe racer garage|crg\b/.test(text)) return "brand_search";
    if (/\bpmax|performance max|performance_max\b/.test(text)) return "performance_max";
    if (/\bshopping|merchant|feed|catalog|product listing|pla\b/.test(text)) return "shopping_catalog";
    if (/\bsearch\b/.test(text)) return "generic_search";
  }

  if (campaign.source === "meta") {
    if (/\bcatalog|advantage\+ catalog|shopping\b/.test(text)) return "shopping_catalog";
    if (/\bsales|conversion|purchase\b/.test(text)) return "account_wide";
  }

  return "account_wide";
}
