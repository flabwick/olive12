-- olive12: initial cards table
-- Paste this into the Supabase SQL Editor, or apply via `supabase db push`.

CREATE TABLE IF NOT EXISTS cards (
  id           uuid        PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users NOT NULL,
  type         text        NOT NULL,
  subtype      text,
  title        text        NOT NULL DEFAULT '',
  body         jsonb,
  config       jsonb       NOT NULL DEFAULT '{}',
  location     text        NOT NULL DEFAULT 'none'
                           CHECK (location IN ('none', 'shelf', 'library')),
  content_hash text,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL
);

-- Row-level security: every user sees only their own cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their cards" ON cards;
CREATE POLICY "Users own their cards"
  ON cards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
