import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const handleEmail = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Authentication failed");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/app` });
    if (result.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (result.redirected) return;
    navigate("/app");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <Card className="relative w-full max-w-md p-8 surface-glow">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-semibold">Techbook</span>
        </Link>
        <h1 className="text-2xl font-bold mb-1">Welcome</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to manage your AI agent.</p>

        <Button onClick={handleGoogle} variant="outline" className="w-full mb-4" disabled={loading}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.5 0 19.5-7.7 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.4 0 10.3-2 14-5.4l-6.5-5.5C29.6 34.3 26.9 35 24 35c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.4 38.9 16.1 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.6 5l6.5 5.5c-.5.5 7.3-5.3 7.3-14.5 0-1.3-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </Button>

        <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
          <TabsContent value="signin" className="space-y-3 mt-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full bg-gradient-primary" onClick={() => handleEmail("signin")} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign in</Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full bg-gradient-primary" onClick={() => handleEmail("signup")} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create account</Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
