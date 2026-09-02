import { useEffect, useMemo, useRef, useState } from "react";
import { binanceSymbol } from "@/lib/marketData";
import type { BinaryAsset } from "@/lib/binaryTypes";

export interface RealTick {
  price: number;
  bid: number;
  ask: number;
  change24h: number;
  ts: number;
}

/**
 * Live Binance market data (the same feed TradingView charts render) for every
 * asset that has a real pair. Streams over one websocket and is the source of
 * truth for both the chart and trade execution on those assets.
 */
export function useRealMarketPrices(assets: BinaryAsset[]) {
  const [ticks, setTicks] = useState<Record<string, RealTick>>({});
  const bufferRef = useRef<Record<string, RealTick>>({});

  const pairs = useMemo(() => {
    const map: Record<string, string> = {}; // binance pair -> asset symbol
    for (const asset of assets) {
      const pair = binanceSymbol(asset);
      if (pair) map[pair.toLowerCase()] = asset.symbol;
    }
    return map;
  }, [assets]);

  const key = Object.keys(pairs).sort().join(",");

  useEffect(() => {
    const lowerPairs = Object.keys(pairs);
    if (lowerPairs.length === 0) {
      setTicks({});
      return;
    }

    let socket: WebSocket | null = null;
    let closed = false;
    let retry: number | undefined;

    const connect = () => {
      const streams = lowerPairs.flatMap((p) => [`${p}@ticker`, `${p}@bookTicker`]).join("/");
      socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data as string);
          const data = frame?.data;
          const pair = String(data?.s ?? "").toLowerCase();
          const symbol = pairs[pair];
          if (!symbol) return;

          const previous = bufferRef.current[symbol];
          const bid = data.b !== undefined ? Number(data.b) : previous?.bid;
          const ask = data.a !== undefined ? Number(data.a) : previous?.ask;
          const last = data.c !== undefined ? Number(data.c) : undefined;
          const mid = last ?? (bid && ask ? (bid + ask) / 2 : previous?.price);
          if (!mid || !Number.isFinite(mid)) return;

          bufferRef.current[symbol] = {
            price: mid,
            bid: bid ?? mid,
            ask: ask ?? mid,
            change24h: data.P !== undefined ? Number(data.P) : previous?.change24h ?? 0,
            ts: Date.now(),
          };
        } catch {
          /* ignore malformed frame */
        }
      };

      socket.onclose = () => {
        if (closed) return;
        retry = window.setTimeout(connect, 2000);
      };
    };

    connect();
    const flush = window.setInterval(() => setTicks({ ...bufferRef.current }), 250);

    return () => {
      closed = true;
      window.clearInterval(flush);
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ticks;
}
