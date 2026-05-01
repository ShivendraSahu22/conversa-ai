
-- Trending topics scraped from public sources
CREATE TABLE public.trending_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  topic TEXT NOT NULL,
  rank INTEGER,
  source TEXT NOT NULL DEFAULT 'trends24',
  region TEXT NOT NULL DEFAULT 'worldwide',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trends all" ON public.trending_topics FOR ALL
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_trending_topics_owner_time ON public.trending_topics(owner_id, fetched_at DESC);

-- Generated/posted tweets per trend
CREATE TABLE public.trend_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | posted | failed
  twitter_post_id TEXT,
  error TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trend_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trend_posts all" ON public.trend_posts FOR ALL
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id);
CREATE INDEX idx_trend_posts_owner_time ON public.trend_posts(owner_id, created_at DESC);

-- Per-user settings for the trends agent
CREATE TABLE public.trends_settings (
  owner_id UUID NOT NULL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_post BOOLEAN NOT NULL DEFAULT false,
  region TEXT NOT NULL DEFAULT 'worldwide',
  topics_per_run INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trends_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trends_settings all" ON public.trends_settings FOR ALL
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id);
