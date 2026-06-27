'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ActivityData {
  date: string   // format "DD/MM"
  sms: number
}

interface ActivityChartProps {
  data: ActivityData[]
}

// Tooltip personnalisé en dark mode
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-foreground-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value.toLocaleString('fr-FR')}{' '}
        <span className="font-normal text-foreground-muted">SMS</span>
      </p>
    </div>
  )
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const isEmpty = data.every((d) => d.sms === 0)

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-syne font-semibold text-sm text-foreground">
            Activité SMS
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            30 derniers jours
          </p>
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <div className="w-3 h-0.5 rounded-full bg-primary" />
            SMS envoyés
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-foreground-subtle text-center">
            Aucune activité sur les 30 derniers jours.
            <br />
            <span className="text-primary">Envoyez votre premier SMS !</span>
          </p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradientSMS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E1E2E"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fill: '#475569', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="sms"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#gradientSMS)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#00D4FF',
                  stroke: '#111118',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
