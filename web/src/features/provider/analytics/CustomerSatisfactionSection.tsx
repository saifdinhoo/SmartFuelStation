import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { RatingDistributionPoint } from './types';

interface CustomerSatisfactionSectionProps {
  // null when the business has no reviews at all — shown as a dash rather
  // than a fabricated 0.0, which would read as "rated badly".
  averageRating: number | null;
  distribution: RatingDistributionPoint[];
}

export function CustomerSatisfactionSection({
  averageRating,
  distribution,
}: CustomerSatisfactionSectionProps) {
  const chartData = [...distribution]
    .sort((a, b) => b.stars - a.stars)
    .map((point) => ({ ...point, label: `${point.stars}★` }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Star className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Customer Satisfaction</h2>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:w-40">
            <p className="text-heading-1">
              {averageRating === null ? '—' : averageRating.toFixed(1)}
            </p>
            <div className="flex items-center gap-0.5 text-warning">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4"
                  fill={averageRating !== null && i < Math.round(averageRating) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <p className="text-caption text-muted-foreground">
              {averageRating === null ? 'No reviews yet' : 'Average rating'}
            </p>
          </div>

          <div className="h-48 w-full flex-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
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
                  dataKey="label"
                  width={32}
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
                <Bar dataKey="count" fill="var(--warning)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
