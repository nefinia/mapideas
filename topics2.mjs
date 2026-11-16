// Builds public/seed-topics-2.json (eleven more topics) and public/seed-questions-2.json (open questions on them).
// Run: node topics2.mjs
// The last star of each file is the marker the worker checks (see TOPICS in src/worker.js): "art" for the topics, "q_x_voices" for the questions.
// Rule for contested ground: views sit side by side and none is ranked. Each tradition, people or culture has its own idea, never lumped together.
import fs from "fs";

const W = (t, path) => ({ t: "Wikipedia: " + t, u: "https://en.wikipedia.org/wiki/" + path });
const SEP = (t, slug) => ({ t: "Stanford Encyclopedia of Philosophy: " + t, u: "https://plato.stanford.edu/entries/" + slug + "/" });
const p = (s, verify) => "<p>" + s + (verify ? ' <span class="chk">verify</span>' : "") + "</p>";
const read = (f) => JSON.parse(fs.readFileSync("public/" + f, "utf8"));

const OUT = 470, LENS = 640;
// topic id -> group, angle, two lenses [id, name, angle offset]
const TOPICS = {
  mind: { grp: "mi", lenses: [["mi_aw", "awareness"], ["mi_ch", "choosing"]] },
  language: { grp: "la", lenses: [["la_us", "how we speak"], ["la_mean", "what words do"]] },
  stories: { grp: "st", lenses: [["st_tell", "telling"], ["st_old", "told for ages"]] },
  life: { grp: "li", lenses: [["li_how", "how it works"], ["li_where", "where it goes"]] },
  earth: { grp: "ea", lenses: [["ea_now", "the planet"], ["ea_long", "long changes"]] },
  society: { grp: "so", lenses: [["so_rules", "rules and power"], ["so_live", "living together"]] },
  ethics: { grp: "et", lenses: [["et_ask", "ways to ask"], ["et_care", "what we owe"]] },
  technology: { grp: "te", lenses: [["te_make", "making"], ["te_new", "thinking machines"]] },
  religions: { grp: "re", lenses: [["re_trad", "traditions"], ["re_prac", "practice and doubt"]] },
  cultures: { grp: "cu", lenses: [["cu_way", "ways of living"], ["cu_meet", "meeting and keeping"]] },
  art: { grp: "ar", lenses: [["ar_make", "making"], ["ar_see", "seeing"]] },
};
const order = Object.keys(TOPICS);
const groups = [];
order.forEach((id, i) => {
  const t = TOPICS[id], a = Math.round(((i * 360) / order.length + 12) * 10) / 10;
  t.angle = a;
  groups.push({ id: t.grp, name: "", angle: a, radius: OUT });
  t.lenses.forEach(([lid, name], j) => groups.push({ id: lid, name, angle: Math.round((a + (j ? 9 : -9)) * 10) / 10, radius: LENS }));
});

const S = [];
const add = (id, grp, label, body, sources, size = 2, verify = false) => S.push({ id, grp, kind: "f", size, label, title: label, body: p(body, verify), sources });
const top = (id, label, body, sources) => add(id, TOPICS[id].grp, label, body, sources, 4);

// ---------------- Mind ----------------
add("mi_conscious", "mi_aw", "Consciousness", "There is something it is like to see red or feel a pain. How that comes from a brain, or whether it does, is open. People who study it do not agree on what would count as an answer.", [SEP("Consciousness", "consciousness"), W("Consciousness", "Consciousness")]);
add("mi_hard", "mi_aw", "The hard problem", "Chalmers (1995) separated the easier questions about how the brain processes information from the harder one of why any of it is felt. Some think the question is real and deep. Others think it will dissolve as the easier ones are answered.", [W("Hard problem of consciousness", "Hard_problem_of_consciousness")]);
add("mi_self", "mi_aw", "The self", "Each of us feels like one thing that lasts through the years. Philosophers ask what makes you the same person as the child in an old photograph, and some traditions, among them Buddhist ones, hold that no fixed self is there to find.", [SEP("Personal Identity", "identity-personal"), W("Self (philosophy)", "Self_(philosophy)")]);
add("mi_other", "mi_aw", "Other minds", "You never feel anyone else’s experience, and you still take them to have it. The usual support is that others look and act like you. The same question comes up again for animals and machines.", [SEP("Other Minds", "other-minds")]);
add("mi_memory", "mi_aw", "Memory", "Remembering is a rebuilding. Each time a memory is called up it is put together again, which is why vivid memories can be wrong and why a shared past is so often told differently by the people who were there.", [W("Memory", "Memory"), W("Reconstructive memory", "Reconstructive_memory")]);
add("mi_agency", "mi_ch", "Agency", "The sense of agency is the feeling that you are the one causing what happens. It can be measured, and it can go missing or appear where it should not, which makes it a good place to study how choosing feels from the inside.", [W("Sense of agency", "Sense_of_agency")]);
add("mi_free", "mi_ch", "Free will", "If the world follows laws, in what sense could you have done otherwise? Some say free will is false. Some say it is compatible with the laws. Some say it needs something the laws leave open. These views are all held by careful people.", [SEP("Free Will", "freewill")]);
add("mi_attention", "mi_ch", "Attention", "Attention picks a small part of what reaches you and lets the rest fade. It is partly something you do and partly something done to you by a loud noise or a bright thing.", [W("Attention", "Attention")]);
add("mi_flow", "mi_ch", "Flow", "Some activities absorb a person so fully that the sense of time and of self recede. Csikszentmihalyi (1990) called this flow and studied it in athletes, artists and surgeons.", [W("Flow (psychology)", "Flow_(psychology)")]);
top("mind", "Mind", "A way into the mind through what it is like to be aware and what it is to choose. Gödel’s arguments about mind and machine sit next to these questions.", [W("Philosophy of mind", "Philosophy_of_mind")]);

// ---------------- Language ----------------
add("la_origin", "la_us", "Where language began", "Nobody knows how or when speech began, because it leaves no fossils. Proposals range from gesture to song to tool making, and the question is studied by linguists, archaeologists and biologists together.", [W("Origin of language", "Origin_of_language")]);
add("la_families", "la_us", "Language families", "Languages that share a common ancestor form a family. Comparing words and sounds across Europe and India led to Indo-European, and similar work has grouped many of the world’s languages.", [W("Language family", "Language_family")]);
add("la_signed", "la_us", "Sign languages", "Sign languages are full languages with their own grammar, and they arise wherever deaf people gather. Nicaraguan Sign Language was born in a school in the 1970s and 80s and is one of the few cases of a new language seen from its beginning.", [W("Sign language", "Sign_language"), W("Nicaraguan Sign Language", "Nicaraguan_Sign_Language")]);
add("la_dying", "la_us", "Languages at risk", "Thousands of languages are spoken by small communities, and many are no longer passed to children. Each one holds a way of naming the world, and communities, linguists and schools work to record and revive them.", [W("Language death", "Language_death"), W("Language revitalization", "Language_revitalization")]);
add("la_grammar", "la_us", "Grammar", "Every language has patterns that speakers follow without being taught the rules. Some linguists look for what all grammars share. Others look at how much they differ.", [W("Universal grammar", "Universal_grammar"), W("Linguistic typology", "Linguistic_typology")]);
add("la_meaning", "la_mean", "Meaning", "What makes a sound or mark mean something? Answers include what the speaker intends, how the word is used, and what it points to in the world. Each fits some cases better than others.", [SEP("Meaning", "meaning"), W("Semantics", "Semantics")]);
add("la_translation", "la_mean", "Translation", "No two languages cut the world in the same places, so translating means choosing what to keep. A good translator weighs sound, sense and tone, and two good translations of one poem can differ a lot.", [W("Translation", "Translation")]);
add("la_whorf", "la_mean", "Does language shape thought?", "The Sapir-Whorf idea says the language you speak steers how you think. Some experiments, for example with color words and with ways of describing direction, find small effects. Others find none. The strong version is widely doubted.", [W("Linguistic relativity", "Linguistic_relativity")]);
add("la_metaphor", "la_mean", "Metaphor", "We talk about time as money and arguments as war, and the talk shapes what we notice. Lakoff and Johnson (1980) argued that metaphor is a main way people think about abstract things.", [W("Conceptual metaphor", "Conceptual_metaphor")]);
add("la_names", "la_mean", "Names", "A name points at one person, place or thing. How it manages that, and what happens when the thing changes, was a long argument in the twentieth century, with Kripke (1972) as a main voice.", [SEP("Names", "names")], 2, true);
top("language", "Language", "A way into language through how it is spoken and passed on, and through what words do. Writing sits with History, and Gödel’s trick is a story of a language that learned to talk about itself.", [W("Language", "Language")]);

// ---------------- Stories ----------------
add("st_why", "st_tell", "Why we tell stories", "People in every known society tell stories. They carry memory, teach, entertain and bind a group. Some researchers think the habit helps us rehearse situations before we meet them.", [W("Storytelling", "Storytelling"), W("Narrative", "Narrative")]);
add("st_novel", "st_tell", "The novel", "The novel took the stories people told for each other and gave them the length to follow one inner life. Don Quixote (1605), The Tale of Genji (about 1000) and many others show the form arriving in different places at different times.", [W("Novel", "Novel"), W("The Tale of Genji", "The_Tale_of_Genji")]);
add("st_poetry", "st_tell", "Poetry", "Poetry packs sound, rhythm and image into few words. Many poems began as songs, and in many cultures the first literature in a language is verse.", [W("Poetry", "Poetry")]);
add("st_drama", "st_tell", "Plays and performance", "A story acted in front of people is told in a different way from one read alone. Greek tragedy, Sanskrit drama, Noh and the Yoruba masquerade each grew from their own occasions and audiences.", [W("Theatre", "Theatre")]);
add("st_literature", "st_tell", "Literature", "Literature is the writing a community keeps and rereads. Which writing is kept, in which languages, and by whom decided, is an old question and the center of the idea of a canon.", [W("Literature", "Literature"), W("Literary canon", "Literary_canon")]);
add("st_folk", "st_old", "Folktales", "Tales passed from person to person turn up in forms that resemble each other across many places. Collectors such as the brothers Grimm, and later the Aarne-Thompson-Uther index, gathered them and sorted them into types.", [W("Folklore", "Folklore"), W("Aarne–Thompson–Uther Index", "Aarne%E2%80%93Thompson%E2%80%93Uther_Index")]);
add("st_epic", "st_old", "Epics", "Gilgamesh, the Iliad and the Odyssey, the Mahabharata and the Ramayana, Sundiata, the Kalevala and the Epic of Manas are long poems that peoples keep as part of their story of who they are.", [W("Epic poetry", "Epic_poetry")]);
add("st_origin", "st_old", "Origin stories", "Peoples everywhere have told how the world and the first people came to be, and these stories differ widely. The Rigveda asks whether even the gods knew, the Popol Vuh tells of Maya creators who tried more than once, and Aboriginal Australian peoples speak of ancestors who made the land while traveling. Each is told by its own people in its own terms, and each can be read next to the others without ranking.", [W("Creation myth", "Creation_myth"), W("Popol Vuh", "Popol_Vuh")], 2, true);
add("st_flood", "st_old", "Stories of a great flood", "A flood that reshapes the world appears in the stories of Mesopotamia, in the Hebrew Bible, in India, in Greece, in Mesoamerica and in many other places. Some scholars study how the accounts relate to each other and to real floods, and communities that hold them keep their own readings.", [W("Flood myth", "Flood_myth")], 2, true);
add("st_trickster", "st_old", "Tricksters", "Anansi in West Africa and the Caribbean, Coyote in many North American traditions, Loki in the Norse tales and Hermes in Greece are figures who break rules and make mischief, and through that show where the rules are.", [W("Trickster", "Trickster")]);
add("st_study", "st_old", "Reading traditional stories", "Scholars have read traditional stories as early science, as charters for a way of life, as structures of the mind and as art. For the communities who tell them they are often sacred or true in their own way, and a respectful reading keeps both in view.", [W("Mythology", "Mythology"), W("Folkloristics", "Folkloristics")], 2, true);
top("stories", "Stories and literature", "A way into stories through how they are told and written, and through the ones that peoples have kept for ages. Religions and Cultures hold some of the same stories from the inside.", [W("Narrative", "Narrative")]);

// ---------------- Life ----------------
add("li_cell", "li_how", "The cell", "Every living thing is made of cells, from one to many trillions. The cell is a small crowded world with walls, machinery and a copy of its own instructions.", [W("Cell (biology)", "Cell_(biology)")]);
add("li_dna", "li_how", "DNA and heredity", "Parents pass instructions to their young in a long chain of four letters. After Watson, Crick, Franklin and others found its shape (1953), reading and copying it became possible.", [W("DNA", "DNA"), W("Heredity", "Heredity")]);
add("li_evolution", "li_how", "Evolution", "Darwin and Wallace (1858, 1859) described how small differences, passed on, and a world where not all can survive lead to the variety of life. It joins the fossils, the genes and the living world in one account.", [W("Evolution", "Evolution"), W("Natural selection", "Natural_selection")]);
add("li_ecology", "li_where", "Ecosystems", "A forest, a reef or a pond is a set of living things and the stuff they trade: food, water, carbon, shelter. Take one part away and others change.", [W("Ecosystem", "Ecosystem")]);
add("li_symbiosis", "li_where", "Living together", "Lichens are fungi and algae in one body. Gut bacteria help digest food. Mitochondria in our cells began as separate living things, as Margulis argued in the 1960s. Cooperation runs deep in the history of life.", [W("Symbiosis", "Symbiosis"), W("Endosymbiont", "Endosymbiont")]);
add("li_origin", "li_where", "How life began", "Somewhere on the early Earth chemistry turned into living cells. How exactly, nobody has shown. Warm pools, deep sea vents and clay surfaces are among the places researchers look.", [W("Abiogenesis", "Abiogenesis")]);
add("li_death", "li_where", "Aging and death", "Living things wear, and most die. Biologists ask why aging evolved, and cultures ask what to do with the dead. Both questions are old.", [W("Ageing", "Ageing")]);
add("li_extinct", "li_where", "Extinction", "Most species that ever lived are gone. There have been five great die-offs in the fossil record, and scientists are asking whether human activity has started another.", [W("Extinction event", "Extinction_event")]);
top("life", "Life", "A way into life through how it works inside a cell and how it plays out across a planet. Mind sits at the far end of the same story.", [W("Life", "Life")]);

// ---------------- Earth ----------------
add("ea_plates", "ea_now", "Plate tectonics", "The surface of the Earth is made of plates that move a few centimeters a year. They explain mountains, earthquakes and why the same fossils turn up on coasts now far apart. Wegener proposed drifting continents in 1912 and the idea was accepted decades later.", [W("Plate tectonics", "Plate_tectonics")]);
add("ea_water", "ea_now", "Water", "Water covers most of the planet and moves through oceans, air, ice, rivers and living bodies. It shapes where people settle and what they fight over.", [W("Water cycle", "Water_cycle")]);
add("ea_climate", "ea_now", "Climate", "Climate is the long pattern of weather. Measurements show the planet warming since the nineteenth century because of greenhouse gases from human activity, and the choices about what to do belong to people and their societies.", [W("Climate change", "Climate_change"), W("Climate", "Climate")]);
add("ea_ocean", "ea_now", "The ocean", "The ocean holds most of the planet’s water and most of its living space, and a large part of it has never been seen. It stores heat and carries it around the globe.", [W("Ocean", "Ocean")]);
add("ea_deep", "ea_long", "Deep time", "The Earth is about 4.5 billion years old. Layers of rock, read like pages, gave people a way to feel the age. James Hutton and later geologists made it a measurable thing.", [W("Geologic time scale", "Geologic_time_scale"), W("Deep time", "Deep_time")]);
add("ea_cycles", "ea_long", "Cycles of matter", "Carbon, nitrogen and other elements move between rock, air, water and living things. A small shift in one cycle, such as the carbon one, can matter on every scale.", [W("Carbon cycle", "Carbon_cycle"), W("Biogeochemical cycle", "Biogeochemical_cycle")]);
add("ea_ice", "ea_long", "Ice ages", "For the last two and a half million years the planet has moved between long cold periods and warm ones, paced in part by slow changes in its orbit and tilt.", [W("Ice age", "Ice_age"), W("Milankovitch cycles", "Milankovitch_cycles")]);
add("ea_anthro", "ea_long", "The age of people", "Some scientists propose naming a new time in Earth’s history, the Anthropocene, for the mark that humans leave. Others, including the body that sets the official time scale, have declined to adopt it, and some prefer other names or argue that the label hides who is responsible.", [W("Anthropocene", "Anthropocene")]);
top("earth", "Earth", "A way into the planet through its present and its long changes. The sky’s story under Astronomy and the story of living things under Life both stand on it.", [W("Earth", "Earth")]);

// ---------------- Society ----------------
add("so_state", "so_rules", "The state", "A state claims the right to make rules over a territory. How it gets that right, and what limits it, is what political philosophers from Hobbes to Locke to Confucian thinkers argued about in different ways.", [W("State (polity)", "State_(polity)"), SEP("Political Philosophy", "political-philosophy")]);
add("so_law", "so_rules", "Law", "Law is a set of rules a community backs with force and, at its best, with reasons. People ask whether a rule that is unjust is still law, and traditions answer differently.", [W("Law", "Law"), SEP("Philosophy of Law", "law-philosophy")]);
add("so_power", "so_rules", "Power", "Power is the ability to make others act. It can rest on force, on money, on the consent of those ruled or on the stories a society tells itself. Gödel’s worry about a rule set that can be bent from inside belongs here.", [W("Power (social and political)", "Power_(social_and_political)")]);
add("so_democracy", "so_rules", "Voting and democracy", "Democracy began in forms such as Athenian assemblies and many village councils around the world. Modern versions use elections and courts, and each design trades something away: speed, fairness, protection for minorities.", [W("Democracy", "Democracy")]);
add("so_trade", "so_live", "Exchange", "People have traded since long before money. Markets, gifts and sharing within a family are different ways to pass things between people, and every society mixes them in its own way.", [W("Trade", "Trade"), W("Gift economy", "Gift_economy")]);
add("so_trust", "so_live", "Trust and cooperation", "Groups work when people can count on each other. Trust is built through repeated dealings, shared norms and institutions that make cheating costly. It breaks faster than it builds.", [W("Trust (social science)", "Trust_(social_science)"), W("Cooperation", "Cooperation")]);
add("so_commons", "so_live", "The commons", "Some things belong to everyone: a pasture, a fishery, a language, an internet. Hardin warned in 1968 that shared things get overused. Ostrom showed in her work that many communities have governed a commons well for centuries, and shared the 2009 economics prize for it.", [W("Commons", "Commons"), W("Elinor Ostrom", "Elinor_Ostrom")]);
add("so_city", "so_live", "Cities", "Cities put more people together than any village could. They grew along rivers and trade routes and became places where ideas, goods and diseases pass quickly.", [W("City", "City"), W("Urbanization", "Urbanization")]);
add("so_inequality", "so_live", "Fairness between people", "Societies differ in how they share what they produce. People disagree about what is fair: equal shares, shares by effort, shares by need. The views sit side by side in the study of justice.", [W("Distributive justice", "Distributive_justice")]);
top("society", "Society", "A way into society through how rules and power work and how people live together. Gödel’s ideas about systems and their outside meet this topic in a few places.", [W("Society", "Society")]);

// ---------------- Ethics and meaning ----------------
add("et_good", "et_ask", "What is good?", "Ethics asks what makes an act right or a life good. It is among the oldest questions and every culture has its own answers, often tied to its stories and its traditions.", [SEP("Ethics", "ethics-virtue"), W("Ethics", "Ethics")]);
add("et_three", "et_ask", "Three ways to ask", "One way looks at outcomes and asks what does the most good. One looks at duties and asks what rules we must keep. One looks at character and asks what a good person would do. Each catches something the other two miss.", [SEP("Consequentialism", "consequentialism"), SEP("Virtue Ethics", "ethics-virtue")]);
add("et_relativism", "et_ask", "Do values differ?", "Moral codes differ across places and times. Some conclude that no view is better than another. Others say that some values, such as care for children, are shared widely, and that argument across differences is possible. The question is still open.", [SEP("Moral Relativism", "moral-relativism")]);
add("et_justice", "et_ask", "Justice", "Justice asks what people are owed. Plato, Aristotle, Confucius and Rawls (1971) each gave an account, and the accounts disagree about whether it is about fair shares, fair process or a harmony of the whole.", [SEP("Justice", "justice"), W("Justice", "Justice")]);
add("et_rights", "et_care", "Rights", "A right is a claim a person holds that others must respect. The Universal Declaration of Human Rights (1948) set out a list that many states signed. People still ask where rights come from and which ones count.", [W("Human rights", "Human_rights"), W("Universal Declaration of Human Rights", "Universal_Declaration_of_Human_Rights")]);
add("et_animals", "et_care", "Animals", "Do we owe something to animals, and how much? Views range from care for each animal’s welfare to respect for their lives as such, and traditions around the world have rules about hunting, farming and kinship with other species.", [SEP("The Moral Status of Animals", "moral-animal"), W("Animal rights", "Animal_rights")]);
add("et_future", "et_care", "People not yet born", "What do we owe those who come after us? Decisions about the climate, nuclear waste and new technology bind people who cannot take part. Several Indigenous traditions speak of thinking seven generations ahead.", [W("Seven generations", "Seven_generations_sustainability"), SEP("Intergenerational Justice", "justice-intergenerational")], 2, true);
add("et_meaning", "et_care", "Meaning in life", "People have answered what makes a life meaningful in many ways: serving a god, loving others, making something that lasts, understanding the world, or accepting that nothing is given and making it up. These stand side by side here.", [SEP("The Meaning of Life", "life-meaning"), W("Meaning of life", "Meaning_of_life")]);
top("ethics", "Ethics and meaning", "A way into ethics through how to ask what is good and what we owe each other. Religions and Cultures give many of their own answers.", [W("Ethics", "Ethics")]);

// ---------------- Technology ----------------
add("te_tools", "te_make", "Tools", "Stone tools are at least 3 million years old, older than our species. Making them required planning and passing skill from person to person, and tools changed those who used them.", [W("Stone tool", "Stone_tool"), W("Tool", "Tool")]);
add("te_fire", "te_make", "Fire and cooking", "Controlled fire gave warmth, light and cooked food. When it began is debated, with evidence of use going back at least hundreds of thousands of years.", [W("Control of fire by early humans", "Control_of_fire_by_early_humans")]);
add("te_print", "te_make", "Printing", "Printing with movable type appeared in China and Korea, and Gutenberg’s press in Europe (about 1450) made books cheap. Ideas then traveled faster than the people who held them.", [W("Printing press", "Printing_press"), W("Movable type", "Movable_type")]);
add("te_energy", "te_make", "Energy", "Human societies run on energy: muscle, wood, water, coal, oil, sun and wind. Each new source has changed what people could build and where they could live.", [W("Energy development", "Energy_development"), W("History of energy", "History_of_energy")]);
add("te_computers", "te_new", "Computers", "A computer carries out recipes. Turing and others made precise what that can mean, and the same limits that Gödel found show up in what programs can decide.", [W("Computer", "Computer"), W("Alan Turing", "Alan_Turing")]);
add("te_net", "te_new", "The internet", "A network of networks joined in the late twentieth century. It made it possible to reach nearly any written thing from nearly anywhere, and also to be reached.", [W("Internet", "Internet")]);
add("te_ai", "te_new", "Artificial intelligence", "Programs now write, draw, translate and play. Whether they understand anything, whether they could be conscious and how to keep them safe are open questions, and Gödel’s results are often cited in the debate.", [SEP("Artificial Intelligence", "artificial-intelligence"), W("Artificial intelligence", "Artificial_intelligence")]);
add("te_safety", "te_new", "Making things safe", "Bridges, aircraft and medicines are tested and made to fail gently. The same idea of building the check into the system is now applied to software that learns.", [W("Safety engineering", "Safety_engineering"), W("AI safety", "AI_safety")]);
add("te_dual", "te_new", "Who decides?", "Tools serve whoever holds them. Questions about who builds new technology, who controls it and who bears its harm belong to ethics and society as much as to engineering.", [SEP("Philosophy of Technology", "technology")]);
top("technology", "Technology", "A way into technology through how things are made and how thinking machines arrived. Math and Time sit underneath it.", [W("Technology", "Technology")]);

// ---------------- Art ----------------
add("ar_why", "ar_make", "Why make art?", "The oldest known cave paintings are tens of thousands of years old. Across the world people have made images, songs and ornaments for ritual, memory, beauty, play and to say what words could not.", [W("Art", "Art"), W("Cave painting", "Cave_painting")]);
add("ar_craft", "ar_make", "Craft", "Weaving, pottery, carving and metalwork are skills handed down over generations. Many cultures do not separate craft and art, and a well made cup can be both.", [W("Craft", "Craft"), W("Textile arts", "Textile_arts")]);
add("ar_dance", "ar_make", "Dance", "Dance shapes time and space with the body. It is part of rituals, courtship and celebration in nearly every society.", [W("Dance", "Dance")]);
add("ar_film", "ar_make", "Film", "Moving images turned a century ago into a main way stories are told. Montage, the joining of shots, gave cinema its own grammar.", [W("Film", "Film")]);
add("ar_arch", "ar_make", "Architecture", "Buildings shelter and also say something: about power, belief, community. The same need produces a tent, a temple and a tower in different places.", [W("Architecture", "Architecture")]);
add("ar_beauty", "ar_see", "Beauty", "People call things beautiful across every culture and disagree about what that means. Some say beauty lies in the thing, some in the eye, some in a shared practice of looking.", [SEP("Beauty", "beauty"), W("Aesthetics", "Aesthetics")]);
add("ar_perspective", "ar_see", "Perspective", "Renaissance painters in Italy worked out how to draw depth with geometry, and the method spread. Other traditions, such as Chinese scroll painting and Mughal miniatures, solve the same problem with different tools.", [W("Perspective (graphical)", "Perspective_(graphical)")]);
add("ar_color", "ar_see", "Color", "Color is made in the eye and brain from light of different wavelengths. Peoples name colors in different numbers of groups, and pigments have their own history of trade and discovery.", [W("Color", "Color"), W("Color term", "Color_term")]);
add("ar_copy", "ar_see", "Copying and owning", "Artists have always learned by copying. Laws on who owns a picture, a song or an idea changed with printing and again with the internet, and there are still conflicting views on where to draw the line.", [W("Copyright", "Copyright")]);
top("art", "Art", "A way into art through making and through seeing. Music has its own topic and shares many of the same questions.", [W("Art", "Art")]);

// ---------------- Religions ----------------
// Each tradition has its own idea. They are described as their followers describe them, and none is ranked.
add("re_many", "re_trad", "Many traditions", "Most people alive belong to a religious tradition, and the traditions differ a great deal in what they hold, how they gather and what they ask of a person. A fair account describes each one as its followers would, and lets readers compare without ranking.", [W("Religion", "Religion"), W("List of religions and spiritual traditions", "List_of_religions_and_spiritual_traditions")]);
add("re_hindu", "re_trad", "Hinduism", "Hinduism is a family of traditions from the Indian subcontinent with many gods, many paths and a large body of texts, among them the Vedas, the Upanishads and the Bhagavad Gita. Many Hindus hold ideas of dharma, karma, rebirth and liberation (moksha), and they differ on how these are understood.", [W("Hinduism", "Hinduism")]);
add("re_buddh", "re_trad", "Buddhism", "Buddhism began with the teaching of the Buddha in northern India about 2,500 years ago. It holds that suffering has a cause and an end and describes a path to it. It has several schools, Theravada, Mahayana and Vajrayana among them, and ways of practice from silent sitting to chanting.", [W("Buddhism", "Buddhism")]);
add("re_jew", "re_trad", "Judaism", "Judaism holds a covenant between God and the people of Israel, with the Torah at its center and a long tradition of study and commentary. Observance and belief vary among Orthodox, Conservative, Reform and other communities, and among secular Jews who keep the culture.", [W("Judaism", "Judaism")]);
add("re_christ", "re_trad", "Christianity", "Christianity centers on the life, death and resurrection of Jesus of Nazareth as the New Testament tells it. It includes Catholic, Orthodox and Protestant churches and many others, which differ in worship, authority and teaching.", [W("Christianity", "Christianity")]);
add("re_islam", "re_trad", "Islam", "Muslims hold that God revealed the Quran to the prophet Muhammad in the seventh century. Five pillars shape practice: the declaration of faith, prayer, charity, fasting in Ramadan and pilgrimage to Mecca. The main branches are Sunni and Shia, and Sufi paths run through both.", [W("Islam", "Islam")]);
add("re_sikh", "re_trad", "Sikhism", "Sikhism began in the Punjab with Guru Nanak and nine Gurus after him. It teaches one God, honest work, sharing with others and service. The Guru Granth Sahib is its scripture and is treated as the living guide.", [W("Sikhism", "Sikhism")]);
add("re_dao", "re_trad", "Daoism", "Daoism draws on the Dao De Jing, attributed to Laozi, and the Zhuangzi, which speak of following the way of the world. It grew into a tradition with temples, priests, meditation and ritual, and it shaped Chinese life with Buddhism and Confucian thought.", [W("Taoism", "Taoism")]);
add("re_confu", "re_trad", "Confucian tradition", "Confucius (551 to 479 BCE) taught virtue, family duty and learning, and later thinkers built a tradition on it that shaped East Asian states and homes. Whether it is a religion, an ethic or both is debated, and its followers answer differently.", [W("Confucianism", "Confucianism")], 2, true);
add("re_jain", "re_trad", "Jainism", "Jainism teaches non-violence (ahimsa) toward all living things and holds that each soul can free itself by its own effort. Its line of teachers includes Mahavira, who lived in India about the same time as the Buddha.", [W("Jainism", "Jainism")], 2, true);
add("re_shinto", "re_trad", "Shinto", "Shinto is the Japanese tradition of kami, the spirits present in places, ancestors and natural things. Its shrines, festivals and rites of purity are part of everyday and seasonal life in Japan.", [W("Shinto", "Shinto")]);
add("re_bahai", "re_trad", "Baháʼí Faith", "The Baháʼí Faith began in nineteenth century Persia with Baháʼu’lláh. Its followers hold the unity of God, of religion and of humanity, and they gather in many countries.", [W("Baháʼí Faith", "Bah%C3%A1%CA%BC%C3%AD_Faith")], 2, true);
add("re_indig", "re_trad", "Indigenous spiritual traditions", "Indigenous peoples hold many different spiritual traditions, each tied to a land, a language and a community. Many speak of the land, the sky, animals and ancestors as relatives. These traditions speak for themselves, and the Cultures topic holds more about how peoples see the cosmos.", [W("Indigenous religions", "Indigenous_religion")], 2, true);
add("re_text", "re_prac", "Sacred texts", "The Vedas, the Hebrew Bible, the New Testament, the Quran, the Pali Canon and the Guru Granth Sahib are texts that communities treat as sacred. Many traditions also hold teachings that were passed on by mouth for a long time before and after writing.", [W("Religious text", "Religious_text")]);
add("re_ritual", "re_prac", "Ritual and prayer", "Prayer, song, fasting, offerings and silence are ways that people in nearly every tradition mark what matters to them. Rituals also hold communities together through births, marriages and deaths.", [W("Ritual", "Ritual"), W("Prayer", "Prayer")]);
add("re_pilgrim", "re_prac", "Pilgrimage", "Millions travel each year to places they hold holy: Mecca, Varanasi, Bodh Gaya, Jerusalem, Amritsar, the Camino to Santiago, Ise. The journey itself is part of the practice.", [W("Pilgrimage", "Pilgrimage")]);
add("re_mystic", "re_prac", "Mystical experience", "People in many traditions describe moments of direct experience of something beyond the ordinary. William James (1902) gathered accounts, and researchers and believers read them in different ways.", [W("Mysticism", "Mysticism"), W("The Varieties of Religious Experience", "The_Varieties_of_Religious_Experience")]);
add("re_science", "re_prac", "Religion and science", "Some people see conflict between them, some see separate questions that need not meet, and some see dialogue or support. Each view has careful defenders on both the religious and the scientific side.", [SEP("Religion and Science", "religion-science")]);
add("re_nonrel", "re_prac", "Living without religion", "Many people hold no religion, among them atheists, agnostics, humanists and those who are unsure. They live by their own sources of meaning, and many value what religious traditions pass on.", [W("Irreligion", "Irreligion"), W("Humanism", "Humanism")]);
add("re_freedom", "re_prac", "Freedom of belief", "Article 18 of the Universal Declaration of Human Rights (1948) sets out the right to hold a belief, to change it and to practice it with others. How far it reaches is argued in many countries.", [W("Freedom of religion", "Freedom_of_religion")]);
add("re_dialogue", "re_prac", "Dialogue between traditions", "People of different traditions meet to learn, to work together and to disagree with respect. Some of it is formal, as in interfaith councils. Much of it happens in neighborhoods.", [W("Interfaith dialogue", "Interfaith_dialogue")]);
top("religions", "Religions", "A way into the world’s religions and spiritual paths, each in its own words and none ranked. People who hold a tradition are invited to improve what is written about it. Where views differ they sit side by side.", [W("Religion", "Religion")]);

// ---------------- Cultures ----------------
add("cu_def", "cu_way", "What a culture is", "A culture is the shared ways of a people: language, customs, beliefs, tools, food and stories. Cultures change as people meet and as generations pass, and no person belongs to only one.", [W("Culture", "Culture"), W("Cultural anthropology", "Cultural_anthropology")]);
add("cu_kin", "cu_way", "Kinship and family", "Who counts as family, whom one may marry and what relatives owe each other differ widely. Anthropologists found that kinship is organized in a few main patterns but filled in very differently.", [W("Kinship", "Kinship")]);
add("cu_food", "cu_way", "Food and feasting", "What people eat, with whom and on what occasion carries meaning. Feasts mark weddings, harvests, mourning and welcome, and recipes travel with people.", [W("Food and culture", "Cuisine"), W("Feast", "Feast")]);
add("cu_rites", "cu_way", "Rites of passage", "Van Gennep (1909) noted that societies mark changes in a life, such as birth, adulthood, marriage and death, with rites that separate, transform and reunite a person with the group.", [W("Rite of passage", "Rite_of_passage")]);
add("cu_cosmo", "cu_way", "Cosmovisions", "A cosmovision is the way a people sees the order of the world: land, sky, time, other beings and the place of people among them. Andean, Aboriginal Australian, Māori and many other peoples each hold their own, and they are best learned from the people who live them.", [W("Worldview", "Worldview"), W("Cosmology (religion)", "Religious_cosmology")], 2, true);
add("cu_indknow", "cu_way", "Indigenous knowledge", "Peoples who have lived in a place for generations hold detailed knowledge of its plants, animals, weather and seasons. Examples include fire management in Australia, wayfinding across the Pacific without instruments and terraced farming in the Andes. Scientists increasingly work with it as equal knowledge.", [W("Indigenous knowledge", "Traditional_knowledge"), W("Traditional ecological knowledge", "Traditional_ecological_knowledge")]);
add("cu_music", "cu_way", "Music of many peoples", "Every culture has music, and each tunes, counts and gathers around it in its own way. The Music topic has gamelan, raga, maqam and drumming from Africa and the Andes among its ideas.", [W("Ethnomusicology", "Ethnomusicology")]);
add("cu_exchange", "cu_meet", "Contact and exchange", "Peoples have always traded goods, words and ideas. The Silk Road, the Indian Ocean routes and the Atlantic crossings carried spices, crops, religions and numbers, and also disease and conquest.", [W("Silk Road", "Silk_Road"), W("Cultural diffusion", "Cultural_diffusion")]);
add("cu_diaspora", "cu_meet", "Migration and diaspora", "People move for work, for safety and for love. Communities spread across the world keep ties to a homeland and build new ones where they live.", [W("Diaspora", "Diaspora"), W("Human migration", "Human_migration")]);
add("cu_colonial", "cu_meet", "Colonial history", "Many peoples lived under colonial rule that redrew borders, moved populations and suppressed languages and beliefs. Many communities now teach their own history, revive their languages and ask for the return of what was taken.", [W("Colonialism", "Colonialism"), W("Decolonization", "Decolonization")]);
add("cu_heritage", "cu_meet", "Heritage and return", "Museums and archives hold objects and records from many peoples. UNESCO lists places and living practices as heritage, and communities and museums negotiate over who should keep what and in what way.", [W("Cultural heritage", "Cultural_heritage"), W("Repatriation of cultural heritage", "Cultural_repatriation")]);
add("cu_understand", "cu_meet", "Understanding on its own terms", "Anthropologists learned to describe a way of life as its members do, before judging it. Some then argued that no culture can be judged from outside. Others say some judgments hold across cultures. Both views have careful defenders.", [W("Cultural relativism", "Cultural_relativism")]);
add("cu_lang", "cu_meet", "Language and belonging", "A language carries songs, jokes, names for places and ways to address elders. People who lose their language often lose a way of belonging with it, and many communities now teach it to children again.", [W("Language and identity", "Language_and_identity")]);
top("cultures", "Cultures", "A way into cultures through how people live and how they meet and keep what they hold. Each people speaks for itself, and no way of living is a standard for the others.", [W("Culture", "Culture")]);

// ---------------- Links ----------------
const L = [];
const seenL = new Set();
const link = (a, b, ab = null, ba = null) => { const k = a < b ? a + "|" + b : b + "|" + a; if (seenL.has(k)) return; seenL.add(k); L.push([a, b, ab, ba]); };
const HUB_AB = "One idea among many. The map is where it meets the others.";
const hubBA = { mind: "a way of being aware and choosing", language: "a way of saying and meaning", stories: "a way of telling", life: "a way of living things", earth: "a way of the planet", society: "a way of living together", ethics: "a way of asking what is good", technology: "a way of making", religions: "a way of faith and practice", cultures: "a way of living, as each people lives it", art: "a way of making and seeing" };
for (const [t, d] of Object.entries(hubBA)) link(t, "hub", HUB_AB, "Where the map begins: " + d + ".");

for (const [t, ids] of Object.entries({
  mind: ["mi_conscious", "mi_self", "mi_free", "mi_memory"],
  language: ["la_origin", "la_meaning", "la_translation", "la_dying"],
  stories: ["st_why", "st_folk", "st_epic", "st_origin"],
  life: ["li_cell", "li_evolution", "li_origin", "li_ecology"],
  earth: ["ea_plates", "ea_climate", "ea_deep", "ea_water"],
  society: ["so_state", "so_trust", "so_commons", "so_power"],
  ethics: ["et_good", "et_three", "et_justice", "et_meaning"],
  technology: ["te_tools", "te_print", "te_computers", "te_ai"],
  religions: ["re_many", "re_text", "re_ritual", "re_dialogue"],
  cultures: ["cu_def", "cu_cosmo", "cu_indknow", "cu_exchange"],
  art: ["ar_why", "ar_beauty", "ar_craft", "ar_perspective"],
})) for (const id of ids) link(t, id);

// across topics
link("mind", "godel", "Whether a mind can be captured by rules is where Gödel’s results get cited.", "A question Gödel himself asked about mind and machine.");
link("mind", "life", "Minds arrived late in the story of living things.", "Where awareness grows from.");
link("mind", "language", "Thinking out loud, and thinking in words.", "What a mind uses to share what it holds.");
link("mind", "ethics", "Choosing and what we owe.", "Who can be wronged depends on who can feel.");
link("language", "history", "Writing turned speech into records.", "How speech was kept.");
link("language", "stories", "Stories are what language is often used for.", "Told in words.");
link("language", "cultures", "Each language carries a way of living.", "Spoken in many ways of life.");
link("language", "music", "Speech and song share rhythm and pitch.", "A kind of speech without words.");
link("language", "math", "A language of exact statements.", "A language that learned to speak about itself, in Gödel’s hands.");
link("stories", "history", "Many pasts are kept as tales.", "What the tales and the records hold.");
link("stories", "religions", "Sacred stories are told inside traditions.", "Stories that a community keeps as its own.");
link("stories", "cultures", "A way a people tells who it is.", "What a people hands down in tales.");
link("stories", "art", "A story is a work of art.", "Stories in image, sound and word.");
link("life", "earth", "Life is shaped by the planet and shapes it.", "The ground and air living things stand on.");
link("life", "astronomy", "Where else might life be?", "Where the atoms of life were made.");
link("life", "ethics", "What do we owe the other living things?", "The living world we are part of.");
link("earth", "astronomy", "A planet among planets.", "The one planet we can study up close.");
link("earth", "time", "Layers of rock as a clock.", "The slowest clocks.");
link("earth", "society", "Climate and water set the terms for how people live together.", "Societies change the planet.");
link("earth", "history", "The record before records.", "Where human history has taken place.");
link("society", "history", "Where and how people lived together.", "The story of how rules arose.");
link("society", "ethics", "What the rules owe to what is right.", "Where ideas of right become rules.");
link("society", "technology", "Tools change who has power.", "Who tools serve and who decides.");
link("society", "godel", "Systems that can be bent from inside.", "Where Gödel’s worry about a constitution lives.");
link("society", "cultures", "Ways of living together differ.", "The rules each people gives itself.");
link("ethics", "religions", "Every tradition has an ethic.", "How traditions answer what is good.");
link("ethics", "cultures", "Moral life as each people lives it.", "Where values are lived.");
link("ethics", "technology", "Who should build what?", "New tools raise old questions.");
link("technology", "math", "Recipes a machine can follow.", "Where math becomes machines.");
link("technology", "history", "Tools mark the ages.", "How things came to be made.");
link("technology", "mind", "Machines that seem to think.", "What a thinking machine would be compared to.");
link("religions", "cultures", "Faith lives inside ways of life.", "Where traditions are practiced.");
link("religions", "history", "Traditions run through the whole of history.", "How faiths began and moved.");
link("religions", "astronomy", "The sky as a calendar and a sacred place.", "Where many traditions look up.");
link("religions", "mind", "Experience, meaning and belief.", "What religions ask about the mind.");
link("cultures", "history", "Peoples and their pasts.", "The many histories of many peoples.");
link("cultures", "music", "Every people has its music.", "Music as each people keeps it.");
link("cultures", "astronomy", "Each people has a sky.", "The sky as peoples have read it.");
link("art", "music", "Music is one of the arts.", "A sister topic of its own.");
link("art", "cultures", "Art is how a people shows what it holds.", "Made in particular ways by particular peoples.");
link("art", "history", "Images are records.", "What art has kept of the past.");
link("art", "mind", "What looking and making do in the mind.", "Where seeing and feeling meet.");

// idea to idea
for (const [a, b] of [
  ["mi_conscious", "c_test"], ["mi_conscious", "c_check"], ["mi_conscious", "c_lucas"], ["mi_conscious", "mi_hard"], ["mi_conscious", "te_ai"],
  ["mi_self", "c_hof"], ["mi_self", "re_buddh"], ["mi_self", "mi_memory"], ["mi_other", "te_ai"], ["mi_other", "et_animals"],
  ["mi_memory", "ti_memory"], ["mi_memory", "hi_sources"], ["mi_agency", "mi_free"], ["mi_free", "c_check"], ["mi_flow", "mu_rhythm"], ["mi_flow", "mi_agency"], ["mi_attention", "te_net"],
  ["la_origin", "mu_rhythm"], ["la_origin", "la_signed"], ["la_families", "hi_routes"], ["la_dying", "cu_lang"], ["la_dying", "cu_colonial"], ["la_grammar", "s_sys"], ["la_grammar", "mat_algorithm"],
  ["la_meaning", "tr_tarski"], ["la_meaning", "th_says"], ["la_translation", "re_text"], ["la_whorf", "cu_understand"], ["la_metaphor", "mat_model"], ["la_names", "th_sent"],
  ["st_why", "hi_oral"], ["st_origin", "as_cosmovision"], ["st_origin", "cu_cosmo"], ["st_origin", "as_constellations"], ["st_origin", "re_text"], ["st_flood", "ea_water"], ["st_flood", "re_text"],
  ["st_epic", "hi_writing"], ["st_epic", "re_hindu"], ["st_folk", "hi_oral"], ["st_folk", "st_trickster"], ["st_study", "cu_understand"], ["st_study", "re_many"], ["st_poetry", "mu_rhythm"], ["st_drama", "ar_dance"], ["st_novel", "hi_writing"], ["st_literature", "la_translation"],
  ["li_dna", "mat_computation"], ["li_evolution", "ea_deep"], ["li_origin", "as_stars"], ["li_origin", "ea_deep"], ["li_death", "et_meaning"], ["li_death", "cu_rites"], ["li_death", "re_ritual"], ["li_extinct", "ea_anthro"], ["li_extinct", "et_future"], ["li_ecology", "ea_cycles"], ["li_symbiosis", "so_trust"], ["li_cell", "li_dna"], ["li_cell", "li_evolution"],
  ["ea_plates", "ea_deep"], ["ea_deep", "ti_arrow"], ["ea_deep", "as_expansion"], ["ea_ice", "as_orbits"], ["ea_ice", "ti_cycles"], ["ea_ocean", "cu_indknow"], ["ea_climate", "so_commons"], ["ea_climate", "et_future"], ["ea_anthro", "et_future"], ["ea_anthro", "hi_dating"], ["ea_cycles", "li_ecology"], ["ea_climate", "te_energy"],
  ["so_state", "p_const"], ["so_law", "p_const"], ["so_law", "et_justice"], ["so_power", "p_sig"], ["so_power", "p_out"], ["so_democracy", "p_out"], ["so_trust", "w_trust"], ["so_trust", "te_net"], ["so_commons", "te_net"], ["so_trade", "cu_exchange"], ["so_city", "hi_routes"], ["so_inequality", "et_justice"],
  ["et_good", "re_many"], ["et_good", "re_confu"], ["et_relativism", "cu_understand"], ["et_rights", "re_freedom"], ["et_animals", "li_ecology"], ["et_future", "ea_climate"], ["et_meaning", "re_nonrel"], ["et_three", "et_good"],
  ["te_tools", "li_evolution"], ["te_print", "hi_writing"], ["te_print", "hi_sources"], ["te_computers", "mat_computation"], ["te_computers", "mat_algorithm"], ["te_computers", "s_prog"], ["te_ai", "h_ai"], ["te_safety", "h_ai"], ["te_safety", "h_lob"], ["te_dual", "so_power"], ["te_fire", "cu_food"], ["te_energy", "ea_climate"], ["te_net", "hi_sources"],
  ["ar_why", "st_why"], ["ar_perspective", "mat_geometry"], ["ar_color", "as_light"], ["ar_beauty", "mat_symmetry"], ["ar_beauty", "mu_ratio"], ["ar_dance", "mu_rhythm"], ["ar_film", "st_drama"], ["ar_craft", "cu_def"], ["ar_arch", "re_ritual"], ["ar_arch", "mat_geometry"], ["ar_copy", "te_print"], ["ar_copy", "so_law"],
  ["re_science", "as_expansion"], ["re_ritual", "ti_calendars"], ["re_pilgrim", "cu_exchange"], ["re_text", "hi_writing"], ["re_text", "hi_oral"], ["re_mystic", "mi_conscious"], ["re_buddh", "mi_self"], ["re_nonrel", "et_meaning"], ["re_freedom", "et_rights"], ["re_indig", "cu_cosmo"], ["re_indig", "as_cosmovision"], ["re_islam", "hi_wisdom"], ["re_dialogue", "cu_exchange"], ["re_many", "re_dialogue"],
  ["re_many", "re_hindu"], ["re_many", "re_buddh"], ["re_many", "re_jew"], ["re_many", "re_christ"], ["re_many", "re_islam"], ["re_many", "re_sikh"], ["re_many", "re_dao"], ["re_many", "re_confu"], ["re_many", "re_jain"], ["re_many", "re_shinto"], ["re_many", "re_bahai"], ["re_many", "re_indig"], ["re_dao", "re_confu"], ["cu_diaspora", "cu_exchange"], ["cu_diaspora", "cu_lang"],
  ["cu_cosmo", "as_cosmovision"], ["cu_cosmo", "as_archaeo"], ["cu_indknow", "as_archaeo"], ["cu_music", "mu_gamelan"], ["cu_music", "mu_raga"], ["cu_music", "mu_maqam"], ["cu_music", "mu_africa"], ["cu_music", "mu_andes"], ["cu_exchange", "hi_routes"], ["cu_colonial", "hi_sources"], ["cu_heritage", "hi_sources"], ["cu_lang", "la_dying"], ["cu_rites", "re_ritual"], ["cu_food", "re_ritual"],
]) link(a, b);

// ---------------- Questions ----------------
const grpOf = {};
for (const f of ["seed.json", "seed-music.json", "seed-topics.json"]) for (const s of read(f).stars) grpOf[s.id] = s.grp;
for (const s of S) grpOf[s.id] = s.grp;
const Q = [], QL = [];
const q = (id, label, title, body, links, sources = [], verify = false) => {
  Q.push({ id, grp: grpOf[links[0]], kind: "q", size: 2, label, title, body: p(body, verify), sources });
  for (const l of links) QL.push([id, l, null, null]);
};
q("q_x_machine", "Could a machine be aware?", "Could a machine be aware?", "Nobody agrees on what would show it. Some think awareness needs a living body, some think the right pattern of information would do, and some think the question is badly posed.", ["mi_conscious", "te_ai", "c_lucas"], [SEP("Consciousness", "consciousness")]);
q("q_x_story", "Is the self a story?", "Is the self a story we tell?", "We piece together who we are from memory and the tales others tell about us. Whether anything lies underneath is argued by philosophers and by several religious traditions in different ways.", ["mi_self", "st_why", "re_buddh"]);
q("q_x_choose", "Do we choose?", "Do we choose what we do?", "The feeling of choosing is strong. How it fits with laws of nature, or with what the brain does before we notice, is the live part of the question.", ["mi_free", "mi_agency", "c_check"]);
q("q_x_animal_mind", "Do animals have minds?", "Which animals have minds like ours?", "Crows, octopuses, elephants and bees surprise people who study them. Where awareness starts is open, and the answer changes what we think we owe them.", ["mi_other", "li_evolution", "et_animals"]);
q("q_x_say_all", "Can all be said in any language?", "Can anything be said in any language?", "Translators say that nearly anything can be explained, though not always briefly or with the same feeling. Whether some thoughts belong to one language is the open part.", ["la_translation", "la_whorf", "la_meaning"]);
q("q_x_lose_lang", "What do we lose with a language?", "What is lost when a language falls silent?", "A language holds names for plants, songs, jokes and ways of being polite. Communities and linguists are still working out what can be kept in a recording and what needs a living speaker.", ["la_dying", "cu_lang", "cu_colonial"]);
q("q_x_meaning", "Where does meaning live?", "Where does meaning live?", "In the speaker’s mind, in the community’s habits or in the link to the world? Each answer fits some cases and fails others.", ["la_meaning", "mi_other", "tr_tarski"]);
q("q_x_same_tales", "Why do the same tales recur?", "Why do similar tales turn up in different places?", "Travel and trade carry stories along. Shared human concerns may bring similar tales out of different places. Scholars weigh both, case by case.", ["st_folk", "st_flood", "cu_exchange"]);
q("q_x_canon", "Who decides what is literature?", "Who decides what counts as literature?", "Schools, publishers, prizes and readers all shape which writing is kept. Whose writing was left out, and in which language, is a question many communities now ask.", ["st_literature", "cu_heritage", "la_translation"]);
q("q_x_share_story", "Can stories be shared with care?", "How can a community’s stories be shared with care?", "Some stories are meant for anyone. Some belong to a family, a clan or a season. Asking who may tell a story, and how, is part of reading it well.", ["st_study", "cu_understand", "re_indig"]);
q("q_x_life_begin", "How did life begin?", "How did life begin?", "Chemistry became biology at least once, probably within the first billion years. Which steps came in which order is still unknown.", ["li_origin", "ea_deep", "as_stars"]);
q("q_x_elsewhere", "Is there life elsewhere?", "Is there life elsewhere?", "No one has found any yet. Telescopes can now read the air of distant planets, and each reading adds a clue to the search.", ["li_origin", "as_stars", "as_light"]);
q("q_x_living", "What is a living thing?", "What counts as a living thing?", "Cells, viruses, flames and programs that copy themselves sit at different points of any definition. The edge says something about what we mean.", ["li_cell", "li_symbiosis", "mat_computation"]);
q("q_x_aging", "Why do we age?", "Why do living things age?", "Biologists have several accounts of why evolution lets bodies wear out. Whether aging can be slowed, and whether it should be, is a question for ethics as well as biology.", ["li_death", "li_evolution", "et_meaning"]);
q("q_x_climate_act", "How should we act on climate?", "How should societies act on climate?", "The measurements are clear about the warming. What to do, how fast and who pays are matters of values and politics where reasonable people differ.", ["ea_climate", "so_commons", "et_future"]);
q("q_x_name_age", "Should this age be named?", "Should the present be named as an age of people?", "The name Anthropocene is used widely and rejected by some scientists and critics. The argument is about evidence and also about who the name includes.", ["ea_anthro", "et_future", "hi_dating"]);
q("q_x_feel_deep", "Can we feel deep time?", "Can a person feel deep time?", "Millions of years pass beyond any memory or story. Maps, rock layers and walks along a timeline all try to help.", ["ea_deep", "ti_present", "mi_memory"]);
q("q_x_trust", "What makes people trust?", "What makes people trust each other?", "Shared rules, repeated dealings, a common story and courts all help. It is not yet clear how much of it a large online world can rebuild.", ["so_trust", "w_trust", "te_net"]);
q("q_x_commons", "Who should hold the commons?", "Who should look after what belongs to everyone?", "Villages, states, markets and online communities have all tried. What worked depended on the people, the place and the rules they made together.", ["so_commons", "te_net", "ea_water"]);
q("q_x_check_power", "Can power check itself?", "Can power be checked from inside?", "Courts, elections, a free press and an opposition try to. Gödel’s worry, and many histories, suggest the check has to come from somewhere the power does not fully control.", ["so_power", "p_out", "so_democracy"]);
q("q_x_fair", "What is fair?", "What is a fair share?", "Equal shares, shares by effort and shares by need each sound right in some cases. Societies mix them, and the mix is the argument.", ["so_inequality", "et_justice", "so_trade"]);
q("q_x_values", "Do values differ everywhere?", "Are values different everywhere?", "Customs vary widely. Some values, such as care for the young, turn up in nearly every society. How much is shared and how much is local is still studied.", ["et_relativism", "cu_understand", "re_many"]);
q("q_x_unborn", "What do we owe the unborn?", "What do we owe people who are not yet born?", "Climate, waste and new technology shape their lives and they cannot speak. Several traditions teach thinking many generations ahead.", ["et_future", "ea_climate", "te_ai"]);
q("q_x_purpose", "What gives life meaning?", "What gives a life meaning?", "Faith, love, work, understanding and making something are named across traditions and by people with no tradition. The answers live side by side here.", ["et_meaning", "re_nonrel", "re_many"]);
q("q_x_animal_rights", "Do animals have rights?", "Do animals have rights?", "Views range from welfare rules to full rights, and many traditions teach kinship with other species. The answer depends partly on what animals feel.", ["et_animals", "mi_other", "li_ecology"]);
q("q_x_ai_decide", "Who should decide about AI?", "Who should decide how AI is built and used?", "Companies, governments, researchers and the public all have a stake. Who decides, and who can say no, is part of the technology.", ["te_dual", "so_power", "te_ai"]);
q("q_x_ai_check", "Can an AI check its own safety?", "Can an AI check that its successor is safe?", "A system that wants to trust a stronger version of itself meets a limit like Löb’s. Humans and other checks may be part of the answer.", ["te_safety", "h_ai", "h_lob"]);
q("q_x_net", "What does the internet change?", "What does the internet change in how we think?", "Everything is a few taps away, and so is everyone. Attention, memory and trust have all been argued to shift, and the evidence is still being gathered.", ["te_net", "mi_attention", "so_trust"]);
q("q_x_tools_change", "Which tools change us most?", "Which tools changed people most?", "Writing, printing, clocks and screens are common answers. Each changed what was worth remembering.", ["te_tools", "te_print", "mi_memory"]);
q("q_x_beauty", "What is beauty for?", "What is beauty for?", "Some say it guides us to what is good for us, some say it is a pleasure with no purpose, some say it is made by habit and place. Each has examples.", ["ar_beauty", "mat_symmetry", "li_evolution"]);
q("q_x_own_style", "Who owns a style or a song?", "Who owns a style, a tune or a story?", "Artists learn by copying, and some works belong to a community more than to a person. Law draws lines that many people feel are in the wrong place.", ["ar_copy", "so_law", "cu_heritage"]);
q("q_x_art_lang", "Is art a language?", "Is art a language?", "Music, dance and painting carry meaning without words. Whether they have a grammar of their own is something scholars of each art keep asking.", ["ar_why", "la_meaning", "mu_rhythm"]);
q("q_x_machine_art", "Can a machine make art?", "Can a machine make art?", "Programs now produce pictures and tunes that people enjoy. Whether art needs someone who means something by it is the heart of the question.", ["ar_why", "te_ai", "mi_conscious"]);
q("q_x_understand", "Can traditions understand?", "Can people of different traditions understand each other?", "Dialogue works best when each side describes itself and listens before replying. What can be shared and what has to stay different is part of the conversation.", ["re_dialogue", "re_many", "cu_understand"]);
q("q_x_belief_reach", "How far does belief freedom reach?", "How far does freedom of belief reach?", "It covers holding a belief and changing it. How far it covers acting on it, teaching it or leaving it is argued in courts around the world.", ["re_freedom", "et_rights", "so_law"]);
q("q_x_sci_rel", "Can science and religion meet?", "Can science and religion meet?", "Some say they answer separate questions, some find tension, and some find help. Careful people hold each view.", ["re_science", "as_expansion", "mi_conscious"]);
q("q_x_ritual", "What do rituals do?", "What do rituals do for people?", "They mark change, hold a group together and calm the person. Why repeating a set of acts has these effects is still studied.", ["re_ritual", "cu_rites", "mi_flow"]);
q("q_x_text_ages", "What can a text carry across ages?", "What can a text carry across the ages?", "Words change, readers change and translators choose. Traditions keep texts alive by reading, chanting and arguing over them again and again.", ["re_text", "hi_oral", "la_translation"]);
q("q_x_mystics", "What do mystics report?", "What do people report from mystical experience?", "Accounts from many traditions describe a sense of unity or of presence. Believers and researchers read them in different ways, and the reports are worth reading side by side.", ["re_mystic", "mi_conscious", "re_buddh"]);
q("q_x_held", "How does a people hold knowledge?", "How does a people hold what it knows?", "Songs, stories, crafts, seasons and elders carry knowledge in many communities. Writing may be added, and it changes some things.", ["cu_indknow", "hi_oral", "hi_sources"]);
q("q_x_objects", "Who keeps a people’s objects?", "Who should keep the objects of a people?", "Museums, source communities and states have different claims. Many agreements now exist, and each case is a conversation.", ["cu_heritage", "cu_colonial", "hi_sources"]);
q("q_x_sky_people", "How does each people read the sky?", "How does each people read the sky?", "Every culture has watched the sky and made it part of its life: planting, travel, stories, ceremony. The readings differ and can be learned side by side.", ["cu_cosmo", "as_cosmovision", "as_archaeo"]);
q("q_x_stay_self", "Can a culture change and last?", "Can a culture change and still be itself?", "Cultures have always changed through contact. What a people wishes to keep, and who decides, shapes the answer.", ["cu_def", "cu_exchange", "la_dying"]);
q("q_x_food", "What does food carry?", "What does a meal carry?", "A meal can carry memory, belonging, belief and welcome. Recipes travel and change, and some keep a place alive far from home.", ["cu_food", "re_ritual", "cu_kin"]);
// the last question is the marker the worker checks
q("q_x_voices", "Whose voice is missing?", "Whose voice is missing from the map?", "Any map of ideas leaves people out: languages, traditions and peoples. Anyone can add or correct what is here, and people from each tradition and culture are invited to speak for themselves.", ["hi_sources", "cu_colonial", "la_dying"]);

// ---------------- Checks ----------------
const base = new Set(Object.keys(grpOf).filter((id) => !S.some((s) => s.id === id)).concat(["hub", "godel", "music", "math", "time", "astronomy", "history"]));
const all = new Set(S.map((s) => s.id).concat(Q.map((s) => s.id)));
let bad = 0;
const fail = (...a) => { console.log(...a); bad++; };
if (new Set(S.map((s) => s.id)).size !== S.length) fail("DUPLICATE IDS");
for (const s of S.concat(Q)) {
  if (base.has(s.id)) fail("ID CLASH", s.id);
  if (!s.grp) fail("NO GROUP", s.id);
  if (s.label.length > 34) fail("LABEL TOO LONG", s.id, s.label.length);
  const txt = s.title + s.body.replace(/<[^>]+>/g, "");
  if (/—|–/.test(txt)) fail("DASH", s.id);
  if (/\bnot\b[^.]{0,60}\bbut\b/i.test(txt)) fail("NOT-BUT", s.id);
  if (/[A-Z]{4,}/.test(txt.replace(/DNA|BCE|UNESCO|AI|ATU/g, ""))) fail("CAPS", s.id);
}
for (const [a, b] of L.concat(QL)) {
  if (!base.has(a) && !all.has(a) && !["mind","language","stories","life","earth","society","ethics","technology","religions","cultures","art"].includes(a)) fail("MISSING LINK SOURCE", a);
  if (!base.has(b) && !all.has(b) && !Object.keys(TOPICS).includes(b)) fail("MISSING LINK TARGET", a, b);
}
const deg = {};
for (const [a, b] of L.concat(QL)) { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }
for (const s of S.concat(Q)) if (!deg[s.id]) fail("ISOLATED", s.id);
if (bad) { console.log("problems:", bad); process.exit(1); }

// the marker has to be the last star of each file
const ai = S.findIndex((s) => s.id === "art"); S.push(S.splice(ai, 1)[0]);
const map = { id: "godel", title: "Gödel", center: "hub" };
fs.writeFileSync("public/seed-topics-2.json", JSON.stringify({ map, groups, stars: S, links: L }));
fs.writeFileSync("public/seed-questions-2.json", JSON.stringify({ map, groups: [], stars: Q, links: QL }));
console.log("topics", S.length, "ideas", L.length, "links;", "questions", Q.length, QL.length, "links; last:", S[S.length - 1].id, Q[Q.length - 1].id);
