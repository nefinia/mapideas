/* The Map of Ideas: makes the app installable and lets it open without a connection.
   It keeps the page shell and the public map. It never keeps anything that belongs to a signed-in person
   (sign-in, favorites, your corner, private ideas), and it never touches the counting of visits. */
const CACHE = "map-v2";
const SHELL = ["/", "/glossary/", "/glossary/app.js", "/glossary/styles.css", "/favicon.svg", "/icon-192.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const p = url.pathname;

  // the public map: fresh when online; the last public copy when not. A copy that came with someone signed in is never kept.
  if (p === "/api/map/godel") {
    e.respondWith(fetch(req).then(async (res) => {
      try {
        if (res.ok) { const j = await res.clone().json(); if (j && j.me === null) { (await caches.open(CACHE)).put("/api/map/godel", res.clone()); } }
      } catch (er) {}
      if (!res.ok) { const old = await caches.match("/api/map/godel"); if (old) return old; }
      return res;
    }).catch(async () => (await caches.match("/api/map/godel")) || new Response(JSON.stringify({ error: "You are offline, and the map has not been opened here yet." }), { status: 503, headers: { "content-type": "application/json" } })));
    return;
  }
  // everything else that talks to the server, and the plain pages for search engines, go straight through
  if (p.startsWith("/api/") || p.startsWith("/auth/") || p === "/bridges" || p.startsWith("/bridges/") || p === "/ev" || p.startsWith("/i/") || p === "/i" || p === "/stats/" || p.endsWith(".xml") || p.endsWith(".txt")) return;

  // pages: the network first so a new version shows at once; the saved shell when offline
  if (req.mode === "navigate") {
    const shell = p.startsWith("/glossary") ? "/glossary/" : "/";
    e.respondWith(fetch(req).then((res) => { if (res.ok && (p === "/" || p === "/glossary/")) { caches.open(CACHE).then((c) => c.put(p, res.clone())); } return res; })
      .catch(async () => (await caches.match(p)) || (await caches.match(shell)) || new Response("You are offline.", { status: 503, headers: { "content-type": "text/plain" } })));
    return;
  }
  // icons, fonts, the glossary files, the seed data: saved after first use, refreshed in the background
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { caches.open(CACHE).then((c) => c.put(req, res.clone())); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
