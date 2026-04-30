import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import ConversationView from "./pages/ConversationView";
import Memory from "./pages/Memory";
import Settings from "./pages/Settings";
import Platforms from "./pages/Platforms";
import Logs from "./pages/Logs";
import Playground from "./pages/Playground";
import MultiAgent from "./pages/MultiAgent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/conversations" element={<Conversations />} />
              <Route path="/app/conversations/:id" element={<ConversationView />} />
              <Route path="/app/memory" element={<Memory />} />
              <Route path="/app/platforms" element={<Platforms />} />
              <Route path="/app/playground" element={<Playground />} />
              <Route path="/app/logs" element={<Logs />} />
              <Route path="/app/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
