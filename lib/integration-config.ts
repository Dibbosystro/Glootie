export type SettingsIntegrationKind = "data" | "ai";

export interface SettingsEnvField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
}

export interface SettingsIntegrationConfig {
  id: string;
  kind: SettingsIntegrationKind;
  label: string;
  description: string;
  fields: SettingsEnvField[];
}

export const settingsIntegrations: SettingsIntegrationConfig[] = [
  {
    id: "shopify",
    kind: "data",
    label: "Shopify",
    description: "Products, price, status, inventory, and images.",
    fields: [
      { key: "SHOPIFY_STORE_DOMAIN", label: "Store domain", placeholder: "your-store.myshopify.com" },
      { key: "SHOPIFY_ADMIN_ACCESS_TOKEN", label: "Admin access token", secret: true }
    ]
  },
  {
    id: "meta",
    kind: "data",
    label: "Meta Ads",
    description: "Campaign, ad set, ad, delivery, spend, and purchase metrics.",
    fields: [
      { key: "META_AD_ACCOUNT_ID", label: "Ad account ID", placeholder: "act_..." },
      { key: "META_ACCESS_TOKEN", label: "Access token", secret: true }
    ]
  },
  {
    id: "google_ads",
    kind: "data",
    label: "Google Ads",
    description: "Campaign and ad group metrics from Google Ads.",
    fields: [
      { key: "GOOGLE_ADS_CUSTOMER_ID", label: "Customer ID" },
      { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", label: "Login customer ID" },
      { key: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer token", secret: true },
      { key: "GOOGLE_ADS_CLIENT_ID", label: "OAuth client ID" },
      { key: "GOOGLE_ADS_CLIENT_SECRET", label: "OAuth client secret", secret: true },
      { key: "GOOGLE_ADS_REFRESH_TOKEN", label: "OAuth refresh token", secret: true }
    ]
  },
  {
    id: "neokens",
    kind: "ai",
    label: "Neokens",
    description: "Anthropic-compatible AI gateway for ad copy and prompts.",
    fields: [
      { key: "NEOKENS_KEY", label: "API key", secret: true },
      { key: "NEOKENS_BASE_URL", label: "Base URL", placeholder: "https://api.neokens.com/" },
      { key: "NEOKENS_MODEL", label: "Default model", placeholder: "claude-sonnet-4-6-thinking" }
    ]
  },
  {
    id: "openai",
    kind: "ai",
    label: "OpenAI",
    description: "Optional provider for copy generation and image prompts.",
    fields: [{ key: "OPENAI_API_KEY", label: "API key", secret: true }]
  },
  {
    id: "anthropic",
    kind: "ai",
    label: "Anthropic",
    description: "Optional Claude provider for copy and recommendations.",
    fields: [{ key: "ANTHROPIC_API_KEY", label: "API key", secret: true }]
  },
  {
    id: "gemini",
    kind: "ai",
    label: "Gemini",
    description: "Optional Google AI provider for prompts and image workflows.",
    fields: [{ key: "GEMINI_API_KEY", label: "API key", secret: true }]
  },
  {
    id: "openrouter",
    kind: "ai",
    label: "OpenRouter",
    description: "Optional multi-model provider.",
    fields: [{ key: "OPENROUTER_API_KEY", label: "API key", secret: true }]
  }
];

export const allowedSettingsEnvKeys = new Set(settingsIntegrations.flatMap((integration) => integration.fields.map((field) => field.key)));
