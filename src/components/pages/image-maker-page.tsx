'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ImageIcon,
  Wrench,
  Camera,
  Layers,
  Megaphone,
  Copy,
  RefreshCw,
  Pencil,
  Check,
  X,
  Wand2,
  Sparkles,
  Clock,
  Package,
  Download,
  Loader2,
  Shuffle,
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
type SceneKey = 'garage_workbench' | 'installed_on_bike' | 'exploded_kit' | 'sale_banner'

interface SceneOption {
  key: SceneKey
  label: string
  description: string
  icon: React.ReactNode
}

const SCENES: SceneOption[] = [
  { key: 'garage_workbench', label: 'Garage Workbench', description: 'Product on workbench with tools', icon: <Wrench className="size-5" /> },
  { key: 'installed_on_bike', label: 'Installed on Bike', description: 'In-situ product shot', icon: <Camera className="size-5" /> },
  { key: 'exploded_kit', label: 'Exploded Kit View', description: 'All components laid out', icon: <Layers className="size-5" /> },
  { key: 'sale_banner', label: 'Sale Banner', description: 'Promotional graphic', icon: <Megaphone className="size-5" /> },
]

const styleColors: Record<string, string> = {
  Photorealistic: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
  Moody: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400',
  Bright: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
  Minimal: 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300',
  Technical: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
}

const STYLE_OPTIONS = [
  'Photorealistic',
  'Moody',
  'Bright',
  'Minimal',
  'Technical',
] as const

const PROMPT_TONE_OPTIONS = [
  { value: 'detailed', label: 'Detailed' },
  { value: 'concise', label: 'Concise' },
  { value: 'creative', label: 'Creative' },
] as const
type PromptToneKey = 'detailed' | 'concise' | 'creative'

const SAMPLE_PROMPT = `Product photography, flat lay on dark wooden workbench in a
motorcycle garage. A Complete LED Headlight Relay Kit arranged
neatly beside mechanic tools (wire strippers, crimpers, multimeter).
Warm ambient lighting from overhead fluorescent shop light.
Slight bokeh background showing motorcycle parts on shelves.
Shot from 45-degree top-down angle. Photorealistic, 4K,
commercial product photography style. Color palette: warm amber,
dark steel, black rubber insulation`

const SAMPLE_HISTORY = [
  { id: 'ih1', preview: 'Product photography on workbench with tools and ambient lighting...', productName: 'LED Headlight Relay Kit', timestamp: '3 hours ago' },
  { id: 'ih2', preview: 'Close-up macro shot of a voltage regulator mounted on a clean frame...', productName: 'Universal Voltage Regulator', timestamp: 'Yesterday' },
  { id: 'ih3', preview: 'Exploded view with all ignition coil components visible...', productName: 'MOSFET Ignition Coil Kit', timestamp: '2 days ago' },
]

interface HistoryItem {
  id: string
  preview: string
  productName: string
  timestamp: string
}

// ===== Copy Button Component =====
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5">
            <Check className="size-4 text-green-500" /> Copied
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5">
            <Copy className="size-4" /> Copy
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  )
}

// ===== Aspect Ratio Selector =====
const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', icon: '◻' },
  { value: '4:3', label: '4:3', icon: '▭' },
  { value: '16:9', label: '16:9', icon: '⬒' },
] as const

// ===== Main Component =====
export default function ImageMakerPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedScene, setSelectedScene] = useState<SceneKey>('garage_workbench')
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set(['Photorealistic']))
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(SAMPLE_PROMPT)
  const [generatedPrompt, setGeneratedPrompt] = useState(SAMPLE_PROMPT)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [aspectRatio, setAspectRatio] = useState('4:3')
  const [promptTone, setPromptTone] = useState<PromptToneKey>('detailed')

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
  })

  const products = data?.products ?? []
  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const wordCount = generatedPrompt.trim().split(/\s+/).filter(Boolean).length
  const charCount = generatedPrompt.length

  const toggleStyle = useCallback((style: string) => {
    setSelectedStyles(prev => {
      const next = new Set(prev)
      if (next.has(style)) {
        next.delete(style)
      } else {
        next.add(style)
      }
      return next
    })
  }, [])

  const handleGenerate = async () => {
    if (!selectedProductId) return
    setIsGenerating(true)
    setIsAiGenerated(false)
    try {
      const res = await fetch('/api/ai/image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProduct?.title ?? '',
          productDescription: selectedProduct?.reason ?? selectedProduct?.headline ?? '',
          scene: selectedScene,
          styles: Array.from(selectedStyles),
          tone: promptTone,
          additionalNotes,
          aspectRatio,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setGeneratedPrompt('')
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
              setGeneratedPrompt(fullText)
              setEditText(fullText)
            }
          }
        }
      }
    } catch (err) {
      console.error('AI generation failed:', err)
      toast.error('AI generation failed, showing sample prompt')
      setGeneratedPrompt(SAMPLE_PROMPT)
      setEditText(SAMPLE_PROMPT)
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
    setGeneratedPrompt(editText)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditText(generatedPrompt)
    setIsEditing(false)
  }

  const handleGenerateImage = async (promptOverride?: string) => {
    const promptToUse = promptOverride ?? generatedPrompt
    if (!promptToUse || promptToUse === SAMPLE_PROMPT) return
    setIsGeneratingImage(true)
    setGeneratedImage(null)
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate image' }))
        throw new Error(err.error || 'Failed to generate image')
      }
      const data = await res.json()
      setGeneratedImage(data.image)
    } catch (err) {
      console.error('Image generation failed:', err)
      toast.error(err instanceof Error ? err.message : 'Image generation failed')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleDownloadImage = () => {
    if (!generatedImage) return
    const byteString = atob(generatedImage)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `glootie-image-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
          <ImageIcon className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">Image Maker</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Generate image creative prompts for ad visuals</p>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ===== Configuration Panel ===== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full shrink-0 lg:w-[380px] xl:w-[420px]"
        >
          <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm hover:shadow-md transition-shadow">
            {/* Product Selector */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Product <span className="text-stone-400 dark:text-stone-500">(select to enable generation)</span>
              </label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="truncate">{p.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-stone-400 dark:text-stone-500">${p.price}</span>
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
                  className="overflow-hidden mb-4"
                >
                  <div className="flex items-start gap-3 rounded-xl border border-stone-200/60 dark:border-stone-700 bg-gradient-to-br from-stone-50 to-white dark:from-stone-800 dark:to-stone-900 p-4 shadow-sm">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      className="size-14 shrink-0 rounded-lg object-cover shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{selectedProduct.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{selectedProduct.price}</Badge>
                        <span className="text-xs text-stone-400">{selectedProduct.inventoryQty} in stock</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {selectedProduct.productType} · {selectedProduct.vendor}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scene Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Scene</label>
              <div className="grid grid-cols-2 gap-2">
                {SCENES.map(scene => {
                  const isSelected = selectedScene === scene.key
                  return (
                    <motion.button
                      key={scene.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedScene(scene.key)}
                      className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-sm shadow-amber-500/5'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      <div className={`flex items-center gap-2 ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-stone-600 dark:text-stone-400'}`}>
                        {scene.icon}
                        <span className="text-sm font-medium">{scene.label}</span>
                      </div>
                      <span className={`text-xs ${isSelected ? 'text-amber-600 dark:text-amber-500' : 'text-stone-400 dark:text-stone-500'}`}>
                        {scene.description}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Prompt Tone</label>
              <div className="flex flex-wrap gap-2">
                {PROMPT_TONE_OPTIONS.map(tone => {
                  const isActive = promptTone === tone.value
                  return (
                    <motion.button
                      key={tone.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPromptTone(tone.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                      }`
                    }
                    >
                      {tone.label}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Style Selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Style & Composition</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {STYLE_OPTIONS.map(style => {
                  const isActive = selectedStyles.has(style)
                  return (
                    <motion.button
                      key={style}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleStyle(style)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? `${styleColors[style] || 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'} ring-1 ring-current/10`
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                      }`}
                    >
                      {style}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Aspect Ratio</label>
              <div className="flex items-center gap-2">
                {ASPECT_RATIOS.map(ar => (
                  <motion.button
                    key={ar.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAspectRatio(ar.value)}
                    className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${
                      aspectRatio === ar.value
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm shadow-amber-500/5 ring-2 ring-amber-400/30'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}
                  >
                    <span className="text-base mr-1.5">{ar.icon}</span>
                    {ar.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Additional Notes</label>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Include a ruler for scale reference, warm sunset lighting..."
                className="min-h-[68px] resize-y text-sm rounded-xl border-stone-200 dark:border-stone-700 focus-visible:ring-amber-500/20"
              />
            </div>

            {/* Generate Prompt Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedProductId || isGenerating}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-600 shadow-lg shadow-amber-500/20 h-11 text-base font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:opacity-70"
            >
              {isGenerating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Wand2 className="size-5" />
                </motion.div>
              ) : (
                <Wand2 className="size-5" />
              )}
              {isGenerating ? 'Building with AI...' : 'Build Prompt'}
            </Button>
            <p className="mt-2 text-center text-[11px] text-stone-400 dark:text-stone-500">
              Powered by Neokens AI
            </p>
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
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Generated Prompt</h2>
              <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0 text-[10px] gap-1">
                <Sparkles className="size-3" />
                Powered by AI
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              <span>{wordCount} words</span>
              <span>·</span>
              <span>{charCount} chars</span>
            </div>
          </div>

          {/* Output Block */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[280px] resize-y font-mono text-sm leading-relaxed bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 focus-visible:ring-amber-500/20"
                />
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1.5">
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
                    <Check className="size-4" /> Save
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3">
                <div className="rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 p-6 font-mono text-sm leading-relaxed text-stone-200 whitespace-pre-wrap border border-stone-700/40 shadow-2xl shadow-stone-900/20 relative">
                  <div className="absolute top-0 left-0 w-10 h-full border-r border-stone-700/50 flex flex-col items-center pt-4 gap-[18px] select-none pointer-events-none">
                    {generatedPrompt.split('\n').map((_, i) => (
                      <span key={i} className="text-[9px] text-stone-600 leading-none">{i + 1}</span>
                    ))}
                  </div>
                  <div className="pl-8">
                  {generatedPrompt}
                  {isGenerating && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />}
                  </div>
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
            <CopyButton text={generatedPrompt} />
            <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1.5 border-stone-200 dark:border-stone-700">
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditText(generatedPrompt); setIsEditing(true) }} className="gap-1.5 border-stone-200 dark:border-stone-700">
              <Pencil className="size-4" />
              Edit
            </Button>
          </div>

          {/* Generate Image Section */}
          {generatedPrompt && generatedPrompt !== SAMPLE_PROMPT && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mt-6"
            >
              <div className="rounded-xl border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon className="size-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Generated Image</h3>
                    <Badge className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0 text-[10px] gap-1">
                      <Sparkles className="size-3" />
                      AI Generated
                    </Badge>
                  </div>
                  {generatedImage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadImage}
                        className="gap-1.5 text-xs border-stone-200 dark:border-stone-700"
                      >
                        <Download className="size-3.5" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateImage()}
                        className="gap-1.5 text-xs border-stone-200 dark:border-stone-700"
                      >
                        <RefreshCw className="size-3.5" />
                        Regenerate
                      </Button>
                    </div>
                  )}
                </div>

                {/* Generate button or image display */}
                <div className="p-4">
                  {!generatedImage && !isGeneratingImage && (
                    <Button
                      onClick={() => handleGenerateImage()}
                      className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600 shadow-lg shadow-amber-500/20 text-sm font-medium transition-all active:scale-[0.98] gap-2"
                    >
                      <ImageIcon className="size-5" />
                      Generate Image
                    </Button>
                  )}

                  {isGeneratingImage && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-amber-400/20 animate-pulse" />
                        <div className="relative rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 w-64 h-64 flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <Loader2 className="size-8 text-amber-500 animate-spin mx-auto" />
                            <p className="text-sm text-stone-500 dark:text-stone-400">Generating your image...</p>
                            <p className="text-xs text-stone-400 dark:text-stone-500">This may take a moment</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {generatedImage && !isGeneratingImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-lg">
                        <img
                          src={`data:image/png;base64,${generatedImage}`}
                          alt="AI generated image"
                          className="w-full h-auto"
                        />
                      </div>

                      {/* Variation buttons */}
                      <div className="mt-4">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">A/B Variations</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateImage(`variation 1: ${generatedPrompt}`)}
                            disabled={isGeneratingImage}
                            className="gap-1.5 text-xs border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          >
                            <Shuffle className="size-3.5" />
                            Variation A
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateImage(`variation 2: ${generatedPrompt}`)}
                            disabled={isGeneratingImage}
                            className="gap-1.5 text-xs border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          >
                            <Shuffle className="size-3.5" />
                            Variation B
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* History Section */}
          <div className="mt-10">
            <h3 className="mb-3 text-base font-semibold text-stone-900 dark:text-stone-100">Recent Generations</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 max-h-48 overflow-y-auto">
              {SAMPLE_HISTORY.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-lg border border-stone-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-stone-700"
                >
                  <p className="mb-1.5 truncate text-sm text-stone-700 dark:text-stone-300">{item.preview}</p>
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