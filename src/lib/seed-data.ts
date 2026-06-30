// ===== Glootie Seed Data =====
// Demo data for Cafe Racer Garage (CRG) - Motorcycle Electrical Parts

import type {
  Campaign, Product, DailyMetric, ActivityItem, IntegrationConfig,
  Conversation, Message, KPIMetrics, SyncStatus, DashboardData, Verdict,
  CampaignCategory, DeliveryStatus, CampaignSource
} from './types'

// ===== KPI Helpers =====
const metaKpi: KPIMetrics = {
  revenue: 28450, spend: 4230, roas: 6.73, purchases: 187,
  clicks: 3420, impressions: 185600, ctr: 1.84, cpm: 22.78, frequency: 2.1, reach: 88400
}

const googleKpi: KPIMetrics = {
  revenue: 12890, spend: 2150, roas: 5.99, purchases: 83,
  clicks: 1890, impressions: 92400, ctr: 2.05, cpm: 23.27, frequency: 1.8, reach: 51300
}

const totalKpi: KPIMetrics = {
  revenue: metaKpi.revenue + googleKpi.revenue,
  spend: metaKpi.spend + googleKpi.spend,
  roas: Math.round(((metaKpi.revenue + googleKpi.revenue) / (metaKpi.spend + googleKpi.spend)) * 100) / 100,
  purchases: metaKpi.purchases + googleKpi.purchases,
  clicks: metaKpi.clicks + googleKpi.clicks,
  impressions: metaKpi.impressions + googleKpi.impressions,
  ctr: Math.round(((metaKpi.clicks + googleKpi.clicks) / (metaKpi.impressions + googleKpi.impressions)) * 10000) / 100,
  cpm: Math.round(((metaKpi.spend + googleKpi.spend) / (metaKpi.impressions + googleKpi.impressions)) * 100000) / 100,
  frequency: 2.0, reach: metaKpi.reach + googleKpi.reach
}

// ===== Daily Metrics (30 days) =====
function generateDailyMetrics(): DailyMetric[] {
  const metrics: DailyMetric[] = []
  const baseDate = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - i)
    const dayOfWeek = d.getDay()
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1
    const trendFactor = 1 + (29 - i) * 0.008
    const jitter = 0.85 + Math.random() * 0.3
    const factor = weekendFactor * trendFactor * jitter
    metrics.push({
      date: d.toISOString().split('T')[0],
      spend: Math.round(180 * factor),
      revenue: Math.round(1200 * factor),
      purchases: Math.round(8 * factor),
      clicks: Math.round(160 * factor),
      impressions: Math.round(8800 * factor)
    })
  }
  return metrics
}

// ===== Campaigns =====
const metaCampaigns: Campaign[] = [
  {
    id: 'c1', name: 'CRG - Precio Headlight Relay Kit AU', source: 'meta',
    delivery: 'active', objective: 'Conversions', category: 'product_specific',
    dailyBudget: 45,
    metrics: { revenue: 6240, spend: 890, roas: 7.01, purchases: 38, clicks: 720, impressions: 38200, ctr: 1.88, cpm: 23.3, frequency: 2.2, reach: 17360 },
    createdAt: '2025-04-15'
  },
  {
    id: 'c2', name: 'CRG - Universal Regulator Bundle', source: 'meta',
    delivery: 'active', objective: 'Conversions', category: 'bundle_offer',
    dailyBudget: 55,
    metrics: { revenue: 8120, spend: 1050, roas: 7.73, purchases: 52, clicks: 890, impressions: 42100, ctr: 2.11, cpm: 24.94, frequency: 1.9, reach: 22160 },
    createdAt: '2025-03-20'
  },
  {
    id: 'c3', name: 'CRG - Brand Awareness AU', source: 'meta',
    delivery: 'active', objective: 'Awareness', category: 'brand_search',
    dailyBudget: 30,
    metrics: { revenue: 2100, spend: 780, roas: 2.69, purchases: 14, clicks: 560, impressions: 42000, ctr: 1.33, cpm: 18.57, frequency: 3.1, reach: 13550 },
    createdAt: '2025-05-01'
  },
  {
    id: 'c4', name: 'CRG - Retargeting Visitors 30d', source: 'meta',
    delivery: 'active', objective: 'Conversions', category: 'retargeting',
    dailyBudget: 25,
    metrics: { revenue: 5680, spend: 620, roas: 9.16, purchases: 41, clicks: 480, impressions: 18500, ctr: 2.59, cpm: 33.51, frequency: 4.2, reach: 4400 },
    createdAt: '2025-04-01'
  },
  {
    id: 'c5', name: 'CRG - Moto Electrical Prospecting', source: 'meta',
    delivery: 'learning', objective: 'Conversions', category: 'prospecting',
    dailyBudget: 40,
    metrics: { revenue: 1890, spend: 380, roas: 4.97, purchases: 12, clicks: 340, impressions: 19200, ctr: 1.77, cpm: 19.79, frequency: 1.5, reach: 12800 },
    createdAt: '2025-05-20'
  },
  {
    id: 'c6', name: 'CRG - Shopping Catalog AU', source: 'meta',
    delivery: 'active', objective: 'Catalog Sales', category: 'shopping_catalog',
    dailyBudget: 60,
    metrics: { revenue: 4420, spend: 510, roas: 8.67, purchases: 30, clicks: 430, impressions: 25600, ctr: 1.68, cpm: 19.92, frequency: 1.7, reach: 15060 },
    createdAt: '2025-02-10'
  }
]

const googleCampaigns: Campaign[] = [
  {
    id: 'g1', name: 'CRG - Brand Search', source: 'google',
    delivery: 'active', objective: 'Search', category: 'brand_search',
    dailyBudget: 20,
    metrics: { revenue: 3890, spend: 420, roas: 9.26, purchases: 24, clicks: 380, impressions: 8200, ctr: 4.63, cpm: 51.22, frequency: 1.2, reach: 6830 },
    createdAt: '2025-01-15'
  },
  {
    id: 'g2', name: 'CRG - Generic Moto Electrical', source: 'google',
    delivery: 'active', objective: 'Search', category: 'generic_search',
    dailyBudget: 35,
    metrics: { revenue: 5100, spend: 890, roas: 5.73, purchases: 32, clicks: 620, impressions: 28400, ctr: 2.18, cpm: 31.34, frequency: 1.6, reach: 17750 },
    createdAt: '2025-03-01'
  },
  {
    id: 'g3', name: 'CRG - Performance Max', source: 'google',
    delivery: 'learning', objective: 'PMax', category: 'performance_max',
    dailyBudget: 50,
    metrics: { revenue: 3900, spend: 840, roas: 4.64, purchases: 27, clicks: 890, impressions: 55800, ctr: 1.59, cpm: 15.05, frequency: 2.3, reach: 24260 },
    createdAt: '2025-05-10'
  }
]

const allCampaigns = [...metaCampaigns, ...googleCampaigns]

// ===== Products =====
const products: Product[] = [
  {
    id: 'p1', title: 'Complete LED Headlight Relay Kit - Honda CB750', handle: 'led-headlight-relay-kit-honda-cb750',
    vendor: 'Cafe Racer Garage', productType: 'Electrical',
    price: 89.95, cost: 32.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/78a90a8d09e5.png',
    inventoryQty: 47, status: 'active',
    verdict: 'scale', score: 88, headline: 'Top Performer - Scale Budget',
    reason: 'Strong ROAS (8.2x) with healthy stock (47 units) and consistent daily sales (1.4/d). High CVR at 3.8%.',
    nextAction: 'Increase daily budget by 25% and expand to lookalike audiences.',
    sessions30d: 1240, sales30d: 47, revenue30d: 4228, conversionRate: 3.79
  },
  {
    id: 'p2', title: 'Universal Voltage Regulator - 12V Systems', handle: 'universal-voltage-regulator-12v',
    vendor: 'Cafe Racer Garage', productType: 'Electrical',
    price: 54.95, cost: 18.50,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/34410901312d.jpg',
    inventoryQty: 83, status: 'active',
    verdict: 'scale', score: 92, headline: 'Best Seller - Maximize Reach',
    reason: 'Highest revenue product ($5,820/30d) with excellent margins (66%). Low ad frequency indicates room to scale.',
    nextAction: 'Launch retargeting campaign. Consider bundle offer with ignition coil.',
    sessions30d: 2100, sales30d: 106, revenue30d: 5825, conversionRate: 5.05
  },
  {
    id: 'p3', title: 'MOSFET Ignition Coil Upgrade Kit', handle: 'mosfet-ignition-coil-upgrade',
    vendor: 'Cafe Racer Garage', productType: 'Electrical',
    price: 129.95, cost: 48.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/66d930a847a7.jpg',
    inventoryQty: 12, status: 'active',
    verdict: 'hold', score: 55, headline: 'Hold - Low Stock Warning',
    reason: 'Good ROAS (5.1x) but critically low stock (12 units). At current sales rate, stock runs out in ~10 days.',
    nextAction: 'Reduce ad spend. Reorder stock immediately before scaling.',
    sessions30d: 680, sales30d: 19, revenue30d: 2469, conversionRate: 2.79
  },
  {
    id: 'p4', title: 'Digital Speedo Gauge - Retro Style', handle: 'digital-speedo-gauge-retro',
    vendor: 'Cafe Racer Garage', productType: 'Instruments',
    price: 164.95, cost: 72.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/c617747f7219.jpg',
    inventoryQty: 34, status: 'active',
    verdict: 'test', score: 68, headline: 'Test - Promising New Product',
    reason: 'Moderate traffic (520 sessions) but decent CVR (2.1%). Needs more data before scaling.',
    nextAction: 'Run a 7-day test at $20/day budget. Monitor for ROAS > 3x before scaling.',
    sessions30d: 520, sales30d: 11, revenue30d: 1814, conversionRate: 2.12
  },
  {
    id: 'p5', title: 'Antique Brass Turn Signal Set', handle: 'antique-brass-turn-signal-set',
    vendor: 'Cafe Racer Garage', productType: 'Lighting',
    price: 74.95, cost: 28.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/44a7ffcee626.jpeg',
    inventoryQty: 156, status: 'active',
    verdict: 'fix_first', score: 32, headline: 'Fix First - Low Conversion',
    reason: 'High impressions (1,800 sessions) but only 1.1% CVR. Product page may need better imagery or pricing review.',
    nextAction: 'Review product page. Consider A/B test on price ($74.95 vs $69.95). Add lifestyle images.',
    sessions30d: 1800, sales30d: 20, revenue30d: 1499, conversionRate: 1.11
  },
  {
    id: 'p6', title: 'Custom Wiring Harness Kit - Universal', handle: 'custom-wiring-harness-universal',
    vendor: 'Cafe Racer Garage', productType: 'Electrical',
    price: 199.95, cost: 65.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/0e5870a3e215.jpg',
    inventoryQty: 8, status: 'active',
    verdict: 'do_not_advertise', score: 15, headline: 'Do Not Advertise - Critical Stock',
    reason: 'Only 8 units remaining. Margins are good but stock is too low to justify ad spend.',
    nextAction: 'Remove from all active campaigns. Reorder immediately. Resume ads when stock > 30.',
    sessions30d: 340, sales30d: 4, revenue30d: 800, conversionRate: 1.18
  },
  {
    id: 'p7', title: 'Li-Ion Battery Upgrade Kit - 12V 7Ah', handle: 'lithium-battery-upgrade-12v',
    vendor: 'Cafe Racer Garage', productType: 'Electrical',
    price: 219.95, cost: 95.00,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/63d488fee7e7.jpg',
    inventoryQty: 22, status: 'active',
    verdict: 'scale', score: 81, headline: 'Strong Performer - Scale',
    reason: 'Highest AOV ($219.95) with solid ROAS (6.4x) and good stock levels.',
    nextAction: 'Increase budget by 20%. Test new creative angles showing installation.',
    sessions30d: 890, sales30d: 31, revenue30d: 6818, conversionRate: 3.48
  },
  {
    id: 'p8', title: 'Neon Flex LED Strip - 1m Blue', handle: 'neon-flex-led-strip-blue',
    vendor: 'Cafe Racer Garage', productType: 'Lighting',
    price: 34.95, cost: 8.50,
    imageUrl: 'https://sfile.chatglm.cn/images-ppt/82faad1a47d4.jpg',
    inventoryQty: 240, status: 'active',
    verdict: 'test', score: 58, headline: 'Test - Low AOV Product',
    reason: 'High session count (2,400) with decent CVR (2.5%) but low revenue per conversion. Test as upsell.',
    nextAction: 'Test as add-on item in voltage regulator campaigns. Monitor attach rate.',
    sessions30d: 2400, sales30d: 60, revenue30d: 2097, conversionRate: 2.50
  }
]

// ===== Activities (timestamps relative to now) =====
const now = new Date()
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()

const activities: ActivityItem[] = [
  { id: 'a1', type: 'sync', status: 'success', summary: 'Synced 8 products from Shopify', actor: 'System', startedAt: minsAgo(12), finishedAt: minsAgo(12), durationMs: 12000 },
  { id: 'a2', type: 'sync', status: 'success', summary: 'Synced 9 campaigns from Meta Ads', actor: 'System', startedAt: minsAgo(12), finishedAt: minsAgo(12), durationMs: 8000 },
  { id: 'a3', type: 'sync', status: 'success', summary: 'Synced 3 campaigns from Google Ads', actor: 'System', startedAt: minsAgo(12), finishedAt: minsAgo(12), durationMs: 15000 },
  { id: 'a4', type: 'ai', status: 'success', summary: 'Generated ad copy for "Voltage Regulator Bundle"', actor: 'User', startedAt: hoursAgo(3), finishedAt: hoursAgo(3), durationMs: 5000 },
  { id: 'a5', type: 'support', status: 'success', summary: 'AI reply sent to customer #2847', actor: 'AI Agent', startedAt: hoursAgo(6), finishedAt: hoursAgo(6), durationMs: 8000 },
  { id: 'a6', type: 'sync', status: 'error', summary: 'Google Ads sync failed - token expired', actor: 'System', startedAt: hoursAgo(8), finishedAt: hoursAgo(8), durationMs: 3000 },
  { id: 'a7', type: 'settings', status: 'success', summary: 'Updated Meta API credentials', actor: 'User', startedAt: daysAgo(1), finishedAt: daysAgo(1), durationMs: 2000 },
  { id: 'a8', type: 'sync', status: 'warning', summary: 'Shopify sync: 2 products have zero inventory', actor: 'System', startedAt: daysAgo(1), finishedAt: daysAgo(1), durationMs: 10000 },
  { id: 'a9', type: 'ai', status: 'success', summary: 'Generated image prompt for "Headlight Relay Kit"', actor: 'User', startedAt: daysAgo(2), finishedAt: daysAgo(2), durationMs: 3000 },
  { id: 'a10', type: 'support', status: 'success', summary: 'Resolved conversation #2839', actor: 'User', startedAt: daysAgo(2), finishedAt: daysAgo(2), durationMs: 300000 },
]

// ===== Integrations =====
const integrations: IntegrationConfig[] = [
  { id: 'i1', name: 'Shopify', type: 'shopify', configured: true, status: 'connected', description: 'Product catalog, orders, and analytics sync' },
  { id: 'i2', name: 'Meta Ads', type: 'meta', configured: true, status: 'connected', description: 'Campaign performance and insights' },
  { id: 'i3', name: 'Google Ads', type: 'google-ads', configured: false, status: 'needs_setup', description: 'Google Ads campaign data and insights' },
  { id: 'i4', name: 'Neokens AI', type: 'ai', provider: 'neokens', configured: true, status: 'active', description: 'Ad copy generation and support replies' },
  { id: 'i5', name: 'OpenAI', type: 'ai', provider: 'openai', configured: false, status: 'needs_key', description: 'GPT-4o for ad copy and support' },
]

// ===== Conversations (timestamps relative to now) =====
const conversations: Conversation[] = [
  { id: 'cv1', customerName: 'Mike T.', lastMessage: 'Does the relay kit fit a 1978 CB750K?', lastMessageAt: minsAgo(8), status: 'waiting', unreadCount: 2 },
  { id: 'cv2', customerName: 'Sarah K.', lastMessage: 'When will the battery kit be back in stock?', lastMessageAt: minsAgo(35), status: 'waiting', unreadCount: 1 },
  { id: 'cv3', customerName: 'James R.', lastMessage: 'Thanks, that solved my issue!', lastMessageAt: hoursAgo(2), status: 'resolved', unreadCount: 0 },
  { id: 'cv4', customerName: 'Emma L.', lastMessage: 'What gauge wire is in the harness kit?', lastMessageAt: hoursAgo(4), status: 'waiting', unreadCount: 1 },
  { id: 'cv5', customerName: 'Alex P.', lastMessage: 'Order #2847 - tracking number?', lastMessageAt: hoursAgo(10), status: 'active', unreadCount: 0 },
]

// ===== Messages for first conversation (timestamps relative to now) =====
const conversationMessages: Message[] = [
  { id: 'm1', role: 'customer', content: 'Hey, I have a 1978 Honda CB750K. Will the Complete LED Headlight Relay Kit work with my bike?', timestamp: minsAgo(10) },
  { id: 'm2', role: 'customer', content: 'The original stator puts out about 130W if that helps.', timestamp: minsAgo(8) },
]

// ===== Sync Status (timestamps relative to now) =====
const syncStatus: SyncStatus = {
  shopify: { lastSync: minsAgo(12), status: 'success' },
  meta: { lastSync: minsAgo(12), status: 'success' },
  googleAds: { lastSync: hoursAgo(8), status: 'error' }
}

// ===== Export =====
export const seedData: DashboardData = {
  kpi: totalKpi,
  metaKpi,
  googleKpi,
  campaigns: allCampaigns,
  products,
  dailyMetrics: generateDailyMetrics(),
  syncStatus,
  activities,
  integrations,
  conversations
}

export { conversationMessages }
export { products as allProducts, allCampaigns, metaCampaigns, googleCampaigns }