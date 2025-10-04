import { useEffect, useRef } from 'react';

const MarketTicker = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  // Easy-to-update symbols configuration
  const symbols = [
    // Forex
    { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
    { proName: "FX_IDC:GBPUSD", title: "GBP/USD" },
    { proName: "FX_IDC:USDJPY", title: "USD/JPY" },
    { proName: "FX_IDC:USDCHF", title: "USD/CHF" },
    { proName: "FX_IDC:AUDUSD", title: "AUD/USD" },
    // Commodities
    { proName: "OANDA:XAUUSD", title: "GOLD" },
    { proName: "OANDA:XAGUSD", title: "SILVER" },
    { proName: "TVC:USOIL", title: "CRUDE OIL" },
    // Indices
    { proName: "SP:SPX", title: "S&P 500" },
    { proName: "NASDAQ:NDX", title: "NASDAQ 100" },
    { proName: "DJ:DJI", title: "DOW JONES" },
    { proName: "TVC:UKX", title: "FTSE 100" },
  ];

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols,
      showSymbolLogo: true,
      colorTheme: "light",
      isTransparent: false,
      displayMode: "adaptive",
      locale: "en"
    });

    containerRef.current.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      scriptLoaded.current = false;
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-border">
      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  );
};

export default MarketTicker;
