-- ROLES (separate table for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- AGENT PERSONALITY (one per owner)
CREATE TABLE public.agent_personality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'Aria',
  default_tone TEXT NOT NULL DEFAULT 'friendly',
  languages TEXT[] NOT NULL DEFAULT ARRAY['en','hi'],
  system_prompt TEXT NOT NULL DEFAULT 'You are Aria, a warm, casual, emotionally aware assistant. Talk like a real human friend — short sentences, light emojis, natural fillers like "btw", "tbh", "heads up". Never sound robotic.',
  typing_delay_ms_per_char INT NOT NULL DEFAULT 25,
  typing_delay_max_ms INT NOT NULL DEFAULT 4000,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLATFORM ACCOUNTS
CREATE TYPE public.platform_kind AS ENUM ('telegram','whatsapp','twitter');

CREATE TABLE public.platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.platform_kind NOT NULL,
  external_id TEXT NOT NULL,            -- chat_id / phone / twitter user id
  display_name TEXT,
  username TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, platform, external_id)
);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
  platform public.platform_kind NOT NULL,
  title TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_owner ON public.conversations(owner_id, last_message_at DESC);

-- MESSAGES
CREATE TYPE public.message_role AS ENUM ('user','assistant','system');

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.message_role NOT NULL,
  content TEXT NOT NULL,
  emotion TEXT,
  detected_language TEXT,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);

-- LONG-TERM MEMORY (per end-user, scoped to owner)
CREATE TABLE public.long_term_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_account_id UUID NOT NULL REFERENCES public.platform_accounts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  importance INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform_account_id, key)
);

-- AGENT RUNS (full pipeline trace per inbound message)
CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  inbound_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  outbound_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  planner_output JSONB,
  analyzer_output JSONB,
  memory_output JSONB,
  communicator_output JSONB,
  total_latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_runs_conv ON public.agent_runs(conversation_id, created_at DESC);

-- MANUAL OVERRIDES
CREATE TABLE public.manual_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GENERIC AGENT LOGS
CREATE TABLE public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_logs_created ON public.agent_logs(created_at DESC);

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_agent_personality_updated BEFORE UPDATE ON public.agent_personality
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_long_term_memory_updated BEFORE UPDATE ON public.long_term_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO PROFILE + DEFAULT PERSONALITY ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  INSERT INTO public.agent_personality (owner_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.long_term_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES: profiles
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles: only admins manage
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- agent_personality
CREATE POLICY "own personality all" ON public.agent_personality FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- platform_accounts
CREATE POLICY "own platform_accounts all" ON public.platform_accounts FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- conversations
CREATE POLICY "own conversations all" ON public.conversations FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- messages
CREATE POLICY "own messages all" ON public.messages FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- long_term_memory
CREATE POLICY "own memory all" ON public.long_term_memory FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- agent_runs
CREATE POLICY "own runs all" ON public.agent_runs FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- manual_overrides
CREATE POLICY "own overrides all" ON public.manual_overrides FOR ALL
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- agent_logs
CREATE POLICY "own logs select" ON public.agent_logs FOR SELECT
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own logs insert" ON public.agent_logs FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;