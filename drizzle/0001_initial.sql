CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  store_url text NOT NULL,
  currency text NOT NULL DEFAULT 'AUD',
  timezone text NOT NULL DEFAULT 'Australia/Brisbane',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'missing',
  external_account_id text,
  external_account_name text,
  encrypted_credentials jsonb,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, type)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_changed integer NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  shopify_id text NOT NULL,
  title text NOT NULL,
  handle text NOT NULL,
  vendor text,
  product_type text NOT NULL DEFAULT 'Uncategorized',
  price numeric(10,2) NOT NULL,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  inventory_qty integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, shopify_id)
);

CREATE TABLE IF NOT EXISTS product_metrics_daily (
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date text NOT NULL,
  units_sold integer NOT NULL DEFAULT 0,
  revenue numeric(10,2) NOT NULL DEFAULT 0,
  sessions integer NOT NULL DEFAULT 0,
  add_to_cart integer NOT NULL DEFAULT 0,
  checkouts integer NOT NULL DEFAULT 0,
  PRIMARY KEY(client_id, product_id, date)
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  objective text,
  delivery text NOT NULL DEFAULT 'inactive',
  daily_budget numeric(10,2) NOT NULL DEFAULT 0,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  UNIQUE(client_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive'
);

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  ad_set_id uuid REFERENCES ad_sets(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  creative_url text
);

CREATE TABLE IF NOT EXISTS ad_metrics_daily (
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  ad_set_id uuid REFERENCES ad_sets(id) ON DELETE SET NULL,
  ad_id uuid REFERENCES ads(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  date text NOT NULL,
  spend numeric(10,2) NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric(10,2) NOT NULL DEFAULT 0,
  frequency numeric(6,2) NOT NULL DEFAULT 0,
  cpm numeric(10,2) NOT NULL DEFAULT 0,
  ctr numeric(8,6) NOT NULL DEFAULT 0,
  PRIMARY KEY(client_id, source, campaign_id, date)
);

CREATE TABLE IF NOT EXISTS product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  state text NOT NULL,
  score numeric(5,2) NOT NULL,
  headline text NOT NULL,
  reason text NOT NULL,
  next_action text NOT NULL,
  raw_signals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'missing',
  encrypted_api_key text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_copy_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  provider text NOT NULL,
  prompt text NOT NULL,
  output text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  provider text NOT NULL,
  prompt text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'prompt_ready',
  created_at timestamptz NOT NULL DEFAULT now()
);
