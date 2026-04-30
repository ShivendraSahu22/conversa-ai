import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MessagesSquare, Brain, Zap, Globe, Shield } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center surface-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Aria</span>
        </div>
        <Link to="/auth"><Button variant="outline" size="sm">Sign in</Button></Link>
      </header>

      <section className="relative">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="container relative py-24 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Multi-agent · Memory-aware · Telegram, WhatsApp, X
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight animate-fade-up">
            AI that talks like <span className="gradient-text">a real human</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground animate-fade-up">
            Aria is a multi-agent assistant that handles your messages across platforms — casual, context-aware,
            emotionally tuned. Plans, analyzes, remembers, and replies in your voice.
          </p>
          <div className="mt-8 flex justify-center gap-3 animate-fade-up">
            <Link to="/auth"><Button size="lg" className="bg-gradient-primary hover:opacity-90 surface-glow">Get started</Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See how it works</Button></a>
          </div>
        </div>
      </section>

      <section id="features" className="container py-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: Brain, title: "Multi-agent pipeline", text: "Planner → Analyzer → Memory → Communicator. Each step refines the reply." },
          { icon: MessagesSquare, title: "Platform-native tone", text: "Casual on Telegram, friendly on WhatsApp, punchy on X. Auto-tuned." },
          { icon: Zap, title: "Typing simulation", text: "Natural delays based on message length. No robotic instant replies." },
          { icon: Globe, title: "Multi-language", text: "Replies in the user's language. Hindi + English out of the box." },
          { icon: Shield, title: "Manual override", text: "Jump in any time. Send messages as the agent from the dashboard." },
          { icon: Sparkles, title: "Long-term memory", text: "Remembers preferences, habits, and past context per user." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 hover:surface-glow transition-shadow">
            <div className="h-10 w-10 rounded-lg bg-gradient-soft grid place-items-center mb-4">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-semibold mb-1">{f.title}</div>
            <div className="text-sm text-muted-foreground">{f.text}</div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Landing;
