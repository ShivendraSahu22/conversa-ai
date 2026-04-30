import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { MessagesSquare, Brain, Activity, Plug } from "lucide-react";
import { Link } from "react-router-dom";

const Stat = ({ label, value, icon: Icon, accent }: any) => (
  <Card className="p-5 hover:surface-glow transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
      </div>
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${accent}`}><Icon className="h-5 w-5" /></div>
    </div>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({ conversations: 0, messages: 0, memories: 0, platforms: 0 });

  useEffect(() => {
    (async () => {
      const [c, m, mem, p] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("long_term_memory").select("id", { count: "exact", head: true }),
        supabase.from("platform_accounts").select("id", { count: "exact", head: true }),
      ]);
      setStats({ conversations: c.count ?? 0, messages: m.count ?? 0, memories: mem.count ?? 0, platforms: p.count ?? 0 });
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Your agent's activity at a glance.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Conversations" value={stats.conversations} icon={MessagesSquare} accent="bg-gradient-soft text-primary" />
        <Stat label="Messages" value={stats.messages} icon={Activity} accent="bg-gradient-soft text-accent" />
        <Stat label="Memories" value={stats.memories} icon={Brain} accent="bg-gradient-soft text-primary" />
        <Stat label="Platforms" value={stats.platforms} icon={Plug} accent="bg-gradient-soft text-accent" />
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Get started</h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Open <Link to="/app/settings" className="text-primary hover:underline">Settings</Link> and tune your agent's personality, tone, and languages.</li>
          <li>Try the <Link to="/app/playground" className="text-primary hover:underline">Playground</Link> to chat with your agent directly.</li>
          <li>Connect a platform in <Link to="/app/platforms" className="text-primary hover:underline">Platforms</Link> (Telegram is fastest).</li>
          <li>Watch live conversations in <Link to="/app/conversations" className="text-primary hover:underline">Conversations</Link>.</li>
        </ol>
      </Card>
    </div>
  );
};

export default Dashboard;
