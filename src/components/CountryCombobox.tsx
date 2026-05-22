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
  findCountryInList,
  searchCountriesList,
} from '@/i18n/content/geo-countries'
import type { Country } from '@/lib/countries'

type CountryComboboxProps = {
  countries: Country[]
  value: string
  onChange: (code: string) => void
  placeholder: string
  label: string
  id?: string
}

export function CountryCombobox({
  countries,
  value,
  onChange,
  placeholder,
  label,
  id,
}: CountryComboboxProps) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selected = countries.find((c) => c.code === value)

  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const trimmed = search.trim()
  const pool = countries.length ? countries : []
  const matches = searchCountriesList(pool, trimmed, 10)
  const exact = trimmed ? findCountryInList(pool, trimmed) : undefined
  const exactInPool = Boolean(exact)
  const showSimilar =
    trimmed.length > 0 && !exactInPool && matches.length > 0

  function pick(code: string) {
    onChange(code)
    setOpen(false)
    setSearch('')
  }

  function handleEnter() {
    if (!trimmed) return
    if (exactInPool && exact) {
      pick(exact.code)
      return
    }
    if (matches[0]) pick(matches[0].code)
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
            {selected ? selected.name : placeholder}
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
            placeholder={t('combobox.searchCountry')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleEnter()
              }
            }}
          />
          <ComboboxScrollList aria-label={label}>
            {trimmed.length === 0
              ? pool.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    selected={value === c.code}
                    onPick={() => pick(c.code)}
                  />
                ))
              : null}

            {exactInPool && exact ? (
              <>
                <ComboboxGroupHeading>
                  {t('combobox.exactMatch')}
                </ComboboxGroupHeading>
                <CountryRow
                  country={exact}
                  selected={value === exact.code}
                  onPick={() => pick(exact.code)}
                />
              </>
            ) : null}

            {showSimilar ? (
              <>
                <ComboboxGroupHeading>
                  {t('combobox.didYouMean')}
                </ComboboxGroupHeading>
                {matches.map((c) => (
                  <CountryRow
                    key={c.code}
                    country={c}
                    selected={value === c.code}
                    onPick={() => pick(c.code)}
                  />
                ))}
              </>
            ) : null}
          </ComboboxScrollList>

          {trimmed.length > 0 && !exactInPool && matches.length === 0 ? (
            <ComboboxEmpty>{t('combobox.countryNotFound')}</ComboboxEmpty>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CountryRow({
  country,
  selected,
  onPick,
}: {
  country: Country
  selected: boolean
  onPick: () => void
}) {
  return (
    <ComboboxOption selected={selected} onPick={onPick}>
      <Check
        className={cn('mr-2 h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
        aria-hidden
      />
      {country.name}
    </ComboboxOption>
  )
}
