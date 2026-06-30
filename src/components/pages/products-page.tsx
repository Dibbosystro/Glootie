'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Search,
  ArrowRight,
  Eye,
  ShoppingCart,
  BarChart3,
  BoxIcon,
  ArrowDownNarrowWide,
  ArrowUpDown,
  ArrowUpNarrowWide,
  Zap,
  LayoutGrid,
  List,
  Download,
  Star,
  Pencil,
  BarChart2,
  Copy,
  Info,
  ChevronDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useNavigation } from '@/store/navigation'
import type { Product, Verdict } from '@/lib/types'

// ===== Verdict Color Maps =====
const verdictConfig: Record<Verdict, { label: string; bg: string; text: string; border: string; bar: string; pill: string; pillActive: string; count: string }> = {
  scale: {
    label: 'Scale',
    bg: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    bar: 'bg-green-500',
    pill: 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    pillActive: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400',
    count: 'text-green-600 dark:text-green-400',
  },
  test: {
    label: 'Test',
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    bar: 'bg-amber-500',
    pill: 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    pillActive: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
    count: 'text-amber-600 dark:text-amber-400',
  },
  hold: {
    label: 'Hold',
    bg: 'bg-gradient-to-r from-orange-50 to-stone-100 dark:from-orange-900/20 dark:to-stone-800/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    bar: 'bg-orange-500',
    pill: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20',
    pillActive: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400',
    count: 'text-orange-500 dark:text-orange-400',
  },
  fix_first: {
    label: 'Fix First',
    bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    bar: 'bg-red-500',
    pill: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    pillActive: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
    count: 'text-red-600 dark:text-red-400',
  },
  do_not_advertise: {
    label: 'Do Not Advertise',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    bar: 'bg-red-500',
    pill: 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    pillActive: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
    count: 'text-red-600 dark:text-red-400',
  },
}

type SortKey = 'revenue' | 'stock' | 'name'
type ViewMode = 'grid' | 'list'

export function getVerdictConfig(verdict: Verdict) {
  return verdictConfig[verdict]
}

export default function ProductsPage() {
  const navigate = useNavigation((s) => s.navigate)
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
  })

  const products = data?.products ?? []

  // Stock summary
  const stockSummary = useMemo(() => {
    const inStock = products.filter((p: Product) => p.inventoryQty > 50).length
    const lowStock = products.filter((p: Product) => p.inventoryQty >= 15 && p.inventoryQty <= 50).length
    const critical = products.filter((p: Product) => p.inventoryQty < 15).length
    return { total: products.length, inStock, lowStock, critical }
  }, [products])

  const verdictCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length }
    for (const p of products) {
      counts[p.verdict] = (counts[p.verdict] || 0) + 1
    }
    return counts
  }, [products])

  const activeCount = useMemo(() => products.filter((p: Product) => p.status === 'active').length, [products])

  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0
    return products.reduce((sum: number, p: Product) => sum + p.price, 0) / products.length
  }, [products])

  const avgScore = useMemo(() => {
    if (products.length === 0) return 0
    return Math.round(products.reduce((sum: number, p: Product) => sum + p.score, 0) / products.length)
  }, [products])

  const totalRevenue = useMemo(() => products.reduce((sum: number, p: Product) => sum + p.price * p.sales30d, 0), [products])

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (verdictFilter !== 'all') {
      result = result.filter((p: Product) => p.verdict === verdictFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p: Product) => p.title.toLowerCase().includes(q))
    }

    switch (sortKey) {
      case 'revenue':
        result.sort((a: Product, b: Product) => b.revenue30d - a.revenue30d)
        break
      case 'stock':
        result.sort((a: Product, b: Product) => b.inventoryQty - a.inventoryQty)
        break
      case 'name':
        result.sort((a: Product, b: Product) => a.title.localeCompare(b.title))
        break
    }

    return result
  }, [products, verdictFilter, searchQuery, sortKey])

  const sortOptions: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'revenue', label: 'Revenue', icon: <ArrowDownNarrowWide className="size-3.5" /> },
    { key: 'stock', label: 'Stock', icon: <ArrowUpDown className="size-3.5" /> },
    { key: 'name', label: 'Name A-Z', icon: <ArrowUpNarrowWide className="size-3.5" /> },
  ]

  const handleExportCSV = () => {
    const headers = ['Name', 'Price', 'Revenue 30d', 'Sales 30d', 'CVR', 'Score', 'Stock', 'Verdict']
    const rows = filteredProducts.map((p: Product) => [
      p.title,
      p.price.toFixed(2),
      p.revenue30d,
      p.sales30d,
      p.conversionRate.toFixed(1) + '%',
      p.score,
      p.inventoryQty,
      getVerdictConfig(p.verdict).label,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products-export.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully!')
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ===== Header Section with Gradient Background ===== */}
      <div className="flex flex-col gap-1 bg-gradient-to-b from-stone-50 to-transparent dark:from-stone-900/50 dark:to-transparent -mx-6 -mt-6 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Products</h1>
            <Badge variant="secondary" className="h-6 px-2.5 text-xs font-semibold tabular-nums">
              {products.length}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs gap-1.5 border-stone-200 dark:border-stone-700">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor product performance, verdicts, and advertising readiness.
        </p>
      </div>

      {/* ===== Quick Stats Bar ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-stone-600 dark:text-stone-300" />
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{products.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Total Products</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{activeCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Active Products</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">${totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Total Revenue</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100">{avgScore}<span className="text-sm font-normal text-stone-400 dark:text-stone-500">/100</span></p>
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Avg Score</p>
          </div>
        </motion.div>
      </div>

      {/* ===== Stock Summary ===== */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Stock Levels:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-stone-600 dark:text-stone-300">{stockSummary.inStock} In Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-stone-600 dark:text-stone-300">{stockSummary.lowStock} Low Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-stone-600 dark:text-stone-300">{stockSummary.critical} Critical</span>
        </div>
      </div>

      {/* ===== Filter Bar ===== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Verdict Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setVerdictFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ring-1 ring-inset ${
              verdictFilter === 'all'
                ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 ring-stone-200 dark:ring-stone-700'
                : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 ring-stone-200 dark:ring-stone-700'
            }`}
          >
            All
            <span className={`tabular-nums ${verdictFilter === 'all' ? 'text-stone-500 dark:text-stone-400' : 'text-stone-400 dark:text-stone-500'}`}>
              {verdictCounts.all ?? 0}
            </span>
          </button>
          {(Object.keys(verdictConfig) as Verdict[]).map((v) => {
            const cfg = verdictConfig[v]
            const isActive = verdictFilter === v
            return (
              <button
                key={v}
                onClick={() => setVerdictFilter(isActive ? 'all' : v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  isActive ? cfg.pillActive : cfg.pill
                }`}
              >
                {cfg.label}
                <span className={`tabular-nums ${isActive ? cfg.count : 'opacity-60'}`}>
                  {verdictCounts[v] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* Sort + Search + View Toggle */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center justify-center p-1.5 rounded-l-lg transition-colors ${viewMode === 'grid' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center justify-center p-1.5 rounded-r-lg transition-colors ${viewMode === 'list' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
            >
              <List className="size-3.5" />
            </button>
          </div>

          {/* Sort Toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xs">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  sortKey === opt.key
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                {opt.icon}
                {opt.label}
                {sortKey === opt.key && <ChevronDown className="size-3 text-amber-600 dark:text-amber-400" />}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 pl-8 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* ===== Product Grid/List ===== */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 dark:border-stone-700 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
            <BoxIcon className="size-8 text-stone-300 dark:text-stone-600" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No products match your filters</p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
            Try adjusting your verdict filter or search query to find what you&apos;re looking for.
          </p>
          <button
            onClick={() => {
              setVerdictFilter('all')
              setSearchQuery('')
            }}
            className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: Product, index: number) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onClick={() => navigate('product-detail', product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-b-stone-200 dark:border-b-stone-700 bg-stone-50/50 dark:bg-stone-800/30">
                  <th className="text-left text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-5 py-3">Product</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3">Verdict</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3">Price</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3">Revenue</th>
                  <th className="text-center text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3">CVR</th>
                  <th className="text-center text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3">Score</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium px-4 py-3 min-w-[130px]">Stock Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product: Product, index: number) => {
                  const cfg = verdictConfig[product.verdict]
                  const stockColor = product.inventoryQty < 10 ? 'text-red-600 dark:text-red-400' : product.inventoryQty < 15 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      onClick={() => navigate('product-detail', product.id)}
                      className={`border-b border-stone-100 dark:border-stone-800 last:border-0 hover:bg-stone-50/80 dark:hover:bg-stone-800/40 cursor-pointer transition-colors ${index % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} ${product.status === 'active' ? 'border-l-2 border-l-emerald-400' : product.status === 'draft' ? 'border-l-2 border-l-stone-300 dark:border-l-stone-600' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 flex-shrink-0">
                            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate max-w-[200px]">{product.title}</p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500">{product.productType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">${product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">${product.revenue30d.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm tabular-nums text-stone-700 dark:text-stone-300">{product.conversionRate.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${product.score}%` }} />
                          </div>
                          <span className="text-xs tabular-nums font-medium w-8 text-right text-stone-900 dark:text-stone-100">{product.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StockLevelBar qty={product.inventoryQty} index={index} />
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Stock Level Bar =====
function StockLevelBar({ qty, index }: { qty: number; index: number }) {
  const isCritical = qty < 15
  const isLow = qty >= 15 && qty <= 50
  const isInStock = qty > 50

  const label = isCritical ? 'Critical' : isLow ? 'Low Stock' : 'In Stock'
  const barColor = isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = isCritical ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
  const barWidth = Math.min(100, (qty / 100) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${textColor}`}>{label}</span>
        <span className="text-[10px] tabular-nums text-stone-500 dark:text-stone-400">{qty} units</span>
      </div>
      <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.6, delay: 0.1 + index * 0.03, ease: 'easeOut' }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  )
}

// ===== KPI Mini Card =====
function KpiMiniCard({
  icon,
  label,
  value,
  valueColor = 'text-foreground',
  tooltip,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
  tooltip?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white dark:bg-stone-900 p-4 shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-50 dark:bg-stone-800">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className={`text-lg font-bold tabular-nums leading-tight ${valueColor}`}>{value}</p>
      </div>
    </div>
  )
}

// ===== Product Card =====
function ProductCard({
  product,
  index,
  onClick,
}: {
  product: Product
  index: number
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const cfg = verdictConfig[product.verdict]

  const stockColor =
    product.inventoryQty < 10
      ? 'text-red-600 dark:text-red-400'
      : product.inventoryQty < 15
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400'

  const stockBg =
    product.inventoryQty < 10
      ? 'bg-red-50 dark:bg-red-900/20'
      : product.inventoryQty < 15
        ? 'bg-amber-50 dark:bg-amber-900/20'
        : 'bg-green-50 dark:bg-green-900/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md hover:shadow-[inset_0_0_0_1px_rgba(180,83,9,0.1)] overflow-hidden shimmer-effect"
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
        </div>
        {/* Top: Image + Verdict Badge + Hover Overlay */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute right-2 top-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              {cfg.label}
            </span>
          </div>
          {/* Hover Overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-2 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="flex items-center gap-1.5 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-lg px-3 py-2 text-xs font-medium shadow-lg hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex items-center gap-1.5 bg-amber-600 text-white rounded-lg px-3 py-2 text-xs font-medium shadow-lg hover:bg-amber-700 transition-colors">
                  <BarChart2 className="w-3.5 h-3.5" /> Analyze
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title + Price */}
        <div className="space-y-1">
          <h3 className="truncate text-sm font-medium leading-tight text-foreground">
            {product.title}
          </h3>
          <p className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">${product.price.toFixed(2)}</p>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="size-3" />
            {product.sessions30d.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <ShoppingCart className="size-3" />
            {product.sales30d}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <BarChart3 className="size-3" />
            {product.conversionRate.toFixed(1)}%
          </span>
        </div>

        {/* Score Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Score</span>
            <span className="tabular-nums font-medium">{product.score}/100</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cfg.bar} ${product.score >= 85 ? 'shadow-[0_0_8px_rgba(34,197,94,0.3)] animate-score-shimmer' : ''}`}
              style={{ width: `${product.score}%` }}
            />
          </div>
        </div>

        {/* Stock Indicator */}
        <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${stockBg}`}>
          <Zap className={`size-3.5 ${stockColor}`} />
          <span className={`text-xs font-medium tabular-nums ${stockColor}`}>
            {product.inventoryQty} units
          </span>
        </div>

        {/* View Details */}
        <div className="flex items-center justify-end border-t border-stone-100 dark:border-stone-800 pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
            View Details
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.div>
  )
}