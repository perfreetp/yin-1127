import type { InvoiceRecord, LedgerRecord } from './anomalyDetector'

export interface MockInvoiceOptions {
  count?: number
  seed?: number
  includeAnomalies?: boolean
  dateRange?: { start: Date; end: Date }
  buyerName?: string
  buyerTaxId?: string
}

export interface MockLedgerOptions {
  count?: number
  seed?: number
  invoiceMatchRate?: number
  dateRange?: { start: Date; end: Date }
}

export interface MockDataset {
  invoices: InvoiceRecord[]
  ledgers: LedgerRecord[]
  summary: {
    totalInvoices: number
    totalLedgers: number
    expectedAnomalies: string[]
  }
}

const SELLERS = [
  { name: '北京科技有限公司', taxId: '91110108MA00789012' },
  { name: '上海贸易发展公司', taxId: '91310115MA1K345678' },
  { name: '广州电子科技股份有限公司', taxId: '91440106MA00901234' },
  { name: '深圳创新信息技术有限公司', taxId: '91440300MA5E567890' },
  { name: '杭州软件开发有限公司', taxId: '91330106MA27123456' },
  { name: '成都智能科技有限公司', taxId: '91510100MA61987654' },
  { name: '武汉商贸集团有限公司', taxId: '91420100MA4K098765' },
  { name: '南京数码科技有限公司', taxId: '91320100MA1X234567' },
  { name: '西安通信设备有限公司', taxId: '91610100MA6U890123' },
  { name: '重庆办公用品公司', taxId: '91500000MA5U456789' },
  { name: '天津物流运输有限公司', taxId: '91120000MA05135792' },
  { name: '苏州工业制造有限公司', taxId: '91320500MA1M246802' },
]

const DEFAULT_BUYER = {
  name: '国际审计咨询有限公司',
  taxId: '91110105MA00123456',
}

const CATEGORIES = [
  '办公用品', '差旅交通', '会议服务', '技术服务', '咨询服务',
  '软件开发', '广告宣传', '培训服务', '物业管理', '水电通讯',
  '快递物流', '餐饮招待', '设备采购', '耗材采购', '维修服务',
]

const DEPARTMENTS = [
  '行政部', '财务部', '技术部', '市场部', '销售部',
  '人力资源部', '运营部', '法务部', '审计部', '研发部',
]

const INVOICE_TYPES = ['增值税专用发票', '增值税普通发票', '电子普通发票']

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createRandom(seed?: number) {
  const rnd = seed !== undefined ? mulberry32(seed) : Math.random
  return {
    next: () => rnd(),
    int: (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min,
    float: (min: number, max: number) => rnd() * (max - min) + min,
    choice: <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)],
    chance: (p: number) => rnd() < p,
    date: (start: Date, end: Date) => {
      const time = start.getTime() + rnd() * (end.getTime() - start.getTime())
      return new Date(time)
    },
  }
}

function generateInvoiceCode(sellerIndex: number, year: number, rnd: ReturnType<typeof createRandom>): string {
  const regionCode = ['0110', '0310', '0440', '0440', '0330', '0510', '0420', '0320', '0610', '0500'][sellerIndex % 10]
  const batch = String(rnd.int(1, 99)).padStart(2, '0')
  return `${regionCode}${year}${batch}`
}

function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatAmount(n: number): number {
  return Math.round(n * 100) / 100
}

export function generateMockInvoices(options: MockInvoiceOptions = {}): InvoiceRecord[] {
  const {
    count = 50,
    seed,
    includeAnomalies = true,
    dateRange = { start: new Date(2024, 0, 1), end: new Date(2025, 5, 30) },
    buyerName = DEFAULT_BUYER.name,
    buyerTaxId = DEFAULT_BUYER.taxId,
  } = options

  const rnd = createRandom(seed)
  const invoices: InvoiceRecord[] = []

  let invoiceNumberCounter = 100000 + rnd.int(0, 50000)
  let consecutiveGroupTarget: { sellerIndex: number; count: number; remaining: number } | null = null

  for (let i = 0; i < count; i++) {
    const id = `inv_${Date.now()}_${String(i).padStart(5, '0')}`
    const sellerIndex = rnd.int(0, SELLERS.length - 1)
    const seller = SELLERS[sellerIndex]

    if (consecutiveGroupTarget && consecutiveGroupTarget.remaining > 0) {
      consecutiveGroupTarget.remaining--
    } else if (includeAnomalies && i > 2 && rnd.chance(0.08)) {
      const grpCount = rnd.int(3, 6)
      consecutiveGroupTarget = {
        sellerIndex,
        count: grpCount,
        remaining: grpCount - 1,
      }
    } else {
      consecutiveGroupTarget = null
    }

    const invoiceDate = rnd.date(dateRange.start, dateRange.end)
    if (includeAnomalies && rnd.chance(0.1)) {
      const day = invoiceDate.getDay()
      if (day !== 0 && day !== 6) {
        const offset = rnd.chance(0.5) ? 6 - day : -day - 1
        invoiceDate.setDate(invoiceDate.getDate() + offset)
      }
    }

    const invoiceYear = invoiceDate.getFullYear()
    const invoiceCode = generateInvoiceCode(sellerIndex, invoiceYear, rnd)

    let invoiceNumber = String(invoiceNumberCounter).padStart(8, '0')
    if (consecutiveGroupTarget) {
      const base = rnd.int(200000, 800000)
      invoiceNumber = String(base + (consecutiveGroupTarget.count - consecutiveGroupTarget.remaining - 1)).padStart(8, '0')
    } else {
      invoiceNumberCounter += rnd.int(1, 20)
    }

    let totalAmount: number
    if (includeAnomalies && rnd.chance(0.06)) {
      const roundAmounts = [10000, 20000, 30000, 50000, 100000, 150000, 80000, 250000]
      totalAmount = rnd.choice(roundAmounts) + rnd.float(-0.5, 0.5)
    } else if (includeAnomalies && rnd.chance(0.04)) {
      totalAmount = rnd.float(120000, 450000)
    } else {
      totalAmount = rnd.float(100, 95000)
    }
    totalAmount = formatAmount(totalAmount)

    const taxRate = rnd.choice([0.03, 0.06, 0.09, 0.13])
    const amountWithoutTax = formatAmount(totalAmount / (1 + taxRate))
    const taxAmount = formatAmount(totalAmount - amountWithoutTax)

    let entryDate = new Date(invoiceDate.getTime())
    entryDate.setDate(entryDate.getDate() + rnd.int(1, 30))

    if (includeAnomalies && rnd.chance(0.08)) {
      entryDate.setDate(entryDate.getDate() + rnd.int(35, 150))
    }

    const voucherMonth = entryDate.getMonth() + 1
    const voucherYear = entryDate.getFullYear()
    const voucherNum = rnd.int(1, 200)
    const voucherNumber = `记-${voucherYear}${String(voucherMonth).padStart(2, '0')}-${String(voucherNum).padStart(4, '0')}`

    const category = rnd.choice(CATEGORIES)
    const department = rnd.choice(DEPARTMENTS)

    invoices.push({
      id,
      invoiceCode,
      invoiceNumber,
      invoiceDate: formatDateISO(invoiceDate),
      sellerName: seller.name,
      sellerTaxId: seller.taxId,
      buyerName,
      buyerTaxId,
      totalAmount,
      taxAmount,
      amountWithoutTax,
      status: 'pending',
      category,
      department,
      voucherNumber,
      entryDate: formatDateISO(entryDate),
    })
  }

  if (includeAnomalies && count >= 5) {
    const dupSource = invoices[rnd.int(0, count - 3)]
    invoices.push({
      ...dupSource,
      id: `inv_dup_${Date.now()}`,
      voucherNumber: `记-${rnd.int(2020, 2025)}${String(rnd.int(1, 12)).padStart(2, '0')}-${String(rnd.int(1, 999)).padStart(4, '0')}`,
      entryDate: formatDateISO(rnd.date(dateRange.start, dateRange.end)),
    })
  }

  return invoices
}

export function generateMockLedgers(
  invoices: InvoiceRecord[],
  options: MockLedgerOptions = {},
): LedgerRecord[] {
  const {
    count,
    seed,
    invoiceMatchRate = 0.85,
    dateRange = { start: new Date(2024, 0, 1), end: new Date(2025, 5, 30) },
  } = options

  const rnd = createRandom(seed)
  const ledgers: LedgerRecord[] = []
  const matchedInvoices = new Set<string>()
  const targetCount = count || Math.ceil(invoices.length * 1.05)

  for (const inv of invoices) {
    if (rnd.chance(invoiceMatchRate)) {
      matchedInvoices.add(inv.id)

      let amount = inv.totalAmount
      if (rnd.chance(0.08)) {
        const adjustRatio = rnd.float(0.88, 1.12)
        amount = formatAmount(amount * adjustRatio)
      }

      const entryDate = new Date(inv.entryDate as string)
      entryDate.setDate(entryDate.getDate() + rnd.int(-3, 3))

      let taxAmount = inv.taxAmount
      if (rnd.chance(0.05)) {
        taxAmount = formatAmount(taxAmount * rnd.float(0.9, 1.1))
      }

      ledgers.push({
        id: `led_${Date.now()}_${ledgers.length}`,
        voucherNumber: inv.voucherNumber || `记-${entryDate.getFullYear()}${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(rnd.int(1, 999)).padStart(4, '0')}`,
        invoiceCode: inv.invoiceCode,
        invoiceNumber: inv.invoiceNumber,
        entryDate: formatDateISO(entryDate),
        amount,
        taxAmount,
        amountWithoutTax: formatAmount(amount - taxAmount),
        sellerName: inv.sellerName,
        sellerTaxId: inv.sellerTaxId,
        category: inv.category || rnd.choice(CATEGORIES),
        department: inv.department || rnd.choice(DEPARTMENTS),
        description: `采购${inv.category || '商品'}`,
        matchedInvoiceId: inv.id,
      })
    }
  }

  while (ledgers.length < targetCount) {
    const entryDate = rnd.date(dateRange.start, dateRange.end)
    const voucherMonth = entryDate.getMonth() + 1
    const voucherYear = entryDate.getFullYear()
    const voucherNumber = `记-${voucherYear}${String(voucherMonth).padStart(2, '0')}-${String(rnd.int(1, 999)).padStart(4, '0')}`

    const withInvoiceRef = rnd.chance(0.25)
    let invoiceCode: string | undefined
    let invoiceNumber: string | undefined

    if (withInvoiceRef) {
      const sellerIndex = rnd.int(0, SELLERS.length - 1)
      invoiceCode = generateInvoiceCode(sellerIndex, voucherYear, rnd)
      invoiceNumber = String(rnd.int(100000, 999999)).padStart(8, '0')
    }

    const amount = formatAmount(rnd.float(500, 80000))
    const taxRate = rnd.choice([0.03, 0.06, 0.09, 0.13])
    const taxAmount = formatAmount(amount - amount / (1 + taxRate))

    ledgers.push({
      id: `led_extra_${Date.now()}_${ledgers.length}`,
      voucherNumber,
      invoiceCode,
      invoiceNumber,
      entryDate: formatDateISO(entryDate),
      amount,
      taxAmount,
      amountWithoutTax: formatAmount(amount - taxAmount),
      sellerName: withInvoiceRef ? SELLERS[rnd.int(0, SELLERS.length - 1)].name : undefined,
      category: rnd.choice(CATEGORIES),
      department: rnd.choice(DEPARTMENTS),
      description: `日常支出 - ${rnd.choice(CATEGORIES)}`,
    })
  }

  return ledgers.slice(0, targetCount)
}

export function generateMockDataset(options?: {
  invoiceCount?: number
  ledgerCount?: number
  seed?: number
  includeAnomalies?: boolean
}): MockDataset {
  const {
    invoiceCount = 50,
    ledgerCount,
    seed,
    includeAnomalies = true,
  } = options || {}

  const invoices = generateMockInvoices({
    count: invoiceCount,
    seed,
    includeAnomalies,
  })

  const ledgers = generateMockLedgers(invoices, {
    count: ledgerCount,
    seed: seed !== undefined ? seed + 1000 : undefined,
  })

  const expectedAnomalies: string[] = []
  if (includeAnomalies) {
    expectedAnomalies.push('连号发票（consecutive_numbers）')
    expectedAnomalies.push('周末开票（weekend_invoice）')
    expectedAnomalies.push('大额整数发票（high_round_amount）')
    expectedAnomalies.push('跨期入账（cross_month_entry）')
    expectedAnomalies.push('重复入账（duplicate_entry）')
    expectedAnomalies.push('金额不一致（amount_mismatch）')
    expectedAnomalies.push('大额发票（large_amount）')
    expectedAnomalies.push('未匹配发票/凭证（unmatched）')
  }

  return {
    invoices,
    ledgers,
    summary: {
      totalInvoices: invoices.length,
      totalLedgers: ledgers.length,
      expectedAnomalies,
    },
  }
}

export function getFixedHolidayDates2024(): string[] {
  return [
    '2024-01-01',
    '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17',
    '2024-04-04', '2024-04-05', '2024-04-06',
    '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05',
    '2024-06-08', '2024-06-09', '2024-06-10',
    '2024-09-15', '2024-09-16', '2024-09-17',
    '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-05', '2024-10-06', '2024-10-07',
  ]
}

export function getFixedHolidayDates2025(): string[] {
  return [
    '2025-01-01',
    '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
    '2025-04-04', '2025-04-05', '2025-04-06',
    '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
    '2025-05-31', '2025-06-01', '2025-06-02',
    '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
  ]
}

export function getAllHolidays(): string[] {
  return [...getFixedHolidayDates2024(), ...getFixedHolidayDates2025()]
}

export const SAMPLE_SELLERS = SELLERS
export const SAMPLE_CATEGORIES = CATEGORIES
export const SAMPLE_DEPARTMENTS = DEPARTMENTS
export const SAMPLE_INVOICE_TYPES = INVOICE_TYPES
export const DEFAULT_BUYER_INFO = DEFAULT_BUYER
