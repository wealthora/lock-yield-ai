import { memo, useEffect, useRef } from "react";

interface Props {
  /** TradingView symbol, e.g. "FX:EURUSD" or "BINANCE:BTCUSDT". */
  tvSymbol: string;
  /** TradingView interval string, e.g. "1", "5", "60". */
  interval: string;
  /** 1 = candles, 2 = bars, 3 = line, 4 = area. */
  chartStyle: "candles" | "area" | "line";
  theme?: "dark" | "light";
}

const STYLE_MAP: Record<Props["chartStyle"], string> = {
  candles: "1",
  line: "2",
  area: "3",
};

/**
 * Real TradingView Advanced Chart widget (live TradingView market data and
 * graphics). It runs inside TradingView's sandboxed iframe, so its quote stream
 * is display-only — Wealthora trade execution still settles on the platform
 * price feed shown in the chart header.
 */
function TradingViewAdvancedChartBase({ tvSymbol, interval, chartStyle, theme = "dark" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget h-full w-full";
    host.appendChild(inner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme,
      style: STYLE_MAP[chartStyle],
      locale: "en",
      autosize: true,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      withdateranges: false,
      details: false,
      backgroundColor: "rgba(0,0,0,0)",
      gridColor: "rgba(148,163,184,0.12)",
      support_host: "https://www.tradingview.com",
    });
    host.appendChild(script);

    return () => {
      host.innerHTML = "";
    };
  }, [tvSymbol, interval, chartStyle, theme]);

  return <div ref={hostRef} className="tradingview-widget-container h-full w-full" />;
}

export const TradingViewAdvancedChart = memo(TradingViewAdvancedChartBase);
