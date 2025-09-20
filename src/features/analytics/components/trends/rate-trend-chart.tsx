"use client";

import { useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportToPngButton } from '@features/shared/export';
import { CustomTooltip } from './custom-tooltip';
import { CustomLegend } from './custom-legend';
import type { TrendPoint } from './use-trends-data';
import type { LucideIcon } from 'lucide-react';

interface Props {
  data: TrendPoint[];
  dataKey: keyof TrendPoint;
  name: string;
  title: string;
  color: string;
  icon: LucideIcon;
}

export function RateTrendChart({ data, dataKey, name, title, color, icon: Icon }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Icon className="w-6 h-6" style={{ color }} />
            {title}
          </CardTitle>
          <CardDescription>Grouped by technique execution end time.</CardDescription>
        </div>
        <ExportToPngButton
          targetRef={cardRef}
          fileName={`trends-${name.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="var(--color-text-muted)"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={3}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
