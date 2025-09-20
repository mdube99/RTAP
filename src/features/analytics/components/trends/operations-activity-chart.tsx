"use client";

import { useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportToPngButton } from '@features/shared/export';
import type { TrendPoint } from './use-trends-data';
import { CustomTooltip } from './custom-tooltip';
import { CustomLegend } from './custom-legend';

interface Props {
  data: TrendPoint[];
}

export function OperationsActivityChart({ data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[var(--color-accent)]" />
            Operation Activity
          </CardTitle>
          <CardDescription>Counted by operation end date.</CardDescription>
        </div>
        <ExportToPngButton targetRef={cardRef} fileName="trends-operation-activity" />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
            <YAxis stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="operations" name="Operations" fill="var(--status-info-fg)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
