export const EXPIRY_OPTIONS = [
  { seconds: 5, label: "5s" },
  { seconds: 10, label: "10s" },
  { seconds: 15, label: "15s" },
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "1m" },
  { seconds: 120, label: "2m" },
  { seconds: 180, label: "3m" },
  { seconds: 300, label: "5m" },
  { seconds: 600, label: "10m" },
  { seconds: 900, label: "15m" },
  { seconds: 1800, label: "30m" },
  { seconds: 3600, label: "1H" },
];

export const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100];

export const CHART_TIMEFRAMES = [
  { id: "1s", label: "1s", stepMs: 1000, tvInterval: "1" },
  { id: "5s", label: "5s", stepMs: 5000, tvInterval: "1" },
  { id: "15s", label: "15s", stepMs: 15000, tvInterval: "1" },
  { id: "30s", label: "30s", stepMs: 30000, tvInterval: "1" },
  { id: "1m", label: "1m", stepMs: 60000, tvInterval: "1" },
  { id: "5m", label: "5m", stepMs: 300000, tvInterval: "5" },
  { id: "15m", label: "15m", stepMs: 900000, tvInterval: "15" },
  { id: "1H", label: "1H", stepMs: 3600000, tvInterval: "60" },
];

export const ASSET_CATEGORIES = [
  { id: "forex", label: "Forex" },
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "indices", label: "Indices" },
  { id: "stocks", label: "Stocks" },
  { id: "synthetic", label: "Synthetics" },
  { id: "otc", label: "OTC" },
];


export function expiryLabel(seconds: number): string {
  const found = EXPIRY_OPTIONS.find((e) => e.seconds === seconds);
  if (found) return found.label;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}H`;
}

export function formatCountdown(msRemaining: number): string {
  const total = Math.max(0, Math.ceil(msRemaining / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}
