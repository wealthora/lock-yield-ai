import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BinaryAssetSelector } from "@/components/binary/BinaryAssetSelector";
import { BinaryTickerStrip } from "@/components/binary/BinaryTickerStrip";

import { BinaryChart } from "@/components/binary/BinaryChart";
import { BinaryTradePanel } from "@/components/binary/BinaryTradePanel";
import { BinaryAIInsights } from "@/components/binary/BinaryAIInsights";
import { ActiveBinaryTrades } from "@/components/binary/ActiveBinaryTrades";
import { BinaryTradeHistory } from "@/components/binary/BinaryTradeHistory";
import { BinaryPerformance } from "@/components/binary/BinaryPerformance";
import { useBinaryPrices, useNow } from "@/hooks/useBinaryPrices";
import type { BinaryAsset, BinarySettings, BinaryTrade } from "@/lib/binaryTypes";

export default function BinaryOptions() {
  const [assets, setAssets] = useState<BinaryAsset[]>([]);
  const [settings, setSettings] = useState<BinarySettings | null>(null);
  const [trades, setTrades] = useState<BinaryTrade[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const now = useNow(1000);

  const prices = useBinaryPrices(assets);

  const loadBalance = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", uid)
      .maybeSingle();
    setBalance(Number(data?.available_balance ?? 0));
  }, []);

  const loadTrades = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("binary_trades")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(500);
    setTrades((data ?? []) as unknown as BinaryTrade[]);
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [assetRes, settingRes] = await Promise.all([
        supabase.from("binary_assets").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("binary_settings").select("*").limit(1).maybeSingle(),
      ]);

      const list = (assetRes.data ?? []) as unknown as BinaryAsset[];
      setAssets(list);
      setSettings(settingRes.data as unknown as BinarySettings | null);
      setSelected((prev) => prev || list[0]?.symbol || "");

      if (!user) return;
      setUserId(user.id);
      const { data: favs } = await supabase.from("binary_favorites").select("symbol").eq("user_id", user.id);
      setFavorites((favs ?? []).map((f) => f.symbol));
      await Promise.all([loadBalance(user.id), loadTrades(user.id)]);
    })();
  }, [loadBalance, loadTrades]);

  const activeTrades = useMemo(() => trades.filter((t) => t.status === "open"), [trades]);

  // Ask the backend to settle anything that has expired.
  useEffect(() => {
    if (!userId) return;
    const due = activeTrades.some((t) => new Date(t.expires_at).getTime() <= now);
    if (!due) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("binary-trade", { body: { action: "settle" } });
      if (cancelled || error) return;
      const settled = (data as { settled?: BinaryTrade[] })?.settled ?? [];
      for (const t of settled) {
        if (t.result === "win") toast.success(`${t.symbol} ${t.direction.toUpperCase()} won +$${Number(t.profit_loss).toFixed(2)}`);
        else if (t.result === "loss") toast.error(`${t.symbol} ${t.direction.toUpperCase()} lost $${Number(t.stake).toFixed(2)}`);
        else toast.info(`${t.symbol} closed at entry — stake refunded`);
      }
      await Promise.all([loadTrades(userId), loadBalance(userId)]);
    })();
    return () => {
      cancelled = true;
    };
  }, [now, activeTrades, userId, loadTrades, loadBalance]);

  const toggleFavorite = async (symbol: string) => {
    if (!userId) return;
    if (favorites.includes(symbol)) {
      setFavorites((f) => f.filter((s) => s !== symbol));
      await supabase.from("binary_favorites").delete().eq("user_id", userId).eq("symbol", symbol);
    } else {
      setFavorites((f) => [...f, symbol]);
      await supabase.from("binary_favorites").insert({ user_id: userId, symbol });
    }
  };

  const placeTrade = async (direction: "call" | "put", stake: number, expirySeconds: number) => {
    setPlacing(true);
    try {
      const { data, error } = await supabase.functions.invoke("binary-trade", {
        body: { action: "open", symbol: selected, direction, stake, expiry_seconds: expirySeconds },
      });
      const payload = data as { trade?: BinaryTrade; error?: string } | null;
      if (error || payload?.error) {
        toast.error(payload?.error ?? error?.message ?? "Could not place trade");
        return;
      }
      toast.success(`${direction.toUpperCase()} placed on ${selected}`);
      if (userId) await Promise.all([loadTrades(userId), loadBalance(userId)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place trade");
    } finally {
      setPlacing(false);
    }
  };

  const asset = assets.find((a) => a.symbol === selected);

  return (
    <div className="space-y-4 animate-fade-in">
      <header className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">Binary Options</h1>
          <p className="text-xs text-muted-foreground">
            Short-term CALL / PUT trading on forex, crypto and synthetic indices.
          </p>
        </div>
      </header>

      {settings && !settings.trading_enabled && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive mt-px shrink-0" />
          <p className="text-xs text-destructive">Binary options trading is temporarily disabled by the platform.</p>
        </div>
      )}

      <BinaryTickerStrip
        assets={tickerAssets}
        prices={prices}
        selected={selected}
        favorites={favorites}
        onSelect={setSelected}
        onToggleFavorite={toggleFavorite}
      />

      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div className="h-[420px] xl:h-auto xl:max-h-[calc(100vh-9rem)] xl:sticky xl:top-20">

          <BinaryAssetSelector
            assets={assets}
            prices={prices}
            selected={selected}
            favorites={favorites}
            onSelect={setSelected}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        <div className="space-y-3 min-w-0">
          {asset ? (
            <BinaryChart asset={asset} live={prices[asset.symbol]} />
          ) : (
            <div className="glass-panel rounded-xl border border-border/60 h-[340px]" />
          )}

          <Tabs defaultValue="active">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
              <TabsTrigger value="active" className="text-xs">
                Active ({activeTrades.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                History
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                Performance
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-3">
              <ActiveBinaryTrades trades={activeTrades} assets={assets} prices={prices} />
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              <BinaryTradeHistory trades={trades} />
            </TabsContent>
            <TabsContent value="performance" className="mt-3">
              <BinaryPerformance trades={trades} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          {asset && (
            <>
              <BinaryTradePanel
                asset={asset}
                live={prices[asset.symbol]}
                settings={settings}
                balance={balance}
                placing={placing}
                onPlace={placeTrade}
              />
              <BinaryAIInsights asset={asset} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
