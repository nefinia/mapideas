  /* ---------- live: people, edits, asking ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var linkFrom = null, cMode = 'add', cEditId = null, cKind = 'f', cLinks = [];
  var askTurns = [], askStar = null, askBusy = false;

  function api(method, path, body) {
    var opt = { method: method, credentials: 'same-origin', headers: {} };
    if (method !== 'GET') { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body || {}); }
    return fetch(path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'Something went wrong.'); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function ago(t) {
    var s = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (s < 60) { return 'just now'; }
    if (s < 3600) { return Math.round(s / 60) + ' min ago'; }
    if (s < 86400) { return Math.round(s / 3600) + ' h ago'; }
    return Math.round(s / 86400) + ' d ago';
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3800);
  }

  /* ----- drawing changes that arrive from the server ----- */
  function removeEdge(ed) {
    var a = ed.a.id, b = ed.b.id, key = a < b ? a + '|' + b : b + '|' + a;
    var i = E.indexOf(ed); if (i >= 0) { E.splice(i, 1); }
    if (ed.el && ed.el.parentNode) { ed.el.parentNode.removeChild(ed.el); }
    if (adj[a]) { adj[a] = adj[a].filter(function (x) { return x !== b; }); }
    if (adj[b]) { adj[b] = adj[b].filter(function (x) { return x !== a; }); }
    delete seen[key];
  }
  function removeNode(id) {
    var n = N[id]; if (!n) { return; }
    E.filter(function (e) { return e.a === n || e.b === n; }).forEach(removeEdge);
    if (n.el && n.el.parentNode) { n.el.parentNode.removeChild(n.el); }
    list.splice(list.indexOf(n), 1);
    GB[n.g].nodes = GB[n.g].nodes.filter(function (x) { return x !== n; });
    ids.splice(ids.indexOf(id), 1);
    delete N[id]; delete adj[id];
    dirty = true;
  }
  function addStar(s, near) {
    var gid = GB[s.grp] ? s.grp : 'th';
    var n = mkNode(s, gid);
    var bx = near ? near.x : ANC[gid][0], by = near ? near.y : ANC[gid][1];
    n.x = bx + (Math.random() - 0.5) * 70; n.y = by + (Math.random() - 0.5) * 70; n.dx = n.x; n.dy = n.y;
    N[n.id] = n; ids.push(n.id); adj[n.id] = []; list.push(n); GB[gid].nodes.push(n);
    makeNodeEl(n);
    return n;
  }
  var lastSig = '';
  function applyData(d) {
    ME = d.me;
    var want = {}, firstLink = {};
    d.stars.forEach(function (s) { want[s.id] = s; });
    d.links.forEach(function (l) { if (!firstLink[l.a]) { firstLink[l.a] = l.b; } if (!firstLink[l.b]) { firstLink[l.b] = l.a; } });
    ids.slice().forEach(function (id) { if (!want[id] && id !== CENTER) { removeNode(id); } });
    d.stars.forEach(function (s) {
      var n = N[s.id];
      if (n && (n.kind !== s.kind || n.vis !== s.vis)) { var px = n.x, py = n.y; removeNode(s.id); n = addStar(s, { x: px, y: py }); }
      else if (!n) { n = addStar(s, N[firstLink[s.id]]); }
      else {
        n.label = s.label; n.title = s.title; n.body = s.html ? s.body : paras(s.body); setMeta(n, s);
        var t = n.el.querySelector('.lbl'); if (t) { t.textContent = n.label; }
        n.el.setAttribute('aria-label', n.title);
      }
    });
    var lw = {};
    d.links.forEach(function (l) { lw[l.id] = l; });
    E.slice().forEach(function (e) { if (e.meta && e.meta.id && !lw[e.meta.id]) { removeEdge(e); } });
    d.links.forEach(function (l) {
      var ed = addE(l.a, l.b, null, l);
      if (ed) { makeEdgeEl(ed); } else { var k = l.a < l.b ? l.a + '|' + l.b : l.b + '|' + l.a; if (seen[k]) { seen[k].meta = l; } }
    });
    E.forEach(function (e) { if (e.el) { e.el.setAttribute('class', 'e ' + e.t + (e.meta && e.meta.vis === 'private' ? ' priv' : '')); } });
    if (sel && !N[sel]) { deselect(); }
    heat = Math.max(heat, 120); labelK = -1; dirty = true;
    applyStates();
    renderAuth();
    if (mode === 'detail' && sel) { renderCard(); }
  }
  function refresh() { return api('GET', '/api/map/' + MAPID).then(applyData).then(loadRecent).catch(function () {}); }

  /* ----- the top bar and the home card ----- */
  function renderAuth() {
    var lg = $('login'), who = $('who');
    lg.hidden = !!ME || !CFG.signin; who.hidden = !ME;
    if (ME) { who.textContent = ME.name.split(' ')[0] + ' · sign out'; }
    $('addbtn').hidden = !ME; $('askbtn').hidden = !(ME && CFG.ai); $('minebtn').hidden = !ME;
    $('signhint').hidden = !!ME;
    $('memberhint').hidden = !ME;
  }
  function loadRecent() {
    return api('GET', '/api/recent/' + MAPID).then(function (d) {
      var box = $('recent'); box.innerHTML = '';
      d.recent.slice(0, 8).forEach(function (r) {
        if (!N[r.star_id]) { return; }
        var b = document.createElement('button'); b.type = 'button'; b.className = 'rrow'; b.setAttribute('data-jump', r.star_id);
        var verb = { create: 'added', edit: 'edited', revert: 'restored', delete: 'removed' }[r.action] || r.action;
        b.textContent = r.editor + ' ' + verb + ' “' + (r.label || '') + '” · ' + ago(r.at);
        box.appendChild(b);
      });
      $('recentwrap').hidden = !box.children.length;
    }).catch(function () {});
  }
  $('login').addEventListener('click', function () { location.href = CFG.dev ? '/auth/dev?name=' + encodeURIComponent(prompt('Test name?', 'Test person') || 'Test person') : '/auth/google'; });
  $('who').addEventListener('click', function () { location.href = '/auth/logout'; });
  $('signhint').addEventListener('click', function () { $('login').click(); });
  $('recent').addEventListener('click', function (e) { var b = e.target.closest('[data-jump]'); if (b) { select(b.getAttribute('data-jump')); } });
  $('minebtn').addEventListener('click', function () {
    var on = $('minebtn').getAttribute('aria-pressed') !== 'true';
    $('minebtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    sky.classList.toggle('nopriv', !on);
  });

  /* ----- the detail card: who, actions, history ----- */
  function deletableLink(ed) { return ME && ed.meta && ed.meta.id && (ed.meta.owner === ME.id || ME.admin); }
  function renderExtras(n) {
    var by = $('dby'), act = $('dact'); act.innerHTML = ''; $('dhist').hidden = true; $('dhist').innerHTML = '';
    var who = n.owner === 'seed' ? 'the first curators' : (n.ownerName || 'a member');
    by.hidden = false;
    by.textContent = 'added by ' + who + (n.ubName && n.ubName !== n.ownerName ? ' · last edit by ' + n.ubName : '') + (n.vis === 'private' ? ' · only you can see this' : '');
    function mk(label, key, cls) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('data-act', key); if (cls) { b.className = cls; } act.appendChild(b); }
    if (!ME) { mk('sign in to add, edit or ask', 'login'); }
    else {
      mk('+ add a star linked to this', 'add');
      mk('link to another star', 'link');
      mk('edit', 'edit');
      if (CFG.ai) { mk('ask about this', 'ask'); }
      mk('history', 'hist');
      if (n.owner === ME.id) { mk(n.vis === 'private' ? 'share with everyone' : 'make private', 'vis'); }
      if (n.id !== CENTER && (n.owner === ME.id || ME.admin)) { mk('remove', 'del', 'q'); }
    }
    // a small × beside the links a person may remove
    [].forEach.call($('dlinks').querySelectorAll('[data-jump]'), function (b) {
      var o = b.getAttribute('data-jump'), key = n.id < o ? n.id + '|' + o : o + '|' + n.id, ed = seen[key];
      if (ed && deletableLink(ed)) {
        var x = document.createElement('button'); x.type = 'button'; x.className = 'ux'; x.textContent = '×'; x.setAttribute('data-unlink', ed.meta.id); x.setAttribute('aria-label', 'Remove the link to ' + N[o].label);
        b.after(x);
      }
    });
  }
  $('dlinks').addEventListener('click', function (e) {
    var u = e.target.closest('[data-unlink]'); if (!u) { return; }
    e.stopPropagation();
    api('DELETE', '/api/links/' + u.getAttribute('data-unlink')).then(refresh).catch(function (er) { toast(er.message); });
  }, true);
  $('dact').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !sel) { return; }
    var k = b.getAttribute('data-act'), n = N[sel];
    if (k === 'login') { $('login').click(); }
    else if (k === 'add') { openCompose([sel]); }
    else if (k === 'link') { startLink(sel); }
    else if (k === 'edit') { openEdit(n); }
    else if (k === 'ask') { openAsk(sel); }
    else if (k === 'hist') { showHistory(n); }
    else if (k === 'vis') { api('POST', '/api/stars/' + n.id + '/vis', { vis: n.vis === 'private' ? 'public' : 'private' }).then(function () { toast(n.vis === 'private' ? 'Shared with everyone.' : 'Now only you can see it.'); return refresh(); }).catch(function (er) { toast(er.message); }); }
    else if (k === 'del') { if (confirm('Remove “' + n.label + '”? It stays in the history and can be restored by a curator.')) { api('DELETE', '/api/stars/' + n.id).then(function () { toast('Removed.'); return refresh(); }).catch(function (er) { toast(er.message); }); } }
  });
  function showHistory(n) {
    var box = $('dhist');
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.textContent = 'Loading…';
    api('GET', '/api/stars/' + n.id + '/history').then(function (d) {
      box.innerHTML = '';
      d.history.forEach(function (r, i) {
        var row = document.createElement('div'); row.className = 'hrow';
        var verb = { create: 'added', edit: 'edited', revert: 'restored an older version', delete: 'removed', share: 'shared', unshare: 'made private' }[r.action] || r.action;
        var s = document.createElement('span'); s.textContent = r.editor + ' ' + verb + ' · ' + ago(r.at) + (r.label ? ' · “' + r.label + '”' : '');
        row.appendChild(s);
        if (i > 0 && (r.action === 'create' || r.action === 'edit' || r.action === 'revert')) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = 'restore'; b.setAttribute('data-rev', r.id); row.appendChild(b);
        }
        box.appendChild(row);
      });
    }).catch(function (er) { box.textContent = er.message; });
  }
  $('dhist').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rev]'); if (!b || !sel) { return; }
    api('POST', '/api/stars/' + sel + '/revert', { revision: Number(b.getAttribute('data-rev')) }).then(function () { toast('Restored.'); return refresh(); }).catch(function (er) { toast(er.message); });
  });

  /* ----- linking by tapping ----- */
  function startLink(id) {
    linkFrom = id; sel = null; mode = 'hint'; renderCard(); applyStates();
    N[id].el.classList.add('sel');
    hint.textContent = 'tap the star to connect to “' + N[id].label + '” · tap empty space to cancel';
    hint.hidden = false;
  }
  function cancelLink() {
    var id = linkFrom; linkFrom = null;
    hint.textContent = 'tap a star · drag a star to move it · pinch to zoom';
    if (id && N[id]) { N[id].el.classList.remove('sel'); }
  }
  function finishLink(to) {
    var from = linkFrom;
    if (!from || to === from) { return; }
    cancelLink();
    api('POST', '/api/links', { map: MAPID, a: from, b: to }).then(refresh).then(function () { toast('Linked.'); }).catch(function (er) { toast(er.message); });
    select(from);
  }

  /* ----- adding and editing ----- */
  function fillPick() {
    var p = $('cpick'); p.innerHTML = '';
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'connect to another star…'; p.appendChild(o0);
    G.forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g.id === 'hub' ? 'center' : g.name;
      g.nodes.slice().sort(function (a, b) { return a.label < b.label ? -1 : 1; }).forEach(function (n) {
        if (cLinks.indexOf(n.id) >= 0) { return; }
        var o = document.createElement('option'); o.value = n.id; o.textContent = n.label; og.appendChild(o);
      });
      if (og.children.length) { p.appendChild(og); }
    });
  }
  function renderChips() {
    var c = $('cchips'); c.innerHTML = '';
    cLinks.forEach(function (id) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = N[id] ? N[id].label : id; b.setAttribute('data-rm', id); c.appendChild(b);
    });
    fillPick();
  }
  function setKind(k) {
    cKind = k;
    [].forEach.call(document.querySelectorAll('#ckinds [data-k]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
  }
  function openCompose(pre) {
    if (!ME) { return; }
    cMode = 'add'; cEditId = null;
    cLinks = (pre || []).filter(function (i) { return N[i]; }).slice();
    setKind('f');
    $('ctitle').value = ''; $('cbody').value = ''; $('cpriv').checked = false;
    $('ctop').textContent = 'add a star'; $('cgo').textContent = 'add to the constellation';
    $('cconn').hidden = false; $('chint').hidden = true; $('cerr').hidden = true;
    renderChips();
    if (linkFrom) { cancelLink(); }
    sel = null; mode = 'compose'; renderCard(); applyStates();
    requestAnimationFrame(function () { if (cLinks.length) { frame(cLinks.map(function (i) { return N[i]; }), 0.7, 1.6, 0.6); } $('ctitle').focus(); });
  }
  function openEdit(n) {
    cMode = 'edit'; cEditId = n.id;
    setKind(n.kind);
    $('ctitle').value = n.label; $('cbody').value = n.raw;
    $('ctop').textContent = 'edit star'; $('cgo').textContent = 'save the change';
    $('cconn').hidden = true; $('chint').hidden = true; $('cerr').hidden = true;
    mode = 'compose'; renderCard();
    requestAnimationFrame(function () { $('ctitle').focus(); });
  }
  function closeCompose() { var id = cEditId; mode = 'hint'; renderCard(); applyStates(); if (id && N[id]) { select(id); } }
  function showErr(m) { var e = $('cerr'); e.textContent = m; e.hidden = false; }
  $('addbtn').addEventListener('click', function () { openCompose(sel ? [sel] : []); });
  $('ccancel').addEventListener('click', closeCompose);
  $('ckinds').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) { setKind(b.getAttribute('data-k')); } });
  $('cchips').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) { return; } cLinks = cLinks.filter(function (i) { return i !== b.getAttribute('data-rm'); }); renderChips(); });
  $('cpick').addEventListener('change', function (e) { var v = e.target.value; if (v && N[v] && cLinks.indexOf(v) < 0 && cLinks.length < 8) { cLinks.push(v); } renderChips(); });
  $('csuggest').addEventListener('click', function () {
    var label = $('ctitle').value.trim(), body = $('cbody').value.trim();
    if (!label || body.length < 12) { showErr('Write the name and a sentence or two first, then ask.'); return; }
    $('cerr').hidden = true;
    var b = $('csuggest'); b.disabled = true; b.textContent = 'thinking…';
    api('POST', '/api/ask', { task: 'suggest', map: MAPID, label: label, body: body }).then(function (r) {
      (r.ids || []).forEach(function (i) { if (N[i] && cLinks.indexOf(i) < 0 && cLinks.length < 8) { cLinks.push(i); } });
      renderChips();
      if (r.question) { var h = $('chint'); h.textContent = r.question; h.hidden = false; }
    }).catch(function (er) { showErr(er.message); }).then(function () { b.disabled = false; b.textContent = 'suggest links (AI)'; });
  });
  $('cgo').addEventListener('click', function () {
    var label = $('ctitle').value.trim(), body = $('cbody').value.trim();
    if (!label) { showErr('Give the star a name.'); return; }
    if (body.length < 12) { showErr('Add a sentence or two so others can follow it.'); return; }
    var go = $('cgo'); go.disabled = true;
    var p;
    if (cMode === 'edit') { p = api('PATCH', '/api/stars/' + cEditId, { label: label, body: body, kind: cKind }).then(function () { return cEditId; }); }
    else {
      if (!cLinks.length) { go.disabled = false; showErr('Connect it to at least one star, so it sits inside the web.'); return; }
      p = api('POST', '/api/stars', { map: MAPID, label: label, body: body, kind: cKind, links: cLinks, vis: $('cpriv').checked ? 'private' : 'public' }).then(function (r) { return r.id; });
    }
    p.then(function (id) { return refresh().then(function () { go.disabled = false; mode = 'hint'; renderCard(); applyStates(); requestAnimationFrame(function () { if (N[id]) { select(id); } }); }); })
      .catch(function (er) { go.disabled = false; showErr(er.message); });
  });

  /* ----- asking ----- */
  function renderAsk() {
    var log = $('alog'); log.innerHTML = '';
    var n = askStar && N[askStar];
    $('atop').textContent = n ? 'ask about “' + n.label + '”' : 'ask the map';
    if (!askTurns.length) {
      var p = document.createElement('p'); p.className = 'amsg ai';
      p.textContent = n ? 'Ask me anything about this idea, or tell me what you think of it and I will ask you something back.' : 'Ask about anything on the map, or describe an idea and I will help you find where it belongs.';
      log.appendChild(p);
    }
    askTurns.forEach(function (t) { var p = document.createElement('p'); p.className = 'amsg ' + (t.role === 'user' ? 'me' : 'ai'); p.textContent = t.content; log.appendChild(p); });
    if (askBusy) { var q = document.createElement('p'); q.className = 'amsg ai'; q.textContent = '…'; log.appendChild(q); }
    card.scrollTop = card.scrollHeight;
  }
  function openAsk(id) {
    if (!ME || !CFG.ai) { return; }
    if (askStar !== (id || null)) { askTurns = []; }
    askStar = id || null; mode = 'ask'; renderCard(); applyStates(); renderAsk();
    if (askStar) { requestAnimationFrame(function () { var arr = [N[askStar]].concat(neighborsOf(askStar).map(function (i) { return N[i]; })); frame(arr, 0.7, 2.0, 0.7); }); }
    $('ain').focus();
  }
  function sendAsk() {
    var v = $('ain').value.trim(); if (!v || askBusy) { return; }
    $('ain').value = ''; askTurns.push({ role: 'user', content: v }); askBusy = true; renderAsk();
    api('POST', '/api/ask', { task: 'chat', map: MAPID, star: askStar, turns: askTurns }).then(function (r) {
      askTurns.push({ role: 'assistant', content: r.text });
    }).catch(function (er) { askTurns.push({ role: 'assistant', content: er.message }); }).then(function () { askBusy = false; renderAsk(); });
  }
  $('asend').addEventListener('click', sendAsk);
  $('ain').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAsk(); } });
  $('askbtn').addEventListener('click', function () { openAsk(sel); });
  $('aback').addEventListener('click', function () { var id = askStar; if (id && N[id]) { select(id); } else { deselect(); } });

  /* ----- start ----- */
  api('GET', '/api/me').then(function (m) { CFG.ai = m.ai; CFG.signin = m.signin; CFG.dev = m.dev; renderAuth(); }).catch(function () {});
  renderAuth(); loadRecent();
  setInterval(function () { if (document.visibilityState === 'visible' && mode !== 'compose' && mode !== 'ask') { refresh(); } }, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { refresh(); } });
  var h0 = (location.hash || '').slice(1);
  if (h0 && N[h0]) { requestAnimationFrame(function () { requestAnimationFrame(function () { select(h0); }); }); }
