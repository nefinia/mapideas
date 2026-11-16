  var KIND = { f: 'idea', q: 'question to chase', r: 'reading' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paras(s) { return String(s).split(/\n+/).filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + esc(x.trim()) + '</p>'; }).join(''); }
  function stripHtml(h) {
    var t = String(h).replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, '');
    var ta = document.createElement('textarea'); ta.innerHTML = t; return ta.value;
  }

  /* data */
  var ME = DATA.me, MAPID = DATA.map.id, CENTER = DATA.map.center, CFG = { ai: false, signin: true, dev: false };
  var G = [], GB = {}, ORBIT = {}, N = {}, ids = [];
  DATA.groups.forEach(function (g) {
    var o = { id: g.id, name: g.name, nodes: [], edges: [] };
    G.push(o); GB[g.id] = o; ORBIT[g.id] = [g.angle, g.radius];
  });
  function setMeta(n, s) {
    n.owner = s.owner; n.vis = s.vis; n.html = !!s.html; n.user = s.owner !== 'seed';
    n.raw = s.html ? stripHtml(s.body) : s.body;
    n.ownerName = s.owner_name || null; n.ubName = s.ub_name || null; n.updated = s.updated;
  }
  function mkNode(s, gid) {
    var n = { id: s.id, label: s.label, kind: s.kind, size: s.size || 2, title: s.title, body: s.html ? s.body : paras(s.body), g: gid, x: 0, y: 0, vx: 0, vy: 0, fixed: false, ph: Math.random() * 6.28, ph2: Math.random() * 6.28, dx: 0, dy: 0 };
    setMeta(n, s);
    return n;
  }
  DATA.stars.forEach(function (s) {
    var g = GB[s.grp] || GB.th || G[0];
    var n = mkNode(s, g.id); g.nodes.push(n); N[n.id] = n; ids.push(n.id);
  });
  var E = [], adj = {}, seen = {};
  ids.forEach(function (id) { adj[id] = []; });
  function edgeType(a, b) { return (a === CENTER || b === CENTER) ? 's' : (N[a].g === N[b].g ? 'in' : 'x'); }
  function addE(a, b, t, meta) {
    if (a === b || !N[a] || !N[b]) { return; }
    var key = a < b ? a + '|' + b : b + '|' + a;
    if (seen[key]) { return; }
    var ed = { a: N[a], b: N[b], t: t || edgeType(a, b), meta: meta || {} };
    E.push(ed); seen[key] = ed;
    adj[a].push(b); adj[b].push(a);
    return ed;
  }
  DATA.links.forEach(function (l) { addE(l.a, l.b, null, l); });

