'use client'

import { Search } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Прокручиваемый список без cmdk — стабильные клик и hover. */
export function ComboboxScrollList({
  children,
  className,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  className?: string
  'aria-label'?: string
}) {
  return (
    <ul
      role="listbox"
      aria-label={ariaLabel}
      className={cn(
        'm-0 max-h-[min(300px,42dvh)] min-h-0 list-none touch-pan-y overflow-y-auto overscroll-contain p-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--nora-accent)_40%,transparent)_transparent]',
        className,
      )}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </ul>
  )
}

export function ComboboxGroupHeading({ children }: { children: ReactNode }) {
  return (
    <li
      role="presentation"
      className="px-2 py-1.5 text-xs font-medium text-[var(--nora-text-muted)]"
    >
      {children}
    </li>
  )
}

export function ComboboxOption({
  selected,
  onPick,
  children,
  className,
}: {
  selected: boolean
  onPick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <li role="option" aria-selected={selected} className="list-none">
      <button
        type="button"
        onClick={() => onPick()}
        className={cn(
          'flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-left text-sm text-[var(--nora-text)] outline-none transition-colors hover:bg-sky-400/15 focus-visible:bg-sky-400/15 focus-visible:ring-2 focus-visible:ring-sky-400/40',
          selected && 'bg-sky-400/12',
          className,
        )}
      >
        {children}
      </button>
    </li>
  )
}

export function ComboboxSearchField({
  value,
  onChange,
  placeholder,
  onKeyDown,
  id,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  id?: string
}) {
  return (
    <div className="flex min-w-0 shrink-0 items-center border-b border-[var(--nora-border)] px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--nora-text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="flex h-11 w-full min-w-0 bg-transparent py-3 text-sm outline-none placeholder:text-[var(--nora-text-muted)]"
        />
      </div>
    </div>
  )
}

export function ComboboxEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-4 text-center text-sm text-[var(--nora-text-muted)]">
      {children}
    </p>
  )
}
