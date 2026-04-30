import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Memory = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("long_term_memory").select("*, platform_accounts(display_name, platform, external_id)").order("updated_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { await supabase.from("long_term_memory").delete().eq("id", id); toast.success("Memory deleted"); load(); };

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-3xl font-bold tracking-tight">Long-term memory</h1>
      {items.length === 0 ? (
        <Card className="p-10 text-center"><Brain className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><div className="text-sm text-muted-foreground">No memories yet. The agent learns automatically as it chats.</div></Card>
      ) : (
        <div className="grid gap-2">
          {items.map((m) => (
            <Card key={m.id} className="p-4 flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize">{m.platform_accounts?.platform}</Badge>
                  <span className="text-xs text-muted-foreground">{m.platform_accounts?.display_name || m.platform_accounts?.external_id}</span>
                </div>
                <div className="font-medium text-sm">{m.key}</div>
                <div className="text-sm text-muted-foreground">{m.value}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Memory;
