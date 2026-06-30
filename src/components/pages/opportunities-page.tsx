'use client'

import { useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Rocket,
  ArrowRight,
  DollarSign,
  FlaskConical,
  Target,
  Lightbulb,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useNavigation } from '@/store/navigation'
import { getVerdictConfig } from './products-page'
import type { Product, Verdict } from '@/lib/types'

const verdictCircleStroke: Record<Verdict, string> = {
  scale: 'stroke-green-500',
  test: 'stroke-blue-500',
  hold: 'stroke-yellow-500',
  fix_first: 'stroke-orange-500',
  do_not_advertise: 'stroke-red-500',
}

export default function OpportunitiesPage() {
  const navigate = useNavigation((s) => s.navigate)
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
  })

  const products: Product[] = data?.products ?? []

  const opportunityProducts = useMemo(() => {
    return products
      .filter((p: Product) => p.verdict === 'scale' || p.verdict === 'test')
      .sort((a: Product, b: Product) => b.score - a.score)
  }, [products])

  const avgScore = useMemo(() => {
    if (opportunityProducts.length === 0) return 0
    return Math.round(
      opportunityProducts.reduce((sum: number, p: Product) => sum + p.score, 0) /
        opportunityProducts.length
    )
  }, [opportunityProducts])

  const scaleCount = opportunityProducts.filter((p: Product) => p.verdict === 'scale').length
  const testCount = opportunityProducts.filter((p: Product) => p.verdict === 'test').length

  const combinedRevenue = opportunityProducts.reduce((s: number, p: Product) => s + p.revenue30d, 0)
  const estimatedMonthlyRevenue = combinedRevenue * 2

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }).finally(() => {
      setTimeout(() => {
        setIsRefreshing(false)
        toast.success('Analysis refreshed successfully!')
      }, 800)
    })
  }, [queryClient])

  const handleCreateCampaign = useCallback((product: Product) => {
    toast.success('Navigating to product detail...')
    setTimeout(() => {
      navigate('product-detail', product.id)
    }, 400)
  }, [navigate])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Opportunities</h1>
            <Badge variant="secondary" className="h-6 px-2.5 text-xs font-semibold tabular-nums">
              {opportunityProducts.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Products ready to test or scale in your ad campaigns.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 text-xs gap-1.5 border-stone-200 dark:border-stone-700 mt-2 sm:mt-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* ===== Readiness Score Card ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-gradient-to-br from-stone-50 to-white dark:from-stone-900 dark:to-stone-900 p-6 shadow-sm sm:flex-row"
      >
        {/* Gauge */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <ReadinessGauge score={avgScore} />
          <span className="text-xs font-semibold text-muted-foreground">READINESS SCORE</span>
        </div>

        {/* Stats */}
        <div className="flex flex-1 flex-wrap items-center gap-6 sm:gap-10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <Rocket className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">{scaleCount}</p>
              <p className="text-xs text-muted-foreground">Ready to Scale</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <FlaskConical className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{testCount}</p>
              <p className="text-xs text-muted-foreground">Ready to Test</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="h-10 w-px bg-stone-200 dark:bg-stone-700" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-stone-50 dark:bg-stone-800">
              <TrendingUp className="size-4 text-stone-500 dark:text-stone-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                ${combinedRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Combined Revenue</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="h-10 w-px bg-stone-200 dark:bg-stone-700" />
          </div>
          {/* Estimated Monthly Revenue (scaled 2x) */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                ${estimatedMonthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Est. Monthly Revenue <span className="text-[10px] text-emerald-500 dark:text-emerald-500">(2x scaled)</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== Opportunity Cards (List Layout) ===== */}
      <div className="space-y-4">
        {opportunityProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 dark:border-stone-700 py-16 text-center">
            <Lightbulb className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No opportunities right now</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Products will appear here when they&apos;re ready to test or scale.
            </p>
          </div>
        ) : (
          opportunityProducts.map((product: Product, index: number) => (
            <OpportunityCard
              key={product.id}
              product={product}
              index={index}
              onCreateCampaign={() => handleCreateCampaign(product)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ===== Readiness Gauge =====
function ReadinessGauge({ score }: { score: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  // Gradient coloring based on percentage
  const gradientId = 'gauge-gradient'
  const stopColors = score >= 75 ? ['#22c55e', '#10b981'] : score >= 50 ? ['#f59e0b', '#eab308'] : ['#ef4444', '#f87171']

  const labelColor =
    score >= 75
      ? 'text-green-600 dark:text-green-400'
      : score >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  const statusText =
    score >= 75
      ? 'Strong'
      : score >= 50
        ? 'Moderate'
        : 'Needs Work'

  return (
    <div className="relative size-28 drop-shadow-[0_0_12px_rgba(34,197,94,0.2)]">
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stopColors[0]} />
            <stop offset="100%" stopColor={stopColors[1]} />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-stone-100 dark:stroke-stone-700"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.8s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tabular-nums ${labelColor}`}>{score}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {statusText}
        </span>
      </div>
    </div>
  )
}

// ===== Opportunity Card =====
function OpportunityCard({
  product,
  index,
  onCreateCampaign,
}: {
  product: Product
  index: number
  onCreateCampaign: () => void
}) {
  const cfg = getVerdictConfig(product.verdict)

  // Estimate revenue potential: if scaled 2x with same CVR
  const potentialRevenue = product.revenue30d * 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`group rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-stone-300/50 dark:hover:border-stone-600 ${product.verdict === 'scale' ? 'border-t-2 border-t-emerald-400' : product.verdict === 'test' ? 'border-t-2 border-t-amber-400' : ''}`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
        {/* Left: Image + Score */}
        <div className="flex items-center gap-4 md:shrink-0">
          <div className="relative size-20 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <CircularScore
              score={product.score}
              strokeClass={verdictCircleStroke[product.verdict]}
              size={56}
            />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Score
            </span>
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{product.title}</h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              {cfg.label}
            </span>
          </div>

          {/* Why Section */}
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Why</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{product.reason}</p>
            </div>
          </div>

          {/* Next Step */}
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 size-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Next Step</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{product.nextAction}</p>
            </div>
          </div>
        </div>

        {/* Right: Revenue + Action */}
        <div className="flex shrink-0 flex-col items-end gap-3 md:items-end">
          {/* Revenue Potential */}
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Revenue Potential
            </p>
            <div className="flex items-baseline gap-1">
              <DollarSign className="size-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {potentialRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">2x current revenue</p>
          </div>

          {/* Create Campaign Button */}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onCreateCampaign()
            }}
            className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          >
            <Sparkles className="size-3.5" />
            Create Campaign
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ===== Circular Score (smaller variant) =====
function CircularScore({
  score,
  strokeClass,
  size = 56,
}: {
  score: number
  strokeClass: string
  size?: number
}) {
  const viewSize = 80
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={`relative rounded-full ${score >= 80 ? 'ring-2 ring-emerald-500/30' : score >= 60 ? 'ring-2 ring-amber-500/30' : 'ring-2 ring-red-500/30'}`} style={{ width: size, height: size }}>
      <svg
        className="size-full -rotate-90"
        viewBox={`0 0 ${viewSize} ${viewSize}`}
      >
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="5"
          className="stroke-stone-100 dark:stroke-stone-700"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={strokeClass}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.6s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100">{score}</span>
      </div>
    </div>
  )
}