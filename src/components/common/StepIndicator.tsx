import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  id: string | number
  label: string
  description?: string
  icon?: React.ElementType
}

export type StepStatus = 'completed' | 'current' | 'upcoming' | 'error'

interface StepIndicatorProps {
  steps: StepItem[]
  currentStep: number
  status?: 'default' | 'error'
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

const sizeConfig = {
  sm: {
    circle: 'w-6 h-6 text-xs',
    icon: 'w-3 h-3',
    label: 'text-xs',
    description: 'text-xs',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5',
    gap: 'gap-3',
    itemGap: 'mb-4',
  },
  md: {
    circle: 'w-8 h-8 text-sm',
    icon: 'w-4 h-4',
    label: 'text-sm',
    description: 'text-xs',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5',
    gap: 'gap-4',
    itemGap: 'mb-6',
  },
  lg: {
    circle: 'w-10 h-10 text-base',
    icon: 'w-5 h-5',
    label: 'text-base',
    description: 'text-sm',
    connector: 'h-1',
    connectorVertical: 'w-1',
    gap: 'gap-6',
    itemGap: 'mb-8',
  },
}

export default function StepIndicator({
  steps,
  currentStep,
  status = 'default',
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  className,
}: StepIndicatorProps) {
  const sizes = sizeConfig[size]

  const getStepStatus = (index: number): StepStatus => {
    if (status === 'error' && index === currentStep) return 'error'
    if (index < currentStep) return 'completed'
    if (index === currentStep) return 'current'
    return 'upcoming'
  }

  const getStatusClasses = (stepStatus: StepStatus) => {
    switch (stepStatus) {
      case 'completed':
        return {
          circle: 'bg-audit-green text-white border-audit-green dark:bg-audit-green-light dark:border-audit-green-light',
          text: 'text-audit-ink dark:text-gray-100',
          description: 'text-gray-500 dark:text-gray-400',
          connector: 'bg-audit-green dark:bg-audit-green-light',
        }
      case 'current':
        return {
          circle: 'bg-audit-navy text-white border-audit-navy dark:bg-audit-navy-light dark:border-audit-navy-light ring-4 ring-audit-navy/10 dark:ring-audit-navy-light/20',
          text: 'text-audit-navy font-semibold dark:text-blue-300',
          description: 'text-gray-600 dark:text-gray-300',
          connector: 'bg-gray-200 dark:bg-gray-700',
        }
      case 'error':
        return {
          circle: 'bg-audit-red text-white border-audit-red dark:bg-audit-red-light dark:border-audit-red-light ring-4 ring-audit-red/10 dark:ring-audit-red-light/20',
          text: 'text-audit-red font-semibold dark:text-red-300',
          description: 'text-audit-red dark:text-red-300',
          connector: 'bg-gray-200 dark:bg-gray-700',
        }
      case 'upcoming':
      default:
        return {
          circle: 'bg-white text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
          text: 'text-gray-400 dark:text-gray-500',
          description: 'text-gray-300 dark:text-gray-600',
          connector: 'bg-gray-200 dark:bg-gray-700',
        }
    }
  }

  const renderStep = (step: StepItem, index: number) => {
    const stepStatus = getStepStatus(index)
    const statusClasses = getStatusClasses(stepStatus)
    const Icon = step.icon
    const isLast = index === steps.length - 1

    const stepContent = (
      <>
        <div className="flex items-center">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-all duration-300',
              sizes.circle,
              statusClasses.circle
            )}
          >
            {stepStatus === 'completed' ? (
              <Check className={sizes.icon} />
            ) : stepStatus === 'error' ? (
              !Icon && <Circle className={cn(sizes.icon, 'fill-current')} />
            ) : Icon ? (
              <Icon className={sizes.icon} />
            ) : (
              index + 1
            )}
          </div>
          {!isLast && orientation === 'horizontal' && (
            <div
              className={cn(
                'flex-1 transition-colors duration-300 mx-2',
                sizes.connector,
                statusClasses.connector
              )}
            />
          )}
        </div>
        {showLabels && (
          <div
            className={cn(
              orientation === 'horizontal' ? 'mt-2 text-center min-w-0' : 'ml-4 flex-1',
              orientation === 'horizontal' ? '' : 'flex flex-col justify-center'
            )}
          >
            <div className={cn('font-medium truncate', sizes.label, statusClasses.text)}>
              {step.label}
            </div>
            {step.description && (
              <div className={cn('mt-0.5 truncate', sizes.description, statusClasses.description)}>
                {step.description}
              </div>
            )}
          </div>
        )}
      </>
    )

    if (orientation === 'vertical') {
      return (
        <div key={step.id} className={cn('flex', !isLast && sizes.itemGap)}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-all duration-300',
                sizes.circle,
                statusClasses.circle
              )}
            >
              {stepStatus === 'completed' ? (
                <Check className={sizes.icon} />
              ) : stepStatus === 'error' ? (
                !Icon && <Circle className={cn(sizes.icon, 'fill-current')} />
              ) : Icon ? (
                <Icon className={sizes.icon} />
              ) : (
                index + 1
              )}
            </div>
            {!isLast && (
              <div
                className={cn(
                  'flex-1 mt-2 transition-colors duration-300',
                  sizes.connectorVertical,
                  stepStatus === 'completed'
                    ? 'bg-audit-green dark:bg-audit-green-light'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
                style={{ minHeight: '24px' }}
              />
            )}
          </div>
          {showLabels && (
            <div className="ml-4 flex-1 pb-2">
              <div className={cn('font-medium', sizes.label, statusClasses.text)}>
                {step.label}
              </div>
              {step.description && (
                <div className={cn('mt-1', sizes.description, statusClasses.description)}>
                  {step.description}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        key={step.id}
        className={cn(
          'flex flex-col items-center flex-1',
          orientation === 'horizontal' && isLast ? 'flex-none' : ''
        )}
      >
        <div className={cn('w-full flex items-center', sizes.gap)}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border-2 font-semibold transition-all duration-300 mx-auto',
              sizes.circle,
              statusClasses.circle
            )}
          >
            {stepStatus === 'completed' ? (
              <Check className={sizes.icon} />
            ) : stepStatus === 'error' ? (
              !Icon && <Circle className={cn(sizes.icon, 'fill-current')} />
            ) : Icon ? (
              <Icon className={sizes.icon} />
            ) : (
              index + 1
            )}
          </div>
          {!isLast && (
            <div
              className={cn(
                'flex-1 transition-colors duration-300',
                sizes.connector,
                stepStatus === 'completed'
                  ? 'bg-audit-green dark:bg-audit-green-light'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          )}
        </div>
        {showLabels && (
          <div className="mt-2 text-center w-full px-1">
            <div className={cn('font-medium truncate', sizes.label, statusClasses.text)}>
              {step.label}
            </div>
            {step.description && (
              <div className={cn('mt-0.5 truncate', sizes.description, statusClasses.description)}>
                {step.description}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        orientation === 'horizontal' ? 'flex items-start w-full' : 'flex flex-col',
        className
      )}
    >
      {steps.map((step, index) => renderStep(step, index))}
    </div>
  )
}
