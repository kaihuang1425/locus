CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('feature', 'bug', 'general')),
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  network_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'closed', 'spam')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_network_hash_created_at ON feedback(network_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
