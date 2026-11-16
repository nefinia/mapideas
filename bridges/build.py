"""Builds src/index.html (the live page) from the prototype file, adding the backend connection.
Every replacement must match exactly once, so the build fails loudly if the prototype changed."""
import re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])          # prototype bridges.html
OUT = pathlib.Path(sys.argv[2])          # src/index.html
s = SRC.read_text()

def once(old, new):
    global s
    n = s.count(old)
    if n != 1:
        sys.exit(f"Expected one match, found {n}: {old[:80]!r}")
    s = s.replace(old, new)

def regex_once(pat, new):
    global s
    m = list(re.finditer(pat, s, re.S))
    if len(m) != 1:
        sys.exit(f"Expected one regex match, found {len(m)}: {pat[:80]!r}")
    s = s[:m[0].start()] + new + s[m[0].end():]

# --- Researcher view only with ?debug ---
once("  <details>\n", "  <details id=\"debugview\" hidden>\n")
once("<summary>Researcher view (prototype only)</summary>", "<summary>Researcher view</summary>")
once("What would be saved, anonymously. In this prototype nothing leaves your browser; the player code and bridges stay on this device so the returning-player flow can be tried.",
     "What this visit sends to the database. Shown only with ?debug in the address.")

# --- Real AI bridges, injected by the worker ---
regex_once(r"// Placeholder AI answers for the core, per language\..*?\n\};\n\n// Interface text\.",
           "// AI bridges (one per pair and direction), injected by the worker from ai-bridges.js.\nconst AI_BRIDGES = /*AI_BRIDGES*/null;\nconst AI_MODEL_NAME = /*AI_MODEL*/\"\";\n\n// Interface text.")
once("function aiCard(id, hint){\n  const txt = (AI[L] && AI[L][id]) || t(\"aiPending\");",
     "function aiCard(p, hint){\n  const e = AI_BRIDGES && (AI_BRIDGES[L] || AI_BRIDGES.en) && (AI_BRIDGES[L] || AI_BRIDGES.en)[p.id];\n  const txt = e ? e[p.dir === \"ba\" ? 1 : 0] : t(\"aiPending\");")
s = s.replace("aiCard(p.id,", "aiCard(p,")

# --- New strings ---
once("for(const l in EXTRA) Object.assign(T[l], EXTRA[l]);",
"""for(const l in EXTRA) Object.assign(T[l], EXTRA[l]);
const LIVE = {
  en:{allDoneTag:"All pairs done", allDoneP:"You've built every bridge we have for now. New pairs are coming, so come back in a while with your player code.", transcribing:"Turning your voice into text…", privacyLink:"Full privacy details", restoreNote:"Type the code you saved to continue with your bridges.", codeNotFound:"We couldn't find that code, so it will start fresh under that name."},
  fr:{allDoneTag:"Toutes les paires sont faites", allDoneP:"Vous avez construit tous les ponts disponibles pour l'instant. De nouvelles paires arrivent : revenez dans quelque temps avec votre code de joueur.", transcribing:"Transcription en cours…", privacyLink:"Tous les détails sur la confidentialité", restoreNote:"Tapez le code que vous avez gardé pour retrouver vos ponts.", codeNotFound:"Ce code est introuvable, il recommencera donc à zéro sous ce nom."},
  es:{allDoneTag:"Todos los pares listos", allDoneP:"Has construido todos los puentes que tenemos por ahora. Llegarán pares nuevos: vuelve dentro de un tiempo con tu código de jugador.", transcribing:"Pasando tu voz a texto…", privacyLink:"Todos los detalles de privacidad", restoreNote:"Escribe el código que guardaste para seguir con tus puentes.", codeNotFound:"No encontramos ese código, así que empezará de cero con ese nombre."},
  it:{allDoneTag:"Tutte le coppie fatte", allDoneP:"Hai costruito tutti i ponti che abbiamo per ora. Arriveranno nuove coppie: torna tra un po' con il tuo codice giocatore.", transcribing:"Trascrizione in corso…", privacyLink:"Tutti i dettagli sulla privacy", restoreNote:"Scrivi il codice che hai salvato per continuare con i tuoi ponti.", codeNotFound:"Non abbiamo trovato questo codice, quindi ripartirà da zero con questo nome."},
  de:{allDoneTag:"Alle Paare geschafft", allDoneP:"Du hast alle Brücken gebaut, die es im Moment gibt. Neue Paare kommen bald, komm also mit deinem Spielercode wieder.", transcribing:"Deine Stimme wird in Text umgewandelt…", privacyLink:"Alle Details zum Datenschutz", restoreNote:"Gib den gespeicherten Code ein, um mit deinen Brücken weiterzumachen.", codeNotFound:"Diesen Code gibt es nicht, also beginnt er unter diesem Namen neu."}
};
for(const l in LIVE) Object.assign(T[l], LIVE[l]);""")

# --- API layer, queue and balancing ---
once("let coreOrder=[], byLevel={}, levelCycle=shuffle([\"cc\",\"ca\",\"aa\"]), poolTurn=0, step=0, coreThisVisit=0;",
"""let coreOrder=[], byLevel={}, levelCycle=shuffle(["cc","ca","aa"]), poolTurn=0, step=0, coreThisVisit=0;

// ================= Backend =================
const API = "/bridges/api";
const QKEY = "bridges.queue.v1";
const testerKey = (() => { try{ const k = new URLSearchParams(location.search).get("tester"); if(k) sessionStorage.setItem("bridges.tester", k); return sessionStorage.getItem("bridges.tester") || ""; }catch(e){ return ""; } })();
// Every write goes through a small queue kept on the device, so nothing is lost on a weak connection.
const loadQ = () => { try{ return JSON.parse(localStorage.getItem(QKEY) || "[]"); }catch(e){ return []; } };
const saveQ = q => { try{ localStorage.setItem(QKEY, JSON.stringify(q.slice(-300))); }catch(e){} };
let flushing = false;
async function flush(){
  if(flushing) return; flushing = true;
  try{
    while(true){
      const q = loadQ(); if(!q.length) break;
      const it = q[0]; let done = false;
      try{ const r = await fetch(API + "/" + it.k, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(it.b)}); done = r.ok || (r.status >= 400 && r.status < 500); }catch(e){ done = false; }
      if(!done) break;
      const q2 = loadQ(); q2.shift(); saveQ(q2);
    }
  } finally { flushing = false; }
}
function post(kind, data){
  let payload;
  if(kind === "player") payload = {code:P.code, grp:P.group, lang:L, restored:!!P.restoredFromCode, visits:P.visits || 1, answeredEnd:!!P.answeredEnd, feedbackGiven:!!P.feedbackGiven, testerKey};
  else if(kind === "feedback" || kind === "email") payload = data;      // never sent together with the player code
  else payload = {...data, code:P.code};
  const q = loadQ(); q.push({k:kind, b:payload}); saveQ(q); flush();
}
function apiDelete(code){
  saveQ(loadQ().filter(it => !(it.b && it.b.code === code)));
  fetch(API + "/player/" + encodeURIComponent(code), {method:"DELETE"}).catch(()=>{});
}
// Hand out the pairs and directions with the fewest answers so far.
let COUNTS = {}, countsReady = Promise.resolve();
function fetchCounts(ids){
  return fetch(API + "/counts", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({pairs:ids})})
    .then(r => r.ok ? r.json() : {}).then(c => { COUNTS = c || {}; }).catch(() => {});
}
const cnt = (id, d) => (COUNTS[id] && COUNTS[id][d]) || 0;
const total = id => cnt(id,"ab") + cnt(id,"ba");
function dirFor(id){ const a = cnt(id,"ab"), b = cnt(id,"ba"); return a === b ? (Math.random() < 0.5 ? "ab" : "ba") : (a < b ? "ab" : "ba"); }
function countAnswer(tr){ COUNTS[tr.pair] = COUNTS[tr.pair] || {ab:0, ba:0}; COUNTS[tr.pair][tr.dir] = (COUNTS[tr.pair][tr.dir] || 0) + 1; }
flush();""")

once("""  byLevel = {cc:shuffle(left.filter(p=>p.level==="cc")), ca:shuffle(left.filter(p=>p.level==="ca")), aa:shuffle(left.filter(p=>p.level==="aa"))};
}""", """  byLevel = {cc:shuffle(left.filter(p=>p.level==="cc")), ca:shuffle(left.filter(p=>p.level==="ca")), aa:shuffle(left.filter(p=>p.level==="aa"))};
  countsReady = fetchCounts([...coreOrder, ...left].map(p=>p.id));
}""")
once("""    if(byLevel[lv].length){ poolTurn=(poolTurn+k+1)%3; return {...byLevel[lv].shift(), set:"open"}; } }""",
     """    if(byLevel[lv].length){ poolTurn=(poolTurn+k+1)%3; byLevel[lv].sort((x,y)=>total(x.id)-total(y.id) || Math.random()-0.5); return {...byLevel[lv].shift(), set:"open"}; } }""")

once("""function next(){
  let p = step < coreThisVisit ? coreOrder[step] : nextPoolPair();
  if(!p){ finalQuestions(); return; }
  p = Math.random() < 0.5 ? {...p, a:p.b, b:p.a, dir:"ba"} : {...p, dir:"ab"};
  step++; setBar(); trial(p);
}""", """async function next(){
  await Promise.race([countsReady, new Promise(r => setTimeout(r, 1500))]);
  let p = step < coreThisVisit ? coreOrder[step] : nextPoolPair();
  if(!p){ allDone(); return; }
  p = dirFor(p.id) === "ba" ? {...p, a:p.b, b:p.a, dir:"ba"} : {...p, dir:"ab"};
  step++; setBar(); trial(p);
}

function allDone(){
  redraw = allDone;
  app.innerHTML = `
  <section class="panel">
    <span class="tag">${t("allDoneTag")}</span>
    <p class="count">${t("built")(P.bridges.length)}</p>
    <p>${t("allDoneP")}</p>
    <div class="row"><button class="primary" id="fin">${t("cont")}</button></div>
  </section>`;
  document.getElementById("fin").onclick = () => finalQuestions();
}""")

# --- Saving ---
once("save(P); if(restored || P.warmup){ setupPairs(); next(); } else warmup();",
     "save(P); post(\"player\"); if(restored || P.warmup){ setupPairs(); next(); } else warmup();")
once("""        <p class="small muted">${t("codeNote")}</p>
        <div class="row"><button class="ghost" id="usecode">${t("cont")}</button></div>""",
"""        <p class="small muted" id="codemsg">${t("restoreNote")}</p>
        <div class="row"><button class="ghost" id="usecode">${t("cont")}</button></div>""")
once(r"""document.getElementById("usecode").onclick = () => { const v = document.getElementById("codein").value.trim().toLowerCase().replace(/[\s_.]+/g,"-"); if(v) begin(v, true); };""",
r"""document.getElementById("usecode").onclick = () => { const v = document.getElementById("codein").value.trim().toLowerCase().replace(/[\s_.]+/g,"-"); if(v) restoreCode(v, begin); };""")
once("function welcomeBack(first){\n  if(first){ P.visits = (P.visits||1) + 1; save(P); }",
"""// Bring a player back from their code, on any device.
async function restoreCode(v, begin){
  try{
    const r = await fetch(API + "/player/" + encodeURIComponent(v));
    if(r.ok){
      const j = await r.json();
      P = { code:v, lang:L, group:j.grp, firstVisit:j.first_seen, visits:(j.visits||1) + 1, bridges:j.bridges || [], warmup:j.warmup,
            answeredEnd:!!j.answered_end, feedbackGiven:!!j.feedback_given, restoredFromCode:true, sawAI:!!j.saw_ai, usedAI:!!j.used_ai };
      save(P); post("player"); showSel();
      if(P.bridges.length) welcomeBack(false); else { setupPairs(); next(); }
      return;
    }
  }catch(e){}
  begin(v, false);   // unknown code: a fresh start under that code, with the warm-up
}

function welcomeBack(first){
  if(first){ P.visits = (P.visits||1) + 1; save(P); post("player"); }""")
once("document.getElementById(\"delyes\").onclick = () => { wipe(); P = null;",
     "document.getElementById(\"delyes\").onclick = () => { apiDelete(P.code); wipe(); P = null;")
once("go.onclick = () => { P.warmup = {words:words(), ms:Date.now()-w.shownAt, pasted:w.pasted, lang:L}; save(P);",
     "go.onclick = () => { P.warmup = {words:words(), ms:Date.now()-w.shownAt, pasted:w.pasted, lang:L}; save(P); post(\"warmup\", P.warmup);")
once("document.getElementById(\"wskip\").onclick = () => { P.warmup = {skipped:true}; save(P);",
     "document.getElementById(\"wskip\").onclick = () => { P.warmup = {skipped:true}; save(P); post(\"warmup\", {skipped:true, lang:L});")
once("if(skip) skip.onclick = () => { stopRec(); tr.skipped = true; S.trials.push(tr); updateLog(); next(); };",
     "if(skip) skip.onclick = () => { stopRec(); tr.skipped = true; S.trials.push(tr); post(\"trial\", tr); updateLog(); next(); };")
once("""  S.trials.push(tr);
  P.bridges.push({pair:tr.pair, from:tr.from, to:tr.to, stones:tr.stones, final:tr.final, lang:tr.lang, at:new Date().toISOString()});
  save(P); updateLog();""", """  tr.aiShown = !!(tr.aiRequested);
  S.trials.push(tr); countAnswer(tr); post("trial", tr);
  P.bridges.push({pair:tr.pair, from:tr.from, to:tr.to, stones:tr.stones, final:tr.final, lang:tr.lang, at:new Date().toISOString()});
  save(P); updateLog();""")

# Old end-question function is no longer used.
regex_once(r"function finalQuestionsOld\(\)\{.*?\n\}\n\n(?=function feedback\(prev\))", "")
once("P.answeredEnd = true; save(P); updateLog(); feedback();",
     "P.answeredEnd = true; save(P); post(\"end\", S.end); post(\"player\"); updateLog(); feedback();")
once("""    S.resultsEmailList = document.getElementById("mail").value.trim() ? "one email added to a separate list" : null;
    P.feedbackGiven = true; save(P); updateLog(); thanks();""",
"""    const mail = document.getElementById("mail").value.trim();
    S.resultsEmailList = mail ? "one email added to a separate list" : null;
    if(rating || S.feedback.comment) post("feedback", {rating: rating || null, comment: S.feedback.comment, lang:L});
    if(mail) post("email", {email: mail, lang:L});
    P.feedbackGiven = true; save(P); post("player"); updateLog(); thanks();""")

# --- Voice: recorded here, transcribed in the site's own Cloudflare account, audio discarded ---
regex_once(r"  // Voice in the chosen language.*?  const stopRec = \(\) => \{ if\(rec\)\{ try\{ rec\.stop\(\); \}catch\(e\)\{\} rec = null; \} \};",
"""  // Voice: recorded in the browser, transcribed in our own Cloudflare account, and the audio is discarded.
  const mic = document.getElementById("mic"), micNote = document.getElementById("micNote"), micLabel = document.getElementById("micLabel");
  let rec = null, chunks = [];
  const stopMic = () => { mic.setAttribute("aria-pressed","false"); micLabel.textContent = t("speak"); };
  const noVoice = () => { stopMic(); micNote.textContent = t("noVoice"); };
  mic.onclick = async () => {
    if(rec){ try{ rec.stop(); }catch(e){} return; }
    if(!navigator.mediaDevices || !window.MediaRecorder){ noVoice(); return; }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(x => x.stop()); rec = null; stopMic();
        const blob = new Blob(chunks, {type:(chunks[0] && chunks[0].type) || "audio/webm"}); chunks = [];
        if(!blob.size) return;
        micNote.textContent = t("transcribing");
        try{
          const r = await fetch(API + "/transcribe?lang=" + L, {method:"POST", headers:{"content-type":blob.type}, body:blob});
          const j = r.ok ? await r.json() : {};
          if(j.text){ ans.value = (ans.value ? ans.value.trim() + " " : "") + j.text.trim(); tr.voice = true;
            if(tr.firstKeyMs === null) tr.firstKeyMs = Date.now() - tr.shownAt; send.disabled = !ans.value.trim(); micNote.textContent = ""; updateLog(); }
          else micNote.textContent = t("noVoice");
        }catch(e){ micNote.textContent = t("noVoice"); }
      };
      rec.start(); mic.setAttribute("aria-pressed","true"); micLabel.textContent = t("listening"); micNote.textContent = "";
    }catch(e){ rec = null; noVoice(); }
  };
  const stopRec = () => { if(rec){ try{ rec.stop(); }catch(e){} } };""")

# --- Privacy link under the consent text ---
once("""    <p class="small muted">${t("study")}</p>""",
     """    <p class="small muted">${t("study")}</p>
    <p class="small"><a href="/bridges/privacy" target="_blank" rel="noopener" style="color:var(--accent)">${t("privacyLink")}</a></p>""")

# --- Show the researcher view only with ?debug ---
once("// ================= Start =================",
     "// ================= Start =================\ntry{ if(new URLSearchParams(location.search).has(\"debug\")) document.getElementById(\"debugview\").hidden = false; }catch(e){}")

# --- Full document ---
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Find the bridge between two ideas.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#fbf3e4">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
"""
s = head + s.replace("<title>Bridges</title>", "<title>Bridges</title>", 1)
# Move everything after the <style> block into <body>.
cut = s.index("</style>\n\n<div class=\"wrap\">") + len("</style>\n")
s = s[:cut] + "</head>\n<body>\n" + s[cut:] + "\n</body>\n</html>\n"
s = s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
OUT.write_text(s)
print("built", OUT, len(s), "bytes")
