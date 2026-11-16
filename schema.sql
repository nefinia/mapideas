-- Starloom: a shared constellation of ideas. D1 (SQLite).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- Google account id
  name TEXT NOT NULL,
  email TEXT,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'member',   -- member | admin | blocked
  created INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  center TEXT NOT NULL            -- id of the star in the middle
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  name TEXT NOT NULL,
  angle REAL NOT NULL DEFAULT 0,  -- where the branch sits around the center (degrees)
  radius REAL NOT NULL DEFAULT 200,
  PRIMARY KEY (map_id, id)
);

CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  grp TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'f', -- f idea | q question | g game idea | r reading
  size INTEGER NOT NULL DEFAULT 2,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html INTEGER NOT NULL DEFAULT 0,   -- 1 only for the seeded stars
  owner TEXT NOT NULL,            -- user id, or 'seed'
  vis TEXT NOT NULL DEFAULT 'public',     -- public | private
  deleted INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  updated_by TEXT,
  sources TEXT
);
CREATE INDEX IF NOT EXISTS stars_map ON stars (map_id, deleted);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  note TEXT,
  ab TEXT, -- how b reads when seen from a
  ba TEXT, -- how a reads when seen from b
  owner TEXT NOT NULL,
  vis TEXT NOT NULL DEFAULT 'public',
  deleted INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS links_map ON links (map_id, deleted);

-- every change to a star is kept, so anything can be seen and undone
CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  star_id TEXT NOT NULL,
  map_id TEXT NOT NULL,
  editor TEXT NOT NULL,
  at INTEGER NOT NULL,
  action TEXT NOT NULL,           -- create | edit | delete | revert | share | unshare
  label TEXT,
  title TEXT,
  body TEXT,
  kind TEXT,
  vis TEXT,
  sources TEXT
);
CREATE INDEX IF NOT EXISTS rev_star ON revisions (star_id, id);
CREATE INDEX IF NOT EXISTS rev_map ON revisions (map_id, id);

-- counters: monthly AI spend (micro-dollars), daily limits
CREATE TABLE IF NOT EXISTS usage (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0
);

-- ideas a person keeps, private to them
CREATE TABLE IF NOT EXISTS favs (
  user_id TEXT NOT NULL,
  star_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, star_id)
);

CREATE TABLE IF NOT EXISTS link_rev (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id TEXT NOT NULL,
  side TEXT NOT NULL,
  editor TEXT NOT NULL,
  at INTEGER NOT NULL,
  prev TEXT,
  next TEXT
);

-- small anonymous counts of what people do: hourly totals, nothing personal
CREATE TABLE IF NOT EXISTS events (
  app TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (app, day, hour, name)
);

CREATE TABLE IF NOT EXISTS paths (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, ids TEXT NOT NULL, at INTEGER NOT NULL);
