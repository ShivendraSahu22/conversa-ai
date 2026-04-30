// Telegram poll worker (scaffolded). Activated once TELEGRAM_API_KEY is present
// (via the Telegram connector). Until then it returns a no-op message so the
// system stays healthy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    return new Response(JSON.stringify({ ok: false, reason: "Telegram connector not linked yet" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // NOTE: this scaffold doesn't yet know which workspace owner the bot belongs to.
  // In production, store an owner_id alongside the bot connection or use a single-tenant assumption.
  // For now we fetch the first user with an enabled personality:
  const { data: persona } = await supabase.from("agent_personality").select("owner_id").eq("enabled", true).limit(1).maybeSingle();
  if (!persona) return new Response(JSON.stringify({ ok: true, processed: 0, note: "no enabled owner" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const ownerId = persona.owner_id;

  // simple state stored in agent_logs for offset
  const { data: stateRow } = await supabase.from("agent_logs").select("*").eq("event", "telegram_offset").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let offset = stateRow?.payload?.offset ?? 0;

  const res = await fetch(`${GATEWAY}/getUpdates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TELEGRAM_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ offset, timeout: 25, allowed_updates: ["message"] }),
  });
  const data = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const updates = data.result ?? [];
  let processed = 0;

  for (const u of updates) {
    const msg = u.message;
    if (!msg?.text) continue;
    const chatId = String(msg.chat.id);
    const displayName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || msg.from?.username || chatId;

    // upsert platform account
    const { data: account } = await supabase.from("platform_accounts").upsert({
      owner_id: ownerId, platform: "telegram", external_id: chatId,
      display_name: displayName, username: msg.from?.username,
    }, { onConflict: "owner_id,platform,external_id" }).select().single();

    // upsert conversation
    let { data: conv } = await supabase.from("conversations").select("*").eq("platform_account_id", account!.id).maybeSingle();
    if (!conv) {
      const { data: c } = await supabase.from("conversations").insert({
        owner_id: ownerId, platform_account_id: account!.id, platform: "telegram", title: displayName,
      }).select().single();
      conv = c;
    }

    // call agent-reply
    const replyRes = await fetch(`${supabaseUrl}/functions/v1/agent-reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg.text, platform: "telegram", platformAccountId: account!.id, conversationId: conv!.id, ownerId }),
    });
    const replyData = await replyRes.json();

    if (replyData.reply) {
      // simulate typing
      await fetch(`${GATEWAY}/sendChatAction`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TELEGRAM_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: msg.chat.id, action: "typing" }),
      }).catch(() => {});
      await new Promise((r) => setTimeout(r, Math.min(replyData.typingDelayMs ?? 800, 3500)));
      await fetch(`${GATEWAY}/sendMessage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TELEGRAM_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: msg.chat.id, text: replyData.reply }),
      });
    }
    processed++;
    offset = u.update_id + 1;
  }

  if (processed > 0) {
    await supabase.from("agent_logs").insert({ owner_id: ownerId, event: "telegram_offset", payload: { offset } });
  }

  return new Response(JSON.stringify({ ok: true, processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
