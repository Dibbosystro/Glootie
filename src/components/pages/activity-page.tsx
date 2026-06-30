'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Loader2, AlertTriangle, Activity as ActivityIcon, RefreshCw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { DashboardData, ActivityItem } from '@/lib/types'

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

const typeColors: Record<string, string> = {
  sync: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  ai: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
  support: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400',
  settings: 'bg-stone-100 dark:bg-stone-700/50 text-stone-600 dark:text-stone-400',
}

const typeDotColors: Record<string, string> = {
  sync: 'bg-blue-500',
  ai: 'bg-purple-500',
  support: 'bg-green-500',
  settings: 'bg-stone-500',
}

const typeFilters = ['all', 'sync', 'ai', 'support', 'settings']
const statusFilters = ['all', 'success', 'running', 'error', 'warning']

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const activities = data?.activities ?? []

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
  }, [activities, typeFilter, statusFilter])

  const counts = useMemo(() => ({
    total: activities.length,
    success: activities.filter(a => a.status === 'success').length,
    running: activities.filter(a => a.status === 'running').length,
    error: activities.filter(a => a.status === 'error').length,
  }), [activities])

  const hasActiveFilter = typeFilter !== 'all' || statusFilter !== 'all'

  const handleRefresh = () => {
    setIsRefreshing(true)
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleClearFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-5 w-40 mt-6" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
          <ActivityIcon className="size-5 text-stone-600 dark:text-stone-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">Activity Log</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Track all system events and sync operations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="ml-auto gap-1.5 border-stone-200 dark:border-stone-700"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
          >
            <RefreshCw className="size-4" />
          </motion.div>
          Refresh
        </Button>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: counts.total, color: 'text-stone-900 dark:text-stone-100', bg: 'bg-stone-100 dark:bg-stone-800/50', border: 'border-l-stone-400 dark:border-l-stone-500' },
          { label: 'Successful', count: counts.success, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/5', border: 'border-l-green-500' },
          { label: 'Running', count: counts.running, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/5', border: 'border-l-blue-500' },
          { label: 'Errors', count: counts.error, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/5', border: 'border-l-red-500' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${item.bg} rounded-xl border border-stone-200/40 dark:border-stone-800 border-l-[3px] ${item.border} p-4`}
          >
            <p className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">{item.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${item.color}`}>{item.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium mr-1">Type</span>
          {typeFilters.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                typeFilter === f
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-stone-200 dark:bg-stone-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium mr-1">Status</span>
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                statusFilter === f
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Clear Filters button - only visible when a filter is active */}
        {hasActiveFilter && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors ml-1"
          >
            <X className="size-3" />
            Clear Filters
          </motion.button>
        )}
      </motion.div>

      {/* Activity Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden"
      >
        <div className="relative">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-stone-200 dark:bg-stone-700" />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-2 border-b-stone-200 dark:border-b-stone-700">
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium w-28">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium w-24">Type</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium">Summary</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium w-24 hidden sm:table-cell">Actor</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium w-24 hidden md:table-cell">Started</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-medium w-24 text-right hidden md:table-cell">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item, i) => (
              <TableRow key={item.id} className={`border-b border-stone-100 dark:border-stone-800 last:border-0 border-l-2 ${i % 2 === 1 ? 'bg-stone-50/50 dark:bg-stone-800/50' : ''} hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${item.type === 'sync' ? 'border-l-blue-400' : item.type === 'ai' ? 'border-l-purple-400' : item.type === 'support' ? 'border-l-green-400' : 'border-l-stone-400'}`}>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2 relative z-10">
                    <span className={`w-2 h-2 rounded-full ${typeDotColors[item.type] || 'bg-stone-400'} ring-2 ring-white dark:ring-stone-900 flex-shrink-0`} />
                    <span className="text-xs text-stone-700 dark:text-stone-300 capitalize">{item.status}</span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'success' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : item.status === 'running' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${typeColors[item.type] || 'bg-stone-100 dark:bg-stone-700/50 text-stone-600 dark:text-stone-400'}`}>
                    {item.type}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-sm text-stone-800 dark:text-stone-200">{item.summary}</span>
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{item.actor}</span>
                </TableCell>
                <TableCell className="py-3 hidden md:table-cell">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{relativeTime(item.startedAt)}</span>
                </TableCell>
                <TableCell className="py-3 text-right hidden md:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">{formatDuration(item.durationMs)}</span>
                    {item.durationMs && item.durationMs > 0 && (
                      <div className="w-8 h-1 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500/60" style={{ width: `${Math.min(100, (item.durationMs / 30000) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center">
                    <ActivityIcon className="w-8 h-8 text-stone-300 dark:text-stone-600 mb-2" />
                    <p className="text-sm text-stone-400 dark:text-stone-500">No activities match your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </motion.div>
    </div>
  )
}