import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";
import { priceAt } from "../_shared/binary-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (stage: string, detail: unknown) =>
  console.log(`[binary-trade] ${stage}`, typeof detail === "string" ? detail : JSON.stringify(detail));

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function notify(userId: string, title: string, message: string, metadata: Record<string, unknown>) {
  try {
    await admin.rpc("create_notification", {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: "binary_options",
      p_metadata: metadata,
    });
  } catch (e) {
    log("notify_failed", String(e));
  }
}

/** Settle every expired open trade for a user. Idempotent. */
async function settleExpired(userId: string) {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await admin
    .from("binary_trades")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .lte("expires_at", nowIso);

  if (error) throw error;
  if (!due || due.length === 0) return [];

  const settled: any[] = [];

  for (const trade of due) {
    const { data: asset } = await admin
      .from("binary_assets")
      .select("symbol, base_price, volatility_level, category")
      .eq("symbol", trade.symbol)
      .maybeSingle();
    if (!asset) continue;

    const expiryMs = new Date(trade.expires_at).getTime();
    const exitPrice = priceAt(asset, expiryMs);
    const entryPrice = Number(trade.entry_price);

    let result: "win" | "loss" | "tie";
    if (exitPrice === entryPrice) result = "tie";
    else if (trade.direction === "call") result = exitPrice > entryPrice ? "win" : "loss";
    else result = exitPrice < entryPrice ? "win" : "loss";

    const stake = Number(trade.stake);
    const payout = result === "win" ? Number(trade.potential_payout) : result === "tie" ? stake : 0;
    const profitLoss = payout - stake;

    // Guard against double-settlement: only update rows still open.
    const { data: updated, error: upErr } = await admin
      .from("binary_trades")
      .update({
        status: "settled",
        result,
        exit_price: exitPrice,
        profit_loss: profitLoss,
        settled_at: new Date().toISOString(),
      })
      .eq("id", trade.id)
      .eq("status", "open")
      .select()
      .maybeSingle();

    if (upErr || !updated) {
      log("settle_skipped", { id: trade.id, upErr: upErr?.message });
      continue;
    }

    if (payout > 0) {
      const { data: wallet } = await admin
        .from("wallets")
        .select("available_balance")
        .eq("user_id", userId)
        .maybeSingle();
      await admin
        .from("wallets")
        .update({ available_balance: Number(wallet?.available_balance ?? 0) + payout })
        .eq("user_id", userId);
    }

    await admin.from("activities").insert({
      user_id: userId,
      activity_type: "binary_trade",
      description: `Binary ${trade.direction.toUpperCase()} on ${trade.symbol} — ${result.toUpperCase()}`,
      amount: profitLoss,
      status: "completed",
      metadata: { trade_id: trade.id, symbol: trade.symbol, result },
    });

    await notify(
      userId,
      result === "win" ? "Binary Trade Won" : result === "tie" ? "Binary Trade Refunded" : "Binary Trade Lost",
      result === "win"
        ? `Your ${trade.direction.toUpperCase()} on ${trade.symbol} won. $${payout.toFixed(2)} credited.`
        : result === "tie"
        ? `Your ${trade.direction.toUpperCase()} on ${trade.symbol} closed at entry. Stake refunded.`
        : `Your ${trade.direction.toUpperCase()} on ${trade.symbol} lost $${stake.toFixed(2)}.`,
      { trade_id: trade.id, symbol: trade.symbol, result }
    );

    settled.push(updated);
  }

  return settled;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "settle") {
      const settled = await settleExpired(userId);
      return json({ settled });
    }

    if (action !== "open") return json({ error: "Unknown action" }, 400);

    // ---- validate input ----
    const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
    const direction = body.direction === "call" || body.direction === "put" ? body.direction : null;
    const stake = Number(body.stake);
    const expirySeconds = Number(body.expiry_seconds);
    const quoteTs = Number(body.quote_ts);

    if (!symbol) return json({ error: "Asset is required" }, 400);
    if (!direction) return json({ error: "Direction must be call or put" }, 400);
    if (!Number.isFinite(stake) || stake <= 0) return json({ error: "Invalid stake amount" }, 400);
    if (!Number.isInteger(expirySeconds) || expirySeconds <= 0)
      return json({ error: "Invalid expiry time" }, 400);
    if (!Number.isFinite(quoteTs)) return json({ error: "A live quote is required" }, 400);

    const { data: settings } = await admin.from("binary_settings").select("*").limit(1).maybeSingle();
    if (settings && settings.trading_enabled === false)
      return json({ error: "Binary options trading is temporarily disabled" }, 403);

    const allowedExpiries: number[] = Array.isArray(settings?.expiry_options)
      ? (settings!.expiry_options as number[])
      : [];
    if (allowedExpiries.length && !allowedExpiries.includes(expirySeconds))
      return json({ error: "That expiry time is not available" }, 400);

    const { data: asset } = await admin
      .from("binary_assets")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle();
    if (!asset) return json({ error: "Unknown asset" }, 404);
    if (!asset.is_active || asset.is_suspended)
      return json({ error: `Trading on ${symbol} is currently suspended` }, 403);

    const minTrade = Math.max(Number(asset.min_trade), Number(settings?.global_min_trade ?? 1));
    const maxTrade = Math.min(Number(asset.max_trade), Number(settings?.global_max_trade ?? 5000));
    if (stake < minTrade) return json({ error: `Minimum trade is $${minTrade}` }, 400);
    if (stake > maxTrade) return json({ error: `Maximum trade is $${maxTrade}` }, 400);

    // Settle anything due first so balances and limits are accurate.
    await settleExpired(userId);

    const { data: openTrades } = await admin
      .from("binary_trades")
      .select("stake")
      .eq("user_id", userId)
      .eq("status", "open");

    const openCount = openTrades?.length ?? 0;
    const openExposure = (openTrades ?? []).reduce((s, t) => s + Number(t.stake), 0);
    if (settings && openCount >= Number(settings.max_open_trades))
      return json({ error: `You can hold at most ${settings.max_open_trades} open trades` }, 400);
    if (settings && openExposure + stake > Number(settings.max_user_exposure))
      return json({ error: "This trade would exceed your open exposure limit" }, 400);

    if (settings) {
      const { data: platformOpen } = await admin
        .from("binary_trades")
        .select("stake")
        .eq("status", "open");
      const platformExposure = (platformOpen ?? []).reduce((s, t) => s + Number(t.stake), 0);
      if (platformExposure + stake > Number(settings.max_platform_exposure))
        return json({ error: "Platform exposure limit reached. Please try again shortly." }, 503);
    }

    const { data: wallet } = await admin
      .from("wallets")
      .select("available_balance")
      .eq("user_id", userId)
      .maybeSingle();
    const balance = Number(wallet?.available_balance ?? 0);
    if (balance < stake) return json({ error: "Insufficient available balance" }, 400);

    const now = Date.now();
    const canonicalQuoteTs = Math.floor(quoteTs / 500) * 500;
    const quoteAge = now - canonicalQuoteTs;
    if (quoteAge < -500 || quoteAge > 3000)
      return json({ error: "Price changed before the trade was placed. Please try again." }, 409);
    // Fill from the exact quote tick shown in the browser, avoiding a different
    // entry when the network request crosses a 500 ms pricing boundary.
    const entryPrice = priceAt(asset, canonicalQuoteTs);
    const payoutPercent = Number(asset.payout_percent);
    const potentialPayout = Number((stake * (1 + payoutPercent / 100)).toFixed(2));

    const { error: debitErr } = await admin
      .from("wallets")
      .update({ available_balance: balance - stake })
      .eq("user_id", userId);
    if (debitErr) throw debitErr;

    const { data: trade, error: insErr } = await admin
      .from("binary_trades")
      .insert({
        user_id: userId,
        asset_id: asset.id,
        symbol: asset.symbol,
        category: asset.category,
        direction,
        stake,
        entry_price: entryPrice,
        payout_percent: payoutPercent,
        potential_payout: potentialPayout,
        expiry_seconds: expirySeconds,
        opened_at: new Date(now).toISOString(),
        expires_at: new Date(now + expirySeconds * 1000).toISOString(),
        status: "open",
      })
      .select()
      .single();

    if (insErr) {
      // Refund on failure so the user is never charged for a trade that does not exist.
      await admin.from("wallets").update({ available_balance: balance }).eq("user_id", userId);
      throw insErr;
    }

    await admin.from("activities").insert({
      user_id: userId,
      activity_type: "binary_trade",
      description: `Binary ${direction.toUpperCase()} opened on ${asset.symbol}`,
      amount: -stake,
      status: "pending",
      metadata: { trade_id: trade.id, symbol: asset.symbol },
    });

    await notify(
      userId,
      "Binary Trade Opened",
      `${direction.toUpperCase()} on ${asset.symbol} for $${stake.toFixed(2)} — expires in ${expirySeconds}s.`,
      { trade_id: trade.id, symbol: asset.symbol }
    );

    log("opened", { userId, symbol: asset.symbol, direction, stake, expirySeconds });
    return json({ trade });
  } catch (e) {
    log("error", String(e));
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
