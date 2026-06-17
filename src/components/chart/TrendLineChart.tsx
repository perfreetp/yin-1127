import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts'
import type { AnomalyLevel } from '@/types'

export interface TrendLineItem {
  month: string
  high: number
  medium: number
  low: number
  total: number
}

interface TrendLineChartProps {
  data: TrendLineItem[]
  height?: number
  showLegend?: boolean
  showArea?: boolean
}

const LEVEL_COLORS: Record<AnomalyLevel | 'total', string> = {
  high: '#c44536',
  medium: '#d4a017',
  low: '#2d5a3d',
  total: '#1e3a5f',
}

const LEVEL_LABELS: Record<AnomalyLevel | 'total', string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  total: '总计',
}

export default function TrendLineChart({
  data,
  height = 360,
  showLegend = true,
  showArea = true,
}: TrendLineChartProps) {
  return (
    <div className="w-full h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: showLegend ? 10 : 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={LEVEL_COLORS.total}
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor={LEVEL_COLORS.total}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={LEVEL_COLORS.high}
                stopOpacity={0.1}
              />
              <stop
                offset="95%"
                stopColor={LEVEL_COLORS.high}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-tertiary)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border-primary)' }}
            tickLine={{ stroke: 'var(--color-border-primary)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--color-border-primary)' }}
            tickLine={{ stroke: 'var(--color-border-primary)' }}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div
                    className="rounded-lg shadow-lg px-4 py-3"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border-secondary)',
                      minWidth: 160,
                    }}
                  >
                    <p
                      className="text-sm font-medium mb-2 pb-2 border-b"
                      style={{
                        color: 'var(--color-text-primary)',
                        borderColor: 'var(--color-border-tertiary)',
                      }}
                    >
                      {label}
                    </p>
                    {payload
                      .filter((p) => p.dataKey !== 'total')
                      .map((entry, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-4 py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  LEVEL_COLORS[
                                    entry.dataKey as AnomalyLevel | 'total'
                                  ],
                              }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {LEVEL_LABELS[
                                entry.dataKey as AnomalyLevel | 'total'
                              ]}
                            </span>
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    <div
                      className="flex items-center justify-between gap-4 pt-2 mt-2 border-t"
                      style={{ borderColor: 'var(--color-border-tertiary)' }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: LEVEL_COLORS.total }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {LEVEL_LABELS.total}
                        </span>
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: LEVEL_COLORS.total }}
                      >
                        {payload.find((p) => p.dataKey === 'total')?.value || 0}
                      </span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              formatter={(value: string) => (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {LEVEL_LABELS[value as AnomalyLevel | 'total'] || value}
                </span>
              )}
            />
          )}
          {showArea && (
            <Area
              type="monotone"
              dataKey="total"
              stroke="transparent"
              fill="url(#colorTotal)"
              name="total"
            />
          )}
          <Line
            type="monotone"
            dataKey="total"
            name="total"
            stroke={LEVEL_COLORS.total}
            strokeWidth={2.5}
            dot={{
              fill: LEVEL_COLORS.total,
              stroke: 'var(--color-bg-card)',
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              stroke: 'var(--color-bg-card)',
              strokeWidth: 2,
            }}
          />
          <Line
            type="monotone"
            dataKey="high"
            name="high"
            stroke={LEVEL_COLORS.high}
            strokeWidth={2}
            dot={{
              fill: LEVEL_COLORS.high,
              stroke: 'var(--color-bg-card)',
              strokeWidth: 2,
              r: 3,
            }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="medium"
            name="medium"
            stroke={LEVEL_COLORS.medium}
            strokeWidth={2}
            dot={{
              fill: LEVEL_COLORS.medium,
              stroke: 'var(--color-bg-card)',
              strokeWidth: 2,
              r: 3,
            }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="low"
            name="low"
            stroke={LEVEL_COLORS.low}
            strokeWidth={2}
            dot={{
              fill: LEVEL_COLORS.low,
              stroke: 'var(--color-bg-card)',
              strokeWidth: 2,
              r: 3,
            }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
