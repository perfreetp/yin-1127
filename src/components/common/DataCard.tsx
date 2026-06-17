import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TrendDirection = 'up' | 'down' | 'neutral'

interface DataCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  trend?: {
    direction: TrendDirection
    value: string
    label?: string
  }
  iconColor?: 'navy' | 'green' | 'red' | 'amber' | 'blue' | 'purple'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const iconColorConfig = {
  navy: {
    bg: 'bg-audit-navy/10 dark:bg-audit-navy-light/20',
    text: 'text-audit-navy dark:text-blue-300',
    ring: 'ring-audit-navy/20',
  },
  green: {
    bg: 'bg-audit-green/10 dark:bg-audit-green-light/20',
    text: 'text-audit-green dark:text-green-300',
    ring: 'ring-audit-green/20',
  },
  red: {
    bg: 'bg-audit-red/10 dark:bg-audit-red-light/20',
    text: 'text-audit-red dark:text-red-300',
    ring: 'ring-audit-red/20',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-300',
    ring: 'ring-purple-500/20',
  },
}

const trendColorConfig = {
  up: {
    text: 'text-audit-green dark:text-green-400',
    bg: 'bg-audit-green/10 dark:bg-green-500/10',
    icon: TrendingUp,
  },
  down: {
    text: 'text-audit-red dark:text-red-400',
    bg: 'bg-audit-red/10 dark:bg-red-500/10',
    icon: TrendingDown,
  },
  neutral: {
    text: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-500/10 dark:bg-gray-500/10',
    icon: Minus,
  },
}

const sizeConfig = {
  sm: {
    wrapper: 'p-4',
    iconWrapper: 'w-9 h-9',
    icon: 'w-5 h-5',
    label: 'text-xs',
    value: 'text-xl',
    trendWrapper: 'px-1.5 py-0.5',
    trendIcon: 'w-3 h-3',
    trendText: 'text-xs',
  },
  md: {
    wrapper: 'p-5',
    iconWrapper: 'w-11 h-11',
    icon: 'w-6 h-6',
    label: 'text-sm',
    value: 'text-2xl',
    trendWrapper: 'px-2 py-1',
    trendIcon: 'w-3.5 h-3.5',
    trendText: 'text-xs',
  },
  lg: {
    wrapper: 'p-6',
    iconWrapper: 'w-14 h-14',
    icon: 'w-7 h-7',
    label: 'text-base',
    value: 'text-3xl',
    trendWrapper: 'px-2.5 py-1',
    trendIcon: 'w-4 h-4',
    trendText: 'text-sm',
  },
}

export default function DataCard({
  icon: Icon,
  label,
  value,
  trend,
  iconColor = 'navy',
  size = 'md',
  className,
}: DataCardProps) {
  const colors = iconColorConfig[iconColor]
  const sizes = sizeConfig[size]
  const trendConfig = trend ? trendColorConfig[trend.direction] : null
  const TrendIcon = trendConfig?.icon

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-audit-border dark:border-gray-700',
        'shadow-audit hover:shadow-audit-hover transition-shadow duration-200',
        sizes.wrapper,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-xl shrink-0',
              sizes.iconWrapper,
              colors.bg,
              colors.text
            )}
          >
            <Icon className={sizes.icon} />
          </div>
          <span
            className={cn(
              'font-medium text-audit-ink-light dark:text-gray-400',
              sizes.label
            )}
          >
            {label}
          </span>
        </div>
        {trend && TrendIcon && (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-lg font-semibold shrink-0',
              sizes.trendWrapper,
              sizes.trendText,
              trendConfig!.bg,
              trendConfig!.text
            )}
          >
            <TrendIcon className={sizes.trendIcon} />
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div
          className={cn(
            'font-bold text-audit-ink dark:text-white tracking-tight',
            sizes.value
          )}
        >
          {value}
        </div>
        {trend?.label && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}
