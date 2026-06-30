'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  RefreshCw, CheckCircle2, AlertTriangle, Plus, Trash2, ExternalLink,
  Database, Facebook, Search as SearchIcon, Sparkles, Settings2,
  Bell, Shield, Moon, Globe, Key, AlertOctagon, Zap, Eye, Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { DashboardData, IntegrationConfig } from '@/lib/types'

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  connected: 'bg-green-500',
  active: 'bg-green-500',
  needs_setup: 'bg-amber-500',
  needs_key: 'bg-stone-400',
}

const statusLabels: Record<string, { label: string; className: string }> = {
  success: { label: 'Synced', className: 'bg-green-100 text-green-700' },
  connected: { label: 'Connected', className: 'bg-green-100 text-green-700' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
  warning: { label: 'Warning', className: 'bg-amber-100 text-amber-700' },
  needs_setup: { label: 'Setup Required', className: 'bg-amber-100 text-amber-700' },
  needs_key: { label: 'API Key Required', className: 'bg-stone-100 text-stone-600' },
}

function SyncCard({ name, icon: Icon, lastSync, status, onSync, description }: {
  name: string; icon: React.ElementType; lastSync: string | null; status: string; onSync: () => void; description: string
}) {
  const isOk = status === 'success' || status === 'connected'
  const statusInfo = statusLabels[status] ?? statusLabels.needs_setup
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center ring-1 ring-stone-200/60 dark:ring-stone-700">
            <Icon className="w-5 h-5 text-stone-600 dark:text-stone-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{name}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{description}</p>
          </div>
        </div>
        <Badge className={`${statusInfo.className} border-0 text-[10px] font-medium`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status] || 'bg-stone-300'} ${isOk ? 'animate-pulse-dot' : ''} mr-1.5`} />
          {statusInfo.label}
        </Badge>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-stone-400">
          Last sync: <span className="text-stone-600 dark:text-stone-300 font-medium">{relativeTime(lastSync)}</span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onSync}
        className="w-full h-9 text-xs border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync Now
      </Button>
    </motion.div>
  )
}

function IntegrationCard({ integration, index }: { integration: IntegrationConfig; index: number }) {
  const isConfigured = integration.configured
  const statusInfo = statusLabels[integration.status] ?? statusLabels.needs_setup

  const iconMap: Record<string, React.ElementType> = {
    shopify: Database,
    meta: Facebook,
    'google-ads': SearchIcon,
    ai: Sparkles,
  }
  const Icon = iconMap[integration.type] ?? Settings2

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5 hover:shadow-md transition-shadow group ${isConfigured ? 'hover:shadow-green-100 dark:hover:shadow-green-900/20' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center ring-1 ring-stone-200/60 dark:ring-stone-700 group-hover:ring-amber-200 dark:group-hover:ring-amber-500/30 transition-colors">
            <Icon className="w-5 h-5 text-stone-600 dark:text-stone-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{integration.name}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{integration.description}</p>
          </div>
        </div>
        <Badge className={`${statusInfo.className} border-0 text-[10px] font-medium`}>
          {isConfigured ? (
            <><span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>Connected</>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-stone-400 mr-1.5" />Setup Required</>
          )}
        </Badge>
      </div>
      {isConfigured ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
            <Settings2 className="w-3 h-3 mr-1" /> Configure
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
            <ExternalLink className="w-3 h-3 mr-1" /> Dashboard
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto">
            <Trash2 className="w-3 h-3 mr-1" /> Remove
          </Button>
        </div>
      ) : (
        <Button size="sm" className="h-9 text-xs bg-amber-700 hover:bg-amber-800 text-white">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Connect {integration.name}
        </Button>
      )}
    </motion.div>
  )
}

// ===== Notification Toggle Row =====
function NotifToggle({ icon: Icon, label, description, defaultChecked }: {
  icon: React.ElementType; label: string; description: string; defaultChecked: boolean
}) {
  const [enabled, setEnabled] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
          <Icon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{label}</p>
          <p className="text-[11px] text-stone-400">{description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
    </div>
  )
}

// ===== Section Header =====
function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4 border-l-[3px] border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10 pl-4 py-1.5 -ml-5 rounded-r-lg">
      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center ring-1 ring-amber-200/60 dark:ring-amber-800/40">
        <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
        <p className="text-[11px] text-stone-400">{description}</p>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-stone-200 dark:from-stone-800 via-stone-300 dark:via-stone-700 to-transparent" />
    </div>
  )
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-7 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { syncStatus, integrations } = data

  return (
    <div className="space-y-8 max-w-4xl">
      {/* User Profile Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 p-5 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-500/20">
            CR
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Cafe Racer Garage</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">admin@caferacergarage.com</p>
          </div>
          <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-0 text-xs font-medium gap-1">
            <Crown className="size-3" />
            Pro Plan
          </Badge>
        </div>
      </motion.div>

      {/* Data Sync Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader icon={Database} title="Data Sync" description="Manage connections to your data sources" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SyncCard
            name="Shopify"
            icon={Database}
            lastSync={syncStatus.shopify.lastSync}
            status={syncStatus.shopify.status}
            onSync={() => {}}
            description="Products, orders, and inventory"
          />
          <SyncCard
            name="Meta Ads"
            icon={Facebook}
            lastSync={syncStatus.meta.lastSync}
            status={syncStatus.meta.status}
            onSync={() => {}}
            description="Campaign performance and audiences"
          />
          <SyncCard
            name="Google Ads"
            icon={SearchIcon}
            lastSync={syncStatus.googleAds.lastSync}
            status={syncStatus.googleAds.status}
            onSync={() => {}}
            description="Search and PMax campaigns"
          />
        </div>
      </motion.div>

      {/* Data Integrations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <SectionHeader icon={Globe} title="Integrations" description="Connected platforms and data sources" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.filter(i => i.type !== 'ai').map((integration, i) => (
            <IntegrationCard key={integration.id} integration={integration} index={i} />
          ))}
        </div>
      </motion.div>

      {/* AI Providers */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionHeader icon={Sparkles} title="AI Providers" description="Configure AI models for ad copy and support" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.filter(i => i.type === 'ai').map((integration, i) => (
            <IntegrationCard key={integration.id} integration={integration} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionHeader icon={Bell} title="Notifications" description="Control what alerts you receive" />
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm p-5">
          <NotifToggle icon={AlertTriangle} label="Low Stock Alerts" description="Notify when product inventory drops below 15 units" defaultChecked={true} />
          <Separator className="my-1" />
          <NotifToggle icon={AlertOctagon} label="Sync Errors" description="Alert when data sync fails or requires re-authentication" defaultChecked={true} />
          <Separator className="my-1" />
          <NotifToggle icon={Zap} label="Campaign Performance" description="Daily summary of campaign ROAS and spend anomalies" defaultChecked={true} />
          <Separator className="my-1" />
          <NotifToggle icon={Eye} label="Weekly Report" description="Receive a weekly performance digest every Monday" defaultChecked={false} />
          <Separator className="my-1" />
          <NotifToggle icon={Shield} label="Security Alerts" description="Notify about API key changes and access events" defaultChecked={true} />
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionHeader icon={Key} title="Danger Zone" description="Irreversible actions — proceed with caution" />
        <div className="bg-white dark:bg-stone-900 rounded-xl border-2 border-red-200 dark:border-red-900/50 shadow-sm p-5 danger-pulse-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Reset All Data</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Clear all synced campaigns, products, and activity history</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700">
              <Trash2 className="w-3 h-3 mr-1.5" /> Reset Data
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Delete Account</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700">
              <Trash2 className="w-3 h-3 mr-1.5" /> Delete Account
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}