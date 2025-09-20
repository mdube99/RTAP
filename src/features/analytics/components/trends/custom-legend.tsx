import type { LegendPayload } from 'recharts';

interface Props {
  payload?: LegendPayload[];
}

export function CustomLegend({ payload }: Props) {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="w-full flex flex-wrap justify-center items-center gap-4">
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: entry.color ?? 'var(--color-border)' }}
          />
          <span className="text-xs sm:text-sm text-[var(--color-text-primary)]">{String(entry.value ?? '')}</span>
        </div>
      ))}
    </div>
  );
}
