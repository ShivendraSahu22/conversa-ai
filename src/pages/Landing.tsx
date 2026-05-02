import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const logos = [
  { name: "ChatGPT", url: "https://cdn.simpleicons.org/openai/10A37F" },
  { name: "Gemini", url: "https://cdn.simpleicons.org/googlegemini/4285F4" },
  { name: "Anthropic", url: "https://cdn.simpleicons.org/anthropic/D97757" },
  { name: "DeepSeek", url: "https://cdn.simpleicons.org/deepseek/4D6BFE" },
  { name: "Meta", url: "https://cdn.simpleicons.org/meta/0467DF" },
  { name: "Mistral", url: "https://cdn.simpleicons.org/mistralai/FA520F" },
  { name: "Hugging Face", url: "https://cdn.simpleicons.org/huggingface/FFD21E" },
  { name: "Perplexity", url: "https://cdn.simpleicons.org/perplexity/1FB8CD" },
  { name: "Cohere", url: "https://cdn.simpleicons.org/cohere/39594D" },
  { name: "Stability", url: "https://cdn.simpleicons.org/stabilityai/6A6A6A" },
  { name: "xAI", url: "https://cdn.simpleicons.org/x/FFFFFF" },
  { name: "Replicate", url: "https://cdn.simpleicons.org/replicate/EA2A2A" },
];

// Pre-computed positions/timings so logos drift in random spots
const floaters = logos.map((logo, i) => {
  const top = (i * 37) % 90;
  const left = (i * 53) % 92;
  const duration = 14 + (i % 6) * 3;
  const delay = (i % 7) * -2;
  const size = 40 + (i % 4) * 12;
  return { ...logo, top, left, duration, delay, size };
});

const Landing = () => {
  return (
    <div className="min-h-screen bg-background grid place-items-center relative overflow-hidden">
      {/* Animated AI logo background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {floaters.map((f, i) => (
          <img
            key={i}
            src={f.url}
            alt={f.name}
            loading="lazy"
            className="absolute opacity-20 dark:opacity-25 animate-float"
            style={{
              top: `${f.top}%`,
              left: `${f.left}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      <div className="text-center px-4 relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-[20px]">
          WELCOME TO <span className="gradient-text">TECHBOOK AI</span>
        </h1>
        <Link to="/auth">
          <Button size="lg" className="bg-gradient-primary hover:opacity-90 surface-glow">
            Get started
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Landing;
