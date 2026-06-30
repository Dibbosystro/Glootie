'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, ShoppingBag, ArrowUpRight, AlertTriangle, PauseCircle, ArrowRight, Plus, Inbox, Sparkles, Facebook, Search as SearchIcon, Eye, MousePointerClick, ShoppingCart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNavigation } from '@/store/navigation'
import type { DashboardData, Product, PageKey } from '@/lib/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { X, Clock, RefreshCw } from 'lucide-react'

// ===== Relative time helper =====
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

// ===== Sparkline for KPI cards =====
function KpiSparkline({ data, color }: { data: number[]; color: string }) {
  const sparkData = data.map((v, i) => ({ i, v }))
  return (
    <div className="h-10 w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={sparkData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ===== Animated KPI Value =====
function AnimatedKpiValue({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current === value) return
    const start = prevValue.current
    const end = value
    const duration = 600
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplayed(decimals > 0 ? Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals) : Math.round(current))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
    prevValue.current = value
  }, [value, decimals])

  const formatted = decimals > 0
    ? `${prefix}${displayed.toFixed(decimals)}${suffix}`
    : displayed >= 1000
      ? `${prefix}${displayed.toLocaleString()}${suffix}`
      : `${prefix}${displayed}${suffix}`

  return <span>{formatted}</span>
}

// ===== KPI Card =====
function KpiCard({
  label, value, trend, trendValue, sparkData, color, delay, borderClass,
  numericValue, prefix, suffix, decimals,
}: {
  label: string; value: string; trend: number; trendValue: string; sparkData: number[]; color: string; delay: number; borderClass?: string
  numericValue?: number; prefix?: string; suffix?: string; decimals?: number
}) {
  return (
    <div className="relative">
      <div className="before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-amber-200/40 before:to-orange-200/40 dark:before:from-amber-500/20 dark:before:to-orange-500/20 before:-z-10 before:blur-sm" />
      <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" />
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-gradient-to-b from-white to-stone-50/80 dark:from-stone-900 dark:to-stone-800 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 overflow-hidden cursor-default hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${borderClass ?? ''}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
          {numericValue !== undefined ? (
            <AnimatedKpiValue value={numericValue} prefix={prefix} suffix={suffix} decimals={decimals} />
          ) : value}
        </span>
        <div className={`inline-flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'} px-1.5 py-0.5 rounded-full`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trendValue}
        </div>
      </div>
      <div className="mt-3">
        <KpiSparkline data={sparkData} color={color} />
      </div>
    </motion.div>
    </div>
  )
}

// ===== Loading skeletons =====
function KpiSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-stone-200 dark:bg-stone-800 rounded-lg h-24" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="animate-in fade-in duration-500 delay-100">
      <div className="animate-pulse bg-stone-200 dark:bg-stone-800 rounded-lg h-64" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-in fade-in duration-500 delay-150">
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
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

// ===== Channel badge =====
function ChannelBadge({ source }: { source: string }) {
  if (source === 'meta') {
    return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-0 text-[10px] font-semibold">Meta</Badge>
  }
  return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-0 text-[10px] font-semibold">Google</Badge>
}

// ===== Main component =====
export default function DashboardPage() {
  const [period, setPeriod] = useState('30d')
  const { navigate, setShowCreateCampaignModal } = useNavigation()

  const [lastUpdatedTick, setLastUpdatedTick] = useState(0)

  const { data, isLoading, dataUpdatedAt } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const hasRefreshedOnce = dataUpdatedAt > 0
  const lastFetchedAt = dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toISOString() : null

  // Tick every 10s to update relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdatedTick(t => t + 1)
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  // Suppress unused var warning
  void lastUpdatedTick

  // Derive period-filtered daily metrics
  const filteredMetrics = useMemo(() => {
    if (!data) return []
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    return data.dailyMetrics.slice(-days)
  }, [data, period])

  // Top 5 campaigns by spend
  const topCampaigns = useMemo(() => {
    if (!data) return []
    return [...data.campaigns].sort((a, b) => b.metrics.spend - a.metrics.spend).slice(0, 5)
  }, [data])

  // Channel split
  const channelSplit = useMemo(() => {
    if (!data) return { meta: 0, google: 0, total: 0 }
    const meta = data.metaKpi.spend
    const google = data.googleKpi.spend
    return { meta, google, total: meta + google }
  }, [data])

  // Attention items
  const attentionItems = useMemo(() => {
    if (!data) return []
    const items: { type: string; text: string; severity: 'amber' | 'orange' | 'red'; iconType: 'low_stock' | 'paused' }[] = []
    data.products.forEach(p => {
      if (p.inventoryQty < 15 && p.status === 'active') {
        items.push({
          type: 'Low Stock',
          text: `${p.title.length > 40 ? p.title.slice(0, 40) + '...' : p.title} — ${p.inventoryQty} units left`,
          severity: p.inventoryQty < 10 ? 'red' : 'amber',
          iconType: 'low_stock',
        })
      }
    })
    data.campaigns.forEach(c => {
      if (c.delivery === 'paused' || c.delivery === 'not_delivering') {
        items.push({
          type: 'Campaign Paused',
          text: c.name,
          severity: 'orange',
          iconType: 'paused',
        })
      }
    })
    return items.slice(0, 4)
  }, [data])

  // Top 3 products by revenue (for sidebar)
  const topProducts = useMemo(() => {
    if (!data) return []
    return [...data.products].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 3)
  }, [data])

  // Top 5 products by revenue (for widget)
  const top5Products = useMemo(() => {
    if (!data) return []
    return [...data.products].sort((a, b) => (b.price * b.sales30d) - (a.price * a.sales30d)).slice(0, 5)
  }, [data])

  const maxTopRevenue = useMemo(() => {
    if (top5Products.length === 0) return 0
    return Math.max(...top5Products.map(p => p.price * p.sales30d))
  }, [top5Products])

  // Channel breakdown for widget
  const channelBreakdown = useMemo(() => {
    if (!data) return { meta: { spend: 0, revenue: 0, roas: '0.00' }, google: { spend: 0, revenue: 0, roas: '0.00' }, totalSpend: 0 }
    const metaCampaigns = data.campaigns.filter(c => c.source === 'meta')
    const googleCampaigns = data.campaigns.filter(c => c.source === 'google')
    const metaSpend = metaCampaigns.reduce((s, c) => s + c.metrics.spend, 0)
    const metaRevenue = metaCampaigns.reduce((s, c) => s + c.metrics.revenue, 0)
    const googleSpend = googleCampaigns.reduce((s, c) => s + c.metrics.spend, 0)
    const googleRevenue = googleCampaigns.reduce((s, c) => s + c.metrics.revenue, 0)
    return {
      meta: { spend: metaSpend, revenue: metaRevenue, roas: metaSpend > 0 ? (metaRevenue / metaSpend).toFixed(2) : '0.00' },
      google: { spend: googleSpend, revenue: googleRevenue, roas: googleSpend > 0 ? (googleRevenue / googleSpend).toFixed(2) : '0.00' },
      totalSpend: metaSpend + googleSpend,
    }
  }, [data])

  // Pre-calculated spend percentages for channel breakdown animation
  const metaSpendPct = useMemo(() => channelBreakdown.totalSpend > 0 ? (channelBreakdown.meta.spend / channelBreakdown.totalSpend) * 100 : 0, [channelBreakdown])
  const googleSpendPct = useMemo(() => channelBreakdown.totalSpend > 0 ? (channelBreakdown.google.spend / channelBreakdown.totalSpend) * 100 : 0, [channelBreakdown])

  // Recent activities
  const recentActivities = useMemo(() => {
    if (!data) return []
    return data.activities.slice(0, 3)
  }, [data])

  // Sparkline data from daily metrics
  const sparkRevenue = useMemo(() => data?.dailyMetrics.slice(-14).map(d => d.revenue) ?? [], [data])
  const sparkSpend = useMemo(() => data?.dailyMetrics.slice(-14).map(d => d.spend) ?? [], [data])
  const sparkRoas = useMemo(() => data?.dailyMetrics.slice(-14).map(d => d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : 0) ?? [], [data])
  const sparkPurchases = useMemo(() => data?.dailyMetrics.slice(-14).map(d => d.purchases) ?? [], [data])

  // Conversion funnel data (last 30 days)
  const funnelData = useMemo(() => {
    if (!data) return { impressions: 0, clicks: 0, addToCart: 0, purchases: 0 }
    const last30 = data.dailyMetrics.slice(-30)
    const impressions = last30.reduce((s, d) => s + d.impressions, 0)
    const clicks = last30.reduce((s, d) => s + d.clicks, 0)
    const addToCart = Math.round(clicks * 0.18)
    const purchases = data.kpi.purchases
    return { impressions, clicks, addToCart, purchases }
  }, [data])

  const overallConversionRate = useMemo(() => {
    return funnelData.impressions > 0 ? (funnelData.purchases / funnelData.impressions) * 100 : 0
  }, [funnelData])

  const revenueChartConfig: ChartConfig = {
    revenue: { label: 'Revenue', color: '#b45309' },
    spend: { label: 'Spend', color: '#a8a29e' },
  }

  // Welcome banner dismiss state
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('glootie-welcome-dismissed') !== 'true'
  })

  const dismissWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem('glootie-welcome-dismissed', 'true')
  }

  // Quick actions definition
  const quickActions: { icon: React.ComponentType<{ className?: string }>; label: string; page?: PageKey; action?: string; color: string }[] = [
    { icon: Plus, label: 'Create Campaign', action: 'create-campaign', color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
    { icon: ShoppingBag, label: 'Add Product', page: 'products', color: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
    { icon: Inbox, label: 'View Inbox', page: 'inbox', color: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800' },
    { icon: Sparkles, label: 'Generate Copy', page: 'ad-copy', color: 'text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <KpiSkeletons />
        <ChartSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><TableSkeleton /></div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
              <Skeleton className="h-5 w-28 mb-4" />
              <Skeleton className="h-16 w-full mb-3" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full mb-2" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpi } = data

  const metaPct = channelSplit.total > 0 ? ((channelSplit.meta / channelSplit.total) * 100) : 0
  const googlePct = channelSplit.total > 0 ? ((channelSplit.google / channelSplit.total) * 100) : 0
  const metaTrend = metaPct > 60 ? 'up' : metaPct < 40 ? 'down' : 'neutral'
  const googleTrend = googlePct > 60 ? 'up' : googlePct < 40 ? 'down' : 'neutral'

  return (
    <div className="space-y-6">
      {/* Live indicator + Last updated */}
      <div className="flex items-center gap-3">
        {hasRefreshedOnce && (
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Live</span>
          </span>
        )}
        {lastFetchedAt && (
          <span className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
            <RefreshCw className="size-3" />
            Last updated {formatRelativeTime(lastFetchedAt)}
          </span>
        )}
      </div>

      {/* A0. Welcome Banner */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative rounded-xl border border-amber-200/60 dark:border-amber-700/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-400/10 dark:from-amber-900/20 dark:via-orange-900/10 dark:to-amber-800/20 p-4 sm:p-5 animate-[gradient_3s_ease_infinite] bg-[length:200%_200%]">
              <button
                onClick={dismissWelcome}
                className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0 mt-0.5">👋</span>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Welcome back, Cafe Racer Garage
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Here's what's happening with your store today
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:flex-shrink-0 sm:ml-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-300">
                    <Clock className="w-3 h-3" />
                    Last sync: 1h ago
                  </div>
                  <button
                    onClick={() => navigate('activity')}
                    className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                  >
                    View Activity
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A. KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Revenue"
          value={`$${kpi.revenue.toLocaleString()}`}
          trend={12}
          trendValue="12%"
          sparkData={sparkRevenue}
          color="#b45309"
          delay={0}
          borderClass="border-l-2 border-l-amber-500 dark:border-l-amber-500/60"
          numericValue={kpi.revenue}
          prefix="$"
        />
        <KpiCard
          label="Ad Spend"
          value={`$${kpi.spend.toLocaleString()}`}
          trend={8}
          trendValue="8%"
          sparkData={sparkSpend}
          color="#78716c"
          delay={0.05}
          borderClass="border-l-2 border-l-stone-400 dark:border-l-stone-500/60"
          numericValue={kpi.spend}
          prefix="$"
        />
        <KpiCard
          label="ROAS"
          value={`${kpi.roas.toFixed(2)}x`}
          trend={5}
          trendValue="5%"
          sparkData={sparkRoas}
          color="#059669"
          delay={0.1}
          borderClass="border-l-2 border-l-emerald-500 dark:border-l-emerald-500/60"
          numericValue={kpi.roas}
          suffix="x"
          decimals={2}
        />
        <KpiCard
          label="Purchases"
          value={kpi.purchases.toLocaleString()}
          trend={15}
          trendValue="15%"
          sparkData={sparkPurchases}
          color="#7c3aed"
          delay={0.15}
          borderClass="border-l-2 border-l-violet-500 dark:border-l-violet-500/60"
          numericValue={kpi.purchases}
        />
      </div>

      {/* A2. Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            data-tour={action.action === 'create-campaign' ? 'create-campaign' : undefined}
            onClick={() => {
              if (action.action === 'create-campaign') {
                setShowCreateCampaignModal(true)
              } else if (action.page) {
                navigate(action.page)
              }
            }}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200/60 dark:border-stone-700/50 backdrop-blur-sm bg-white/80 dark:bg-stone-800/80 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 text-left group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color}`}>
              <action.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-stone-700 dark:text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* A3. Top Products + Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Widget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Top Products</h3>
            <button
              onClick={() => navigate('products')}
              className="text-xs text-amber-700 dark:text-amber-500 font-medium hover:text-amber-800 dark:hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-2.5 pr-3">
              {top5Products.map((p, i) => {
                const revenueShare = maxTopRevenue > 0 ? (p.revenue30d / maxTopRevenue) * 100 : 0
                const last7 = p.revenue30d * (0.28 + Math.sin(i * 1.5) * 0.08)
                const prev7 = p.revenue30d * (0.22 + Math.cos(i * 2.1) * 0.06)
                const trendPct = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : 0
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate('product-detail', p.id)}
                    className="flex items-center gap-3 w-full text-left group hover:bg-stone-50 dark:hover:bg-stone-800/50 -mx-1 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 w-4 text-right tabular-nums">{i + 1}</span>
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${revenueShare}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                            className="h-full bg-amber-500 dark:bg-amber-600 rounded-full"
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-stone-400 dark:text-stone-500 w-6 text-right">{Math.round(revenueShare)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {trendPct >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100 w-16 text-right">{"$"}{p.revenue30d.toLocaleString()}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Channel Breakdown Widget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Channel Breakdown</h3>
          <div className="space-y-3">
            {/* Meta Card */}
            <div className="rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/10 p-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">Meta Ads</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">6 campaigns</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Spend</p>
                  <p className="text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-300">${channelBreakdown.meta.spend.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Revenue</p>
                  <p className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">${channelBreakdown.meta.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">ROAS</p>
                  <p className="text-xs font-semibold tabular-nums text-green-600 dark:text-green-400">{channelBreakdown.meta.roas}x</p>
                </div>
              </div>
              <div className="h-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: String(metaSpendPct) + '%' }}
                  transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            {/* VS Badge */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 shadow-sm">
                VS
              </span>
            </div>

            {/* Google Card */}
            <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10 p-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <SearchIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">Google Ads</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">3 campaigns</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Spend</p>
                  <p className="text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-300">${channelBreakdown.google.spend.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Revenue</p>
                  <p className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">${channelBreakdown.google.revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">ROAS</p>
                  <p className="text-xs font-semibold tabular-nums text-green-600 dark:text-green-400">{channelBreakdown.google.roas}x</p>
                </div>
              </div>
              <div className="h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: String(googleSpendPct) + '%' }}
                  transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* A4. Conversion Funnel + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Conversion Funnel</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Last 30 days performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Overall</span>
              <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{overallConversionRate.toFixed(2)}%</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Impressions', value: funnelData.impressions, icon: Eye, pct: 100, rate: null, color: 'from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600' },
              { label: 'Clicks', value: funnelData.clicks, icon: MousePointerClick, pct: funnelData.impressions > 0 ? (funnelData.clicks / funnelData.impressions) * 100 : 0, rate: funnelData.impressions > 0 ? (funnelData.clicks / funnelData.impressions) * 100 : 0, color: 'from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600' },
              { label: 'Add to Cart', value: funnelData.addToCart, icon: ShoppingCart, pct: funnelData.impressions > 0 ? (funnelData.addToCart / funnelData.impressions) * 100 : 0, rate: funnelData.clicks > 0 ? (funnelData.addToCart / funnelData.clicks) * 100 : 0, color: 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700' },
              { label: 'Purchase', value: funnelData.purchases, icon: ShoppingBag, pct: funnelData.impressions > 0 ? (funnelData.purchases / funnelData.impressions) * 100 : 0, rate: funnelData.addToCart > 0 ? (funnelData.purchases / funnelData.addToCart) * 100 : 0, color: 'from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800' },
            ].map((stage, i) => {
              const minWidth = Math.max(stage.pct, 12)
              return (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.4 + i * 0.08, ease: 'easeOut' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <stage.icon className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{stage.label}</span>
                      {stage.rate !== null && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                          {stage.rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                      {stage.value >= 1000 ? `${(stage.value / 1000).toFixed(1)}k` : stage.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-8 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${minWidth}%` }}
                      transition={{ duration: 0.7, delay: 0.45 + i * 0.1, ease: 'easeOut' }}
                      className={`h-full bg-gradient-to-r ${stage.color} rounded-lg relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] bg-[size:200%_100%]" />
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Quick Insights */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-6"
        >
          {/* Overall Conversion Rate Card */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Conversion Rate</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{overallConversionRate.toFixed(2)}%</span>
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">Impressions → Purchases</p>
            <div className="mt-3 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(overallConversionRate * 10, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              />
            </div>
          </div>

          {/* Key Ratios */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">Key Ratios</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">CTR</span>
                <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {kpi.ctr.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">CPM</span>
                <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  ${kpi.cpm.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">Frequency</span>
                <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {kpi.frequency.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">Reach</span>
                <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {kpi.reach >= 1000 ? `${(kpi.reach / 1000).toFixed(1)}k` : kpi.reach.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">Cart→Purchase</span>
                <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {funnelData.addToCart > 0 ? ((funnelData.purchases / funnelData.addToCart) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* B. Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 overflow-hidden hover:shadow-md transition-shadow bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_1px,transparent_1px)] dark:bg-[size:20px_20px]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Revenue vs Spend</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Performance over time</p>
          </div>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="7d" className="text-xs px-3 h-7">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-3 h-7">30d</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-3 h-7">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px]">
          <ChartContainer config={revenueChartConfig}>
            <AreaChart data={filteredMetrics} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b45309" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#b45309" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a8a29e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a8a29e" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-stone-200 dark:stroke-stone-700" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => {
                  const d = new Date(v)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="backdrop-blur-sm bg-white/90 dark:bg-stone-800/90"
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    labelFormatter={(label) => {
                      const d = new Date(label as string)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                }
              />
              <Area type="monotone" dataKey="revenue" stroke="#b45309" strokeWidth={2.5} fill="url(#revenueGrad)" />
              <Area type="monotone" dataKey="spend" stroke="#a8a29e" strokeWidth={2} fill="url(#spendGrad)" />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </div>
      </motion.div>

      {/* C. Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Campaign Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Top Campaigns</h3>
            <button
              onClick={() => navigate('meta-ads')}
              className="text-xs text-amber-700 dark:text-amber-500 font-medium hover:text-amber-800 dark:hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
            >
              View All Campaigns <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:bg-stone-800/30 border-b-2 border-b-stone-200 dark:border-b-stone-700">
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Campaign</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Channel</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Delivery</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Spend</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Revenue</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-center">ROAS</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium text-right">Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCampaigns.map((c, i) => (
                  <TableRow key={c.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : 'bg-stone-50/50 dark:bg-stone-900/50'} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors`}>
                    <TableCell className="py-2.5">
                      <span className="text-sm font-medium text-stone-900 dark:text-stone-100 max-w-[200px] truncate block">{c.name}</span>
                    </TableCell>
                    <TableCell className="py-2.5"><ChannelBadge source={c.source} /></TableCell>
                    <TableCell className="py-2.5"><DeliveryDot status={c.delivery} /></TableCell>
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
        </motion.div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Channel Split */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Channel Split</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Meta Ads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400">${channelSplit.meta.toLocaleString()}</span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                      metaTrend === 'up' ? 'text-green-700 dark:text-green-400' : metaTrend === 'down' ? 'text-red-700 dark:text-red-400' : 'text-stone-700 dark:text-stone-300'
                    }`}>
                      {metaPct.toFixed(1)}%
                      {metaTrend === 'up' && <span className="text-[10px]">▲</span>}
                      {metaTrend === 'down' && <span className="text-[10px]">▼</span>}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: channelSplit.total > 0 ? `${(channelSplit.meta / channelSplit.total) * 100}%` : '0%' }}
                    transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Google Ads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400">${channelSplit.google.toLocaleString()}</span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                      googleTrend === 'up' ? 'text-green-700 dark:text-green-400' : googleTrend === 'down' ? 'text-red-700 dark:text-red-400' : 'text-stone-700 dark:text-stone-300'
                    }`}>
                      {googlePct.toFixed(1)}%
                      {googleTrend === 'up' && <span className="text-[10px]">▲</span>}
                      {googleTrend === 'down' && <span className="text-[10px]">▼</span>}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: channelSplit.total > 0 ? `${(channelSplit.google / channelSplit.total) * 100}%` : '0%' }}
                    transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Attention Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Attention Items</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {attentionItems.length === 0 && (
                <p className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">No items need attention</p>
              )}
              {attentionItems.map((item, i) => {
                const borderClass = item.severity === 'red' ? 'border-l-red-400' : item.severity === 'orange' ? 'border-l-orange-400' : 'border-l-amber-400'
                const bgClass = item.severity === 'red' ? 'bg-red-50 dark:bg-red-900/20' : item.severity === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
                return (
                  <div
                    key={i}
                    className={`border-l-2 ${borderClass} ${bgClass} rounded-lg px-3 py-2.5 flex items-start gap-2.5`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {item.iconType === 'low_stock' ? (
                        <AlertTriangle className={`w-3.5 h-3.5 ${item.severity === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                      ) : (
                        <PauseCircle className="w-3.5 h-3.5 text-orange-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-stone-400 mb-0.5">{item.type}</p>
                      <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivities.length === 0 && (
                <p className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">No recent activity</p>
              )}
              {recentActivities.map((activity) => {
                const typeColors: Record<string, string> = {
                  sync: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                  campaign: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                  product: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  alert: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                }
                const colorClass = typeColors[activity.type] || 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                return (
                  <div key={activity.id} className="flex items-center gap-3">
                    <Badge variant="secondary" className={`text-[10px] font-semibold border-0 px-2 py-0.5 flex-shrink-0 ${colorClass}`}>
                      {activity.type}
                    </Badge>
                    <p className="text-xs text-stone-700 dark:text-stone-300 flex-1 truncate">{activity.summary}</p>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 flex-shrink-0">{formatRelativeTime(activity.startedAt)}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Top Products - clickable */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">Top Products</h3>
            <div className="space-y-3">
              {topProducts.map((p: Product) => (
                <button
                  key={p.id}
                  onClick={() => navigate('product-detail', p.id)}
                  className="flex items-center gap-3 w-full text-left group hover:bg-stone-50 dark:hover:bg-stone-800/50 -mx-1 px-1 py-1 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0 relative">
                    <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200">View</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors">{p.title}</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">{p.sales30d} sales</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-stone-900 dark:text-stone-100">${p.revenue30d.toLocaleString()}</span>
                    <ArrowRight className="w-3 h-3 text-stone-300 dark:text-stone-600 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}