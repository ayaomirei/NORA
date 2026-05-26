import { cn } from '@/lib/utils'

type SettingsBlockProps = {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SettingsBlock({
  title,
  description,
  children,
  className,
}: SettingsBlockProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl glass-panel',
        className,
      )}
    >
      <header className="nora-divider bg-[var(--nora-surface-veil)] px-4 py-3.5">
        <h2 className="text-sm font-semibold text-[var(--nora-text)]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs leading-snug text-[var(--nora-text-muted)]">
            {description}
          </p>
        ) : null}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}
