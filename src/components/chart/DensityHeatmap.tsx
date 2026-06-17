import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  ZAxis,
  Cell,
  LabelList,
} from 'recharts'

export interface DensityHeatmapItem {
  category: string
  month: string
  count: number
}

interface DensityHeatmapProps {
  data: DensityHeatmapItem[]
  height?: number
  categories?: string[]
  months?: string[]
}

const DEFAULT_MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]

const COLOR_RANGE = [
  '#f0ece4',
  '#d4e0ec',
  '#a8c4dc',
  '#7ca8cc',
  '#508cbc',
  '#2d6f9c',
  '#1e5a7c',
  '#163a5f',
]

function getHeatmapColor(value: number, max: number): string {
  if (max === 0) return COLOR_RANGE[0]
  const ratio = value / max
  const index = Math.min(
    Math.floor(ratio * COLOR_RANGE.length),
    COLOR_RANGE.length - 1
  )
  return COLOR_RANGE[index]
}

export default function DensityHeatmap({
  data,
  height = 400,
  categories,
  months = DEFAULT_MONTHS,
}: DensityHeatmapProps) {
  const uniqueCategories =
    categories || Array.from(new Set(data.map((d) => d.category)))

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const monthIndexMap = new Map(months.map((m, i) => [m, i]))
  const categoryIndexMap = new Map(
    uniqueCategories.map((c, i) => [c, i])
  )

  const scatterData = data.map((d) => ({
    x: monthIndexMap.get(d.month) ?? 0,
    y: categoryIndexMap.get(d.category) ?? 0,
    z: d.count,
    count: d.count,
    category: d.category,
    month: d.month,
  }))

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 gap-2">
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          低
        </span>
        <div className="flex gap-0.5">
          {COLOR_RANGE.map((color, idx) => (
            <div
              key={idx}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          高
        </span>
      </div>
      <div style={{ width: '100%', height: height - 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 30, bottom: 10, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-tertiary)"
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, months.length - 1]}
              ticks={months.map((_, i) => i)}
              tickFormatter={(value: number) => months[value] || ''}
              tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border-primary)' }}
              tickLine={{ stroke: 'var(--color-border-primary)' }}
              name="月份"
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, uniqueCategories.length - 1]}
              ticks={uniqueCategories.map((_, i) => i)}
              tickFormatter={(value: number) => uniqueCategories[value] || ''}
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border-primary)' }}
              tickLine={{ stroke: 'var(--color-border-primary)' }}
              width={100}
              name="类别"
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[100, 100]}
              domain={[0, maxCount]}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  return (
                    <div
                      className="rounded-lg shadow-lg px-4 py-3"
                      style={{
                        backgroundColor: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border-secondary)',
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.category} · {item.month}
                      </p>
                      <p
                        className="text-sm mt-1"
                        style={{ color: 'var(--color-text-navy)' }}
                      >
                        问题数量：
                        <span className="font-semibold">{item.count}</span>
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Scatter
              data={scatterData}
              shape={(props) => {
                const { cx, cy, payload } = props
                const size = 36
                const count = payload.count as number
                const fill = getHeatmapColor(count, maxCount)
                return (
                  <g>
                    <rect
                      x={cx - size / 2}
                      y={cy - size / 2}
                      width={size}
                      height={size}
                      rx={4}
                      fill={fill}
                      stroke="var(--color-bg-card)"
                      strokeWidth={1}
                      style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                    />
                    {count > 0 && (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={600}
                        fill={count >= maxCount * 0.6 ? '#ffffff' : 'var(--color-text-primary)'}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                )
              }}
            >
              {scatterData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getHeatmapColor(entry.count, maxCount)}
                />
              ))}
              <LabelList
                dataKey="count"
                position="center"
                content={(props) => {
                  const { x, y, value, index: idx } = props
                  const count = value as number
                  const entry = scatterData[idx as number]
                  if (!entry || count === 0) return null
                  const fill =
                    count >= maxCount * 0.6
                      ? '#ffffff'
                      : 'var(--color-text-primary)'
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontWeight={600}
                      fill={fill}
                    >
                      {count}
                    </text>
                  )
                }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
