-- olive12: folders table + folder_id on cards
-- Paste into the Supabase SQL Editor or apply via `supabase db push`.

CREATE TABLE IF NOT EXISTS folders (
  id          uuid        PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users NOT NULL,
  name        text        NOT NULL DEFAULT 'New folder',
  parent_id   uuid        REFERENCES folders(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their folders" ON folders;
CREATE POLICY "Users own their folders"
  ON folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add folder_id to cards (links a card to a library folder)
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;
