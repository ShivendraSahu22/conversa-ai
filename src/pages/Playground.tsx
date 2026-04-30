import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; emotion?: string };

const Playground = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [convId] = useState<string>(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim() || !user) return;
    const userMsg = input.trim();
    setMessages((p) => [...p, { role: "user", content: userMsg }]);
    setInput("");
    setBusy(true); setTyping(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-reply", {
        body: { message: userMsg, playground: true, playgroundConvId: convId, history: messages },
      });
      if (error) throw error;
      // simulate typing pause based on response length
      const delay = Math.min(data?.typingDelayMs ?? 800, 4000);
      await new Promise((r) => setTimeout(r, delay));
      setMessages((p) => [...p, { role: "assistant", content: data.reply, emotion: data.emotion }]);
    } catch (e: any) {
      toast.error(e.message ?? "Agent error");
    } finally { setBusy(false); setTyping(false); setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50); }
  };

  return (
    <div className="space-y-4 animate-fade-up max-w-3xl mx-auto h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <Badge variant="secondary" className="ml-auto">Multi-agent pipeline</Badge>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && <div className="text-center text-muted-foreground text-sm py-12">Say hi 👋 — try "I think I'm wasting money on subscriptions"</div>}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.role === "assistant" ? "bg-secondary" : "bg-gradient-primary text-primary-foreground"}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.emotion && <div className="text-[10px] opacity-60 mt-1">detected: {m.emotion}</div>}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start"><div className="bg-secondary rounded-2xl px-4 py-3 text-muted-foreground"><span className="typing-dot" /><span className="typing-dot mx-1" /><span className="typing-dot" /></div></div>
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => e.key === "Enter" && !busy && send()} disabled={busy} />
          <Button onClick={send} disabled={busy || !input.trim()} className="bg-gradient-primary"><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
};

export default Playground;
