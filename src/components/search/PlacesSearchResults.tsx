'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { loadVenueCatalog, searchPlaces } from '@/lib/venue-catalog'
import type { PlannerRecommendation } from '@/lib/planner-recommendations'

type PlacesSearchResultsProps = {
  query: string
  onSelect: (place: PlannerRecommendation) => void
}

export function PlacesSearchResults({
  query,
  onSelect,
}: PlacesSearchResultsProps) {
  const { locale, t } = useI18n()
  const [catalogRev, setCatalogRev] = useState(0)

  useEffect(() => {
    void loadVenueCatalog().then(() => setCatalogRev((n) => n + 1))
  }, [])

  const results = useMemo(
    () => searchPlaces(query, locale, { limit: query.trim() ? 10 : 8 }),
    [query, locale, catalogRev],
  )

  const suggested = query.trim() ? [] : results.slice(0, 6)
  const matched = query.trim() ? results : []

  return (
    <div className="flex flex-col border-b border-[var(--nora-border-subtle)]">
      <div className="border-b border-[var(--nora-border-subtle)] px-3 pb-2 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          {t('search.placesTitle')}
        </p>
        <p className="mt-0.5 text-xs text-[var(--nora-text-muted)]">
          {t('search.placesSubtitle')}
        </p>
      </div>

      {catalogRev === 0 ? (
        <p className="px-3 py-1.5 text-[10px] text-[var(--nora-text-muted)]">
          {t('search.placesLoading')}
        </p>
      ) : null}

      {suggested.length > 0 ? (
        <section className="px-1 pb-1">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('search.placesSuggested')}
          </p>
          <ul className="space-y-0.5">
            {suggested.map((place) => (
              <PlaceRow key={place.id} place={place} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      ) : null}

      {query.trim() ? (
        <section className="px-1 pb-2">
          {matched.length > 0 ? (
            <ul className="space-y-0.5">
              {matched.map((place) => (
                <PlaceRow key={place.id} place={place} onSelect={onSelect} />
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-center text-xs text-[var(--nora-text-muted)]">
              {t('search.placesEmpty')}
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}

function PlaceRow({
  place,
  onSelect,
}: {
  place: PlannerRecommendation
  onSelect: (place: PlannerRecommendation) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(place)}
        className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--nora-surface-veil)]"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--nora-text)]">
            {place.place}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[var(--nora-text-muted)]">
            {place.title} · {place.address}
          </span>
        </span>
      </button>
    </li>
  )
}
