// Service worker: bikin halaman & lagu yang sudah disimpan bisa dibuka tanpa internet.
var APP = 'musik-app-v1', SONG = 'musik-lagu';
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(['./', 'index.html']); }).catch(function () {}));
});
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
function isAudio(u) { return /\.(mp3|m4a|aac|wav)$/i.test(new URL(u).pathname); }
// Safari butuh jawaban Range (206) agar audio dari cache bisa diputar & digeser
function ranged(req, res) {
  var h = req.headers.get('range');
  if (!h) return res;
  return res.blob().then(function (b) {
    var m = /bytes=(\d*)-(\d*)/.exec(h) || [], s = m[1] ? +m[1] : 0, e = m[2] ? +m[2] : b.size - 1;
    if (!m[1] && m[2]) { s = Math.max(0, b.size - +m[2]); e = b.size - 1; }
    e = Math.min(e, b.size - 1);
    return new Response(b.slice(s, e + 1), { status: 206, statusText: 'Partial Content', headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + s + '-' + e + '/' + b.size,
      'Content-Length': String(e - s + 1), 'Accept-Ranges': 'bytes' } });
  });
}
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (isAudio(r.url)) {
    e.respondWith(caches.open(SONG).then(function (c) { return c.match(r.url, { ignoreSearch: true }); })
      .then(function (m) { return m ? ranged(r, m) : fetch(r); }));
    return;
  }
  e.respondWith(fetch(r).then(function (res) {
    var p = new URL(r.url).pathname;
    if (res.ok && (r.mode === 'navigate' || /\.html?$|\/$/.test(p))) { var cp = res.clone(); caches.open(APP).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html') || caches.match('./'); });
  }));
});
