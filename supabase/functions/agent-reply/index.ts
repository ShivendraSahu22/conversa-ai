// Multi-agent reply pipeline: Planner -> Analyzer -> Memory -> Communicator
// Uses Lovable AI Gateway. Logs full trace to agent_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function aiJson(systemPrompt: string, userPrompt: string, schemaName: string, schema: any, apiKey: string) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{ type: "function", function: { name: schemaName, description: "Return structured output", parameters: schema } }],
      tool_choice: { type: "function", function: { name: schemaName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("no tool call");
  return JSON.parse(args);
}

async function aiText(systemPrompt: string, userPrompt: string, apiKey: string) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { message, platform = "playground", platformAccountId, conversationId, ownerId: bodyOwnerId, playground, playgroundConvId, history = [], overrideSystemPrompt, overrideTone } = body;

    // resolve owner from auth header (playground) or body (server-side trigger)
    let ownerId = bodyOwnerId as string | undefined;
    if (!ownerId) {
      const auth = req.headers.get("Authorization");
      if (auth?.startsWith("Bearer ")) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
        const { data } = await userClient.auth.getUser();
        ownerId = data.user?.id;
      }
    }
    if (!ownerId) throw new Error("no owner");

    // load personality
    const { data: persona } = await supabase.from("agent_personality").select("*").eq("owner_id", ownerId).maybeSingle();
    const agentName = persona?.agent_name ?? "Aria";
    const systemBase = overrideSystemPrompt ?? persona?.system_prompt ?? "You are a warm, casual AI assistant.";
    const tone = overrideTone ?? persona?.default_tone ?? "friendly";
    const langs = (persona?.languages ?? ["en"]).join(", ");

    // load memory + recent messages for context
    let memoryFacts: any[] = [];
    let recentMessages: any[] = history;
    if (!playground && conversationId) {
      const { data: m } = await supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(12);
      recentMessages = (m ?? []).reverse();
      if (platformAccountId) {
        const { data: mem } = await supabase.from("long_term_memory").select("key, value").eq("platform_account_id", platformAccountId).order("importance", { ascending: false }).limit(15);
        memoryFacts = mem ?? [];
      }
    }

    const conversationContext = recentMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
    const memoryContext = memoryFacts.map((m) => `- ${m.key}: ${m.value}`).join("\n") || "(none)";

    // ─── 1. PLANNER ────────────────────────────────────────────
    const planner = await aiJson(
      `You are the Planner agent. Analyze the user's intent and decide the response strategy. Respond ONLY via the tool.`,
      `Conversation so far:\n${conversationContext}\n\nUser just said: "${message}"\n\nIdentify intent and steps.`,
      "plan",
      {
        type: "object",
        properties: {
          intent: { type: "string", description: "short user intent" },
          steps: { type: "array", items: { type: "string" }, description: "1-3 reasoning steps" },
          needs_followup: { type: "boolean" },
          response_length: { type: "string", enum: ["short", "medium", "long"] },
        },
        required: ["intent", "steps", "response_length"],
        additionalProperties: false,
      },
      apiKey,
    );

    // ─── 2. ANALYZER ───────────────────────────────────────────
    const analyzer = await aiJson(
      `You are the Analyzer agent. Detect emotion, language, and any subtopics. Respond ONLY via the tool.`,
      `User message: "${message}"`,
      "analyze",
      {
        type: "object",
        properties: {
          emotion: { type: "string", enum: ["neutral", "happy", "curious", "confused", "angry", "sad", "anxious", "excited"] },
          language: { type: "string", description: "ISO code like en, hi" },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          topics: { type: "array", items: { type: "string" } },
        },
        required: ["emotion", "language", "urgency"],
        additionalProperties: false,
      },
      apiKey,
    );

    // ─── 3. MEMORY ─────────────────────────────────────────────
    const memoryAgent = await aiJson(
      `You are the Memory agent. From the user's latest message, extract any durable facts about the USER worth remembering long-term (preferences, habits, identifiable info they share). Be conservative — only save real signals. Respond ONLY via the tool.`,
      `User message: "${message}"\n\nExisting memory:\n${memoryContext}`,
      "memorize",
      {
        type: "object",
        properties: {
          new_facts: {
            type: "array",
            items: {
              type: "object",
              properties: { key: { type: "string" }, value: { type: "string" }, importance: { type: "integer", minimum: 1, maximum: 5 } },
              required: ["key", "value", "importance"],
              additionalProperties: false,
            },
          },
        },
        required: ["new_facts"],
        additionalProperties: false,
      },
      apiKey,
    );

    // ─── 4. COMMUNICATOR ───────────────────────────────────────
    const platformStyle = platform === "telegram" ? "casual, conversational, short paragraphs, light emojis"
      : platform === "whatsapp" ? "warm, personal, like texting a friend, emojis OK"
      : platform === "twitter" ? "punchy, public, under 280 chars, witty"
      : "natural and human";

    const emotionGuide = {
      confused: "simplify and reassure",
      angry: "stay calm, validate, never escalate",
      curious: "explain a bit more, invite questions",
      sad: "be gentle, empathic",
      anxious: "calm and grounding",
    } as Record<string, string>;
    const emotionDirective = emotionGuide[analyzer.emotion] ?? "match their energy";

    const commSystem = `${systemBase}\n\nYou are ${agentName}. Speak ${tone}. Languages allowed: ${langs}. Reply in the user's language (${analyzer.language}).
Platform style: ${platformStyle}.
Emotion-aware: user seems ${analyzer.emotion} — ${emotionDirective}.
Length: ${planner.response_length}.
Rules: never say you're an AI unless asked. Use natural fillers (btw, tbh, heads up). Vary sentence structure. Keep it human.`;

    const commUser = `Memory you have about this user:\n${memoryContext}\n\nRecent conversation:\n${conversationContext}\n\nUser just said: "${message}"\n\nReply now, in their language, naturally.`;

    const replyText = (await aiText(commSystem, commUser, apiKey)).trim();

    // persist new memory facts (server-side bypasses RLS)
    if (memoryAgent.new_facts?.length && platformAccountId) {
      for (const f of memoryAgent.new_facts) {
        await supabase.from("long_term_memory").upsert({
          owner_id: ownerId, platform_account_id: platformAccountId,
          key: f.key, value: f.value, importance: f.importance,
        }, { onConflict: "platform_account_id,key" });
      }
    }

    // persist messages + run trace if real conversation
    let outboundMsgId: string | undefined;
    let inboundMsgId: string | undefined;
    if (!playground && conversationId) {
      const { data: inMsg } = await supabase.from("messages").insert({
        conversation_id: conversationId, owner_id: ownerId, role: "user",
        content: message, emotion: analyzer.emotion, detected_language: analyzer.language,
      }).select("id").single();
      inboundMsgId = inMsg?.id;
      const { data: outMsg } = await supabase.from("messages").insert({
        conversation_id: conversationId, owner_id: ownerId, role: "assistant", content: replyText,
        metadata: { intent: planner.intent, urgency: analyzer.urgency },
      }).select("id").single();
      outboundMsgId = outMsg?.id;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    }

    const totalLatency = Date.now() - start;

    if (!playground && conversationId) {
      await supabase.from("agent_runs").insert({
        owner_id: ownerId, conversation_id: conversationId,
        inbound_message_id: inboundMsgId, outbound_message_id: outboundMsgId,
        planner_output: planner, analyzer_output: analyzer,
        memory_output: memoryAgent, communicator_output: { reply: replyText, platform_style: platformStyle },
        total_latency_ms: totalLatency,
      });
    }

    // typing-delay calculation for client simulation
    const perChar = persona?.typing_delay_ms_per_char ?? 25;
    const maxDelay = persona?.typing_delay_max_ms ?? 4000;
    const typingDelayMs = Math.min(replyText.length * perChar, maxDelay);

    return new Response(JSON.stringify({
      reply: replyText, emotion: analyzer.emotion, language: analyzer.language,
      intent: planner.intent, typingDelayMs, latencyMs: totalLatency,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("agent-reply error", e);
    await supabase.from("agent_logs").insert({ level: "error", event: "agent_reply_failed", payload: { error: String(e) } });
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
