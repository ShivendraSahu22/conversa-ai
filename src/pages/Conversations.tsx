import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessagesSquare } from "lucide-react";

const platformColor: Record<string, string> = { telegram: "bg-telegram", whatsapp: "bg-whatsapp", twitter: "bg-twitter" };

const Conversations = () => {
  const [convs, setConvs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("conversations").select("*, platform_accounts(display_name, username, external_id)").order("last_message_at", { ascending: false });
      setConvs(data ?? []);
    };
    load();
    const ch = supabase.channel("conv-list").on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
      {convs.length === 0 ? (
        <Card className="p-10 text-center">
          <MessagesSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <div className="font-medium">No conversations yet</div>
          <div className="text-sm text-muted-foreground">Connect a platform or use the Playground.</div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {convs.map((c) => (
            <Link key={c.id} to={`/app/conversations/${c.id}`}>
              <Card className="p-4 hover:surface-glow transition-shadow flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full ${platformColor[c.platform]} grid place-items-center text-white text-xs uppercase font-bold`}>{c.platform[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.platform_accounts?.display_name || c.platform_accounts?.username || c.platform_accounts?.external_id}</div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}</div>
                </div>
                <Badge variant="secondary" className="capitalize">{c.platform}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Conversations;
