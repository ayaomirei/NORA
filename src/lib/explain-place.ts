import type { Locale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import { fitsUserBudget } from '@/lib/planner-recommendations'
import type { PlannerMood, PlannerRecommendation } from '@/lib/planner-recommendations'
import type { MbtiId } from '@/lib/mbti'
import { getPlannerMoodMeta } from '@/lib/planner-recommendations'

const TAG_HINTS: Record<string, { ru: string; en: string }> = {
  cafe: { ru: 'кофе и спокойная атмосфера', en: 'coffee and a calm vibe' },
  food: { ru: 'можно поесть', en: 'good for a meal' },
  park: { ru: 'на воздухе', en: 'outdoors' },
  culture: { ru: 'культура и впечатления', en: 'culture and experiences' },
  wellness: { ru: 'восстановление', en: 'recovery and wellness' },
  market: { ru: 'рынок и локальный колорит', en: 'market and local flavor' },
  nightlife: { ru: 'вечерняя атмосфера', en: 'evening atmosphere' },
  bar: { ru: 'бар', en: 'bar' },
  club: { ru: 'клуб', en: 'club' },
  family: { ru: 'подходит для семьи', en: 'family-friendly' },
}

/** Короткое «почему это место» без LLM — прозрачно и офлайн. */
export function explainPlaceWhy(
  place: PlannerRecommendation,
  mood: PlannerMood,
  budgetIdx: number,
  mbti: MbtiId | '',
  locale: Locale = 'ru',
): string {
  const budget = getMessages(locale).budget
  const moodMeta = getPlannerMoodMeta(locale)
  const parts: string[] = []

  const moods = place.moods ?? []
  if (moods.includes(mood)) {
    parts.push(
      locale === 'ru'
        ? `подходит под «${moodMeta[mood].label}»`
        : `fits “${moodMeta[mood].label}” mood`,
    )
  } else if (moods.length) {
    const alt = moods.map((m) => moodMeta[m].label).join(', ')
    parts.push(
      locale === 'ru' ? `часто выбирают при: ${alt}` : `often for: ${alt}`,
    )
  }

  const tag = place.venueTags?.[0]
  if (tag && TAG_HINTS[tag]) {
    parts.push(locale === 'ru' ? TAG_HINTS[tag].ru : TAG_HINTS[tag].en)
  }

  if (!fitsUserBudget(place, budgetIdx)) {
    parts.push(budget.aboveBudget)
  } else {
    parts.push(place.badge)
  }

  if (mbti && place.mbtiFit?.includes(mbti)) {
    parts.push(budget.idealMbti.replace('{mbti}', mbti))
  }

  if (place.duration) {
    parts.push(
      locale === 'ru' ? `~${place.duration}` : `~${place.duration}`,
    )
  }

  return parts.filter(Boolean).slice(0, 3).join(' · ')
}
