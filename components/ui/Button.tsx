'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-primary text-background font-semibold hover:bg-primary-hover active:scale-[0.98]',
    secondary:
      'bg-border text-foreground font-medium hover:bg-[#252535] active:scale-[0.98]',
    danger:
      'bg-danger/10 text-danger font-medium hover:bg-danger/20 active:scale-[0.98]',
    ghost:
      'text-foreground-muted font-medium hover:text-foreground hover:bg-surface active:scale-[0.98]',
    outline:
      'border border-border text-foreground-muted font-medium hover:border-primary/50 hover:text-foreground active:scale-[0.98]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
    lg: 'px-5 py-3 text-sm rounded-xl gap-2',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}

      {children}

      {!loading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  )
}
