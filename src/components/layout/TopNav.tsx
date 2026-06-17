import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import {
  FileUp,
  ShoppingBasket,
  ScanSearch,
  Tag,
  FileText,
  ChevronRight,
  Building2,
  Calendar,
  UserCircle,
  ShieldCheck,
} from 'lucide-react';

export type StepKey = 'import' | 'basket' | 'compare' | 'annotate' | 'draft';

interface StepItem {
  key: StepKey;
  label: string;
  icon: React.ElementType;
}

const steps: StepItem[] = [
  { key: 'import', label: '样本导入', icon: FileUp },
  { key: 'basket', label: '抽样篮', icon: ShoppingBasket },
  { key: 'compare', label: '识别比对', icon: ScanSearch },
  { key: 'annotate', label: '疑点标注', icon: Tag },
  { key: 'draft', label: '审计底稿', icon: FileText },
];

const STEP_ROUTE_MAP: Record<StepKey, string> = {
  import: '/import',
  basket: '/sample',
  compare: '/compare',
  annotate: '/mark',
  draft: '/workpaper',
};

interface TopNavProps {
  currentStep?: StepKey;
  onStepChange?: (step: StepKey) => void;
  completedSteps?: StepKey[];
}

export default function TopNav({
  currentStep = 'import',
  onStepChange,
  completedSteps = [],
}: TopNavProps) {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [hoveredStep, setHoveredStep] = useState<StepKey | null>(null);

  const formatPeriod = () => {
    if (!currentProject) return '-';
    const start = new Date(currentProject.periodStart);
    const end = new Date(currentProject.periodEnd);
    const fmt = (d: Date) =>
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <header className="h-16 bg-gradient-to-r from-audit-navy to-audit-navy-light text-white shadow-audit-raised flex items-center justify-between px-6 relative z-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide">智能审计影像识别工作台</span>
            <span className="text-[11px] text-white/60 tracking-widest">
              AUDIT INTELLIGENT PLATFORM
            </span>
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = completedSteps.includes(step.key);
          const isPast = index < currentIndex || isCompleted;
          const isHovered = hoveredStep === step.key;
          const isClickable = true;

          return (
            <div key={step.key} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => {
                  navigate(STEP_ROUTE_MAP[step.key]);
                  onStepChange?.(step.key);
                }}
                onMouseEnter={() => setHoveredStep(step.key)}
                onMouseLeave={() => setHoveredStep(null)}
                className={cn(
                  'relative flex items-center gap-2.5 px-5 py-2 rounded-lg transition-all duration-200 group',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-default',
                  isActive &&
                    'bg-white/15 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.2)]',
                  !isActive &&
                    isPast &&
                    'text-white/75 hover:bg-white/8 hover:text-white',
                  !isActive &&
                    !isPast &&
                    'text-white/50 hover:bg-white/5 hover:text-white/80',
                  isHovered && !isActive && 'scale-[1.02]'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200',
                    isActive && 'bg-white text-audit-navy shadow-md',
                    isPast && !isActive && 'bg-audit-green-light/80 text-white',
                    !isPast &&
                      !isActive &&
                      'bg-white/10 text-white/60 group-hover:bg-white/15'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'
                    )}
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span
                    className={cn(
                      'text-sm font-semibold leading-tight',
                      isActive && 'tracking-wide'
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] leading-none mt-0.5',
                      isActive && 'text-white/70',
                      isPast && !isActive && 'text-white/50',
                      !isPast && !isActive && 'text-white/35'
                    )}
                  >
                    Step {index + 1}
                  </span>
                </div>
                {isActive && (
                  <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent border-b-white/95" />
                )}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-1 transition-colors duration-300',
                    index < currentIndex ? 'text-audit-green-light' : 'text-white/25'
                  )}
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        {currentProject ? (
          <div className="flex items-center gap-2 pl-4 border-l border-white/20">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-white/60" />
                <span className="text-sm font-medium">{currentProject.clientName}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatPeriod()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCircle className="w-3 h-3" />
                  <span>{currentProject.auditor}</span>
                </div>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-sm font-bold">
              {currentProject.auditor?.charAt(0) || 'A'}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-4 border-l border-white/20">
            <div className="text-sm text-white/50">未选择项目</div>
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-white/50" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
