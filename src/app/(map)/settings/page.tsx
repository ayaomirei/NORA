'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FaqList } from '@/components/FaqList'
import { PartnersList } from '@/components/PartnersList'
import { RequireAuth } from '@/components/RequireAuth'
import { SettingsBlock } from '@/components/settings/SettingsBlock'
import { SettingsToggleRow } from '@/components/settings/SettingsToggleRow'
import { LanguagePicker } from '@/components/settings/LanguagePicker'
import { AvatarPrivacyPicker } from '@/components/settings/AvatarPrivacyPicker'
import { GeolocationSettings } from '@/components/settings/GeolocationSettings'
import { ThemePicker } from '@/components/settings/ThemePicker'
import { useI18n } from '@/hooks/useI18n'
import { SettingsSection } from '@/components/SettingsSection'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/useAuth'
import { APP_VERSION, SUPPORT_EMAIL } from '@/lib/app-version'
import {
  fetchNotificationPrefs,
  persistNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/settings-preferences'
import { displayName } from '@/types/user'

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  )
}

function SettingsContent() {
  const { user, logout, changePassword, deleteAccount } = useAuth()
  const { t } = useI18n()
  const router = useRouter()

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    pushEnabled: true,
    importantOnly: false,
  })

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState(false)
  const [pwPending, setPwPending] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    void fetchNotificationPrefs().then(setPrefs)
  }, [])

  if (!user) return null

  const shown = displayName(user)

  function updatePrefs(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    void persistNotificationPrefs(next).then(setPrefs)
  }

  async function onChangePassword() {
    setPwError(null)
    setPwOk(false)
    if (newPw !== confirmPw) {
      setPwError(t('settings.passwordMismatch'))
      return
    }
    setPwPending(true)
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwOk(true)
      window.setTimeout(() => setPwOk(false), 2500)
    } catch (e) {
      setPwError(
        e instanceof Error ? e.message : t('settings.passwordChangeFailed'),
      )
    } finally {
      setPwPending(false)
    }
  }

  async function onConfirmDelete() {
    setDeleteError(null)
    setDeletePending(true)
    try {
      await deleteAccount(deletePw)
      setDeleteOpen(false)
      router.replace('/login')
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : t('settings.deleteFailed'),
      )
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <PageShell>
      <header className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 h-8 gap-1 px-2 text-[var(--nora-text-muted)]"
        >
          <Link href="/passport">
            <ArrowLeft className="h-4 w-4" />
            {t('settings.backProfile')}
          </Link>
        </Button>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
          {t('settings.title')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{t('settings.pageTitle')}</h1>
      </header>

      <div className="space-y-4">
        <SettingsBlock
          title={t('settings.account')}
          description={t('settings.accountDesc')}
        >
          <div className="rounded-xl border border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] px-3 py-3">
            <p className="font-medium text-[var(--nora-text)]">{shown}</p>
            <p className="mt-0.5 text-sm text-[var(--nora-text-muted)]">
              @{user.nickname}
            </p>
            <p className="mt-1 text-sm text-[var(--nora-text-muted)]">
              {user.email}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
              {t('settings.changePassword')}
            </p>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder={t('settings.currentPassword')}
              className="glass-input h-11 w-full px-3 text-sm"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder={t('settings.newPassword')}
              className="glass-input h-11 w-full px-3 text-sm"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder={t('settings.confirmPassword')}
              className="glass-input h-11 w-full px-3 text-sm"
            />
            {pwError ? (
              <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                {pwError}
              </p>
            ) : null}
            {pwOk ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {t('settings.passwordUpdated')}
              </p>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={pwPending || !currentPw || !newPw || !confirmPw}
              onClick={() => void onChangePassword()}
            >
              {pwPending ? t('settings.savingPassword') : t('settings.updatePassword')}
            </Button>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-[var(--nora-border-subtle)] pt-4">
            <Button type="button" variant="secondary" onClick={logout}>
              {t('settings.logout')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-400/35 text-red-600 hover:bg-red-500/10 dark:text-red-400"
              onClick={() => {
                setDeletePw('')
                setDeleteError(null)
                setDeleteOpen(true)
              }}
            >
              {t('settings.deleteAccount')}
            </Button>
            <p className="text-[11px] leading-snug text-[var(--nora-text-muted)]">
              {t('settings.deleteHint')}
            </p>
          </div>
        </SettingsBlock>

        <SettingsBlock
          title={t('settings.avatarPrivacyTitle')}
          description={t('settings.avatarPrivacyDesc')}
        >
          <AvatarPrivacyPicker />
        </SettingsBlock>

        <SettingsBlock
          title={t('settings.geoTitle')}
          description={t('settings.geoDesc')}
        >
          <GeolocationSettings />
        </SettingsBlock>

        <SettingsBlock
          title={t('settings.notifications')}
          description={t('settings.notificationsDesc')}
        >
          <SettingsToggleRow
            label={t('settings.push')}
            description={t('settings.pushDesc')}
            checked={prefs.pushEnabled}
            onCheckedChange={(v) => updatePrefs({ pushEnabled: v })}
          />
          <SettingsToggleRow
            label={t('settings.importantOnly')}
            description={t('settings.importantDesc')}
            checked={prefs.importantOnly}
            onCheckedChange={(v) => updatePrefs({ importantOnly: v })}
            disabled={!prefs.pushEnabled}
          />
        </SettingsBlock>

        <SettingsBlock title={t('settings.appearance')} description={t('settings.appearanceDesc')}>
          <p className="mb-3 text-xs text-[var(--nora-text-muted)]">
            {t('settings.themeHint')}
          </p>
          <ThemePicker />
        </SettingsBlock>

        <SettingsBlock title={t('settings.language')} description={t('settings.languageDesc')}>
          <LanguagePicker />
        </SettingsBlock>

        <SettingsBlock title={t('settings.help')}>
          <Button asChild variant="secondary" className="w-full gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="h-4 w-4" />
              {t('settings.support')}
            </a>
          </Button>
          <p className="mt-4 text-center text-xs text-[var(--nora-text-muted)]">
            {t('settings.version')}{' '}
            <span className="font-mono text-[var(--nora-text)]">{APP_VERSION}</span>
          </p>
        </SettingsBlock>

        <SettingsSection
          id="faq"
          title={t('settings.faq')}
          description={t('settings.faqDesc')}
        >
          <FaqList />
        </SettingsSection>

        <SettingsSection
          id="partners"
          title={t('settings.partners')}
          description={t('settings.partnersDesc')}
        >
          <PartnersList />
        </SettingsSection>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('settings.deleteConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <input
            type="password"
            value={deletePw}
            onChange={(e) => setDeletePw(e.target.value)}
            placeholder={t('settings.passwordPlaceholder')}
            className="glass-input h-11 w-full px-3 text-sm"
            autoComplete="current-password"
          />
          {deleteError ? (
            <p className="text-sm text-red-500 dark:text-red-400" role="alert">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-400/35 text-red-600 dark:text-red-400"
              disabled={deletePending || !deletePw}
              onClick={() => void onConfirmDelete()}
            >
              {deletePending ? t('settings.deleting') : t('settings.deleteForever')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
