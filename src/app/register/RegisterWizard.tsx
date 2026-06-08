'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CityCombobox } from '@/components/CityCombobox'
import { CountryCombobox } from '@/components/CountryCombobox'
import { MbtiGrid } from '@/components/MbtiGrid'
import { Button } from '@/components/ui/button'
import { DailyBudgetSlider } from '@/components/DailyBudgetSlider'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import {
  getPlannerMoodMeta,
  type PlannerMood,
} from '@/lib/planner-recommendations'
import { getCountries } from '@/lib/countries'
import type { MbtiId } from '@/lib/mbti'
import { BirthDateFields } from '@/components/BirthDateFields'
import { isValidBirthDate } from '@/lib/age-policy'
import { motionGpuClass, spring, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { MoodPreset } from '@/types/user'

const MOOD_IDS: PlannerMood[] = ['energy', 'calm', 'tired', 'anxious']

const BUDGET_LABELS = [
  'до ~1 500 ₽',
  '~1 500–3 500 ₽',
  '~3 500–7 000 ₽',
  '7 000+ ₽',
]

const BUDGET_COMFORT_MAP = [
  'economy',
  'moderate',
  'flexible',
  'flexible',
] as const

function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export function RegisterWizard() {
  const { register } = useAuth()
  const { locale, t } = useI18n()
  const router = useRouter()
  const moodMeta = getPlannerMoodMeta(locale)
  const moods = MOOD_IDS.map((id) => ({
    id,
    emoji: moodMeta[id].emoji,
    label: moodMeta[id].label,
  }))
  const countries = useMemo(() => getCountries(locale), [locale])

  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [origin, setOrigin] = useState('')
  const [current, setCurrent] = useState('')
  const [city, setCity] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')

  const [mbti, setMbti] = useState<MbtiId | ''>('')

  const [mood, setMood] = useState<MoodPreset>('calm')
  const [budgetIdx, setBudgetIdx] = useState(1)

  const progress = useMemo(() => ((step + 1) / 3) * 100, [step])

  const birthDayNum = Number(birthDay)
  const birthMonthNum = Number(birthMonth)
  const birthYearNum = Number(birthYear)

  const canNext0 =
    nickname.trim().length >= 2 &&
    emailOk(email) &&
    password.length >= 4 &&
    password === confirm &&
    isValidBirthDate(birthDayNum, birthMonthNum, birthYearNum)

  const canNext1 = mbti !== ''

  const canFinish = budgetIdx >= 0

  async function finish() {
    setError(null)
    setPending(true)
    try {
      const name = nickname.trim()
      const extras = {
        countryOrigin: origin.trim() || undefined,
        countryCurrent: current.trim() || undefined,
        cityIntent: city.trim() || undefined,
        mbti: mbti || undefined,
        birthDay: birthDayNum,
        birthMonth: birthMonthNum,
        birthYear: birthYearNum,
        initialMood: mood,
        dailyBudgetIndex: budgetIdx,
        moodNote:
          moods.find((m) => m.id === mood)?.label ?? t('register.moodHint'),
        budgetComfort: BUDGET_COMFORT_MAP[budgetIdx] ?? 'moderate',
      }
      await register(
        name,
        nickname.trim(),
        email.trim(),
        password,
        null,
        extras,
      )
      setLeaving(true)
      window.setTimeout(() => {
        router.replace('/')
      }, 520)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('authErrors.registerFailed'))
    } finally {
      setPending(false)
    }
  }

  function next() {
    setError(null)
    if (step < 2) setStep((s) => s + 1)
  }

  const disableNext =
    (step === 0 && !canNext0) ||
    (step === 1 && !canNext1) ||
    (step === 2 && !canFinish)

  return (
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[var(--nora-bg)] px-4 py-8 text-[var(--nora-text)]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-sky-500/25 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 bottom-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
          animate={{ x: [0, -36, 0], y: [0, -24, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/3 top-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mx-auto max-w-lg pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-slate-800/60 dark:bg-slate-900/80">
          <motion.div
            className={cn(
              'h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_0_18px_rgba(56,189,248,0.65)] motion-gpu',
              motionGpuClass,
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={spring.smooth}
          />
        </div>

        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10, scale: 0.992 }}
            animate={
              leaving
                ? { opacity: 0, scale: 0.96, y: -6 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={tween.enter}
            className={cn(
              'motion-gpu overflow-visible rounded-2xl glass-panel-strong p-6 shadow-2xl',
              motionGpuClass,
            )}
          >
            {step === 0 ? (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">Шаг 1 — аккаунт</h1>
                  <p className="mt-1 text-sm text-[var(--nora-text-muted)]">
                    Никнейм, почта и пароль. Страну и город можно указать позже.
                  </p>
                </div>
                <label className="block text-sm font-medium">Никнейм</label>
                <input
                  className="glass-input h-12 w-full px-3"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoComplete="nickname"
                  placeholder={t('register.nicknamePlaceholder')}
                />
                <label className="block text-sm font-medium">Email</label>
                <input
                  className="glass-input h-12 w-full px-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-sm font-medium">
                      Пароль
                    </span>
                    <input
                      className="glass-input h-12 w-full px-3"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-medium">
                      Повтор пароля
                    </span>
                    <input
                      className="glass-input h-12 w-full px-3"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium">
                    {t('passportForm.countryOrigin')} ({t('common.optional')})
                  </span>
                  <CountryCombobox
                    countries={countries}
                    value={origin}
                    onChange={setOrigin}
                    placeholder={t('passportForm.countryOrigin')}
                    label={t('passportForm.countryOrigin')}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium">
                    {t('passportForm.countryCurrent')} ({t('common.optional')})
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
                  <span className="mb-1 block text-sm font-medium">
                    {t('passportForm.cityLabel')} ({t('common.optional')})
                  </span>
                  <CityCombobox
                    value={city}
                    onChange={setCity}
                    placeholder={t('passportForm.cityPlaceholder')}
                    label={t('passportForm.cityLabel')}
                  />
                </div>
                <BirthDateFields
                  day={birthDay}
                  month={birthMonth}
                  year={birthYear}
                  onDayChange={setBirthDay}
                  onMonthChange={setBirthMonth}
                  onYearChange={setBirthYear}
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">Шаг 2 — MBTI</h1>
                  <p className="mt-1 text-sm text-[var(--nora-text-muted)]">
                    Выбери тип, который лучше всего описывает твой стиль мышления
                    и восстановления энергии.
                  </p>
                </div>
                <MbtiGrid value={mbti} onChange={setMbti} />
              </div>
            ) : null}

            {step === 2 ? (
              <motion.div className="space-y-5">
                <div>
                  <h1 className="text-xl font-semibold">Шаг 3 — состояние</h1>
                  <p className="mt-1 text-sm text-[var(--nora-text-muted)]">
                    Как ты чувствуешь себя прямо сейчас? И какой бюджет на день
                    комфортен?
                  </p>
                </div>
                <p className="text-sm font-medium">Настроение</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {moods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-sm transition-colors',
                        mood === m.id
                          ? 'nora-choice-active neon-ring'
                          : 'nora-choice text-[var(--nora-text-muted)]',
                      )}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">Бюджет на сегодня</p>
                  <DailyBudgetSlider
                    value={budgetIdx}
                    onValueChange={setBudgetIdx}
                    labels={BUDGET_LABELS}
                    labelClassName="mt-1 text-xs text-[var(--nora-text-muted)]"
                    sliderClassName="mt-3"
                  />
                </div>
              </motion.div>
            ) : null}

            {error ? (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0 || pending || leaving}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Назад
              </Button>
              {step < 2 ? (
                <Button
                  type="button"
                  disabled={disableNext || pending || leaving}
                  onClick={next}
                >
                  Далее
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={disableNext || pending || leaving}
                  onClick={finish}
                >
                  {pending ? t('register.finishing') : t('register.finish')}
                </Button>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-[var(--nora-text-muted)]">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-sky-400 hover:underline">
                Войти
              </Link>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
