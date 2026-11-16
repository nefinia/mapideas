// Builds seed.sql from the Gödel data (G, X, X2). Run: node seed.mjs <path-to-godel-source-dir>
import fs from "fs";
const dir = process.argv[2];
const g = fs.readFileSync(dir + "/G_block.js", "utf8"), x = fs.readFileSync(dir + "/X_block.js", "utf8");
const tpl = fs.readFileSync(dir + "/template.html", "utf8");
const x2 = tpl.match(/var X2 = (\[[\s\S]*?\n  \]);/)[1];
const G = new Function(g + "; return G;")();
const X = new Function(x + "; return X;")();
const X2 = new Function("return " + x2)();

// ---- curate: a public, general map. No game ideas, no conversation-specific stars.
const DROP = new Set(["s_up", "r_noise", "r_player", "p_play", "c_moc", "c_q4"]);
const old = G.flatMap((g) => g.nodes.map((n) => ({ n, grp: g.id })));
for (const { n, grp } of old) if (grp === "g" || n[2] === "g") DROP.add(n[0]);
const AREAS = [
  ["th", "theorems", -90, 205, ["th_says", "th_num", "th_primes", "th_sent", "th_second", "th_cond", "th_q", "th_out"]],
  ["pt", "proof & truth", -50, 225, ["tr_true", "w_three", "w_judge", "w_comp", "w_free", "w_trust", "w_q", "tr_tarski", "tr_trust"]],
  ["sy", "systems", -10, 235, ["s_sys", "s_primes", "s_skolem", "s_safe", "s_thr", "s_gold", "s_prog", "r_fixed", "r_rule", "r_rand", "r_none", "r_tri", "r_escape", "c_check"]],
  ["sr", "self-reference", 30, 235, ["tr_ladder", "tr_views", "tr_loops", "tr_q1", "tr_q2", "c_hof", "c_hole", "c_contra"]],
  ["mi", "mind", 70, 235, ["c_lucas", "c_replies", "c_disj", "r_q", "c_q1", "c_test", "c_q2"]],
  ["ph", "physics & reality", 110, 215, ["c_quantum", "c_reality", "c_glue", "c_q3", "s_q", "tr_q3"]],
  ["td", "trust & doubt", 150, 225, ["h_asym", "h_lob", "h_escape", "h_ai", "h_open", "h_said", "h_caution", "h_q1", "h_q2"]],
  ["so", "society", 190, 215, ["p_sig", "p_out", "p_const", "p_arg", "p_q"]],
  ["rd", "reading", 230, 205, ["b_fran", "b_hof", "b_lp", "b_rep", "b_lob", "b_cub", "b_bro", "b_sok"]],
];
const byId = Object.fromEntries(old.map(({ n }) => [n[0], n]));
const EDIT = {
  hub: ["The Map of Ideas", "<p>A map where every idea sits next to the ideas it connects to.</p>"],
  c_glue: ["Gluing obstructions", "<p>Local pieces that each make sense but cannot be stitched into one global picture. It is a cousin of Gödel’s flavor (local provability against global truth), and unlike loose talk of an “inverted Gödel” it can be made precise. It is a promising place to look for results that connect self-reference and physics or mind.</p>"],
  c_q2: ["What would a model look like where the theorist is inside the system being modeled?", "<p>The observer who builds a theory is inside the loop too. A model that includes that observer does not exist yet.</p>"],
  b_bro: [null, "<p>The humility-against-certainty theme, from knowledge to politics. Bronowski’s episode is called “Knowledge or Certainty”.</p>"],
  b_sok: [null, "<p>The warning about borrowing theorems from one field to decorate another. <span class=\"chk\">verify</span> details before citing.</p>"],
  h_ai: [null, "<p>An AI that wants to approve a successor as strong as itself runs into Löb. People call it the Löbian obstacle (Yudkowsky and Herreshoff). <span class=\"chk\">verify</span></p>"],
};
const HUB = "hub";
const SPOKES = { th: "th_says", pt: "tr_true", sy: "s_sys", sr: "tr_ladder", mi: "c_lucas", ph: "c_quantum", td: "h_asym", so: "p_sig", rd: "b_fran" };
const ORBIT = {};
byId[HUB][1] = "The Map of Ideas";
const godel = byId[HUB].slice();
godel[0] = "godel"; godel[1] = "Gödel"; godel[7] = "Gödel, 1931";
godel[8] = "<p>In 1931 Gödel showed that a system of rules can be sound and still leave true things unproven, and that it cannot vouch for itself from within.</p><p>Everything nearby grows from that: what proof and truth are, what systems can and cannot reach, and where people have carried the idea since.</p>";
byId.godel = godel;
const groups = [{ id: "hub", name: "The Map", nodes: [byId[HUB]] }, { id: "gd", name: "", nodes: [godel] }];
ORBIT.gd = [90, 120];
for (const [id, name, ang, rad, members] of AREAS) {
  ORBIT[id] = [ang, rad];
  const nodes = members.filter((m) => byId[m] && !DROP.has(m)).map((m) => byId[m]);
  groups.push({ id, name, nodes });
}
const placed = new Set(groups.flatMap((g) => g.nodes.map((n) => n[0])));
for (const { n } of old) if (!placed.has(n[0]) && !DROP.has(n[0])) console.log("UNPLACED", n[0], n[1]);
for (const g of groups) for (const n of g.nodes) if (EDIT[n[0]]) { if (EDIT[n[0]][0]) n[7] = EDIT[n[0]][0]; n[8] = EDIT[n[0]][1]; }
ORBIT.hub = [0, 0];

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const seen = new Set();
const link = (a, b) => {
  if (a === b || !placed.has(a) || !placed.has(b)) return;
  seen.add(a < b ? a + "|" + b : b + "|" + a);
};
const oldEdges = G.flatMap((g) => g.edges);
for (const [a, b] of [...oldEdges, ...X, ...X2]) if (a !== HUB && b !== HUB) link(a, b);
link(HUB, "godel");
for (const id of Object.keys(SPOKES)) link("godel", SPOKES[id]);
// every star must hang on the web
const deg = {};
for (const k of seen) for (const x of k.split("|")) deg[x] = (deg[x] || 0) + 1;
for (const id of placed) if (!deg[id]) console.log("ISOLATED", id);

const SRC = {"godel": [{"t": "Wikipedia: Gödel’s incompleteness theorems", "u": "https://en.wikipedia.org/wiki/G%C3%B6del%27s_incompleteness_theorems"}, {"t": "Stanford Encyclopedia of Philosophy: Gödel’s Incompleteness Theorems", "u": "https://plato.stanford.edu/entries/goedel-incompleteness/"}, {"t": "Gödel, K. (1931). Über formal unentscheidbare Sätze der Principia Mathematica und verwandter Systeme I. Monatshefte für Mathematik und Physik 38, 173–198."}], "th_says": [{"t": "Wikipedia: Gödel’s incompleteness theorems", "u": "https://en.wikipedia.org/wiki/G%C3%B6del%27s_incompleteness_theorems"}, {"t": "Stanford Encyclopedia of Philosophy: Gödel’s Incompleteness Theorems", "u": "https://plato.stanford.edu/entries/goedel-incompleteness/"}], "th_num": [{"t": "Wikipedia: Gödel numbering", "u": "https://en.wikipedia.org/wiki/G%C3%B6del_numbering"}], "th_primes": [{"t": "Wikipedia: Gödel numbering", "u": "https://en.wikipedia.org/wiki/G%C3%B6del_numbering"}], "th_second": [{"t": "Stanford Encyclopedia of Philosophy: Gödel’s Incompleteness Theorems", "u": "https://plato.stanford.edu/entries/goedel-incompleteness/"}, {"t": "Wikipedia: Gödel’s incompleteness theorems", "u": "https://en.wikipedia.org/wiki/G%C3%B6del%27s_incompleteness_theorems"}], "th_cond": [{"t": "Stanford Encyclopedia of Philosophy: Gödel’s Incompleteness Theorems", "u": "https://plato.stanford.edu/entries/goedel-incompleteness/"}], "tr_tarski": [{"t": "Wikipedia: Tarski’s undefinability theorem", "u": "https://en.wikipedia.org/wiki/Tarski%27s_undefinability_theorem"}, {"t": "Stanford Encyclopedia of Philosophy: Tarski’s Truth Definitions", "u": "https://plato.stanford.edu/entries/tarski-truth/"}], "tr_true": [{"t": "Wikipedia: True arithmetic", "u": "https://en.wikipedia.org/wiki/True_arithmetic"}], "r_tri": [{"t": "Wikipedia: True arithmetic", "u": "https://en.wikipedia.org/wiki/True_arithmetic"}], "w_comp": [{"t": "Wikipedia: Completeness (logic)", "u": "https://en.wikipedia.org/wiki/Completeness_(logic)"}], "s_primes": [{"t": "Wikipedia: Euclid’s theorem", "u": "https://en.wikipedia.org/wiki/Euclid%27s_theorem"}], "s_skolem": [{"t": "Wikipedia: Presburger arithmetic (the addition-only sibling)", "u": "https://en.wikipedia.org/wiki/Presburger_arithmetic"}], "s_gold": [{"t": "Wikipedia: Goldbach’s conjecture", "u": "https://en.wikipedia.org/wiki/Goldbach%27s_conjecture"}], "s_thr": [{"t": "Wikipedia: Peano axioms", "u": "https://en.wikipedia.org/wiki/Peano_axioms"}], "s_prog": [{"t": "Wikipedia: Quine (computing)", "u": "https://en.wikipedia.org/wiki/Quine_(computing)"}], "tr_views": [{"t": "Stanford Encyclopedia of Philosophy: Platonism in the Philosophy of Mathematics", "u": "https://plato.stanford.edu/entries/platonism-mathematics/"}], "tr_q3": [{"t": "Stanford Encyclopedia of Philosophy: Platonism in the Philosophy of Mathematics", "u": "https://plato.stanford.edu/entries/platonism-mathematics/"}], "tr_loops": [{"t": "Kripke, S. (1975). Outline of a Theory of Truth. Journal of Philosophy 72(19), 690–716."}], "tr_q2": [{"t": "Kripke, S. (1975). Outline of a Theory of Truth. Journal of Philosophy 72(19), 690–716."}], "c_hof": [{"t": "Hofstadter, D. (1979). Gödel, Escher, Bach: An Eternal Golden Braid. Basic Books."}, {"t": "Hofstadter, D. (2007). I Am a Strange Loop. Basic Books."}], "b_hof": [{"t": "Hofstadter, D. (1979). Gödel, Escher, Bach: An Eternal Golden Braid. Basic Books."}, {"t": "Hofstadter, D. (2007). I Am a Strange Loop. Basic Books."}], "c_lucas": [{"t": "Wikipedia: Penrose–Lucas argument", "u": "https://en.wikipedia.org/wiki/Penrose%E2%80%93Lucas_argument"}, {"t": "Lucas, J. R. (1961). Minds, Machines and Gödel. Philosophy 36(137), 112–127."}, {"t": "Penrose, R. (1989). The Emperor’s New Mind. Oxford University Press."}], "b_lp": [{"t": "Wikipedia: Penrose–Lucas argument", "u": "https://en.wikipedia.org/wiki/Penrose%E2%80%93Lucas_argument"}, {"t": "Lucas, J. R. (1961). Minds, Machines and Gödel. Philosophy 36(137), 112–127."}, {"t": "Penrose, R. (1989). The Emperor’s New Mind. Oxford University Press."}, {"t": "Penrose, R. (1994). Shadows of the Mind. Oxford University Press."}], "c_replies": [{"t": "Benacerraf, P. (1967). God, the Devil, and Gödel. The Monist 51(1), 9–32."}, {"t": "Putnam, H. (1960). Minds and Machines. In S. Hook (ed.), Dimensions of Mind. New York University Press."}, {"t": "Chalmers, D. (1995). Minds, machines, and mathematics. PSYCHE 2(9)."}, {"t": "Feferman, S. (1995). Penrose’s Gödelian argument. PSYCHE 2(7)."}], "b_rep": [{"t": "Benacerraf, P. (1967). God, the Devil, and Gödel. The Monist 51(1), 9–32."}, {"t": "Putnam, H. (1960). Minds and Machines. In S. Hook (ed.), Dimensions of Mind. New York University Press."}, {"t": "Chalmers, D. (1995). Minds, machines, and mathematics. PSYCHE 2(9)."}, {"t": "Feferman, S. (1995). Penrose’s Gödelian argument. PSYCHE 2(7)."}], "c_disj": [{"t": "Gödel, K. (1951). Some basic theorems on the foundations of mathematics and their implications (Gibbs Lecture). In Collected Works, Vol. III."}], "c_quantum": [{"t": "Wikipedia: Uncertainty principle", "u": "https://en.wikipedia.org/wiki/Uncertainty_principle"}], "c_glue": [{"t": "Cubitt, T. S., Perez-Garcia, D., Wolf, M. M. (2015). Undecidability of the spectral gap. Nature 528, 207–211."}], "b_cub": [{"t": "Cubitt, T. S., Perez-Garcia, D., Wolf, M. M. (2015). Undecidability of the spectral gap. Nature 528, 207–211."}], "h_lob": [{"t": "Wikipedia: Löb’s theorem", "u": "https://en.wikipedia.org/wiki/L%C3%B6b%27s_theorem"}, {"t": "Löb, M. H. (1955). Solution of a problem of Leon Henkin. Journal of Symbolic Logic 20(2), 115–118."}], "b_lob": [{"t": "Wikipedia: Löb’s theorem", "u": "https://en.wikipedia.org/wiki/L%C3%B6b%27s_theorem"}, {"t": "Löb, M. H. (1955). Solution of a problem of Leon Henkin. Journal of Symbolic Logic 20(2), 115–118."}, {"t": "Feferman, S. (1962). Transfinite recursive progressions of axiomatic theories. Journal of Symbolic Logic 27(3), 259–316."}], "h_escape": [{"t": "Feferman, S. (1962). Transfinite recursive progressions of axiomatic theories. Journal of Symbolic Logic 27(3), 259–316."}], "h_ai": [{"t": "Yudkowsky, E., Herreshoff, M. (2013). Tiling Agents for Self-Modifying AI, and the Löbian Obstacle. MIRI technical report."}], "h_said": [{"t": "Bronowski, J. (1973). The Ascent of Man, episode 11, “Knowledge or Certainty”. BBC."}], "b_bro": [{"t": "Bronowski, J. (1973). The Ascent of Man, episode 11, “Knowledge or Certainty”. BBC."}], "h_caution": [{"t": "Franzén, T. (2005). Gödel’s Theorem: An Incomplete Guide to Its Use and Abuse. A K Peters."}, {"t": "Sokal, A., Bricmont, J. (1998). Fashionable Nonsense. Picador."}], "b_fran": [{"t": "Franzén, T. (2005). Gödel’s Theorem: An Incomplete Guide to Its Use and Abuse. A K Peters."}], "b_sok": [{"t": "Sokal, A., Bricmont, J. (1998). Fashionable Nonsense. Picador."}], "p_const": [{"t": "Wikipedia: Kurt Gödel", "u": "https://en.wikipedia.org/wiki/Kurt_G%C3%B6del"}]};
const json = {
  map: { id: "godel", title: "Gödel", center: "hub" },
  groups: groups.map((g) => ({ id: g.id, name: g.name, angle: ORBIT[g.id][0], radius: ORBIT[g.id][1] })),
  stars: groups.flatMap((g) => g.nodes.map((a) => ({ id: a[0], grp: g.id, kind: a[2] === "g" ? "f" : a[2], size: a[3], label: a[1], title: a[7], body: a[8].trim(), sources: SRC[a[0]] || [] }))),
  links: [...seen].map((k) => k.split("|")),
};
fs.writeFileSync("public/seed.json", JSON.stringify(json));
console.log("seed.json", json.stars.length, "stars", json.links.length, "links", json.groups.length, "groups");
