import re
src = open('/tmp/claude-0/-home-claude/11186079-1e00-5577-b4f8-f40078e1677e/scratchpad/template_collab.html', encoding='utf-8').read()
head = open('data_head.js', encoding='utf-8').read()
live = open('live.js', encoding='utf-8').read()
t = src

def rep(o, n, cnt=1):
    global t
    assert o in t, o[:70]
    t = t.replace(o, n, cnt)

# ---- document shell
rep('<title>Gödel Constellation</title>', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Map</title><meta name="description" content="A shared constellation of ideas. Add your own stars, link them, and ask questions. Starting from Gödel.">')
rep('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
rep('<style>', '<style>\n*, *::before, *::after { box-sizing: border-box; }\nhtml, body { margin: 0; }\nbody { background: #0a0d14; color: #e6eaf3; }', 1)
# the first </style> closes the head
i = t.index('</style>') + len('</style>')
t = t[:i] + '\n</head><body>' + t[i:]
t = t.rstrip() + '\n</body></html>\n'

t = t.replace('maxlength="1500"','maxlength="2500"')
# ---- extra styles
rep('</style>', '''
.ctl { flex-wrap: wrap; }
.sub { font: 400 0.7rem var(--mono); color: var(--muted); }
.star.priv .core { stroke: #b9a3ff; stroke-width: 1.6; stroke-dasharray: 2.5 2; }
.star.priv .halo { fill: #b9a3ff; opacity: 0.22; }
.e.priv { stroke: #8f7bd6; stroke-dasharray: 4 3; opacity: 0.9; }
#sky.nopriv .star.priv, #sky.nopriv .e.priv { display: none; }
.hrow { display: flex; justify-content: space-between; gap: 0.6rem; align-items: center; font: 400 0.78rem/1.35 var(--body); color: var(--fg); padding: 0.4rem 0; border-top: 1px solid var(--line); }
.hrow span { flex: 1; min-width: 0; }
.hrow button, .rrow { font-size: 0.7rem; }
#dhist { margin-top: 0.8rem; }
.rrow { display: block; width: 100%; text-align: left; border-radius: 10px; margin: 0 0 0.3rem; white-space: normal; line-height: 1.35; }
.ux { padding: 0.28rem 0.5rem; margin-left: -0.3rem; border-radius: 999px; color: var(--muted); }
.amsg { margin: 0 0 0.6rem; padding: 0.55rem 0.75rem; border-radius: 12px; font: 400 0.93rem/1.45 var(--body); white-space: pre-wrap; }
.amsg.ai { background: rgba(255,255,255,0.05); }
.amsg.me { background: rgba(125, 182, 230, 0.16); margin-left: 1.6rem; }
.arow { display: flex; gap: 0.4rem; align-items: flex-end; }
.arow textarea { margin: 0; }
.hintq { font: 400 0.9rem/1.45 var(--body); color: var(--star); margin: 0 0 0.7rem; }
.toast { position: absolute; left: 50%; top: 5.2rem; transform: translateX(-50%); z-index: 6; background: var(--fg); color: var(--sky); font: 400 0.8rem var(--mono); padding: 0.45rem 0.85rem; border-radius: 999px; max-width: 90%; text-align: center; }
.chk2 { display: flex; gap: 0.5rem; align-items: center; font: 400 0.82rem var(--body); color: var(--muted); margin: 0 0 0.8rem; }
.chk2 input { width: auto; margin: 0; }
.soft { font: 400 0.78rem/1.45 var(--body); color: var(--muted); margin: 0.7rem 0 0; }
button.link { background: none; border: none; color: var(--fg); text-decoration: underline; padding: 0; font: inherit; cursor: pointer; }
</style>''')

# ---- top bar
a = t.index('<div class="top">'); b = t.index('<div class="hint"')
t = t[:a] + '''<div class="top">
    <div class="row1">
      <h1>Map</h1>
      <div class="ctl">
        <button type="button" id="addbtn" hidden>+ star</button>
        <button type="button" id="askbtn" hidden>ask</button>
        <button type="button" id="fit">fit</button>
        <button type="button" id="about">about</button>
      </div>
    </div>
    <div class="ctl">
      <button type="button" data-f="all" aria-pressed="true">all</button>
      <button type="button" data-f="q" aria-pressed="false">questions</button>
      <button type="button" id="minebtn" aria-pressed="true" hidden title="Show or hide the stars only you can see">my stars</button>
      <button type="button" id="login" hidden>sign in with Google</button>
      <button type="button" id="who" hidden></button>
    </div>
  </div>
  <div class="toast" id="toast" hidden></div>

  ''' + t[b:]

# ---- home card text: legend, how it works, recent changes
a = t.index('<div class="legend">'); b = t.index('<div id="detail" hidden>')
t = t[:a] + '''<div class="legend">
        <span><svg viewBox="-5 -5 10 10"><circle r="2.5" fill="#f2f4fa"/></svg>idea</span>
        <span><svg viewBox="-5 -5 10 10"><circle r="2.6" fill="none" stroke="#7db6e6" stroke-width="1.2"/></svg>question to chase</span>
        <span><svg viewBox="-5 -5 10 10"><circle r="2" fill="#8f9ab0"/></svg>reading</span>
        <span><svg viewBox="-5 -5 10 10"><circle r="2.4" fill="#f2f4fa" stroke="#b9a3ff" stroke-width="1.2" stroke-dasharray="2 1.5"/></svg>only you can see it</span>
      </div>
      <p class="how">Gödel is in the middle. Each cluster is one branch of the discussion, and every line links two ideas. Tap a star to read it and see what it connects to. Drag a star and the web follows.</p>
      <p class="how" id="signhint" hidden>Anyone can read and explore. <button type="button" class="link" id="signhint2">Sign in with Google</button> to add stars, link them, edit and ask the assistant.</p>
      <p class="how" id="memberhint" hidden>It works like a wiki. Anyone signed in can add and edit, every change is saved with the name of who made it, and any earlier version can be restored from a star's history. Keep a star private while you work on it, then share it when it is ready.</p>
      <div id="recentwrap" hidden><div class="kind"><span>recent changes</span></div><div id="recent"></div></div>
    </div>
    ''' + t[b:]
rep('id="signhint2"', 'id="signhint2"')

# ---- detail tail, compose, ask
a = t.index('<p class="by" id="dby" hidden></p>'); b = t.index('</aside>')
t = t[:a] + '''<p class="by" id="dby" hidden></p>
      <div class="acts" id="dact"></div>
      <div id="dhist" hidden></div>
    </div>
    <div id="compose" hidden>
      <div class="kind"><span id="ctop">add a star</span><button type="button" id="ccancel">cancel</button></div>
      <label class="fl" for="ctitle">Name of the star</label>
      <input id="ctitle" maxlength="34" autocomplete="off" placeholder="a few words">
      <label class="fl" for="cbody">Say it in plain words</label>
      <textarea id="cbody" rows="5" maxlength="1500" placeholder="The idea, question or reading, explained the way you would to a friend."></textarea>
      <div class="fl">What is it?</div>
      <div class="kinds" id="ckinds">
        <button type="button" data-k="f" aria-pressed="true">idea</button>
        <button type="button" data-k="q" aria-pressed="false">question</button>
        <button type="button" data-k="r" aria-pressed="false">reading</button>
      </div>
      <div id="cconn">
        <div class="fl">Connects to</div>
        <div class="links" id="cchips"></div>
        <select id="cpick" aria-label="Connect to another star"></select>
        <button type="button" id="csuggest">suggest links (AI)</button>
        <p class="hintq" id="chint" hidden></p>
        <label class="chk2"><input type="checkbox" id="cpriv"> keep it private for now (only I can see it)</label>
      </div>
      <p class="err" id="cerr" hidden></p>
      <button type="button" class="go" id="cgo">add to the constellation</button>
    </div>
    <div id="askp" hidden>
      <div class="kind"><span id="atop">ask the map</span><button type="button" id="aback">back</button></div>
      <div id="alog"></div>
      <div class="arow"><textarea id="ain" rows="2" maxlength="600" placeholder="Type here"></textarea><button type="button" id="asend">send</button></div>
      <p class="soft">The assistant is an AI. It can be wrong, so check what matters.</p>
    </div>
  ''' + t[b:]

# ---- renderCard: ask panel
rep("document.getElementById('compose').hidden = mode !== 'compose';", "document.getElementById('compose').hidden = mode !== 'compose';\n    document.getElementById('askp').hidden = mode !== 'ask';")

# ---- script: data section replaced, wrapped in start()
a = t.index('/*__G__*/'); b = t.index('  /* layout:')
t = t[:a] + '  function start(DATA) {\n' + head + t[b:]
# the old ORBIT line goes (orbit now comes from the server)
t = re.sub(r"  var ORBIT = \{[^\n]*\};\n", "", t, count=1)
# node/edge elements
rep("function makeEdgeEl(e) { e.el = el('line', { class: 'e ' + e.t }, elayer); }", "function makeEdgeEl(e) { e.el = el('line', { class: 'e ' + e.t + (e.meta && e.meta.vis === 'private' ? ' priv' : '') }, elayer); }")
rep("(n.hub ? ' hub' : '') + (n.user ? ' user' : '')", "(n.hub ? ' hub' : '') + (n.user ? ' user' : '') + (n.vis === 'private' ? ' priv' : '')")
# hub detection
rep("if (g.id === 'hub') { n.x = 0; n.y = 0; n.fixed = true; n.hub = true; return; }", "if (n.id === CENTER) { n.x = 0; n.y = 0; n.fixed = true; n.hub = true; return; }")
# group centroid with empty groups
rep("      var cx = 0, cy = 0, top = 1e9;", "      if (!g.nodes.length) { g.nameEl.style.display = 'none'; return; } g.nameEl.style.display = '';\n      var cx = 0, cy = 0, top = 1e9;")
# the group name element for the center group is skipped as before
# select / deselect update the address
rep("    sel = id; mode = 'detail';\n    renderCard(); applyStates();", "    sel = id; mode = 'detail';\n    try { history.replaceState(null, '', '#' + id); } catch (e) {}\n    renderCard(); applyStates();")
rep("    sel = null; mode = 'hint';\n    renderCard(); applyStates();\n  }\n  function focusGroup", "    sel = null; mode = 'hint';\n    try { history.replaceState(null, '', location.pathname); } catch (e) {}\n    renderCard(); applyStates();\n  }\n  function focusGroup")
# live block replaces the old collaboration block
a = t.index('  /* ---------- collaboration ---------- */'); b = t.index('  if (window.ResizeObserver)')
t = t[:a] + live + '\n' + t[b:]
# the sign-in hint button id
t = t.replace('id="signhint2"', 'id="signhint2"')
# close start() and boot
rep("  requestAnimationFrame(loop);\n})();", """  requestAnimationFrame(loop);
  }

  fetch('/api/map/godel', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(start).catch(function () {
    document.getElementById('hint').textContent = 'The map could not load. Please refresh.';
  });
})();""")
open('../public/index.html', 'w', encoding='utf-8').write(t)
m = re.search(r'<script>(.*)</script>', t, re.S)
open('check.js', 'w', encoding='utf-8').write(m.group(1))
print('built', len(t))
