// Fuller, self-contained card titles for stars whose short label needs context. Run after seed.mjs.
import fs from "fs";
export const T = {
  th_says: "What Gödel’s incompleteness theorems say",
  th_num: "Gödel numbering: statements become numbers",
  th_primes: "Gödel numbering: where primes come in",
  th_sent: "The Gödel sentence that points at itself",
  th_second: "Gödel’s second theorem",
  th_cond: "The conditions a system must meet for Gödel’s theorems to apply",
  th_out: "Who sees from outside that the Gödel sentence is true",
  w_judge: "The judge picture of proof and truth",
  w_trust: "Trust: what a system can have instead of proof",
  s_sys: "What a formal system is",
  s_thr: "The threshold where Gödel’s theorems begin to apply",
  r_tri: "The triangle: checkable, complete, true",
  tr_ladder: "Is there an ultimate outside? The ladder of systems",
  c_hof: "Hofstadter’s opposite reading: the loop is the self",
  c_replies: "Replies to the Lucas–Penrose argument",
  h_asym: "The asymmetry between doubt and certainty in a system",
  h_caution: "The caution against over-reading Gödel’s theorems",
  h_said: "Who said something like it before and around Gödel",
  p_sig: "The signature of a broken system in society",
  h_escape: "Escape routes from Löb’s theorem that match the intuition of humility",
};
if (process.argv[1].endsWith("retitle.mjs")) {
  const j = JSON.parse(fs.readFileSync("public/seed.json", "utf8"));
  for (const s of j.stars) if (T[s.id]) s.title = T[s.id];
  fs.writeFileSync("public/seed.json", JSON.stringify(j));
  console.log(Object.keys(T).length, "titles");
}
