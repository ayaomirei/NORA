'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  ComboboxEmpty,
  ComboboxGroupHeading,
  ComboboxOption,
  ComboboxScrollList,
  ComboboxSearchField,
} from '@/components/ComboboxList'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/hooks/useI18n'
import {
  findCityByAnyName,
  findCityInList,
  resolveCityLabel,
  searchCitiesList,
} from '@/i18n/content/geo-cities'
import { getCities } from '@/lib/cities'
import type { City } from '@/lib/cities'

type CityComboboxProps = {
  value: string
  onChange: (cityName: string) => void
  placeholder: string
  label: string
  id?: string
}

export function CityCombobox({
  value,
  onChange,
  placeholder,
  label,
  id,
}: CityComboboxProps) {
  const { locale, t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const cities = React.useMemo(() => getCities(locale), [locale])
  const displayValue = React.useMemo(
    () => resolveCityLabel(value, locale),
    [value, locale],
  )
  const selectedCityId = React.useMemo(
    () => findCityByAnyName(value)?.id,
    [value],
  )

  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const trimmed = search.trim()
  const matches = searchCitiesList(cities, trimmed, 8)
  const exact = trimmed ? findCityInList(cities, trimmed) : undefined
  const showSimilar = trimmed.length > 0 && !exact && matches.length > 0
  const showCustom =
    trimmed.length >= 2 &&
    !exact &&
    !matches.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())

  function pick(city: City) {
    onChange(city.name)
    setOpen(false)
    setSearch('')
  }

  function pickCustom(name: string) {
    onChange(name.trim())
    setOpen(false)
    setSearch('')
  }

  function handleEnter() {
    if (!trimmed) return
    if (exact) {
      pick(exact)
      return
    }
    if (matches[0]) {
      pick(matches[0])
      return
    }
    pickCustom(trimmed)
  }

  return (
    <div className={cn('relative', open && 'z-[200]')}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'default' }),
            'h-12 w-full justify-between rounded-glass border border-[var(--nora-border-subtle)] px-3 font-normal shadow-glass hover:shadow-glass-lg',
          )}
        >
          <span className="truncate text-left">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          className="flex max-h-[min(360px,50dvh)] flex-col p-0"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <span className="sr-only">{label}</span>
          <ComboboxSearchField
            value={search}
            onChange={setSearch}
            placeholder={t('combobox.searchCity')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleEnter()
              }
            }}
          />
          <ComboboxScrollList aria-label={label}>
            {trimmed.length === 0 ? (
              <>
                <ComboboxGroupHeading>{t('combobox.popular')}</ComboboxGroupHeading>
                {searchCitiesList(cities, '', 24).map((c) => (
                  <CityRow
                    key={c.id}
                    city={c}
                    selected={selectedCityId === c.id}
                    onPick={() => pick(c)}
                  />
                ))}
              </>
            ) : null}

            {exact ? (
              <>
                <ComboboxGroupHeading>
                  {t('combobox.exactMatch')}
                </ComboboxGroupHeading>
                <CityRow
                  city={exact}
                  selected={selectedCityId === exact.id}
                  onPick={() => pick(exact)}
                />
              </>
            ) : null}

            {showSimilar ? (
              <>
                <ComboboxGroupHeading>
                  {t('combobox.didYouMean')}
                </ComboboxGroupHeading>
                {matches.map((c) => (
                  <CityRow
                    key={c.id}
                    city={c}
                    selected={selectedCityId === c.id}
                    onPick={() => pick(c)}
                  />
                ))}
              </>
            ) : null}

            {showCustom ? (
              <ComboboxOption
                selected={false}
                onPick={() => pickCustom(trimmed)}
                className="text-sky-600 dark:text-sky-300"
              >
                {t('combobox.useCustom', { value: trimmed })}
              </ComboboxOption>
            ) : null}
          </ComboboxScrollList>

          {trimmed.length > 0 &&
          !exact &&
          matches.length === 0 &&
          trimmed.length < 2 ? (
            <ComboboxEmpty>{t('combobox.cityTypeMore')}</ComboboxEmpty>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CityRow({
  city,
  selected,
  onPick,
}: {
  city: City
  selected: boolean
  onPick: () => void
}) {
  return (
    <ComboboxOption selected={selected} onPick={onPick}>
      <Check
        className={cn('mr-2 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col">
        <span>{city.name}</span>
        <span className="text-[11px] text-[var(--nora-text-muted)]">
          {city.country}
        </span>
      </span>
    </ComboboxOption>
  )
}
