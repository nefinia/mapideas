-- Bridges (Epistemic Bridges) database. Answers are stored under a random player code only.
-- Feedback and result emails live in their own tables with no player code, and feedback keeps only the day,
-- so neither can be linked back to anyone's answers.

CREATE TABLE IF NOT EXISTS players (
  code TEXT PRIMARY KEY,
  grp TEXT NOT NULL,              -- 'choose' (AI button while writing) or 'after' (AI shown after own answer)
  lang TEXT,
  tester INTEGER NOT NULL DEFAULT 0,  -- 1 = designer or pilot tester, left out of the analysis
  restored INTEGER NOT NULL DEFAULT 0,
  visits INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  answered_end INTEGER NOT NULL DEFAULT 0,
  feedback_given INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warmups (
  code TEXT PRIMARY KEY,
  words TEXT,                     -- JSON array; Divergent Association Task, scored from the first 7 valid words
  ms INTEGER,
  pasted INTEGER NOT NULL DEFAULT 0,
  lang TEXT,
  skipped INTEGER NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  pair TEXT NOT NULL,
  set_name TEXT,                  -- 'core' or 'open'
  level TEXT,                     -- cc, ca, aa
  dir TEXT,                       -- 'ab' or 'ba'
  from_text TEXT, to_text TEXT, lang TEXT,
  grp TEXT, visit INTEGER, position INTEGER,
  first_key_ms INTEGER, submit_ms INTEGER,
  pasted INTEGER NOT NULL DEFAULT 0, pasted_chars INTEGER NOT NULL DEFAULT 0,
  voice INTEGER NOT NULL DEFAULT 0,
  ai_requested INTEGER NOT NULL DEFAULT 0,
  ai_shown INTEGER NOT NULL DEFAULT 0,
  ai_model TEXT,
  difficulty TEXT,
  answer TEXT, stones TEXT, revised INTEGER NOT NULL DEFAULT 0, final TEXT,
  skipped INTEGER NOT NULL DEFAULT 0,
  lang_switched INTEGER NOT NULL DEFAULT 0,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trials_pair_dir ON trials(pair, dir);
CREATE INDEX IF NOT EXISTS trials_code ON trials(code);

CREATE TABLE IF NOT EXISTS end_answers (
  code TEXT PRIMARY KEY,
  data TEXT NOT NULL,             -- JSON: played before, outside AI use, AI frequency and feeling, comparison, ownership, first language, age band, field
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rating INTEGER,
  comment TEXT,
  lang TEXT,
  day TEXT NOT NULL               -- date only, never the time
);

CREATE TABLE IF NOT EXISTS emails (
  email TEXT PRIMARY KEY,
  lang TEXT                       -- no date and no player code
);

-- Page opens per country per day, plain totals with no player code and no IP.
CREATE TABLE IF NOT EXISTS visits (
  day TEXT NOT NULL,
  country TEXT NOT NULL,          -- two-letter code from Cloudflare, 'xx' if unknown
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country)
);
