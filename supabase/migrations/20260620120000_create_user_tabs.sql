CREATE TABLE user_tabs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  saved_location text NOT NULL CHECK (saved_location IN ('shelf', 'library')),
  saved_folder_id uuid,
  card_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tabs"
  ON user_tabs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
