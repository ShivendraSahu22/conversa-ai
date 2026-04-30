import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  const load = async () => {
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("agent_runs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setLogs(l ?? []); setRuns(r ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Recent agent runs</h2>
        {runs.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">No runs yet.</Card> : (
          <div className="space-y-2">
            {runs.map((r) => (
              <Card key={r.id} className="p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={r.error ? "destructive" : "secondary"}>{r.error ? "error" : "ok"}</Badge>
                  <span className="text-muted-foreground">{r.total_latency_ms}ms · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                {r.planner_output?.intent && <div><strong>Intent:</strong> {r.planner_output.intent}</div>}
                {r.analyzer_output?.emotion && <div><strong>Emotion:</strong> {r.analyzer_output.emotion}</div>}
                {r.error && <div className="text-destructive mt-1">{r.error}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-2">Events</h2>
        {logs.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">No events.</Card> : (
          <div className="space-y-1">
            {logs.map((l) => (
              <Card key={l.id} className="p-2 text-xs flex items-center gap-2">
                <Badge variant={l.level === "error" ? "destructive" : "outline"} className="text-[10px]">{l.level}</Badge>
                <span className="font-mono">{l.event}</span>
                <span className="text-muted-foreground ml-auto">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
