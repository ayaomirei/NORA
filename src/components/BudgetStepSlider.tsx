'use client'

import { useCallback, useRef, useState } from 'react'
import { normalizeBudgetIndex } from '@/lib/daily-budget'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

const MIN = 0
const MAX = 3

function indexToRatio(index: number) {
  return (normalizeBudgetIndex(index) - MIN) / (MAX - MIN)
}

function ratioToIndex(ratio: number) {
  return normalizeBudgetIndex(Math.round(ratio * (MAX - MIN)))
}

type BudgetStepSliderProps = {
  value: number
  onValueChange: (index: number) => void
  className?: string
  tickLabels?: readonly string[]
}

export function BudgetStepSlider({
  value,
  onValueChange,
  className,
  tickLabels,
}: BudgetStepSliderProps) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragRatio, setDragRatio] = useState<number | null>(null)

  const index = normalizeBudgetIndex(value)
  const ratio = dragRatio ?? indexToRatio(index)

  const ratioFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return indexToRatio(value)
    const { left, width } = track.getBoundingClientRect()
    if (width <= 0) return 0
    return Math.max(0, Math.min(1, (clientX - left) / width))
  }, [value])

  const applyClientX = useCallback(
    (clientX: number, commit: boolean) => {
      const nextRatio = ratioFromClientX(clientX)
      setDragRatio(commit ? null : nextRatio)
      onValueChange(ratioToIndex(nextRatio))
    },
    [onValueChange, ratioFromClientX],
  )

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    applyClientX(e.clientX, false)
  }

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    applyClientX(e.clientX, false)
  }

  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    applyClientX(e.clientX, true)
  }

  const onTrackPointerCancel = () => {
    setDragging(false)
    setDragRatio(null)
  }

  return (
    <div className={cn('select-none', className)}>
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={index}
        aria-label={t('budget.title')}
        className={cn(
          'relative mx-2.5 h-2 touch-none rounded-full border-0 bg-[var(--nora-surface)] shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)]',
          dragging ? 'cursor-grabbing' : 'cursor-pointer',
        )}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerCancel={onTrackPointerCancel}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--nora-accent)] to-[var(--nora-accent-2)] shadow-[0_0_12px_var(--nora-glow)]"
          style={{ width: `${ratio * 100}%` }}
        />
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 z-10 h-5 w-5 rounded-full border-0 bg-gradient-to-b from-sky-300 to-sky-500 shadow-neon transition-[transform,box-shadow] duration-200 ease-nora',
            dragging && 'ring-2 ring-[color-mix(in_srgb,var(--nora-accent)_40%,transparent)]',
          )}
          style={{
            left: `${ratio * 100}%`,
            transform: dragging
              ? 'translate(-50%, -50%) scale(1.1)'
              : 'translate(-50%, -50%)',
          }}
        />
      </div>

      <div className="mt-3 flex justify-between px-2.5">
        {Array.from({ length: MAX - MIN + 1 }, (_, i) => {
          const step = MIN + i
          const active = index === step
          return (
            <button
              key={step}
              type="button"
              aria-label={tickLabels?.[step] ?? `Уровень бюджета ${step + 1}`}
              aria-pressed={active}
              onClick={() => onValueChange(step)}
              className="flex flex-col items-center gap-1 p-1 -m-1"
            >
              <span
                className={cn(
                  'block rounded-full transition-[transform,background-color] duration-200 ease-nora',
                  active
                    ? 'h-2.5 w-2.5 bg-sky-400 shadow-[0_0_8px_var(--nora-glow)]'
                    : 'h-2 w-2 bg-[var(--nora-border)] hover:bg-sky-400/55',
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
