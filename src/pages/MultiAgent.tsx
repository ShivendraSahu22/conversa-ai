import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Send, Users, Play, Square, Sparkles, Bot } from "lucide-react";
import { toast } from "sonner";

type Persona = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  systemPrompt: string;
  tone: string;
};

const PERSONAS: Persona[] = [
  {
    id: "aria",
    name: "Aria",
    emoji: "🌸",
    color: "bg-pink-500/15 border-pink-500/30",
    tone: "warm, empathetic",
    systemPrompt:
      "You are Aria, a warm and empathetic friend. You listen carefully, ask gentle questions, and respond with kindness. Keep replies short (1-3 sentences), like a real chat.",
  },
  {
    id: "max",
    name: "Max",
    emoji: "⚡",
    color: "bg-amber-500/15 border-amber-500/30",
    tone: "witty, sarcastic",
    systemPrompt:
      "You are Max, witty and a bit sarcastic but never mean. You drop dry one-liners and playful comebacks. Keep replies short (1-2 sentences).",
  },
  {
    id: "nova",
    name: "Nova",
    emoji: "🔬",
    color: "bg-cyan-500/15 border-cyan-500/30",
    tone: "analytical, curious",
    systemPrompt:
      "You are Nova, analytical and curious. You break ideas down logically and ask sharp follow-up questions. Keep replies short (1-3 sentences).",
  },
  {
    id: "zen",
    name: "Zen",
    emoji: "🧘",
    color: "bg-emerald-500/15 border-emerald-500/30",
    tone: "calm, philosophical",
    systemPrompt:
      "You are Zen, calm and philosophical. You reframe situations gently and offer perspective. Keep replies short (1-3 sentences).",
  },
  {
    id: "rio",
    name: "Rio",
    emoji: "🎨",
    color: "bg-purple-500/15 border-purple-500/30",
    tone: "creative, playful",
    systemPrompt:
      "You are Rio, a creative and playful storyteller. You riff on ideas with imagination and metaphors. Keep replies short (1-3 sentences).",
  },
  {
    id: "kai",
    name: "Kai",
    emoji: "💼",
    color: "bg-blue-500/15 border-blue-500/30",
    tone: "pragmatic, direct",
    systemPrompt:
      "You are Kai, pragmatic and direct. You cut to action items and trade-offs. Keep replies short (1-2 sentences).",
  },
];

type Msg = {
  id: string;
  speaker: string; // persona id or "you"
  name: string;
  emoji: string;
  color: string;
  content: string;
};

type Provider = "gemini" | "openai";

const MultiAgent = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>(["aria", "max", "nova"]);
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [topic, setTopic] = useState("");
  const [userInput, setUserInput] = useState("");
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rounds, setRounds] = useState(3);
  const stopRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const providerFor = (id: string): Provider => providers[id] ?? "gemini";
  const cycleProvider = (id: string) =>
    setProviders((prev) => ({ ...prev, [id]: providerFor(id) === "gemini" ? "openai" : "gemini" }));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const togglePersona = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 4) {
        toast.info("Pick up to 4 agents");
        return prev;
      }
      return [...prev, id];
    });
  };

  const callAgent = async (persona: Persona, history: Msg[]): Promise<string> => {
    const transcript = history
      .slice(-12)
      .map((m) => `${m.name}: ${m.content}`)
      .join("\n");
    const prompt = `You are part of a group chat with: ${selected
      .map((s) => PERSONAS.find((p) => p.id === s)?.name)
      .join(", ")} and possibly a human user.

Recent conversation:
${transcript || "(just starting)"}

Reply in character as ${persona.name}. Do NOT prefix your reply with your name. Keep it natural, short, and conversational. React to what was just said.`;

    const { data, error } = await supabase.functions.invoke("agent-reply", {
      body: {
        message: prompt,
        playground: true,
        playgroundConvId: `multi-${persona.id}`,
        history: [],
        overrideSystemPrompt: persona.systemPrompt,
        overrideTone: persona.tone,
        memoryScope: "multi-agent",
        provider: providerFor(persona.id),
      },
    });
    if (error) throw error;
    if (data?.savedFacts?.length) {
      for (const f of data.savedFacts) {
        toast.success(`🧠 Remembered: ${f.key}`, { description: f.value });
      }
    }
    return (data?.reply ?? "").trim();
  };

  const addMessage = (speaker: string, name: string, emoji: string, color: string, content: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), speaker, name, emoji, color, content }]);
  };

  const runConversation = async () => {
    if (!user) return;
    if (selected.length < 2) {
      toast.error("Pick at least 2 agents");
      return;
    }
    if (!topic.trim() && messages.length === 0) {
      toast.error("Give them a topic to discuss");
      return;
    }
    setRunning(true);
    stopRef.current = false;

    let history = messages;
    if (topic.trim() && messages.length === 0) {
      const seed: Msg = {
        id: crypto.randomUUID(),
        speaker: "system",
        name: "Topic",
        emoji: "💬",
        color: "bg-muted border-border",
        content: topic.trim(),
      };
      history = [seed];
      setMessages([seed]);
    }

    try {
      for (let r = 0; r < rounds; r++) {
        for (const id of selected) {
          if (stopRef.current) break;
          const persona = PERSONAS.find((p) => p.id === id)!;
          const reply = await callAgent(persona, history);
          if (!reply) continue;
          const msg: Msg = {
            id: crypto.randomUUID(),
            speaker: persona.id,
            name: persona.name,
            emoji: persona.emoji,
            color: persona.color,
            content: reply,
          };
          history = [...history, msg];
          setMessages((prev) => [...prev, msg]);
          await new Promise((res) => setTimeout(res, 700));
        }
        if (stopRef.current) break;
      }
    } catch (e: any) {
      toast.error(e.message ?? "Agent error");
    } finally {
      setRunning(false);
      stopRef.current = false;
    }
  };

  const stop = () => {
    stopRef.current = true;
    toast.info("Stopping after current reply…");
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || busy || running) return;
    if (selected.length < 1) {
      toast.error("Pick at least 1 agent");
      return;
    }
    const youMsg: Msg = {
      id: crypto.randomUUID(),
      speaker: "you",
      name: "You",
      emoji: "🧑",
      color: "bg-gradient-primary text-primary-foreground border-transparent",
      content: userInput.trim(),
    };
    setMessages((prev) => [...prev, youMsg]);
    setUserInput("");
    setBusy(true);
    let history = [...messages, youMsg];
    try {
      for (const id of selected) {
        const persona = PERSONAS.find((p) => p.id === id)!;
        const reply = await callAgent(persona, history);
        if (!reply) continue;
        const msg: Msg = {
          id: crypto.randomUUID(),
          speaker: persona.id,
          name: persona.name,
          emoji: persona.emoji,
          color: persona.color,
          content: reply,
        };
        history = [...history, msg];
        setMessages((prev) => [...prev, msg]);
        await new Promise((res) => setTimeout(res, 500));
      }
    } catch (e: any) {
      toast.error(e.message ?? "Agent error");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setTopic("");
  };

  return (
    <div className="space-y-4 animate-fade-up max-w-5xl mx-auto h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Multi-Agent Chat</h1>
        <Badge variant="secondary" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" /> {selected.length} agent{selected.length !== 1 ? "s" : ""} active
        </Badge>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4" /> Pick agents (2–4 for auto-conversation, 1+ to chat with)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PERSONAS.map((p) => {
            const active = selected.includes(p.id);
            const prov = providerFor(p.id);
            return (
              <div
                key={p.id}
                className={`text-left rounded-lg border p-3 transition-all ${
                  active ? `${p.color} ring-2 ring-primary/40` : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <button type="button" onClick={() => togglePersona(p.id)} className="w-full text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.emoji}</span>
                    <span className="font-semibold text-sm">{p.name}</span>
                    <Checkbox checked={active} className="ml-auto pointer-events-none" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{p.tone}</div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); cycleProvider(p.id); }}
                  disabled={running}
                  className="mt-2 w-full text-[10px] font-medium px-2 py-1 rounded-md border border-border bg-background/50 hover:bg-background transition-colors flex items-center justify-center gap-1"
                  title="Click to switch AI provider"
                >
                  <Sparkles className="h-3 w-3" />
                  {prov === "openai" ? "ChatGPT (GPT-4o-mini)" : "Gemini 2.5 Flash"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 items-end pt-2 border-t">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Topic / starter</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Should remote work be the default?"
              disabled={running}
            />
          </div>
          <div>
            <Label className="text-xs">Rounds</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={rounds}
              onChange={(e) => setRounds(Math.max(1, Math.min(10, +e.target.value || 1)))}
              className="w-20"
              disabled={running}
            />
          </div>
          {!running ? (
            <Button onClick={runConversation} disabled={busy} className="bg-gradient-primary">
              <Play className="h-4 w-4 mr-1" /> Start
            </Button>
          ) : (
            <Button onClick={stop} variant="destructive">
              <Square className="h-4 w-4 mr-1" /> Stop
            </Button>
          )}
          <Button onClick={reset} variant="outline" disabled={running}>
            Reset
          </Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">
              Pick agents, set a topic, hit Start — or just type below to chat with all selected agents at once.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.speaker === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm border ${m.color}`}>
                <div className="text-[11px] font-semibold opacity-80 mb-0.5 flex items-center gap-1">
                  <span>{m.emoji}</span>
                  <span>{m.name}</span>
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {(running || busy) && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-3 text-muted-foreground border">
                <span className="typing-dot" />
                <span className="typing-dot mx-1" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Jump in — message all selected agents…"
            onKeyDown={(e) => e.key === "Enter" && sendUserMessage()}
            disabled={busy || running}
          />
          <Button
            onClick={sendUserMessage}
            disabled={busy || running || !userInput.trim()}
            className="bg-gradient-primary"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MultiAgent;
