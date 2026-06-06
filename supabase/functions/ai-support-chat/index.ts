import { createClient } from "npm:@supabase/supabase-js@2.33.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Wealthora's friendly AI support assistant. Wealthora is an AI-powered investment platform offering trading bots, deposits/withdrawals via crypto, KYC verification, referrals, and daily returns.

Be concise, warm, and helpful. Answer questions about the platform, account, deposits, withdrawals, KYC, investment plans, and general support. If a request needs a human agent (account-specific issues, complaints, refunds), let the user know a human agent will follow up shortly.

Do not invent specific numbers, balances, or transaction statuses you don't know. Keep replies under 6 short sentences unless detail is required.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: msgs, error: msgErr } = await supabase
      .from("chat_messages")
      .select("sender_role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (msgErr) throw msgErr;

    const history = (msgs ?? []).map((m: any) => ({
      role: m.sender_role === "admin" ? "assistant" : "user",
      content: m.content,
    }));

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const reply: string = aiJson.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a reply.";

    const { data: inserted, error: insErr } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        sender_id: null,
        sender_role: "admin",
        content: reply,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ message: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-support-chat error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
