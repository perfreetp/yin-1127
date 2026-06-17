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
  Inbox,
} from 'lucide-react'
import DensityHeatmap, { type DensityHeatmapItem } from '@/components/chart/DensityHeatmap'
import AnomalyPieChart, { type AnomalyPieItem } from '@/components/chart/AnomalyPieChart'
import TrendLineChart, { type TrendLineItem } from '@/components/chart/TrendLineChart'
import DataCard from '@/components/common/DataCard'
import { cn } from '@/lib/utils'
import type { ReviewConclusion, AnomalyType, AssertionType } from '@/types'
import { useFindingStore } from '@/store/findingStore'
import { useInvoiceStore } from '@/store/invoiceStore'
import { useProjectStore } from '@/store/projectStore'
import {
  exportFindingsCSV,
  exportFindingsJSON,
  printReviewChecklist,
  exportAnnotatedImage,
} from '@/utils/exportUtils'

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

const ASSERTION_LABELS: Record<AssertionType, string> = {
  existence: '存在性认定复核',
  completeness: '完整性认定复核',
  accuracy: '准确性认定复核',
  cutoff: '截止认定复核',
  classification: '分类认定复核',
}

const ASSERTION_DESCRIPTIONS: Record<AssertionType, string> = {
  existence: '核实交易与资产的存在性，确认发票对应的经济业务真实发生',
  completeness: '验证记录的完整性，确认应入账交易均已入账',
  accuracy: '核对金额计算的准确性，验证金额、税额等数据无误',
  cutoff: '检查交易截止的合理性，确认跨期交易处理正确',
  classification: '审查科目分类的合规性，确认费用归集与分摊准确',
}

const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  consecutive_no: '连号发票',
  weekend: '周末异常',
  duplicate: '重复报销',
  round_amount: '整数金额',
  amount_mismatch: '金额不符',
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

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

function getMonthFromDate(dateStr: string): number {
  try {
    const d = new Date(dateStr)
    return d.getMonth()
  } catch {
    return 0
  }
}

export default function WorkpaperPage() {
  const { findings, annotations, setFindingSuggestion, updateFinding } = useFindingStore()
  const { invoices, anomalies, selectedInvoiceId } = useInvoiceStore()
  const { currentProject } = useProjectStore()

  const projectInvoices = useMemo(
    () => (currentProject ? invoices.filter((inv) => inv.projectId === currentProject.id) : invoices),
    [currentProject, invoices]
  )

  const projectFindings = useMemo(
    () =>
      currentProject
        ? findings.filter((f) => projectInvoices.some((inv) => inv.id === f.invoiceId))
        : findings,
    [currentProject, findings, projectInvoices]
  )

  const projectAnomalies = useMemo(
    () =>
      currentProject
        ? anomalies.filter((a) => projectInvoices.some((inv) => inv.id === a.invoiceId))
        : anomalies,
    [currentProject, anomalies, projectInvoices]
  )

  const [activeTab, setActiveTab] = useState<TabType>('review')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState('')
  const [filterConclusion, setFilterConclusion] = useState<ReviewConclusion | 'all'>('all')
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

  const reviewTree = useMemo<ReviewNode[]>(() => {
    if (projectFindings.length === 0) return []

    const grouped = new Map<AssertionType, typeof projectFindings>()
    for (const finding of projectFindings) {
      const primaryAssertion = finding.assertions[0] || 'existence'
      if (!grouped.has(primaryAssertion)) grouped.set(primaryAssertion, [])
      grouped.get(primaryAssertion)!.push(finding)
    }

    const assertionOrder: AssertionType[] = ['existence', 'completeness', 'accuracy', 'cutoff', 'classification']
    const trees: ReviewNode[] = []
    const newExpandedIds = new Set<string>()

    for (const assertion of assertionOrder) {
      const group = grouped.get(assertion)
      if (!group || group.length === 0) continue

      const catId = `cat-${assertion}`
      newExpandedIds.add(catId)

      const children: ReviewNode[] = group.map((finding, idx) => {
        const conclusion: ReviewConclusion =
          finding.suggestion?.status === 'completed'
            ? 'pass'
            : finding.suggestion?.status === 'in_progress'
            ? 'pending'
            : 'pending'

        return {
          id: finding.id,
          category: '',
          content: `${idx + 1}. ${finding.title}${finding.description ? ' — ' + finding.description : ''}`,
          conclusion,
          reviewer: finding.suggestion?.responsible || finding.createBy,
          reviewTime: finding.suggestion?.status === 'completed' ? finding.createTime : undefined,
          remark: finding.suggestion?.content || '',
        }
      })

      trees.push({
        id: catId,
        category: ASSERTION_LABELS[assertion],
        content: ASSERTION_DESCRIPTIONS[assertion],
        conclusion: getConclusionFromChildren(children),
        children,
      })
    }

    setExpandedIds((prev) => {
      if (prev.size === 0) return newExpandedIds
      return prev
    })

    return trees
  }, [projectFindings])

  const invoiceMap = useMemo(
    () => new Map(projectInvoices.map((inv) => [inv.id, inv])),
    [projectInvoices]
  )

  const heatmapData = useMemo<DensityHeatmapItem[]>(() => {
    if (projectAnomalies.length === 0) return []

    const categories = Array.from(new Set(projectAnomalies.map((a) => a.type)))
      .map((t) => ANOMALY_TYPE_LABELS[t])
      .filter(Boolean)

    const countMap = new Map<string, number>()
    for (const anomaly of projectAnomalies) {
      const invoice = invoiceMap.get(anomaly.invoiceId)
      if (!invoice) continue
      const monthIdx = getMonthFromDate(invoice.uploadTime)
      const month = MONTH_LABELS[monthIdx]
      const cat = ANOMALY_TYPE_LABELS[anomaly.type]
      const key = `${cat}|${month}`
      countMap.set(key, (countMap.get(key) || 0) + 1)
    }

    const data: DensityHeatmapItem[] = []
    for (const cat of categories) {
      for (const month of MONTH_LABELS) {
        const key = `${cat}|${month}`
        data.push({ category: cat, month, count: countMap.get(key) || 0 })
      }
    }
    return data
  }, [projectAnomalies, invoiceMap])

  const pieData = useMemo<AnomalyPieItem[]>(() => {
    const countMap = new Map<AnomalyType, number>()
    for (const a of projectAnomalies) {
      countMap.set(a.type, (countMap.get(a.type) || 0) + 1)
    }
    return Array.from(countMap.entries()).map(([type, value]) => ({
      name: ANOMALY_TYPE_LABELS[type],
      value,
      type,
    }))
  }, [projectAnomalies])

  const trendData = useMemo<TrendLineItem[]>(() => {
    const monthData = new Map<number, { high: number; medium: number; low: number }>()
    for (const anomaly of projectAnomalies) {
      const invoice = invoiceMap.get(anomaly.invoiceId)
      if (!invoice) continue
      const monthIdx = getMonthFromDate(invoice.uploadTime)
      if (!monthData.has(monthIdx)) monthData.set(monthIdx, { high: 0, medium: 0, low: 0 })
      const d = monthData.get(monthIdx)!
      d[anomaly.level]++
    }

    const data: TrendLineItem[] = []
    for (let i = 0; i < 12; i++) {
      const d = monthData.get(i) || { high: 0, medium: 0, low: 0 }
      data.push({
        month: MONTH_LABELS[i],
        high: d.high,
        medium: d.medium,
        low: d.low,
        total: d.high + d.medium + d.low,
      })
    }
    return data
  }, [projectAnomalies, invoiceMap])

  const heatmapCategories = useMemo(
    () => Array.from(new Set(projectAnomalies.map((a) => ANOMALY_TYPE_LABELS[a.type]))).filter(Boolean),
    [projectAnomalies]
  )

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
    const totalAnomalies = projectAnomalies.length
    const highRiskCount = projectAnomalies.filter((a) => a.level === 'high').length
    const totalReviewed = projectFindings.filter((f) => f.suggestion?.status === 'completed').length
    const reviewRate = projectFindings.length > 0 ? ((totalReviewed / projectFindings.length) * 100).toFixed(1) : '0'
    const reviewers = new Set(projectFindings.filter((f) => f.suggestion?.responsible).map((f) => f.suggestion!.responsible))

    return [
      {
        icon: Target,
        label: '异常项总数',
        value: totalAnomalies,
        trend: { direction: 'neutral' as const, value: '—', label: '本期' },
        color: 'navy' as const,
      },
      {
        icon: AlertTriangle,
        label: '高风险异常',
        value: highRiskCount,
        trend: { direction: 'neutral' as const, value: '—', label: '本期' },
        color: 'red' as const,
      },
      {
        icon: CheckSquare,
        label: '复核完成率',
        value: `${reviewRate}%`,
        trend: { direction: 'neutral' as const, value: '—', label: '本期' },
        color: 'green' as const,
      },
      {
        icon: Users,
        label: '复核人员',
        value: reviewers.size || 0,
        trend: { direction: 'neutral' as const, value: '—', label: '稳定' },
        color: 'blue' as const,
      },
    ]
  }, [projectAnomalies, projectFindings])

  const bottomBarStats = useMemo(() => {
    const passCount = projectFindings.filter((f) => f.suggestion?.status === 'completed').length
    const highRiskInvoiceIds = new Set(
      projectAnomalies.filter((a) => a.level === 'high').map((a) => a.invoiceId)
    )
    const failCount = projectFindings.filter(
      (f) => f.suggestion && highRiskInvoiceIds.has(f.invoiceId)
    ).length
    const pendingCount = projectFindings.length - passCount - failCount
    return { pass: passCount, fail: failCount, pending: pendingCount, total: projectFindings.length }
  }, [projectFindings, projectAnomalies])

  const clientName = currentProject?.clientName || '未选择项目'
  const periodLabel = currentProject
    ? `${currentProject.periodStart?.slice(0, 10) || ''} ~ ${currentProject.periodEnd?.slice(0, 10) || ''}`
    : '未选择期间'
  const period = currentProject
    ? `${currentProject.periodStart || ''}_${currentProject.periodEnd || ''}`
    : '未选择期间'

  const annotatedInvoices = useMemo(() => {
    const annotationInvoiceIds = new Set(annotations.map((a) => a.invoiceId))
    return projectInvoices.filter((inv) => annotationInvoiceIds.has(inv.id))
  }, [annotations, projectInvoices])

  const handleExportByType = useCallback(
    async (type: ExportType) => {
      switch (type) {
        case 'finding_csv':
          exportFindingsCSV(projectFindings, annotations, clientName, period)
          break
        case 'finding_json':
          exportFindingsJSON(projectFindings, annotations, clientName, period)
          break
        case 'review_pdf':
          printReviewChecklist(currentProject, projectFindings, projectInvoices)
          break
        case 'annotated_image': {
          if (selectedInvoiceId) {
            const invoice = projectInvoices.find((inv) => inv.id === selectedInvoiceId)
            if (invoice) {
              const invoiceAnnotations = annotations.filter((a) => a.invoiceId === invoice.id)
              await exportAnnotatedImage(
                invoice.imageUrl,
                invoiceAnnotations,
                projectFindings,
                invoice.voucherNo
              )
            }
          } else {
            for (const invoice of annotatedInvoices) {
              const invoiceAnnotations = annotations.filter((a) => a.invoiceId === invoice.id)
              await exportAnnotatedImage(
                invoice.imageUrl,
                invoiceAnnotations,
                projectFindings,
                invoice.voucherNo
              )
            }
          }
          break
        }
        case 'full_package':
          exportFindingsCSV(projectFindings, annotations, clientName, period)
          exportFindingsJSON(projectFindings, annotations, clientName, period)
          for (const invoice of annotatedInvoices) {
            const invoiceAnnotations = annotations.filter((a) => a.invoiceId === invoice.id)
            await exportAnnotatedImage(
              invoice.imageUrl,
              invoiceAnnotations,
              projectFindings,
              invoice.voucherNo
            )
          }
          break
      }
    },
    [
      projectFindings,
      annotations,
      clientName,
      period,
      currentProject,
      projectInvoices,
      selectedInvoiceId,
      annotatedInvoices,
    ]
  )

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

  const updateConclusion = useCallback(
    (nodeId: string, conclusion: ReviewConclusion) => {
      const finding = projectFindings.find((f) => f.id === nodeId)
      if (!finding) return

      if (conclusion === 'pass') {
        setFindingSuggestion(finding.id, {
          type: finding.suggestion?.type || 'confirmation',
          content: finding.suggestion?.content || '',
          responsible: finding.suggestion?.responsible || finding.createBy,
          deadline: finding.suggestion?.deadline,
          status: 'completed',
        })
      } else if (conclusion === 'fail') {
        setFindingSuggestion(finding.id, {
          type: finding.suggestion?.type || 'adjustment',
          content: finding.suggestion?.content || '',
          responsible: finding.suggestion?.responsible || finding.createBy,
          deadline: finding.suggestion?.deadline,
          status: 'in_progress',
        })
      } else {
        if (finding.suggestion) {
          updateFinding(finding.id, {
            suggestion: { ...finding.suggestion, status: 'pending' },
          })
        }
      }
    },
    [projectFindings, setFindingSuggestion, updateFinding]
  )

  const updateRemark = useCallback(
    (nodeId: string, remark: string) => {
      const finding = projectFindings.find((f) => f.id === nodeId)
      if (!finding) return

      setFindingSuggestion(finding.id, {
        type: finding.suggestion?.type || 'note',
        content: remark,
        responsible: finding.suggestion?.responsible || finding.createBy,
        deadline: finding.suggestion?.deadline,
        status: finding.suggestion?.status || 'pending',
      })
    },
    [projectFindings, setFindingSuggestion]
  )

  const openSignModal = useCallback((nodeId: string) => {
    setSigningItemId(nodeId)
    setSignatureInput('')
    setShowSignatureModal(true)
  }, [])

  const confirmSign = useCallback(() => {
    if (!signingItemId || !signatureInput.trim()) return
    const finding = projectFindings.find((f) => f.id === signingItemId)
    if (finding) {
      setFindingSuggestion(finding.id, {
        type: finding.suggestion?.type || 'confirmation',
        content: finding.suggestion?.content || '',
        responsible: signatureInput.trim(),
        deadline: finding.suggestion?.deadline,
        status: finding.suggestion?.status || 'pending',
      })
    }
    setShowSignatureModal(false)
    setSigningItemId(null)
  }, [signingItemId, signatureInput, projectFindings, setFindingSuggestion])

  const startExport = useCallback(
    async (taskId: string) => {
      const task = exportTasks.find((t) => t.id === taskId)
      if (!task) return

      setExportTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'running', progress: 0 } : t))
      )

      await handleExportByType(task.type)

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
          const t = prev.find((task) => task.id === taskId)
          if (!t || t.status !== 'running' || t.progress >= 95) {
            clearInterval(interval)
            if (t && t.status === 'running') {
              return prev.map((task) =>
                task.id === taskId ? { ...task, progress: 100, status: 'completed' } : task
              )
            }
            return prev
          }
          tick()
          return prev
        })
      }, 350)
    },
    [exportTasks, handleExportByType]
  )

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

  const renderEmptyState = (message: string, subMessage?: string) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <Inbox className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </h3>
      {subMessage && (
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          {subMessage}
        </p>
      )}
    </div>
  )

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

      {projectFindings.length === 0 ? (
        renderEmptyState('暂无复核项', '请先在发票详情中创建疑点，系统将自动生成复核清单')
      ) : (
        <div className="space-y-0.5">{filteredReviewTree.flatMap((n) => renderReviewNode(n))}</div>
      )}
    </div>
  )

  const renderDashboardTab = () => (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {clientName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {periodLabel}
            </span>
          </div>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: 'var(--color-bg-navy)',
            color: 'var(--color-text-inverse)',
          }}
        >
          数据更新于 {new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {projectAnomalies.length === 0 && projectFindings.length === 0 ? (
        renderEmptyState('暂无统计数据', '请先上传发票并进行异常检测，统计数据将自动生成')
      ) : (
        <>
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

          {projectAnomalies.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-secondary)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: 'var(--color-text-navy)' }} />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    异常类型 × 月度异常密度热力图
                  </h3>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                  单位：项
                </span>
              </div>
              <div className="p-4">
                <DensityHeatmap data={heatmapData} height={380} categories={heatmapCategories} months={MONTH_LABELS} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {projectAnomalies.length > 0 && (
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
                  <AnomalyPieChart data={pieData} height={340} />
                </div>
              </div>
            )}

            {projectAnomalies.length > 0 && (
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
                  <TrendLineChart data={trendData} height={340} />
                </div>
              </div>
            )}

            {projectAnomalies.length === 0 && projectFindings.length > 0 && (
              <div className="lg:col-span-5">
                {renderEmptyState('暂无异常数据', '发票异常检测结果将在此展示')}
              </div>
            )}
          </div>
        </>
      )}
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

          const displayName =
            task.type === 'finding_csv'
              ? `疑点摘要 (CSV) · ${projectFindings.length}条`
              : task.type === 'finding_json'
              ? `疑点摘要 (JSON) · ${projectFindings.length}条`
              : task.type === 'annotated_image'
              ? `带标注影像包 · ${annotatedInvoices.length}张`
              : task.name

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
                          {displayName}
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
                            onClick={() => handleExportByType(task.type)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-white transition-all hover:opacity-90"
                            style={{ background: 'var(--color-gradient-green)' }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </button>
                          {task.type === 'review_pdf' && (
                            <button
                              onClick={() => printReviewChecklist(currentProject, projectFindings, projectInvoices)}
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
              通过 {bottomBarStats.pass}
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-audit-red/10 text-audit-red border border-audit-red/30"
            >
              <XCircle className="w-3 h-3" />
              不通过 {bottomBarStats.fail}
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            >
              <Clock className="w-3 h-3" />
              待复核 {bottomBarStats.pending}
            </div>
          </div>
          <div style={{ color: 'var(--color-text-tertiary)' }} className="hidden sm:block">
            <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            {clientName} · {periodLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportByType('finding_csv')}
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
            onClick={() => handleExportByType('review_pdf')}
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
                    {clientName}
                  </div>
                  <div style={{ color: 'var(--color-text-tertiary)' }}>
                    审计期间：{periodLabel}
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
