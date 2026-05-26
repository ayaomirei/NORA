'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { MapPin, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import {
  getPartnerCategories,
  getPartners,
  type PartnerCategory,
} from '@/i18n/content/partners'
import { tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function PartnersList() {
  const { locale, t } = useI18n()
  const [category, setCategory] = useState<PartnerCategory | 'all'>('all')
  const categories = useMemo(() => getPartnerCategories(locale), [locale])
  const partners = useMemo(() => getPartners(locale), [locale])

  const list = useMemo(() => {
    if (category === 'all') return partners
    return partners.filter((p) => p.category === category)
  }, [category, partners])

  return (
    <>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm transition-smooth',
              category === c.id
                ? 'nora-choice-active shadow-neon'
                : 'nora-choice text-[var(--nora-text-muted)]',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="space-y-4">
        {list.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...tween.medium, delay: i * 0.04 }}
            className="rounded-2xl glass-panel p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-2xl"
                aria-hidden
              >
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  {p.discount ? (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      {p.discount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[var(--nora-text-muted)]">
                  {p.tagline}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-[var(--nora-text-muted)]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                  {p.address}
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-sky-200/90">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  {p.perk}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link href="/">{t('common.showOnMap')}</Link>
            </Button>
          </motion.li>
        ))}
      </ul>
    </>
  )
}
