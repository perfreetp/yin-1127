import type {
  AuditFinding,
  InvoiceAnnotation,
  Invoice,
  Project,
  AssertionType,
} from '@/types'
import { useFindingStore } from '@/store/findingStore'
import { useInvoiceStore } from '@/store/invoiceStore'
import { useProjectStore } from '@/store/projectStore'

const ASSERTION_LABELS: Record<AssertionType, string> = {
  existence: '存在性',
  completeness: '完整性',
  accuracy: '准确性',
  cutoff: '截止性',
  classification: '分类',
}

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  confirmation: '确认',
  supplement: '补充',
  adjustment: '调整',
  note: '备注',
}

const SUGGESTION_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getRelatedAnnotations(
  finding: AuditFinding,
  annotations: InvoiceAnnotation[]
): InvoiceAnnotation[] {
  return annotations.filter((a) => finding.annotationIds.includes(a.id))
}

export function exportFindingsCSV(
  findings: AuditFinding[],
  annotations: InvoiceAnnotation[],
  clientName: string = '未知客户',
  period: string = '未知期间'
): void {
  const BOM = '\uFEFF'
  const headers = [
    '疑点ID',
    '票据ID',
    '标题',
    '描述',
    '断言标签',
    '关联标注',
    '建议类型',
    '建议内容',
    '建议状态',
    '创建时间',
  ]

  const escapeCSV = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const rows = findings.map((f) => {
    const related = getRelatedAnnotations(f, annotations)
    const assertionLabel = f.assertions.map((a) => ASSERTION_LABELS[a]).join(';')
    const annotationLabel = related.map((a) => a.label).join(';')
    return [
      escapeCSV(f.id),
      escapeCSV(f.invoiceId),
      escapeCSV(f.title),
      escapeCSV(f.description),
      escapeCSV(assertionLabel),
      escapeCSV(annotationLabel),
      escapeCSV(f.suggestion ? SUGGESTION_TYPE_LABELS[f.suggestion.type] || f.suggestion.type : ''),
      escapeCSV(f.suggestion?.content || ''),
      escapeCSV(f.suggestion ? SUGGESTION_STATUS_LABELS[f.suggestion.status] || f.suggestion.status : ''),
      escapeCSV(f.createTime),
    ].join(',')
  })

  const csvContent = BOM + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const fileName = sanitizeFileName(`疑点摘要_${clientName}_${period}.csv`)
  downloadBlob(blob, fileName)
}

export function exportFindingsJSON(
  findings: AuditFinding[],
  annotations: InvoiceAnnotation[],
  clientName: string = '未知客户',
  period: string = '未知期间'
): void {
  const data = {
    exportTime: new Date().toISOString(),
    clientName,
    period,
    findings: findings.map((f) => ({
      ...f,
      relatedAnnotations: getRelatedAnnotations(f, annotations),
    })),
    annotations,
  }

  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
  const fileName = sanitizeFileName(`疑点摘要_${clientName}_${period}.json`)
  downloadBlob(blob, fileName)
}

export function printReviewChecklist(
  project: Project | null,
  findings: AuditFinding[],
  invoices: Invoice[]
): void {
  const clientName = project?.clientName || '未知客户'
  const period = project ? `${project.periodStart} ~ ${project.periodEnd}` : '未知期间'
  const projectCode = project?.projectCode || '-'
  const auditor = project?.auditor || '-'
  const now = new Date()
  const printTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const tableRows = findings.map((f, idx) => {
    const assertionLabel = f.assertions.map((a) => ASSERTION_LABELS[a]).join('、')
    const suggestionContent = f.suggestion?.content || '-'
    return `<tr>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${idx + 1}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${f.title}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${f.description}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${assertionLabel || '-'}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;">${suggestionContent}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${f.invoiceId}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>审计复核清单 - ${clientName}</title>
  <style>
    body { font-family: "Microsoft YaHei", "SimSun", sans-serif; margin: 30px; color: #1e3a5f; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 6px 10px; font-size: 13px; border: 1px solid #e0e0e0; }
    .info-label { background: #f5f7fa; font-weight: 600; width: 120px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1e3a5f; color: #fff; padding: 8px; text-align: center; border: 1px solid #1e3a5f; }
    .sign-area { margin-top: 40px; }
    .sign-area table { border: none; }
    .sign-area td { border: none; padding: 12px 20px; font-size: 13px; vertical-align: bottom; }
    .sign-line { display: inline-block; width: 160px; border-bottom: 1px solid #333; margin-left: 8px; }
    @media print { body { margin: 15px; } }
  </style>
</head>
<body>
  <h1>审计复核清单</h1>
  <div class="subtitle">打印时间：${printTime}</div>
  <table class="info-table">
    <tr>
      <td class="info-label">客户名称</td>
      <td>${clientName}</td>
      <td class="info-label">项目编号</td>
      <td>${projectCode}</td>
    </tr>
    <tr>
      <td class="info-label">审计期间</td>
      <td>${period}</td>
      <td class="info-label">主审人员</td>
      <td>${auditor}</td>
    </tr>
    <tr>
      <td class="info-label">发票总数</td>
      <td>${invoices.length}</td>
      <td class="info-label">疑点总数</td>
      <td>${findings.length}</td>
    </tr>
  </table>
  <table>
    <thead>
      <tr>
        <th style="width:40px;">序号</th>
        <th>疑点标题</th>
        <th>描述</th>
        <th>断言标签</th>
        <th>建议内容</th>
        <th style="width:80px;">关联票据</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">暂无审计疑点</td></tr>'}
    </tbody>
  </table>
  <div class="sign-area">
    <table>
      <tr>
        <td>编制人：<span class="sign-line"></span></td>
        <td>日期：<span class="sign-line"></span></td>
      </tr>
      <tr>
        <td>复核人：<span class="sign-line"></span></td>
        <td>日期：<span class="sign-line"></span></td>
      </tr>
      <tr>
        <td>项目负责人：<span class="sign-line"></span></td>
        <td>日期：<span class="sign-line"></span></td>
      </tr>
    </table>
  </div>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow!.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.contentWindow!.onload = () => {
    iframe.contentWindow!.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }
}

export async function exportAnnotatedImage(
  imageUrl: string,
  annotations: InvoiceAnnotation[],
  findings: AuditFinding[],
  voucherNo: string = '未知'
): Promise<void> {
  const img = new Image()
  img.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = imageUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const scaleX = img.naturalWidth
  const scaleY = img.naturalHeight

  for (const ann of annotations) {
    const x = ann.x * scaleX
    const y = ann.y * scaleY
    const w = ann.width * scaleX
    const h = ann.height * scaleY

    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = Math.max(2, Math.round(scaleX * 0.003))
    ctx.strokeRect(x, y, w, h)

    const fontSize = Math.max(12, Math.round(scaleX * 0.014))
    ctx.font = `bold ${fontSize}px sans-serif`
    const textWidth = ctx.measureText(ann.label).width
    ctx.fillStyle = '#e74c3c'
    ctx.fillRect(x, y - fontSize - 6, textWidth + 10, fontSize + 6)
    ctx.fillStyle = '#fff'
    ctx.fillText(ann.label, x + 5, y - 6)
  }

  for (const f of findings) {
    const relatedAnns = annotations.filter((a) => f.annotationIds.includes(a.id))
    for (const ann of relatedAnns) {
      const cx = (ann.x + ann.width / 2) * scaleX
      const cy = (ann.y + ann.height / 2) * scaleY
      const radius = Math.max(14, Math.round(scaleX * 0.015))

      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(231, 76, 60, 0.75)'
      ctx.fill()

      const markSize = Math.max(10, Math.round(scaleX * 0.01))
      ctx.font = `bold ${markSize}px sans-serif`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', cx, cy)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (blob) {
    const fileName = sanitizeFileName(`标注影像_${voucherNo}.png`)
    downloadBlob(blob, fileName)
  }
}

export function triggerExportCSV(): void {
  const { findings, annotations } = useFindingStore.getState()
  const project = useProjectStore.getState().currentProject
  const clientName = project?.clientName || '未知客户'
  const period = project ? `${project.periodStart}~${project.periodEnd}` : '未知期间'
  exportFindingsCSV(findings, annotations, clientName, period)
}

export function triggerPrintReview(): void {
  const { findings } = useFindingStore.getState()
  const project = useProjectStore.getState().currentProject
  const invoices = useInvoiceStore.getState().invoices
  printReviewChecklist(project, findings, invoices)
}
