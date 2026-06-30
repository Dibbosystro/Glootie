'use client'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, RefreshCw, BarChart3, PieChartIcon, Plus, Search, Download,
  PauseCircle, Archive, X,
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
import { Checkbox } from '@/components/ui/checkbox'

import { toast } from 'sonner'
import { useNavigation } from '@/store/navigation'
import { useCampaignsStore, getSimulatedMetrics } from '@/store/campaigns'
import type { DashboardData, KPIMetrics } from '@/lib/types'
import { useMemo, useState, useCallback } from 'react'

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
      className="bg-gradient-to-b from-white to-stone-50/80 dark:from-stone-900 dark:to-stone-800 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 overflow-hidden cursor-default transition-shadow hover:shadow-md"
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

const PIE_COLORS = ['#b45309', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#3b82f6']

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
        active ? 'border-amber-500 dark:border-amber-500 ring-1 ring-amber-500/30 border-t-2 border-t-amber-500' : 'border-stone-200/60 dark:border-stone-800 border-t-2 border-t-stone-300 dark:border-t-stone-600'
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

// ===== Merged campaign type (union of seed Campaign and user CreatedCampaign) =====
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

// ===== Loading states =====
function MetaAdsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-4 w-28" /></div>
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

// ===== Main component =====
export default function MetaAdsPage() {
  const [view, setView] = useState('performance')
  const [pieFilter, setPieFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const navigate = useNavigation((s) => s.navigate)
  const setShowCreateCampaignModal = useNavigation((s) => s.setShowCreateCampaignModal)
  const createdCampaigns = useCampaignsStore((s) => s.createdCampaigns)

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  // Merge seed + user-created meta campaigns
  const allMetaCampaignsRaw: MergedCampaign[] = useMemo(() => {
    const seed: MergedCampaign[] = (data?.campaigns.filter(c => c.source === 'meta') ?? []).map(c => ({
      ...c,
      isCustom: false,
    }))
    const custom: MergedCampaign[] = createdCampaigns
      .filter(c => c.channel === 'meta')
      .map(c => {
        const simMetrics = getSimulatedMetrics(c)
        return {
          id: c.id,
          name: c.name,
          source: 'meta',
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
  const metaCampaigns = useMemo(() => {
    let filtered = allMetaCampaignsRaw
    if (pieFilter) {
      filtered = filtered.filter(c => c.category === pieFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    }
    return filtered
  }, [allMetaCampaignsRaw, pieFilter, searchQuery])

  // Pie chart data: spend by category
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number; categoryKey: string }>()
    allMetaCampaignsRaw.forEach(c => {
      const existing = map.get(c.category)
      if (existing) {
        existing.value += c.metrics.spend
        existing.count++
      } else {
        map.set(c.category, { name: categoryLabels[c.category] || c.category, value: c.metrics.spend, count: 1, categoryKey: c.category })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [allMetaCampaignsRaw])

  // Category summary
  const categorySummary = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; spend: number; revenue: number; roas: number; trendPct: number }>()
    allMetaCampaignsRaw.forEach(c => {
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
  }, [allMetaCampaignsRaw])

  // Sparkline data (dailyMetrics is real Meta account daily, use it directly)
  const sparkRevenue = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.revenue)) ?? [], [data])
  const sparkSpend = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.spend)) ?? [], [data])
  const sparkRoas = useMemo(() => data?.dailyMetrics.slice(-14).map(d => {
    return d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : 0
  }) ?? [], [data])
  const sparkPurchases = useMemo(() => data?.dailyMetrics.slice(-14).map(d => Math.round(d.purchases)) ?? [], [data])

  // Daily spend data
  const dailySpendData = useMemo(() => {
    if (!data) return []
    return data.dailyMetrics.map(d => ({
      date: d.date,
      spend: Math.round(d.spend),
    }))
  }, [data])

  const barChartConfig: ChartConfig = {
    spend: { label: 'Daily Spend', color: '#b45309' },
  }

  const pieChartConfig: ChartConfig = {
    ...Object.fromEntries(pieData.map((d, i) => [d.name, { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }])),
  }

  const handlePieClick = (categoryKey: string | null) => {
    setPieFilter(prev => prev === categoryKey ? null : categoryKey)
    setSearchQuery('')
  }

  const handleCategoryClick = (categoryKey: string) => {
    handlePieClick(pieFilter === categoryKey ? null : categoryKey)
  }

  // ===== Selection logic =====
  const allVisibleIds = useMemo(() => metaCampaigns.map(c => c.id), [metaCampaigns])
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))
  const someSelected = allVisibleIds.some(id => selectedIds.has(id)) && !allSelected

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allVisibleIds))
    }
  }, [allSelected, allVisibleIds])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectedCampaigns = useMemo(
    () => metaCampaigns.filter(c => selectedIds.has(c.id)),
    [metaCampaigns, selectedIds]
  )

  const handlePauseSelected = useCallback(() => {
    const count = selectedCampaigns.length
    toast.success(`${count} campaign${count !== 1 ? 's' : ''} paused`)
    setSelectedIds(new Set())
  }, [selectedCampaigns.length])

  const handleArchiveSelected = useCallback(() => {
    const count = selectedCampaigns.length
    toast.success(`${count} campaign${count !== 1 ? 's' : ''} archived`)
    setSelectedIds(new Set())
  }, [selectedCampaigns.length])

  const handleExportSelectedCSV = useCallback(() => {
    const campaigns = selectedCampaigns
    const headers = ['Name', 'Channel', 'Status', 'Objective', 'Category', 'Daily Budget', 'Spend', 'Revenue', 'ROAS', 'Purchases', 'Clicks', 'CTR', 'CPM']
    const rows = campaigns.map(c => [
      `"${c.name}"`,
      'Meta',
      c.delivery,
      c.objective,
      categoryLabels[c.category] || c.category,
      c.dailyBudget.toFixed(2),
      c.metrics.spend.toFixed(2),
      c.metrics.revenue.toFixed(2),
      c.metrics.roas.toFixed(2),
      c.metrics.purchases,
      c.metrics.clicks,
      c.metrics.ctr.toFixed(2) + '%',
      c.metrics.cpm.toFixed(2),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-ads-selected-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} exported!`)
    setSelectedIds(new Set())
  }, [selectedCampaigns])

  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Channel', 'Status', 'Objective', 'Category', 'Daily Budget', 'Spend', 'Revenue', 'ROAS', 'Purchases', 'Clicks', 'CTR', 'CPM']
    const rows = metaCampaigns.map(c => [
      `"${c.name}"`,
      'Meta',
      c.delivery,
      c.objective,
      categoryLabels[c.category] || c.category,
      c.dailyBudget.toFixed(2),
      c.metrics.spend.toFixed(2),
      c.metrics.revenue.toFixed(2),
      c.metrics.roas.toFixed(2),
      c.metrics.purchases,
      c.metrics.clicks,
      c.metrics.ctr.toFixed(2) + '%',
      c.metrics.cpm.toFixed(2),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meta-ads-campaigns-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Campaigns exported!')
  }, [metaCampaigns])

  if (isLoading) return <MetaAdsSkeleton />
  if (!data) return null

  const kpi = data.metaKpi

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Meta Ads</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-medium border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400">Last 30 days</Badge>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Connected
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateCampaignModal(true)}
            className="h-8 text-xs gap-1.5 bg-amber-700 hover:bg-amber-800 text-white"
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
          trend={14}
          trendValue="14%"
          sparkData={sparkRevenue}
          color="#b45309"
          delay={0.05}
        />
        <KpiCard
          label="Ad Spend"
          value={`$${kpi.spend.toLocaleString()}`}
          trend={10}
          trendValue="10%"
          sparkData={sparkSpend}
          color="#78716c"
          delay={0.1}
        />
        <KpiCard
          label="ROAS"
          value={`${kpi.roas.toFixed(2)}x`}
          trend={8}
          trendValue="8%"
          sparkData={sparkRoas}
          color="#059669"
          delay={0.15}
        />
        <KpiCard
          label="Purchases"
          value={kpi.purchases.toLocaleString()}
          trend={18}
          trendValue="18%"
          sparkData={sparkPurchases}
          color="#7c3aed"
          delay={0.2}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spend Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
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
                <Bar dataKey="spend" fill="#b45309" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ChartContainer>
          </div>
        </motion.div>

        {/* Spend Distribution Pie - Clickable */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Spend Distribution</h3>
            </div>
            {pieFilter && (
              <button
                onClick={() => setPieFilter(null)}
                className="text-[10px] text-amber-700 dark:text-amber-500 font-medium hover:underline"
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
                  opacity={({ name }) => !pieFilter || name === (pieData.find(p => p.categoryKey === pieFilter)?.name) ? 1 : 0.3}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke={pieFilter === entry.categoryKey ? '#fff' : 'none'}
                      strokeWidth={pieFilter === entry.categoryKey ? 2 : 0}
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
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Campaign Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorySummary.map((cat, i) => (
            <CategoryCard
              key={cat.label}
              label={cat.label}
              count={cat.count}
              spend={cat.spend}
              revenue={cat.revenue}
              roas={cat.roas}
              delay={0.4 + i * 0.05}
              trendPct={cat.trendPct}
              onClick={() => handleCategoryClick(cat.key)}
              active={pieFilter === cat.key}
            />
          ))}
        </div>
      </motion.div>

      {/* Campaign Table with Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              All Campaigns
              {pieFilter && (
                <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-500">
                  (filtered: {categoryLabels[pieFilter] || pieFilter})
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-7 gap-1.5 text-xs border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Tabs value={view} onValueChange={setView}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="performance" className="text-[11px] px-2.5 h-6">Performance</TabsTrigger>
                <TabsTrigger value="details" className="text-[11px] px-2.5 h-6">Details</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Batch Action Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="sticky top-0 z-10 bg-amber-600 text-white rounded-t-xl -m-5 mb-4 px-4 py-2.5 flex items-center justify-between"
            >
              <span className="text-sm font-medium">
                {selectedIds.size} campaign{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePauseSelected}
                  className="h-7 text-xs gap-1.5 text-white hover:bg-amber-500 hover:text-white"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Pause Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveSelected}
                  className="h-7 text-xs gap-1.5 text-white hover:bg-amber-500 hover:text-white"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportSelectedCSV}
                  className="h-7 text-xs gap-1.5 text-white hover:bg-amber-500 hover:text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Selected
                </Button>
                <div className="w-px h-4 bg-amber-500/50 mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 text-xs gap-1 text-white/80 hover:bg-amber-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Selection
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'performance' ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:bg-stone-800/30 border-b-2 border-b-stone-200 dark:border-b-stone-700">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSelectAll()}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=indeterminate]:bg-amber-500 data-[state=indeterminate]:border-amber-500"
                    />
                  </TableHead>
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
                {metaCampaigns.sort((a, b) => b.metrics.spend - a.metrics.spend).map((c, i) => (
                  <TableRow key={c.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} ${selectedIds.has(c.id) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors`}>
                    <TableCell className="py-2.5 w-10">
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100 max-w-[220px] truncate block cursor-default">
                            {c.name}
                            {c.isCustom && (
                              <Badge className="ml-1.5 px-1.5 py-0 h-4 text-[9px] font-bold bg-amber-600 hover:bg-amber-600 text-white border-0">New</Badge>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSelectAll()}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=indeterminate]:bg-amber-500 data-[state=indeterminate]:border-amber-500"
                    />
                  </TableHead>
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
                {metaCampaigns.sort((a, b) => b.metrics.spend - a.metrics.spend).map((c, i) => (
                  <TableRow key={c.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} ${selectedIds.has(c.id) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors`}>
                    <TableCell className="py-2.5 w-10">
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100 max-w-[220px] truncate block cursor-default">
                            {c.name}
                            {c.isCustom && (
                              <Badge className="ml-1.5 px-1.5 py-0 h-4 text-[9px] font-bold bg-amber-600 hover:bg-amber-600 text-white border-0">New</Badge>
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