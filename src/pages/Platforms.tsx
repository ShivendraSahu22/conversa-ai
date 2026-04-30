import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle, Twitter, ExternalLink } from "lucide-react";

const platforms = [
  {
    id: "telegram", name: "Telegram", icon: Send, color: "bg-telegram",
    desc: "Connect a bot via @BotFather and Aria will reply automatically.",
    setup: ["Open @BotFather on Telegram and create a bot", "Copy the token", "Connect the Telegram connector in Lovable", "Aria starts polling within 1 minute"],
    status: "scaffolded",
  },
  {
    id: "whatsapp", name: "WhatsApp Business", icon: MessageCircle, color: "bg-whatsapp",
    desc: "Requires Meta Business account + verified phone number.",
    setup: ["Set up a Meta Business app at developers.facebook.com", "Generate WhatsApp Business API access token", "Configure webhook URL pointing to /functions/v1/whatsapp-webhook", "Add WHATSAPP_TOKEN and WHATSAPP_VERIFY_TOKEN as secrets"],
    status: "scaffolded",
  },
  {
    id: "twitter", name: "X (Twitter)", icon: Twitter, color: "bg-twitter",
    desc: "Requires paid X Developer account ($100+/mo) for write access.",
    setup: ["Apply for X API at developer.x.com", "Create app + get API keys", "Add TWITTER_CONSUMER_KEY/SECRET and TWITTER_ACCESS_TOKEN/SECRET", "Enable Read+Write permissions"],
    status: "scaffolded",
  },
];

const Platforms = () => (
  <div className="space-y-6 animate-fade-up">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Platforms</h1>
      <p className="text-muted-foreground">Connect channels where Aria will talk to people.</p>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      {platforms.map((p) => (
        <Card key={p.id} className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`h-10 w-10 rounded-lg ${p.color} grid place-items-center text-white`}><p.icon className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold">{p.name}</div>
              <Badge variant="secondary" className="text-xs capitalize">{p.status}</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside mb-4">
            {p.setup.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <Button variant="outline" size="sm" className="w-full" disabled>
            <ExternalLink className="h-3 w-3 mr-1" /> Setup required
          </Button>
        </Card>
      ))}
    </div>
    <Card className="p-4 bg-gradient-soft border-primary/20">
      <div className="text-sm">
        <strong>Note:</strong> The multi-agent reply pipeline is fully working. You can test it in the
        <a href="/app/playground" className="text-primary hover:underline"> Playground</a>. Platform delivery requires
        completing each platform's setup above.
      </div>
    </Card>
  </div>
);

export default Platforms;
