import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const [p, setP] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("agent_personality").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => setP(data));
  }, [user]);

  const save = async () => {
    if (!p || !user) return;
    const { error } = await supabase.from("agent_personality").update({
      agent_name: p.agent_name, default_tone: p.default_tone, system_prompt: p.system_prompt,
      languages: p.languages, typing_delay_ms_per_char: p.typing_delay_ms_per_char,
      typing_delay_max_ms: p.typing_delay_max_ms, enabled: p.enabled,
    }).eq("owner_id", user.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  if (!p) return null;

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Agent settings</h1>
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between"><div><Label>Agent enabled</Label><div className="text-xs text-muted-foreground">When off, the agent stops auto-replying.</div></div><Switch checked={p.enabled} onCheckedChange={(v) => setP({ ...p, enabled: v })} /></div>
        <div><Label>Agent name</Label><Input value={p.agent_name} onChange={(e) => setP({ ...p, agent_name: e.target.value })} /></div>
        <div><Label>Default tone</Label><Input value={p.default_tone} onChange={(e) => setP({ ...p, default_tone: e.target.value })} placeholder="friendly, professional, witty…" /></div>
        <div><Label>Languages (comma-separated codes)</Label><Input value={p.languages.join(",")} onChange={(e) => setP({ ...p, languages: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} /></div>
        <div><Label>System prompt / personality</Label><Textarea rows={6} value={p.system_prompt} onChange={(e) => setP({ ...p, system_prompt: e.target.value })} /></div>
        <div><Label>Typing delay per char: {p.typing_delay_ms_per_char}ms</Label><Slider min={0} max={80} step={5} value={[p.typing_delay_ms_per_char]} onValueChange={([v]) => setP({ ...p, typing_delay_ms_per_char: v })} /></div>
        <div><Label>Max typing delay: {p.typing_delay_max_ms}ms</Label><Slider min={500} max={10000} step={250} value={[p.typing_delay_max_ms]} onValueChange={([v]) => setP({ ...p, typing_delay_max_ms: v })} /></div>
        <Button onClick={save} className="bg-gradient-primary">Save changes</Button>
      </Card>
    </div>
  );
};

export default Settings;
