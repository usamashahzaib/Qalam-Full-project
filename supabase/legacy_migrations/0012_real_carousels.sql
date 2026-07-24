-- Real carousel projects
DROP TABLE IF EXISTS carousel_slides CASCADE;
DROP TABLE IF EXISTS carousel_projects CASCADE;

CREATE TABLE carousel_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  workspace_id UUID,
  title TEXT NOT NULL,
  topic TEXT,
  role_profile TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE carousel_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own carousels" ON carousel_projects
  FOR ALL USING (user_id = auth.uid()::text);

CREATE TABLE carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES carousel_projects(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  image_prompt TEXT,
  layout TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own slides" ON carousel_slides
  FOR ALL USING (
    project_id IN (SELECT id FROM carousel_projects WHERE user_id = auth.uid()::text)
  );

CREATE INDEX idx_carousel_user ON carousel_projects(user_id);
CREATE INDEX idx_slides_project ON carousel_slides(project_id);
