'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, Copy, Check, RefreshCw, Send, MessageSquare, FileText, Clock, Wand2, Headphones, MessageCircle, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardData } from '@/lib/types'

type SupportToneKey = 'professional' | 'friendly' | 'concise' | 'detailed'

const SUPPORT_TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
] as const

const sampleMessages = [
  'Does the relay kit fit a 1978 CB750K?',
  'When will my order ship?',
  'Can I return an opened product?',
]

const sampleReply = `Hi there! Yes, the Complete LED Headlight Relay Kit is compatible with the 1978 Honda CB750K. It's designed to work with all SOHC CB750 models from 1969-1978.

The kit includes a sealed 30A relay, pre-wired harness, and inline fuse holder. Installation takes about 20 minutes — just two connections (battery + headlight bucket).

Let me know if you need any help with the install!

Cheers,
CRG Team`

export default function SupportPage() {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [selectedTone, setSelectedTone] = useState<SupportToneKey>('professional')

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const handleGenerate = async () => {
    if (!message.trim()) return
    setIsGenerating(true)
    setIsAiGenerated(false)
    try {
      const res = await fetch('/api/ai/support-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          tone: selectedTone,
          productNames: data?.products?.map(p => p.title) ?? [],
        }),
      })

      if (!res.ok) throw new Error('Failed to generate')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setReply('')
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
              setReply(fullText)
            }
          }
        }
      }
    } catch (err) {
      console.error('AI generation failed:', err)
      toast.error('AI generation failed, showing sample reply')
      setReply(sampleReply)
      setIsAiGenerated(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reply)
    setCopied(true)
    toast.success('Reply copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = reply.trim().split(/\s+/).filter(Boolean).length
  const charCount = reply.length
  // Average reading speed: ~200 words per minute
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/10">
          <Headphones className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">AI Reply Composer</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Generate customer support replies with AI</p>
        </div>
        <Badge className="ml-auto bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse-dot" />
          DB Connected
        </Badge>
      </motion.div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block">
              Customer Message
              <span className={`ml-2 text-[10px] ${message.length > 2000 ? 'text-red-500' : message.length > 1500 ? 'text-amber-500' : 'text-stone-400'}`}>
                {message.length}/2000
              </span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Paste customer message here..."
              className="min-h-[180px] resize-none text-sm rounded-xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus-visible:ring-amber-500/30"
            />
          </div>

          {/* Sample messages */}
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2 block">Quick Samples</label>
            <div className="flex flex-wrap gap-2">
              {sampleMessages.map((msg) => (
                <button
                  key={msg}
                  onClick={() => setMessage(msg)}
                  className="text-xs px-3.5 py-2 rounded-full border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-400 transition-all hover:scale-[1.02] active:scale-100 flex items-center gap-1.5"
                >
                  <MessageCircle className="size-3" />
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5 block">Context (optional)</label>
            <Textarea
              placeholder="Additional context or instructions..."
              className="min-h-[80px] resize-none text-sm rounded-xl border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 focus-visible:ring-amber-500/30"
            />
          </div>

          {/* Tone Selector */}
          <div>
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-2 block">Reply Tone</label>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_TONE_OPTIONS.map(tone => {
                const isActive = selectedTone === tone.value
                return (
                  <button
                    key={tone.value}
                    onClick={() => setSelectedTone(tone.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 tone-pill-active'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}
                  >
                    {tone.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!message.trim() || isGenerating}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl h-11 text-sm font-medium"
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating with AI...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Reply</>
            )}
          </Button>
        </motion.div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-400">AI Generated Reply</label>
              <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] gap-1">
                <Sparkles className="size-3" />
                Powered by AI
              </Badge>
            </div>
            {reply && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-7 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  {copied ? <Check className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="h-7 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
            )}
          </div>

          {reply ? (
            <div className="bg-stone-900 dark:bg-stone-950 text-stone-200 rounded-xl p-5 font-mono text-sm leading-relaxed min-h-[300px] whitespace-pre-wrap border border-stone-700/50 dark:border-stone-700/30 shadow-lg shadow-amber-900/10">
              {reply}
              {isGenerating && <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />}
            </div>
          ) : (
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-stone-200/60 dark:border-stone-800">
              <div className="w-12 h-12 rounded-2xl bg-stone-200/60 dark:bg-stone-700/50 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-stone-400 dark:text-stone-500" />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-[200px]">
                Paste a customer message and click generate to get an AI reply
              </p>
            </div>
          )}

          {reply && (
            <>
              {/* AI Generated badge */}
              {isAiGenerated && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 dark:text-emerald-500">
                  <Sparkles className="size-3" />
                  <span>AI Generated</span>
                </div>
              )}
              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-stone-400 dark:text-stone-500">
                <span>{charCount} characters</span>
                <span>·</span>
                <span>{wordCount} words</span>
                <span>·</span>
                <span>{readingTime} min read</span>
              </div>

              {/* Full-width Copy button */}
              <Button
                variant="outline"
                onClick={handleCopy}
                className="w-full gap-2 border-stone-200 dark:border-stone-700 h-11"
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-green-500" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy Reply
                  </>
                )}
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}