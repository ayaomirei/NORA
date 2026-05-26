import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-glass text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--nora-accent)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nora-bg-base)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border-0 bg-gradient-to-b from-[color-mix(in_srgb,var(--nora-surface-strong)_95%,white)] to-[color-mix(in_srgb,var(--nora-accent)_16%,var(--nora-surface-strong))] text-[var(--nora-text)] shadow-glass hover:shadow-glass-lg hover:to-[color-mix(in_srgb,var(--nora-accent)_22%,var(--nora-surface-strong))] active:scale-[0.99] dark:from-[color-mix(in_srgb,var(--nora-surface-strong)_88%,white)] dark:to-[color-mix(in_srgb,var(--nora-accent)_20%,var(--nora-surface-strong))]',
        secondary:
          'border-0 glass-panel text-[var(--nora-text)] hover:shadow-glass-lg active:scale-[0.98]',
        ghost:
          'border-0 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]',
        outline:
          'border-0 glass-chip bg-transparent text-[var(--nora-text)] hover:shadow-glass',
        link: 'text-[var(--nora-accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
