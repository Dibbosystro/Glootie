'use client'

import { useNavigation } from '@/store/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Facebook, Search, Package, Lightbulb, PenTool, Image as ImageIcon,
  LifeBuoy, MessageSquare, Settings, Activity, Menu, X, Zap, TrendingUp,
  Bell, CalendarDays, ChevronRight, Sun, Moon, AlertTriangle, PackageX,
  RefreshCw, Clock, ArrowRight, Sparkles, Command, Plus, CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'
import { useTheme } from 'next-themes'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { PageKey, DashboardData, Product, Campaign, Conversation } from '@/lib/types'
import { useNotificationsStore, type NotificationType } from '@/store/notifications'
import DashboardPage from '@/components/pages/dashboard-page'
import MetaAdsPage from '@/components/pages/meta-ads-page'
import GoogleAdsPage from '@/components/pages/google-ads-page'
import ProductsPage from '@/components/pages/products-page'
import ProductDetailPage from '@/components/pages/product-detail-page'
import OpportunitiesPage from '@/components/pages/opportunities-page'
import AdCopyPage from '@/components/pages/ad-copy-page'
import ImageMakerPage from '@/components/pages/image-maker-page'
import SupportPage from '@/components/pages/support-page'
import InboxPage from '@/components/pages/inbox-page'
import SettingsPage from '@/components/pages/settings-page'
import ActivityPage from '@/components/pages/activity-page'
import CreateCampaignDialog from '@/components/create-campaign-dialog'
import OnboardingTour from '@/components/onboarding-tour'

// ===== Nav Configuration =====
const navItems: { key: PageKey; label: string; icon: React.ElementType; group: string; badge?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { key: 'activity', label: 'Activity', icon: Activity, group: 'Overview' },
  { key: 'meta-ads', label: 'Meta Ads', icon: Facebook, group: 'Advertising' },
  { key: 'google-ads', label: 'Google Ads', icon: Search, group: 'Advertising' },
  { key: 'products', label: 'Products', icon: Package, group: 'Catalog' },
  { key: 'opportunities', label: 'Opportunities', icon: Lightbulb, group: 'Catalog' },
  { key: 'ad-copy', label: 'Ad Copy', icon: PenTool, group: 'Studio' },
  { key: 'image-maker', label: 'Image Maker', icon: ImageIcon, group: 'Studio' },
  { key: 'inbox', label: 'Inbox', icon: MessageSquare, group: 'Support', badge: '3' },
  { key: 'support', label: 'Composer', icon: LifeBuoy, group: 'Support' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'System' },
]

const pageLabels: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  'meta-ads': 'Meta Ads',
  'google-ads': 'Google Ads',
  products: 'Products',
  'product-detail': 'Product Detail',
  opportunities: 'Opportunities',
  'ad-copy': 'Ad Copy Studio',
  'image-maker': 'Image Maker',
  support: 'AI Reply Composer',
  inbox: 'Inbox',
  settings: 'Settings',
  activity: 'Activity Log',
}

// ===== Sync Status Dots =====
function SyncDot({ status }: { status: string }) {
  const color = status === 'success' || status === 'connected' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-amber-500'
  return <span className={`w-2 h-2 rounded-full ${color} ${status === 'success' ? 'animate-pulse-dot' : ''}`} />
}

// ===== Time ago helper =====
function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ===== Notification type config =====
const notifTypeConfig: Record<NotificationType, { border: string; dot: string; icon: React.ReactNode }> = {
  error: { border: 'border-l-red-500', dot: 'bg-red-500', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  warning: { border: 'border-l-amber-400', dot: 'bg-amber-500', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  info: { border: 'border-l-blue-400', dot: 'bg-blue-500', icon: <RefreshCw className="w-4 h-4 text-blue-500" /> },
  success: { border: 'border-l-green-500', dot: 'bg-green-500', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
}

// ===== Notification Item (store-based) =====
function NotificationItem({ id, title, message, type, read, createdAt, page, onNavigate, onMarkRead, onDelete }: {
  id: string; title: string; message: string; type: NotificationType; read: boolean; createdAt: string; page?: PageKey; onNavigate: (page?: PageKey) => void; onMarkRead: (id: string) => void; onDelete: (id: string) => void
}) {
  const config = notifTypeConfig[type]
  return (
    <div
      onClick={() => { onMarkRead(id); onNavigate(page) }}
      className={`group flex items-start gap-3 px-3 py-3 border-l-2 ${config.border} hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all duration-200 cursor-pointer rounded-r-lg relative ${!read ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'opacity-60'}`}
    >
      <div className="flex-shrink-0 mt-0.5 text-stone-400">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{title}</p>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">{message}</p>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">{formatRelativeTime(createdAt)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(id) }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ===== Search Result Item =====
function SearchResultItem({ icon, title, subtitle, type, onClick }: {
  icon: React.ReactNode; title: string; subtitle: string; type: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left rounded-lg group"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 group-hover:text-amber-600 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{title}</p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{subtitle}</p>
      </div>
      <Badge variant="secondary" className="text-[9px] font-medium uppercase tracking-wider flex-shrink-0">{type}</Badge>
    </button>
  )
}

function ShortcutRow({ k1, k2, label }: { k1: string; k2?: string; label: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
      <span className="text-xs text-stone-600 dark:text-stone-400">{label}</span>
      <div className="flex items-center gap-1">
        <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-[10px] font-mono text-stone-500 dark:text-stone-400">{k1}</kbd>
        {k2 && <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-[10px] font-mono text-stone-500 dark:text-stone-400">{k2}</kbd>}
      </div>
    </div>
  )
}

export default function Home() {
  const { currentPage, navigate, sidebarOpen, toggleSidebar, setSidebarOpen, goBack, showCreateCampaignModal, setShowCreateCampaignModal } = useNavigation()
  const { theme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Notification store
  const notifications = useNotificationsStore((s) => s.notifications)
  const markAsRead = useNotificationsStore((s) => s.markAsRead)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)
  const deleteNotification = useNotificationsStore((s) => s.deleteNotification)
  const unreadCount2 = notifications.filter(n => !n.read).length

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const unreadCount = data?.conversations.filter(c => c.unreadCount > 0).length ?? 0
  const hasError = data?.syncStatus.googleAds.status === 'error'

  // Notification navigate handler
  const handleNotifNavigate = useCallback((page?: PageKey) => {
    if (page) navigate(page)
    else navigate('activity')
    setNotifOpen(false)
  }, [navigate])

  // Search results
  const searchResults = useMemo(() => {
    if (!data || !searchQuery.trim()) return { products: [], campaigns: [], conversations: [] }
    const q = searchQuery.toLowerCase()
    return {
      products: data.products.filter((p: Product) => p.title.toLowerCase().includes(q)).slice(0, 4),
      campaigns: data.campaigns.filter((c: Campaign) => c.name.toLowerCase().includes(q)).slice(0, 4),
      conversations: data.conversations.filter((c: Conversation) => c.customerName.toLowerCase().includes(q)).slice(0, 3),
    }
  }, [data, searchQuery])

  const hasSearchResults = searchResults.products.length > 0 || searchResults.campaigns.length > 0 || searchResults.conversations.length > 0

  const handleSearchSelect = useCallback((type: string, id: string) => {
    if (type === 'product') {
      navigate('product-detail', id)
    } else if (type === 'campaign') {
      navigate('meta-ads')
    } else if (type === 'conversation') {
      navigate('inbox')
    }
    setSearchOpen(false)
    setSearchQuery('')
  }, [navigate])

  // Keyboard shortcuts
  const navKeys: Record<string, PageKey> = { '1': 'dashboard', '2': 'meta-ads', '3': 'google-ads', '4': 'products', '5': 'ad-copy', '6': 'inbox' }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(v => !v)
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        setShowCreateCampaignModal(true)
      }
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
      if (navKeys[e.key] && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        navigate(navKeys[e.key])
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
        setShortcutsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [theme])

  // Group nav items
  const groups = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  function renderPage() {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />
      case 'meta-ads': return <MetaAdsPage />
      case 'google-ads': return <GoogleAdsPage />
      case 'products': return <ProductsPage />
      case 'product-detail': return <ProductDetailPage />
      case 'opportunities': return <OpportunitiesPage />
      case 'ad-copy': return <AdCopyPage />
      case 'image-maker': return <ImageMakerPage />
      case 'support': return <SupportPage />
      case 'inbox': return <InboxPage />
      case 'settings': return <SettingsPage />
      case 'activity': return <ActivityPage />
      default: return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950 transition-colors">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-stone-900 dark:bg-stone-950 flex flex-col transition-transform duration-200 ease-out shadow-xl lg:shadow-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="h-px bg-gradient-to-r from-amber-500/60 via-amber-400/30 to-transparent" />
        <div className="flex items-center justify-between px-5 h-14 flex-shrink-0 bg-gradient-to-r from-stone-900 via-stone-900 to-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">GLOOTIE</span>
              <p className="text-[9px] text-stone-500 -mt-0.5 tracking-wider uppercase">Command Center</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-stone-400 hover:text-white hover:bg-stone-800 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="bg-stone-800/80" />
        {/* Top glow line */}
        <div className="h-px bg-gradient-to-r from-amber-500/60 via-amber-400/30 to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500 font-semibold px-2.5 mb-1.5 hover:bg-stone-800/50 rounded transition-colors cursor-default">{group}</p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const isActive = currentPage === item.key || (item.key === 'products' && currentPage === 'product-detail')
                  const Icon = item.icon
                  const badgeCount = item.key === 'inbox' ? unreadCount : item.badge ? parseInt(item.badge) : 0
                  return (
                    <TooltipProvider key={item.key} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(item.key)}
                            data-tour={item.key === 'dashboard' ? 'dashboard' : item.key === 'ad-copy' ? 'ai-studio' : undefined}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group active:scale-[0.98] ${
                              isActive
                                ? 'bg-amber-500/15 text-amber-400 shadow-sm shadow-amber-500/10'
                                : 'text-stone-400 hover:bg-stone-800/80 hover:text-stone-200'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            )}
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                                isActive ? 'bg-amber-500 text-white shadow-sm' : 'bg-stone-700 text-stone-300'
                              }`}>
                                {badgeCount}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs lg:hidden">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer - sync status */}
        <div className="px-4 py-3 border-t border-stone-800/80 flex-shrink-0">
          <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-1.5">
              <SyncDot status={data?.syncStatus.shopify.status ?? 'success'} />
              <span className="text-[11px] text-stone-500">Shopify</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SyncDot status={data?.syncStatus.meta.status ?? 'success'} />
              <span className="text-[11px] text-stone-500">Meta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SyncDot status={data?.syncStatus.googleAds.status ?? 'error'} />
              <span className="text-[11px] text-stone-500">Google</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2.5 px-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-[10px] font-bold text-white shadow-sm relative">
                CR
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-stone-900 dark:border-stone-950">
                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-stone-300 leading-tight">Cafe Racer Garage</p>
                <p className="text-[9px] text-stone-500 dark:text-stone-500">Pro Plan</p>
              </div>
            </div>
            <span className="bg-amber-500/15 text-amber-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-md">v1.2</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-stone-200/60 dark:border-stone-800 bg-gradient-to-r from-white via-white to-stone-50/50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900/50 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 lg:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="w-4 h-4" />
            </Button>
            {currentPage === 'product-detail' && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors mr-1"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                Back
              </button>
            )}
            <h1 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{pageLabels[currentPage]}</h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search trigger */}
            <Popover open={searchOpen} onOpenChange={(open) => { setSearchOpen(open); if (!open) setSearchQuery('') }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" data-tour="search" className="hidden sm:flex h-8 w-56 justify-start text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 gap-2 px-3 rounded-lg border border-stone-200/60 dark:border-stone-700 text-xs">
                  <Search className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">Search...</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 px-1.5 font-mono text-[10px] font-medium text-stone-400">
                    <Command className="w-2.5 h-2.5" />K
                  </kbd>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
                <div className="p-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search products, campaigns, customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 pl-10 text-sm border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 rounded-lg"
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {searchQuery.trim() && !hasSearchResults && (
                    <div className="py-8 text-center">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Search className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                      </motion.div>
                      <p className="text-sm text-stone-500 dark:text-stone-400">No results found</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Try a different search term</p>
                    </div>
                  )}
                  {!searchQuery.trim() && (
                    <div className="py-6 text-center">
                      <p className="text-xs text-stone-400 dark:text-stone-500">Start typing to search across your data</p>
                    </div>
                  )}
                  {searchResults.products.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold px-3 pt-3 pb-1">Products</p>
                      {searchResults.products.map(p => (
                        <SearchResultItem
                          key={p.id}
                          icon={<Package className="w-4 h-4" />}
                          title={p.title}
                          subtitle={`$${p.price.toFixed(2)} • ${p.sales30d} sales • Score: ${p.score}`}
                          type="Product"
                          onClick={() => handleSearchSelect('product', p.id)}
                        />
                      ))}
                    </div>
                  )}
                  {searchResults.campaigns.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold px-3 pt-3 pb-1">Campaigns</p>
                      {searchResults.campaigns.map(c => (
                        <SearchResultItem
                          key={c.id}
                          icon={<TrendingUp className="w-4 h-4" />}
                          title={c.name}
                          subtitle={`$${c.metrics.revenue.toLocaleString()} revenue • ${c.metrics.roas.toFixed(1)}x ROAS`}
                          type={c.source === 'meta' ? 'Meta' : 'Google'}
                          onClick={() => handleSearchSelect('campaign', c.id)}
                        />
                      ))}
                    </div>
                  )}
                  {searchResults.conversations.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold px-3 pt-3 pb-1">Conversations</p>
                      {searchResults.conversations.map(c => (
                        <SearchResultItem
                          key={c.id}
                          icon={<MessageSquare className="w-4 h-4" />}
                          title={c.customerName}
                          subtitle={c.lastMessage}
                          type={c.status === 'waiting' ? 'Waiting' : 'Resolved'}
                          onClick={() => handleSearchSelect('conversation', c.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Mobile search button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden w-8 h-8 text-stone-500 dark:text-stone-400"
              onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100) }}
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Date range */}
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 text-[10px] border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 py-0.5 px-2.5 rounded-md">
              <CalendarDays className="w-3 h-3" />
              Last 30 days
            </Badge>

            {/* Dark mode toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    <Sun className="w-4 h-4 dark:hidden" />
                    <Moon className="w-4 h-4 hidden dark:block" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" data-tour="notifications" aria-label="Notifications" className="w-8 h-8 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount2 > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-sm ring-2 ring-red-500/20">
                      {unreadCount2}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Notifications</h3>
                    {unreadCount2 > 0 && (
                      <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                        {unreadCount2}
                      </Badge>
                    )}
                  </div>
                  {unreadCount2 > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto text-green-400 dark:text-green-500 mb-2" />
                        <p className="text-sm text-stone-500 dark:text-stone-400">All caught up!</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <NotificationItem
                          key={n.id}
                          id={n.id}
                          title={n.title}
                          message={n.message}
                          type={n.type}
                          read={n.read}
                          createdAt={n.createdAt}
                          page={n.page}
                          onNavigate={handleNotifNavigate}
                          onMarkRead={markAsRead}
                          onDelete={deleteNotification}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
                {notifications.length > 0 && (
                  <div className="border-t border-stone-100 dark:border-stone-800 p-2">
                    <button
                      onClick={() => { navigate('activity'); setNotifOpen(false) }}
                      className="w-full text-center text-xs text-amber-600 hover:text-amber-700 font-medium py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    >
                      View All Notifications
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Sync status pill */}
            <Badge
              variant="outline"
              className={`hidden sm:flex items-center gap-1.5 text-[10px] py-0.5 px-2.5 rounded-md transition-colors ${
                hasError
                  ? 'border-red-200 dark:border-red-800 text-red-600 bg-red-50 dark:bg-red-500/10'
                  : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasError ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-green-500'} animate-pulse-dot`} />
              {hasError ? '1 Issue' : 'All Synced'}
            </Badge>
          </div>
        </header>

        {/* Page content with transitions */}
        <div className="flex-1 overflow-y-auto">
          {/* Decorative gradient line below header */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-200/60 dark:via-amber-500/20 to-transparent" />
          <div className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Create Campaign Dialog */}
        <CreateCampaignDialog />

        {/* Keyboard Shortcuts FAB */}
        <button
          onClick={() => setShortcutsOpen(v => !v)}
          className="fixed bottom-4 right-4 z-40 w-8 h-8 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 shadow-sm hover:shadow-md"
          aria-label="Keyboard shortcuts (Shift+/)"
        >
          <Command className="w-3.5 h-3.5" />
        </button>
        <Popover open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <PopoverAnchor className="fixed bottom-12 right-4" />
          <PopoverContent className="w-80 p-0" side="top" align="end" sideOffset={8}>
            <div className="p-3 border-b border-stone-100 dark:border-stone-800">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Keyboard Shortcuts</h4>
              <p className="text-[11px] text-stone-400 mt-0.5">Quick navigation and actions</p>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              <div className="space-y-0.5">
                <ShortcutRow k1="⌘" k2="K" label="Search" />
                <ShortcutRow k1="?" label="Toggle shortcuts" />
                <ShortcutRow k1="Esc" label="Close dialog / panel" />
                <div className="h-px bg-stone-100 dark:bg-stone-800 my-1.5" />
                <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium px-2 pt-1">Navigation</p>
                <ShortcutRow k1="1" label="Dashboard" />
                <ShortcutRow k1="2" label="Meta Ads" />
                <ShortcutRow k1="3" label="Google Ads" />
                <ShortcutRow k1="4" label="Products" />
                <ShortcutRow k1="5" label="Ad Copy" />
                <ShortcutRow k1="6" label="Inbox" />
                <div className="h-px bg-stone-100 dark:bg-stone-800 my-1.5" />
                <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium px-2 pt-1">Actions</p>
                <ShortcutRow k1="N" label="New campaign" />
                <ShortcutRow k1="D" label="Toggle dark mode" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden h-16 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 pb-safe shadow-[0_-1px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_10px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around h-full px-1">
          <button
            onClick={() => navigate('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors active:scale-95 ${
              currentPage === 'dashboard'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
            {currentPage === 'dashboard' && (
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => navigate('products')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors active:scale-95 ${
              currentPage === 'products' || currentPage === 'product-detail'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-medium">Products</span>
            {(currentPage === 'products' || currentPage === 'product-detail') && (
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setShowCreateCampaignModal(true)}
            className="flex flex-col items-center justify-center -mt-5 relative"
          >
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-md" />
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </button>

          <button
            onClick={() => navigate('inbox')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors relative active:scale-95 ${
              currentPage === 'inbox'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold px-0.5 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Inbox</span>
            {currentPage === 'inbox' && (
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => navigate('settings')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors active:scale-95 ${
              currentPage === 'settings'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
            {currentPage === 'settings' && (
              <span className="w-1 h-1 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </nav>

      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  )
}