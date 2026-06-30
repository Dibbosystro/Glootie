// ===== Glootie Command Center Types =====

export type PageKey =
  | 'dashboard'
  | 'meta-ads'
  | 'google-ads'
  | 'products'
  | 'product-detail'
  | 'opportunities'
  | 'ad-copy'
  | 'image-maker'
  | 'support'
  | 'inbox'
  | 'settings'
  | 'activity'

export type Verdict = 'scale' | 'test' | 'hold' | 'fix_first' | 'do_not_advertise'
export type DeliveryStatus = 'active' | 'learning' | 'limited' | 'inactive' | 'paused' | 'not_delivering'
export type CampaignSource = 'meta' | 'google'
export type CampaignCategory =
  | 'bundle_offer'
  | 'product_specific'
  | 'brand_search'
  | 'generic_search'
  | 'shopping_catalog'
  | 'performance_max'
  | 'retargeting'
  | 'prospecting'
  | 'account_wide'

export interface KPIMetrics {
  revenue: number
  spend: number
  roas: number
  purchases: number
  clicks: number
  impressions: number
  ctr: number
  cpm: number
  frequency: number
  reach: number
}

export interface Campaign {
  id: string
  name: string
  source: CampaignSource
  delivery: DeliveryStatus
  objective: string
  category: CampaignCategory
  dailyBudget: number
  metrics: KPIMetrics
  createdAt: string
}

export interface Product {
  id: string
  title: string
  handle: string
  vendor: string
  productType: string
  price: number
  cost: number
  imageUrl: string
  inventoryQty: number
  status: 'active' | 'draft' | 'archived'
  verdict: Verdict
  score: number
  headline: string
  reason: string
  nextAction: string
  sessions30d: number
  sales30d: number
  revenue30d: number
  conversionRate: number
}

export interface DailyMetric {
  date: string
  spend: number
  revenue: number
  purchases: number
  clicks: number
  impressions: number
}

export interface ActivityItem {
  id: string
  type: string
  status: 'success' | 'running' | 'error' | 'warning'
  summary: string
  actor: string
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
}

export interface SyncStatus {
  shopify: { lastSync: string | null; status: string }
  meta: { lastSync: string | null; status: string }
  googleAds: { lastSync: string | null; status: string }
}

export interface IntegrationConfig {
  id: string
  name: string
  type: 'shopify' | 'meta' | 'google-ads' | 'ai'
  provider?: string
  configured: boolean
  status?: string
  description: string
}

export interface Conversation {
  id: string
  customerName: string
  lastMessage: string
  lastMessageAt: string
  status: 'waiting' | 'active' | 'resolved'
  unreadCount: number
  avatarUrl?: string
}

export interface Message {
  id: string
  role: 'customer' | 'agent' | 'ai'
  content: string
  timestamp: string
}

export interface DashboardData {
  kpi: KPIMetrics
  campaigns: Campaign[]
  products: Product[]
  dailyMetrics: DailyMetric[]
  syncStatus: SyncStatus
  metaKpi: KPIMetrics
  googleKpi: KPIMetrics
  activities: ActivityItem[]
  integrations: IntegrationConfig[]
  conversations: Conversation[]
}

export interface NavigationState {
  currentPage: PageKey
  previousPage: PageKey | null
  selectedProductId: string | null
  sidebarOpen: boolean
  showCreateCampaignModal: boolean
  navigate: (page: PageKey, productId?: string) => void
  goBack: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setShowCreateCampaignModal: (show: boolean) => void
}