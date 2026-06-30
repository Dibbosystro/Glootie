import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CampaignSource, DeliveryStatus, CampaignCategory, KPIMetrics } from '@/lib/types'

export interface CreatedCampaign {
  id: string
  name: string
  channel: CampaignSource
  objective: string
  dailyBudget: number
  targetProduct: string
  status: 'active' | 'paused'
  createdAt: string
  // Mock metrics for display
  metrics: KPIMetrics
  delivery: DeliveryStatus
  category: CampaignCategory
}

interface CampaignsState {
  createdCampaigns: CreatedCampaign[]
  addCampaign: (campaign: Omit<CreatedCampaign, 'id' | 'createdAt' | 'metrics' | 'delivery' | 'category'>) => void
}

// ===== Simulated metrics for user-created campaigns =====
export function getSimulatedMetrics(campaign: CreatedCampaign, averageProductPrice = 95): KPIMetrics {
  const now = Date.now()
  const created = new Date(campaign.createdAt).getTime()
  const hoursSinceCreation = Math.max(1, Math.floor((now - created) / 3600000))

  // Use a seeded pseudo-random based on campaign id for stability
  const seedHash = campaign.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const stableRandom = (offset: number) => {
    const x = Math.sin(seedHash + offset) * 10000
    return x - Math.floor(x)
  }

  const impressions = Math.floor(hoursSinceCreation * (50 * stableRandom(1) + 1) + 100)
  const clicks = Math.floor(impressions * (0.02 + stableRandom(2) * 0.03))
  const spend = parseFloat((impressions * 0.01 * (campaign.dailyBudget / 50)).toFixed(2))
  const conversions = Math.floor(clicks * 0.05)
  const revenue = parseFloat((conversions * averageProductPrice).toFixed(2))
  const roas = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0
  const reach = Math.floor(impressions * (0.6 + stableRandom(3) * 0.3))
  const frequency = impressions > 0 ? parseFloat((impressions / Math.max(1, reach)).toFixed(1)) : 0
  const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0
  const cpm = impressions > 0 ? parseFloat(((spend / impressions) * 1000).toFixed(2)) : 0

  return {
    impressions,
    clicks,
    spend,
    revenue,
    roas,
    purchases: conversions,
    reach,
    frequency,
    ctr,
    cpm,
  }
}

export const useCampaignsStore = create<CampaignsState>()(
  persist(
    (set) => ({
      createdCampaigns: [],
      addCampaign: (campaign) => {
        const newCampaign: CreatedCampaign = {
          ...campaign,
          id: `custom-${Date.now()}`,
          createdAt: new Date().toISOString(),
          delivery: campaign.status === 'active' ? 'active' : 'paused',
          category: 'product_specific',
          metrics: {
            revenue: 0, spend: 0, roas: 0, purchases: 0,
            clicks: 0, impressions: 0, ctr: 0, cpm: 0, frequency: 0, reach: 0,
          },
        }
        set((state) => ({
          createdCampaigns: [newCampaign, ...state.createdCampaigns],
        }))
        return newCampaign
      },
    }),
    {
      name: 'glootie-campaigns',
    }
  )
)