'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import { getFaqItems } from '@/i18n/content/faq'
import { tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function FaqList() {
  const { locale } = useI18n()
  const items = getFaqItems(locale)

  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...tween.fast, delay: i * 0.035 }}
        >
          <details className="group rounded-2xl glass-panel">
            <summary
              className={cn(
                'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--nora-text)]',
                '[&::-webkit-details-marker]:hidden',
              )}
            >
              <span>{item.question}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-sky-400 transition-transform duration-300 ease-nora group-open:rotate-180" />
            </summary>
            <p className="nora-divider px-4 py-3 text-sm leading-relaxed text-[var(--nora-text-muted)]">
              {item.answer}
            </p>
          </details>
        </motion.li>
      ))}
    </ul>
  )
}
