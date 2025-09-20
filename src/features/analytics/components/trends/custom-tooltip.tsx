
export const customTooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface-elevated)',
  border: '1px solid var(--color-accent)',
  borderRadius: 'var(--radius-md)',
  padding: '8px',
};

type ChartValue = number | string;
type PayloadItem = { name: string; value: ChartValue; color?: string };

interface Props {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string | number;
}

export function CustomTooltip({ active, payload, label }: Props) {
  if (active && payload && payload.length > 0) {
    return (
      <div style={customTooltipStyle}>
        <p className="text-[var(--color-text-primary)] font-semibold">{label}</p>
        {payload.map((entry, index) => {
          const { name, value, color } = entry;
          return (
            <p key={index} className="text-sm" style={{ color: color ?? '' }}>
              {name}: {value}
              {name.includes('Time') ? 'm' : name.includes('Rate') ? '%' : ''}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
}
