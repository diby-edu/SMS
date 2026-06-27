import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'warning' | 'danger'
  trend?: {
    value: string
    positive: boolean
  }
}

const ICON_COLORS = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  trend,
}: StatsCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider truncate">
            {title}
          </p>
        </div>
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            ICON_COLORS[iconColor]
          )}
        >
          <Icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
        </div>
      </div>

      <div>
        <p className="font-syne font-bold text-2xl text-foreground leading-none mb-1">
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </p>
        {subtitle && (
          <p className="text-xs text-foreground-subtle mt-1">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend.positive ? 'text-secondary' : 'text-danger'
          )}
        >
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}
