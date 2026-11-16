// Builds public/seed-music.json (the Music topic) from the music constellation data.
// Run: node music.mjs <path-to-music.json>   (the N, E, P, REFS, DISC blocks of sofiagallego.com/music-constellation, as JSON)
import fs from "fs";
const m = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const COURSE = "https://sofiagallego.com/what-is-music/";
const pre = (k) => "mu_" + k;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const LENS = {
  phys: ["physics of sound", -140, 470, "vibration"],
  math: ["mathematics", -115, 470, "ratio"],
  ear: ["the ear", -90, 470, "cochlea"],
  theory: ["tuning & harmony", -65, 470, "octave"],
  world: ["traditions & arts", -40, 470, "gamelan"],
};

const refById = {};
for (const [n, t, u] of m.REFS) {
  refById[n] = { t: t.replace(/ \(cited from memory[^)]*\)/, "").replace(/^Wikipedia, /, "Wikipedia: "), u: u && u.startsWith("/") ? "https://sofiagallego.com" + u : u, chk: /from memory/.test(t) };
}

const groups = [{ id: "mu", name: "", angle: -90, radius: 330 }];
for (const [id, [name, angle, radius]] of Object.entries(LENS)) groups.push({ id: pre(id), name, angle, radius });

const stars = [];
for (const [k, n] of Object.entries(m.N)) {
  const refs = [...new Set(((n.text.match(/\{([\d,]+)\}/g) || []).join(",").replace(/[{}]/g, "").split(",").filter(Boolean)))].map(Number);
  const plain = n.text.replace(/\s*\{[\d,]+\}/g, "").trim();
  const chk = refs.some((r) => refById[r] && refById[r].chk);
  const sources = refs.filter((r) => r !== 23 && refById[r]).map((r) => ({ t: refById[r].t, ...(refById[r].u ? { u: refById[r].u } : {}) }));
  if (n.s && n.s[0]) sources.push({ t: "What is music? " + n.s[0][2], u: COURSE });
  const entry = Object.values(LENS).some((l) => l[3] === k);
  stars.push({
    id: pre(k), grp: pre(n.d), kind: "f", size: entry ? 3 : 2, label: n.name, title: n.name,
    body: "<p>" + esc(plain) + (chk ? ' <span class="chk">verify</span>' : "") + "</p>",
    sources: sources.slice(0, 6),
  });
}

const links = [];
for (const [a, b] of m.E) links.push([pre(a), pre(b), (m.P[a + ">" + b] || [])[0] || null, (m.P[b + ">" + a] || [])[0] || null]);
links.push(["music", "hub", "One idea among many. The map is where it meets the others.", "Where the map begins: a way of listening."]);
for (const [, , , entry] of Object.values(LENS)) links.push(["music", pre(entry), null, null]);

// the topic star goes last, so a half-finished seed is noticed and retried
stars.push({
  id: "music", grp: "mu", kind: "f", size: 4, label: "Music", title: "What is music?",
  body: "<p>A way into music through many doors: the physics of sound, the mathematics of ratios, the ear, tuning and harmony, and the traditions and arts of the world. Each line between two ideas reads in both directions, and the two readings differ.</p>",
  sources: [{ t: "What is music? A course through many lenses", u: COURSE }],
});

const json = { map: { id: "godel", title: "Gödel", center: "hub" }, groups, stars, links };
fs.writeFileSync("public/seed-music.json", JSON.stringify(json));
console.log("seed-music.json", stars.length, "stars", links.length, "links", groups.length, "groups");
