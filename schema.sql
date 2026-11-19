CREATE TABLE IF NOT EXISTS projects (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS records (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id),
  kind text NOT NULL CHECK (kind IN ('manuscript','run','note','claim','reference')),
  title text NOT NULL,
  body text NOT NULL,
  UNIQUE(project_id,id)
);
CREATE INDEX IF NOT EXISTS records_project ON records(project_id);
CREATE INDEX IF NOT EXISTS records_search ON records USING gin(to_tsvector('english',title || ' ' || body));
CREATE TABLE IF NOT EXISTS evidence (
  project_id integer NOT NULL,
  claim_id integer NOT NULL,
  record_id integer NOT NULL,
  projected boolean NOT NULL DEFAULT false,
  PRIMARY KEY(project_id, claim_id, record_id),
  FOREIGN KEY(project_id,claim_id) REFERENCES records(project_id,id),
  FOREIGN KEY(project_id,record_id) REFERENCES records(project_id,id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id),
  model text NOT NULL,
  question text NOT NULL,
  reply text NOT NULL,
  sources jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
