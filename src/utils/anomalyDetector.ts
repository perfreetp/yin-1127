export interface InvoiceRecord {
  id: string
  invoiceCode: string
  invoiceNumber: string
  invoiceDate: string | Date
  sellerName: string
  sellerTaxId: string
  buyerName: string
  buyerTaxId: string
  totalAmount: number
  taxAmount: number
  amountWithoutTax: number
  status?: 'pending' | 'matched' | 'mismatch' | 'review'
  category?: string
  department?: string
  voucherNumber?: string
  entryDate?: string | Date
}

export interface LedgerRecord {
  id: string
  voucherNumber: string
  invoiceCode?: string
  invoiceNumber?: string
  entryDate: string | Date
  amount: number
  taxAmount?: number
  amountWithoutTax?: number
  sellerName?: string
  sellerTaxId?: string
  category: string
  department: string
  description?: string
  matchedInvoiceId?: string
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'
export type AnomalyType =
  | 'consecutive_numbers'
  | 'weekend_invoice'
  | 'holiday_invoice'
  | 'duplicate_entry'
  | 'amount_mismatch'
  | 'unmatched_invoice'
  | 'unmatched_ledger'
  | 'missing_field'
  | 'amount_outlier'
  | 'high_round_amount'
  | 'same_day_seller_high_count'
  | 'abnormal_tax_rate'
  | 'cross_month_entry'
  | 'large_amount'
  | 'sequence_gap'

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  title: string
  description: string
  affectedRecords: string[]
  relatedRecords?: string[]
  suggestions: string[]
  metadata?: Record<string, unknown>
  detectedAt: string
}

export interface DetectionConfig {
  consecutiveThreshold?: number
  weekendEnabled?: boolean
  holidayDates?: string[]
  duplicateFields?: (keyof InvoiceRecord)[]
  amountTolerancePercent?: number
  amountToleranceAbsolute?: number
  outlierStdDeviations?: number
  highRoundThreshold?: number
  sameDaySellerThreshold?: number
  taxRates?: number[]
  largeAmountThreshold?: number
}

const DEFAULT_CONFIG: Required<Omit<DetectionConfig, 'holidayDates'>> & { holidayDates: string[] } = {
  consecutiveThreshold: 3,
  weekendEnabled: true,
  holidayDates: [],
  duplicateFields: ['invoiceCode', 'invoiceNumber'],
  amountTolerancePercent: 0.5,
  amountToleranceAbsolute: 0.01,
  outlierStdDeviations: 2,
  highRoundThreshold: 10000,
  sameDaySellerThreshold: 5,
  taxRates: [0.03, 0.06, 0.09, 0.13],
  largeAmountThreshold: 100000,
}

function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date
  const cleaned = date.replace(/[年月日]/g, '-').replace(/\./g, '-').replace(/\/|年/g, '-').replace(/-+/g, '-')
  const parts = cleaned.split('-').filter(Boolean)
  if (parts.length >= 3) {
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    )
  }
  return new Date(date)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function generateAnomalyId(): string {
  return `anom_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function parseAmount(str: string): number {
  if (typeof str === 'number') return str
  return parseFloat(str.replace(/[¥￥,\s]/g, '')) || 0
}

export function extractInvoiceKey(record: InvoiceRecord | { invoiceCode: string; invoiceNumber: string }): string {
  return `${record.invoiceCode}-${record.invoiceNumber}`
}

export class AnomalyDetector {
  private config: Required<Omit<DetectionConfig, 'holidayDates'>> & { holidayDates: string[] }

  constructor(config?: DetectionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...(config || {}) }
  }

  detectAll(
    invoices: InvoiceRecord[],
    ledgers: LedgerRecord[],
    types?: AnomalyType[],
  ): Anomaly[] {
    const anomalies: Anomaly[] = []

    const shouldDetect = (t: AnomalyType) => !types || types.includes(t)

    if (shouldDetect('consecutive_numbers')) {
      anomalies.push(...this.detectConsecutiveNumbers(invoices))
    }
    if (shouldDetect('sequence_gap')) {
      anomalies.push(...this.detectSequenceGaps(invoices))
    }
    if (shouldDetect('weekend_invoice')) {
      anomalies.push(...this.detectWeekendInvoices(invoices))
    }
    if (shouldDetect('holiday_invoice')) {
      anomalies.push(...this.detectHolidayInvoices(invoices))
    }
    if (shouldDetect('duplicate_entry')) {
      anomalies.push(...this.detectDuplicateEntries(invoices))
    }
    if (shouldDetect('amount_mismatch') || shouldDetect('unmatched_invoice') || shouldDetect('unmatched_ledger')) {
      anomalies.push(...this.detectThreeWayMatch(invoices, ledgers))
    }
    if (shouldDetect('missing_field')) {
      anomalies.push(...this.detectMissingFields(invoices))
    }
    if (shouldDetect('amount_outlier')) {
      anomalies.push(...this.detectAmountOutliers(invoices))
    }
    if (shouldDetect('high_round_amount')) {
      anomalies.push(...this.detectHighRoundAmounts(invoices))
    }
    if (shouldDetect('same_day_seller_high_count')) {
      anomalies.push(...this.detectSameDaySellerHighCount(invoices))
    }
    if (shouldDetect('abnormal_tax_rate')) {
      anomalies.push(...this.detectAbnormalTaxRates(invoices))
    }
    if (shouldDetect('cross_month_entry')) {
      anomalies.push(...this.detectCrossMonthEntry(invoices, ledgers))
    }
    if (shouldDetect('large_amount')) {
      anomalies.push(...this.detectLargeAmounts(invoices))
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }

  detectConsecutiveNumbers(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const bySeller = new Map<string, InvoiceRecord[]>()

    for (const inv of invoices) {
      const key = inv.sellerTaxId || inv.sellerName
      if (!bySeller.has(key)) bySeller.set(key, [])
      bySeller.get(key)!.push(inv)
    }

    for (const [sellerKey, sellerInvoices] of bySeller) {
      const sorted = [...sellerInvoices].sort((a, b) => {
        const aNum = parseInt(a.invoiceNumber) || 0
        const bNum = parseInt(b.invoiceNumber) || 0
        if (aNum !== bNum) return aNum - bNum
        return a.invoiceCode.localeCompare(b.invoiceCode)
      })

      let i = 0
      while (i < sorted.length - 1) {
        let group = [sorted[i]]
        let j = i + 1
        while (j < sorted.length) {
          const prev = group[group.length - 1]
          const curr = sorted[j]
          if (prev.invoiceCode === curr.invoiceCode) {
            const prevNum = parseInt(prev.invoiceNumber)
            const currNum = parseInt(curr.invoiceNumber)
            if (!isNaN(prevNum) && !isNaN(currNum) && currNum - prevNum === 1) {
              group.push(curr)
              j++
              continue
            }
          }
          break
        }
        if (group.length >= this.config.consecutiveThreshold) {
          const first = group[0]
          const last = group[group.length - 1]
          anomalies.push({
            id: generateAnomalyId(),
            type: 'consecutive_numbers',
            severity: group.length >= 5 ? 'high' : group.length >= 4 ? 'medium' : 'low',
            title: `发现${group.length}张连号发票`,
            description: `销售方「${first.sellerName}」开具了${group.length}张连号发票（号码段：${first.invoiceNumber} - ${last.invoiceNumber}），开票日期：${group.map((inv) => formatDateKey(parseDate(inv.invoiceDate))).join(', ')}`,
            affectedRecords: group.map((inv) => inv.id),
            suggestions: [
              '核实业务发生的真实性',
              '检查是否存在拆分开票以规避审批阈值的情况',
              '确认合同、订单与发票的对应关系',
            ],
            metadata: {
              seller: first.sellerName,
              sellerTaxId: first.sellerTaxId,
              rangeStart: first.invoiceNumber,
              rangeEnd: last.invoiceNumber,
              invoiceCode: first.invoiceCode,
              count: group.length,
              totalAmount: group.reduce((sum, inv) => sum + inv.totalAmount, 0),
            },
            detectedAt: new Date().toISOString(),
          })
        }
        i = j > i + 1 ? j : i + 1
      }
    }

    return anomalies
  }

  detectSequenceGaps(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const byCodeSeller = new Map<string, InvoiceRecord[]>()

    for (const inv of invoices) {
      const key = `${inv.invoiceCode}|${inv.sellerTaxId || inv.sellerName}`
      if (!byCodeSeller.has(key)) byCodeSeller.set(key, [])
      byCodeSeller.get(key)!.push(inv)
    }

    for (const [, codeInvoices] of byCodeSeller) {
      if (codeInvoices.length < 3) continue

      const sorted = [...codeInvoices].sort((a, b) => {
        return (parseInt(a.invoiceNumber) || 0) - (parseInt(b.invoiceNumber) || 0)
      })

      for (let i = 0; i < sorted.length - 1; i++) {
        const currNum = parseInt(sorted[i].invoiceNumber)
        const nextNum = parseInt(sorted[i + 1].invoiceNumber)
        if (!isNaN(currNum) && !isNaN(nextNum) && nextNum - currNum > 2 && nextNum - currNum < 20) {
          const gapSize = nextNum - currNum - 1
          anomalies.push({
            id: generateAnomalyId(),
            type: 'sequence_gap',
            severity: 'low',
            title: `发票号码出现断号`,
            description: `销售方「${sorted[i].sellerName}」的发票代码 ${sorted[i].invoiceCode} 下，号码 ${sorted[i].invoiceNumber} 到 ${sorted[i + 1].invoiceNumber} 之间存在 ${gapSize} 张断号发票`,
            affectedRecords: [sorted[i].id, sorted[i + 1].id],
            suggestions: [
              '确认缺失的发票是否已作废',
              '核实断号发票是否未入账',
              '检查发票领购记录确认号码连续性',
            ],
            metadata: {
              invoiceCode: sorted[i].invoiceCode,
              gapStart: sorted[i].invoiceNumber,
              gapEnd: sorted[i + 1].invoiceNumber,
              gapSize,
            },
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    return anomalies
  }

  detectWeekendInvoices(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    if (!this.config.weekendEnabled) return anomalies

    for (const inv of invoices) {
      const date = parseDate(inv.invoiceDate)
      if (isNaN(date.getTime())) continue
      if (isWeekend(date)) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'weekend_invoice',
          severity: 'medium',
          title: `周末开票：${formatDateKey(date)}`,
          description: `发票号码 ${inv.invoiceNumber} 的开票日期为 ${formatDateKey(date)}（${date.getDay() === 0 ? '周日' : '周六'}），金额：¥${formatNumber(inv.totalAmount)}`,
          affectedRecords: [inv.id],
          suggestions: [
            '核实业务是否真实发生在周末',
            '确认开票系统日期是否正确',
            '检查是否存在提前或延迟开票情况',
          ],
          metadata: {
            invoiceDate: formatDateKey(date),
            weekday: date.getDay(),
            amount: inv.totalAmount,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectHolidayInvoices(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    if (this.config.holidayDates.length === 0) return anomalies
    const holidaySet = new Set(this.config.holidayDates)

    for (const inv of invoices) {
      const date = parseDate(inv.invoiceDate)
      if (isNaN(date.getTime())) continue
      const dateKey = formatDateKey(date)
      if (holidaySet.has(dateKey)) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'holiday_invoice',
          severity: 'high',
          title: `节假日开票：${dateKey}`,
          description: `发票号码 ${inv.invoiceNumber} 的开票日期为法定节假日 ${dateKey}，金额：¥${formatNumber(inv.totalAmount)}`,
          affectedRecords: [inv.id],
          suggestions: [
            '核实业务真实性，节假日一般不发生大额经营活动',
            '检查是否存在提前开票虚增收入的情况',
            '确认开票方节假日是否正常营业',
          ],
          metadata: {
            invoiceDate: dateKey,
            amount: inv.totalAmount,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectDuplicateEntries(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const seen = new Map<string, InvoiceRecord[]>()

    for (const inv of invoices) {
      const keyParts = this.config.duplicateFields.map((f) => String(inv[f] || ''))
      const key = keyParts.join('|')
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push(inv)
    }

    for (const [, duplicates] of seen) {
      if (duplicates.length > 1) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'duplicate_entry',
          severity: 'critical',
          title: `发现重复入账的发票（${duplicates.length}次）`,
          description: `发票代码 ${duplicates[0].invoiceCode}、号码 ${duplicates[0].invoiceNumber} 被重复入账 ${duplicates.length} 次，涉及金额累计：¥${formatNumber(duplicates.reduce((s, inv) => s + inv.totalAmount, 0))}`,
          affectedRecords: duplicates.map((inv) => inv.id),
          suggestions: [
            '立即核实是否存在重复报销/入账',
            '冲销重复的入账凭证',
            '检查审批流程是否存在漏洞',
          ],
          metadata: {
            invoiceCode: duplicates[0].invoiceCode,
            invoiceNumber: duplicates[0].invoiceNumber,
            count: duplicates.length,
            entries: duplicates.map((inv) => ({
              id: inv.id,
              voucherNumber: inv.voucherNumber,
              entryDate: inv.entryDate,
              amount: inv.totalAmount,
            })),
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectThreeWayMatch(invoices: InvoiceRecord[], ledgers: LedgerRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const invoiceMap = new Map<string, InvoiceRecord>()
    const ledgerMap = new Map<string, LedgerRecord[]>()

    for (const inv of invoices) {
      invoiceMap.set(extractInvoiceKey(inv), inv)
    }

    for (const ledger of ledgers) {
      if (ledger.invoiceCode && ledger.invoiceNumber) {
        const key = `${ledger.invoiceCode}-${ledger.invoiceNumber}`
        if (!ledgerMap.has(key)) ledgerMap.set(key, [])
        ledgerMap.get(key)!.push(ledger)
      }
    }

    const matchedInvoices = new Set<string>()

    for (const [key, invoice] of invoiceMap) {
      const matchingLedgers = ledgerMap.get(key) || []

      if (matchingLedgers.length === 0) {
        const matchedByVoucher = ledgers.filter(
          (l) => invoice.voucherNumber && l.voucherNumber === invoice.voucherNumber,
        )
        if (matchedByVoucher.length === 0) {
          anomalies.push({
            id: generateAnomalyId(),
            type: 'unmatched_invoice',
            severity: 'high',
            title: `发票未入账：${invoice.invoiceNumber}`,
            description: `发票代码 ${invoice.invoiceCode}、号码 ${invoice.invoiceNumber}（金额 ¥${formatNumber(invoice.totalAmount)}）未在账簿中找到对应的入账记录`,
            affectedRecords: [invoice.id],
            suggestions: [
              '核实该发票是否已实际入账但信息不匹配',
              '检查是否存在账外资产或小金库风险',
              '确认发票是否为作废或红冲发票',
            ],
            metadata: {
              invoiceCode: invoice.invoiceCode,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.totalAmount,
            },
            detectedAt: new Date().toISOString(),
          })
        } else {
          matchedInvoices.add(key)
          for (const ledger of matchedByVoucher) {
            this.checkAmountMismatch(anomalies, invoice, ledger)
          }
        }
      } else {
        matchedInvoices.add(key)
        for (const ledger of matchingLedgers) {
          this.checkAmountMismatch(anomalies, invoice, ledger)
        }
      }
    }

    for (const [key, ledgerEntries] of ledgerMap) {
      if (!invoiceMap.has(key)) {
        for (const ledger of ledgerEntries) {
          anomalies.push({
            id: generateAnomalyId(),
            type: 'unmatched_ledger',
            severity: 'high',
            title: `入账凭证缺少对应发票：${ledger.voucherNumber}`,
            description: `账簿凭证 ${ledger.voucherNumber}（金额 ¥${formatNumber(ledger.amount)}，${formatDateKey(parseDate(ledger.entryDate))}）所关联的发票（代码 ${ledger.invoiceCode}、号码 ${ledger.invoiceNumber}）未找到`,
            affectedRecords: [ledger.id],
            suggestions: [
              '核实发票是否遗失或未上传',
              '检查是否存在无票入账情况',
              '确认该笔支出的真实性和合规性',
            ],
            metadata: {
              voucherNumber: ledger.voucherNumber,
              invoiceCode: ledger.invoiceCode,
              invoiceNumber: ledger.invoiceNumber,
              amount: ledger.amount,
            },
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    return anomalies
  }

  private checkAmountMismatch(
    anomalies: Anomaly[],
    invoice: InvoiceRecord,
    ledger: LedgerRecord,
  ): void {
    const percentDiff = Math.abs((invoice.totalAmount - ledger.amount) / invoice.totalAmount) * 100
    const absoluteDiff = Math.abs(invoice.totalAmount - ledger.amount)

    if (
      percentDiff > this.config.amountTolerancePercent &&
      absoluteDiff > this.config.amountToleranceAbsolute
    ) {
      anomalies.push({
        id: generateAnomalyId(),
        type: 'amount_mismatch',
        severity: absoluteDiff > 1000 ? 'high' : 'medium',
        title: `发票与入账金额不一致`,
        description: `发票 ${invoice.invoiceNumber} 金额 ¥${formatNumber(invoice.totalAmount)} 与账簿凭证 ${ledger.voucherNumber} 金额 ¥${formatNumber(ledger.amount)} 不一致，差异额：¥${formatNumber(absoluteDiff)}（${percentDiff.toFixed(2)}%）`,
        affectedRecords: [invoice.id, ledger.id],
        suggestions: [
          '核实差异原因，是部分入账还是记账错误',
          '检查是否存在分摊记账情况',
          '确认原始凭证与记账凭证是否一致',
        ],
        metadata: {
          invoiceAmount: invoice.totalAmount,
          ledgerAmount: ledger.amount,
          absoluteDiff,
          percentDiff: percentDiff.toFixed(2),
          invoiceCode: invoice.invoiceCode,
          invoiceNumber: invoice.invoiceNumber,
          voucherNumber: ledger.voucherNumber,
        },
        detectedAt: new Date().toISOString(),
      })
    }

    if (invoice.taxAmount && ledger.taxAmount) {
      const taxDiff = Math.abs(invoice.taxAmount - ledger.taxAmount)
      if (taxDiff > 1) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'amount_mismatch',
          severity: taxDiff > 100 ? 'medium' : 'low',
          title: `税额差异`,
          description: `发票 ${invoice.invoiceNumber} 与凭证 ${ledger.voucherNumber} 的税额不一致，差异 ¥${formatNumber(taxDiff)}`,
          affectedRecords: [invoice.id, ledger.id],
          suggestions: ['核对发票票面税额与入账税额', '检查是否存在进项税额转出'],
          metadata: {
            invoiceTax: invoice.taxAmount,
            ledgerTax: ledger.taxAmount,
            taxDiff,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  detectMissingFields(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const requiredFields: { key: keyof InvoiceRecord; label: string }[] = [
      { key: 'invoiceCode', label: '发票代码' },
      { key: 'invoiceNumber', label: '发票号码' },
      { key: 'invoiceDate', label: '开票日期' },
      { key: 'sellerName', label: '销售方名称' },
      { key: 'sellerTaxId', label: '销售方税号' },
      { key: 'buyerName', label: '购买方名称' },
      { key: 'buyerTaxId', label: '购买方税号' },
      { key: 'totalAmount', label: '价税合计' },
    ]

    for (const inv of invoices) {
      const missing: string[] = []
      for (const field of requiredFields) {
        const val = inv[field.key]
        if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
          missing.push(field.label)
        }
      }
      if (inv.sellerTaxId && inv.sellerTaxId.length < 15) missing.push('销售方税号长度不足')
      if (inv.buyerTaxId && inv.buyerTaxId.length < 15) missing.push('购买方税号长度不足')

      if (missing.length > 0) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'missing_field',
          severity: missing.length >= 3 ? 'high' : missing.length >= 2 ? 'medium' : 'low',
          title: `发票信息不完整（${missing.length}项缺失）`,
          description: `发票号码 ${inv.invoiceNumber || '未知'} 缺少以下字段：${missing.join('、')}`,
          affectedRecords: [inv.id],
          suggestions: ['补充缺失的发票信息', '检查OCR识别结果是否准确', '核实原始发票票面信息'],
          metadata: {
            invoiceCode: inv.invoiceCode,
            invoiceNumber: inv.invoiceNumber,
            missingFields: missing,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectAmountOutliers(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    if (invoices.length < 5) return anomalies

    const bySeller = new Map<string, InvoiceRecord[]>()
    for (const inv of invoices) {
      const key = inv.sellerTaxId || inv.sellerName
      if (!bySeller.has(key)) bySeller.set(key, [])
      bySeller.get(key)!.push(inv)
    }

    for (const [, sellerInvoices] of bySeller) {
      if (sellerInvoices.length < 5) continue
      const amounts = sellerInvoices.map((inv) => inv.totalAmount)
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
      const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length
      const std = Math.sqrt(variance)

      if (std === 0) continue

      for (const inv of sellerInvoices) {
        const zScore = Math.abs((inv.totalAmount - mean) / std)
        if (zScore >= this.config.outlierStdDeviations) {
          anomalies.push({
            id: generateAnomalyId(),
            type: 'amount_outlier',
            severity: zScore >= 3 ? 'high' : 'medium',
            title: `金额异常：偏离均值 ${zScore.toFixed(1)}σ`,
            description: `发票 ${inv.invoiceNumber} 金额 ¥${formatNumber(inv.totalAmount)} 显著偏离销售方「${inv.sellerName}」同期平均水平（均值 ¥${formatNumber(mean)}，标准差 ¥${formatNumber(std)}）`,
            affectedRecords: [inv.id],
            suggestions: ['核实该笔大额/小额交易的真实性', '检查是否存在误记账', '与合同或订单金额进行比对'],
            metadata: {
              amount: inv.totalAmount,
              mean,
              std,
              zScore: zScore.toFixed(2),
              seller: inv.sellerName,
            },
            detectedAt: new Date().toISOString(),
          })
        }
      }
    }

    return anomalies
  }

  detectHighRoundAmounts(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []

    for (const inv of invoices) {
      if (inv.totalAmount < this.config.highRoundThreshold) continue

      const intPart = Math.floor(inv.totalAmount)
      const isRound = intPart % 10000 === 0 || intPart % 5000 === 0 || intPart % 1000 === 0

      if (isRound) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'high_round_amount',
          severity: inv.totalAmount >= this.config.highRoundThreshold * 10 ? 'high' : 'low',
          title: `高额度整数发票：¥${formatNumber(inv.totalAmount)}`,
          description: `发票 ${inv.invoiceNumber} 金额 ¥${formatNumber(inv.totalAmount)} 为大额整数，存在虚假开票风险`,
          affectedRecords: [inv.id],
          suggestions: ['核实该笔业务的合同、订单、物流等佐证材料', '确认资金流水是否对应', '与同期同类业务进行对比分析'],
          metadata: {
            amount: inv.totalAmount,
            seller: inv.sellerName,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectSameDaySellerHighCount(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const bySellerDate = new Map<string, InvoiceRecord[]>()

    for (const inv of invoices) {
      const dateKey = formatDateKey(parseDate(inv.invoiceDate))
      const key = `${inv.sellerTaxId || inv.sellerName}|${dateKey}`
      if (!bySellerDate.has(key)) bySellerDate.set(key, [])
      bySellerDate.get(key)!.push(inv)
    }

    for (const [, dayInvoices] of bySellerDate) {
      if (dayInvoices.length >= this.config.sameDaySellerThreshold) {
        const first = dayInvoices[0]
        anomalies.push({
          id: generateAnomalyId(),
          type: 'same_day_seller_high_count',
          severity: dayInvoices.length >= 10 ? 'high' : 'medium',
          title: `单日开票频次异常（${dayInvoices.length}张）`,
          description: `销售方「${first.sellerName}」在 ${formatDateKey(parseDate(first.invoiceDate))} 单日开具了 ${dayInvoices.length} 张发票，累计金额 ¥${formatNumber(dayInvoices.reduce((s, inv) => s + inv.totalAmount, 0))}`,
          affectedRecords: dayInvoices.map((inv) => inv.id),
          suggestions: ['核实该销售方是否为集中开票', '检查该日业务量是否与日常水平相符', '确认是否存在月末集中开票调节收入情况'],
          metadata: {
            seller: first.sellerName,
            date: formatDateKey(parseDate(first.invoiceDate)),
            count: dayInvoices.length,
            totalAmount: dayInvoices.reduce((s, inv) => s + inv.totalAmount, 0),
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectAbnormalTaxRates(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const validRates = new Set(this.config.taxRates.map((r) => Math.round(r * 100)))

    for (const inv of invoices) {
      if (!inv.amountWithoutTax || inv.amountWithoutTax <= 0) continue
      if (!inv.taxAmount && inv.taxAmount !== 0) continue

      const calculatedRate = (inv.taxAmount / inv.amountWithoutTax) * 100
      const roundedRate = Math.round(calculatedRate)

      if (!isNaN(calculatedRate) && !validRates.has(roundedRate) && calculatedRate > 0) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'abnormal_tax_rate',
          severity: 'medium',
          title: `异常税率：${calculatedRate.toFixed(2)}%`,
          description: `发票 ${inv.invoiceNumber} 计算税率为 ${calculatedRate.toFixed(2)}%，不在常见税率范围内（${this.config.taxRates.map((r) => (r * 100).toFixed(0) + '%').join('、')}）`,
          affectedRecords: [inv.id],
          suggestions: ['核实发票票面税率是否正确', '检查金额、税额计算是否一致', '确认是否适用特殊税收政策'],
          metadata: {
            invoiceNumber: inv.invoiceNumber,
            calculatedRate: calculatedRate.toFixed(2),
            amountWithoutTax: inv.amountWithoutTax,
            taxAmount: inv.taxAmount,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectCrossMonthEntry(invoices: InvoiceRecord[], ledgers: LedgerRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []

    for (const inv of invoices) {
      if (!inv.entryDate) continue
      const invDate = parseDate(inv.invoiceDate)
      const entryDate = parseDate(inv.entryDate)
      if (isNaN(invDate.getTime()) || isNaN(entryDate.getTime())) continue

      const invMonth = `${invDate.getFullYear()}-${invDate.getMonth()}`
      const entryMonth = `${entryDate.getFullYear()}-${entryDate.getMonth()}`

      if (invMonth !== entryMonth) {
        const daysDiff = Math.ceil((entryDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24))
        anomalies.push({
          id: generateAnomalyId(),
          type: 'cross_month_entry',
          severity: Math.abs(daysDiff) > 90 ? 'high' : Math.abs(daysDiff) > 30 ? 'medium' : 'low',
          title: `跨期入账（间隔 ${daysDiff} 天）`,
          description: `发票 ${inv.invoiceNumber} 开票日期 ${formatDateKey(invDate)}，入账日期 ${formatDateKey(entryDate)}，跨 ${Math.abs(daysDiff)} 天入账`,
          affectedRecords: [inv.id],
          suggestions: ['核实跨期入账的原因', '检查是否存在跨期调节利润风险', '确认是否违反权责发生制原则'],
          metadata: {
            invoiceDate: formatDateKey(invDate),
            entryDate: formatDateKey(entryDate),
            daysDifference: daysDiff,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    for (const ledger of ledgers) {
      if (!ledger.invoiceCode || !ledger.invoiceNumber) continue
      const inv = invoices.find(
        (i) => i.invoiceCode === ledger.invoiceCode && i.invoiceNumber === ledger.invoiceNumber,
      )
      if (!inv) continue
      const invDate = parseDate(inv.invoiceDate)
      const entryDate = parseDate(ledger.entryDate)
      if (isNaN(invDate.getTime()) || isNaN(entryDate.getTime())) continue

      const invMonth = `${invDate.getFullYear()}-${invDate.getMonth()}`
      const entryMonth = `${entryDate.getFullYear()}-${entryDate.getMonth()}`

      if (invMonth !== entryMonth) {
        const daysDiff = Math.ceil((entryDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24))
        anomalies.push({
          id: generateAnomalyId(),
          type: 'cross_month_entry',
          severity: Math.abs(daysDiff) > 90 ? 'high' : Math.abs(daysDiff) > 30 ? 'medium' : 'low',
          title: `凭证跨期入账（间隔 ${daysDiff} 天）`,
          description: `凭证 ${ledger.voucherNumber} 对应发票开票日期 ${formatDateKey(invDate)}，入账日期 ${formatDateKey(entryDate)}，跨 ${Math.abs(daysDiff)} 天入账`,
          affectedRecords: [ledger.id, inv.id],
          suggestions: ['核实跨期入账的原因', '检查是否存在跨期调节利润风险'],
          metadata: {
            invoiceDate: formatDateKey(invDate),
            entryDate: formatDateKey(entryDate),
            daysDifference: daysDiff,
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  detectLargeAmounts(invoices: InvoiceRecord[]): Anomaly[] {
    const anomalies: Anomaly[] = []
    const threshold = this.config.largeAmountThreshold

    for (const inv of invoices) {
      if (inv.totalAmount >= threshold) {
        anomalies.push({
          id: generateAnomalyId(),
          type: 'large_amount',
          severity: inv.totalAmount >= threshold * 5 ? 'high' : inv.totalAmount >= threshold * 2 ? 'medium' : 'low',
          title: `大额发票：¥${formatNumber(inv.totalAmount)}`,
          description: `发票 ${inv.invoiceNumber} 金额 ¥${formatNumber(inv.totalAmount)} 超过大额预警阈值 ¥${formatNumber(threshold)}`,
          affectedRecords: [inv.id],
          suggestions: ['要求提供完整的业务佐证材料（合同、验收单、物流单等）', '核实资金支付记录', '评估该交易的商业合理性'],
          metadata: {
            amount: inv.totalAmount,
            threshold,
            seller: inv.sellerName,
            invoiceDate: formatDateKey(parseDate(inv.invoiceDate)),
          },
          detectedAt: new Date().toISOString(),
        })
      }
    }

    return anomalies
  }

  static groupAnomalies(anomalies: Anomaly[]): {
    byType: Map<AnomalyType, Anomaly[]>
    bySeverity: Map<AnomalySeverity, Anomaly[]>
    stats: Record<AnomalySeverity, number>
  } {
    const byType = new Map<AnomalyType, Anomaly[]>()
    const bySeverity = new Map<AnomalySeverity, Anomaly[]>()
    const stats = { critical: 0, high: 0, medium: 0, low: 0 }

    for (const anomaly of anomalies) {
      if (!byType.has(anomaly.type)) byType.set(anomaly.type, [])
      byType.get(anomaly.type)!.push(anomaly)

      if (!bySeverity.has(anomaly.severity)) bySeverity.set(anomaly.severity, [])
      bySeverity.get(anomaly.severity)!.push(anomaly)

      stats[anomaly.severity]++
    }

    return { byType, bySeverity, stats }
  }
}

export function quickDetect(
  invoices: InvoiceRecord[],
  ledgers?: LedgerRecord[],
  config?: DetectionConfig,
): Anomaly[] {
  const detector = new AnomalyDetector(config)
  return detector.detectAll(invoices, ledgers || [])
}

export { parseDate, formatDateKey, formatNumber, parseAmount }
