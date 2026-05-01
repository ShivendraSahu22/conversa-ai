// Multi-agent reply pipeline (Gemini-only) with MongoDB-backed memory.
// Short-term: last N messages per user in `chat_history`
// Long-term: durable facts per user in `user_memory`
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MongoClient } from "npm:mongodb@6.10.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_MODEL = "google/gemini-2.5-flash";

const SHORT_TERM_LIMIT = 20; // last N messages kept as rolling context
const LONG_TERM_LIMIT = 25;

// ─── Mongo singleton (reuse across warm invocations) ───────────
let mongoClient: MongoClient | null = null;
async function getMongo() {
  if (mongoClient) return mongoClient;
  const uri = Deno.env.get("MONGODB_URI");
  if (!uri) throw new Error("MONGODB_URI not configured");
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  return mongoClient;
}
function db() {
  if (!mongoClient) throw new Error("mongo not connected");
  return mongoClient.db("agent_memory");
}

// ─── Lovable AI Gateway (Gemini only) ──────────────────────────
async function aiJson(systemPrompt: string, userPrompt: string, schemaName: string, schema: any): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{ type: "function", function: { name: schemaName, description: "Return structured output", parameters: schema } }],
      tool_choice: { type: "function", function: { name: schemaName } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("no tool call");
  return JSON.parse(args);
}

async function aiText(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err: any = new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const {
      message,
      platform = "playground",
      conversationId,
      ownerId: bodyOwnerId,
      playground,
      playgroundConvId, // optional sub-scope (e.g. multiple playground threads per user)
      overrideSystemPrompt,
      overrideTone,
    } = body;

    // resolve owner from auth or body
    let ownerId = bodyOwnerId as string | undefined;
    if (!ownerId) {
      const auth = req.headers.get("Authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        try {
          const { data } = await supabase.auth.getUser(token);
          ownerId = data.user?.id;
        } catch (e) {
          console.error("getUser failed", e);
        }
      }
    }
    if (!ownerId) throw new Error("no owner — missing or invalid Authorization header");

    // Memory scope key — per user, optionally per playground thread
    const scopeId = playground ? `pg:${ownerId}:${playgroundConvId ?? "default"}` : `conv:${conversationId ?? ownerId}`;

    // load personality
    const { data: persona } = await supabase.from("agent_personality").select("*").eq("owner_id", ownerId).maybeSingle();
    const agentName = persona?.agent_name ?? "Aria";
    const systemBase = overrideSystemPrompt ?? persona?.system_prompt ?? "You are a warm, casual AI assistant.";
    const tone = overrideTone ?? persona?.default_tone ?? "friendly";
    const langs = (persona?.languages ?? ["en"]).join(", ");

    // ─── MEMORY LOAD (Mongo) ────────────────────────────────────
    await getMongo();
    const chatCol = db().collection("chat_history");
    const memCol = db().collection("user_memory");

    const recentDocs = await chatCol
      .find({ owner_id: ownerId, scope_id: scopeId })
      .sort({ created_at: -1 })
      .limit(SHORT_TERM_LIMIT)
      .toArray();
    const recentMessages = recentDocs.reverse().map((d: any) => ({ role: d.role, content: d.content }));

    const memoryDocs = await memCol
      .find({ owner_id: ownerId })
      .sort({ importance: -1, updated_at: -1 })
      .limit(LONG_TERM_LIMIT)
      .toArray();
    const memoryFacts = memoryDocs.map((d: any) => ({ key: d.key, value: d.value }));

    const conversationContext = recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n") || "(no prior turns)";
    const memoryContext = memoryFacts.map((m) => `- ${m.key}: ${m.value}`).join("\n") || "(none)";

    // ─── 1. PLANNER ────────────────────────────────────────────
    const planner = await aiJson(
      `You are the Planner agent. Analyze the user's intent and decide the response strategy. Respond ONLY via the tool.`,
      `Conversation so far:\n${conversationContext}\n\nUser just said: "${message}"\n\nIdentify intent and steps.`,
      "plan",
      {
        type: "object",
        properties: {
          intent: { type: "string" },
          steps: { type: "array", items: { type: "string" } },
          needs_followup: { type: "boolean" },
          response_length: { type: "string", enum: ["short", "medium", "long"] },
        },
        required: ["intent", "steps", "response_length"],
        additionalProperties: false,
      },
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
          language: { type: "string" },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          topics: { type: "array", items: { type: "string" } },
        },
        required: ["emotion", "language", "urgency"],
        additionalProperties: false,
      },
    );

    // ─── 3. MEMORY (extraction) ────────────────────────────────
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
    );

    // ─── 4. COMMUNICATOR ───────────────────────────────────────
    const platformStyle = platform === "telegram" ? "casual, conversational, short paragraphs, light emojis"
      : platform === "whatsapp" ? "warm, personal, like texting a friend, emojis OK"
      : platform === "twitter" ? "punchy, public, under 280 chars, witty"
      : "natural and human";

    const emotionGuide: Record<string, string> = {
      confused: "simplify and reassure",
      angry: "stay calm, validate, never escalate",
      curious: "explain a bit more, invite questions",
      sad: "be gentle, empathic",
      anxious: "calm and grounding",
    };
    const emotionDirective = emotionGuide[analyzer.emotion] ?? "match their energy";

    const commSystem = `${systemBase}\n\nYou are ${agentName}. Speak ${tone}. Languages allowed: ${langs}. Reply in the user's language (${analyzer.language}).
Platform style: ${platformStyle}.
Emotion-aware: user seems ${analyzer.emotion} — ${emotionDirective}.
Length: ${planner.response_length}.
Rules: never say you're an AI unless asked. Use natural fillers (btw, tbh, heads up). Vary sentence structure. Keep it human. USE the memory and recent conversation to stay context-aware — reference earlier turns when relevant.`;

    const commUser = `Long-term memory about this user:\n${memoryContext}\n\nRecent conversation (oldest → newest):\n${conversationContext}\n\nUser just said: "${message}"\n\nReply now, in their language, naturally and in context.`;

    const replyText = (await aiText(commSystem, commUser)).trim();

    // ─── PERSIST: short-term (Mongo) ───────────────────────────
    const now = new Date();
    await chatCol.insertMany([
      { owner_id: ownerId, scope_id: scopeId, role: "user", content: message, created_at: now },
      { owner_id: ownerId, scope_id: scopeId, role: "assistant", content: replyText, created_at: new Date(now.getTime() + 1) },
    ]);

    // ─── PERSIST: long-term (Mongo upsert by user+key) ─────────
    if (memoryAgent.new_facts?.length) {
      for (const f of memoryAgent.new_facts) {
        await memCol.updateOne(
          { owner_id: ownerId, key: f.key },
          { $set: { value: f.value, importance: f.importance, updated_at: now }, $setOnInsert: { created_at: now } },
          { upsert: true },
        );
      }
    }

    // ─── Optional: persist to Postgres for real (non-playground) conversations ─
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

    const perChar = persona?.typing_delay_ms_per_char ?? 25;
    const maxDelay = persona?.typing_delay_max_ms ?? 4000;
    const typingDelayMs = Math.min(replyText.length * perChar, maxDelay);

    return new Response(JSON.stringify({
      reply: replyText, emotion: analyzer.emotion, language: analyzer.language,
      intent: planner.intent, typingDelayMs, latencyMs: totalLatency,
      savedFacts: memoryAgent.new_facts ?? [],
      shortTermCount: recentMessages.length,
      longTermCount: memoryFacts.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("agent-reply error", e);
    try {
      await supabase.from("agent_logs").insert({ level: "error", event: "agent_reply_failed", payload: { error: String(e) } });
    } catch (_) { /* ignore */ }
    const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 500;
    const friendly = status === 429
      ? "Gemini is rate-limited right now. Please wait a moment and try again."
      : status === 402
      ? "AI credits exhausted. Add credits in Settings → Workspace → Usage."
      : (e.message ?? "unknown");
    return new Response(JSON.stringify({ error: friendly }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
