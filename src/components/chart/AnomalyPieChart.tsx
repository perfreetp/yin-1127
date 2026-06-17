import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { AnomalyType } from '@/types'

export interface AnomalyPieItem {
  name: string
  value: number
  type: AnomalyType
}

interface AnomalyPieChartProps {
  data: AnomalyPieItem[]
  height?: number
  showLegend?: boolean
}

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  consecutive_no: '#1e3a5f',
  weekend: '#2d5a3d',
  duplicate: '#c44536',
  round_amount: '#d4a017',
  amount_mismatch: '#6b4f9e',
}

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  consecutive_no: '连号发票',
  weekend: '周末异常',
  duplicate: '重复报销',
  round_amount: '整数金额',
  amount_mismatch: '金额不符',
}

export default function AnomalyPieChart({
  data,
  height = 360,
  showLegend = true,
}: AnomalyPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
            stroke="var(--color-bg-card)"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={ANOMALY_COLORS[entry.type] || '#8884d8'}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as AnomalyPieItem
                const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
                return (
                  <div
                    className="rounded-lg shadow-lg px-4 py-3"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border-secondary)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ANOMALY_COLORS[item.type] }}
                      />
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {ANOMALY_LABELS[item.type] || item.name}
                      </p>
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      数量：
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.value}
                      </span>
                      <span className="ml-2">
                        ({percent}%)
                      </span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value: string, entry) => {
                const item = entry?.payload as AnomalyPieItem | undefined
                const label = item ? ANOMALY_LABELS[item.type] || item.name : value
                return (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {label}
                  </span>
                )
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ paddingBottom: showLegend ? 36 : 0 }}
      >
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          异常总数
        </p>
        <p
          className="text-3xl font-bold mt-1"
          style={{ color: 'var(--color-text-navy)' }}
        >
          {total}
        </p>
      </div>
    </div>
  )
}
