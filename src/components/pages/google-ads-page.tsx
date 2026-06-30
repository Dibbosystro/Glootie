'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, RefreshCw, BarChart3, PieChartIcon, ExternalLink,
  Link2, Zap, Shield, Play, Search, Plus,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useNavigation } from '@/store/navigation'
import { useCampaignsStore, getSimulatedMetrics } from '@/store/campaigns'
import { toast } from 'sonner'
import type { DashboardData, KPIMetrics } from '@/lib/types'
import { useMemo, useState } from 'react'

// ===== Sparkline for KPI cards =====
function KpiSparkline({ data, color }: { data: number[]; color: string }) {
  const sparkData = data.map((v, i) => ({ i, v }))
  return (
    <div className="h-10 w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={sparkData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===== KPI Card =====
function KpiCard({
  label, value, trend, trendValue, sparkData, color, delay,
}: {
  label: string; value: string; trend: number; trendValue: string; sparkData: number[]; color: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-gradient-to-b from-white to-stone-50/80 dark:from-stone-900 dark:to-stone-800 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 overflow-hidden cursor-default transition-shadow hover:shadow-md border-l-[3px] border-l-orange-500"
    >
      <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{value}</span>
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trendValue}
        </div>
      </div>
      <div className="mt-3">
        <KpiSparkline data={sparkData} color={color} />
      </div>
    </motion.div>
  )
}

// ===== Delivery dot =====
function DeliveryDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    learning: 'bg-amber-500',
    limited: 'bg-orange-500',
    inactive: 'bg-stone-400',
    paused: 'bg-red-500',
    not_delivering: 'bg-stone-300',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-stone-300'}`} />
      <span className="text-xs text-stone-600 dark:text-stone-400 capitalize">{status}</span>
    </span>
  )
}

// ===== ROAS pill =====
function RoasPill({ roas }: { roas: number }) {
  const colorClass = roas > 5 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : roas >= 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
      {roas.toFixed(2)}x
    </span>
  )
}

// ===== Category label =====
const categoryLabels: Record<string, string> = {
  product_specific: 'Product Specific',
  bundle_offer: 'Bundle Offer',
  retargeting: 'Retargeting',
  prospecting: 'Prospecting',
  shopping_catalog: 'Shopping Catalog',
  brand_search: 'Brand Search',
  generic_search: 'Generic Search',
  performance_max: 'Performance Max',
}

const PIE_COLORS = ['#ea580c', '#059669', '#b45309', '#0891b2', '#7c3aed', '#3b82f6']

// ===== Merged campaign type =====
interface MergedCampaign {
  id: string
  name: string
  source: string
  delivery: string
  objective: string
  category: string
  dailyBudget: number
  metrics: KPIMetrics
  createdAt: string
  isCustom?: boolean
}

// ===== Category Summary Card with trend arrow =====
function CategoryCard({ label, count, spend, revenue, roas, delay, trendPct, onClick, active }: {
  label: string; count: number; spend: number; revenue: number; roas: number; delay: number; trendPct: number; onClick?: () => void; active?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      onClick={onClick}
      className={`bg-white dark:bg-stone-900 rounded-xl border shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer ${
        active ? 'border-orange-500 dark:border-orange-500 ring-1 ring-orange-500/30 border-t-2 border-t-orange-500' : 'border-stone-200/60 dark:border-stone-800 border-t-2 border-t-stone-300 dark:border-t-stone-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">{label}</h4>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${trendPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trendPct >= 0 ? '▲' : '▼'}{Math.abs(trendPct).toFixed(0)}%
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{count} campaign{count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Spend</p>
          <p className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300">${spend.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Revenue</p>
          <p className="text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">${revenue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">ROAS</p>
          <p className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300">{roas.toFixed(2)}x</p>
        </div>
      </div>
    </motion.div>
  )
}

// ===== Loading states =====
function GoogleAdsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-6 w-28 mb-1" /><Skeleton className="h-4 w-28" /></div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
            <Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-7 w-28 mb-2" />
            <Skeleton className="h-4 w-16 mb-3" /><Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
          <Skeleton className="h-5 w-32 mb-4" /><Skeleton className="h-[250px] w-full" />
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
          <Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-[250px] w-full" />
        </div>
      </div>
    </div>
  )
}

// ===== Setup Steps =====
const SETUP_STEPS = [
  { num: 1, title: 'Link Google Ads Account', desc: 'Connect via OAuth2 — takes 30 seconds' },
  { num: 2, title: 'Import Campaigns', desc: 'Auto-sync your active campaigns and ad groups' },
  { num: 3, title: 'Enable Tracking', desc: 'Install conversion pixel for purchase attribution' },
]

// ===== Benefits =====
const BENEFITS = [
  { icon: <BarChart3 className="w-4 h-4 text-orange-600" />, title: 'Real-Time ROAS', desc: 'Track campaign performance with live Google Ads data' },
  { icon: <Zap className="w-4 h-4 text-orange-600" />, title: 'Smart Bidding Insights', desc: 'Understand which keywords and audiences drive profit' },
  { icon: <Shield className="w-4 h-4 text-orange-600" />, title: 'Cross-Channel View', desc: 'Compare Google vs Meta performance side by side' },
]

// ===== Main component =====
export default function GoogleAdsPage() {
  const [view, setView] = useState('performance')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigation((s) => s.navigate)
  const setShowCreateCampaignModal = useNavigation((s) => s.setShowCreateCampaignModal)
  const createdCampaigns = useCampaignsStore((s) => s.createdCampaigns)

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  // Merge seed + user-created Google campaigns
  const allGoogleCampaignsRaw: MergedCampaign[] = useMemo(() => {
    const seed: MergedCampaign[] = (data?.campaigns.filter(c => c.source === 'google') ?? []).map(c => ({
      ...c,
      isCustom: false,
    }))
    const custom: MergedCampaign[] = createdCampaigns
      .filter(c => c.channel === 'google')
      .map(c => {
        const simMetrics = getSimulatedMetrics(c)
        return {
          id: c.id,
          name: c.name,
          source: 'google',
          delivery: c.delivery,
          objective: c.objective,
          category: c.category,
          dailyBudget: c.dailyBudget,
          metrics: simMetrics,
          createdAt: c.createdAt,
          isCustom: true,
        }
      })
    return [...custom, ...seed]
  }, [data, createdCampaigns])

  // Filtered campaigns for the table
  const googleCampaigns = useMemo(() => {
    let filtered = allGoogleCampaignsRaw
    if (categoryFilter) {
      filtered = filtered.filter(c => c.category === categoryFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    }
    return filtered
  }, [allGoogleCampaignsRaw, categoryFilter, searchQuery])

  // Is Google Ads configured?
  const isGoogleConfigured = useMemo(() => {
    if (!data) return false
    return data.integrations.find(i => i.type === 'google-ads')?.configured ?? false
  }, [data])

  // Pie chart data (from all Google campaigns)
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number; categoryKey: string }>()
    allGoogleCampaignsRaw.forEach(c => {
      const existing = map.get(c.category)
      if (existing) {
        existing.value += c.metrics.spend
        existing.count++
      } else {
        map.set(c.category, { name: categoryLabels[c.category] || c.category, value: c.metrics.spend, count: 1, categoryKey: c.category })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [allGoogleCampaignsRaw])

  // Category summary
  const categorySummary = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; spend: number; revenue: number; roas: number; trendPct: number }>()
    allGoogleCampaignsRaw.forEach(c => {
      const existing = map.get(c.category)
      if (existing) {
        existing.count++
        existing.spend += c.metrics.spend
        existing.revenue += c.metrics.revenue
        existing.roas = existing.spend > 0 ? existing.revenue / existing.spend : 0
      } else {
        map.set(c.category, {
          key: c.category,
          label: categoryLabels[c.category] || c.category,
          count: 1, spend: c.metrics.spend, revenue: c.metrics.revenue, roas: c.metrics.roas,
          trendPct: Math.floor(Math.random() * 20) - 5,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend)
  }, [allGoogleCampaignsRaw])

  // Sparkline data (approximate Google's share from daily metrics)
  const sparkRevenue = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.revenue * 0.32)) ?? [], [data])
  const sparkSpend = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.spend * 0.33)) ?? [], [data])
  const sparkRoas = useMemo(() => data?.dailyMetrics.slice(-14).map(d => {
    const s = d.spend * 0.33
    return s > 0 ? Math.round((d.revenue * 0.32 / s) * 100) / 100 : 0
  }) ?? [], [data])
  const sparkPurchases = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.purchases * 0.31)) ?? [], [data])

  // Daily spend data
  const dailySpendData = useMemo(() => {
    if (!data) return []
    return data.dailyMetrics.map(d => ({
      date: d.date,
      spend: Math.round(d.spend * 0.33),
    }))
  }, [data])

  const barChartConfig: ChartConfig = {
    spend: { label: 'Daily Spend', color: '#ea580c' },
  }

  const pieChartConfig: ChartConfig = {
    ...Object.fromEntries(pieData.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }])),
  }

  const handlePieClick = (categoryKey: string | null) => {
    setCategoryFilter(prev => prev === categoryKey ? null : categoryKey)
    setSearchQuery('')
  }

  const handleCategoryClick = (categoryKey: string) => {
    handlePieClick(categoryFilter === categoryKey ? null : categoryKey)
  }

  if (isLoading) return <GoogleAdsSkeleton />
  if (!data) return null

  const kpi = data.googleKpi

  return (
    <div className="space-y-6">
      {/* Setup Required Banner - Enhanced */}
      {!isGoogleConfigured && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200/80 dark:border-orange-800/40 rounded-xl overflow-hidden"
        >
          <div className="p-5 pb-0">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-orange-900 dark:text-orange-300">Connect Google Ads</h4>
                <p className="text-sm text-orange-700/80 dark:text-orange-400/80 mt-1 leading-relaxed">
                  Link your Google Ads account to unlock live campaign data, automated insights, and cross-channel performance analysis.
                </p>
              </div>
            </div>
          </div>

          {/* Numbered Setup Steps */}
          <div className="px-5 pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SETUP_STEPS.map((step) => (
                <div key={step.num} className="flex items-start gap-3 bg-white/60 dark:bg-stone-900/40 rounded-lg p-3 border border-orange-100/60 dark:border-orange-800/30">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {step.num}
                    </div>
                    {step.num < 3 && <div className="w-px h-2 bg-orange-300 dark:bg-orange-700" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-orange-900 dark:text-orange-300">{step.title}</p>
                    <p className="text-[11px] text-orange-600/70 dark:text-orange-400/70 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="px-5 pb-5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-orange-500 dark:text-orange-400 mb-2.5">Why connect Google Ads?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/60 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">{b.title}</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={() => navigate('settings')}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2 h-9 text-sm font-medium shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Connect Google Ads
              </Button>
              <Button
                onClick={() => toast.info('Google Ads integration requires API credentials')}
                variant="outline"
                className="gap-2 h-9 text-sm font-medium border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <Play className="w-4 h-4" />
                Try Demo
              </Button>
              <span className="text-[11px] text-stone-400 dark:text-stone-500">Takes less than 2 minutes</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Google Ads</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-medium border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400">Last 30 days</Badge>
            {isGoogleConfigured ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-orange-500 dark:text-orange-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
                </span>
                Demo Data
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateCampaignModal(true)}
            className="h-8 text-xs gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Campaign
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
        </div>
      </motion.div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          value={`$${kpi.revenue.toLocaleString()}`}
          trend={6}
          trendValue="6%"
          sparkData={sparkRevenue}
          color="#ea580c"
          delay={0.1}
        />
        <KpiCard
          label="Ad Spend"
          value={`$${kpi.spend.toLocaleString()}`}
          trend={4}
          trendValue="4%"
          sparkData={sparkSpend}
          color="#78716c"
          delay={0.15}
        />
        <KpiCard
          label="ROAS"
          value={`${kpi.roas.toFixed(2)}x`}
          trend={-2}
          trendValue="2%"
          sparkData={sparkRoas}
          color="#059669"
          delay={0.2}
        />
        <KpiCard
          label="Purchases"
          value={kpi.purchases.toLocaleString()}
          trend={9}
          trendValue="9%"
          sparkData={sparkPurchases}
          color="#7c3aed"
          delay={0.25}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spend Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Daily Spend</h3>
          </div>
          <div className="h-[250px]">
            <ChartContainer config={barChartConfig}>
              <BarChart data={dailySpendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => {
                        const d = new Date(label as string)
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }}
                    />
                  }
                />
                <Bar dataKey="spend" fill="#ea580c" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ChartContainer>
          </div>
        </motion.div>

        {/* Spend Distribution Pie - Clickable */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Spend Distribution</h3>
            </div>
            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="text-[10px] text-orange-600 dark:text-orange-400 font-medium hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="h-[250px]">
            <ChartContainer config={pieChartConfig}>
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                  }
                />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                  cursor="pointer"
                  onClick={(entry) => handlePieClick(entry.categoryKey)}
                  opacity={({ name }) => !categoryFilter || name === (pieData.find(p => p.categoryKey === categoryFilter)?.name) ? 1 : 0.3}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke={categoryFilter === entry.categoryKey ? '#fff' : 'none'}
                      strokeWidth={categoryFilter === entry.categoryKey ? 2 : 0}
                    />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          </div>
        </motion.div>
      </div>

      {/* Campaign Category Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Campaign Categories</h3>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter(null)}
              className="text-[10px] text-orange-600 dark:text-orange-400 font-medium hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorySummary.map((cat, i) => (
            <CategoryCard
              key={cat.label}
              label={cat.label}
              count={cat.count}
              spend={cat.spend}
              revenue={cat.revenue}
              roas={cat.roas}
              delay={0.45 + i * 0.05}
              trendPct={cat.trendPct}
              onClick={() => handleCategoryClick(cat.key)}
              active={categoryFilter === cat.key}
            />
          ))}
        </div>
      </motion.div>

      {/* Campaign Table with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              All Campaigns
              {categoryFilter && (
                <span className="ml-2 text-xs font-normal text-orange-600 dark:text-orange-400">
                  (filtered: {categoryLabels[categoryFilter] || categoryFilter})
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-48 pl-8 text-xs bg-stone-50/80 dark:bg-stone-800 border-stone-200/60 dark:border-stone-700"
              />
            </div>
            <Tabs value={view} onValueChange={setView}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="performance" className="text-[11px] px-2.5 h-6">Performance</TabsTrigger>
                <TabsTrigger value="details" className="text-[11px] px-2.5 h-6">Details</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {view === 'performance' ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:bg-stone-800/30 border-b-2 border-b-stone-200 dark:border-b-stone-700">
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Campaign</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Delivery</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Category</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Budget/Day</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Spend</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Revenue</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-center">ROAS</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {googleCampaigns.sort((a, b) => b.metrics.spend - a.metrics.spend).map((c, i) => (
                  <TableRow key={c.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors`}>
                    <TableCell className="py-2.5">
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100 max-w-[220px] truncate block cursor-default">
                            {c.name}
                            {c.isCustom && (
                              <Badge className="ml-1.5 px-1.5 py-0 h-4 text-[9px] font-bold bg-orange-600 hover:bg-orange-600 text-white border-0">New</Badge>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          {c.name}
                        </TooltipContent>
                      </ShadcnTooltip>
                    </TableCell>
                    <TableCell className="py-2.5"><DeliveryDot status={c.delivery} /></TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-stone-600 dark:text-stone-400">{categoryLabels[c.category] || c.category}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">${c.dailyBudget}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-700 dark:text-stone-300">${c.metrics.spend.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-900 dark:text-stone-100 font-medium">${c.metrics.revenue.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center"><RoasPill roas={c.metrics.roas} /></TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-700 dark:text-stone-300">{c.metrics.purchases}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:bg-stone-800/30 border-b-2 border-b-stone-200 dark:border-b-stone-700">
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Campaign</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Delivery</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Category</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Spend</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-center">CTR</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Impressions</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-center">Freq</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">CPM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {googleCampaigns.sort((a, b) => b.metrics.spend - a.metrics.spend).map((c, i) => (
                  <TableRow key={c.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors`}>
                    <TableCell className="py-2.5">
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100 max-w-[220px] truncate block cursor-default">
                            {c.name}
                            {c.isCustom && (
                              <Badge className="ml-1.5 px-1.5 py-0 h-4 text-[9px] font-bold bg-orange-600 hover:bg-orange-600 text-white border-0">New</Badge>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          {c.name}
                        </TooltipContent>
                      </ShadcnTooltip>
                    </TableCell>
                    <TableCell className="py-2.5"><DeliveryDot status={c.delivery} /></TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-stone-600 dark:text-stone-400">{categoryLabels[c.category] || c.category}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-700 dark:text-stone-300">${c.metrics.spend.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <span className="text-sm tabular-nums text-stone-700 dark:text-stone-300">{c.metrics.ctr.toFixed(2)}%</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">{(c.metrics.impressions / 1000).toFixed(1)}k</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">{c.metrics.frequency.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400">${c.metrics.cpm.toFixed(2)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  )
}