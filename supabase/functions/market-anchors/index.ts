import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";
import { fetchTwelveDataPrices, twelveDataSymbol } from "../_shared/twelve-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (stage: string, detail: unknown) =>
  console.log(`[market-anchors] ${stage}`, typeof detail === "string" ? detail : JSON.stringify(detail));

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

/**
 * Free-plan request budget (8 credits/minute, 800 credits/day).
 * The staleness-ordered rotation refreshes a few symbols at a time, which keeps
 * every instrument anchored to a real price without ever exhausting the quota.
 */
const BATCH_SIZE = 4;
const MIN_GAP_MS = 8 * 60 * 1000;
const DAY_BUDGET = 720;
const MINUTE_BUDGET = 8;

async function refresh(): Promise<{ refreshed: string[]; skipped?: string }> {
  const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");
  if (!apiKey) return { refreshed: [], skipped: "missing_api_key" };

  const { data: state } = await admin.from("market_feed_state").select("*").eq("id", 1).maybeSingle();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const lastCall = state?.last_call_at ? new Date(state.last_call_at).getTime() : 0;
  if (now.getTime() - lastCall < MIN_GAP_MS) return { refreshed: [], skipped: "throttled" };

  const minuteStart = state?.minute_start ? new Date(state.minute_start).getTime() : 0;
  const sameMinute = now.getTime() - minuteStart < 60_000;
  const minuteCredits = sameMinute ? Number(state?.minute_credits ?? 0) : 0;
  const sameDay = state?.day_start === today;
  const dayCredits = sameDay ? Number(state?.day_credits ?? 0) : 0;

  if (dayCredits + BATCH_SIZE > DAY_BUDGET) return { refreshed: [], skipped: "daily_budget" };
  if (minuteCredits + BATCH_SIZE > MINUTE_BUDGET) return { refreshed: [], skipped: "minute_budget" };

  const { data: assets } = await admin
    .from("binary_assets")
    .select("symbol, category, is_active")
    .eq("is_active", true);

  const mapped = (assets ?? [])
    .map((a) => ({ symbol: a.symbol as string, provider: twelveDataSymbol(a as { symbol: string; category: string }) }))
    .filter((a): a is { symbol: string; provider: string } => a.provider !== null);

  if (mapped.length === 0) return { refreshed: [], skipped: "no_symbols" };

  // Oldest anchors first so every instrument gets refreshed in rotation.
  const { data: existing } = await admin.from("market_anchors").select("symbol, updated_at");
  const seen = new Map((existing ?? []).map((r) => [r.symbol as string, new Date(r.updated_at as string).getTime()]));
  const queue = [...mapped].sort((a, b) => (seen.get(a.symbol) ?? 0) - (seen.get(b.symbol) ?? 0));
  const batch = queue.slice(0, BATCH_SIZE);

  const providerSymbols = [...new Set(batch.map((b) => b.provider))];
  let prices: Record<string, number> = {};
  try {
    prices = await fetchTwelveDataPrices(providerSymbols, apiKey);
  } catch (e) {
    log("fetch_failed", String(e));
  }

  const anchorTs = new Date().toISOString();
  const rows = batch
    .filter((b) => prices[b.provider] !== undefined)
    .map((b) => ({
      symbol: b.symbol,
      provider_symbol: b.provider,
      price: prices[b.provider],
      anchor_ts: anchorTs,
      updated_at: anchorTs,
    }));

  if (rows.length > 0) {
    const { error } = await admin.from("market_anchors").upsert(rows, { onConflict: "symbol" });
    if (error) log("upsert_failed", error.message);
  }

  await admin.from("market_feed_state").upsert({
    id: 1,
    last_call_at: anchorTs,
    minute_start: sameMinute ? state?.minute_start ?? anchorTs : anchorTs,
    minute_credits: minuteCredits + providerSymbols.length,
    day_start: today,
    day_credits: dayCredits + providerSymbols.length,
  });

  return { refreshed: rows.map((r) => r.symbol) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const result = await refresh();
    const { data: anchors } = await admin.from("market_anchors").select("symbol, price, anchor_ts");
    return json({ ...result, anchors: anchors ?? [] });
  } catch (e) {
    log("error", String(e));
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
