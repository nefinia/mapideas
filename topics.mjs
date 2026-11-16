// Builds public/seed-topics.json: four more topics around the center (Math, Time, Astronomy, History).
// Run: node topics.mjs
// The last star in the file is the marker the worker checks (see TOPICS in src/worker.js), so "history" stays last.
import fs from "fs";

const W = (t, path) => ({ t: "Wikipedia: " + t, u: "https://en.wikipedia.org/wiki/" + path });
const SEP = (t, slug) => ({ t: "Stanford Encyclopedia of Philosophy: " + t, u: "https://plato.stanford.edu/entries/" + slug + "/" });
const p = (s, verify) => "<p>" + s + (verify ? ' <span class="chk">verify</span>' : "") + "</p>";

// topic id -> [group id, lens groups [id, name, angle]]
const TOPICS = {
  math: { grp: "ma", angle: 150, lenses: [["ma_found", "foundations", 125], ["ma_pat", "patterns", 150], ["ma_use", "reaching out", 175]] },
  time: { grp: "ti", angle: 30, lenses: [["ti_meas", "measuring", 5], ["ti_phys", "physics", 30], ["ti_felt", "felt and told", 55]] },
  astronomy: { grp: "as", angle: -30, lenses: [["as_look", "looking", -55], ["as_str", "structure", -30], ["as_ppl", "sky and people", -5]] },
  history: { grp: "hi", angle: -150, lenses: [["hi_rec", "records", -175], ["hi_jou", "journeys", -150], ["hi_kno", "knowing", -125]] },
};
const RADIUS = 330, LENS_RADIUS = 470;

const groups = [];
for (const t of Object.values(TOPICS)) {
  groups.push({ id: t.grp, name: "", angle: t.angle, radius: RADIUS });
  for (const [id, name, angle] of t.lenses) groups.push({ id, name, angle, radius: LENS_RADIUS });
}

// [id, group, label, body (html), sources, size]
const S = [];
const add = (id, grp, label, body, sources, size = 2) => S.push({ id, grp, kind: "f", size, label, title: label, body, sources });

// ---------------- Math ----------------
add("mat_proof", "ma_found", "Proof",
  p("A proof is a chain of steps where each one is forced by the ones before it. The Greeks made it the heart of mathematics, and Euclid’s Elements shows it at work: a few plain starting points and a long tower built on them."),
  [W("Mathematical proof", "Mathematical_proof"), W("Euclid’s Elements", "Euclid%27s_Elements")]);
add("mat_axioms", "ma_found", "Axioms",
  p("Every proof starts somewhere. Axioms are the statements accepted without proof, such as Euclid’s postulates about points and lines, or Peano’s rules for the counting numbers. Choosing them is a quiet act that everything after depends on."),
  [W("Axiom", "Axiom"), W("Peano axioms", "Peano_axioms")]);
add("mat_infinity", "ma_found", "Infinity",
  p("Cantor showed that infinities come in different sizes. The counting numbers can be listed one after another, and the real numbers cannot. His diagonal argument builds a number that differs from the n-th entry of any list in its n-th digit. A close cousin of that move sits inside Gödel’s proof."),
  [W("Cantor’s diagonal argument", "Cantor%27s_diagonal_argument"), W("Georg Cantor", "Georg_Cantor")]);
add("mat_zero", "ma_found", "Zero",
  p("Zero began as an empty place in a written number and slowly became a number of its own. Indian mathematicians, among them Brahmagupta in the seventh century, wrote down rules for calculating with it. From there it travelled with the numerals into the Arab world and Europe.", true),
  [W("0", "0"), W("Brahmagupta", "Brahmagupta")]);
add("mat_computation", "ma_found", "Computation",
  p("In 1936 Turing described a machine that follows simple rules and asked what such machines can decide. The halting problem, whether a program will ever stop, has no general answer. It is the same kind of limit Gödel found, seen from the side of programs."),
  [W("Halting problem", "Halting_problem"), W("Turing machine", "Turing_machine")]);

add("mat_symmetry", "ma_pat", "Symmetry",
  p("A symmetry is a change that leaves something looking the same. Group theory turned that into an exact language, and Galois used it to explain why some equations can be solved by formulas and others cannot. Noether later tied symmetries of physical laws to quantities that stay constant, like energy."),
  [W("Symmetry (mathematics)", "Symmetry_(mathematics)"), W("Noether’s theorem", "Noether%27s_theorem")]);
add("mat_primes", "ma_pat", "Prime numbers",
  p("Primes are the numbers that cannot be split into smaller factors, and every whole number is built from them in exactly one way. Euclid showed there are infinitely many. Gödel used them as letters when he turned statements into numbers."),
  [W("Prime number", "Prime_number"), W("Euclid’s theorem", "Euclid%27s_theorem")]);
add("mat_geometry", "ma_pat", "Geometry",
  p("Geometry began as measuring land and became the study of shape and space. For two thousand years people tried to derive Euclid’s fifth postulate from the others. In the nineteenth century it turned out that it cannot be derived, and other consistent geometries exist."),
  [W("Non-Euclidean geometry", "Non-Euclidean_geometry"), W("Geometry", "Geometry")]);
add("mat_ratio", "ma_pat", "Number and proportion",
  p("Comparing sizes by ratio is one of the oldest mathematical habits. The Pythagoreans found it in the lengths of plucked strings, and later it became fractions, scale and the idea that some quantities, like the diagonal of a square, have no ratio at all."),
  [W("Ratio", "Ratio"), W("Irrational number", "Irrational_number")]);

add("mat_algorithm", "ma_use", "Algorithms",
  p("An algorithm is a recipe exact enough for a machine to follow. The word comes from the name of al-Khwarizmi, who wrote in Baghdad in the ninth century on calculating with the Indian numerals and on solving equations."),
  [W("Algorithm", "Algorithm"), W("Al-Khwarizmi", "Al-Khwarizmi")]);
add("mat_model", "ma_use", "Models of the world",
  p("Mathematics keeps turning out to describe things it was not built for. Orbits follow ellipses, waves follow sums of sines, and populations follow growth curves. Why that works so well is an old question and still an open one."),
  [W("The Unreasonable Effectiveness of Mathematics in the Natural Sciences", "The_Unreasonable_Effectiveness_of_Mathematics_in_the_Natural_Sciences")]);

add("math", "ma", "Math",
  p("A way into mathematics through what it is built on and where it reaches: proof, axioms and infinity at the base, symmetry and number as its patterns, and the places where it meets computers and the physical world. Gödel sits at the foundations."),
  [W("Mathematics", "Mathematics")], 4);

// ---------------- Time ----------------
add("ti_clocks", "ti_meas", "Clocks",
  p("From shadows on a sundial to water clocks, pendulums and quartz, clocks are anything that repeats steadily. Since 1967 the second has been defined by the vibration of caesium atoms, which makes the best clocks agree to within a second over many millions of years."),
  [W("Atomic clock", "Atomic_clock"), W("History of timekeeping devices", "History_of_timekeeping_devices")]);
add("ti_daymonthyear", "ti_meas", "Day, month, year",
  p("The sky offers three clocks: the turning of the Earth, the phases of the Moon and the cycle of seasons. They do not fit evenly into each other, a year is about 365.24 days and a lunar month about 29.5, and the long work of making them agree is the story of calendars."),
  [W("Year", "Year"), W("Lunar month", "Lunar_month")]);
add("ti_calendars", "ti_meas", "Calendars",
  p("A calendar is an agreement about how to count days against the sky. Some follow the Moon, some the Sun, many try to follow both, and each needs small repairs: leap days, leap months, skipped dates. Behind every one sits astronomy, arithmetic and a community that wants to meet on the same day."),
  [W("Calendar", "Calendar"), W("Gregorian calendar", "Gregorian_calendar")], 3);
add("ti_cycles", "ti_meas", "Time as a cycle",
  p("Many traditions see time as something that returns. The Maya combined a 260-day count with a 365-day year, which meet again every 52 years, and wrote longer counts on top. A line and a circle both live inside most calendars.", true),
  [W("Maya calendar", "Maya_calendar")]);

add("ti_arrow", "ti_phys", "The arrow of time",
  p("Most basic laws of physics work the same running forward or backward. Yet eggs break and do not unbreak. The usual answer is entropy: there are far more disordered arrangements than ordered ones, and the early universe began in an unusually ordered state."),
  [W("Arrow of time", "Arrow_of_time"), W("Entropy", "Entropy")]);
add("ti_relativity", "ti_phys", "Time and motion",
  p("In relativity, two clocks need not agree. A clock on a fast journey runs slow, and a clock higher in a gravitational field runs a little faster than one lower down. Satellite navigation has to correct for both effects to stay accurate."),
  [W("Time dilation", "Time_dilation"), W("Global Positioning System: Relativity", "Global_Positioning_System#Relativity")]);
add("ti_godelmetric", "ti_phys", "Gödel’s rotating universe",
  p("In 1949 Gödel found a solution of Einstein’s equations for a universe that turns as a whole and contains paths that return to their own past. It showed that general relativity alone does not forbid such loops, and he took this as a hint that time may not be what it seems."),
  [W("Gödel metric", "G%C3%B6del_metric"), W("Closed timelike curve", "Closed_timelike_curve")]);

add("ti_present", "ti_felt", "The felt present",
  p("The present we feel has some width. William James called it the specious present, a short stretch of a few seconds in which we hear a phrase of music or a spoken sentence as one thing. It is where memory, expectation and attention meet."),
  [W("Specious present", "Specious_present"), SEP("Time", "time")]);
add("ti_memory", "ti_felt", "Memory and the past",
  p("Remembering is a way of rebuilding a past moment each time, and it can shift in the retelling. Cultures keep a shared past in songs, stories and written records, and that is where time meets history."),
  [W("Memory", "Memory")]);

add("time", "ti", "Time",
  p("A way into time through how it is measured, how physics treats it and how it is felt and told. The sky gave the first clocks, music gives time its rhythm, and Gödel asked in his own way what time is."),
  [SEP("Time", "time")], 4);

// ---------------- Astronomy ----------------
add("as_sky", "as_look", "The naked-eye sky",
  p("Before telescopes, people learned the sky by patient watching: the Sun’s path, the Moon’s phases, the wandering planets against the fixed stars. Those records set the calendars, the seasons for planting and the first predictions."),
  [W("Astronomy", "Astronomy")]);
add("as_light", "as_look", "Light takes time",
  p("Light travels fast and still takes time. Sunlight is about eight minutes old when it reaches us, and the light of the Andromeda galaxy has travelled around two and a half million years. Looking farther away is looking further back."),
  [W("Light-year", "Light-year"), W("Andromeda Galaxy", "Andromeda_Galaxy")]);
add("as_scope", "as_look", "Telescopes",
  p("In 1609 and 1610 Galileo pointed a telescope at the sky and saw mountains on the Moon, phases of Venus and four moons circling Jupiter. Each new kind of telescope since, from radio dishes to space observatories, has opened another kind of sky."),
  [W("Telescope", "Telescope"), W("Galileo Galilei", "Galileo_Galilei")]);
add("as_orbits", "as_look", "Orbits",
  p("Kepler found that planets move on ellipses and that a line from the Sun sweeps equal areas in equal times. Newton later showed that one law of gravity explains all of it. For a while Kepler also hoped to find music in the planetary distances."),
  [W("Kepler’s laws of planetary motion", "Kepler%27s_laws_of_planetary_motion")]);

add("as_stars", "as_str", "Lives of stars",
  p("Stars form in clouds of gas, shine by fusing light elements into heavier ones, and end in a way set mostly by their mass: as a white dwarf, a neutron star or a black hole. Most of the carbon, oxygen and iron around us was made inside earlier stars."),
  [W("Stellar evolution", "Stellar_evolution"), W("Stellar nucleosynthesis", "Stellar_nucleosynthesis")]);
add("as_expansion", "as_str", "The expanding universe",
  p("In the 1920s Lemaître and Hubble found that distant galaxies move away from us, and the farther they are the faster they go. The simplest reading is that space itself is stretching, and that the universe was once much smaller and hotter."),
  [W("Hubble’s law", "Hubble%27s_law"), W("Expansion of the universe", "Expansion_of_the_universe")]);
add("as_web", "as_str", "The cosmic web",
  p("On the largest scales galaxies are not scattered evenly. They gather along filaments and sheets around huge empty voids, like a web. Gravity grew this pattern from tiny differences in the early universe."),
  [W("Galaxy filament", "Galaxy_filament"), W("Large-scale structure of the universe", "Large-scale_structure_of_the_universe")]);

add("as_constellations", "as_ppl", "Constellations",
  p("A constellation is a pattern people draw between stars, and the patterns differ between cultures. The familiar Western figures come mostly from Greek and Mesopotamian sources, while other traditions read the sky differently, for instance the dark shapes in the dust lanes of the Milky Way that Andean peoples named.", true),
  [W("Constellation", "Constellation"), W("Dark constellation", "Dark_constellation")]);
add("as_archaeo", "as_ppl", "Archaeoastronomy",
  p("Archaeoastronomy studies how people of the past watched and used the sky: alignments of buildings to the Sun or stars, calendars, and the stories told about what happens above. It sits where astronomy meets archaeology, anthropology and history."),
  [W("Archaeoastronomy", "Archaeoastronomy")]);
add("as_cosmovision", "as_ppl", "Cosmovisions",
  p("A cosmovision is a way of seeing the cosmos that holds knowledge, practice and meaning together. Many Indigenous traditions understand the sky as part of the same world as land, people and time, and this invites a conversation with astronomy that goes in both directions."),
  [W("Cosmovision", "Cosmovision")]);

add("astronomy", "as", "Astronomy",
  p("A way into astronomy through how we look, what we found about the large structure of things, and how people in different places read the same sky. It connects to time through the calendar and to history through the records kept by watchers."),
  [W("Astronomy", "Astronomy")], 4);

// ---------------- History ----------------
add("hi_writing", "hi_rec", "Writing",
  p("Writing appeared in Mesopotamia more than five thousand years ago, and an early use was keeping accounts of grain and goods. Over time it came to hold laws, letters, poems and calculations, and it lets one person speak to someone far away in place and time."),
  [W("History of writing", "History_of_writing"), W("Cuneiform", "Cuneiform")]);
add("hi_oral", "hi_rec", "Oral traditions",
  p("Many peoples keep their past in song, story and ritual. Memory is helped by rhythm, repetition and place, and a long chain of tellers can carry knowledge across many generations."),
  [W("Oral tradition", "Oral_tradition")]);
add("hi_skyrecords", "hi_rec", "Records of the sky",
  p("The Babylonian astronomical diaries record the Moon, planets, weather and eclipses night after night over several centuries. The sky was one of the first things people wrote down systematically, and those records are still used today."),
  [W("Babylonian astronomy", "Babylonian_astronomy")]);

add("hi_numbers", "hi_jou", "How numbers travelled",
  p("Our digits came from India, passed through the Arab world and reached Europe in the Middle Ages, helped by books such as Fibonacci’s Liber Abaci of 1202. With them came the place-value system and zero, which made written arithmetic far easier than with Roman numerals."),
  [W("Hindu–Arabic numeral system", "Hindu%E2%80%93Arabic_numeral_system"), W("Liber Abaci", "Liber_Abaci")]);
add("hi_wisdom", "hi_jou", "Translation and the House of Wisdom",
  p("In ninth-century Baghdad, scholars translated Greek, Persian and Indian works into Arabic and added their own. Algebra and much of astronomy were carried and extended there before returning to Europe in translation.", true),
  [W("House of Wisdom", "House_of_Wisdom"), W("Translation movement", "Translation_movement")]);
add("hi_routes", "hi_jou", "Routes and exchange",
  p("Ideas travel along the same roads as goods. The Silk Roads, sea lanes and river valleys carried spices, paper, numbers and stories, and many discoveries belong to the meeting of peoples."),
  [W("Silk Road", "Silk_Road")]);

add("hi_sources", "hi_kno", "Sources and voices",
  p("Every account is written by someone, for someone, at some moment. Historians ask who wrote it, who is missing, and what survived by chance. A past told only from the records of the powerful has gaps that other sources, including oral ones, can help fill."),
  [W("Historiography", "Historiography"), W("Primary source", "Primary_source")]);
add("hi_dating", "hi_kno", "Dating the past",
  p("Tree rings, layers in ice and radiocarbon in old wood and bone give dates to things without calendars. Eclipses in old chronicles act as anchor points, because astronomers can compute exactly when each one happened."),
  [W("Radiocarbon dating", "Radiocarbon_dating"), W("Dendrochronology", "Dendrochronology")]);

add("history", "hi", "History",
  p("A way into history through how the past is kept, how ideas and numbers moved between peoples, and how we come to know what happened. Writing, memory and the sky are three of its oldest records."),
  [W("History", "History")], 4);

// ---------------- Links ----------------
// [a, b, how b reads from a, how a reads from b]
const L = [];
const link = (a, b, ab = null, ba = null) => L.push([a, b, ab, ba]);

// topics to the center
link("math", "hub", "One idea among many. The map is where it meets the others.", "Where the map begins: a way of counting and proving.");
link("time", "hub", "One idea among many. The map is where it meets the others.", "Where the map begins: a way of keeping moments.");
link("astronomy", "hub", "One idea among many. The map is where it meets the others.", "Where the map begins: a look at the sky.");
link("history", "hub", "One idea among many. The map is where it meets the others.", "Where the map begins: a memory of what happened.");

// each topic to its entry ideas
for (const [t, ids] of Object.entries({
  math: ["mat_proof", "mat_infinity", "mat_symmetry", "mat_computation"],
  time: ["ti_clocks", "ti_calendars", "ti_arrow", "ti_present"],
  astronomy: ["as_sky", "as_light", "as_stars", "as_constellations"],
  history: ["hi_writing", "hi_oral", "hi_numbers", "hi_sources"],
})) for (const id of ids) link(t, id);

// across topics
link("math", "godel", "Where a system of rules is asked about its own limits.", "The ground it stands on: proof, axioms and infinity.");
link("math", "music", "Ratios made audible.", "A language of ratios, symmetries and cycles.");
link("math", "time", "Cycles, counting and the long work of calendars.", "The arithmetic inside every clock and calendar.");
link("time", "music", "Time made audible, as rhythm.", "Pulse and phrase, the way music holds a moment.");
link("time", "astronomy", "The sky gave us the first clocks.", "What we keep with: days, months, years.");
link("time", "history", "How a moment becomes a record.", "Dates, calendars and how people count the years.");
link("astronomy", "history", "Watchers wrote down what they saw, and the records last.", "Every culture has a sky, and tells stories on it.");
link("astronomy", "math", "Orbits, geometry and the first predictions.", "A place where mathematics could be checked against the world.");
link("history", "math", "Numbers, zero and algebra travelled between peoples.", "Where the ideas came from and how they moved.");
link("history", "music", "A past kept in songs and rhythm.", "A memory that does not need writing.");
link("astronomy", "music", "Old hopes of finding music in the heavens.", "The sphere of the sky, imagined as sound.");

// idea to idea across the whole map
link("mat_axioms", "s_sys", "What a system is made of.", "The first lines every proof stands on.");
link("mat_axioms", "godel");
link("mat_axioms", "mat_proof");
link("mat_proof", "th_says", "A proof about proofs.", "What proof can and cannot reach.");
link("mat_proof", "tr_true", "Proved is one thing and true is another.", "What a proof is meant to deliver.");
link("mat_infinity", "godel", "Gödel’s proof borrows the diagonal move.", "Where the diagonal trick found a second home.");
link("mat_infinity", "tr_loops", "Closing a list on itself.", "A cousin of the diagonal.");
link("mat_computation", "godel", "The same limit, seen from programs.", "A limit that machines run into too.");
link("mat_computation", "s_prog", "A recipe a machine can follow.", "Where programs meet their limit.");
link("mat_computation", "mat_algorithm");
link("mat_primes", "th_primes", "The letters of Gödel’s trick.", "Where the primes got a second job.");
link("mat_primes", "th_num");
link("mat_primes", "mu_primes", "Why some musical intervals never close.", "The numbers behind the comma.");
link("mat_ratio", "mu_ratio", "Strings and the first ratios.", "Where proportion became sound.");
link("mat_ratio", "mu_octave");
link("mat_ratio", "mat_geometry");
link("mat_symmetry", "mat_primes");
link("mat_symmetry", "mu_fourier", "Waves and their sums.", "A pattern that repeats.");
link("mat_zero", "hi_numbers", "How the digit travelled.", "Where the empty place became a number.");
link("mat_zero", "mat_infinity");
link("mat_algorithm", "hi_wisdom", "A word from Baghdad.", "The recipes that went from Baghdad outward.");
link("mat_model", "as_orbits", "A law that fits the planets.", "A place where mathematics met the world.");
link("mat_model", "mat_symmetry");
link("mat_geometry", "as_orbits", "Ellipses in the sky.", "The shapes that orbits follow.");
link("mat_geometry", "ti_relativity", "Curved space and clocks.", "The geometry that bends time.");

link("ti_clocks", "ti_daymonthyear", "What the first clocks followed.", "The steady repeat everything is counted against.");
link("ti_clocks", "ti_relativity");
link("ti_daymonthyear", "ti_calendars");
link("ti_daymonthyear", "as_sky", "Where the days, months and years are seen.", "Time as read from the heavens.");
link("ti_calendars", "as_sky", "The counting reads the sky.", "A reason to keep watching.");
link("ti_calendars", "hi_dating", "The way years are numbered.", "A calendar needs fixed points.");
link("ti_calendars", "hi_numbers", "Counting needs digits.", "The digits for days and years.");
link("ti_calendars", "mat_zero");
link("ti_calendars", "as_archaeo", "Old calendars in stone and sky.", "How past peoples kept time.");
link("ti_cycles", "ti_calendars");
link("ti_cycles", "as_cosmovision", "Time inside a way of seeing the cosmos.", "The turning of the year as part of a world.");
link("ti_cycles", "mu_rhythm", "Returns on a long scale.", "Cycles on a short scale.");
link("ti_arrow", "ti_relativity");
link("ti_arrow", "c_reality", "Where the physics meets what we feel.", "A direction that the laws do not give.");
link("ti_godelmetric", "godel");
link("ti_godelmetric", "ti_relativity");
link("ti_godelmetric", "tr_loops", "A loop in time.", "The loop made of spacetime.");
link("ti_present", "mu_rhythm", "What we hear as one phrase.", "A moment as the mind holds it.");
link("ti_present", "ti_memory");
link("ti_memory", "hi_oral", "A past kept by many voices.", "How the memory of a person becomes a people’s.");
link("ti_memory", "hi_sources");

link("as_sky", "as_constellations");
link("as_sky", "as_scope");
link("as_light", "as_expansion", "Far means long ago.", "Light that travelled for ages.");
link("as_light", "ti_relativity");
link("as_scope", "as_stars");
link("as_orbits", "mu_kepler", "A hope of music in the planetary distances.", "The calculation behind the hope.");
link("as_orbits", "as_stars");
link("as_stars", "as_expansion");
link("as_expansion", "as_web");
link("as_web", "as_stars");
link("as_web", "mat_symmetry", "Patterns grown from small differences.", "A pattern of gaps and threads.");
link("as_constellations", "as_cosmovision");
link("as_constellations", "hi_skyrecords");
link("as_archaeo", "as_cosmovision");
link("as_archaeo", "hi_sources");
link("as_cosmovision", "hi_oral", "Knowledge of the sky passed on by voice.", "A sky read through stories.");

link("hi_writing", "hi_skyrecords");
link("hi_writing", "hi_sources");
link("hi_oral", "mu_gamelan", "A past carried by music.", "Where a tradition holds its memory.");
link("hi_skyrecords", "hi_dating", "Eclipses as anchor dates.", "The sky written into the calendar of the past.");
link("hi_skyrecords", "as_sky");
link("hi_numbers", "hi_wisdom");
link("hi_wisdom", "hi_routes");
link("hi_routes", "hi_numbers");
link("hi_dating", "hi_sources");

// ---------------- Checks ----------------
const ids = new Set(S.map((s) => s.id));
const existing = new Set(["hub", "godel", "music", ...JSON.parse(fs.readFileSync("public/seed.json", "utf8")).stars.map((s) => s.id), ...JSON.parse(fs.readFileSync("public/seed-music.json", "utf8")).stars.map((s) => s.id)]);
const gids = new Set(groups.map((g) => g.id));
let bad = 0;
for (const s of S) if (!gids.has(s.grp)) { console.log("NO GROUP", s.id, s.grp); bad++; }
const seen = new Set();
for (const [a, b] of L) {
  for (const x of [a, b]) if (!ids.has(x) && !existing.has(x)) { console.log("MISSING", x); bad++; }
  const k = a + "|" + b;
  if (seen.has(k)) { console.log("DUP", k); bad++; }
  seen.add(k);
  if (seen.has(b + "|" + a)) { console.log("DUP (reverse)", k); bad++; }
}
const deg = {};
for (const [a, b] of L) { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }
for (const s of S) if (!deg[s.id]) { console.log("ISOLATED", s.id); bad++; }
for (const s of S) if (/—|–/.test(s.body.replace(/<[^>]+>/g, "").replace(/[0-9]–[0-9]/g, ""))) console.log("DASH in", s.id);
if (bad) { console.log("problems:", bad); process.exit(1); }

// the last star is the marker the worker checks
const json = { map: { id: "godel", title: "Gödel", center: "hub" }, groups, stars: S, links: L };
fs.writeFileSync("public/seed-topics.json", JSON.stringify(json));
console.log("seed-topics.json", S.length, "stars", L.length, "links", groups.length, "groups, last star:", S[S.length - 1].id);
