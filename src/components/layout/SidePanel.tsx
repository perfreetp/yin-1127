import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useFindingStore } from '@/store/findingStore';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  PlayCircle,
  FileSearch,
  Download,
  RefreshCw,
  Zap,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  total?: number;
  color: 'navy' | 'green' | 'amber' | 'red';
  trend?: number;
}

function KpiCard({ icon: Icon, label, value, total, color, trend }: KpiCardProps) {
  const colorMap = {
    navy: {
      bg: 'from-audit-navy/15 to-audit-navy/5',
      border: 'border-audit-navy/30',
      iconBg: 'bg-audit-navy text-white',
      value: 'text-audit-navy',
      ring: 'ring-audit-navy/20',
    },
    green: {
      bg: 'from-audit-green/15 to-audit-green/5',
      border: 'border-audit-green/30',
      iconBg: 'bg-audit-green text-white',
      value: 'text-audit-green',
      ring: 'ring-audit-green/20',
    },
    amber: {
      bg: 'from-audit-amber/18 to-audit-amber/6',
      border: 'border-audit-amber/40',
      iconBg: 'bg-audit-amber text-white',
      value: 'text-audit-amber',
      ring: 'ring-audit-amber/25',
    },
    red: {
      bg: 'from-audit-red/15 to-audit-red/5',
      border: 'border-audit-red/30',
      iconBg: 'bg-audit-red text-white',
      value: 'text-audit-red',
      ring: 'ring-audit-red/20',
    },
  };

  const c = colorMap[color];
  const percentage = total ? Math.round((value / total) * 100) : 0;

  return (
    <div
      className={cn(
        'relative rounded-xl p-3.5 bg-gradient-to-br border transition-all duration-200',
        'hover:shadow-audit-hover hover:-translate-y-0.5',
        c.bg,
        c.border
      )}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ring-4',
            c.iconBg,
            c.ring
          )}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md',
              trend > 0
                ? 'bg-audit-green/15 text-audit-green'
                : 'bg-audit-red/15 text-audit-red'
            )}
          >
            <TrendingUp
              className={cn('w-3 h-3', trend < 0 && 'rotate-180')}
              strokeWidth={2.5}
            />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className={cn('text-2xl font-bold tracking-tight', c.value)}>
          {value.toLocaleString()}
        </span>
        {total !== undefined && total > 0 && (
          <span className="text-xs text-audit-ink-light/70">/ {total.toLocaleString()}</span>
        )}
      </div>

      <div className="text-[12px] text-audit-ink-light font-medium mb-2">{label}</div>

      {total !== undefined && total > 0 && (
        <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              color === 'navy' && 'bg-gradient-to-r from-audit-navy to-audit-navy-light',
              color === 'green' && 'bg-gradient-to-r from-audit-green to-audit-green-light',
              color === 'amber' && 'bg-gradient-to-r from-audit-amber to-yellow-500',
              color === 'red' && 'bg-gradient-to-r from-audit-red to-audit-red-light'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onClick?: () => void;
  badge?: string;
}

function QuickAction({
  icon: Icon,
  label,
  description,
  variant = 'secondary',
  onClick,
  badge,
}: QuickActionProps) {
  const variantMap = {
    primary: {
      base: 'bg-gradient-to-r from-audit-navy to-audit-navy-light text-white shadow-audit hover:shadow-audit-raised border-transparent',
      icon: 'bg-white/15 text-white',
      desc: 'text-white/70',
    },
    secondary: {
      base: 'bg-white text-audit-ink border-audit-border hover:border-audit-navy/40 hover:bg-audit-navy/[0.03] shadow-audit',
      icon: 'bg-audit-navy/10 text-audit-navy',
      desc: 'text-audit-ink-light',
    },
    outline: {
      base: 'bg-transparent text-audit-ink border-audit-border hover:border-audit-navy/50 hover:bg-audit-navy/[0.04]',
      icon: 'bg-audit-navy/8 text-audit-navy',
      desc: 'text-audit-ink-light',
    },
  };

  const v = variantMap[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full group rounded-xl border p-3 flex items-center gap-3 transition-all duration-200 text-left',
        v.base
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
          v.icon
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{label}</span>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-audit-amber/20 text-audit-amber">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className={cn('text-[11px] mt-0.5 truncate', v.desc)}>{description}</p>
        )}
      </div>
      <ArrowUpRight
        className={cn(
          'w-4 h-4 flex-shrink-0 transition-all duration-200 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0',
          variant === 'primary' ? 'text-white/70' : 'text-audit-navy'
        )}
        strokeWidth={2.5}
      />
    </button>
  );
}

interface SidePanelProps {
  className?: string;
  onAction?: (action: string) => void;
}

export default function SidePanel({ className, onAction }: SidePanelProps) {
  const { currentProject } = useProjectStore();
  const { invoices, getInvoicesByProject, anomalies } = useInvoiceStore();
  const { findings, reviewItems } = useFindingStore();

  const stats = useMemo(() => {
    const projectInvoices = currentProject
      ? getInvoicesByProject(currentProject.id)
      : invoices;

    const total = projectInvoices.length;
    const recognized = projectInvoices.filter(
      (i) => i.status === 'recognized' || i.status === 'doubt' || i.status === 'confirmed'
    ).length;
    const doubt = projectInvoices.filter((i) => i.status === 'doubt').length;
    const confirmed = projectInvoices.filter((i) => i.status === 'confirmed').length;
    const pending = projectInvoices.filter(
      (i) => i.status === 'pending' || i.status === 'recognizing'
    ).length;
    const toReview = confirmed > 0 ? Math.max(0, doubt) : doubt;

    const anomalyCount = anomalies.filter((a) =>
      projectInvoices.some((i) => i.id === a.invoiceId)
    ).length;

    const findingCount = findings.filter((f) =>
      projectInvoices.some((i) => i.id === f.invoiceId)
    ).length;

    const pendingReview = reviewItems.filter(
      (r) => r.projectId === currentProject?.id && r.conclusion === 'pending'
    ).length;

    return {
      total,
      recognized,
      doubt,
      confirmed,
      pending,
      toReview,
      anomalyCount,
      findingCount,
      pendingReview,
    };
  }, [currentProject, invoices, getInvoicesByProject, anomalies, findings, reviewItems]);

  const quickActions: QuickActionProps[] = [
    {
      icon: Upload,
      label: '批量导入样本',
      description: '支持 PDF、图片、压缩包',
      variant: 'primary',
      onClick: () => onAction?.('import'),
    },
    {
      icon: PlayCircle,
      label: '启动批量识别',
      description: `${stats.pending} 份待识别`,
      variant: 'secondary',
      badge: stats.pending > 0 ? `${stats.pending}` : undefined,
      onClick: () => onAction?.('recognize'),
    },
    {
      icon: FileSearch,
      label: '智能疑点检测',
      description: '自动异常规则扫描',
      variant: 'secondary',
      onClick: () => onAction?.('detect'),
    },
    {
      icon: Zap,
      label: '一键生成底稿',
      description: '按模板导出审计文档',
      variant: 'outline',
      onClick: () => onAction?.('draft'),
    },
    {
      icon: Download,
      label: '导出报告',
      description: 'Excel / PDF 格式',
      variant: 'outline',
      onClick: () => onAction?.('export'),
    },
    {
      icon: RefreshCw,
      label: '刷新数据',
      description: '同步最新状态',
      variant: 'outline',
      onClick: () => onAction?.('refresh'),
    },
  ];

  return (
    <aside
      className={cn(
        'w-72 h-full bg-white border-r border-audit-border flex flex-col',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-audit-navy to-audit-navy-light" />
              <h3 className="text-sm font-bold text-audit-ink tracking-wide">
                抽样统计总览
              </h3>
            </div>
            {currentProject && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-audit-navy/10 text-audit-navy">
                当前项目
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={Layers}
              label="抽样总数"
              value={stats.total}
              color="navy"
            />
            <KpiCard
              icon={CheckCircle2}
              label="已识别"
              value={stats.recognized}
              total={stats.total}
              color="green"
            />
            <KpiCard
              icon={AlertTriangle}
              label="有疑点"
              value={stats.doubt + stats.anomalyCount}
              total={stats.total}
              color="amber"
            />
            <KpiCard
              icon={Clock}
              label="待复核"
              value={stats.toReview + stats.pendingReview}
              total={stats.total}
              color="red"
            />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-audit-border to-transparent" />

        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-audit-green to-audit-green-light" />
              <h3 className="text-sm font-bold text-audit-ink tracking-wide">
                快捷操作
              </h3>
            </div>
          </div>

          <div className="space-y-2.5">
            {quickActions.map((action, idx) => (
              <QuickAction key={`${action.label}-${idx}`} {...action} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-audit-border p-3 bg-gradient-to-b from-white to-audit-paper-dark/50">
        <div className="flex items-center justify-between text-[11px] text-audit-ink-light">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-audit-green animate-pulse" />
            <span>系统运行正常</span>
          </div>
          <span className="font-mono">
            {new Date().toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </aside>
  );
}
