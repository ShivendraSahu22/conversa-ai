import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background grid place-items-center">
      <div className="text-center px-4">
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
