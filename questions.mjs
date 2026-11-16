// Builds public/seed-questions.json: open questions tied to the ideas of every topic so far.
// Run: node questions.mjs   (reads seed.json, seed-music.json and seed-topics.json for the ideas to link to)
// The last star in the file is the marker the worker checks (see TOPICS in src/worker.js).
import fs from "fs";

const W = (t, path) => ({ t: "Wikipedia: " + t, u: "https://en.wikipedia.org/wiki/" + path });
const p = (s, verify) => "<p>" + s + (verify ? ' <span class="chk">verify</span>' : "") + "</p>";

const read = (f) => JSON.parse(fs.readFileSync("public/" + f, "utf8"));
const grp = {};
for (const f of ["seed.json", "seed-music.json", "seed-topics.json"]) for (const s of read(f).stars) grp[s.id] = s.grp;

const S = [], L = [];
// q(id, label, title, body, links (the first one decides the topic it sits in), sources, verify)
const q = (id, label, title, body, links, sources = [], verify = false) => {
  S.push({ id, grp: grp[links[0]], kind: "q", size: 2, label, title, body: p(body, verify), sources });
  for (const l of links) L.push([id, l, null, null]);
};

// ---------------- Math ----------------
q("q_math_certain", "What can we know for certain?", "What can we know for certain?",
  "Proof gives the strongest certainty people have found. Gödel showed where it stops, and the question is what we do with the ideas that sit past that edge.",
  ["math", "mat_proof", "godel"], [W("Mathematical proof", "Mathematical_proof")]);
q("q_math_exist", "Where do numbers live?", "Where do numbers live?",
  "Some mathematicians feel they discover numbers, as if they were there already. Others feel they build them, like a language. Both views have careful defenders, and the question stays open.",
  ["mat_infinity", "mat_zero", "tr_views"], [W("Philosophy of mathematics", "Philosophy_of_mathematics")]);
q("q_math_enough", "When is a proof enough?", "When is a proof enough when no person can check it?",
  "The four colour theorem was proved in 1976 with help from a computer that checked thousands of cases. People still ask what it means to trust a proof that nobody can read in one sitting.",
  ["mat_proof", "mat_computation"], [W("Four color theorem", "Four_color_theorem")]);
q("q_math_choose", "Who chooses the axioms?", "Who chooses the axioms?",
  "Euclid’s fifth postulate could be dropped, and new geometries followed. The axiom of choice is accepted by most mathematicians and questioned by some. Choosing starting points is part judgment and part taste.",
  ["mat_axioms", "mat_geometry", "s_sys"], [W("Axiom of choice", "Axiom_of_choice")]);
q("q_math_between", "Is there a size between?", "Is there an infinity between the counting numbers and the real numbers?",
  "This is the continuum hypothesis. Gödel showed in 1940 that the usual axioms cannot disprove it, and Cohen showed in 1963 that they cannot prove it. Whether it has an answer at all is still argued.",
  ["mat_infinity", "godel"], [W("Continuum hypothesis", "Continuum_hypothesis")]);
q("q_math_zero", "What does zero count?", "What does zero count?",
  "Zero is an empty place in a written number and also a number you can add to and multiply by. How those two meanings became one idea is part of a long story.",
  ["mat_zero", "hi_numbers"], [W("0", "0")]);
q("q_math_primes", "Is there a pattern in the primes?", "Is there a pattern in the prime numbers?",
  "Primes look scattered, yet their counts follow a smooth law on average. The Riemann hypothesis, still unproved, would say much more about how regular they are.",
  ["mat_primes"], [W("Riemann hypothesis", "Riemann_hypothesis")]);
q("q_math_world", "Why does math fit the world?", "Why does mathematics fit the world so well?",
  "Ideas made for their own interest, like ellipses or complex numbers, later turned out to describe orbits and waves. Wigner called this an unreasonable effectiveness, and nobody has settled why.",
  ["mat_model", "as_orbits"], [W("The Unreasonable Effectiveness of Mathematics in the Natural Sciences", "The_Unreasonable_Effectiveness_of_Mathematics_in_the_Natural_Sciences")]);
q("q_math_matter", "Why is there matter at all?", "Why is there more matter than antimatter?",
  "Our best laws treat them almost symmetrically, and still the universe is made of matter. A small difference in the early universe must have tipped the balance, and where it came from is open.",
  ["mat_symmetry", "as_expansion"], [W("Baryon asymmetry", "Baryon_asymmetry")]);
q("q_math_machine", "Can a machine find new math?", "Can a machine find new mathematics?",
  "Computers check proofs and now help search for them. Whether they can come up with a new idea, and recognise that it matters, is a question the field is only starting to test.",
  ["mat_computation", "mat_algorithm"], [W("Automated theorem proving", "Automated_theorem_proving")]);

// ---------------- Time ----------------
q("q_time_moment", "What is a moment?", "What is a moment?",
  "A clock ticks in equal steps, and a moment as we live it has some width and some feeling. The two sit close together and fit poorly, and the question is how they relate.",
  ["time", "ti_present", "ti_clocks"], [W("Specious present", "Specious_present")]);
q("q_time_now", "Is there a shared now?", "Is there a single now shared by everything in the universe?",
  "In relativity, two observers in motion disagree about which distant events happen at the same time. So a universal present may be a feeling and not a feature of the world.",
  ["ti_relativity", "ti_present"], [W("Relativity of simultaneity", "Relativity_of_simultaneity")]);
q("q_time_order", "Why did it all start ordered?", "Why was the early universe so ordered?",
  "The arrow of time rests on the early universe having very low entropy. Nothing in the basic laws asks for that, and it remains one of the big open questions.",
  ["ti_arrow", "as_expansion"], [W("Past hypothesis", "Past_hypothesis")]);
q("q_time_loop", "Could time loop back?", "Could time loop back on itself?",
  "Gödel’s rotating universe allows paths that return to their own past. It is a solution to the equations that does not describe our universe, and whether anything like it could exist is not known.",
  ["ti_godelmetric", "godel", "tr_loops"], [W("Closed timelike curve", "Closed_timelike_curve")]);
q("q_time_flow", "Does time flow?", "Does time flow, or is every moment equally there?",
  "Some physicists and philosophers describe the universe as a block with every moment in place. Others hold that only the present is real. Physics alone has not decided between them.",
  ["ti_arrow", "ti_present", "ti_relativity"], [W("Eternalism (philosophy of time)", "Eternalism_(philosophy_of_time)")]);
q("q_time_week", "Why do we count in sevens?", "Why do we count in weeks of seven days?",
  "A day, a month and a year follow the sky. The week follows none of those cycles. Where it began is debated, and many cultures have used other lengths.",
  ["ti_calendars", "ti_daymonthyear", "hi_skyrecords"], [W("Week", "Week")], true);
q("q_time_future", "Why do we remember only the past?", "Why do we remember the past and not the future?",
  "Memory runs one way, and many link that to the arrow of entropy. How a physical direction becomes the direction of experience is still being worked out.",
  ["ti_memory", "ti_arrow"], [W("Arrow of time", "Arrow_of_time")]);
q("q_time_age", "Why does time speed up as we age?", "Why does time seem to speed up as we age?",
  "Several explanations have been offered, from how memories are stored to how new each day feels. None is settled, and the feeling differs between people.",
  ["ti_present", "ti_memory"], [], true);
q("q_time_clock", "How accurate can a clock be?", "How accurate can a clock be?",
  "Atomic clocks now agree to within a second over many millions of years, and newer optical clocks do better. At that level a clock notices a height difference of a few centimetres, which links timekeeping to gravity.",
  ["ti_clocks", "ti_relativity"], [W("Optical lattice clock", "Optical_lattice_clock")], true);
q("q_time_shape", "Is time a line or a circle?", "Is time a line or a circle?",
  "Calendars hold both: years return, and numbered years only go forward. Traditions weigh the two differently, and the question asks what each one lets people see.",
  ["ti_cycles", "ti_arrow", "as_cosmovision"], [W("Maya calendar", "Maya_calendar")]);

// ---------------- Astronomy ----------------
q("q_astro_out", "What is out there?", "What is out there, and how did we learn it?",
  "Each new instrument opened a different sky, and each time the picture changed. The question keeps its shape: what else is there that we cannot see yet?",
  ["astronomy", "as_sky", "as_scope"], [W("Astronomy", "Astronomy")]);
q("q_astro_alone", "Are we alone?", "Are we alone?",
  "Planets have been found around many stars, and no sign of life beyond Earth has been confirmed. The Drake equation lays out what would have to be known to estimate it.",
  ["as_stars", "as_light"], [W("Drake equation", "Drake_equation")]);
q("q_astro_dark", "What is dark matter?", "What is dark matter?",
  "Galaxies spin and cluster as if there were much more mass than the matter we see. What that mass is has not been found, and the cosmic web is shaped by it.",
  ["as_web", "as_expansion"], [W("Dark matter", "Dark_matter")]);
q("q_astro_faster", "Why is expansion speeding up?", "Why is the expansion of the universe speeding up?",
  "Observations of distant supernovae in the late 1990s showed the expansion accelerating. The cause is called dark energy, which is a name for what is not yet understood.",
  ["as_expansion"], [W("Dark energy", "Dark_energy")]);
q("q_astro_before", "What was there before?", "What was there before the hot early universe?",
  "The expanding universe points back to a very hot, dense start. What came before it, or whether that question makes sense, has no agreed answer.",
  ["as_expansion", "ti_arrow"], [W("Big Bang", "Big_Bang")]);
q("q_astro_threads", "What shapes the web’s threads?", "What shapes the threads of the cosmic web?",
  "Gravity and dark matter grow filaments out of tiny early differences, and simulations reproduce the pattern well. How galaxies feed and change along those threads is still an active question.",
  ["as_web", "as_stars"], [W("Galaxy filament", "Galaxy_filament")]);
q("q_astro_sky", "What does this sky mean to others?", "What does the same sky mean to people elsewhere?",
  "A constellation is a choice about which stars to join and what story to tell. Reading other traditions on their own terms is both a science question and a listening one.",
  ["as_constellations", "as_cosmovision", "as_archaeo"], [W("Constellation", "Constellation")]);
q("q_astro_now", "What is the far sky like now?", "What does the far sky look like today?",
  "Every distant galaxy is seen as it was when its light left. What those galaxies have turned into since is something we can only infer.",
  ["as_light", "ti_relativity"], [W("Look-back time", "Look-back_time")]);
q("q_astro_atoms", "Are we made of stars?", "Are we made of stars, atom by atom?",
  "Much of the carbon and oxygen in us was made in stars, and heavy elements like gold seem to come partly from merging neutron stars. How much came from where is still being measured.",
  ["as_stars"], [W("Stellar nucleosynthesis", "Stellar_nucleosynthesis")]);
q("q_astro_stable", "Is the solar system stable?", "Is the solar system stable?",
  "Planetary orbits are chaotic over hundreds of millions of years, which makes long forecasts uncertain. Most simulations keep the planets in place for billions of years, with some rare exceptions.",
  ["as_orbits", "mat_model"], [W("Stability of the Solar System", "Stability_of_the_Solar_System")]);

// ---------------- History ----------------
q("q_hist_know", "How do we know what happened?", "How do we know what happened?",
  "The past reaches us through what was written, what was kept in memory, and what the ground and sky preserved. Each carries someone’s point of view and its own gaps.",
  ["history", "hi_sources", "hi_dating"], [W("Historiography", "Historiography")]);
q("q_hist_missing", "Whose voices are missing?", "Whose voices are missing from the record?",
  "Records come from those who could write and whose writing was kept. Oral traditions, objects and places can carry other voices, and the question is how to hear them.",
  ["hi_sources", "hi_oral", "hi_writing"], [W("Primary source", "Primary_source")]);
q("q_hist_story", "How long can a story stay true?", "How long can a story stay true when it is only told?",
  "Some oral accounts seem to describe events from thousands of years ago, such as coasts that flooded at the end of the last ice age. How accurate they stay over that span is an active area of study.",
  ["hi_oral", "hi_dating"], [{ t: "Nunn, P. D., Reid, N. J. (2016). Aboriginal memories of inundation of the Australian coast dating from more than 7000 years ago. Australian Geographer 47(1), 11–47." }], true);
q("q_hist_write", "What did people write down first?", "What did people first need to write down?",
  "Early writing was often about grain, goods and debts. How it grew from counting into stories, laws and letters is a question about what a society wants to keep.",
  ["hi_writing", "hi_numbers"], [W("History of writing", "History_of_writing")]);
q("q_hist_zero", "Who invented zero?", "Who invented zero?",
  "A placeholder for an empty place appears in several cultures, and the full idea of zero as a number is usually traced to India. Who did what, and when, is still discussed.",
  ["mat_zero", "hi_numbers"], [W("0", "0")], true);
q("q_hist_lost", "What was lost, and how to know?", "What was lost, and how would we know?",
  "Knowledge that was never copied leaves little trace. Gaps in what survives are hard to see, and every period has some.",
  ["hi_writing", "hi_sources", "hi_wisdom"], [W("Lost literature", "Lost_literature")]);
q("q_hist_date", "How sure can a date be?", "How sure can a date be?",
  "Radiocarbon dates come with ranges and need calibration against tree rings and other records. Eclipses and written calendars give sharper anchors, and they do not exist everywhere.",
  ["hi_dating", "ti_clocks"], [W("Radiocarbon dating", "Radiocarbon_dating")]);
q("q_hist_twice", "Do ideas arise twice?", "Do the same ideas appear separately in different places?",
  "Calculus came to Newton and Leibniz independently, and writing seems to have started in more than one region. Telling invention twice from travel is a question about how ideas move.",
  ["hi_routes", "hi_numbers"], [W("Multiple discovery", "Multiple_discovery")]);
q("q_hist_watch", "What did watchers hope to find?", "What did the first sky watchers hope to find?",
  "Records of the Moon, planets and eclipses were kept for calendars, farming and omens. What the watchers thought they were reading shapes how we read their records.",
  ["hi_skyrecords", "as_archaeo"], [W("Babylonian astronomy", "Babylonian_astronomy")]);

// ---------------- Music ----------------
q("q_mu_universal", "Is any music universal?", "Is any music universal?",
  "A study of recordings from many cultures found features that recur, such as songs built from a small set of notes and from steady beats. Whether they come from the ear or from shared habits is argued.",
  ["mu_octave", "mu_scales", "mu_gamelan"], [{ t: "Savage, P. E., Brown, S., Sakai, E., Currie, T. E. (2015). Statistical universals reveal the structures and functions of human music. PNAS 112(29), 8987–8992." }], true);
q("q_mu_octave", "Why do octaves sound the same?", "Why do we hear notes an octave apart as the same note?",
  "An octave is a doubling of frequency, and many animals respond to it. Part of the story is in the harmonic series and the ear, and part may be learned.",
  ["mu_octave", "mu_cochlea", "mu_harmonics"], []);
q("q_mu_consonance", "Is consonance heard or learned?", "Is consonance something we hear or something we learn?",
  "Roughness between close frequencies gives a physical part of the answer. Which sounds a culture treats as pleasing is shaped by what it grows up with.",
  ["mu_roughness", "mu_fifth", "mu_chords"], []);
q("q_mu_twelve", "Why twelve notes?", "Why twelve notes?",
  "Twelve fifths nearly line up with seven octaves, which makes twelve a neat place to stop. Other cultures divide the octave differently, and each choice makes some intervals easy and others hard.",
  ["mu_twelve", "mu_contfrac", "mu_comma"], []);
q("q_mu_perfect", "Is there a perfect tuning?", "Is there a perfect tuning?",
  "No tuning keeps every interval pure. Each system gives up something, and the history of temperament is a history of what musicians were willing to give up.",
  ["mu_temper", "mu_comma", "mu_ratio"], []);
q("q_mu_pitch", "Where is a pitch heard?", "Where is a pitch heard when it is not in the sound?",
  "The missing fundamental shows that the brain can supply a note that the air does not carry. How it does that is still studied.",
  ["mu_missing", "mu_cochlea"], []);
q("q_mu_rhythm", "Why do some rhythms feel right?", "Why do some rhythms feel right?",
  "Patterns that spread strokes evenly round a cycle turn up in many traditions. It is unclear how much of that comes from how we feel a beat and how much from shared culture.",
  ["mu_rhythm", "mu_africa", "ti_present"], []);
q("q_mu_voice", "Can one voice sing two notes?", "Can one voice sing two notes?",
  "Overtone singers shape the mouth to bring out one harmonic, and a melody seems to float above a steady drone. It shows how much of what we call a note is a choice about which part of a sound to follow.",
  ["mu_overtone", "mu_harmonics", "mu_resonance"], []);
q("q_mu_written", "What cannot be written down?", "What in music cannot be written down?",
  "Notation fixes pitch and rhythm well and leaves out timing, tone and the small bends of a voice. Traditions that pass music from person to person keep what writing leaves out.",
  ["mu_notation", "mu_raga", "mu_gamelan"], []);
q("q_mu_spheres", "Why hear numbers in the sky?", "Why did people hear numbers in the sky?",
  "From Pythagoras to Kepler, the same ratios that make musical intervals were looked for in the planets. The idea shaped astronomy for two thousand years before it faded.",
  ["mu_kepler", "as_orbits", "mu_ratio"], [W("Musica universalis", "Musica_universalis")]);
q("q_mu_feel", "How does a chord make us feel?", "How does a chord make us feel something?",
  "Major and minor are tied to moods in many listeners, and the link changes between cultures and eras. How much is in the sound and how much in the listening is open.",
  ["mu_modes", "mu_chords", "ti_present"], []);

// ---------------- Across topics ----------------
q("q_g_music", "Can music talk about music?", "Can music talk about itself?",
  "Canons and fugues fold a melody back on itself, and Hofstadter drew the line from there to Gödel’s self-reference. Whether that is more than a pleasing likeness is the question.",
  ["c_hof", "mu_notation", "tr_loops"], [{ t: "Hofstadter, D. (1979). Gödel, Escher, Bach: An Eternal Golden Braid. Basic Books." }]);
q("q_g_history", "Can history include its writer?", "Can a history include the one who writes it?",
  "Every account of the past is written from inside some moment. Taking that into account is a task for history and for any theory that has to include the theorist.",
  ["hi_sources", "c_q2"], []);
// the last star is the marker the worker checks
q("q_g_axioms", "Which new axioms should we add?", "Which new axioms should we add?",
  "Gödel hoped that stronger axioms would settle questions the usual ones leave open. Which ones to trust, and why, depends on judgments that proof alone does not supply.",
  ["mat_axioms", "godel", "mat_infinity"], [W("Gödel’s program", "Hilbert%27s_program")], true);

// ---------------- Checks ----------------
const existing = new Set(Object.keys(grp).concat(["hub", "godel", "music"]));
const ids = new Set(S.map((s) => s.id));
let bad = 0;
if (ids.size !== S.length) { console.log("DUPLICATE IDS"); bad++; }
for (const s of S) {
  if (existing.has(s.id)) { console.log("ID CLASH", s.id); bad++; }
  if (!s.grp) { console.log("NO GROUP", s.id); bad++; }
  if (s.label.length > 34) { console.log("LABEL TOO LONG", s.id, s.label.length); bad++; }
  if (/—|–/.test(s.title + s.body.replace(/<[^>]+>/g, ""))) { console.log("DASH", s.id); bad++; }
}
const seen = new Set();
for (const [a, b] of L) {
  if (!existing.has(b) && !ids.has(b)) { console.log("MISSING LINK TARGET", a, b); bad++; }
  if (seen.has(a + "|" + b)) { console.log("DUP LINK", a, b); bad++; }
  seen.add(a + "|" + b);
}
if (bad) { console.log("problems:", bad); process.exit(1); }

const json = { map: { id: "godel", title: "Gödel", center: "hub" }, groups: [], stars: S, links: L };
fs.writeFileSync("public/seed-questions.json", JSON.stringify(json));
console.log("seed-questions.json", S.length, "questions", L.length, "links, last star:", S[S.length - 1].id);
