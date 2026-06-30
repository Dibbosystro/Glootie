'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TourStep {
  target: string
  title: string
  description: string
  position: 'bottom' | 'top' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="dashboard"]', title: 'Dashboard', description: 'Your command center. See KPIs, charts, and quick actions at a glance.', position: 'right' },
  { target: '[data-tour="search"]', title: 'Global Search', description: 'Press ⌘K to search products, campaigns, and conversations instantly.', position: 'bottom' },
  { target: '[data-tour="notifications"]', title: 'Notifications', description: 'Stay on top of sync errors, low stock alerts, and activity updates.', position: 'bottom' },
  { target: '[data-tour="create-campaign"]', title: 'Create Campaign', description: 'Launch new ad campaigns across Meta and Google Ads channels.', position: 'bottom' },
  { target: '[data-tour="ai-studio"]', title: 'AI Studio', description: 'Generate ad copy, support replies, and product images with AI.', position: 'right' },
]

interface Position {
  top: number
  left: number
  tooltipPos: 'above' | 'below' | 'left' | 'right'
}

function getTargetPosition(targetEl: HTMLElement, step: TourStep): Position {
  const rect = targetEl.getBoundingClientRect()
  const gap = 12

  switch (step.position) {
    case 'bottom':
      return { top: rect.bottom + gap, left: rect.left + rect.width / 2, tooltipPos: 'above' }
    case 'top':
      return { top: rect.top - gap, left: rect.left + rect.width / 2, tooltipPos: 'below' }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - gap, tooltipPos: 'right' }
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + gap, tooltipPos: 'left' }
  }
}

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, tooltipPos: 'below' })
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem('glootie-onboarding-dismissed')
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const findValidStep = useCallback((startIdx: number, direction: 'forward' | 'backward'): number => {
    let idx = startIdx
    while (idx >= 0 && idx < TOUR_STEPS.length) {
      const el = document.querySelector(TOUR_STEPS[idx].target)
      if (el) return idx
      idx = direction === 'forward' ? idx + 1 : idx - 1
    }
    return -1
  }, [])

  const updatePosition = useCallback((stepIdx: number) => {
    if (stepIdx < 0 || stepIdx >= TOUR_STEPS.length) return
    const step = TOUR_STEPS[stepIdx]
    const targetEl = document.querySelector(step.target) as HTMLElement
    if (!targetEl) return

    const rect = targetEl.getBoundingClientRect()
    setHighlightRect(rect)
    const pos = getTargetPosition(targetEl, step)

    // Clamp position to viewport
    const tooltipWidth = 320
    const tooltipHeight = 200

    if (pos.tooltipPos === 'above') {
      pos.top = Math.max(8, pos.top - tooltipHeight)
    } else if (pos.tooltipPos === 'below') {
      pos.top = Math.min(pos.top, window.innerHeight - tooltipHeight - 8)
    } else if (pos.tooltipPos === 'left') {
      // Tooltip right of target — clamp so it doesn't overflow right edge
      if (pos.left + tooltipWidth > window.innerWidth - 8) {
        pos.left = window.innerWidth - tooltipWidth - 8
      }
    } else if (pos.tooltipPos === 'right') {
      // Tooltip left of target — clamp so it doesn't go off left edge
      if (pos.left - tooltipWidth < 8) {
        pos.left = tooltipWidth + 8
      }
    }
    // Vertical centering clamp
    pos.top = Math.max(tooltipHeight / 2 + 8, Math.min(pos.top, window.innerHeight - tooltipHeight / 2 - 8))

    setPosition(pos)
  }, [])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('glootie-onboarding-dismissed', 'true')
  }, [])

  // Initialize position when visible
  useEffect(() => {
    if (!isVisible) return
    const validIdx = findValidStep(0, 'forward')
    if (validIdx === -1) {
      // Schedule dismiss outside of synchronous effect body
      const timer = setTimeout(() => {
        setIsVisible(false)
        localStorage.setItem('glootie-onboarding-dismissed', 'true')
      }, 0)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      setCurrentStep(validIdx)
      updatePosition(validIdx)
    }, 100)
    return () => clearTimeout(timer)
  }, [isVisible, findValidStep, updatePosition])

  // Update position on step change
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(() => updatePosition(currentStep), 50)
    return () => clearTimeout(timer)
  }, [currentStep, isVisible, updatePosition])

  // Reposition on resize
  useEffect(() => {
    if (!isVisible) return
    const handleResize = () => updatePosition(currentStep)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible, currentStep, updatePosition])

  const next = useCallback(() => {
    const nextIdx = findValidStep(currentStep + 1, 'forward')
    if (nextIdx === -1 || nextIdx >= TOUR_STEPS.length) {
      dismiss()
    } else {
      setCurrentStep(nextIdx)
    }
  }, [currentStep, findValidStep, dismiss])

  const prev = useCallback(() => {
    const prevIdx = findValidStep(currentStep - 1, 'backward')
    if (prevIdx >= 0) {
      setCurrentStep(prevIdx)
    }
  }, [currentStep, findValidStep])

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  // Calculate tooltip transform based on position
  let tooltipTransform = ''
  let arrowClass = ''

  switch (position.tooltipPos) {
    case 'below':
      tooltipTransform = `translate(-50%, 0)`
      arrowClass = 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45'
      break
    case 'above':
      tooltipTransform = `translate(-50%, -100%)`
      arrowClass = 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45'
      break
    case 'left':
      tooltipTransform = `translate(0, -50%)`
      arrowClass = 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45'
      break
    case 'right':
      tooltipTransform = `translate(-100%, -50%)`
      arrowClass = 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45'
      break
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] pointer-events-none"
      >
        {/* Dark backdrop — click to dismiss */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={dismiss}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - 4}
                  y={highlightRect.top - 4}
                  width={highlightRect.width + 8}
                  height={highlightRect.height + 8}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Highlight border around target */}
        {highlightRect && (
          <motion.div
            layoutId="tour-highlight"
            className="absolute z-[62] rounded-lg border-2 border-amber-400 shadow-lg shadow-amber-500/20 pointer-events-none"
            style={{
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        {/* Tooltip card */}
        <div
          ref={tooltipRef}
          className="absolute z-[63] w-[300px] sm:w-[340px] pointer-events-auto"
          style={{
            top: position.top,
            left: position.left,
            transform: tooltipTransform,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200/80 dark:border-stone-700 border-t-2 border-t-amber-500 overflow-hidden"
            >
              {/* Arrow */}
              <div
                className={`absolute w-3 h-3 bg-white dark:bg-stone-900 border-t border-l border-stone-200/80 dark:border-stone-700 ${arrowClass}`}
                style={{
                  borderTopColor: position.tooltipPos === 'below' ? '#f59e0b' : undefined,
                  borderLeftColor: position.tooltipPos === 'right' ? '#f59e0b' : undefined,
                  borderRightColor: position.tooltipPos === 'left' ? '#f59e0b' : undefined,
                  borderBottomColor: position.tooltipPos === 'above' ? '#f59e0b' : undefined,
                }}
              />

              {/* Content */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                      Step {currentStep + 1} of {TOUR_STEPS.length}
                    </span>
                  </div>
                  <button
                    onClick={dismiss}
                    className="w-6 h-6 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    aria-label="Dismiss tour"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title & Description */}
                <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1.5">
                  {step.title}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 my-3">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? 'w-5 bg-amber-500'
                          : i < currentStep
                            ? 'w-1.5 bg-amber-300 dark:bg-amber-700'
                            : 'w-1.5 bg-stone-200 dark:bg-stone-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={dismiss}
                    className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium transition-colors"
                  >
                    Skip
                  </button>
                  <div className="flex items-center gap-2">
                    {currentStep > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prev}
                        className="h-7 px-2.5 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                        Back
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={next}
                      className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20"
                    >
                      {isLastStep ? 'Get Started' : 'Next'}
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}