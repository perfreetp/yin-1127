export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTransformOptions {
  brightness?: number
  contrast?: number
  saturation?: number
  grayscale?: boolean
  blur?: number
  sharpen?: boolean
  threshold?: number | null
  rotate?: number
  scale?: number
  flipX?: boolean
  flipY?: boolean
}

export interface ExportOptions {
  format?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  maxWidth?: number
  maxHeight?: number
  padding?: number
  backgroundColor?: string
}

export interface HighlightOptions {
  strokeStyle?: string
  lineWidth?: number
  fillStyle?: string
  label?: string
  labelStyle?: string
  labelBackground?: string
  animate?: boolean
}

export interface ProcessedImage {
  canvas: HTMLCanvasElement
  dataUrl: string
  width: number
  height: number
  blob?: Blob
}

const DEFAULT_TRANSFORM: Required<ImageTransformOptions> = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  grayscale: false,
  blur: 0,
  sharpen: false,
  threshold: null,
  rotate: 0,
  scale: 1,
  flipX: false,
  flipY: false,
}

const DEFAULT_EXPORT: Required<Omit<ExportOptions, 'maxWidth' | 'maxHeight' | 'padding'>> & {
  maxWidth: number | undefined
  maxHeight: number | undefined
  padding: number
} = {
  format: 'image/png',
  quality: 0.92,
  maxWidth: undefined,
  maxHeight: undefined,
  padding: 0,
  backgroundColor: '#ffffff',
}

const DEFAULT_HIGHLIGHT: Required<HighlightOptions> = {
  strokeStyle: '#ef4444',
  lineWidth: 2,
  fillStyle: 'rgba(239, 68, 68, 0.1)',
  label: '',
  labelStyle: '#ffffff',
  labelBackground: '#ef4444',
  animate: false,
}

export async function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'

  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(new Error('图片加载失败'))

    if (typeof source === 'string') {
      img.src = source
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(source as Blob)
    }
  })
}

export function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
} {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')
  return { canvas, ctx }
}

export function imageToCanvas(img: HTMLImageElement, options?: {
  maxWidth?: number
  maxHeight?: number
  scale?: number
}): HTMLCanvasElement {
  let { maxWidth, maxHeight, scale = 1 } = options || {}
  let width = img.width * scale
  let height = img.height * scale

  if (maxWidth && width > maxWidth) {
    const ratio = maxWidth / width
    width = maxWidth
    height = height * ratio
  }
  if (maxHeight && height > maxHeight) {
    const ratio = maxHeight / height
    height = maxHeight
    width = width * ratio
  }

  const { canvas, ctx } = createCanvas(Math.floor(width), Math.floor(height))
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function fileToCanvas(file: File | Blob, options?: {
  maxWidth?: number
  maxHeight?: number
}): Promise<HTMLCanvasElement> {
  const img = await loadImage(file)
  return imageToCanvas(img, options)
}

export function transformCanvas(
  canvas: HTMLCanvasElement,
  options: ImageTransformOptions,
): HTMLCanvasElement {
  const opts = { ...DEFAULT_TRANSFORM, ...options }
  const width = canvas.width
  const height = canvas.height

  const rad = (opts.rotate * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const newWidth = Math.ceil(width * cos + height * sin)
  const newHeight = Math.ceil(width * sin + height * cos)

  const scaledWidth = Math.ceil(newWidth * opts.scale)
  const scaledHeight = Math.ceil(newHeight * opts.scale)

  const { canvas: result, ctx } = createCanvas(scaledWidth, scaledHeight)

  ctx.save()
  ctx.translate(scaledWidth / 2, scaledHeight / 2)
  ctx.rotate(rad)
  ctx.scale(opts.flipX ? -opts.scale : opts.scale, opts.flipY ? -opts.scale : opts.scale)
  ctx.drawImage(canvas, -width / 2, -height / 2)
  ctx.restore()

  applyImageFilters(ctx, result.width, result.height, opts)

  return result
}

function applyImageFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: Required<ImageTransformOptions>,
): void {
  if (opts.blur > 0) {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(ctx.canvas, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.filter = `blur(${opts.blur}px)`
    ctx.drawImage(tempCanvas, 0, 0)
    ctx.filter = 'none'
  }

  const needsImageData =
    opts.brightness !== 1 ||
    opts.contrast !== 1 ||
    opts.saturation !== 1 ||
    opts.grayscale ||
    opts.sharpen ||
    opts.threshold !== null

  if (!needsImageData) return

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const brightness = opts.brightness
  const contrast = opts.contrast
  const saturation = opts.saturation

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    r = (r / 255) * brightness * 255
    g = (g / 255) * brightness * 255
    b = (b / 255) * brightness * 255

    r = (r - 128) * contrast + 128
    g = (g - 128) * contrast + 128
    b = (b - 128) * contrast + 128

    if (opts.grayscale) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      r = gray
      g = gray
      b = gray
    }

    if (!opts.grayscale && saturation !== 1) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      r = gray + (r - gray) * saturation
      g = gray + (g - gray) * saturation
      b = gray + (b - gray) * saturation
    }

    if (opts.threshold !== null) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      const v = gray >= opts.threshold ? 255 : 0
      r = v
      g = v
      b = v
    }

    data[i] = Math.max(0, Math.min(255, r))
    data[i + 1] = Math.max(0, Math.min(255, g))
    data[i + 2] = Math.max(0, Math.min(255, b))
  }

  if (opts.sharpen) {
    applySharpen(data, width, height)
  }

  ctx.putImageData(imageData, 0, 0)
}

function applySharpen(data: Uint8ClampedArray, width: number, height: number): void {
  const temp = new Uint8ClampedArray(data)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const divisor = 1

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let ki = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx
            const py = y + ky
            const idx = (py * width + px) * 4 + c
            sum += temp[idx] * kernel[ki]
            ki++
          }
        }
        data[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum / divisor))
      }
    }
  }
}

export function drawBBox(
  canvas: HTMLCanvasElement,
  bbox: BBox,
  options?: HighlightOptions,
): HTMLCanvasElement {
  const { canvas: result, ctx } = createCanvas(canvas.width, canvas.height)
  ctx.drawImage(canvas, 0, 0)

  const opts = { ...DEFAULT_HIGHLIGHT, ...options }

  ctx.strokeStyle = opts.strokeStyle
  ctx.lineWidth = opts.lineWidth
  ctx.fillStyle = opts.fillStyle

  ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height)
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)

  if (opts.label) {
    const fontSize = Math.max(10, Math.min(14, Math.floor(bbox.height * 0.5)))
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    const textMetrics = ctx.measureText(opts.label)
    const padding = 4
    const labelWidth = textMetrics.width + padding * 2
    const labelHeight = fontSize + padding * 2
    const labelX = bbox.x
    const labelY = Math.max(0, bbox.y - labelHeight)

    ctx.fillStyle = opts.labelBackground
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight)

    ctx.fillStyle = opts.labelStyle
    ctx.textBaseline = 'middle'
    ctx.fillText(opts.label, labelX + padding, labelY + labelHeight / 2)
  }

  return result
}

export function drawMultipleBBoxes(
  canvas: HTMLCanvasElement,
  bboxes: (BBox & { options?: HighlightOptions; id?: string })[],
): {
  canvas: HTMLCanvasElement
  overlayCanvas: HTMLCanvasElement
} {
  const { canvas: result, ctx } = createCanvas(canvas.width, canvas.height)
  ctx.drawImage(canvas, 0, 0)

  const overlay = document.createElement('canvas')
  overlay.width = canvas.width
  overlay.height = canvas.height
  const overlayCtx = overlay.getContext('2d')!

  for (const bbox of bboxes) {
    drawBBoxOnContext(overlayCtx, bbox, bbox.options)
  }

  return { canvas: result, overlayCanvas: overlay }
}

function drawBBoxOnContext(
  ctx: CanvasRenderingContext2D,
  bbox: BBox,
  options?: HighlightOptions,
): void {
  const opts = { ...DEFAULT_HIGHLIGHT, ...options }
  ctx.save()
  ctx.strokeStyle = opts.strokeStyle
  ctx.lineWidth = opts.lineWidth
  ctx.fillStyle = opts.fillStyle

  ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height)
  ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height)

  if (opts.label) {
    const fontSize = 12
    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`
    const textMetrics = ctx.measureText(opts.label)
    const padding = 4
    const labelWidth = textMetrics.width + padding * 2
    const labelHeight = fontSize + padding * 2
    const labelX = bbox.x
    const labelY = Math.max(0, bbox.y - labelHeight)

    ctx.fillStyle = opts.labelBackground
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight)

    ctx.fillStyle = opts.labelStyle
    ctx.textBaseline = 'middle'
    ctx.fillText(opts.label, labelX + padding, labelY + labelHeight / 2)
  }
  ctx.restore()
}

export function drawScanLine(
  canvas: HTMLCanvasElement,
  positionPercent: number,
  options?: {
    color?: string
    width?: number
    glowSize?: number
  },
): HTMLCanvasElement {
  const { canvas: result, ctx } = createCanvas(canvas.width, canvas.height)
  ctx.drawImage(canvas, 0, 0)

  const color = options?.color || 'rgba(34, 197, 94, 0.8)'
  const width = options?.width || 2
  const glowSize = options?.glowSize || 15

  const y = canvas.height * (positionPercent / 100)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.shadowColor = color
  ctx.shadowBlur = glowSize

  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(canvas.width, y)
  ctx.stroke()

  const gradient = ctx.createLinearGradient(0, y - glowSize, 0, y + glowSize)
  gradient.addColorStop(0, 'rgba(34, 197, 94, 0)')
  gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.15)')
  gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, y - glowSize, canvas.width, glowSize * 2)

  ctx.restore()

  return result
}

export function createPlaceholderInvoice(
  options?: {
    width?: number
    height?: number
    seed?: number
    text?: Record<string, string>
  },
): HTMLCanvasElement {
  const width = options?.width || 800
  const height = options?.height || 500
  const { canvas, ctx } = createCanvas(width, height)

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#d4d4d4'
  ctx.lineWidth = 1
  ctx.strokeRect(10, 10, width - 20, height - 20)

  ctx.fillStyle = '#1e293b'
  ctx.font = 'bold 22px "SimSun", "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.fillText('增值税专用发票', width / 2, 45)

  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#64748b'
  ctx.fillText('发票代码：011002400311', 50, 75)
  ctx.fillText('发票号码：00384726', 320, 75)
  ctx.fillText('开票日期：2024年08月15日', 50, 100)
  ctx.fillText('校验码：7849 2837 1028 3746 1823', 320, 100)

  drawFormSection(ctx, 50, 125, width - 100, 90, '购买方', [
    ['名    称：', '国际审计咨询有限公司'],
    ['纳税人识别号：', '91110105MA00123456'],
    ['地 址、电 话：', '北京市朝阳区建国路88号 010-88886666'],
    ['开户行及账号：', '中国工商银行北京市分行 0200 0800 1234 5678 901'],
  ])

  drawTable(ctx, 50, 230, width - 100, 120)

  drawFormSection(ctx, 50, 365, width - 100, 90, '销售方', [
    ['名    称：', '北京科技有限公司'],
    ['纳税人识别号：', '91110108MA00789012'],
    ['地 址、电 话：', '北京市海淀区科技路168号 010-66668888'],
    ['开户行及账号：', '招商银行北京分行 0109 0087 6543 2109 876'],
  ])

  ctx.fillStyle = '#1e293b'
  ctx.font = '14px "SimSun", serif'
  ctx.textAlign = 'left'
  ctx.fillText('价税合计（大写）：', 50, height - 50)
  ctx.font = 'bold 14px "SimSun", serif'
  ctx.fillText('壹万叁仟伍佰陆拾元零角零分', 180, height - 50)
  ctx.textAlign = 'right'
  ctx.fillText(`（小写）¥13,560.00`, width - 50, height - 50)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('销售方：（章）', width / 2, height - 20)

  return canvas
}

function drawFormSection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  rows: [string, string][],
): void {
  ctx.save()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(x, y, 70, height)

  ctx.fillStyle = '#475569'
  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.save()
  ctx.translate(x + 35, y + height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(title, 0, 0)
  ctx.restore()

  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  const rowHeight = height / rows.length
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i]
    const rowY = y + rowHeight * i + rowHeight / 2 + 4
    ctx.fillStyle = '#64748b'
    ctx.fillText(label, x + 80, rowY)
    ctx.fillStyle = '#1e293b'
    ctx.fillText(value, x + 180, rowY)
  }
  ctx.restore()
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.save()
  const headers = ['货物或应税劳务名称', '规格型号', '单位', '数量', '单价', '金额', '税率', '税额']
  const colWidths = [180, 60, 50, 50, 70, 80, 50, 80]
  const headerHeight = 28
  const rowHeight = (height - headerHeight) / 2

  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, width, height)

  let cx = x
  for (let i = 0; i < colWidths.length; i++) {
    cx += colWidths[i]
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx, y + height)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.moveTo(x, y + headerHeight)
  ctx.lineTo(x + width, y + headerHeight)
  ctx.stroke()

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(x + 1, y + 1, width - 2, headerHeight - 2)

  ctx.font = 'bold 11px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#334155'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  cx = x
  for (let i = 0; i < headers.length; i++) {
    ctx.fillText(headers[i], cx + colWidths[i] / 2, y + headerHeight / 2)
    cx += colWidths[i]
  }

  const sampleData = [
    ['*信息技术服务*软件开发费', '', '项', '1', '8,490.57', '8,490.57', '6%', '509.43'],
    ['*研发和技术服务*技术服务费', '', '项', '1', '4,245.28', '4,245.28', '6%', '254.72'],
  ]

  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#1e293b'
  for (let row = 0; row < sampleData.length; row++) {
    cx = x
    const rowY = y + headerHeight + rowHeight * row + rowHeight / 2
    for (let col = 0; col < sampleData[row].length; col++) {
      const align = col >= 3 ? 'right' : 'center'
      ctx.textAlign = align as CanvasTextAlign
      const tx = align === 'right' ? cx + colWidths[col] - 8 : cx + colWidths[col] / 2
      ctx.fillText(sampleData[row][col], tx, rowY)
      cx += colWidths[col]
    }
  }

  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  options?: ExportOptions,
): string {
  const opts = { ...DEFAULT_EXPORT, ...options }

  if (opts.maxWidth || opts.maxHeight || opts.padding > 0) {
    return canvasToDataUrlWithResize(canvas, opts)
  }

  return canvas.toDataURL(opts.format, opts.quality)
}

function canvasToDataUrlWithResize(
  canvas: HTMLCanvasElement,
  opts: Required<Omit<ExportOptions, 'maxWidth' | 'maxHeight' | 'padding'>> & {
    maxWidth?: number
    maxHeight?: number
    padding: number
  },
): string {
  let { width, height } = canvas
  const padding = opts.padding * 2

  if (opts.maxWidth && width + padding > opts.maxWidth) {
    const ratio = (opts.maxWidth - padding) / width
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }
  if (opts.maxHeight && height + padding > opts.maxHeight) {
    const ratio = (opts.maxHeight - padding) / height
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }

  const finalWidth = width + padding
  const finalHeight = height + padding
  const { canvas: result, ctx } = createCanvas(finalWidth, finalHeight)

  ctx.fillStyle = opts.backgroundColor
  ctx.fillRect(0, 0, finalWidth, finalHeight)
  ctx.drawImage(canvas, opts.padding, opts.padding, width, height)

  return result.toDataURL(opts.format, opts.quality)
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  options?: ExportOptions,
): Promise<Blob> {
  const opts = { ...DEFAULT_EXPORT, ...options }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      opts.format,
      opts.quality,
    )
  })
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  options?: ExportOptions,
): void {
  const dataUrl = canvasToDataUrl(canvas, options)
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function getImageSize(
  canvasOrImage: HTMLCanvasElement | HTMLImageElement,
): { width: number; height: number; aspectRatio: number } {
  const width = canvasOrImage.width
  const height = canvasOrImage.height
  return {
    width,
    height,
    aspectRatio: width / height,
  }
}

export function autoCrop(
  canvas: HTMLCanvasElement,
  threshold = 10,
  padding = 10,
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  let minX = canvas.width
  let minY = canvas.height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const i = (y * canvas.width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3
      if (brightness < 255 - threshold) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(canvas.width, maxX + padding)
  maxY = Math.min(canvas.height, maxY + padding)

  if (maxX <= minX || maxY <= minY) return canvas

  const croppedWidth = maxX - minX
  const croppedHeight = maxY - minY
  const { canvas: result, ctx: resultCtx } = createCanvas(croppedWidth, croppedHeight)
  resultCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight)

  return result
}

export function normalizeImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
  let result = canvas
  result = autoCrop(result)
  result = transformCanvas(result, {
    brightness: 1.05,
    contrast: 1.1,
    saturation: 1.05,
  })
  return result
}

export interface CompressResult {
  dataUrl: string
  blob: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

export async function compressImage(
  source: string | File | Blob | HTMLCanvasElement,
  targetSizeKB: number = 500,
  minQuality: number = 0.5,
): Promise<CompressResult> {
  let canvas: HTMLCanvasElement
  if (source instanceof HTMLCanvasElement) {
    canvas = source
  } else {
    const img = await loadImage(source as string | File | Blob)
    canvas = imageToCanvas(img)
  }

  let quality = 0.95
  let blob: Blob
  let dataUrl: string

  const originalDataUrl = canvas.toDataURL('image/jpeg', 1)
  const originalSize = Math.round((originalDataUrl.length - 22) * 0.75)

  do {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    blob = await (await fetch(dataUrl)).blob()
    quality -= 0.05
  } while (blob.size > targetSizeKB * 1024 && quality >= minQuality)

  const compressedSize = blob.size
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

  return {
    dataUrl,
    blob,
    originalSize,
    compressedSize,
    compressionRatio: Math.round(compressionRatio * 100) / 100,
  }
}
