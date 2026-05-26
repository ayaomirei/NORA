'use client'

import { motion } from 'framer-motion'
import { MbtiHelpDialog } from '@/components/MbtiHelpDialog'
import { useI18n } from '@/hooks/useI18n'
import { getMbtiTypes } from '@/i18n/content/mbti-types'
import {
  getMbtiAccentHex,
  mbtiActiveStyle,
  mbtiTitleColor,
} from '@/lib/mbti-colors'
import type { MbtiId } from '@/lib/mbti'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

type MbtiGridProps = {
  value: MbtiId | ''
  onChange: (id: MbtiId) => void
}

export function MbtiGrid({ value, onChange }: MbtiGridProps) {
  const { locale, t } = useI18n()
  const types = getMbtiTypes(locale)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {types.map((mbtiType) => {
          const active = value === mbtiType.id
          const hex = getMbtiAccentHex(mbtiType.id)!
          return (
            <motion.button
              key={mbtiType.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              onClick={() => onChange(mbtiType.id)}
              className={cn(
                'rounded-xl px-2 py-3 text-left transition-smooth',
                active ? 'ring-2' : 'nora-choice hover:shadow-glass',
              )}
              style={active ? mbtiActiveStyle(hex) : undefined}
            >
              <p
                className={cn(
                  'text-sm font-semibold',
                  !active && 'text-[var(--nora-text)]',
                )}
                style={active ? mbtiTitleColor(hex) : undefined}
              >
                {mbtiType.title}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--nora-text-muted)]">
                {mbtiType.subtitle}
              </p>
            </motion.button>
          )
        })}
      </div>

      <MbtiHelpDialog triggerLabel={t('mbti.unknownType')} />
    </div>
  )
}
