
CREATE TABLE public.twitter_credentials (
  owner_id UUID NOT NULL PRIMARY KEY,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  access_token TEXT NOT NULL,
  access_token_secret TEXT NOT NULL,
  screen_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.twitter_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own twitter creds all" ON public.twitter_credentials FOR ALL
  USING ((auth.uid() = owner_id) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = owner_id);
