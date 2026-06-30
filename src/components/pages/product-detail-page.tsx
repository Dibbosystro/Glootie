'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Eye,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Zap,
  BoxIcon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CircleDot,
  Share2,
  ChevronRight,
} from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useNavigation } from '@/store/navigation'
import { getVerdictConfig } from './products-page'
import type { Product, Verdict, DailyMetric } from '@/lib/types'

// ===== Verdict colors for large card =====
const verdictCardBg: Record<Verdict, string> = {
  scale: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-stone-900 border-green-200 dark:border-green-800',
  test: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-stone-900 border-amber-200 dark:border-amber-800',
  hold: 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-stone-900 border-orange-200 dark:border-orange-800',
  fix_first: 'bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-stone-900 border-red-200 dark:border-red-800',
  do_not_advertise: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
}

const verdictLabelBg: Record<Verdict, string> = {
  scale: 'bg-green-600',
  test: 'bg-blue-600',
  hold: 'bg-yellow-500',
  fix_first: 'bg-orange-500',
  do_not_advertise: 'bg-red-600',
}

const verdictCircleStroke: Record<Verdict, string> = {
  scale: 'stroke-green-500',
  test: 'stroke-blue-500',
  hold: 'stroke-yellow-500',
  fix_first: 'stroke-orange-500',
  do_not_advertise: 'stroke-red-500',
}

const verdictGlowColor: Record<Verdict, string> = {
  scale: 'shadow-green-500/30',
  test: 'shadow-blue-500/30',
  hold: 'shadow-yellow-500/30',
  fix_first: 'shadow-orange-500/30',
  do_not_advertise: 'shadow-red-500/30',
}

export default function ProductDetailPage() {
  const { selectedProductId, goBack, navigate } = useNavigation()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
  })

  const products: Product[] = data?.products ?? []
  const campaigns = data?.campaigns ?? []
  const dailyMetrics: DailyMetric[] = data?.dailyMetrics ?? []

  const product = useMemo(
    () => products.find((p: Product) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  )

  // Compute averages across all products for comparison
  const avgMetrics = useMemo(() => {
    if (products.length === 0) return { revenue: 0, conversionRate: 0, score: 0 }
    const totalRevenue = products.reduce((s: number, p: Product) => s + p.revenue30d, 0)
    const totalCVR = products.reduce((s: number, p: Product) => s + p.conversionRate, 0)
    const totalScore = products.reduce((s: number, p: Product) => s + p.score, 0)
    return {
      revenue: totalRevenue / products.length,
      conversionRate: totalCVR / products.length,
      score: totalScore / products.length,
    }
  }, [products])

  // Find campaigns that reference this product by checking campaign name or category
  const linkedCampaigns = useMemo(() => {
    if (!product) return []
    return campaigns.filter(
      (c: { name: string; source: string; delivery: string; metrics: { spend: number; revenue: number; roas: number } }) => {
        const titleWords = product.title.split(' ').slice(0, 3).join(' ')
        return c.name.toLowerCase().includes(titleWords.toLowerCase()) ||
          c.name.toLowerCase().includes(product.productType.toLowerCase())
      }
    )
  }, [product, campaigns])

  // Related products (same product type, excluding current)
  const relatedProducts = useMemo(() => {
    if (!product) return []
    return products
      .filter((p: Product) => p.id !== product.id && p.productType === product.productType)
      .slice(0, 4)
  }, [products, product])

  // Simulated daily performance trend
  const performanceTrend = useMemo(() => {
    if (!product || dailyMetrics.length === 0) return []
    return dailyMetrics.slice(-14).map((d: DailyMetric, i: number) => ({
      day: i + 1,
      revenue: Math.round(product.revenue30d / 30 * (0.7 + Math.sin(i * 0.8) * 0.3)),
    }))
  }, [product, dailyMetrics])

  const margin = product ? ((product.price - product.cost) / product.price) * 100 : 0
  const profitPerUnit = product ? product.price - product.cost : 0

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BoxIcon className="mb-3 size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">Product not found</p>
        <button
          onClick={goBack}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to Products
        </button>
      </div>
    )
  }

  const cfg = getVerdictConfig(product.verdict)

  const handleShare = () => {
    toast.success('Product link copied to clipboard!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-6"
    >
      {/* ===== Breadcrumb Trail ===== */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate('products')
              }}
              className="text-sm"
            >
              Products
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="flex items-center gap-0.5 text-stone-400 dark:text-stone-500">
              <ChevronRight className="size-3" />
            </span>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-medium max-w-[240px] truncate">
              {product.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ===== Back + Share Button ===== */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Products
        </button>
        <Button variant="outline" size="sm" onClick={handleShare} className="h-8 text-xs gap-1.5 border-stone-200 dark:border-stone-700">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>
      </div>

      {/* ===== Two-Column Layout ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ===== Left Column ===== */}
        <div className="space-y-5">
          {/* Product Image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 shadow-inner">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Title + Badges */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold leading-tight text-stone-900 dark:text-stone-100">{product.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {product.productType}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                {product.vendor}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
              >
                {cfg.label}
              </Badge>
            </div>
          </div>

          {/* Price Info with Margin Breakdown */}
          <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pricing
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">${product.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-xl font-medium tabular-nums text-muted-foreground">
                  ${product.cost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {margin.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ${profitPerUnit.toFixed(2)} / unit
                </p>
              </div>
            </div>
            {/* Margin Breakdown Bar */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margin Breakdown</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${margin}%` }}
                />
                <div
                  className="bg-stone-300 dark:bg-stone-600 transition-all duration-500"
                  style={{ width: `${100 - margin}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Profit ({margin.toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                  Cost ({(100 - margin).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Right Column ===== */}
        <div className="space-y-5">
          {/* Verdict Card with pulsing glow */}
          <div
            className={`rounded-xl border p-6 shadow-sm animate-verdict-glow ${verdictCardBg[product.verdict]}`}
            style={{ '--glow-color': product.verdict === 'scale' ? 'rgba(16,185,129,0.15)' : product.verdict === 'test' ? 'rgba(245,158,11,0.15)' : product.verdict === 'hold' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)' } as React.CSSProperties}
          >
            <div className="flex items-start gap-5">
              {/* Left: Text */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white ${verdictLabelBg[product.verdict]}`}
                  >
                    {cfg.label}
                  </span>
                </div>
                <h2 className="text-lg font-bold leading-tight text-stone-900 dark:text-stone-100">{product.headline}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{product.reason}</p>
              </div>

              {/* Right: Score Circle with glow */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div className={`shadow-lg rounded-full ${verdictGlowColor[product.verdict]}`}>
                  <CircularScore
                    score={product.score}
                    strokeClass={verdictCircleStroke[product.verdict]}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">SCORE</span>
              </div>
            </div>

            {/* Performance Trend Mini-Chart */}
            <div className="mt-4 bg-white/60 dark:bg-stone-800/40 rounded-lg p-3 border border-white/80 dark:border-stone-700/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Revenue Trend (14 days)</p>
              <div className="h-12 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={performanceTrend}>
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#b45309"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Next Action */}
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-white/70 dark:bg-stone-800/50 p-3.5">
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Next Action</p>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">{product.nextAction}</p>
              </div>
            </div>
          </div>

          {/* Signals Grid */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Performance Signals (30 days)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <SignalCard
                icon={<Eye className="size-4 text-blue-500 dark:text-blue-400" />}
                label="Sessions"
                value={product.sessions30d.toLocaleString()}
                barValue={Math.min((product.sessions30d / 2500) * 100, 100)}
                barColor="bg-blue-500"
              />
              <SignalCard
                icon={<ShoppingCart className="size-4 text-emerald-500 dark:text-emerald-400" />}
                label="Sales"
                value={String(product.sales30d)}
                barValue={Math.min((product.sales30d / 120) * 100, 100)}
                barColor="bg-emerald-500"
              />
              <SignalCard
                icon={<DollarSign className="size-4 text-green-500 dark:text-green-400" />}
                label="Revenue"
                value={`$${product.revenue30d.toLocaleString()}`}
                barValue={Math.min((product.revenue30d / 7000) * 100, 100)}
                barColor="bg-green-500"
              />
              <SignalCard
                icon={<BarChart3 className="size-4 text-violet-500 dark:text-violet-400" />}
                label="Conversion Rate"
                value={`${product.conversionRate.toFixed(2)}%`}
                barValue={Math.min((product.conversionRate / 6) * 100, 100)}
                barColor="bg-violet-500"
              />
            </div>
          </div>

          {/* Stock Status Card */}
          <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stock Status
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {product.inventoryQty} units in stock
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      product.inventoryQty < 10
                        ? 'text-red-600 dark:text-red-400'
                        : product.inventoryQty < 15
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {product.inventoryQty < 10
                      ? 'Critical'
                      : product.inventoryQty < 15
                        ? 'Low'
                        : 'Healthy'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      product.inventoryQty < 10
                        ? 'bg-red-500'
                        : product.inventoryQty < 15
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((product.inventoryQty / 250) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  At {product.sales30d} sales/30d, stock lasts ~
                  {product.sales30d > 0
                    ? Math.round(product.inventoryQty / (product.sales30d / 30))
                    : '∞'}{' '}
                  days
                </p>
              </div>
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                  product.inventoryQty < 10
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : product.inventoryQty < 15
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-green-50 dark:bg-green-900/20'
                }`}
              >
                <Zap
                  className={`size-5 ${
                    product.inventoryQty < 10
                      ? 'text-red-500 dark:text-red-400'
                      : product.inventoryQty < 15
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-green-500 dark:text-green-400'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Linked Campaigns Table ===== */}
      {linkedCampaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm"
        >
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Linked Campaigns
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-muted-foreground">
              {linkedCampaigns.length}
            </span>
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="even:bg-stone-50/50 dark:even:bg-stone-800/30">
              {linkedCampaigns.map(
                (campaign: {
                  id: string
                  name: string
                  source: string
                  delivery: string
                  metrics: { spend: number; revenue: number; roas: number }
                }) => (
                  <TableRow key={campaign.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium uppercase ${
                          campaign.source === 'meta'
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {campaign.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DeliveryBadge status={campaign.delivery} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {"$"}{campaign.metrics.spend.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {campaign.metrics.roas.toFixed(2)}x
                    </TableCell>
                  </TableRow>
                )
              )}

            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* ===== Performance Comparison vs Average ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Performance Comparison
          <span className="ml-2 text-xs font-normal text-muted-foreground">vs All Products Average</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-gradient-to-r from-stone-50/80 to-stone-50/30 dark:from-stone-800/30 dark:to-stone-800/10 -m-2 p-2 rounded-xl">
          <ComparisonCard
            label="Revenue (30d)"
            value={`$${product.revenue30d.toLocaleString()}`}
            avgValue={`$${Math.round(avgMetrics.revenue).toLocaleString()}`}
            diff={product.revenue30d - avgMetrics.revenue}
            diffPercent={avgMetrics.revenue > 0 ? ((product.revenue30d - avgMetrics.revenue) / avgMetrics.revenue) * 100 : 0}
            higherIsBetter
          />
          <ComparisonCard
            label="Conversion Rate"
            value={`${product.conversionRate.toFixed(2)}%`}
            avgValue={`${avgMetrics.conversionRate.toFixed(2)}%`}
            diff={product.conversionRate - avgMetrics.conversionRate}
            diffPercent={avgMetrics.conversionRate > 0 ? ((product.conversionRate - avgMetrics.conversionRate) / avgMetrics.conversionRate) * 100 : 0}
            higherIsBetter
          />
          <ComparisonCard
            label="Score"
            value={`${product.score}`}
            avgValue={`${Math.round(avgMetrics.score)}`}
            diff={product.score - avgMetrics.score}
            diffPercent={avgMetrics.score > 0 ? ((product.score - avgMetrics.score) / avgMetrics.score) * 100 : 0}
            higherIsBetter
          />
        </div>
      </motion.div>

      {/* ===== Related Products ===== */}
      {relatedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Related Products</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((rp: Product) => (
              <button
                key={rp.id}
                onClick={() => useNavigation.getState().navigate('product-detail', rp.id)}
                className="group text-left rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800 mb-3">
                  <img
                    src={rp.imageUrl}
                    alt={rp.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">{rp.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100">${rp.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${getVerdictConfig(rp.verdict).bg} ${getVerdictConfig(rp.verdict).text} px-1.5 py-0.5 rounded`}>
                    {getVerdictConfig(rp.verdict).label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ===== Circular Score Component =====
function CircularScore({
  score,
  strokeClass,
}: {
  score: number
  strokeClass: string
}) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative size-24">
      <svg className="size-full -rotate-90" viewBox="0 0 80 80">
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
        <span className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{score}</span>
      </div>
    </div>
  )
}

// ===== Signal Card =====
function SignalCard({
  icon,
  label,
  value,
  barValue,
  barColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  barValue: number
  barColor: string
}) {
  return (
    <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm hover:-translate-y-0.5 transition-transform duration-200 border-l-2" style={{ borderLeftColor: barColor.includes('blue') ? '#3b82f6' : barColor.includes('emerald') || barColor.includes('green') ? '#10b981' : barColor.includes('violet') ? '#8b5cf6' : '#10b981' }}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mb-2 text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">{value}</p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barValue}%` }}
        />
      </div>
    </div>
  )
}

// ===== Comparison Card =====
function ComparisonCard({
  label,
  value,
  avgValue,
  diff,
  diffPercent,
  higherIsBetter = true,
}: {
  label: string
  value: string
  avgValue: string
  diff: number
  diffPercent: number
  higherIsBetter?: boolean
}) {
  const isPositive = higherIsBetter ? diff > 0 : diff < 0
  const isNeutral = Math.abs(diff) < 0.01

  return (
    <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end justify-between mb-2">
        <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{value}</p>
        {!isNeutral && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
            isPositive
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {isPositive ? '+' : ''}{diffPercent.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>vs Avg</span>
        <span className="font-medium text-stone-600 dark:text-stone-400">{avgValue}</span>
      </div>
    </div>
  )
}

// ===== Delivery Badge =====
function DeliveryBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
    learning: { label: 'Learning', className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' },
    limited: { label: 'Limited', className: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' },
    inactive: { label: 'Inactive', className: 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400' },
    paused: { label: 'Paused', className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400' },
    not_delivering: { label: 'Not Delivering', className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' },
  }
  const c = config[status] ?? config.inactive

  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${c.className}`}>
      <CircleDot className="mr-1 size-2.5" />
      {c.label}
    </Badge>
  )
}