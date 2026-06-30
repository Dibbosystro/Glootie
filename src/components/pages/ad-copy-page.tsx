'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  Wrench,
  Camera,
  Zap,
  GitCompare,
  Copy,
  RefreshCw,
  Pencil,
  Check,
  X,
  Clock,
  Package,
  BookmarkPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardData } from '@/lib/types'

// ===== Types =====
type AngleKey = 'problem_solution' | 'builder_proof' | 'sale_urgency' | 'comparison'
type ToneKey = 'professional' | 'casual' | 'urgent' | 'enthusiastic'

interface AngleOption {
  key: AngleKey
  label: string
  description: string
  icon: React.ReactNode
}

const ANGLES: AngleOption[] = [
  { key: 'problem_solution', label: 'Problem → Solution', description: 'Address pain points', icon: <Wrench className="size-5" /> },
  { key: 'builder_proof', label: 'Builder Proof', description: 'Show real builds', icon: <Camera className="size-5" /> },
  { key: 'sale_urgency', label: 'Sale / Urgency', description: 'Drive immediate action', icon: <Zap className="size-5" /> },
  { key: 'comparison', label: 'Comparison', description: 'vs stock alternatives', icon: <GitCompare className="size-5" /> },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
] as const

const SAMPLE_COPY = `🏍️ UPGRADE YOUR RIDE

Stop wrestling with dim, unreliable headlights on your CB750.

Our Complete LED Headlight Relay Kit gives you:
✅ 300% brighter output
✅ 20-minute plug-and-play install  
✅ Sealed 30A relay — built to last

Trusted by 500+ cafe racer builders across Australia.

🇦🇺 Ships same day from Brisbane | $89.95

Shop now at caferacergarage.com`

interface HistoryItem {
  id: string
  preview: string
  productName: string
  timestamp: string
  copy: string
}

const INITIAL_HISTORY: HistoryItem[] = [
  { id: 'h1', preview: '🏍️ UPGRADE YOUR RIDE — Stop wrestling with dim, unreliable headlights...', productName: 'LED Headlight Relay Kit', timestamp: '2 hours ago', copy: SAMPLE_COPY },
  { id: 'h2', preview: '⚡ VOLTAGE CRASHING YOUR RIDE? — Fried stator? Dim lights at idle?...', productName: 'Universal Voltage Regulator', timestamp: '5 hours ago', copy: SAMPLE_COPY },
  { id: 'h3', preview: '🔥 LAST CHANCE — 20% off all ignition upgrades. Sale ends midnight...', productName: 'MOSFET Ignition Coil Kit', timestamp: 'Yesterday', copy: SAMPLE_COPY },
]

// ===== Copy Button Component =====
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 border-stone-200 dark:border-stone-700">
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Check className="size-4 text-green-500" />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Copy className="size-4" />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  )
}

// ===== Main Component =====
export default function AdCopyPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedAngle, setSelectedAngle] = useState<AngleKey>('problem_solution')
  const [selectedTone, setSelectedTone] = useState<ToneKey>('professional')
  const [aiProvider, setAiProvider] = useState<string>('neokens')
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(SAMPLE_COPY)
  const [generatedCopy, setGeneratedCopy] = useState(SAMPLE_COPY)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY)

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
  })

  const products = data?.products ?? []

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const wordCount = generatedCopy.trim().split(/\s+/).filter(Boolean).length
  const charCount = generatedCopy.length

  const handleGenerate = async () => {
    setIsGenerating(true)
    setIsAiGenerated(false)
    try {
      const res = await fetch('/api/ai/ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProduct?.title ?? 'Motorcycle Part',
          productDescription: selectedProduct?.reason ?? selectedProduct?.headline ?? '',
          price: selectedProduct?.price,
          angle: selectedAngle,
          tone: selectedTone,
          vendor: selectedProduct?.vendor ?? '',
        }),
      })

      if (!res.ok) throw new Error('Failed to generate')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setGeneratedCopy('')
      setIsAiGenerated(true)

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
          for (const line of lines) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            let parsed: { content?: string; error?: string }
            try {
              parsed = JSON.parse(data)
            } catch {
              continue
            }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.content) {
              fullText += parsed.content
              setGeneratedCopy(fullText)
              setEditText(fullText)
            }
          }
        }
      }
    } catch (err) {
      console.error('AI generation failed:', err)
      toast.error('AI generation failed, showing sample copy')
      setGeneratedCopy(SAMPLE_COPY)
      setEditText(SAMPLE_COPY)
      setIsAiGenerated(false)
    } finally {
      setIsEditing(false)
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  const handleSaveEdit = () => {
    setGeneratedCopy(editText)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditText(generatedCopy)
    setIsEditing(false)
  }

  const handleSaveToHistory = () => {
    const preview = generatedCopy.slice(0, 80) + (generatedCopy.length > 80 ? '...' : '')
    const newItem: HistoryItem = {
      id: `h-${Date.now()}`,
      preview,
      productName: selectedProduct?.title ?? 'Unknown Product',
      timestamp: 'Just now',
      copy: generatedCopy,
    }
    setHistory(prev => [newItem, ...prev])
    toast.success('Saved to history')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10">
          <Sparkles className="size-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">Ad Copy Studio</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Generate high-converting ad copy with AI</p>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* ===== Configuration Panel ===== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full shrink-0 md:w-[400px]"
        >
          <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            {/* Product Selector */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Product
              </label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="truncate">{p.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-stone-400 dark:text-stone-500">
                          ${p.price}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Info Card */}
            <AnimatePresence>
              {selectedProduct && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="flex items-start gap-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-3">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                        {selectedProduct.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          ${selectedProduct.price}
                        </Badge>
                        <span className="text-xs text-stone-400 dark:text-stone-500">
                          {selectedProduct.inventoryQty} in stock
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        {selectedProduct.productType} · {selectedProduct.vendor}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Angle Selector */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Ad Angle
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ANGLES.map(angle => {
                  const isSelected = selectedAngle === angle.key
                  return (
                    <motion.button
                      key={angle.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedAngle(angle.key)}
                      className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-sm shadow-amber-500/5'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 ${
                          isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {angle.icon}
                        <span className="text-sm font-medium">{angle.label}</span>
                      </div>
                      <span
                        className={`text-xs ${
                          isSelected ? 'text-amber-600 dark:text-amber-500' : 'text-stone-400 dark:text-stone-500'
                        }`}
                      >
                        {angle.description}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(tone => {
                  const isActive = selectedTone === tone.value
                  return (
                    <motion.button
                      key={tone.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTone(tone.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 tone-pill-active'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      {tone.label}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* AI Provider */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
                AI Provider
              </label>
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neokens">Neokens</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-amber-500 text-white hover:bg-amber-600 h-11 text-base font-medium"
            >
              {isGenerating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Sparkles className="size-5" />
                </motion.div>
              ) : (
                <Sparkles className="size-5" />
              )}
              {isGenerating ? 'Generating with AI...' : 'Generate Copy'}
            </Button>
          </div>
        </motion.div>

        {/* ===== Output Panel ===== */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="min-w-0 flex-1"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Generated Copy</h2>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0 text-[10px] gap-1">
                <Sparkles className="size-3" />
                Powered by AI
              </Badge>
              <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
                <span>{wordCount} words</span>
                <span>·</span>
                <span>{charCount} chars</span>
              </div>
            </div>
          </div>

          {/* Output Block */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-3"
              >
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="min-h-[320px] resize-y font-mono text-sm leading-relaxed bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"
                />
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1.5 border-stone-200 dark:border-stone-700">
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                    <Check className="size-4" />
                    Save
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-3"
              >
                <div className="rounded-xl bg-stone-900 dark:bg-stone-950 p-5 font-mono text-sm leading-relaxed text-stone-200 whitespace-pre-wrap border border-stone-700/50 dark:border-stone-700/30">
                  {generatedCopy}
                  {isGenerating && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />}
                </div>
                {isAiGenerated && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 dark:text-amber-500">
                    <Sparkles className="size-3" />
                    <span>AI Generated</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <CopyButton text={generatedCopy} />
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1.5 border-stone-200 dark:border-stone-700">
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditText(generatedCopy); setIsEditing(true) }}
              className="gap-1.5 border-stone-200 dark:border-stone-700"
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToHistory}
              className="gap-1.5 border-stone-200 dark:border-stone-700 ml-auto"
            >
              <BookmarkPlus className="size-4" />
              Save to History
            </Button>
          </div>

          {/* History Section */}
          <div className="mt-8">
            <h3 className="mb-3 text-base font-semibold text-stone-900 dark:text-stone-100">
              Recent Generations
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 max-h-96 overflow-y-auto">
              {history.map((item, hIndex) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: hIndex * 0.05 }}
                  className="rounded-lg border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-stone-700 animate-fade-in-up"
                >
                  <p className="mb-1.5 truncate text-sm text-stone-700 dark:text-stone-300">
                    {item.preview}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                    <span className="flex items-center gap-1">
                      <Package className="size-3" />
                      {item.productName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {item.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}