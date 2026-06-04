import { useEffect, useRef, memo } from "react";

interface Props {
  symbol: string; // e.g. "BINANCE:BTCUSDT"
  title: string;
  ticker: string;
}

function TradingViewTickerBase({ symbol, title, ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      height: "100%",
      locale: "en",
      dateRange: "1D",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
      chartOnly: false,
      noTimeScale: true,
    });
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <p className="text-[10px] text-muted-foreground">{ticker}</p>
        </div>
      </div>
      <div className="h-[130px] w-full">
        <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
      </div>
    </div>
  );
}

export const TradingViewTicker = memo(TradingViewTickerBase);
