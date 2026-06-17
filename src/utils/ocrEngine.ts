export interface OCRField {
  name: string
  value: string
  confidence: number
  bbox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface OCRResult {
  fields: OCRField[]
  rawText: string
  imageUrl?: string
  processedAt: string
  overallConfidence: number
}

export interface ScanProgress {
  phase: 'loading' | 'preprocessing' | 'scanning' | 'recognizing' | 'postprocessing' | 'completed'
  progress: number
  message: string
  scanLineY?: number
}

export type ProgressCallback = (progress: ScanProgress) => void

const INVOICE_TYPES = ['增值税专用发票', '增值税普通发票', '电子普通发票', '卷式发票', '定额发票']

const SELLERS = [
  '北京科技有限公司',
  '上海贸易发展公司',
  '广州电子科技股份有限公司',
  '深圳创新信息技术有限公司',
  '杭州软件开发有限公司',
  '成都智能科技有限公司',
  '武汉商贸集团有限公司',
  '南京数码科技有限公司',
  '西安通信设备有限公司',
  '重庆办公用品公司',
]

const BUYERS = [
  '国际审计咨询有限公司',
  '华天会计师事务所',
  '中瑞税务师事务所有限公司',
  '诚信资产评估有限公司',
  '方正管理咨询有限公司',
]

const ITEM_NAMES = [
  '办公用品',
  '打印耗材',
  '电脑配件',
  '差旅交通费',
  '会议服务费',
  '技术服务费',
  '咨询服务费',
  '软件开发费',
  '广告宣传费',
  '培训费',
  '物业管理费',
  '水电费',
  '通讯费',
  '快递费',
  '餐饮费',
]

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1))
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function randomDate(start: Date, end: Date): string {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  const d = new Date(time)
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
}

function generateInvoiceNumber(): string {
  const regionCode = randomInt(1000, 9999)
  const year = randomInt(2020, 2025)
  const batch = String(randomInt(1, 99)).padStart(2, '0')
  const serial = String(randomInt(1, 999999)).padStart(6, '0')
  return `${regionCode}${year}${batch}${serial}`
}

function generateTaxNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 18; i++) {
    result += chars[randomInt(0, chars.length - 1)]
  }
  return result
}

function generateAmount(): string {
  const yuan = randomInt(100, 99999)
  const jiao = randomInt(0, 9)
  const fen = randomInt(0, 9)
  return `${yuan.toLocaleString()}.${jiao}${fen}`
}

function generatePhone(): string {
  const prefix = ['138', '139', '158', '159', '186', '188', '189', '010', '021', '0755']
  const p = randomChoice(prefix)
  let rest = ''
  for (let i = 0; i < 8; i++) {
    rest += randomInt(0, 9)
  }
  if (p.startsWith('0')) {
    return `${p}-${rest}`
  }
  return `${p}${rest}`
}

function generateBankInfo(): string {
  const banks = ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行', '招商银行', '交通银行']
  const bank = randomChoice(banks)
  let account = ''
  for (let i = 0; i < 19; i++) {
    account += randomInt(0, 9)
  }
  return `${bank} ${account}`
}

function generateAddress(): string {
  const cities = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '成都市高新区']
  const streets = ['建国路', '人民大道', '中山大道', '科技路', '创业街', '软件园']
  const numbers = ['1号', '88号', '168号', '256号', '666号', '999号']
  const buildings = ['A座', 'B栋', '3号楼', '大厦12层', '科技园5栋']
  return `${randomChoice(cities)}${randomChoice(streets)}${randomChoice(numbers)}${randomChoice(buildings)}`
}

export function createMockOCRResult(seed?: number): OCRResult {
  if (seed !== undefined) {
    let s = seed
    const origRandom = Math.random
    Math.random = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    try {
      return createMockOCRResultInternal()
    } finally {
      Math.random = origRandom
    }
  }
  return createMockOCRResultInternal()
}

function createMockOCRResultInternal(): OCRResult {
  const invoiceType = randomChoice(INVOICE_TYPES)
  const invoiceNumber = generateInvoiceNumber()
  const invoiceDate = randomDate(new Date(2023, 0, 1), new Date(2025, 5, 30))
  const seller = randomChoice(SELLERS)
  const buyer = randomChoice(BUYERS)
  const sellerTax = generateTaxNumber()
  const buyerTax = generateTaxNumber()
  const totalAmount = generateAmount()
  const total = parseFloat(totalAmount.replace(/,/g, ''))
  const taxRate = randomChoice([0.06, 0.09, 0.13])
  const taxAmount = (total * taxRate / (1 + taxRate)).toFixed(2)
  const amountWithoutTax = (total / (1 + taxRate)).toFixed(2)
  const itemCount = randomInt(1, 5)
  const checkCode = generateTaxNumber().slice(0, 20)

  const fields: OCRField[] = [
    {
      name: '发票类型',
      value: invoiceType,
      confidence: random(0.92, 0.99),
      bbox: { x: 180, y: 25, width: 200, height: 22 },
    },
    {
      name: '发票代码',
      value: invoiceNumber.slice(0, 10),
      confidence: random(0.85, 0.98),
      bbox: { x: 50, y: 55, width: 180, height: 18 },
    },
    {
      name: '发票号码',
      value: invoiceNumber.slice(10),
      confidence: random(0.88, 0.99),
      bbox: { x: 300, y: 55, width: 150, height: 18 },
    },
    {
      name: '开票日期',
      value: invoiceDate,
      confidence: random(0.82, 0.97),
      bbox: { x: 50, y: 80, width: 220, height: 18 },
    },
    {
      name: '校验码',
      value: checkCode,
      confidence: random(0.75, 0.92),
      bbox: { x: 320, y: 80, width: 200, height: 18 },
    },
    {
      name: '购买方名称',
      value: buyer,
      confidence: random(0.88, 0.99),
      bbox: { x: 80, y: 120, width: 300, height: 20 },
    },
    {
      name: '购买方纳税人识别号',
      value: buyerTax,
      confidence: random(0.80, 0.95),
      bbox: { x: 80, y: 145, width: 320, height: 18 },
    },
    {
      name: '购买方地址电话',
      value: `${generateAddress()} ${generatePhone()}`,
      confidence: random(0.72, 0.88),
      bbox: { x: 80, y: 170, width: 400, height: 18 },
    },
    {
      name: '购买方开户行及账号',
      value: generateBankInfo(),
      confidence: random(0.70, 0.86),
      bbox: { x: 80, y: 195, width: 400, height: 18 },
    },
    {
      name: '销售方名称',
      value: seller,
      confidence: random(0.88, 0.99),
      bbox: { x: 80, y: 280, width: 300, height: 20 },
    },
    {
      name: '销售方纳税人识别号',
      value: sellerTax,
      confidence: random(0.80, 0.95),
      bbox: { x: 80, y: 305, width: 320, height: 18 },
    },
    {
      name: '销售方地址电话',
      value: `${generateAddress()} ${generatePhone()}`,
      confidence: random(0.72, 0.88),
      bbox: { x: 80, y: 330, width: 400, height: 18 },
    },
    {
      name: '销售方开户行及账号',
      value: generateBankInfo(),
      confidence: random(0.70, 0.86),
      bbox: { x: 80, y: 355, width: 400, height: 18 },
    },
    {
      name: '金额合计',
      value: `¥${amountWithoutTax}`,
      confidence: random(0.85, 0.97),
      bbox: { x: 380, y: 250, width: 120, height: 18 },
    },
    {
      name: '税额合计',
      value: `¥${taxAmount}`,
      confidence: random(0.82, 0.95),
      bbox: { x: 500, y: 250, width: 100, height: 18 },
    },
    {
      name: '价税合计(大写)',
      value: numberToChinese(total),
      confidence: random(0.78, 0.93),
      bbox: { x: 80, y: 385, width: 350, height: 20 },
    },
    {
      name: '价税合计(小写)',
      value: `¥${totalAmount}`,
      confidence: random(0.90, 0.99),
      bbox: { x: 450, y: 385, width: 150, height: 20 },
    },
  ]

  for (let i = 0; i < itemCount; i++) {
    const itemPrice = (total / itemCount / (1 + taxRate) * random(0.8, 1.2)).toFixed(2)
    const itemTax = (parseFloat(itemPrice) * taxRate).toFixed(2)
    const quantity = randomInt(1, 20)
    fields.push({
      name: `货物或应税劳务名称_${i + 1}`,
      value: randomChoice(ITEM_NAMES),
      confidence: random(0.75, 0.95),
      bbox: { x: 50, y: 215 + i * 18, width: 200, height: 16 },
    })
    fields.push({
      name: `规格型号_${i + 1}`,
      value: randomChoice(['', 'A4', '标准', '500ml', '标准版', '']),
      confidence: random(0.60, 0.85),
      bbox: { x: 260, y: 215 + i * 18, width: 80, height: 16 },
    })
    fields.push({
      name: `数量_${i + 1}`,
      value: String(quantity),
      confidence: random(0.80, 0.95),
      bbox: { x: 340, y: 215 + i * 18, width: 40, height: 16 },
    })
    fields.push({
      name: `单价_${i + 1}`,
      value: (parseFloat(itemPrice) / quantity).toFixed(2),
      confidence: random(0.78, 0.93),
      bbox: { x: 385, y: 215 + i * 18, width: 70, height: 16 },
    })
    fields.push({
      name: `金额_${i + 1}`,
      value: itemPrice,
      confidence: random(0.82, 0.96),
      bbox: { x: 460, y: 215 + i * 18, width: 80, height: 16 },
    })
    fields.push({
      name: `税率_${i + 1}`,
      value: `${(taxRate * 100).toFixed(0)}%`,
      confidence: random(0.88, 0.98),
      bbox: { x: 545, y: 215 + i * 18, width: 45, height: 16 },
    })
    fields.push({
      name: `税额_${i + 1}`,
      value: itemTax,
      confidence: random(0.80, 0.94),
      bbox: { x: 595, y: 215 + i * 18, width: 75, height: 16 },
    })
  }

  const overallConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length

  const rawText = fields
    .map((f) => `${f.name}: ${f.value}`)
    .join('\n')

  return {
    fields,
    rawText,
    processedAt: new Date().toISOString(),
    overallConfidence,
  }
}

function numberToChinese(n: number): string {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿']
  const jiaoFenUnits = ['角', '分']
  const intPart = Math.floor(n)
  const decPart = Math.round((n - intPart) * 100)

  let result = ''
  const intStr = String(intPart)
  for (let i = 0; i < intStr.length; i++) {
    const d = parseInt(intStr[i])
    const unitIndex = intStr.length - 1 - i
    if (d === 0) {
      if (!result.endsWith('零') && result !== '') {
        result += '零'
      }
    } else {
      result += digits[d] + units[unitIndex]
    }
  }
  result = result.replace(/零+$/, '') + '元'

  if (decPart === 0) {
    result += '整'
  } else {
    const jiao = Math.floor(decPart / 10)
    const fen = decPart % 10
    if (jiao > 0) {
      result += digits[jiao] + jiaoFenUnits[0]
    }
    if (fen > 0) {
      result += digits[fen] + jiaoFenUnits[1]
    }
  }
  return result
}

export async function simulateOCR(
  imageSource: string | File | HTMLCanvasElement,
  options?: {
    onProgress?: ProgressCallback
    minDurationMs?: number
    failRate?: number
  },
): Promise<OCRResult> {
  const {
    onProgress,
    minDurationMs = 1500,
    failRate = 0.02,
  } = options || {}

  const startTime = Date.now()
  const phases: { phase: ScanProgress['phase']; duration: number; message: string }[] = [
    { phase: 'loading', duration: randomInt(150, 300), message: '正在加载图像...' },
    { phase: 'preprocessing', duration: randomInt(200, 400), message: '图像预处理中（去噪/增强/二值化）...' },
    { phase: 'scanning', duration: randomInt(400, 800), message: '正在扫描图像区域...' },
    { phase: 'recognizing', duration: randomInt(400, 700), message: '文字识别与版面分析中...' },
    { phase: 'postprocessing', duration: randomInt(200, 400), message: '后处理与字段校验中...' },
  ]

  let currentProgress = 0
  let scanLineY = 0

  for (const phaseInfo of phases) {
    const phaseStart = Date.now()
    const phaseDuration = phaseInfo.duration

    while (Date.now() - phaseStart < phaseDuration) {
      const phaseProgress = Math.min(1, (Date.now() - phaseStart) / phaseDuration)
      currentProgress = currentProgress + (phaseProgress * 20) / 100
      if (currentProgress > 1) currentProgress = 1

      if (phaseInfo.phase === 'scanning') {
        scanLineY = phaseProgress * 100
      }

      onProgress?.({
        phase: phaseInfo.phase,
        progress: currentProgress,
        message: phaseInfo.message,
        scanLineY: phaseInfo.phase === 'scanning' ? scanLineY : undefined,
      })

      await sleep(randomInt(20, 50))
    }
  }

  onProgress?.({
    phase: 'completed',
    progress: 1,
    message: '识别完成',
  })

  const elapsed = Date.now() - startTime
  if (elapsed < minDurationMs) {
    await sleep(minDurationMs - elapsed)
  }

  if (Math.random() < failRate) {
    throw new Error('OCR识别失败：图像质量过低或格式不支持')
  }

  const seed = typeof imageSource === 'string'
    ? hashString(imageSource)
    : imageSource instanceof File
    ? hashString(imageSource.name + imageSource.size)
    : Date.now()

  return createMockOCRResult(seed)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getFieldByName(result: OCRResult, name: string): OCRField | undefined {
  return result.fields.find((f) => f.name === name)
}

export function getFieldValue(result: OCRResult, name: string): string {
  return getFieldByName(result, name)?.value || ''
}

export interface FieldConfidenceInfo {
  low: OCRField[]
  medium: OCRField[]
  high: OCRField[]
  needsReview: OCRField[]
}

export function analyzeConfidence(result: OCRResult, thresholds = { low: 0.75, medium: 0.85 }): FieldConfidenceInfo {
  const low: OCRField[] = []
  const medium: OCRField[] = []
  const high: OCRField[] = []

  for (const field of result.fields) {
    if (field.confidence < thresholds.low) {
      low.push(field)
    } else if (field.confidence < thresholds.medium) {
      medium.push(field)
    } else {
      high.push(field)
    }
  }

  return {
    low,
    medium,
    high,
    needsReview: [...low, ...medium],
  }
}
