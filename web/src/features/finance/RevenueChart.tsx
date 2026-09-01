import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FinanceTrendPoint } from './types';

interface RevenueChartProps {
  trend: FinanceTrendPoint[];
  /** Provider view has no platform commission line of its own interest —
   * still shown for transparency, but net is the headline series. Admin
   * view shows all three at equal weight. */
  netOnly?: boolean;
}

function formatTick(label: string) {
  return new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Real recorded points only — one bucket per day across the requested
// range, aggregated server-side from FinancialTransaction rows. Never an
// estimate: a day with no completed bookings is a real zero, not omitted.
export function RevenueChart({ trend, netOnly = false }: RevenueChartProps) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={trend.map((p) => ({ ...p, label: formatTick(p.label) }))}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {!netOnly && (
            <Line
              type="linear"
              dataKey="gross"
              name="Gross"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          )}
          {!netOnly && (
            <Line
              type="linear"
              dataKey="commission"
              name="Commission"
              stroke="var(--warning)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          )}
          <Line
            type="linear"
            dataKey="net"
            name="Net"
            stroke="var(--success)"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
