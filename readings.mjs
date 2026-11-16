// Readings: how one idea reads through another. R["from>to"] = how `to` reads when seen from `from`. Run after seed.mjs.
import fs from "fs";
export const R = {
  "hub>godel": "Where the map begins: a system looking at itself.",
  "godel>hub": "One idea among many. The map is where it meets the others.",
  "godel>th_says": "The result itself, said plainly.",
  "th_says>godel": "The person and the year behind it.",
  "godel>tr_true": "He needed a sense of true that the rules could not swallow.",
  "tr_true>godel": "The question his result opened: true in what sense?",
  "godel>s_sys": "Every claim here is about some system of rules.",
  "s_sys>godel": "The kind of thing his result is about.",
  "godel>tr_ladder": "If a system cannot see itself, perhaps something above it can.",
  "tr_ladder>godel": "Each step up brings its own version of the same limit.",
  "godel>c_lucas": "Does it say a mind is more than a machine?",
  "c_lucas>godel": "Their argument leans on his result and asks a lot of it.",
  "godel>c_quantum": "A bridge to physics, loosely held.",
  "c_quantum>godel": "Used as a metaphor, and the metaphor is the interesting part.",
  "godel>h_asym": "Doubt costs a sound system little, and certainty costs it a lot.",
  "h_asym>godel": "Where the humility in his result comes from.",
  "godel>p_sig": "Systems that cannot doubt themselves leave a trace.",
  "p_sig>godel": "It looks like what his result predicts for rigid systems.",
  "godel>b_fran": "A careful guide to what the theorem says and where it stops.",
  "b_fran>godel": "A reader who takes the theorem apart piece by piece.",
};
if (process.argv[1].endsWith("readings.mjs")) {
  const j = JSON.parse(fs.readFileSync("public/seed.json", "utf8"));
  j.links = j.links.map(([a, b]) => [a, b, R[a + ">" + b] || "", R[b + ">" + a] || ""]);
  fs.writeFileSync("public/seed.json", JSON.stringify(j));
  const q = [];
  for (const [a, b, ab, ba] of j.links) if (ab || ba) q.push(`UPDATE links SET ab = '${ab.replace(/'/g, "''")}', ba = '${ba.replace(/'/g, "''")}' WHERE id = 'l_${a}__${b}' AND owner = 'seed';`);
  fs.writeFileSync(process.argv[2] || "/tmp/readings.sql", q.join(" "));
  console.log(q.length, "links with readings");
}
