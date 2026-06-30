'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, Sparkles, Send, Clock, MessageCircle, CheckCircle2, AlertCircle, Filter, Archive, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNavigation } from '@/store/navigation'
import type { DashboardData, Conversation } from '@/lib/types'

function relativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = [
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'waiting': return <Clock className="w-3.5 h-3.5 text-amber-500" />
    case 'active': return <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
    case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    default: return <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
  }
}

const statusFilterOptions = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
]

const sampleThread = [
  { id: 'm1', role: 'customer' as const, content: 'Hey, I have a 1978 Honda CB750K. Will the Complete LED Headlight Relay Kit work with my bike?', timestamp: '2025-06-28T12:28:00Z' },
  { id: 'm2', role: 'customer' as const, content: 'The original stator puts out about 130W if that helps.', timestamp: '2025-06-28T12:30:00Z' },
  { id: 'm3', role: 'ai' as const, content: 'Yes, the Complete LED Headlight Relay Kit is fully compatible with your 1978 CB750K! It\'s designed for all SOHC CB750 models (1969-1978). The 130W stator output is more than sufficient — the LED kit only draws about 35W total. Installation is straightforward, roughly 20 minutes.', timestamp: '2025-06-28T12:31:00Z' },
]

export default function InboxPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const conversations = data?.conversations ?? []
  const unreadCount = conversations.filter(c => c.unreadCount > 0).length
  const waitingCount = conversations.filter(c => c.status === 'waiting').length

  const filtered = useMemo(() => {
    let result = conversations
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => c.customerName.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q))
    }
    return result
  }, [conversations, search, statusFilter])

  const selected = conversations.find(c => c.id === selectedId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 bg-white rounded-xl border border-stone-200/60 overflow-hidden h-[600px]">
          <div className="border-r border-stone-200 p-4 space-y-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <div className="p-6 flex items-center justify-center">
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Inbox</h2>
          {unreadCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] font-semibold">
              {unreadCount} unread
            </Badge>
          )}
          {waitingCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 text-[10px] font-semibold">
              {waitingCount} waiting
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-stone-200 dark:border-stone-700">
            <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive All
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs border-stone-200 dark:border-stone-700">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Two-panel inbox */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-180px)] min-h-[500px]"
      >
        {/* Conversation list */}
        <div className="border-r border-stone-200/60 dark:border-stone-800 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-stone-100 dark:border-stone-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="h-8 text-xs pl-8 rounded-lg border-stone-200 dark:border-stone-700"
              />
            </div>
          </div>

          {/* Status filters */}
          <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-1">
            <Filter className="w-3 h-3 text-stone-400 mr-1" />
            {statusFilterOptions.map((opt, index) => {
              const count = opt.key === 'all' ? conversations.length : conversations.filter(c => c.status === opt.key).length
              return (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`text-[11px] px-2 py-0.5 rounded-md transition-colors font-medium ${
                    statusFilter === opt.key
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {opt.label} {count > 0 && <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] tabular-nums px-1 font-semibold">{count}</span>}
                </button>
              )
            })}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all border-l-2 animate-slide-in-left ${
                    selectedId === conv.id
                      ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 border-l-amber-500 shadow-sm'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 border border-transparent ' + (conv.status === 'waiting' ? 'border-l-amber-400' : conv.status === 'active' ? 'border-l-blue-400' : 'border-l-green-400')
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(conv.customerName)} flex items-center justify-center text-[11px] font-bold`}>
                        {getInitials(conv.customerName)}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 shadow-sm animate-pulse-dot">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-300'}`}>
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-stone-400 flex-shrink-0">{relativeTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">{conv.lastMessage}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getStatusIcon(conv.status)}
                        <span className="text-[10px] text-stone-400 capitalize">{conv.status}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                  <p className="text-xs text-stone-400">No conversations match your filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message thread */}
        <div className="flex flex-col">
          {selected ? (
            <>
              {/* Conversation header */}
              <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${getAvatarColor(selected.customerName)} flex items-center justify-center text-[11px] font-bold`}>
                  {getInitials(selected.customerName)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{selected.customerName}</p>
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(selected.status)}
                    <span className="text-[10px] text-stone-500 capitalize">{selected.status}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-[10px] text-stone-400">{relativeTime(selected.lastMessageAt)}</span>
                  </div>
                </div>
                {selected.status === 'waiting' && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] border-green-200 text-green-700 hover:bg-green-50">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Resolved
                  </Button>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-5">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {sampleThread.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'customer'
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-br-sm'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-stone-800 dark:text-stone-200 rounded-bl-sm border border-amber-200/40 dark:border-amber-500/20'
                      }`}>
                        {msg.role === 'ai' && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">AI Draft</span>
                          </div>
                        )}
                        {msg.content}
                        <p className={`text-[10px] mt-2 ${
                          msg.role === 'customer' ? 'text-stone-400' : 'text-amber-600/60 dark:text-amber-400/60'
                        }`}>
                          {relativeTime(msg.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply input */}
              <div className="p-4 border-t border-stone-100 dark:border-stone-800">
                {selected.status === 'active' && (
                  <div className="flex items-center gap-1.5 mb-3 px-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 typing-dot-1" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 typing-dot-2" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 typing-dot-3" />
                    </div>
                    <span className="text-[10px] text-stone-400">Customer is typing...</span>
                  </div>
                )}
                <div className="flex items-end gap-2 max-w-2xl mx-auto">
                  <div className="flex-1 relative">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl border-stone-200 dark:border-stone-700 pr-24"
                      rows={1}
                    />
                    <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-2"
                      >
                        <Sparkles className="w-3 h-3 mr-1" /> AI Draft
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-amber-700 hover:bg-amber-800 text-white flex-shrink-0 disabled:opacity-40"
                    disabled={!replyText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4 animate-float">
                <MessageCircle className="w-8 h-8 text-stone-300 dark:text-stone-500" />
              </div>
              <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Select a conversation</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-[220px]">
                Choose a conversation from the list to view messages and reply
              </p>
              <div className="mt-4 flex items-center gap-3 text-stone-300 dark:text-stone-600">
                <MessageSquare className="size-4" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Inbox</span>
                <MessageSquare className="size-4" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}