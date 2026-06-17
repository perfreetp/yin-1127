import { useState, useMemo, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  BarChart3,
  Download,
  FileImage,
  FileSpreadsheet,
  FileJson,
  Package,
  Users,
  Calendar,
  Target,
  AlertTriangle,
  CheckSquare,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Printer,
  Loader2,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Signature,
  MessageSquare,
  Building2,
} from 'lucide-react'
import DensityHeatmap, { type DensityHeatmapItem } from '@/components/chart/DensityHeatmap'
import AnomalyPieChart, { type AnomalyPieItem } from '@/components/chart/AnomalyPieChart'
import TrendLineChart, { type TrendLineItem } from '@/components/chart/TrendLineChart'
import DataCard from '@/components/common/DataCard'
import { cn } from '@/lib/utils'
import type { ReviewConclusion, AnomalyType, AnomalyLevel } from '@/types'

type TabType = 'review' | 'dashboard' | 'export'

interface ReviewNode {
  id: string
  category: string
  content: string
  conclusion: ReviewConclusion
  reviewer?: string
  reviewTime?: string
  remark?: string
  children?: ReviewNode[]
}

type ExportStatus = 'idle' | 'running' | 'completed' | 'error'
type ExportType = 'annotated_image' | 'finding_csv' | 'finding_json' | 'review_pdf' | 'full_package'

interface ExportTask {
  id: string
  type: ExportType
  name: string
  description: string
  icon: typeof FileImage
  progress: number
  status: ExportStatus
  size?: string
  downloadUrl?: string
}

const REVIEW_TREE_DATA: ReviewNode[] = [
  {
    id: 'cat-1',
    category: '一、发票基础信息复核',
    content: '核对发票代码、号码、开票日期、购买方信息等基础要素',
    conclusion: 'pending',
    children: [
      {
        id: 'item-1-1',
        category: '',
        content: '1.1 发票代码与号码连续性检查',
        conclusion: 'pass',
        reviewer: '张伟',
        reviewTime: '2025-06-10 14:32:18',
        remark: '发票连号区间正常，无跳号、重号情况',
      },
      {
        id: 'item-1-2',
        category: '',
        content: '1.2 开票日期与会计期间匹配验证',
        conclusion: 'pass',
        reviewer: '张伟',
        reviewTime: '2025-06-10 15:08:45',
        remark: '',
      },
      {
        id: 'item-1-3',
        category: '',
        content: '1.3 购买方名称与税号一致性校验',
        conclusion: 'fail',
        reviewer: '张伟',
        reviewTime: '2025-06-10 16:22:10',
        remark: '发现3张发票购买方税号有误，已标注并要求重新开具',
      },
      {
        id: 'item-1-4',
        category: '',
        content: '1.4 发票专用章合规性检查',
        conclusion: 'pending',
        remark: '',
      },
    ],
  },
  {
    id: 'cat-2',
    category: '二、金额与税额复核',
    content: '核对金额计算、税额抵扣、价税分离准确性',
    conclusion: 'pending',
    children: [
      {
        id: 'item-2-1',
        category: '',
        content: '2.1 价税分离计算准确性验证',
        conclusion: 'pass',
        reviewer: '李娜',
        reviewTime: '2025-06-11 09:15:30',
        remark: '',
      },
      {
        id: 'item-2-2',
        category: '',
        content: '2.2 税率适用合规性检查',
        conclusion: 'pass',
        reviewer: '李娜',
        reviewTime: '2025-06-11 10:42:20',
        remark: '各档税率使用正确，未见错用税率情况',
      },
      {
        id: 'item-2-3',
        category: '',
        content: '2.3 合计金额与明细加总一致性',
        conclusion: 'pending',
        remark: '',
      },
      {
        id: 'item-2-4',
        category: '',
        content: '2.4 税额抵扣范围合规性复核',
        conclusion: 'pending',
        remark: '',
      },
    ],
  },
  {
    id: 'cat-3',
    category: '三、交易真实性与关联方核查',
    content: '核实交易背景真实性、供应商资质、关联交易披露',
    conclusion: 'pending',
    children: [
      {
        id: 'item-3-1',
        category: '',
        content: '3.1 供应商工商信息与存续状态核查',
        conclusion: 'pass',
        reviewer: '王磊',
        reviewTime: '2025-06-12 11:30:00',
        remark: '全部供应商均为存续状态，未见异常注销',
      },
      {
        id: 'item-3-2',
        category: '',
        content: '3.2 关联方交易识别与完整性检查',
        conclusion: 'fail',
        reviewer: '王磊',
        reviewTime: '2025-06-12 14:18:55',
        remark: '发现2笔关联交易未在附注中充分披露，需补充披露',
      },
      {
        id: 'item-3-3',
        category: '',
        content: '3.3 大额交易合同与发票匹配验证',
        conclusion: 'pending',
        remark: '',
      },
      {
        id: 'item-3-4',
        category: '',
        content: '3.4 异常供应商集中度风险评估',
        conclusion: 'pending',
        remark: '',
      },
    ],
  },
  {
    id: 'cat-4',
    category: '四、费用归集与分摊复核',
    content: '检查费用科目归属、期间分摊、预算执行情况',
    conclusion: 'pending',
    children: [
      {
        id: 'item-4-1',
        category: '',
        content: '4.1 费用科目分类准确性检查',
        conclusion: 'pending',
        remark: '',
      },
      {
        id: 'item-4-2',
        category: '',
        content: '4.2 跨期费用截止测试',
        conclusion: 'pending',
        remark: '',
      },
      {
        id: 'item-4-3',
        category: '',
        content: '4.3 预算执行率与偏差分析',
        conclusion: 'pending',
        remark: '',
      },
    ],
  },
]

const CATEGORIES = ['办公用品', '差旅交通', '会议服务', '技术服务', '咨询服务', '餐饮招待', '设备采购']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function generateHeatmapData(): DensityHeatmapItem[] {
  const data: DensityHeatmapItem[] = []
  const seed = 42
  let s = seed
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (const cat of CATEGORIES) {
    for (const month of MONTHS) {
      data.push({
        category: cat,
        month,
        count: Math.floor(rnd() * 28),
      })
    }
  }
  return data
}

const PIE_DATA: AnomalyPieItem[] = [
  { name: '连号发票', value: 24, type: 'consecutive_no' as AnomalyType },
  { name: '周末异常', value: 18, type: 'weekend' as AnomalyType },
  { name: '重复报销', value: 12, type: 'duplicate' as AnomalyType },
  { name: '整数金额', value: 35, type: 'round_amount' as AnomalyType },
  { name: '金额不符', value: 15, type: 'amount_mismatch' as AnomalyType },
]

const TREND_DATA: TrendLineItem[] = [
  { month: '1月', high: 8, medium: 15, low: 22, total: 45 },
  { month: '2月', high: 6, medium: 12, low: 18, total: 36 },
  { month: '3月', high: 12, medium: 20, low: 28, total: 60 },
  { month: '4月', high: 10, medium: 18, low: 25, total: 53 },
  { month: '5月', high: 15, medium: 22, low: 30, total: 67 },
  { month: '6月', high: 9, medium: 16, low: 20, total: 45 },
  { month: '7月', high: 7, medium: 14, low: 19, total: 40 },
  { month: '8月', high: 11, medium: 19, low: 24, total: 54 },
  { month: '9月', high: 13, medium: 21, low: 26, total: 60 },
  { month: '10月', high: 8, medium: 17, low: 23, total: 48 },
  { month: '11月', high: 10, medium: 18, low: 27, total: 55 },
  { month: '12月', high: 14, medium: 24, low: 32, total: 70 },
]

const CONCLUSION_STYLES: Record<ReviewConclusion, { icon: typeof CheckCircle2; text: string; bg: string; textColor: string; border: string }> = {
  pass: {
    icon: CheckCircle2,
    text: '通过',
    bg: 'bg-audit-green/10 dark:bg-audit-green-light/20',
    textColor: 'text-audit-green dark:text-green-400',
    border: 'border-audit-green/30',
  },
  fail: {
    icon: XCircle,
    text: '不通过',
    bg: 'bg-audit-red/10 dark:bg-audit-red-light/20',
    textColor: 'text-audit-red dark:text-red-400',
    border: 'border-audit-red/30',
  },
  pending: {
    icon: Clock,
    text: '待复核',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
}

function getConclusionFromChildren(children?: ReviewNode[]): ReviewConclusion {
  if (!children || children.length === 0) return 'pending'
  const hasFail = children.some((c) => c.conclusion === 'fail' || getConclusionFromChildren(c.children) === 'fail')
  if (hasFail) return 'fail'
  const hasPending = children.some(
    (c) => c.conclusion === 'pending' || getConclusionFromChildren(c.children) === 'pending'
  )
  if (hasPending) return 'pending'
  return 'pass'
}

function flattenReviewTree(nodes: ReviewNode[]): ReviewNode[] {
  const result: ReviewNode[] = []
  const walk = (list: ReviewNode[]) => {
    for (const n of list) {
      if (n.children && n.children.length > 0) {
        result.push(n)
        walk(n.children)
      } else if (n.category === '') {
        result.push(n)
      }
    }
  }
  walk(nodes)
  return result
}

export default function WorkpaperPage() {
  const [activeTab, setActiveTab] = useState<TabType>('review')
  const [reviewTree, setReviewTree] = useState<ReviewNode[]>(REVIEW_TREE_DATA)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['cat-1', 'cat-2', 'cat-3', 'cat-4']))
  const [searchText, setSearchText] = useState('')
  const [filterConclusion, setFilterConclusion] = useState<ReviewConclusion | 'all'>('all')
  const [selectedClient, setSelectedClient] = useState('国际审计咨询有限公司')
  const [selectedPeriod, setSelectedPeriod] = useState('2024年度')
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signingItemId, setSigningItemId] = useState<string | null>(null)
  const [signatureInput, setSignatureInput] = useState('')

  const [exportTasks, setExportTasks] = useState<ExportTask[]>([
    {
      id: 'exp-1',
      type: 'annotated_image',
      name: '带标注影像包',
      description: '所有标注后的发票影像文件（PNG格式，含标注图层）',
      icon: FileImage,
      progress: 0,
      status: 'idle',
      size: '约 156 MB',
    },
    {
      id: 'exp-2',
      type: 'finding_csv',
      name: '疑点摘要 (CSV)',
      description: '审计发现疑点列表，包含分类、级别、关联发票等字段',
      icon: FileSpreadsheet,
      progress: 0,
      status: 'idle',
      size: '约 180 KB',
    },
    {
      id: 'exp-3',
      type: 'finding_json',
      name: '疑点摘要 (JSON)',
      description: '结构化审计发现数据，支持系统对接与二次分析',
      icon: FileJson,
      progress: 0,
      status: 'idle',
      size: '约 320 KB',
    },
    {
      id: 'exp-4',
      type: 'review_pdf',
      name: '复核清单 (PDF)',
      description: '打印优化样式，包含复核结论、签字栏、备注汇总',
      icon: FileText,
      progress: 0,
      status: 'idle',
      size: '约 2.4 MB',
    },
    {
      id: 'exp-5',
      type: 'full_package',
      name: '完整项目包',
      description: '包含以上所有内容 + 原始影像 + OCR结果 + 审计工作底稿',
      icon: Package,
      progress: 0,
      status: 'idle',
      size: '约 420 MB',
    },
  ])

  const heatmapData = useMemo(() => generateHeatmapData(), [])

  const reviewStats = useMemo(() => {
    const flat = flattenReviewTree(reviewTree).filter((n) => n.category === '')
    return {
      total: flat.length,
      pass: flat.filter((n) => n.conclusion === 'pass').length,
      fail: flat.filter((n) => n.conclusion === 'fail').length,
      pending: flat.filter((n) => n.conclusion === 'pending').length,
    }
  }, [reviewTree])

  const dashboardKPIs = useMemo(() => {
    const totalAnomalies = PIE_DATA.reduce((s, i) => s + i.value, 0)
    const totalReviewed = reviewStats.pass + reviewStats.fail
    const reviewRate = reviewStats.total > 0 ? ((totalReviewed / reviewStats.total) * 100).toFixed(1) : '0'
    const highRiskCount = TREND_DATA.reduce((s, m) => s + m.high, 0)
    return [
      {
        icon: Target,
        label: '异常项总数',
        value: totalAnomalies,
        trend: { direction: 'up' as const, value: '+12.5%', label: '较上期' },
        color: 'navy' as const,
      },
      {
        icon: AlertTriangle,
        label: '高风险异常',
        value: highRiskCount,
        trend: { direction: 'down' as const, value: '-8.3%', label: '较上期' },
        color: 'red' as const,
      },
      {
        icon: CheckSquare,
        label: '复核完成率',
        value: `${reviewRate}%`,
        trend: { direction: 'up' as const, value: '+5.2%', label: '较上周' },
        color: 'green' as const,
      },
      {
        icon: Users,
        label: '复核人员',
        value: 4,
        trend: { direction: 'neutral' as const, value: '—', label: '稳定' },
        color: 'blue' as const,
      },
    ]
  }, [reviewStats])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const ids = new Set<string>()
    const walk = (nodes: ReviewNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          ids.add(n.id)
          walk(n.children)
        }
      }
    }
    walk(reviewTree)
    setExpandedIds(ids)
  }, [reviewTree])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const updateConclusion = useCallback((nodeId: string, conclusion: ReviewConclusion) => {
    setReviewTree((prev) => {
      const update = (nodes: ReviewNode[]): ReviewNode[] => {
        return nodes.map((n) => {
          if (n.id === nodeId) {
            const now = new Date()
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
            return {
              ...n,
              conclusion,
              reviewTime: conclusion !== 'pending' ? timeStr : n.reviewTime,
            }
          }
          if (n.children) {
            const newChildren = update(n.children)
            return {
              ...n,
              children: newChildren,
              conclusion: getConclusionFromChildren(newChildren),
            }
          }
          return n
        })
      }
      return update(prev)
    })
  }, [])

  const updateRemark = useCallback((nodeId: string, remark: string) => {
    setReviewTree((prev) => {
      const update = (nodes: ReviewNode[]): ReviewNode[] => {
        return nodes.map((n) => {
          if (n.id === nodeId) return { ...n, remark }
          if (n.children) return { ...n, children: update(n.children) }
          return n
        })
      }
      return update(prev)
    })
  }, [])

  const openSignModal = useCallback((nodeId: string) => {
    setSigningItemId(nodeId)
    setSignatureInput('')
    setShowSignatureModal(true)
  }, [])

  const confirmSign = useCallback(() => {
    if (!signingItemId || !signatureInput.trim()) return
    setReviewTree((prev) => {
      const update = (nodes: ReviewNode[]): ReviewNode[] => {
        return nodes.map((n) => {
          if (n.id === signingItemId) {
            const now = new Date()
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
            return {
              ...n,
              reviewer: signatureInput.trim(),
              reviewTime: timeStr,
            }
          }
          if (n.children) return { ...n, children: update(n.children) }
          return n
        })
      }
      return update(prev)
    })
    setShowSignatureModal(false)
    setSigningItemId(null)
  }, [signingItemId, signatureInput])

  const startExport = useCallback((taskId: string) => {
    setExportTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'running', progress: 0 } : t))
    )
    const tick = () => {
      setExportTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t
          if (t.status !== 'running') return t
          const increment = t.type === 'full_package' ? 3 : t.type === 'annotated_image' ? 5 : 12
          const nextProgress = Math.min(t.progress + increment + Math.random() * 8, 95)
          if (nextProgress >= 95) {
            return { ...t, progress: 100, status: 'completed' }
          }
          return { ...t, progress: nextProgress }
        })
      )
    }
    const interval = setInterval(() => {
      setExportTasks((prev) => {
        const task = prev.find((t) => t.id === taskId)
        if (!task || task.status !== 'running' || task.progress >= 95) {
          clearInterval(interval)
          if (task && task.status === 'running') {
            return prev.map((t) => (t.id === taskId ? { ...t, progress: 100, status: 'completed' } : t))
          }
          return prev
        }
        tick()
        return prev
      })
    }, 350)
  }, [])

  const startAllExports = useCallback(() => {
    exportTasks.forEach((t) => {
      if (t.status === 'idle') startExport(t.id)
    })
  }, [exportTasks, startExport])

  const filteredReviewTree = useMemo(() => {
    if (!searchText && filterConclusion === 'all') return reviewTree
    const matchNode = (n: ReviewNode): boolean => {
      const textMatch =
        !searchText ||
        n.content.toLowerCase().includes(searchText.toLowerCase()) ||
        n.category.toLowerCase().includes(searchText.toLowerCase()) ||
        (n.remark && n.remark.toLowerCase().includes(searchText.toLowerCase()))
      const conclusionMatch = filterConclusion === 'all' || n.conclusion === filterConclusion
      if (n.children && n.children.length > 0) {
        const childMatch = n.children.some(matchNode)
        return childMatch || (textMatch && n.category !== '')
      }
      return textMatch && conclusionMatch
    }
    const filter = (nodes: ReviewNode[]): ReviewNode[] => {
      return nodes
        .map((n) => {
          if (n.children && n.children.length > 0) {
            const filtered = filter(n.children)
            if (filtered.length === 0 && !matchNode(n)) return null
            return { ...n, children: filtered }
          }
          return matchNode(n) ? n : null
        })
        .filter((n): n is ReviewNode => n !== null)
    }
    return filter(reviewTree)
  }, [reviewTree, searchText, filterConclusion])

  const renderTabs = () => {
    const tabs: { key: TabType; label: string; icon: typeof FileText }[] = [
      { key: 'review', label: '复核清单', icon: CheckSquare },
      { key: 'dashboard', label: '统计看板', icon: BarChart3 },
      { key: 'export', label: '导出中心', icon: Download },
    ]
    return (
      <div className="border-b" style={{ borderColor: 'var(--color-border-secondary)' }}>
        <div className="flex items-center gap-1 px-2 sm:px-6">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 py-4 text-sm font-medium transition-all border-b-2 -mb-px',
                  isActive
                    ? 'border-audit-navy dark:border-blue-400 text-audit-navy dark:text-blue-300'
                    : 'border-transparent hover:text-audit-navy dark:hover:text-blue-300'
                )}
                style={{
                  color: isActive ? 'var(--color-text-navy)' : 'var(--color-text-secondary)',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderReviewNode = (node: ReviewNode, level: number = 0): JSX.Element[] => {
    const isCategory = node.children && node.children.length > 0
    const isExpanded = expandedIds.has(node.id)
    const style = CONCLUSION_STYLES[node.conclusion]
    const StatusIcon = style.icon

    return [
      <div
        key={node.id}
        className={cn(
          'group border rounded-lg mb-2 transition-all',
          node.conclusion === 'fail' && 'border-l-4',
          node.conclusion === 'pass' && level > 0 && 'border-l-4 border-l-audit-green'
        )}
        style={{
          marginLeft: level * 24,
          borderColor:
            node.conclusion === 'fail'
              ? 'var(--color-border-red)'
              : node.conclusion === 'pass' && level > 0
              ? 'var(--color-border-green)'
              : 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isCategory && (
              <button
                onClick={() => toggleExpand(node.id)}
                className="flex-shrink-0 mt-0.5 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {!isCategory && <div className="w-6 flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              {isCategory ? (
                <div>
                  <h4
                    className="font-semibold text-base mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {node.category}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    {node.content}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {node.content}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                style.bg,
                style.textColor,
                style.border
              )}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {style.text}
            </div>

            {!isCategory && (
              <>
                <div className="relative">
                  <select
                    value={node.conclusion}
                    onChange={(e) => updateConclusion(node.id, e.target.value as ReviewConclusion)}
                    className="text-xs pl-2.5 pr-7 py-1.5 rounded-lg border cursor-pointer appearance-none"
                    style={{
                      borderColor: 'var(--color-border-secondary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <option value="pending">待复核</option>
                    <option value="pass">通过</option>
                    <option value="fail">不通过</option>
                  </select>
                  <ChevronDown
                    className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  />
                </div>

                <button
                  onClick={() => openSignModal(node.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    node.reviewer
                      ? 'bg-audit-green/10 border-audit-green/30 text-audit-green dark:text-green-400'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  style={{
                    borderColor: node.reviewer ? undefined : 'var(--color-border-secondary)',
                    color: node.reviewer ? undefined : 'var(--color-text-secondary)',
                  }}
                >
                  <Signature className="w-3.5 h-3.5" />
                  {node.reviewer || '签字'}
                </button>
              </>
            )}
          </div>
        </div>

        {!isCategory && (
          <div
            className="border-t px-4 py-3 space-y-2"
            style={{ borderColor: 'var(--color-border-tertiary)' }}
          >
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {node.reviewTime && (
                <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Calendar className="w-3 h-3" />
                  <span>复核时间：{node.reviewTime}</span>
                </div>
              )}
              {node.reviewer && (
                <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  <Users className="w-3 h-3" />
                  <span>复核人：{node.reviewer}</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2">
              <MessageSquare
                className="w-3.5 h-3.5 mt-2 flex-shrink-0"
                style={{ color: 'var(--color-text-tertiary)' }}
              />
              <textarea
                value={node.remark || ''}
                onChange={(e) => updateRemark(node.id, e.target.value)}
                placeholder="输入复核备注..."
                rows={2}
                className="flex-1 text-xs px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border-secondary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
        )}
      </div>,
      ...(isCategory && isExpanded
        ? node.children!.flatMap((child) => renderReviewNode(child, level + 1))
        : []),
    ]
  }

  const renderReviewTab = () => (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索复核项内容、备注..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg border w-64 sm:w-80 focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
            <select
              value={filterConclusion}
              onChange={(e) => setFilterConclusion(e.target.value as ReviewConclusion | 'all')}
              className="pl-9 pr-8 py-2 text-sm rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="all">全部状态</option>
              <option value="pending">待复核</option>
              <option value="pass">已通过</option>
              <option value="fail">不通过</option>
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            全部展开
          </button>
          <button
            onClick={collapseAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            全部收起
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-secondary)' }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>复核项总数</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-navy)' }}>
            {reviewStats.total}
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-green)' }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>已通过</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-green)' }}>
            {reviewStats.pass}
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-red)' }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>不通过</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-red)' }}>
            {reviewStats.fail}
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-amber)' }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-tertiary)' }}>待复核</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-amber)' }}>
            {reviewStats.pending}
          </div>
        </div>
      </div>

      <div className="space-y-0.5">{filteredReviewTree.flatMap((n) => renderReviewNode(n))}</div>
    </div>
  )

  const renderDashboardTab = () => (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option>国际审计咨询有限公司</option>
              <option>华信科技集团股份有限公司</option>
              <option>鼎盛贸易发展有限公司</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option>2024年度</option>
              <option>2024年H1</option>
              <option>2024年H2</option>
              <option>2023年度</option>
            </select>
          </div>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--color-bg-navy)',
            color: 'var(--color-text-inverse)',
          }}
        >
          数据更新于 2025-06-17 09:30
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardKPIs.map((kpi, idx) => (
          <DataCard
            key={idx}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            iconColor={kpi.color}
            size="md"
          />
        ))}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-secondary)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-tertiary)' }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: 'var(--color-text-navy)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
              费用类别 × 月度异常密度热力图
            </h3>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            单位：项
          </span>
        </div>
        <div className="p-4">
          <DensityHeatmap data={heatmapData} height={380} categories={CATEGORIES} months={MONTHS} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div
          className="lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-secondary)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-tertiary)' }}>
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" style={{ color: 'var(--color-text-navy)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                异常类型分布
              </h3>
            </div>
          </div>
          <div className="p-2">
            <AnomalyPieChart data={PIE_DATA} height={340} />
          </div>
        </div>

        <div
          className="lg:col-span-3 rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-secondary)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-tertiary)' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-text-navy)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                风险级别月度趋势
              </h3>
            </div>
          </div>
          <div className="p-2">
            <TrendLineChart data={TREND_DATA} height={340} />
          </div>
        </div>
      </div>
    </div>
  )

  const renderExportTab = () => (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            className="font-semibold text-base"
            style={{ color: 'var(--color-text-primary)' }}
          >
            可导出项目
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            选择需要导出的内容，支持批量生成下载
          </p>
        </div>
        <button
          onClick={startAllExports}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-gradient-navy)' }}
        >
          <Download className="w-4 h-4" />
          一键导出全部
        </button>
      </div>

      <div className="space-y-3">
        {exportTasks.map((task) => {
          const TaskIcon = task.icon
          const statusColors: Record<ExportStatus, { text: string; bar: string; label: string }> = {
            idle: {
              text: 'var(--color-text-secondary)',
              bar: 'var(--color-border-tertiary)',
              label: '待导出',
            },
            running: {
              text: 'var(--color-text-navy)',
              bar: 'var(--color-bg-navy)',
              label: '导出中',
            },
            completed: {
              text: 'var(--color-text-green)',
              bar: 'var(--color-bg-green)',
              label: '已完成',
            },
            error: {
              text: 'var(--color-text-red)',
              bar: 'var(--color-bg-red)',
              label: '失败',
            },
          }
          const sc = statusColors[task.status]

          return (
            <div
              key={task.id}
              className="rounded-xl border p-4 sm:p-5 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor:
                  task.status === 'completed'
                    ? 'var(--color-border-green)'
                    : task.status === 'running'
                    ? 'var(--color-border-navy)'
                    : 'var(--color-border-secondary)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-navy)',
                  }}
                >
                  <TaskIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {task.name}
                        </h4>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: `${sc.bar}20`,
                            color: sc.text,
                          }}
                        >
                          {task.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                        {task.description}
                      </p>
                      {task.size && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          预估大小：{task.size}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.status === 'idle' && (
                        <button
                          onClick={() => startExport(task.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-white transition-all hover:opacity-90"
                          style={{ background: 'var(--color-gradient-navy)' }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          开始导出
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <button
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-white transition-all hover:opacity-90"
                            style={{ background: 'var(--color-gradient-green)' }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </button>
                          {task.type === 'review_pdf' && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                              style={{
                                borderColor: 'var(--color-border-secondary)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              打印
                            </button>
                          )}
                        </>
                      )}
                      {task.status === 'running' && (
                        <span className="text-xs font-medium" style={{ color: sc.text }}>
                          {Math.round(task.progress)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {(task.status === 'running' || task.status === 'completed') && (
                    <div className="mt-3.5">
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${task.progress}%`,
                            background: task.status === 'completed'
                              ? 'var(--color-gradient-green)'
                              : 'var(--color-gradient-navy)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderBottomBar = () => (
    <div
      className="sticky bottom-0 z-30 border-t"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-secondary)',
        boxShadow: '0 -4px 12px rgba(30, 58, 95, 0.08)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-audit-green/10 text-audit-green border border-audit-green/30"
            >
              <CheckCircle2 className="w-3 h-3" />
              通过 {reviewStats.pass}
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-audit-red/10 text-audit-red border border-audit-red/30"
            >
              <XCircle className="w-3 h-3" />
              不通过 {reviewStats.fail}
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            >
              <Clock className="w-3 h-3" />
              待复核 {reviewStats.pending}
            </div>
          </div>
          <div style={{ color: 'var(--color-text-tertiary)' }} className="hidden sm:block">
            <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            {selectedClient} · {selectedPeriod}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            导出疑点CSV
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Printer className="w-3.5 h-3.5" />
            打印复核清单
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: 'var(--color-gradient-navy)' }}
          >
            <Package className="w-4 h-4" />
            导出完整项目包
          </button>
        </div>
      </div>
    </div>
  )

  const renderSignatureModal = () =>
    showSignatureModal ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--color-overlay)' }}
        onClick={() => setShowSignatureModal(false)}
      >
        <div
          className="rounded-2xl shadow-xl w-full max-w-md p-6 animate-in"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-secondary)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                backgroundColor: 'var(--color-bg-navy)',
                color: 'var(--color-text-inverse)',
              }}
            >
              <Signature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
                复核签字确认
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                签署后将自动记录复核时间
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                复核人姓名
              </label>
              <input
                autoFocus
                value={signatureInput}
                onChange={(e) => setSignatureInput(e.target.value)}
                placeholder="请输入复核人姓名"
                className="w-full px-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--color-border-secondary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmSign()
                }}
              />
            </div>

            <div
              className="text-xs p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <p>签字即表示您已认真复核该审计事项，对复核结论负责。</p>
              <p className="mt-1">复核时间将按系统当前时间自动记录，不可修改。</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{
                borderColor: 'var(--color-border-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              取消
            </button>
            <button
              onClick={confirmSign}
              disabled={!signatureInput.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-gradient-navy)' }}
            >
              确认签字
            </button>
          </div>
        </div>
      </div>
    ) : null

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <header
        className="border-b"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <FileText className="w-6 h-6" style={{ color: 'var(--color-text-navy)' }} />
                <h1
                  className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  审计底稿管理
                </h1>
              </div>
              <p className="text-xs sm:text-sm mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                复核清单管理 · 风险统计分析 · 底稿一键导出
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border-secondary)',
                }}
              >
                <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-navy)' }} />
                <div className="text-xs">
                  <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedClient}
                  </div>
                  <div style={{ color: 'var(--color-text-tertiary)' }}>
                    审计期间：{selectedPeriod}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {renderTabs()}

      <main className="flex-1 pb-24 overflow-auto">
        {activeTab === 'review' && renderReviewTab()}
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'export' && renderExportTab()}
      </main>

      {renderBottomBar()}
      {renderSignatureModal()}
    </div>
  )
}
