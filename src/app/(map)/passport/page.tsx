'use client'

import { Camera, Settings } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { CityCombobox } from '@/components/CityCombobox'
import { CountryCombobox } from '@/components/CountryCombobox'
import { MbtiGrid } from '@/components/MbtiGrid'
import { ProfileSocialSection } from '@/components/profile/ProfileSocialSection'
import { BirthDateFields } from '@/components/BirthDateFields'
import { isValidBirthDate } from '@/lib/age-policy'
import { RequireAuth } from '@/components/RequireAuth'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/PageShell'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { getCountries } from '@/lib/countries'
import { readFileAsDataURL, validateAvatarFile } from '@/lib/readImage'
import type { MbtiId } from '@/lib/mbti'
import { cn } from '@/lib/utils'
import { displayName } from '@/types/user'
import type { UserStatus } from '@/types/user'

export default function PassportPage() {
  return (
    <RequireAuth>
      <PassportContent />
    </RequireAuth>
  )
}

function PassportContent() {
  const { user, updateProfile } = useAuth()
  const { locale, t } = useI18n()
  const countries = useMemo(() => getCountries(locale), [locale])
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [origin, setOrigin] = useState(user?.countryOrigin ?? '')
  const [current, setCurrent] = useState(user?.countryCurrent ?? '')
  const [city, setCity] = useState(user?.cityIntent ?? '')
  const [mbti, setMbti] = useState<MbtiId | ''>(user?.mbti ?? '')
  const [status, setStatus] = useState<UserStatus>(user?.userStatus ?? '')
  const [birthDay, setBirthDay] = useState(
    user?.birthDay ? String(user.birthDay) : '',
  )
  const [birthMonth, setBirthMonth] = useState(
    user?.birthMonth ? String(user.birthMonth) : '',
  )
  const [birthYear, setBirthYear] = useState(
    user?.birthYear ? String(user.birthYear) : '',
  )
  const [saved, setSaved] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  if (!user) return null

  const shown = displayName({ nickname, name })

  const STATUSES: { id: UserStatus; label: string }[] = [
    { id: 'student', label: t('status.student') },
    { id: 'tourist', label: t('status.tourist') },
    { id: 'expat', label: t('status.expat') },
    { id: 'local', label: t('status.local') },
  ]

  function onSaveProfile() {
    if (name.trim().length < 2) {
      setAvatarError(t('passportForm.nameTooShort'))
      return
    }
    if (nickname.trim().length < 2) {
      setAvatarError(t('passportForm.nickTooShort'))
      return
    }
    const birthDayNum = Number(birthDay)
    const birthMonthNum = Number(birthMonth)
    const birthYearNum = Number(birthYear)
    if (!isValidBirthDate(birthDayNum, birthMonthNum, birthYearNum)) {
      setAvatarError(t('birthDate.invalid'))
      return
    }
    setAvatarError(null)
    updateProfile({
      name: name.trim(),
      nickname: nickname.trim(),
      bio: bio.trim(),
      countryOrigin: origin,
      countryCurrent: current,
      cityIntent: city,
      mbti,
      userStatus: status,
      birthDay: birthDayNum,
      birthMonth: birthMonthNum,
      birthYear: birthYearNum,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  async function onPickAvatar(file: File) {
    const err = validateAvatarFile(file)
    if (err) {
      setAvatarError(err)
      return
    }
    setAvatarError(null)
    try {
      const dataUrl = await readFileAsDataURL(file)
      updateProfile({ avatarUrl: dataUrl })
    } catch {
      setAvatarError(t('passportForm.photoFailed'))
    }
  }

  return (
    <PageShell>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
            {t('passportForm.subtitle')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{t('passport.title')}</h1>
        </div>
        <Button
          asChild
          variant="secondary"
          size="icon"
          className="shrink-0"
          aria-label={t('passport.settings')}
        >
          <Link href="/settings">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      <section className="mb-6 rounded-2xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-[var(--nora-text)]">
          {t('passportForm.photoSection')}
        </h2>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <ProfileAvatar
              avatarUrl={user.avatarUrl}
              avatarEmoji="✨"
              displayName={shown}
              size={96}
              avatarPrivacy={user.avatarPrivacy}
              isOwner
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void onPickAvatar(f)
              }}
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-1">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {user.avatarUrl ? t('passportForm.changePhoto') : t('passportForm.uploadPhoto')}
            </Button>
            {user.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                onClick={() => updateProfile({ avatarUrl: null })}
              >
                {t('passportForm.removePhoto')}
              </Button>
            ) : null}
            <p className="text-[11px] text-[var(--nora-text-muted)]">
              {t('passportForm.photoFormats')}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
              {t('passportForm.nameLabel')}
            </span>
            <input
              className="glass-input h-11 w-full px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
              {t('passportForm.nicknameLabel')}
            </span>
            <input
              className="glass-input h-11 w-full px-3 text-sm"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
              {t('passportForm.bioLabel')}
            </span>
            <textarea
              className="glass-input min-h-[88px] w-full resize-y px-3 py-2 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('passportForm.bioPlaceholder')}
              rows={3}
            />
          </label>
          <p className="text-xs text-[var(--nora-text-muted)]">{user.email}</p>
        </div>

        {avatarError ? (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {avatarError}
          </p>
        ) : null}
      </section>

      <ProfileSocialSection />

      <section className="mb-6 space-y-4 rounded-2xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-[var(--nora-text)]">
          {t('passportForm.locationsTitle')}
        </h2>
        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
            {t('passportForm.countryOriginField')}
          </span>
          <CountryCombobox
            countries={countries}
            value={origin}
            onChange={setOrigin}
            placeholder={t('passportForm.countryPlaceholder')}
            label={t('passportForm.countryOrigin')}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
            {t('passportForm.countryNowField')}
          </span>
          <CountryCombobox
            countries={countries}
            value={current}
            onChange={setCurrent}
            placeholder={t('passportForm.countryCurrent')}
            label={t('passportForm.countryCurrent')}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
            {t('passportForm.cityShortLabel')}
          </span>
          <CityCombobox
            value={city}
            onChange={setCity}
            placeholder={t('passportForm.cityPlaceholder')}
            label={t('passportForm.cityLabel')}
          />
          <p className="mt-1 text-[11px] text-[var(--nora-text-muted)]">
            {t('passportForm.cityHint')}
          </p>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--nora-text-muted)]">
            {t('passportForm.statusLabel')}
          </span>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm transition-colors',
                  status === s.id
                    ? 'nora-choice-active shadow-neon'
                    : 'nora-choice text-[var(--nora-text-muted)]',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl glass-panel p-4">
        <h2 className="text-sm font-semibold text-[var(--nora-text)]">
          {t('passportForm.mbtiTitle')}
        </h2>
        <div className="mt-4">
          <MbtiGrid value={mbti} onChange={setMbti} />
        </div>
      </section>

      <section className="mb-6 rounded-2xl glass-panel p-4">
        <BirthDateFields
          day={birthDay}
          month={birthMonth}
          year={birthYear}
          onDayChange={setBirthDay}
          onMonthChange={setBirthMonth}
          onYearChange={setBirthYear}
          inputClassName="h-11"
        />
      </section>

            <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSaveProfile}>
          {t('passportForm.saveProfile')}
        </Button>
        {saved ? (
          <span className="text-sm text-emerald-400" role="status">
            {t('passport.saved')}
          </span>
        ) : null}
      </div>

    </PageShell>
  )
}
