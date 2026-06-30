'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigation } from '@/store/navigation'
import { useCampaignsStore } from '@/store/campaigns'
import { useQuery } from '@tanstack/react-query'
import type { DashboardData, Product } from '@/lib/types'
import type { CreatedCampaign } from '@/store/campaigns'

export default function CreateCampaignDialog() {
  const { showCreateCampaignModal, setShowCreateCampaignModal } = useNavigation()
  const addCampaign = useCampaignsStore((s) => s.addCampaign)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('meta')
  const [objective, setObjective] = useState('conversions')
  const [dailyBudget, setDailyBudget] = useState('50')
  const [targetProduct, setTargetProduct] = useState('')
  const [active, setActive] = useState(true)
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null)

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    staleTime: 60_000,
  })

  const products = data?.products ?? []

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    const budgetNum = parseFloat(dailyBudget) || 50
    const targetProductName = products.find((p: Product) => p.id === targetProduct)?.title || ''

    addCampaign({
      name: name.trim(),
      channel: channel as 'meta' | 'google',
      objective,
      dailyBudget: budgetNum,
      targetProduct: targetProductName,
      status: active ? 'active' : 'paused',
    })

    setCreatedCampaign({
      id: `preview-${Date.now()}`,
      name: name.trim(),
      channel: channel as 'meta' | 'google',
      objective,
      dailyBudget: budgetNum,
      targetProduct: targetProductName,
      status: active ? 'active' : 'paused',
      createdAt: new Date().toISOString(),
      delivery: active ? 'active' : 'paused',
      category: 'product_specific',
      metrics: {
        revenue: 0, spend: 0, roas: 0, purchases: 0,
        clicks: 0, impressions: 0, ctr: 0, cpm: 0, frequency: 0, reach: 0,
      },
    })

    toast.success(`Campaign '${name.trim()}' created! It will appear in your campaign list.`)

    // Reset form
    setName('')
    setChannel('meta')
    setObjective('conversions')
    setDailyBudget('50')
    setTargetProduct('')
    setActive(true)
  }

  // Auto-close after showing success preview
  useEffect(() => {
    if (createdCampaign) {
      const timer = setTimeout(() => {
        setShowCreateCampaignModal(false)
        setCreatedCampaign(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [createdCampaign, setShowCreateCampaignModal])

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowCreateCampaignModal(false)
      setCreatedCampaign(null)
    }
  }

  return (
    <Dialog open={showCreateCampaignModal} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!createdCampaign ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  Create New Campaign
                </DialogTitle>
                <DialogDescription className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Set up a new advertising campaign for your store.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-5">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-name" className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    Campaign Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g., Holiday Electrical Sale"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                  />
                </div>

                {/* Channel */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="h-9 w-full border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Objective */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">Objective</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger className="h-9 w-full border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversions">Conversions</SelectItem>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Daily Budget */}
                <div className="space-y-2">
                  <Label htmlFor="daily-budget" className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    Daily Budget
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500 font-medium">$</span>
                    <Input
                      id="daily-budget"
                      type="number"
                      min="1"
                      step="1"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      className="h-9 pl-7 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    />
                  </div>
                </div>

                {/* Target Product */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">Target Product</Label>
                  <Select value={targetProduct} onValueChange={setTargetProduct}>
                    <SelectTrigger className="h-9 w-full border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                      <SelectValue placeholder="Select a product (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: Product) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} — ${p.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm font-medium text-stone-700 dark:text-stone-300">Status</Label>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${active ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'}`}>
                      {active ? 'Active' : 'Paused'}
                    </span>
                    <Switch
                      checked={active}
                      onCheckedChange={setActive}
                      className="data-[state=checked]:bg-amber-600"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-0">
                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleClose(false)}
                    className="h-9 px-4 text-sm border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="h-9 px-5 text-sm font-medium bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-sm shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                  >
                    Create Campaign
                  </Button>
                </div>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="p-6"
            >
              {/* Success card preview */}
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                </motion.div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Campaign Created!</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-5">
                  Your campaign is ready and will appear in your list shortly.
                </p>

                {/* Campaign preview card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full bg-gradient-to-b from-white to-stone-50/80 dark:from-stone-800 dark:to-stone-800/80 rounded-xl border border-stone-200/60 dark:border-stone-700 p-4 text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 max-w-[250px] truncate">
                      {createdCampaign.name}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      createdCampaign.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${createdCampaign.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {createdCampaign.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Channel</p>
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300 capitalize mt-0.5">{createdCampaign.channel} Ads</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Budget/Day</p>
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5">${createdCampaign.dailyBudget.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Objective</p>
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5 capitalize">{createdCampaign.objective.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {createdCampaign.targetProduct && (
                    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-700">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">Target Product</p>
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-0.5">{createdCampaign.targetProduct}</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}