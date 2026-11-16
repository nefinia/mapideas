import { handleBridges } from "../bridges/worker.js";
/**
 * Map: a shared map of ideas. One Worker serves the site (static assets)
 * and the API. Data lives in D1 (binding DB). Sign-in is Google. The assistant is Claude
 * through the Anthropic API, with a monthly spending cap.
 *
 * Secrets (wrangler secret put): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET, ANTHROPIC_API_KEY
 * Vars (wrangler.toml): ADMIN_EMAILS, AI_MODEL, AI_BUDGET_USD
 * Local testing: put DEV_LOGIN = "1" in .dev.vars to get a fake sign-in at /auth/dev.
 */

const PRICE = { in: 0.10, write: 0.125, read: 0.01, out: 0.50 }; // USD per million tokens (Haiku 5.5)
const SAFETY_USD = 0.25;
const ASK_PER_USER_DAY = 50;
const WRITES_PER_USER_DAY = 300;
const MAX_OUT = 600;
const KINDS = ["f", "q", "r", "a"]; // idea, question, reading, answer (a reply to another idea)
const SESSION_DAYS = 30;

const json = (status, obj, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const now = () => Date.now();
const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const rid = (p) => p + now().toString(36) + Math.random().toString(36).slice(2, 7);

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === "/bridges" || path.startsWith("/bridges/")) return await handleBridges(req, env);
      if (path.startsWith("/auth/")) return await auth(req, env, url, path);
      if (path.startsWith("/api/")) return await api(req, env, url, path);
      if (path === "/ev") return await tallyEv(req, env, url);
      if (path === "/sitemap.xml" || path === "/llms.txt" || path === "/llms-full.txt" || path === "/i" || path.startsWith("/i/")) return await discoverCached(req, env, url, path, ctx);
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e && e.stack || e);
      return json(500, { error: "Something went wrong. Please try again." });
    }
  },
};

/* ---------------- sessions ---------------- */
const enc = new TextEncoder();
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

async function makeSession(env, uid) {
  const payload = b64u(JSON.stringify({ u: uid, e: now() + SESSION_DAYS * 864e5 }));
  return payload + "." + await hmac(env.SESSION_SECRET, payload);
}
async function readSession(req, env) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|; )sl=([^;]+)/);
  if (!m || !env.SESSION_SECRET) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig || sig !== await hmac(env.SESSION_SECRET, payload)) return null;
  try {
    const d = JSON.parse(unb64u(payload));
    return d.e > now() ? d.u : null;
  } catch { return null; }
}
async function getUser(req, env) {
  const uid = await readSession(req, env);
  if (!uid) return null;
  const u = await env.DB.prepare("SELECT id, name, email, picture, role FROM users WHERE id = ?").bind(uid).first();
  if (!u || u.role === "blocked") return null;
  return u;
}
const cookie = (value, maxAge) => `sl=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

/* ---------------- sign-in ---------------- */
async function auth(req, env, url, path) {
  const origin = url.origin;
  if (path === "/auth/logout") {
    return new Response(null, { status: 302, headers: { location: "/", "set-cookie": cookie("", 0) } });
  }
  if (path === "/auth/dev" && env.DEV_LOGIN === "1") {
    const name = url.searchParams.get("name") || "Test person";
    const id = "dev:" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await upsertUser(env, { id, name, email: url.searchParams.get("email") || name + "@example.com", picture: "" });
    return new Response(null, { status: 302, headers: { location: "/", "set-cookie": cookie(await makeSession(env, id), SESSION_DAYS * 86400) } });
  }
  if (path === "/auth/google") {
    if (!env.GOOGLE_CLIENT_ID) return json(503, { error: "Sign-in is not set up yet." });
    const state = crypto.randomUUID();
    const q = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID, redirect_uri: origin + "/auth/callback", response_type: "code",
      scope: "openid email profile", state, prompt: "select_account",
    });
    return new Response(null, {
      status: 302,
      headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?" + q, "set-cookie": `slstate=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
    });
  }
  if (path === "/auth/callback") {
    const st = (req.headers.get("cookie") || "").match(/(?:^|; )slstate=([^;]+)/);
    if (!st || st[1] !== url.searchParams.get("state") || !url.searchParams.get("code")) return json(400, { error: "Sign-in did not complete. Please try again." });
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code"), client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: origin + "/auth/callback", grant_type: "authorization_code",
      }),
    });
    const t = await r.json();
    if (!r.ok || !t.id_token) return json(400, { error: "Google did not accept the sign-in." });
    // the token came straight from Google over TLS, so its payload can be trusted
    const claims = JSON.parse(unb64u(t.id_token.split(".")[1]));
    if (claims.aud !== env.GOOGLE_CLIENT_ID || !claims.sub) return json(400, { error: "Sign-in could not be verified." });
    await upsertUser(env, { id: "g:" + claims.sub, name: claims.name || (claims.email || "").split("@")[0] || "Someone", email: claims.email || "", picture: claims.picture || "" });
    return new Response(null, {
      status: 302,
      headers: new Headers([["location", "/"], ["set-cookie", cookie(await makeSession(env, "g:" + claims.sub), SESSION_DAYS * 86400)], ["set-cookie", "slstate=; Path=/auth; Max-Age=0"]]),
    });
  }
  if (path === "/auth/github") {
    if (!env.GITHUB_CLIENT_ID) return json(503, { error: "This sign-in is not set up yet." });
    const state = crypto.randomUUID();
    const q = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: origin + "/auth/github/callback", scope: "read:user user:email", state });
    return new Response(null, {
      status: 302,
      headers: { location: "https://github.com/login/oauth/authorize?" + q, "set-cookie": `slstate=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
    });
  }
  if (path === "/auth/github/callback") {
    const st = (req.headers.get("cookie") || "").match(/(?:^|; )slstate=([^;]+)/);
    if (!st || st[1] !== url.searchParams.get("state") || !url.searchParams.get("code")) return json(400, { error: "Sign-in did not complete. Please try again." });
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: origin + "/auth/github/callback" }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) return json(400, { error: "GitHub did not accept the sign-in." });
    const gh = { authorization: "Bearer " + t.access_token, accept: "application/vnd.github+json", "user-agent": "the-map-of-ideas" };
    const u = await (await fetch("https://api.github.com/user", { headers: gh })).json();
    if (!u || !u.id) return json(400, { error: "Sign-in could not be verified." });
    // only a verified primary address counts, because an address can make someone an admin
    let email = "";
    try {
      const em = await (await fetch("https://api.github.com/user/emails", { headers: gh })).json();
      const p = Array.isArray(em) ? em.find((x) => x.primary && x.verified) : null;
      if (p) email = p.email;
    } catch {}
    await upsertUser(env, { id: "gh:" + u.id, name: u.name || u.login || "Someone", email, picture: u.avatar_url || "" });
    return new Response(null, {
      status: 302,
      headers: new Headers([["location", "/"], ["set-cookie", cookie(await makeSession(env, "gh:" + u.id), SESSION_DAYS * 86400)], ["set-cookie", "slstate=; Path=/auth; Max-Age=0"]]),
    });
  }
  return json(404, { error: "Not found" });
}

/* ---------------- email + password ---------------- */
async function pbkdf2(pw, salt) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, k, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
async function emailAuth(env, body, mode) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS creds (email TEXT PRIMARY KEY, uid TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL)").run();
  const email = String(body.email || "").trim().toLowerCase();
  const pw = String(body.password || "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return { err: "That email does not look right." };
  if (pw.length < 8 || pw.length > 200) return { err: "Please use a password of at least 8 characters." };
  const tries = `a:${dayKey()}:${email}`;
  if (await getN(env, tries) >= 20) return { err: "Too many tries today. Please come back tomorrow." };
  await addN(env, tries, 1);
  const row = await env.DB.prepare("SELECT uid, salt, hash FROM creds WHERE email = ?").bind(email).first();
  if (mode === "signup") {
    if (row) return { err: "That email already has an account. Try signing in." };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const uid = "e:" + crypto.randomUUID();
    // the address is not verified, so it is kept out of the users table (it could otherwise grant admin)
    await upsertUser(env, { id: uid, name: clip(String(body.name || "").trim(), 80) || email.split("@")[0], email: "", picture: "" });
    await env.DB.prepare("INSERT INTO creds (email, uid, salt, hash) VALUES (?, ?, ?, ?)").bind(email, uid, btoa(String.fromCharCode(...salt)), await pbkdf2(pw, salt)).run();
    return { uid };
  }
  if (!row) return { err: "Email or password is not right." };
  const salt = Uint8Array.from(atob(row.salt), (c) => c.charCodeAt(0));
  if (await pbkdf2(pw, salt) !== row.hash) return { err: "Email or password is not right." };
  return { uid: row.uid };
}
async function upsertUser(env, u) {
  const admins = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin = u.email && admins.includes(u.email.toLowerCase());
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, picture, role, created) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, picture = excluded.picture,
       role = CASE WHEN users.role = 'blocked' THEN 'blocked' WHEN ? = 1 THEN 'admin' ELSE users.role END`
  ).bind(u.id, clip(u.name, 80), clip(u.email, 120), clip(u.picture, 300), isAdmin ? "admin" : "member", now(), isAdmin ? 1 : 0).run();
}

/* ---------------- counters ---------------- */
const dayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
async function getN(env, k) {
  const r = await env.DB.prepare("SELECT n FROM usage WHERE k = ?").bind(k).first();
  return r ? r.n : 0;
}
async function addN(env, k, n) {
  await env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n").bind(k, n).run();
}

/* ---------------- who wrote it: names, summaries and writing as someone ----------------
   Each change (a new idea, an edit, a restore) can carry a short summary of what changed and a switch
   that shows it to readers as written by "someone". The table is made the first time it is needed, so it
   needs no change to the live database by hand. The system still records who wrote everything: the person
   themselves and the curators can see the name, other readers cannot. */
let metaReady = false;
async function ensureMeta(env) {
  if (metaReady) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS rev_meta (rev_id INTEGER PRIMARY KEY, anon INTEGER NOT NULL DEFAULT 0, note TEXT)").run();
  metaReady = true;
}
// goes right after the INSERT INTO revisions statement of a batch, and returns [] when there is nothing to keep
const metaStmt = (env, b) => {
  const anon = b && (b.anon === true || b.anon === 1) ? 1 : 0, note = clip(b && b.note, 140);
  return anon || note ? [env.DB.prepare("INSERT INTO rev_meta (rev_id, anon, note) VALUES (last_insert_rowid(), ?, ?)").bind(anon, note || null)] : [];
};
// the name a reader gets to see
const shown = (anon, name, id, me) => {
  if (!anon) return name || null;
  if (me && id && id === me.id) return "you, as someone";
  return me && me.role === "admin" && name ? `someone (${name})` : "someone";
};
/* Which ideas were written, or last changed, as "someone". Only a handful of changes carry the switch, so we read just those
   instead of looking into the history of every idea on every request. */
async function anonSets(env) {
  const created = new Set(), last = new Set();
  const { results } = await env.DB.prepare("SELECT r.id, r.star_id FROM rev_meta m JOIN revisions r ON r.id = m.rev_id WHERE m.anon = 1").all();
  if (!results.length) return { created, last };
  const anonRev = new Set(results.map((r) => r.id)), starIds = [...new Set(results.map((r) => r.star_id))];
  for (let i = 0; i < starIds.length; i += 80) {
    const part = starIds.slice(i, i + 80);
    const { results: revs } = await env.DB.prepare(`SELECT id, star_id, action FROM revisions WHERE star_id IN (${part.map(() => "?").join(",")}) AND action IN ('create','edit','revert') ORDER BY id`).bind(...part).all();
    const first = {}, lastId = {};
    for (const r of revs) { if (r.action === "create" && first[r.star_id] == null) first[r.star_id] = r.id; lastId[r.star_id] = r.id; }
    for (const id of part) { if (first[id] != null && anonRev.has(first[id])) created.add(id); if (lastId[id] != null && anonRev.has(lastId[id])) last.add(id); }
  }
  return { created, last };
}
/* names of the people who added or changed ideas; ideas from the seed have none, so this is a few rows */
async function userNames(env, ids) {
  const want = [...new Set(ids.filter((x) => x && x !== "seed"))], out = {};
  for (let i = 0; i < want.length; i += 80) {
    const part = want.slice(i, i + 80);
    const { results } = await env.DB.prepare(`SELECT id, name FROM users WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part).all();
    for (const u of results) out[u.id] = u.name;
  }
  return out;
}
// other people's account codes are not shown to readers
const other = (id, me) => (id === "seed" || (me && id === me.id) ? id : "other");

/* ---------------- API ---------------- */
/* Every successful change bumps a small counter. Open pages ask for the counter (one row) and only reload the
   map when it moved, instead of re-reading the whole map every few seconds. */
const VER_KEY = "ver:godel";
const NOISE = /^\/api\/(favs|ask|signup|signin)/;
async function api(req, env, url, path) {
  const res = await apiInner(req, env, url, path);
  if (req.method !== "GET" && res.status < 400 && !NOISE.test(path)) {
    cacheClear();
    try { await addN(env, VER_KEY, 1); } catch (e) { console.error("ver", e && e.message); }
  }
  return res;
}
async function getVersion(env) {
  const r = await env.DB.prepare("SELECT n FROM usage WHERE k = ?").bind(VER_KEY).first();
  return r ? r.n : 0;
}
/* short-lived copies kept in the worker, so a crowd of readers costs one database load, not one each */
const MEM = {};
const cacheClear = () => { for (const k of Object.keys(MEM)) delete MEM[k]; };
async function memo(key, ttlMs, make) {
  const hit = MEM[key];
  if (hit && now() - hit.t < ttlMs) return hit.v;
  const v = await make();
  MEM[key] = { t: now(), v };
  return v;
}
async function apiInner(req, env, url, path) {
  const method = req.method;
  if (method !== "GET") {
    // only our own pages may write
    const o = req.headers.get("origin");
    if (o && o !== url.origin) return json(403, { error: "Not allowed from here." });
    if (!(req.headers.get("content-type") || "").includes("application/json")) return json(415, { error: "Expected JSON." });
  }
  const me = await getUser(req, env);
  const body = method === "GET" || method === "DELETE" ? {} : await req.json().catch(() => ({}));
  await ensureMeta(env);
  let m;

  if ((path === "/api/signup" || path === "/api/signin") && method === "POST") {
    const r = await emailAuth(env, body, path === "/api/signup" ? "signup" : "signin");
    if (r.err) return json(400, { error: r.err });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json", "set-cookie": cookie(await makeSession(env, r.uid), SESSION_DAYS * 86400) } });
  }

  if (path === "/api/me") return json(200, { me: publicMe(me), ai: !!env.ANTHROPIC_API_KEY, signin: true, providers: { google: !!env.GOOGLE_CLIENT_ID, github: !!env.GITHUB_CLIENT_ID }, dev: env.DEV_LOGIN === "1" });

  if (path === "/api/version" && method === "GET") return json(200, { v: await getVersion(env) });
  if ((m = path.match(/^\/api\/map\/([\w-]+)$/)) && method === "GET") return getMap(env, m[1], me, url.origin);
  if ((m = path.match(/^\/api\/recent\/([\w-]+)$/)) && method === "GET") return recent(env, m[1], me);

  if ((m = path.match(/^\/api\/paths\/([\w-]+)$/)) && method === "GET") return getPath(env, m[1]);
  // everything below needs a signed-in person
  if (!me) return json(401, { error: "Please sign in first." });

  // the owner reads the counts of what people do (anonymous hourly totals)
  if (path === "/api/stats" && method === "GET") return me.role === "admin" ? tallyStats(env, url) : json(403, { error: "Curators only." });

  // favorites and your corner: quiet, personal, and not counted as edits
  if (path === "/api/favs" && method === "GET") return listFavs(env, me);
  if ((m = path.match(/^\/api\/favs\/([\w-]+)$/))) {
    if (method === "POST") return addFav(env, me, m[1]);
    if (method === "DELETE") return removeFav(env, me, m[1]);
  }
  if (path === "/api/paths" && method === "GET") return listPaths(env, me);
  if (path === "/api/paths" && method === "POST") return savePath(env, me, body);
  if ((m = path.match(/^\/api\/paths\/([\w-]+)$/)) && method === "DELETE") return deletePath(env, me, m[1]);
  if (path === "/api/corner" && method === "GET") return corner(env, me);

  if (method !== "GET" && await getN(env, `w:${dayKey()}:${me.id}`) >= WRITES_PER_USER_DAY) return json(429, { error: "That is a lot of edits for one day. Please come back tomorrow." });

  if (path === "/api/stars" && method === "POST") return createStar(env, me, body);
  if (path === "/api/import" && method === "POST") return importNotes(env, me, body);
  if ((m = path.match(/^\/api\/stars\/([\w-]+)$/))) {
    if (method === "PATCH") return editStar(env, me, m[1], body);
    if (method === "DELETE") return deleteStar(env, me, m[1]);
  }
  if ((m = path.match(/^\/api\/stars\/([\w-]+)\/history$/)) && method === "GET") return history(env, me, m[1]);
  if ((m = path.match(/^\/api\/stars\/([\w-]+)\/revert$/)) && method === "POST") return revert(env, me, m[1], body);
  if ((m = path.match(/^\/api\/stars\/([\w-]+)\/vis$/)) && method === "POST") return setVis(env, me, m[1], body);
  if (path === "/api/links" && method === "POST") return createLink(env, me, body);
  if ((m = path.match(/^\/api\/links\/([\w-]+)$/)) && method === "PATCH") return readLink(env, me, m[1], body);
  if ((m = path.match(/^\/api\/links\/([\w-]+)$/)) && method === "DELETE") return deleteLink(env, me, m[1]);
  if (path === "/api/ask" && method === "POST") return ask(env, me, body);
  return json(404, { error: "Not found" });
}
const publicMe = (u) => (u ? { id: u.id, name: u.name, picture: u.picture, admin: u.role === "admin" } : null);

/* ---------------- favorites and your corner ---------------- */
let favsReady = false;
async function ensureFavs(env) {
  if (favsReady) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS favs (user_id TEXT NOT NULL, star_id TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (user_id, star_id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS link_rev (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id TEXT NOT NULL, side TEXT NOT NULL, editor TEXT NOT NULL, at INTEGER NOT NULL, prev TEXT, next TEXT)"),
  ]);
  favsReady = true;
}

/* paths: a walk through the map, saved by a signed-in person and opened by anyone with the link */
let pathsReady = false;
async function ensurePaths(env) {
  if (pathsReady) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS paths (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, ids TEXT NOT NULL, at INTEGER NOT NULL)").run();
  pathsReady = true;
}
const cleanIds = (a) => (Array.isArray(a) ? a : []).filter((x) => typeof x === "string" && /^[\w-]{1,80}$/.test(x)).slice(0, 40);
async function getPath(env, id) {
  await ensurePaths(env);
  const r = await env.DB.prepare("SELECT id, title, ids FROM paths WHERE id = ?").bind(id).first();
  if (!r) return json(404, { error: "No such path." });
  return json(200, { path: { id: r.id, title: r.title, ids: JSON.parse(r.ids) } });
}
async function listPaths(env, me) {
  await ensurePaths(env);
  const { results } = await env.DB.prepare("SELECT id, title, ids, at FROM paths WHERE user_id = ? ORDER BY at DESC LIMIT 100").bind(me.id).all();
  return json(200, { paths: results.map((r) => ({ id: r.id, title: r.title, ids: JSON.parse(r.ids), at: r.at })) });
}
async function savePath(env, me, body) {
  await ensurePaths(env);
  const ids = cleanIds(body.ids);
  const title = String(body.title || "").trim().slice(0, 80);
  if (ids.length < 2) return json(400, { error: "A path needs at least two ideas." });
  if (!title) return json(400, { error: "Give the path a name." });
  const have = await env.DB.prepare("SELECT COUNT(*) AS n FROM paths WHERE user_id = ?").bind(me.id).first();
  if (have && have.n >= 100) return json(400, { error: "That is plenty of paths for now." });
  const b = crypto.getRandomValues(new Uint8Array(6));
  const id = Array.from(b, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
  await env.DB.prepare("INSERT INTO paths (id, user_id, title, ids, at) VALUES (?,?,?,?,?)").bind(id, me.id, title, JSON.stringify(ids), now()).run();
  return json(200, { id });
}
async function deletePath(env, me, id) {
  await ensurePaths(env);
  await env.DB.prepare("DELETE FROM paths WHERE id = ? AND user_id = ?").bind(id, me.id).run();
  return json(200, { ok: true });
}
async function listFavs(env, me) {
  await ensureFavs(env);
  const { results } = await env.DB.prepare("SELECT star_id FROM favs WHERE user_id = ?").bind(me.id).all();
  return json(200, { favs: results.map((r) => r.star_id) });
}
async function addFav(env, me, id) {
  await ensureFavs(env);
  const s = await env.DB.prepare("SELECT id FROM stars WHERE id = ? AND deleted = 0 AND (vis = 'public' OR owner = ?)").bind(id, me.id).first();
  if (!s) return json(404, { error: "No such idea." });
  const have = await env.DB.prepare("SELECT COUNT(*) AS n FROM favs WHERE user_id = ?").bind(me.id).first();
  if (have && have.n >= 500) return json(400, { error: "That is plenty of favorites for now." });
  await env.DB.prepare("INSERT OR IGNORE INTO favs (user_id, star_id, at) VALUES (?,?,?)").bind(me.id, id, now()).run();
  return json(200, { ok: true });
}
async function removeFav(env, me, id) {
  await ensureFavs(env);
  await env.DB.prepare("DELETE FROM favs WHERE user_id = ? AND star_id = ?").bind(me.id, id).run();
  return json(200, { ok: true });
}
/* what a person has kept and made, read from what is already stored */
async function corner(env, me) {
  await ensureFavs(env);
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const [favs, ideas, edits, lines, readings] = await Promise.all([
    q("SELECT s.id, s.label, s.title, f.at FROM favs f JOIN stars s ON s.id = f.star_id WHERE f.user_id = ? AND s.deleted = 0 AND (s.vis = 'public' OR s.owner = ?) ORDER BY f.at DESC LIMIT 500", me.id, me.id),
    q("SELECT id, label, title, vis, updated AS at FROM stars WHERE owner = ? AND deleted = 0 ORDER BY updated DESC LIMIT 100", me.id),
    q("SELECT r.star_id AS id, r.action, r.at, r.label FROM revisions r JOIN stars s ON s.id = r.star_id WHERE r.editor = ? AND r.action IN ('edit','revert') AND s.deleted = 0 AND (s.vis = 'public' OR s.owner = ?) ORDER BY r.id DESC LIMIT 50", me.id, me.id),
    q("SELECT l.id, l.a, l.b, (SELECT label FROM stars WHERE id = l.a) AS la, (SELECT label FROM stars WHERE id = l.b) AS lb, l.created AS at FROM links l WHERE l.owner = ? AND l.deleted = 0 ORDER BY l.created DESC LIMIT 50", me.id),
    q("SELECT r.link_id AS id, l.a AS a, r.side, r.at, (SELECT label FROM stars WHERE id = l.a) AS la, (SELECT label FROM stars WHERE id = l.b) AS lb FROM link_rev r JOIN links l ON l.id = r.link_id WHERE r.editor = ? AND l.deleted = 0 ORDER BY r.id DESC LIMIT 50", me.id),
  ]);
  return json(200, { favs, ideas, edits, lines, readings });
}

/* the first time the map is opened, fill it from seed.json (the Gödel map) */
async function ensureSeed(env, origin) {
  const res = await env.ASSETS.fetch(new Request(origin + "/seed.json"));
  if (!res.ok) return;
  const d = await res.json();
  await seedFrom(env, d);
  // the map row goes in last, so a half-finished seed is retried next time
  await env.DB.prepare("INSERT OR IGNORE INTO maps (id, title, center) VALUES (?,?,?)").bind(d.map.id, d.map.title, d.map.center).run();
}

/* more topics around the center of the same map. Each is added once, on the first visit after it ships,
   to a database that is already seeded. The topic star is the last row in its file and doubles as the marker. */
const TOPICS = [{ star: "music", file: "/seed-music.json" }, { star: "history", file: "/seed-topics.json" }, { star: "q_g_axioms", file: "/seed-questions.json" }, { star: "art", file: "/seed-topics-2.json" }, { star: "q_x_voices", file: "/seed-questions-2.json" }];
let topicsDone = false;
async function ensureTopics(env, origin) {
  if (topicsDone) return;
  let all = true;
  for (const tp of TOPICS) {
    const have = await env.DB.prepare("SELECT 1 FROM stars WHERE id = ?").bind(tp.star).first();
    if (have) continue;
    const res = await env.ASSETS.fetch(new Request(origin + tp.file));
    if (!res.ok) { all = false; continue; }
    await seedFrom(env, await res.json());
  }
  if (all) topicsDone = true;
}

async function seedFrom(env, d) {
  const t = now();
  const st = [];
  for (const g of d.groups) st.push(env.DB.prepare("INSERT OR IGNORE INTO groups (id, map_id, name, angle, radius) VALUES (?,?,?,?,?)").bind(g.id, d.map.id, g.name, g.angle, g.radius));
  for (const s of d.stars) {
    st.push(env.DB.prepare("INSERT OR IGNORE INTO stars (id, map_id, grp, kind, size, label, title, body, body_html, owner, vis, deleted, created, updated, updated_by, sources) VALUES (?,?,?,?,?,?,?,?,1,'seed','public',0,?,?,NULL,?)").bind(s.id, d.map.id, s.grp, s.kind, s.size, s.label, s.title, s.body, t, t, JSON.stringify(cleanSources(s.sources))));
    st.push(env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis, sources) SELECT ?,?,'seed',?,'create',?,?,?,?,'public',? WHERE NOT EXISTS (SELECT 1 FROM revisions WHERE star_id = ? AND editor = 'seed')").bind(s.id, d.map.id, t, s.label, s.title, s.body, s.kind, JSON.stringify(cleanSources(s.sources)), s.id));
  }
  for (const [a, b, ab, ba] of d.links) st.push(env.DB.prepare("INSERT OR IGNORE INTO links (id, map_id, a, b, note, ab, ba, owner, vis, deleted, created) VALUES (?,?,?,?,NULL,?,?,'seed','public',0,?)").bind("l_" + a + "__" + b, d.map.id, a, b, ab || null, ba || null, t));
  for (let i = 0; i < st.length; i += 40) await env.DB.batch(st.slice(i, i + 40));
}

async function getMap(env, mapId, me, origin) {
  /* readers who are not signed in all see the same thing, so they share one copy for a minute */
  const r = !me ? await memo("map:" + mapId, 60000, () => loadMap(env, mapId, null, origin)) : await loadMap(env, mapId, me, origin);
  return json(r.code, r.body);
}
async function loadMap(env, mapId, me, origin) {
  let map = await env.DB.prepare("SELECT id, title, center FROM maps WHERE id = ?").bind(mapId).first();
  if (!map && mapId === "godel") {
    await ensureSeed(env, origin);
    map = await env.DB.prepare("SELECT id, title, center FROM maps WHERE id = ?").bind(mapId).first();
  }
  if (!map) return { code: 404, body: { error: "No such map." } };
  if (mapId === "godel") { try { await ensureTopics(env, origin); } catch (e) { console.error("topics", e && e.message); } }
  const uid = me ? me.id : "-";
  const [groups, stars, links, anon, ver] = await Promise.all([
    env.DB.prepare("SELECT id, name, angle, radius FROM groups WHERE map_id = ?").bind(mapId).all(),
    env.DB.prepare(
      `SELECT s.id, s.grp, s.kind, s.size, s.label, s.title, s.body, s.body_html AS html, s.sources, s.owner, s.vis, s.updated, s.updated_by AS ub
       FROM stars s WHERE s.map_id = ? AND s.deleted = 0 AND (s.vis = 'public' OR s.owner = ?)`
    ).bind(mapId, uid).all(),
    env.DB.prepare("SELECT id, a, b, note, ab, ba, owner, vis FROM links WHERE map_id = ? AND deleted = 0 AND (vis = 'public' OR owner = ?)").bind(mapId, uid).all(),
    anonSets(env),
    getVersion(env),
  ]);
  const names = await userNames(env, stars.results.flatMap((x) => [x.owner, x.ub]));
  const ids = new Set(stars.results.map((s) => s.id));
  const outStars = stars.results.map(({ ub, ...x }) => ({
    ...x,
    owner: other(x.owner, me),
    owner_name: x.owner === "seed" ? null : shown(anon.created.has(x.id) ? 1 : 0, names[x.owner] || null, x.owner, me),
    ub_name: ub ? shown(anon.last.has(x.id) ? 1 : 0, names[ub] || null, ub, me) : null,
    sources: parseSources(x.sources),
  }));
  const outLinks = links.results.filter((l) => ids.has(l.a) && ids.has(l.b)).map((l) => ({ ...l, owner: other(l.owner, me) }));
  return { code: 200, body: { map, groups: groups.results, stars: outStars, links: outLinks, me: publicMe(me), ver } };
}

async function recent(env, mapId, me) {
  const results = await memo("recent:" + mapId, 60000, async () => (await env.DB.prepare(
    `SELECT r.id, r.star_id, r.action, r.at, r.label, r.editor AS eid, (SELECT name FROM users WHERE id = r.editor) AS ename, COALESCE(m.anon, 0) AS anon
     FROM revisions r JOIN stars s ON s.id = r.star_id LEFT JOIN rev_meta m ON m.rev_id = r.id
     WHERE r.map_id = ? AND s.vis = 'public' AND s.deleted = 0 AND r.action != 'share' AND r.action != 'unshare'
     ORDER BY r.id DESC LIMIT 30`
  ).bind(mapId).all()).results);
  return json(200, { recent: results.map((r) => ({ id: r.id, star_id: r.star_id, action: r.action, at: r.at, label: r.label, editor: shown(r.anon, r.ename, r.eid, me) || "the first curators" })) });
}

async function logRev(env, star, editor, action) {
  await env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(star.id, star.map_id, editor, now(), action, star.label, star.title, star.body, star.kind, star.vis).run();
}
const canSee = (s, me) => s && !s.deleted && (s.vis === "public" || s.owner === me.id);

async function createStar(env, me, b) {
  const map = await env.DB.prepare("SELECT id FROM maps WHERE id = ?").bind(clip(b.map, 40)).first();
  if (!map) return json(404, { error: "No such map." });
  const label = clip(b.label, 34), body = clip(b.body, 2500);
  if (!label) return json(400, { error: "Give the star a name." });
  if (body.length < 12) return json(400, { error: "Add a sentence or two so others can follow it." });
  const kind = KINDS.includes(b.kind) ? b.kind : "f";
  const vis = b.vis === "private" ? "private" : "public";
  const linkIds = [...new Set((Array.isArray(b.links) ? b.links : []).map(String))].slice(0, 8);
  const targets = [];
  for (const id of linkIds) {
    const t = await env.DB.prepare("SELECT id, grp, owner, vis, deleted FROM stars WHERE id = ? AND map_id = ?").bind(id, map.id).first();
    if (canSee(t, me)) targets.push(t);
  }
  if (!targets.length) return json(400, { error: "Connect it to at least one star, so it sits inside the web." });
  // a public star cannot hang only on private stars
  if (vis === "public" && !targets.some((t) => t.vis === "public")) return json(400, { error: "A public star needs at least one public star to connect to." });
  const first = targets.find((t) => t.grp !== "hub") || targets[0];
  const grp = first.grp === "hub" ? "th" : first.grp;
  const id = rid("u_");
  const sources = JSON.stringify(cleanSources(b.sources));
  const star = { id, map_id: map.id, grp, kind, label, title: label, body, vis };
  const t = now();
  const stmts = [
    env.DB.prepare("INSERT INTO stars (id, map_id, grp, kind, size, label, title, body, body_html, owner, vis, deleted, created, updated, updated_by, sources) VALUES (?,?,?,?,2,?,?,?,0,?,?,0,?,?,?,?)")
      .bind(id, map.id, grp, kind, label, label, body, me.id, vis, t, t, me.id, sources),
    ...targets.map((x) => env.DB.prepare("INSERT INTO links (id, map_id, a, b, note, owner, vis, deleted, created) VALUES (?,?,?,?,?,?,?,0,?)")
      .bind(rid("l_"), map.id, id, x.id, null, me.id, vis === "public" && x.vis === "public" ? "public" : "private", t)),
    env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis, sources) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, map.id, me.id, t, "create", label, label, body, kind, vis, sources),
    ...metaStmt(env, { anon: b.anon }),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(`w:${dayKey()}:${me.id}`),
  ];
  await env.DB.batch(stmts);
  return json(200, { id });
}

/* Bring in a folder of notes (markdown, from Obsidian or anywhere). Everything arrives private.
   The page reads the files and sends { map, folder, notes: [{ label, body, links: [titles], sources }] }.
   Notes that link to each other keep those lines. A note whose title matches an idea already on the map
   is joined to it. One private idea named after the folder holds the rest, so it all sits inside the web. */
const IMPORT_MAX = 100;
async function importNotes(env, me, b) {
  const map = await env.DB.prepare("SELECT id, center FROM maps WHERE id = ?").bind(clip(b.map, 40)).first();
  if (!map) return json(404, { error: "No such map." });
  const raw = Array.isArray(b.notes) ? b.notes : [];
  if (raw.length > IMPORT_MAX) return json(400, { error: `That is more than ${IMPORT_MAX} notes. Try a smaller folder.` });
  if (!raw.length) return json(400, { error: "No notes found." });
  const used = await getN(env, `w:${dayKey()}:${me.id}`);
  if (used + raw.length + 1 > WRITES_PER_USER_DAY) return json(429, { error: "That is a lot of edits for one day. Please come back tomorrow." });

  const folder = clip(b.folder, 34) || "My notes";
  const ex = await env.DB.prepare("SELECT id, grp, label, owner FROM stars WHERE map_id = ? AND deleted = 0 AND (vis = 'public' OR owner = ?)").bind(map.id, me.id).all();
  const exBy = new Map(), mine = new Set();
  for (const s of ex.results) {
    const k = s.label.toLowerCase();
    if (!exBy.has(k)) exBy.set(k, s);
    if (s.owner === me.id) mine.add(k);
  }

  // clean the notes; a title you already own is left alone, so a second import adds only what is new
  const notes = [], pos = new Map();
  for (const x of raw) {
    const label = clip(x && x.label, 34), k = label.toLowerCase();
    if (!label || pos.has(k) || mine.has(k)) continue;
    let body = clip(x.body, 2500);
    if (body.length < 12) body = `Brought in from ${folder}.`;
    pos.set(k, notes.length);
    notes.push({ id: rid("u_"), label, body, kind: "f", grp: "th", sources: JSON.stringify(cleanSources(x.sources)), want: (Array.isArray(x.links) ? x.links : []).slice(0, 40).map((s) => clip(s, 80).toLowerCase()).filter(Boolean) });
  }
  if (!notes.length) return json(400, { error: "Those notes are already on your map." });

  // lines: note to note, and note to an idea that is already there
  const pairs = new Map(); let met = 0;
  const addPair = (a, c) => { if (a !== c) { const key = a < c ? a + "|" + c : c + "|" + a; if (!pairs.has(key)) pairs.set(key, [a, c]); } };
  const parent = notes.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  notes.forEach((n, i) => {
    const same = exBy.get(n.label.toLowerCase());
    const targets = [];
    if (same) targets.push({ ext: same });
    for (const w of n.want) {
      const j = pos.get(w);
      if (j !== undefined && j !== i) targets.push({ note: j });
      else if (j === undefined && exBy.has(w)) targets.push({ ext: exBy.get(w) });
    }
    for (const t of targets.slice(0, 12)) {
      if (t.note !== undefined) { addPair(n.id, notes[t.note].id); parent[find(i)] = find(t.note); }
      else { addPair(n.id, t.ext.id); met++; if (n.grp === "th" && t.ext.grp && t.ext.grp !== "hub") n.grp = t.ext.grp; }
    }
  });

  // one private idea for the folder, joined to the center; each cluster of notes hangs from it
  const fid = rid("u_"), t0 = now();
  const roots = new Set(notes.map((_, i) => find(i)));
  addPair(fid, map.center);
  roots.forEach((r) => addPair(fid, notes[r].id));
  const fbody = `Notes brought in from ${folder}. ${notes.length} of them, private to you.`;
  const all = [{ id: fid, label: folder, body: fbody, kind: "f", grp: "th", sources: "[]" }, ...notes];

  const sIns = all.map((s) => env.DB.prepare("INSERT INTO stars (id, map_id, grp, kind, size, label, title, body, body_html, owner, vis, deleted, created, updated, updated_by, sources) VALUES (?,?,?,?,2,?,?,?,0,?,'private',0,?,?,?,?)").bind(s.id, map.id, s.grp, s.kind, s.label, s.label, s.body, me.id, t0, t0, me.id, s.sources));
  const lIns = [...pairs.values()].map(([a, c]) => env.DB.prepare("INSERT INTO links (id, map_id, a, b, note, owner, vis, deleted, created) VALUES (?,?,?,?,NULL,?,'private',0,?)").bind(rid("l_"), map.id, a, c, me.id, t0));
  const rIns = all.map((s) => env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis, sources) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(s.id, map.id, me.id, t0, "create", s.label, s.label, s.body, s.kind, "private", s.sources));
  const stmts = [...sIns, ...lIns, ...rIns];
  for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
  await addN(env, `w:${dayKey()}:${me.id}`, all.length);
  return json(200, { id: fid, notes: notes.length, lines: pairs.size, met });
}

async function editStar(env, me, id, b) {
  const s = await env.DB.prepare("SELECT * FROM stars WHERE id = ?").bind(id).first();
  if (!canSee(s, me)) return json(404, { error: "That star is not there." });
  // wiki rule: any signed-in person can edit a public star; private stars belong to their owner
  const label = clip(b.label ?? s.label, 34), body = clip(b.body ?? (s.body_html ? stripHtml(s.body) : s.body), 2500);
  const kind = KINDS.includes(b.kind) ? b.kind : s.kind;
  if (!label || body.length < 12) return json(400, { error: "A star needs a name and a sentence or two." });
  const sourcesJ = JSON.stringify(b.sources !== undefined ? cleanSources(b.sources) : parseSources(s.sources));
  await env.DB.batch([
    env.DB.prepare("UPDATE stars SET label=?, title=?, body=?, body_html=0, kind=?, sources=?, updated=?, updated_by=? WHERE id=?").bind(label, label, body, kind, sourcesJ, now(), me.id, id),
    env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis, sources) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, s.map_id, me.id, now(), "edit", label, label, body, kind, s.vis, sourcesJ),
    ...metaStmt(env, { anon: b.anon, note: b.note }),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(`w:${dayKey()}:${me.id}`),
  ]);
  return json(200, { ok: true });
}
const cleanSources = (a) => (Array.isArray(a) ? a : []).slice(0, 6).map((x) => {
  const t = clip(x && x.t, 160);
  let u = String((x && x.u) || "").trim().slice(0, 300);
  if (u) { try { const p = new URL(u); if (p.protocol !== "https:" && p.protocol !== "http:") u = ""; else u = p.href; } catch { u = ""; } }
  if (!t && !u) return null;
  return u ? { t: t || new URL(u).hostname, u } : { t };
}).filter(Boolean);
const parseSources = (s) => { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const stripHtml = (h) => String(h).replace(/<\/p>\s*<p>/g, "\n\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

async function deleteStar(env, me, id) {
  const s = await env.DB.prepare("SELECT * FROM stars WHERE id = ?").bind(id).first();
  if (!canSee(s, me)) return json(404, { error: "That star is not there." });
  if (s.id === "hub") return json(403, { error: "The center stays." });
  if (s.owner !== me.id && me.role !== "admin") return json(403, { error: "Only the person who added a star, or a curator, can remove it." });
  await env.DB.batch([
    env.DB.prepare("UPDATE stars SET deleted = 1, updated = ?, updated_by = ? WHERE id = ?").bind(now(), me.id, id),
    env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, s.map_id, me.id, now(), "delete", s.label, s.title, s.body, s.kind, s.vis),
  ]);
  return json(200, { ok: true });
}

async function history(env, me, id) {
  const s = await env.DB.prepare("SELECT * FROM stars WHERE id = ?").bind(id).first();
  if (!canSee(s, me)) return json(404, { error: "That star is not there." });
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.action, r.at, r.label, r.body, r.kind, r.editor AS eid, (SELECT name FROM users WHERE id = r.editor) AS ename, COALESCE(m.anon, 0) AS anon, m.note AS note
     FROM revisions r LEFT JOIN rev_meta m ON m.rev_id = r.id WHERE r.star_id = ? ORDER BY r.id DESC LIMIT 40`
  ).bind(id).all();
  return json(200, { history: results.map((r) => ({ id: r.id, action: r.action, at: r.at, label: r.label, body: r.body, kind: r.kind, note: r.note || null, editor: shown(r.anon, r.ename, r.eid, me) || "the first curators" })) });
}

async function revert(env, me, id, b) {
  const s = await env.DB.prepare("SELECT * FROM stars WHERE id = ?").bind(id).first();
  if (!canSee(s, me)) return json(404, { error: "That star is not there." });
  const r = await env.DB.prepare("SELECT * FROM revisions WHERE id = ? AND star_id = ? AND action IN ('create','edit','revert')").bind(Number(b.revision) || 0, id).first();
  if (!r) return json(404, { error: "That version is not there." });
  const rbody = r.editor === "seed" ? stripHtml(r.body) : r.body; // the first curators wrote HTML
  const rsrc = r.sources != null ? r.sources : (s.sources || "[]");
  await env.DB.batch([
    env.DB.prepare("UPDATE stars SET label=?, title=?, body=?, body_html=0, kind=?, sources=?, updated=?, updated_by=? WHERE id=?").bind(r.label, r.label, rbody, r.kind, rsrc, now(), me.id, id),
    env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis, sources) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, s.map_id, me.id, now(), "revert", r.label, r.label, rbody, r.kind, s.vis, rsrc),
    ...metaStmt(env, { anon: b.anon, note: b.note }),
  ]);
  return json(200, { ok: true });
}

async function setVis(env, me, id, b) {
  const s = await env.DB.prepare("SELECT * FROM stars WHERE id = ?").bind(id).first();
  if (!canSee(s, me)) return json(404, { error: "That star is not there." });
  if (s.owner !== me.id) return json(403, { error: "Only the person who added a star can change who sees it." });
  const vis = b.vis === "public" ? "public" : "private";
  if (vis === s.vis) return json(200, { ok: true });
  if (vis === "public") {
    // it needs a public neighbour so it sits inside the shared web
    const n = await env.DB.prepare(
      `SELECT 1 FROM links l JOIN stars o ON o.id = (CASE WHEN l.a = ? THEN l.b ELSE l.a END)
       WHERE (l.a = ? OR l.b = ?) AND l.deleted = 0 AND o.vis = 'public' AND o.deleted = 0 LIMIT 1`
    ).bind(id, id, id).first();
    if (!n) return json(400, { error: "Link it to at least one public star before sharing it." });
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE stars SET vis = ?, updated = ? WHERE id = ?").bind(vis, now(), id),
    // the owner's links follow the star: public only when both ends are public
    env.DB.prepare(
      `UPDATE links SET vis = CASE WHEN (SELECT vis FROM stars WHERE id = links.a) = 'public' AND (SELECT vis FROM stars WHERE id = links.b) = 'public' THEN 'public' ELSE 'private' END
       WHERE (a = ? OR b = ?) AND deleted = 0 AND owner = ?`
    ).bind(id, id, me.id),
    env.DB.prepare("INSERT INTO revisions (star_id, map_id, editor, at, action, label, title, body, kind, vis) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, s.map_id, me.id, now(), vis === "public" ? "share" : "unshare", s.label, s.title, s.body, s.kind, vis),
  ]);
  return json(200, { ok: true });
}

async function createLink(env, me, b) {
  const mapId = clip(b.map, 40);
  const a = await env.DB.prepare("SELECT * FROM stars WHERE id = ? AND map_id = ?").bind(String(b.a), mapId).first();
  const c = await env.DB.prepare("SELECT * FROM stars WHERE id = ? AND map_id = ?").bind(String(b.b), mapId).first();
  if (!canSee(a, me) || !canSee(c, me) || a.id === c.id) return json(400, { error: "Those two stars cannot be linked." });
  const dup = await env.DB.prepare("SELECT 1 FROM links WHERE map_id = ? AND deleted = 0 AND ((a=? AND b=?) OR (a=? AND b=?))").bind(mapId, a.id, c.id, c.id, a.id).first();
  if (dup) return json(200, { ok: true });
  const vis = a.vis === "public" && c.vis === "public" && b.vis !== "private" ? "public" : "private";
  await env.DB.batch([
    env.DB.prepare("INSERT INTO links (id, map_id, a, b, note, ab, ba, owner, vis, deleted, created) VALUES (?,?,?,?,?,?,?,?,?,0,?)").bind(rid("l_"), mapId, a.id, c.id, clip(b.note, 200) || null, clip(b.ab, 300) || null, clip(b.ba, 300) || null, me.id, vis, now()),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(`w:${dayKey()}:${me.id}`),
  ]);
  return json(200, { ok: true, vis });
}
// how one idea reads when seen from another: anyone signed in can write or change it, and every change is kept
async function readLink(env, me, id, b) {
  const l = await env.DB.prepare("SELECT * FROM links WHERE id = ? AND deleted = 0").bind(id).first();
  if (!l || (l.vis === "private" && l.owner !== me.id)) return json(404, { error: "That link is not there." });
  const from = String(b.from || "");
  if (from !== l.a && from !== l.b) return json(400, { error: "That star is not on this link." });
  const text = clip(b.text, 300);
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS link_rev (id INTEGER PRIMARY KEY AUTOINCREMENT, link_id TEXT NOT NULL, side TEXT NOT NULL, editor TEXT NOT NULL, at INTEGER NOT NULL, prev TEXT, next TEXT)"),
  ]);
  const col = from === l.a ? "ab" : "ba";
  await env.DB.batch([
    env.DB.prepare("INSERT INTO link_rev (link_id, side, editor, at, prev, next) VALUES (?,?,?,?,?,?)").bind(id, col, me.id, now(), l[col] || null, text || null),
    env.DB.prepare(`UPDATE links SET ${col} = ? WHERE id = ?`).bind(text || null, id),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(`w:${dayKey()}:${me.id}`),
  ]);
  return json(200, { ok: true });
}
async function deleteLink(env, me, id) {
  const l = await env.DB.prepare("SELECT * FROM links WHERE id = ? AND deleted = 0").bind(id).first();
  if (!l) return json(404, { error: "That link is not there." });
  if (l.vis === "private" && l.owner !== me.id) return json(404, { error: "That link is not there." });
  if (l.owner !== me.id && me.role !== "admin") return json(403, { error: "Only the person who made a link, or a curator, can remove it." });
  await env.DB.prepare("UPDATE links SET deleted = 1 WHERE id = ?").bind(id).run();
  return json(200, { ok: true });
}

/* ---------------- the assistant ---------------- */
const RULES = `You are the quiet guide of The Map of Ideas, a shared map of ideas across many topics, from mathematics and music to religions and cultures. Each "star" is one idea, question or reading, explained in plain words, and stars are linked to the ones they touch.
Speak simply, like a thoughtful friend. Use short sentences and plain words. No lists unless asked. No em-dashes. Do not use contrast phrasing such as "not X but Y".
When someone asks something, answer it directly in a few sentences, using the stars you are given when they help. Then ask ONE short question that helps them think further, or that points to a link between two ideas.
If you are unsure of a fact, say so. Never invent sources.`;

const SUGGEST_RULES = `You help place a new star into the map. Given the new star and the list of existing stars (id: label), pick up to 4 existing stars it most naturally connects to, and write one short question for the author that would sharpen the idea.
Reply with JSON only, no other text: {"ids":["id1","id2"],"question":"..."}`;

async function ask(env, me, b) {
  if (!env.ANTHROPIC_API_KEY) return json(503, { error: "The assistant is not set up yet." });
  const budget = Number(env.AI_BUDGET_USD || 5);
  const mk = `spend:${monthKey()}`;
  if (await getN(env, mk) / 1e6 >= budget - SAFETY_USD) return json(429, { error: "The assistant has used this month's budget. It comes back next month." });
  const uk = `a:${dayKey()}:${me.id}`;
  const used = await getN(env, uk);
  if (used >= ASK_PER_USER_DAY) return json(429, { error: `That was today's ${ASK_PER_USER_DAY} questions. Back tomorrow.` });

  const mapId = clip(b.map, 40);
  const { results: stars } = await env.DB.prepare("SELECT id, label, kind, grp FROM stars WHERE map_id = ? AND deleted = 0 AND (vis = 'public' OR owner = ?)").bind(mapId, me.id).all();
  if (!stars.length) return json(404, { error: "No such map." });
  const list = stars.map((s) => `${s.id}: ${s.label}`).join("\n");
  const task = b.task === "suggest" ? "suggest" : "chat";
  let system, messages;
  if (task === "suggest") {
    system = [{ type: "text", text: SUGGEST_RULES }, { type: "text", text: "Existing stars:\n" + list, cache_control: { type: "ephemeral" } }];
    messages = [{ role: "user", content: `New star: "${clip(b.label, 34)}"\n${clip(b.body, 1200)}` }];
  } else {
    let focus = "";
    if (b.star) {
      const s = await env.DB.prepare("SELECT id, label, title, body, body_html, vis, owner FROM stars WHERE id = ? AND map_id = ? AND deleted = 0").bind(String(b.star), mapId).first();
      if (canSee(s, me)) {
        const { results: nb } = await env.DB.prepare(
          `SELECT o.label FROM links l JOIN stars o ON o.id = (CASE WHEN l.a = ? THEN l.b ELSE l.a END)
           WHERE (l.a = ? OR l.b = ?) AND l.deleted = 0 AND o.deleted = 0 AND (o.vis = 'public' OR o.owner = ?) LIMIT 12`
        ).bind(s.id, s.id, s.id, me.id).all();
        focus = `The person is looking at the star "${s.title}":\n${s.body_html ? stripHtml(s.body) : s.body}\nIt connects to: ${nb.map((x) => x.label).join(", ") || "nothing yet"}.`;
      }
    }
    system = [{ type: "text", text: RULES }, { type: "text", text: "All stars on the map:\n" + list, cache_control: { type: "ephemeral" } }, { type: "text", text: focus || "No star is selected." }];
    const turns = (Array.isArray(b.turns) ? b.turns : [])
      .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
      .slice(-6).map((t) => ({ role: t.role, content: clip(t.content, t.role === "user" ? 600 : 1500) }));
    while (turns.length && turns[0].role !== "user") turns.shift();
    if (!turns.length || turns[turns.length - 1].role !== "user") return json(400, { error: "Please type a question." });
    messages = turns;
  }
  let res, data;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.AI_MODEL || "claude-haiku-5-5", max_tokens: MAX_OUT, thinking: { type: "disabled" }, output_config: { effort: "low" }, system, messages }),
    });
    data = await res.json();
  } catch { return json(502, { error: "The assistant could not be reached. Please try again." }); }
  if (!res.ok) {
    const busy = res.status === 429 || res.status === 529;
    return json(busy ? 429 : 502, { error: busy ? "Too many questions at once. Try again in a minute." : "The assistant could not answer just now." });
  }
  const u = data.usage || {};
  const micro = Math.ceil((u.input_tokens || 0) * PRICE.in + (u.cache_creation_input_tokens || 0) * PRICE.write + (u.cache_read_input_tokens || 0) * PRICE.read + (u.output_tokens || 0) * PRICE.out);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n").bind(mk, micro),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1").bind(uk),
  ]);
  const text = (data.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
  if (task === "suggest") {
    let out = { ids: [], question: "" };
    try {
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      const known = new Set(stars.map((s) => s.id));
      out = { ids: (Array.isArray(j.ids) ? j.ids : []).filter((i) => known.has(i)).slice(0, 4), question: clip(j.question, 240) };
    } catch {}
    return json(200, { ...out, left: ASK_PER_USER_DAY - used - 1 });
  }
  return json(200, { text: text || "I could not put that together. Could you ask it a little differently?", left: ASK_PER_USER_DAY - used - 1 });
}


/* ---------------- being found: plain pages for search engines and language models ----------------
   The map itself is drawn in the browser, so crawlers get the same public ideas as ordinary pages,
   a sitemap, and llms.txt. Only public, undeleted ideas appear here. */
const SITE = "The Map of Ideas";
const SITE_ABOUT = "A public map of ideas and how they connect. Each idea is a short note with its sources, and anyone can add an idea or draw a line between two.";
const xe = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const untag = (h) => String(h ?? "").replace(/<\/p>\s*<p>/g, "\n\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
const plainBody = (s) => (s.body_html ? untag(s.body) : String(s.body ?? "").trim());
const htmlBody = (s) => (s.body_html ? String(s.body) : plainBody(s).split(/\n+/).filter((x) => x.trim()).map((x) => "<p>" + xe(x.trim()) + "</p>").join(""));
const blurb = (s, n = 155) => { const t = plainBody(s).replace(/\s+/g, " "); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(" ") > 80 ? c.lastIndexOf(" ") : n).replace(/[,;:\s]+$/, "") + "…"; };
const iso = (ms) => new Date(Number(ms) || Date.now()).toISOString();
const KIND_NAME = { f: "idea", q: "question to chase", g: "game idea", r: "reading", a: "answer" };

async function publicMap(env, origin) {
  return memo("public", 300000, () => loadPublicMap(env, origin));
}
async function loadPublicMap(env, origin) {
  const mapId = "godel";
  let map = await env.DB.prepare("SELECT id FROM maps WHERE id = ?").bind(mapId).first();
  if (!map) { await ensureSeed(env, origin); }
  try { await ensureTopics(env, origin); } catch (e) { console.error("topics", e && e.message); }
  await ensureMeta(env);
  const [groups, stars, links, anon] = await Promise.all([
    env.DB.prepare("SELECT id, name, angle FROM groups WHERE map_id = ? ORDER BY angle").bind(mapId).all(),
    env.DB.prepare("SELECT s.id, s.grp, s.kind, s.size, s.label, s.title, s.body, s.body_html, s.sources, s.owner, s.updated FROM stars s WHERE s.map_id = ? AND s.deleted = 0 AND s.vis = 'public'").bind(mapId).all(),
    env.DB.prepare("SELECT a, b FROM links WHERE map_id = ? AND deleted = 0 AND vis = 'public'").bind(mapId).all(),
    anonSets(env),
  ]);
  const names = await userNames(env, stars.results.map((x) => x.owner));
  stars.results.forEach((x) => { x.owner_name = names[x.owner] || null; x.own_anon = anon.created.has(x.id) ? 1 : 0; });
  const by = {}; stars.results.forEach((s) => { s.sources = parseSources(s.sources); by[s.id] = s; });
  const adj = {};
  links.results.forEach((l) => { if (by[l.a] && by[l.b]) { (adj[l.a] ||= []).push(l.b); (adj[l.b] ||= []).push(l.a); } });
  return { groups: groups.results, stars: stars.results, by, adj };
}
/* the start of the map is not counted as a neighbour of other ideas */
const neigh = (m, id) => ((m.adj[id] || []).filter((o) => o !== "hub" || id === "hub"));

const PAGE_CSS = ":root{color-scheme:light dark;--bg:#fbf3e4;--fg:#2b2a33;--mu:#6a6458;--ln:#e3d8c3;--ac:#2f7fb8}@media(prefers-color-scheme:dark){:root{--bg:#0a0d14;--fg:#e8e6df;--mu:#9a9588;--ln:#26293a;--ac:#7fb6e0}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.65 Georgia,'Times New Roman',serif}main{max-width:44rem;margin:0 auto;padding:1.4rem 1.2rem 4rem}nav.top{display:flex;gap:1rem;flex-wrap:wrap;align-items:baseline;font:14px/1.4 system-ui,sans-serif;margin-bottom:2.2rem}nav.top a{color:var(--mu)}nav.top .site{font-weight:700;color:var(--fg);text-decoration:none}h1{font:700 2rem/1.2 system-ui,sans-serif;margin:.2rem 0 .3rem}h2{font:700 1.05rem/1.3 system-ui,sans-serif;margin:2rem 0 .5rem}.kind{font:13px/1.4 ui-monospace,Menlo,monospace;color:var(--mu)}a{color:var(--ac)}ul,ol{padding-left:1.2rem}li{margin:.25rem 0}.open{display:inline-block;margin-top:1.6rem;font:15px system-ui,sans-serif}.sm{font:14px/1.5 system-ui,sans-serif;color:var(--mu)}footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--ln)}";
function shell(origin, { title, desc, canon, body, ld, md, type = "website" }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xe(title)}</title><meta name="description" content="${xe(desc)}"><link rel="canonical" href="${xe(canon)}"><meta property="og:site_name" content="${SITE}"><meta property="og:type" content="${type}"><meta property="og:title" content="${xe(title)}"><meta property="og:description" content="${xe(desc)}"><meta property="og:url" content="${xe(canon)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${xe(title)}"><meta name="twitter:description" content="${xe(desc)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">${md ? `<link rel="alternate" type="text/markdown" href="${xe(md)}">` : ""}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><style>${PAGE_CSS}</style></head><body><main><nav class="top"><a class="site" href="/">${SITE}</a><a href="/i/">All ideas</a><a href="/glossary/">Glossary game</a></nav>${body}<footer class="sm">${SITE} · <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">sitemap</a> · Ideas are written by people and keep their sources.</footer></main></body></html>`;
}
const htmlRes = (h, status = 200) => new Response(h, { status, headers: { "content-type": "text/html;charset=utf-8", "cache-control": "public, max-age=300" } });
const textRes = (t, type) => new Response(t, { headers: { "content-type": type + ";charset=utf-8", "cache-control": "public, max-age=900" } });

function ideaMarkdown(m, s, origin) {
  const nb = neigh(m, s.id).map((o) => m.by[o]).filter(Boolean);
  const L = ["# " + s.label, ""];
  if (s.title && s.title !== s.label) L.push("**" + s.title + "**", "");
  L.push(plainBody(s), "");
  if (nb.length) { L.push("Connects to:"); nb.forEach((n) => L.push(`- [${n.label}](${origin}/i/${n.id})`)); L.push(""); }
  if (s.sources.length) { L.push("Sources:"); s.sources.forEach((x) => L.push("- " + (x.u ? (x.t ? `[${x.t}](${x.u})` : x.u) : x.t))); L.push(""); }
  L.push(`Source: ${origin}/i/${s.id} · open on the map: ${origin}/#${s.id}`);
  return L.join("\n");
}

/* Crawlers fetch every page. Cloudflare keeps a copy of each answer for ten minutes, so repeats never reach the worker or the database. */
async function discoverCached(req, env, url, path, ctx) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(url.origin + path, { method: "GET" });
  if (cache && req.method === "GET") {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const res = await discover(req, env, url, path);
  if (cache && req.method === "GET" && res.status === 200) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("cache-control", "public, max-age=600");
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, copy.clone()));
    return copy;
  }
  return res;
}
async function discover(req, env, url, path) {
  if (req.method !== "GET" && req.method !== "HEAD") return json(405, { error: "Method not allowed" });
  const origin = /^(localhost|127\.)/.test(url.hostname) ? url.origin : "https://mapideas.org", m = await publicMap(env, origin);
  const list = m.stars.filter((s) => s.id !== "hub");
  const cap = (x) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
  const gname = {}; m.groups.forEach((g) => { if (g.name) gname[g.id] = cap(g.name); });
  list.forEach((x) => { if (!gname[x.grp]) gname[x.grp] = x.label; });
  const top = m.stars.filter((s) => (m.adj.hub || []).includes(s.id));
  if (path === "/sitemap.xml") {
    const rows = [`<url><loc>${origin}/</loc></url>`, `<url><loc>${origin}/i/</loc></url>`, `<url><loc>${origin}/glossary/</loc></url>`]
      .concat(m.stars.map((s) => `<url><loc>${origin}/i/${xe(s.id)}</loc><lastmod>${iso(s.updated).slice(0, 10)}</lastmod></url>`));
    return textRes(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.join("")}</urlset>`, "application/xml");
  }
  if (path === "/llms.txt") {
    const L = ["# " + SITE, "", "> " + SITE_ABOUT, "", "Every idea has its own page with a plain-text version (add .md to the address). The full text of all public ideas is in one file.", "", "## Start here", `- [All ideas as a list](${origin}/i/): every idea, grouped by theme`, `- [Full text of all ideas](${origin}/llms-full.txt): every public idea in Markdown, with links and sources`, `- [Glossary game](${origin}/glossary/): wander Wikipedia and keep a glossary`, `- [Sitemap](${origin}/sitemap.xml)`, ""];
    const named = gname;
    const order = [...new Set(list.map((s) => s.grp))];
    order.forEach((g) => {
      L.push("## " + (named[g] || g));
      list.filter((s) => s.grp === g).forEach((s) => L.push(`- [${s.label}](${origin}/i/${s.id}.md): ${blurb(s, 110)}`));
      L.push("");
    });
    return textRes(L.join("\n"), "text/plain");
  }
  if (path === "/llms-full.txt") {
    const L = ["# " + SITE, "", "> " + SITE_ABOUT, ""];
    list.forEach((s) => { L.push(ideaMarkdown(m, s, origin), "", "---", ""); });
    return textRes(L.join("\n"), "text/plain");
  }
  if (path === "/i" || path === "/i/") {
    const named = gname;
    let body = `<h1>All ideas</h1><p class="sm">${list.length} public ideas. ${xe(SITE_ABOUT)}</p>`;
    [...new Set(list.map((s) => s.grp))].forEach((g) => {
      body += `<h2>${xe(named[g] || g)}</h2><ul>` + list.filter((s) => s.grp === g).map((s) => `<li><a href="/i/${xe(s.id)}">${xe(s.label)}</a> <span class="sm">${xe(blurb(s, 100))}</span></li>`).join("") + "</ul>";
    });
    return htmlRes(shell(origin, { title: "All ideas · " + SITE, desc: SITE_ABOUT, canon: origin + "/i/", body, ld: { "@context": "https://schema.org", "@type": "CollectionPage", name: "All ideas · " + SITE, url: origin + "/i/", description: SITE_ABOUT, isPartOf: { "@type": "WebSite", name: SITE, url: origin + "/" } } }));
  }
  let id = decodeURIComponent(path.slice(3)), md = false;
  if (id.endsWith(".md")) { md = true; id = id.slice(0, -3); }
  const s = m.by[id];
  if (!s) return htmlRes(shell(origin, { title: "Not found · " + SITE, desc: "This idea is not here.", canon: origin + "/i/", body: `<h1>Not found</h1><p>This idea is not here, or it is private. <a href="/i/">See all ideas</a>.</p>`, ld: { "@context": "https://schema.org", "@type": "WebPage", name: "Not found" } }), 404);
  if (md) return textRes(ideaMarkdown(m, s, origin), "text/markdown");
  const nb = neigh(m, s.id).map((o) => m.by[o]).filter(Boolean);
  const canon = origin + "/i/" + s.id, desc = blurb(s);
  const author = s.owner === "seed" ? { "@type": "Organization", name: SITE } : (s.owner_name && !s.own_anon ? { "@type": "Person", name: s.owner_name } : undefined);
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: s.title || s.label, name: s.label, description: desc, url: canon, inLanguage: "en", dateModified: iso(s.updated), isPartOf: { "@type": "WebSite", name: SITE, url: origin + "/" }, ...(author ? { author } : {}), ...(s.sources.some((x) => x.u) ? { citation: s.sources.filter((x) => x.u).map((x) => ({ "@type": "CreativeWork", name: x.t || x.u, url: x.u })) } : {}), ...(nb.length ? { mentions: nb.map((n) => ({ "@type": "Thing", name: n.label, url: origin + "/i/" + n.id })) } : {}) };
  let body = `<p class="kind">${xe(KIND_NAME[s.kind] || "idea")}</p><h1>${xe(s.title || s.label)}</h1>${htmlBody(s)}`;
  if (nb.length) body += `<h2>Connects to</h2><ul>${nb.map((n) => `<li><a href="/i/${xe(n.id)}">${xe(n.label)}</a></li>`).join("")}</ul>`;
  if (s.sources.length) body += `<h2>Sources</h2><ol>${s.sources.map((x) => `<li>${x.u ? `<a href="${xe(x.u)}" rel="noopener">${xe(x.t || x.u)}</a>` : xe(x.t)}</li>`).join("")}</ol>`;
  body += `<a class="open" href="/#${xe(s.id)}">See it on the map →</a>`;
  return htmlRes(shell(origin, { title: (s.label === (s.title || s.label) ? s.label : s.title) + " · " + SITE, desc, canon, body, ld, md: canon + ".md", type: "article" }));
}


/* ---------------- tally: small, privacy-first counts for this site ----------------
   Same idea as Sofia's tally on her other sites, kept on this site's own database. It counts what people do
   (pages opened, tools used) as anonymous hourly totals. No cookies, no visitor or device code, no IP stored,
   nothing typed is ever sent. tally.js already respects Do Not Track and Global Privacy Control. */
let eventsReady = false;
async function ensureEvents(env) {
  if (eventsReady) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS events (app TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (app, day, hour, name))").run();
  eventsReady = true;
}
async function sha(t) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function tallyEv(req, env, url) {
  const ok = (code = 200) => new Response(null, { status: code, headers: { "cache-control": "no-store" } });
  if (req.method !== "POST") return ok(405);
  const o = req.headers.get("origin");
  if (o && o !== url.origin) return ok(403);
  let body; try { body = JSON.parse((await req.text()).slice(0, 8000)); } catch { return ok(400); }
  if (!body || typeof body !== "object") return ok(400);
  const d = new Date(), day = d.toISOString().slice(0, 10), hour = d.getUTCHours();
  const app = typeof body.app === "string" && /^[a-z0-9-]{1,30}$/.test(body.app) ? body.app : "map";
  const rows = [];
  for (const [name, n] of Object.entries(body.ev && typeof body.ev === "object" ? body.ev : {}).slice(0, 80)) {
    const c = Math.min(Math.max(parseInt(n, 10) || 0, 0), 200);
    /* the page itself carries data-theme, so tally.js would count every click as a "theme" change; real changes arrive as look:light / look:dark */
    if (c && !name.startsWith("theme:") && /^[a-z0-9:_.\-]{1,48}$/.test(name)) rows.push([name, c]);
  }
  if (body.start === true) rows.push(["country:" + String(req.headers.get("cf-ipcountry") || "xx").slice(0, 2).toLowerCase(), 1]);
  if (!rows.length) return ok(204);
  await ensureEvents(env);
  const kN = `ev:${day}:${(await sha("ev:" + (req.headers.get("cf-connecting-ip") || "0"))).slice(0, 16)}`;
  const used = await env.DB.prepare("SELECT n FROM usage WHERE k = ?").bind(kN).first();
  if (used && used.n >= 20000) return ok(429);
  const st = env.DB.prepare("INSERT INTO events (app, day, hour, name, n) VALUES (?, ?, ?, ?, ?) ON CONFLICT(app, day, hour, name) DO UPDATE SET n = n + excluded.n");
  await env.DB.batch([...rows.map(([k, c]) => st.bind(app, day, hour, k, c)),
    env.DB.prepare("INSERT INTO usage (k, n) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET n = n + excluded.n").bind(kN, rows.reduce((t, r) => t + r[1], 0))]);
  return ok(204);
}
/* GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&app=map&format=csv|json  (curators only, signed in) */
async function tallyStats(env, url) {
  await ensureEvents(env);
  const q = url.searchParams, dt = /^\d{4}-\d\d-\d\d$/;
  const from = dt.test(q.get("from") || "") ? q.get("from") : "2000-01-01", to = dt.test(q.get("to") || "") ? q.get("to") : "2999-12-31", app = q.get("app") || "";
  const { results } = await env.DB.prepare("SELECT app, day, hour, name, n FROM events WHERE day >= ? AND day <= ? AND (? = '' OR app = ?) ORDER BY day, hour, app, name LIMIT 200000").bind(from, to, app, app).all();
  if (q.get("format") === "csv") {
    return new Response("app,day,hour_utc,name,n\n" + results.map((r) => [r.app, r.day, r.hour, r.name, r.n].join(",")).join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="tally-${from}-${to}.csv"`, "cache-control": "no-store" } });
  }
  if (q.get("format") === "json") return json(200, { fields: ["app", "day", "hour_utc", "name", "n"], rows: results.map((r) => [r.app, r.day, r.hour, r.name, r.n]) });
  const tot = {}; results.forEach((r) => { const k = r.app + " " + r.name; tot[k] = (tot[k] || 0) + r.n; });
  return json(200, { from, to, totals: Object.fromEntries(Object.entries(tot).sort((a, b) => b[1] - a[1])) });
}
