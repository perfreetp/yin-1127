import { Clock, ScanLine, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType = 'pending' | 'recognizing' | 'recognized' | 'doubt' | 'confirmed'

interface StatusBadgeProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  bg: string
  text: string
  border: string
  dot: string
  icon: React.ElementType
}> = {
  pending: {
    label: '待识别',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
    icon: Clock,
  },
  recognizing: {
    label: '识别中',
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500 animate-blink',
    icon: ScanLine,
  },
  recognized: {
    label: '已识别',
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    icon: CheckCircle2,
  },
  doubt: {
    label: '存疑',
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    icon: AlertTriangle,
  },
  confirmed: {
    label: '已确认',
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: ShieldCheck,
  },
}

const sizeConfig = {
  sm: {
    wrapper: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    wrapper: 'px-3 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
    dot: 'w-2 h-2',
  },
  lg: {
    wrapper: 'px-4 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
    dot: 'w-2.5 h-2.5',
  },
}

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bg,
        config.text,
        config.border,
        sizes.wrapper,
        className
      )}
    >
      {showIcon ? (
        <Icon className={cn(sizes.icon, 'shrink-0')} />
      ) : (
        <span className={cn(sizes.dot, 'rounded-full shrink-0')} />
      )}
      <span>{config.label}</span>
    </span>
  )
}
