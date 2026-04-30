import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ConversationView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conv, setConv] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: c } = await supabase.from("conversations").select("*, platform_accounts(*)").eq("id", id).single();
      setConv(c);
      const { data: m } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at");
      setMessages(m ?? []);
    };
    load();
    const ch = supabase.channel(`msg-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => {
      setMessages((prev) => [...prev, p.new]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const sendOverride = async () => {
    if (!text.trim() || !id || !user || !conv) return;
    setSending(true);
    try {
      const { data: msg, error } = await supabase.from("messages").insert({
        conversation_id: id, owner_id: user.id, role: "assistant", content: text, is_manual_override: true,
      }).select().single();
      if (error) throw error;
      await supabase.from("manual_overrides").insert({ owner_id: user.id, conversation_id: id, message_id: msg.id, admin_user_id: user.id });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setText("");
      toast.success("Override sent (in-app). Platform delivery requires connector.");
    } catch (e: any) { toast.error(e.message); } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-up">
      <Card className="p-4 mb-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">{conv?.platform_accounts?.display_name || conv?.platform_accounts?.external_id || "Conversation"}</div>
          <div className="text-xs text-muted-foreground capitalize">{conv?.platform}</div>
        </div>
      </Card>
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.role === "assistant" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                {m.is_manual_override && <Shield className="inline h-3 w-3 mr-1 opacity-70" />}
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.emotion && <div className="text-[10px] opacity-70 mt-1">emotion: {m.emotion}</div>}
              </div>
            </div>
          ))}
          {messages.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">No messages yet.</div>}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Send manual reply as agent…" onKeyDown={(e) => e.key === "Enter" && sendOverride()} />
          <Button onClick={sendOverride} disabled={sending || !text.trim()} className="bg-gradient-primary"><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
};

export default ConversationView;
