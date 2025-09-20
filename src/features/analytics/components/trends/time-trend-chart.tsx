"use client";

import { useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export function TimeTrendChart({ data, dataKey, name, title, color, icon: Icon }: Props) {
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
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="var(--color-text-muted)"
              style={{ fontSize: '12px' }}
              label={{ value: 'Response Time (minutes)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 5 }}
              activeDot={{ r: 7, stroke: color, strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
