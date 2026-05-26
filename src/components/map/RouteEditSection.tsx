'use client'

import { MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PlacesSearchResults } from '@/components/search/PlacesSearchResults'
import { fetchGeocode } from '@/api/map'
import { isApiEnabled } from '@/api/config'
import { useI18n } from '@/hooks/useI18n'
import type { DayRoute } from '@/lib/build-day-route'
import {
  addRouteStop,
  createCustomStop,
  MAX_ROUTE_STOPS,
  patchRouteName,
  removeRouteStop,
  routeDisplayTitle,
} from '@/lib/route-edit'
import { routeAreaSeed } from '@/lib/route-intents'
import type { PlannerRecommendation } from '@/lib/planner-recommendations'
import { cn } from '@/lib/utils'

type RouteEditSectionProps = {
  route: DayRoute
  onChange: (route: DayRoute) => void
}

export function RouteEditSection({ route, onChange }: RouteEditSectionProps) {
  const { locale, t } = useI18n()
  const [addOpen, setAddOpen] = useState(false)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customPlace, setCustomPlace] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)
  const [customLoading, setCustomLoading] = useState(false)

  const fallbackTitle = route.area.trim() || route.stops[0]?.title || '—'
  const atMax = route.stops.length >= MAX_ROUTE_STOPS

  function apply(next: DayRoute | null) {
    if (next) onChange(next)
  }

  function handleAddFromCatalog(place: PlannerRecommendation) {
    const next = addRouteStop(route, place)
    if (!next) return
    onChange(next)
    setAddOpen(false)
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault()
    setCustomError(null)
    const place = customPlace.trim()
    const address = customAddress.trim()
    if (!place && !address) {
      setCustomError(t('routeBuilder.customPlaceRequired'))
      return
    }

    setCustomLoading(true)
    let lng: number
    let lat: number

    if (isApiEnabled()) {
      const query = address || place
      const coord = await fetchGeocode(query)
      if (!coord) {
        setCustomLoading(false)
        setCustomError(t('routeBuilder.customGeocodeFailed'))
        return
      }
      lng = coord.lng
      lat = coord.lat
    } else {
      const seed = routeAreaSeed(route.areaKey)
      lng = seed.lng
      lat = seed.lat
    }

    const stop = createCustomStop(
      {
        title: customTitle,
        place: place || address,
        address: address || place,
        lng,
        lat,
      },
      locale,
    )
    const next = addRouteStop(route, stop)
    setCustomLoading(false)
    if (!next) {
      setCustomError(t('routeBuilder.maxStops'))
      return
    }
    onChange(next)
    setCustomTitle('')
    setCustomPlace('')
    setCustomAddress('')
    setCustomOpen(false)
    setCustomError(null)
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {t('routeBuilder.routeNameLabel')}
        </span>
        <input
          type="text"
          value={route.name ?? ''}
          onChange={(e) => onChange(patchRouteName(route, e.target.value))}
          placeholder={t('routeBuilder.routeNamePlaceholder')}
          className="glass-input mt-1 w-full px-3 py-2 text-sm"
        />
      </label>

      <p className="text-[10px] text-[var(--nora-text-muted)]">
        {routeDisplayTitle(route, fallbackTitle)}
      </p>

      <ol className="max-h-[9rem] space-y-1 overflow-y-auto pr-0.5">
        {route.stops.map((stop, i) => (
          <li
            key={stop.id}
            className="nora-surface-card flex items-start gap-1.5 rounded-lg p-2"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-[10px] font-bold text-slate-900">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-[var(--nora-text)]">
                {stop.title}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[var(--nora-text-muted)]">
                {stop.place}
              </span>
            </span>
            <button
              type="button"
              onClick={() => apply(removeRouteStop(route, stop.id))}
              disabled={route.stops.length <= 1}
              className="rounded-lg p-1 text-[var(--nora-text-muted)] hover:bg-red-400/10 hover:text-red-600 disabled:opacity-30 dark:hover:text-red-300"
              aria-label={t('routeBuilder.removeStop')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {atMax ? (
        <p className="text-[10px] text-amber-600 dark:text-amber-300">
          {t('routeBuilder.maxStops')}
        </p>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setAddOpen((v) => !v)
              setCustomOpen(false)
            }}
            className="nora-choice flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-sky-400/25 px-2 py-2 text-[11px] font-medium text-sky-700 hover:bg-sky-400/10 dark:text-sky-200"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('routeBuilder.addFromCatalog')}
          </button>

          {addOpen ? (
            <div className="max-h-[10rem] overflow-y-auto rounded-xl bg-[var(--nora-surface)] shadow-[inset_0_1px_2px_rgba(42,40,38,0.05)]">
              <input
                type="search"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="glass-input m-2 w-[calc(100%-1rem)] px-2.5 py-1.5 text-xs"
              />
              <PlacesSearchResults
                query={catalogQuery}
                onSelect={handleAddFromCatalog}
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setCustomOpen((v) => !v)
              setAddOpen(false)
            }}
            className="nora-choice flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-emerald-400/25 px-2 py-2 text-[11px] font-medium text-emerald-800 hover:bg-emerald-400/10 dark:text-emerald-200"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t('routeBuilder.addCustomPlace')}
          </button>

          {customOpen ? (
            <form
              onSubmit={handleAddCustom}
              className="nora-surface-card space-y-2 rounded-xl p-2.5"
            >
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t('routeBuilder.customTitlePlaceholder')}
                className="glass-input w-full px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                value={customPlace}
                onChange={(e) => setCustomPlace(e.target.value)}
                placeholder={t('routeBuilder.customPlacePlaceholder')}
                className="glass-input w-full px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder={t('routeBuilder.customAddressPlaceholder')}
                className="glass-input w-full px-2.5 py-2 text-xs"
              />
              {customError ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-300">
                  {customError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={customLoading}
                className={cn(
                  'w-full rounded-lg bg-emerald-500/20 py-2 text-[11px] font-semibold text-emerald-900 dark:text-emerald-100',
                  customLoading && 'opacity-60',
                )}
              >
                {customLoading
                  ? t('routeBuilder.customGeocoding')
                  : t('routeBuilder.addCustomSubmit')}
              </button>
            </form>
          ) : null}
        </div>
      )}
    </div>
  )
}
