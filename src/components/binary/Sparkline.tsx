interface Props {
  values: number[];
  up: boolean;
  className?: string;
  width?: number;
  height?: number;
}

/** Lightweight inline SVG sparkline — no chart library, cheap enough for long watchlists. */
export function Sparkline({ values, up, className, width = 64, height = 22 }: Props) {
  if (values.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * (height - 2) - 1).toFixed(2)}`)
    .join(" ");

  const stroke = up ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
