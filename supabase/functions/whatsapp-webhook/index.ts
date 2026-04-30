// WhatsApp Business Cloud API webhook (SCAFFOLDED).
// To activate: add WHATSAPP_TOKEN, WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_ID secrets,
// then point Meta webhook to https://<project>.supabase.co/functions/v1/whatsapp-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);

  // Webhook verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verify = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && token && verify && token === verify) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
  const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return new Response(JSON.stringify({ ok: false, reason: "WhatsApp not configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    if (!msg?.from || !msg?.text?.body) return new Response("ok", { status: 200 });

    const { data: persona } = await supabase.from("agent_personality").select("owner_id").eq("enabled", true).limit(1).maybeSingle();
    if (!persona) return new Response("ok", { status: 200 });
    const ownerId = persona.owner_id;

    const { data: account } = await supabase.from("platform_accounts").upsert({
      owner_id: ownerId, platform: "whatsapp", external_id: msg.from,
      display_name: entry?.contacts?.[0]?.profile?.name ?? msg.from,
    }, { onConflict: "owner_id,platform,external_id" }).select().single();

    let { data: conv } = await supabase.from("conversations").select("*").eq("platform_account_id", account!.id).maybeSingle();
    if (!conv) {
      const { data: c } = await supabase.from("conversations").insert({
        owner_id: ownerId, platform_account_id: account!.id, platform: "whatsapp",
      }).select().single();
      conv = c;
    }

    const replyRes = await fetch(`${supabaseUrl}/functions/v1/agent-reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg.text.body, platform: "whatsapp", platformAccountId: account!.id, conversationId: conv!.id, ownerId }),
    });
    const reply = await replyRes.json();

    if (reply.reply) {
      await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: msg.from, text: { body: reply.reply } }),
      });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
