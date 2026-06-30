'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search, RefreshCw, Sparkles, Send, Clock, MessageCircle, CheckCircle2,
  AlertCircle, Filter, MessageSquare, Package, StickyNote, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'

// ===== Shapes returned by the real Chatway/support endpoints =====
interface WaitingConversation {
  id: string
  contactName: string
  contactId: string | null
  isResolved: boolean
  unreadMessages: number
  createdAt: string
  latestMessageContent: string
  lastCustomerMessage: string
  ageLabel: string
}
interface ThreadMessage {
  id: string
  content: string
  type: 'message' | 'note'
  sender: 'customer' | 'staff' | 'bot'
  agentName: string | null
  createdAt: string
}
interface LiveProduct {
  title: string
  handle: string
  shopifyId: string
  price: string
  inventoryQty: number
  status: string
  url: string
}
interface ComposeTrace { tool: string; input: Record<string, unknown>; output: unknown }
interface ComposeResult {
  reply: string
  trace: ComposeTrace[]
  model: string
  provider: 'neokens' | 'anthropic' | 'error'
  errorMessage?: string
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
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
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
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

function roleOf(sender: ThreadMessage['sender']): 'customer' | 'agent' | 'ai' {
  if (sender === 'staff') return 'agent'
  if (sender === 'bot') return 'ai'
  return 'customer'
}

async function getJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export default function InboxPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [draftMeta, setDraftMeta] = useState<{ kb: number; products: number } | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [resolveAfterSend, setResolveAfterSend] = useState(false)

  // --- Open + waiting conversations (on-demand pull; no cron) ---
  const {
    data: convData, isLoading: convLoading, isFetching: convFetching, refetch: refetchConvs, error: convError,
  } = useQuery<{ conversations: WaitingConversation[] }>({
    queryKey: ['chatway-conversations'],
    queryFn: () => getJson('/api/support/chatway/conversations?pages=4'),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
  const conversations = convData?.conversations ?? []
  const waitingCount = conversations.length
  const unreadCount = conversations.filter(c => c.unreadMessages > 0).length

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      c => c.contactName.toLowerCase().includes(q) || c.lastCustomerMessage.toLowerCase().includes(q),
    )
  }, [conversations, search])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  // Reset the composer whenever a different conversation is opened.
  useEffect(() => {
    setReplyText('')
    setDraftMeta(null)
    setProductQuery('')
    setResolveAfterSend(false)
  }, [selectedId])

  // --- Full thread for the selected conversation ---
  const { data: threadData, isLoading: threadLoading } = useQuery<{ messages: ThreadMessage[] }>({
    queryKey: ['chatway-thread', selectedId],
    queryFn: () => getJson(`/api/support/chatway/messages?conversationId=${encodeURIComponent(selectedId!)}`),
    enabled: Boolean(selectedId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const thread = threadData?.messages ?? []

  // --- Generate a grounded draft (KB + live Shopify) ---
  const composeMutation = useMutation<ComposeResult, Error, string>({
    mutationFn: async (customerMessage: string) => {
      const res = await fetch('/api/support/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerMessage }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Compose failed')
      return body as ComposeResult
    },
    onSuccess: (result) => {
      if (result.provider === 'error') {
        toast({ title: 'Draft failed', description: result.errorMessage ?? 'The model did not return a reply.', variant: 'destructive' })
        return
      }
      setReplyText(result.reply)
      const kb = result.trace.find(t => t.tool === 'search_kb')?.output
      const prod = result.trace.find(t => t.tool === 'get_product')?.output
      setDraftMeta({
        kb: Array.isArray(kb) ? kb.length : 0,
        products: Array.isArray(prod) ? prod.length : 0,
      })
    },
    onError: (err) => toast({ title: 'Draft failed', description: err.message, variant: 'destructive' }),
  })

  // --- Live product search for the picker ---
  const { data: productData, isFetching: productSearching } = useQuery<{ products: LiveProduct[] }>({
    queryKey: ['chatway-products', productQuery],
    queryFn: () => getJson(`/api/support/chatway/products?q=${encodeURIComponent(productQuery)}`),
    enabled: productPickerOpen && productQuery.trim().length >= 2,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const products = productData?.products ?? []

  function insertProduct(p: LiveProduct) {
    setReplyText(prev => (prev.trim() ? `${prev.trim()}\n\n${p.url}` : p.url))
    setProductPickerOpen(false)
    setProductQuery('')
  }

  // --- Send a reply / note (optionally resolving) ---
  const sendMutation = useMutation<
    { ok: boolean; resolved: boolean },
    Error,
    { type: 'message' | 'note'; resolve: boolean; content?: string }
  >({
    mutationFn: async ({ type, resolve, content }) => {
      const res = await fetch('/api/support/chatway/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, content: content ?? replyText, type, resolve }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Send failed')
      return body
    },
    onSuccess: (body, vars) => {
      toast({
        title: vars.resolve && !vars.content && !replyText.trim() ? 'Conversation resolved'
          : vars.type === 'note' ? 'Note added' : 'Reply sent',
        description: body.resolved ? 'Thread marked resolved.' : undefined,
      })
      setReplyText('')
      setDraftMeta(null)
      queryClient.invalidateQueries({ queryKey: ['chatway-thread', selectedId] })
      refetchConvs()
      if (body.resolved) setSelectedId(null)
    },
    onError: (err) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  })

  const sending = sendMutation.isPending
  const drafting = composeMutation.isPending

  if (convLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 overflow-hidden h-[600px]">
          <div className="border-r border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            <p className="text-xs text-stone-400">Scanning Chatway for waiting customers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Inbox</h2>
          {unreadCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] font-semibold">{unreadCount} unread</Badge>
          )}
          {waitingCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 text-[10px] font-semibold">{waitingCount} waiting</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            className="h-8 text-xs border-stone-200 dark:border-stone-700"
            onClick={() => refetchConvs()}
            disabled={convFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${convFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </motion.div>

      {convError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" /> {(convError as Error).message}
        </div>
      )}

      {/* Two-panel inbox */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/60 dark:border-stone-800 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100vh-180px)] min-h-[500px]"
      >
        {/* Conversation list */}
        <div className="border-r border-stone-200/60 dark:border-stone-800 flex flex-col min-h-0">
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

          <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center gap-1.5 text-[11px] text-stone-500">
            <Filter className="w-3 h-3 text-stone-400" />
            <span className="font-medium">Waiting on a reply</span>
            <span className="ml-auto inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] tabular-nums px-1 font-semibold">{filtered.length}</span>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all border-l-2 ${
                    selectedId === conv.id
                      ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 border-l-amber-500 shadow-sm'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 border border-transparent border-l-amber-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(conv.contactName)} flex items-center justify-center text-[11px] font-bold`}>
                        {getInitials(conv.contactName)}
                      </div>
                      {conv.unreadMessages > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 shadow-sm">
                          {conv.unreadMessages}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${conv.unreadMessages > 0 ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-300'}`}>
                          {conv.contactName}
                        </span>
                        <span className="text-[10px] text-stone-400 flex-shrink-0">{conv.ageLabel}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">{conv.lastCustomerMessage}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] text-stone-400">waiting</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-300 dark:text-emerald-700 mb-2" />
                  <p className="text-xs text-stone-400">{search ? 'No conversations match your search' : 'No customers are waiting on a reply'}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message thread */}
        <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
          {selected ? (
            <>
              {/* Conversation header */}
              <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${getAvatarColor(selected.contactName)} flex items-center justify-center text-[11px] font-bold`}>
                  {getInitials(selected.contactName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{selected.contactName}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] text-stone-500">waiting {selected.ageLabel}</span>
                  </div>
                </div>
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-[11px] border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={() => sendMutation.mutate({ type: 'message', resolve: true, content: '' })}
                  disabled={sending}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Resolved
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 p-5">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {threadLoading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-stone-400">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                      <p className="text-xs">Loading conversation...</p>
                    </div>
                  )}
                  {!threadLoading && thread.map((msg) => {
                    const role = roleOf(msg.sender)
                    if (msg.type === 'note') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 border border-dashed border-stone-200 dark:border-stone-700">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <StickyNote className="w-3 h-3" />
                              <span className="text-[10px] font-semibold uppercase tracking-wide">Internal note{msg.agentName ? ` · ${msg.agentName}` : ''}</span>
                            </div>
                            {msg.content}
                          </div>
                        </div>
                      )
                    }
                    const mine = role === 'agent'
                    return (
                      <motion.div
                        key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          mine
                            ? 'bg-amber-700 text-white rounded-br-sm'
                            : role === 'ai'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-stone-800 dark:text-stone-200 rounded-bl-sm border border-amber-200/40 dark:border-amber-500/20'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-sm'
                        }`}>
                          {role === 'ai' && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Bot</span>
                            </div>
                          )}
                          {mine && msg.agentName && (
                            <div className="text-[10px] font-semibold text-amber-100/80 mb-1">{msg.agentName}</div>
                          )}
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                          <p className={`text-[10px] mt-2 ${mine ? 'text-amber-100/70' : role === 'ai' ? 'text-amber-600/60 dark:text-amber-400/60' : 'text-stone-400'}`}>
                            {relativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                  {!threadLoading && thread.length === 0 && (
                    <p className="text-center text-xs text-stone-400 py-10">No messages in this thread yet.</p>
                  )}
                </div>
              </ScrollArea>

              {/* Reply composer */}
              <div className="p-4 border-t border-stone-100 dark:border-stone-800 space-y-2">
                {draftMeta && (
                  <div className="flex items-center gap-1.5 px-1 text-[10px] text-stone-400 max-w-2xl mx-auto">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Grounded on {draftMeta.kb} KB match{draftMeta.kb === 1 ? '' : 'es'} and {draftMeta.products} live product{draftMeta.products === 1 ? '' : 's'}. Review before sending.
                  </div>
                )}
                <div className="max-w-2xl mx-auto space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply, or click Generate to draft a grounded one..."
                    className="min-h-[80px] max-h-[200px] resize-y text-sm rounded-xl border-stone-200 dark:border-stone-700"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm" variant="outline"
                      className="h-8 text-[11px] border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      onClick={() => composeMutation.mutate(selected.lastCustomerMessage)}
                      disabled={drafting}
                    >
                      {drafting
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Drafting...</>
                        : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate reply</>}
                    </Button>

                    <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 text-[11px] border-stone-200 dark:border-stone-700">
                          <Package className="w-3.5 h-3.5 mr-1.5" /> Add product link
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80 p-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                          <Input
                            autoFocus
                            value={productQuery}
                            onChange={(e) => setProductQuery(e.target.value)}
                            placeholder="Search live products..."
                            className="h-8 text-xs pl-8"
                          />
                        </div>
                        <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                          {productSearching && (
                            <div className="flex items-center gap-2 px-2 py-3 text-xs text-stone-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching Shopify...
                            </div>
                          )}
                          {!productSearching && productQuery.trim().length >= 2 && products.length === 0 && (
                            <p className="px-2 py-3 text-xs text-stone-400">No products matched.</p>
                          )}
                          {products.map((p) => (
                            <button
                              key={p.shopifyId}
                              onClick={() => insertProduct(p)}
                              className="w-full text-left p-2 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                              <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{p.title}</p>
                              <p className="text-[10px] text-stone-500">
                                AUD {p.price} · {p.inventoryQty > 0 ? `${p.inventoryQty} in stock` : 'out of stock'} · {p.status}
                              </p>
                            </button>
                          ))}
                          {productQuery.trim().length < 2 && (
                            <p className="px-2 py-3 text-[10px] text-stone-400">Type at least 2 characters.</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <label className="flex items-center gap-1.5 text-[11px] text-stone-500 ml-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={resolveAfterSend}
                        onChange={(e) => setResolveAfterSend(e.target.checked)}
                        className="accent-amber-600 w-3.5 h-3.5"
                      />
                      Resolve after sending
                    </label>

                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm" variant="outline"
                        className="h-8 text-[11px] border-stone-200 dark:border-stone-700"
                        onClick={() => sendMutation.mutate({ type: 'note', resolve: false })}
                        disabled={sending || !replyText.trim()}
                      >
                        <StickyNote className="w-3.5 h-3.5 mr-1.5" /> Add as note
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-[11px] bg-amber-700 hover:bg-amber-800 text-white"
                        onClick={() => sendMutation.mutate({ type: 'message', resolve: resolveAfterSend })}
                        disabled={sending || !replyText.trim()}
                      >
                        {sending
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending...</>
                          : <><Send className="w-3.5 h-3.5 mr-1.5" /> Send to customer</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-stone-300 dark:text-stone-500" />
              </div>
              <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Select a conversation</p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-[240px]">
                Choose a waiting customer to read the thread, generate a grounded reply, and send it back to Chatway.
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
