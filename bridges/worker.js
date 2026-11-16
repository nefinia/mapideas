// Bridges (Epistemic Bridges): the game at mapideas.org/bridges and its small API.
// Called from src/worker.js for every path under /bridges. Data: its own D1 database ("bridges", binding BRIDGES_DB),
// kept apart from the map's. Voice: Workers AI in the same account (binding AI); the audio is never stored.
import PAGE from "./index.html";
import PRIVACY from "./privacy.html";
import { AI_BRIDGES, AI_MODEL } from "./ai-bridges.js";

const BASE = "/bridges";
const CODE_RE = /^[a-z]+-[a-z]+-\d{2}$/;
const PAIR_RE = /^(c[1-6]|p\d{2})$/;
const MAX_TEXT = 4000;

const now = () => new Date().toISOString();
const clip = (v, n = MAX_TEXT) => (v == null ? null : String(v).slice(0, n));
const int = v => (v == null || v === "" || isNaN(+v) ? null : Math.round(+v));
const bool = v => (v ? 1 : 0);

const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "microphone=(self), camera=(), geolocation=()",
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'"
};
const html = body => new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SECURITY } });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const pageHTML = PAGE
  .replace("/*AI_BRIDGES*/null", JSON.stringify(AI_BRIDGES))
  .replace('/*AI_MODEL*/""', JSON.stringify(AI_MODEL));

export async function handleBridges(request, env) {
  {
    const url = new URL(request.url);
    let path = url.pathname;
    if (!path.startsWith(BASE)) return new Response("Not found", { status: 404 });
    path = path.slice(BASE.length) || "/";

    if (request.method === "GET" && (path === "/" || path === "")) {
      await countVisit(request, env);
      return html(pageHTML);
    }
    if (request.method === "GET" && (path === "/privacy" || path === "/privacy/")) return html(PRIVACY);

    if (!path.startsWith("/api/")) return new Response("Not found", { status: 404 });

    // Only accept writes coming from the page itself.
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).host !== url.host) return json({ error: "forbidden" }, 403);
    }

    try {
      return await api(request, env, path.slice(4), url);
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ error: "server" }, 500);
    }
  }
}

// Page opens per country per day, as plain totals. Nothing links a visit to a player, and no IP is kept.
async function countVisit(request, env) {
  try {
    if (/bot|crawl|spider|preview|curl|wget|python|monitor/i.test(request.headers.get("user-agent") || "")) return;
    const c = String((request.cf && request.cf.country) || request.headers.get("cf-ipcountry") || "xx").slice(0, 2).toLowerCase();
    await env.BRIDGES_DB.prepare("INSERT INTO visits (day, country, n) VALUES (?1, ?2, 1) ON CONFLICT(day, country) DO UPDATE SET n = n + 1")
      .bind(now().slice(0, 10), /^[a-z]{2}$/.test(c) ? c : "xx").run();
  } catch (e) { /* counting must never break the page */ }
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

async function isTester(env, code, key) {
  const codes = String(env.BRIDGES_TESTER_CODES || "").split(",").map(s => s.trim()).filter(Boolean);
  if (codes.includes(code)) return true;
  return !!(env.BRIDGES_TESTER_KEY && key && key === env.BRIDGES_TESTER_KEY);
}

async function api(request, env, route, url) {
  const db = env.BRIDGES_DB;
  const m = request.method;

  // Create or update a player (called at start, on return, and when end/feedback are done).
  if (m === "POST" && route === "/player") {
    const b = await body(request);
    if (!CODE_RE.test(b.code || "")) return json({ error: "bad code" }, 400);
    const grp = b.grp === "after" ? "after" : "choose";
    const tester = (await isTester(env, b.code, b.testerKey)) ? 1 : 0;
    const t = now();
    await db.prepare(
      `INSERT INTO players (code, grp, lang, tester, restored, visits, first_seen, last_seen, answered_end, feedback_given)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?8, ?9)
       ON CONFLICT(code) DO UPDATE SET lang = excluded.lang, visits = MAX(players.visits, excluded.visits), last_seen = excluded.last_seen,
         tester = MAX(players.tester, excluded.tester), answered_end = MAX(players.answered_end, excluded.answered_end),
         feedback_given = MAX(players.feedback_given, excluded.feedback_given)`
    ).bind(b.code, grp, clip(b.lang, 8), tester, bool(b.restored), int(b.visits) || 1, t, bool(b.answeredEnd), bool(b.feedbackGiven)).run();
    return json({ ok: true });
  }

  // Bring a player back from their code (used on a new device).
  const pm = route.match(/^\/player\/([a-z0-9-]+)$/);
  if (pm && m === "GET") {
    const code = pm[1];
    if (!CODE_RE.test(code)) return json({ error: "bad code" }, 400);
    const p = await db.prepare("SELECT grp, lang, visits, first_seen, answered_end, feedback_given FROM players WHERE code = ?").bind(code).first();
    if (!p) return json({ error: "not found" }, 404);
    const rows = (await db.prepare(
      "SELECT pair, dir, from_text, to_text, stones, final, lang, ai_requested, ai_shown, at FROM trials WHERE code = ? AND skipped = 0 AND final IS NOT NULL ORDER BY id"
    ).bind(code).all()).results || [];
    const w = await db.prepare("SELECT skipped FROM warmups WHERE code = ?").bind(code).first();
    return json({
      ...p,
      warmup: w ? { skipped: !!w.skipped } : null,
      saw_ai: rows.some(r => r.ai_shown), used_ai: rows.some(r => r.ai_requested),
      bridges: rows.map(r => ({ pair: r.pair, from: r.from_text, to: r.to_text, stones: safeJSON(r.stones, []), final: r.final, lang: r.lang, at: r.at }))
    });
  }

  // Delete everything saved under a code.
  if (pm && m === "DELETE") {
    const code = pm[1];
    if (!CODE_RE.test(code)) return json({ error: "bad code" }, 400);
    await db.batch([
      db.prepare("DELETE FROM trials WHERE code = ?").bind(code),
      db.prepare("DELETE FROM warmups WHERE code = ?").bind(code),
      db.prepare("DELETE FROM end_answers WHERE code = ?").bind(code),
      db.prepare("DELETE FROM players WHERE code = ?").bind(code)
    ]);
    return json({ ok: true });
  }

  if (m === "POST" && route === "/warmup") {
    const b = await body(request);
    if (!CODE_RE.test(b.code || "")) return json({ error: "bad code" }, 400);
    const words = Array.isArray(b.words) ? b.words.slice(0, 10).map(w => clip(w, 60)) : null;
    await db.prepare(
      `INSERT INTO warmups (code, words, ms, pasted, lang, skipped, at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO NOTHING`
    ).bind(b.code, words ? JSON.stringify(words) : null, int(b.ms), bool(b.pasted), clip(b.lang, 8), bool(b.skipped), now()).run();
    return json({ ok: true });
  }

  if (m === "POST" && route === "/trial") {
    const b = await body(request);
    if (!CODE_RE.test(b.code || "") || !PAIR_RE.test(b.pair || "")) return json({ error: "bad input" }, 400);
    await db.prepare(
      `INSERT INTO trials (code, pair, set_name, level, dir, from_text, to_text, lang, grp, visit, position, first_key_ms, submit_ms,
        pasted, pasted_chars, voice, ai_requested, ai_shown, ai_model, difficulty, answer, stones, revised, final, skipped, lang_switched, at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      b.code, b.pair, clip(b.set, 8), clip(b.level, 4), b.dir === "ba" ? "ba" : "ab", clip(b.from, 120), clip(b.to, 120), clip(b.lang, 8),
      b.group === "after" ? "after" : "choose", int(b.visit), int(b.position), int(b.firstKeyMs), int(b.submitMs),
      bool(b.pasted), int(b.pastedChars) || 0, bool(b.voice), bool(b.aiRequested), bool(b.aiShown), (b.aiRequested || b.aiShown) ? AI_MODEL : null,
      ["easy", "medium", "hard"].includes(b.difficulty) ? b.difficulty : null,
      clip(b.answer), JSON.stringify(Array.isArray(b.stones) ? b.stones.slice(0, 3).map(s => clip(s, 120)) : []),
      bool(b.revised), clip(b.final), bool(b.skipped), bool(b.langSwitched), now()
    ).run();
    return json({ ok: true });
  }

  if (m === "POST" && route === "/end") {
    const b = await body(request);
    if (!CODE_RE.test(b.code || "")) return json({ error: "bad code" }, 400);
    const keys = ["playedBefore", "externalAI", "aiFrequency", "aiFeeling", "aiComparison", "ownership", "firstLanguage", "ageBand", "field"];
    const data = {};
    for (const k of keys) data[k] = b[k] == null ? null : clip(b[k], 20);
    await db.prepare("INSERT INTO end_answers (code, data, at) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET data = excluded.data, at = excluded.at")
      .bind(b.code, JSON.stringify(data), now()).run();
    await db.prepare("UPDATE players SET answered_end = 1 WHERE code = ?").bind(b.code).run();
    return json({ ok: true });
  }

  // Feedback: stored without any player code, and with the day only.
  if (m === "POST" && route === "/feedback") {
    const b = await body(request);
    const rating = int(b.rating);
    await db.prepare("INSERT INTO feedback (rating, comment, lang, day) VALUES (?, ?, ?, ?)")
      .bind(rating >= 1 && rating <= 5 ? rating : null, clip(b.comment, 2000), clip(b.lang, 8), now().slice(0, 10)).run();
    return json({ ok: true });
  }

  // Result emails: their own list, no code, no date.
  if (m === "POST" && route === "/email") {
    const b = await body(request);
    const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "bad email" }, 400);
    await db.prepare("INSERT INTO emails (email, lang) VALUES (?, ?) ON CONFLICT(email) DO NOTHING").bind(email, clip(b.lang, 8)).run();
    return json({ ok: true });
  }

  // How many answers each pair and direction already has (testers and skips left out), to keep them balanced.
  if (m === "POST" && route === "/counts") {
    const b = await body(request);
    const ids = (Array.isArray(b.pairs) ? b.pairs : []).filter(p => PAIR_RE.test(p)).slice(0, 60);
    const out = {};
    for (const id of ids) out[id] = { ab: 0, ba: 0 };
    if (ids.length) {
      const q = `SELECT t.pair, t.dir, COUNT(*) AS n FROM trials t JOIN players p ON p.code = t.code
                 WHERE p.tester = 0 AND t.skipped = 0 AND t.pair IN (${ids.map(() => "?").join(",")}) GROUP BY t.pair, t.dir`;
      const rows = (await db.prepare(q).bind(...ids).all()).results || [];
      for (const r of rows) out[r.pair][r.dir] = r.n;
    }
    return json(out);
  }

  // Voice: transcribed by Workers AI in this same account. The audio is used once and never stored.
  if (m === "POST" && route === "/transcribe") {
    if (!env.AI) return json({ error: "voice unavailable" }, 501);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 4 * 1024 * 1024) return json({ error: "bad audio" }, 400);
    const lang = (url.searchParams.get("lang") || "").slice(0, 2);
    const input = { audio: toBase64(buf) };
    if (["en", "fr", "es", "it", "de"].includes(lang)) input.language = lang;
    const out = await env.AI.run("@cf/openai/whisper-large-v3-turbo", input);
    return json({ text: clip(out && out.text, 2000) || "" });
  }

  return json({ error: "not found" }, 404);
}

function safeJSON(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
