import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { ProviderCategoryPoint } from './types';

export function ProviderCategoryChart({ data }: { data: ProviderCategoryPoint[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <PieChart className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Provider Category Distribution</h2>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--muted)' }}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
