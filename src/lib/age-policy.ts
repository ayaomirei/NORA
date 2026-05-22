import type { PlannerRecommendation } from '@/lib/planner-recommendations'
import type { BirthDateParts } from '@/types/birth-date'
import { resolveBirthDate, type BirthDateLike } from '@/types/birth-date'

export type VenueTag =
  | 'cafe'
  | 'park'
  | 'culture'
  | 'food'
  | 'market'
  | 'nightlife'
  | 'bar'
  | 'club'
  | 'dangerous'
  | 'family'
  | 'wellness'

/** Бары, клубы, ночная жизнь — только 18+. */
const ADULT_VENUE_TAGS: VenueTag[] = ['nightlife', 'bar', 'club']

/** Небезопасные или рискованные места — не для несовершеннолетних. */
const MINOR_BLOCKED_TAGS: VenueTag[] = [...ADULT_VENUE_TAGS, 'dangerous']

const ADULT_MIN_AGE = 18

const ADULT_TEXT =
  /\b(бар|bar|клуб|club|паб|pub|nightclub|night\s*club|18\+)\b/i

function isRealCalendarDate(day: number, month: number, year: number): boolean {
  const d = new Date(year, month - 1, day)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

function looksLikeAdultVenue(rec: PlannerRecommendation): boolean {
  if (/^poi-(bar|club)-/.test(rec.id)) return true
  const hay = `${rec.title} ${rec.place} ${rec.badge ?? ''}`.toLowerCase()
  return ADULT_TEXT.test(hay)
}

/** Полный возраст с учётом дня рождения в этом году. */
export type BirthDateInput = BirthDateLike | null

export function getAgeFromBirthDate(birth: BirthDateInput): number | null {
  const resolved = resolveBirthDate(birth ?? undefined)
  if (!resolved) return null
  const { day, month, year } = resolved
  if (!isRealCalendarDate(day, month, year)) return null

  const today = new Date()
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  const dayDiff = today.getDate() - day
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1
  return age >= 0 && age <= 120 ? age : null
}

/** @deprecated Используйте getAgeFromBirthDate с полной датой. */
export function getAgeFromBirthYear(birthYear: number | null): number | null {
  if (birthYear === null || !Number.isFinite(birthYear)) return null
  return getAgeFromBirthDate({ year: birthYear, month: 12, day: 31 })
}

export function isValidBirthDate(day: number, month: number, year: number): boolean {
  if (!isRealCalendarDate(day, month, year)) return false
  const age = getAgeFromBirthDate({ day, month, year })
  return age !== null && age >= 13 && age <= 100
}

/** @deprecated */
export function isValidBirthYear(year: number): boolean {
  return isValidBirthDate(1, 1, year)
}

export function isMinorAge(age: number | null): boolean {
  return age !== null && age < ADULT_MIN_AGE
}

export function isVenueAllowedForAge(
  rec: PlannerRecommendation,
  birth: BirthDateInput,
): boolean {
  const age = getAgeFromBirthDate(birth)
  if (age === null) return true

  const tags = rec.venueTags ?? []
  const minAge =
    rec.minAge ??
    (tags.some((t) => ADULT_VENUE_TAGS.includes(t)) ? ADULT_MIN_AGE : 0)

  if (age < minAge) return false
  if (isMinorAge(age)) {
    if (tags.some((t) => MINOR_BLOCKED_TAGS.includes(t))) return false
    if (looksLikeAdultVenue(rec)) return false
  }
  if (age >= 60 && tags.includes('nightlife')) return false
  if (age >= 65 && tags.includes('bar')) return false

  return true
}

export function filterRecommendationsByAge(
  items: PlannerRecommendation[],
  birth: BirthDateInput,
): PlannerRecommendation[] {
  return items.filter((r) => isVenueAllowedForAge(r, birth))
}

/** Самая «молодая» дата рождения в группе (строже фильтр 18+). */
export function strictestBirthDateInGroup(
  organizer: BirthDateLike | null,
  participantProfiles: Array<BirthDateLike | null>,
): BirthDateParts | null {
  const dates: BirthDateParts[] = []
  const org = resolveBirthDate(organizer ?? undefined)
  if (org) dates.push(org)
  for (const p of participantProfiles) {
    const resolved = resolveBirthDate(p ?? undefined)
    if (resolved) dates.push(resolved)
  }
  if (!dates.length) return org

  let youngest = dates[0]
  for (const d of dates.slice(1)) {
    const ageD = getAgeFromBirthDate(d)
    const ageY = getAgeFromBirthDate(youngest)
    if (ageD === null) continue
    if (ageY === null || ageD < ageY) youngest = d
  }
  return youngest
}
