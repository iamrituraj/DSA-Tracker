/* SystemCraft simulator engine (v2).
 *
 * Pure functions over a design ({nodes, edges}); no DOM. The page and the node
 * test suite (test/simulator-engine.test.mjs) load the same file.
 *
 * ─── The traffic model, in the words the Help panel uses ───────────────────
 *
 *  Two kinds of request: reads and writes, split by the challenge's readPct.
 *
 *  - Client, Load Balancer, API Gateway: forward each request to ONE child,
 *    round-robin. Dead children are skipped (health checks).
 *  - CDN: answers cacheHit% of reads itself; misses and writes go to the origin.
 *  - App tier (any compute): a READ takes one path downstream, picked evenly
 *    across the kinds of thing it is wired to. A WRITE is applied to every
 *    kind of store it is wired to (DB, cache, index, queue...) in parallel.
 *  - Cache: answers cacheHit% of reads. Misses go to whatever is behind it; a
 *    cache with nothing behind it that sits beside a database is cache-aside,
 *    so the app reads the database itself on a miss. Writes never hit.
 *  - Database: serves reads and writes. Read replicas wired beside or behind
 *    a primary share its reads but never take writes.
 *  - Queue: the async boundary. The caller's latency ends at the enqueue ack.
 *    Consumers pull at their own pace, so they are never overrun; if they
 *    cannot keep up, the backlog (consumer lag) grows instead.
 *
 *  Latency per hop is sampled: a log-normal service time, a small chance of a
 *  tail event (GC pause, retransmit) and a queueing delay from the M/M/c
 *  waiting-time approximation (Sakasegawa), which is why latency stays flat
 *  until a tier passes ~85% and then climbs steeply. P50/P99 come from a few
 *  thousand seeded sample requests, so the same design always scores the same.
 */
(function (root) {
  'use strict';

  var C = root.SimCatalog;
  var LIBRARY = C.LIBRARY;
  var CHALLENGES = C.CHALLENGES;

  // Has to clear the largest burst divided by the smallest per-instance
  // capacity: the cart's 2x flash sale is 1M req/s against 10K per app server.
  var MAX_INSTANCES = 128;
  var MAX_NODES = 120;
  var MAX_EDGES = 400;
  var NODE_W = 172;
  var NODE_H = 64;
  // Sizing target. The reference designs run every tier at <= 75% and add one
  // spare instance (N+1), so losing any single instance leaves them <= 75%.
  var TARGET_UTIL = 0.75;
  var HOT_UTIL = 0.8;
  var ERR_OK = 0.01;      // error budget for "handles the load": 1% of requests
  var COST_SLACK = 1.6;   // within 1.6x the reference monthly cost
  var CHAOS_AT = 12;      // seconds into a run when a chaos event fires

  // Latency sampling parameters. SIGMA 0.4 puts a single hop's own P99 at ~2.5x
  // its median; TAIL_P is a per-hop 0.4% chance of a stall, which is what makes
  // long request paths pay for every extra hop at P99 ("The Tail at Scale").
  var SIGMA = 0.4;
  var TAIL_P = 0.004;
  var TAIL_X = 6;

  var COMP = {};
  var LABEL2ID = {};
  Object.keys(LIBRARY).forEach(function (g) {
    LIBRARY[g].forEach(function (c) { COMP[c.id] = c; LABEL2ID[c.label] = c.id; });
  });
  function findComp(type) { return Object.prototype.hasOwnProperty.call(COMP, type) ? COMP[type] : null; }

  function roleOf(cat) {
    switch (cat) {
      case 'client': case 'lb': return 'forward';
      case 'cdn': return 'cdn';
      case 'compute': return 'compute';
      case 'cache': return 'cache';
      case 'db': return 'db';
      case 'queue': return 'queue';
      default: return 'store';
    }
  }

  // ───────────────────────── small utilities ─────────────────────────
  function clampInt(v, lo, hi) { v = Math.floor(+v); if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function clampNum(v, lo, hi, d) { v = +v; if (!isFinite(v)) v = d; return Math.max(lo, Math.min(hi, v)); }
  function fmtNum(v) {
    if (!isFinite(v)) return '\u221e';
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e4) return Math.round(v / 1e3) + 'K';
    if (a >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(v));
  }
  function fmtMoney(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function pct(v) { return (v * 100 >= 10 ? Math.round(v * 100) : (Math.round(v * 1000) / 10)) + '%'; }
  function cleanLabel(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = (seed >>> 0) || 1, spare = null;
    function next() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.gauss = function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = 0; while (u === 0) u = next();
      var v = next(), r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
    return next;
  }
  function pickOne(arr, rand) { return arr[(rand() * arr.length) | 0]; }

  // ───────────────────────── design hygiene ─────────────────────────
  // Every design that enters the engine passes through here: saved drafts,
  // imports and shared links are all untrusted input.
  var NOTE_KINDS = { reqs: 1, api: 1, entity: 1, math: 1, note: 1 };
  var NOTE_COLORS = { amber: 1, blue: 1, purple: 1, green: 1, slate: 1 };
  function cleanNoteBody(s) {
    return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, 2000);
  }
  function normalizeDesign(raw) {
    var out = { nodes: [], edges: [], notes: [], nextId: 1 };
    if (!raw || typeof raw !== 'object') return out;
    var ids = {}, maxId = 0;
    (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, MAX_NODES).forEach(function (n) {
      if (!n || typeof n !== 'object') return;
      var id = Math.floor(+n.id);
      if (!(id > 0 && id < 1e7) || ids[id]) return;
      var c = findComp(n.type);
      if (!c) return;
      var node = { id: id, type: c.id, x: Math.round(clampNum(n.x, -20000, 20000, 0)), y: Math.round(clampNum(n.y, -20000, 20000, 0)),
        instances: clampInt(n.instances == null ? 1 : n.instances, 1, MAX_INSTANCES) };
      var lbl = cleanLabel(n.label);
      if (lbl && lbl !== c.label) node.label = lbl;
      var note = cleanLabel(n.note);
      if (note) node.note = note;
      ids[id] = 1; if (id > maxId) maxId = id;
      out.nodes.push(node);
    });
    var seen = {};
    (Array.isArray(raw.edges) ? raw.edges : []).forEach(function (e) {
      if (out.edges.length >= MAX_EDGES || !e || typeof e !== 'object') return;
      var f = Math.floor(+e.from), t = Math.floor(+e.to);
      if (!ids[f] || !ids[t] || f === t) return;
      var k = f + '>' + t;
      if (seen[k]) return;
      seen[k] = 1;
      var edge = { from: f, to: t };
      if (e.kind === 'read' || e.kind === 'write') edge.kind = e.kind;
      var elbl = cleanLabel(e.label);
      if (elbl) edge.label = elbl;
      if (e.dashed) edge.dashed = true;
      out.edges.push(edge);
    });
    var nIds = {};
    (Array.isArray(raw.notes) ? raw.notes : []).slice(0, 40).forEach(function (nt) {
      if (!nt || typeof nt !== 'object') return;
      var id = Math.floor(+nt.id);
      if (!(id > 0 && id < 1e7) || ids[id] || nIds[id]) return;
      var kind = NOTE_KINDS[nt.kind] ? nt.kind : 'note';
      var color = NOTE_COLORS[nt.color] ? nt.color : (kind === 'reqs' ? 'blue' : kind === 'api' ? 'purple' : kind === 'entity' ? 'green' : kind === 'math' ? 'slate' : 'amber');
      var title = cleanLabel(nt.title) || 'Note';
      var body = cleanNoteBody(nt.body);
      var item = {
        id: id, kind: kind, color: color, title: title, body: body,
        x: Math.round(clampNum(nt.x, -20000, 20000, 0)),
        y: Math.round(clampNum(nt.y, -20000, 20000, 0)),
        w: Math.round(clampNum(nt.w == null ? 264 : nt.w, 180, 640, 264)),
        h: Math.round(clampNum(nt.h == null ? 168 : nt.h, 100, 560, 168))
      };
      nIds[id] = 1; if (id > maxId) maxId = id;
      out.notes.push(item);
    });
    var nid = Math.floor(+raw.nextId);
    out.nextId = Math.max(maxId + 1, nid > maxId && nid < 1e7 ? nid : 0);
    return out;
  }

  // Seed from what changes the numbers (types, instances, wiring), not from
  // positions, so dragging a node never changes a score.
  function designSeed(design) {
    var s = design.nodes.map(function (n) { return n.id + ':' + n.type + ':' + (n.instances || 1) + ':' + (n.label || ''); }).join('|') + '#' +
      design.edges.map(function (e) { return e.from + '>' + e.to + (e.kind || ''); }).join('|');
    return hashStr(s);
  }

  function monthlyCost(design) {
    return design.nodes.reduce(function (sum, n) {
      var c = findComp(n.type);
      return sum + ((c && c.cost) || 0) * clampInt(n.instances || 1, 1, MAX_INSTANCES);
    }, 0);
  }

  // ───────────────────────── graph preparation ─────────────────────────
  function laneKey(n) {
    if (n.cat === 'db' || n.cat === 'replica') return 'db';
    // Same-named compute nodes behind one parent are replicas of one service;
    // differently named ones are different services. Renaming is how a reader
    // models "Auth Service" next to "Feed Service".
    if (n.cat === 'compute' || n.cat === 'lb' || n.cat === 'cdn') return n.cat + ':' + n.label;
    return n.cat;
  }

  function prepare(design, opts) {
    opts = opts || {};
    var failures = opts.failures || {}, slow = opts.slow || {};
    var G = { N: {}, ids: [], fwd: {}, back: [], clients: [], topo: [], flow: {}, lag: {} };
    design.nodes.forEach(function (raw) {
      var c = findComp(raw.type);
      if (!c || G.N[raw.id]) return;
      var inst = clampInt(raw.instances || 1, 1, MAX_INSTANCES);
      var f = failures[raw.id];
      var lostInst = c.cat === 'client' ? 0 : (f === 'down' ? inst : Math.max(0, Math.min(inst, f | 0)));
      var live = inst - lostInst;
      var add = Math.max(0, +slow[raw.id] || 0);
      G.N[raw.id] = {
        id: raw.id, type: c.id, comp: c, cat: c.cat, role: roleOf(c.cat), label: raw.label || c.label,
        inst: inst, live: live, lostInst: lostInst, down: c.cat !== 'client' && live <= 0,
        cap: c.maxRPS === Infinity ? Infinity : c.maxRPS * live,
        base: c.latency + add, slowBy: add,
        // Concurrency per instance by Little's law: throughput x service time.
        conc: c.maxRPS === Infinity ? 1 : Math.max(1, c.maxRPS * Math.max(c.latency, 0.5) / 1000),
        read: 0, write: 0, demand: 0, load: 0, util: 0, served: 1, status: 'idle',
        reachable: false, dropped: 0, deadEnd: null, consumer: false, pullCapped: false, lagging: false
      };
      G.ids.push(raw.id);
      G.fwd[raw.id] = [];
      if (c.cat === 'client') G.clients.push(raw.id);
    });
    var seen = {};
    design.edges.forEach(function (e) {
      if (!G.N[e.from] || !G.N[e.to] || e.from === e.to) return;
      var k = e.from + '>' + e.to;
      if (seen[k]) return;
      seen[k] = 1;
      G.fwd[e.from].push({ from: e.from, to: e.to, kind: e.kind === 'read' || e.kind === 'write' ? e.kind : 'auto' });
    });
    // Reachability from the clients, and back edges (a loop closes on a node
    // still on the DFS stack). Back edges carry no traffic.
    var color = {};
    function dfs(id) {
      color[id] = 1;
      G.N[id].reachable = true;
      G.fwd[id] = G.fwd[id].filter(function (e) {
        if (color[e.to] === 1) { G.back.push([e.from, e.to]); return false; }
        if (!color[e.to]) dfs(e.to);
        return true;
      });
      color[id] = 2;
    }
    G.clients.forEach(function (id) { if (!color[id]) dfs(id); });
    // Kahn's topological order over the reachable DAG.
    var indeg = {};
    G.ids.forEach(function (id) { if (G.N[id].reachable) indeg[id] = 0; });
    G.ids.forEach(function (id) {
      if (!G.N[id].reachable) return;
      G.fwd[id].forEach(function (e) { indeg[e.to]++; });
    });
    var q = G.ids.filter(function (id) { return G.N[id].reachable && indeg[id] === 0; });
    while (q.length) {
      var id = q.shift();
      G.topo.push(id);
      G.fwd[id].forEach(function (e) { if (--indeg[e.to] === 0) q.push(e.to); });
    }
    return G;
  }

  function readKids(G, id) {
    return G.fwd[id].filter(function (e) { return e.kind !== 'write' && G.N[e.to].cat !== 'queue'; }).map(function (e) { return e.to; });
  }
  function writeKids(G, id) {
    return G.fwd[id].filter(function (e) { return e.kind !== 'read' && G.N[e.to].cat !== 'replica'; }).map(function (e) { return e.to; });
  }
  function liveOf(G, ids) { return ids.filter(function (id) { return !G.N[id].down; }); }
  function lanesOf(G, ids) {
    var by = {}, lanes = [];
    ids.forEach(function (id) {
      var k = laneKey(G.N[id]);
      if (!by[k]) { by[k] = { key: k, all: [], ids: [], dead: false, fallback: null }; lanes.push(by[k]); }
      by[k].all.push(id);
    });
    lanes.forEach(function (l) { l.ids = liveOf(G, l.all); l.dead = !l.ids.length; });
    return lanes;
  }

  // Every node reachable from `id` along write-eligible edges, including id.
  function reachOf(G, id) {
    if (G.reach[id]) return G.reach[id];
    var set = {};
    set[id] = true;
    G.reach[id] = set;   // provisional, guards re-entry (the DAG has no cycles left)
    writeKids(G, id).forEach(function (k) {
      var sub = reachOf(G, k);
      Object.keys(sub).forEach(function (x) { set[x] = true; });
    });
    return set;
  }
  // A write lands on each store once. When a store is reachable through a
  // queue (write-behind / fan-out on write), the queue path persists it and a
  // direct connection to the same store carries reads only. When the app
  // writes a store directly, a cache in front of that store does not write it
  // again (cache-aside: write the database, invalidate the cache). An edge set
  // explicitly to "Writes" is always honoured.
  function writeTargets(G, n, kids) {
    var skip = {};
    if (n.role === 'compute') {
      kids.forEach(function (k) {
        if (G.N[k].cat !== 'queue') return;
        writeKids(G, k).forEach(function (consumer) {
          var r = reachOf(G, consumer);
          Object.keys(r).forEach(function (x) { skip[x] = true; });
        });
      });
    } else if (n.role === 'cache') {
      (G.parents[n.id] || []).forEach(function (p) {
        var cover = G.N[p].cover;
        if (cover) Object.keys(cover).forEach(function (x) { skip[x] = true; });
      });
    }
    return kids.filter(function (k) {
      var c = G.N[k];
      if (!skip[k] || G.kind[n.id + '>' + k] === 'write') return true;
      return !(c.role === 'db' || c.role === 'store');
    });
  }
  function coverOf(G, n) {
    // What a compute node's writes already reach without going through a cache.
    var cover = {};
    writeKids(G, n.id).forEach(function (k) {
      var c = G.N[k];
      if (c.role === 'db' || c.role === 'store') cover[k] = true;
      if (c.cat === 'queue') writeKids(G, k).forEach(function (consumer) { Object.keys(reachOf(G, consumer)).forEach(function (x) { cover[x] = true; }); });
    });
    return cover;
  }

  function routeFor(G, n, cls) {
    var kids = cls === 'read' ? readKids(G, n.id) : writeKids(G, n.id);
    switch (n.role) {
      case 'forward':
      case 'cdn':
        return { kind: 'pick', all: kids, ids: liveOf(G, kids) };
      case 'compute':
      case 'cache': {
        if (cls === 'write') kids = writeTargets(G, n, kids);
        var lanes = lanesOf(G, kids);
        if (cls === 'read') {
          var cacheLane = null, dbLane = null;
          lanes.forEach(function (l) { if (l.key === 'cache') cacheLane = l; if (l.key === 'db') dbLane = l; });
          if (cacheLane && dbLane) {
            // Cache-aside: the database is where a miss goes, not a second
            // read path that bypasses the cache.
            lanes = lanes.filter(function (l) { return l !== dbLane; });
            cacheLane.fallback = dbLane;
          }
          if (cacheLane && cacheLane.dead) {
            // Every cache down: the app fails open to whatever sits behind it.
            var alt = cacheLane.fallback ? cacheLane.fallback.ids.slice() : [];
            if (!alt.length) cacheLane.all.forEach(function (cid) { alt = alt.concat(liveOf(G, readKids(G, cid))); });
            alt = alt.filter(function (v, i) { return alt.indexOf(v) === i; });
            cacheLane.ids = alt;
            cacheLane.dead = !alt.length;
            cacheLane.failOpen = true;
            cacheLane.fallback = null;
          }
        }
        return { kind: cls === 'read' ? 'one' : 'all', lanes: lanes };
      }
      case 'db':
        if (cls === 'read') return { kind: 'replicas', ids: liveOf(G, kids.filter(function (k) { return G.N[k].cat === 'replica'; })) };
        return { kind: 'cdc', ids: liveOf(G, kids.filter(function (k) { return G.N[k].cat === 'queue'; })) };
      case 'queue':
        return cls === 'write' ? { kind: 'consume', groups: lanesOf(G, kids) } : { kind: 'none' };
      default:
        return { kind: 'none' };
    }
  }
  function buildRoutes(G) {
    G.reach = {};
    G.parents = {};
    G.kind = {};
    G.topo.forEach(function (id) {
      G.fwd[id].forEach(function (e) {
        G.kind[e.from + '>' + e.to] = e.kind;
        if (e.kind !== 'read') (G.parents[e.to] = G.parents[e.to] || []).push(e.from);
      });
    });
    // Topological order, so a cache's parents have their coverage before the
    // cache decides what it writes through.
    G.topo.forEach(function (id) {
      var n = G.N[id];
      n.routes = { read: routeFor(G, n, 'read'), write: routeFor(G, n, 'write') };
      if (n.role === 'compute') n.cover = coverOf(G, n);
    });
  }
  function isLeafCache(n) { return n.role === 'cache' && n.routes && !n.routes.read.lanes.length; }

  // ───────────────────────── analytic propagation ─────────────────────────
  function addFlow(G, from, to, cls, amt) {
    if (!(amt > 0)) return;
    var c = G.N[to];
    c[cls] += amt;
    c.demand += amt;
    var k = from + '>' + to;
    var f = G.flow[k] || (G.flow[k] = { read: 0, write: 0 });
    f[cls] += amt;
  }
  function splitTo(G, from, ids, cls, amt) {
    var each = amt / ids.length;
    ids.forEach(function (id) { addFlow(G, from, id, cls, each); });
  }
  function route(G, n, cls, amt, P) {
    if (!(amt > 0)) return;
    var r = n.routes[cls], h = P.hit;
    switch (n.role) {
      case 'forward':
      case 'cdn': {
        var pass = (n.role === 'cdn' && cls === 'read') ? amt * (1 - h) : amt;
        if (!(pass > 0)) return;
        if (!r.ids.length) { n.dropped += pass; n.deadEnd = n.deadEnd || {}; n.deadEnd[cls] = r.all.length ? 'down' : 'none'; return; }
        splitTo(G, n.id, r.ids, cls, pass);
        return;
      }
      case 'cache':
      case 'compute': {
        if (n.role === 'cache' && cls === 'read') amt = amt * (1 - h);
        if (!r.lanes.length || !(amt > 0)) return;   // served here
        if (cls === 'read') {
          var share = amt / r.lanes.length;
          r.lanes.forEach(function (l) {
            if (l.dead) { n.dropped += share; return; }
            var each = share / l.ids.length;
            l.ids.forEach(function (id) {
              addFlow(G, n.id, id, 'read', each);
              var c = G.N[id];
              if (l.fallback && isLeafCache(c)) {
                var miss = each * (1 - h);
                if (!(miss > 0)) return;
                if (l.fallback.dead) n.dropped += miss;
                else splitTo(G, n.id, l.fallback.ids, 'read', miss);
              }
            });
          });
        } else {
          r.lanes.forEach(function (l) {
            if (l.dead) { n.dropped += amt; return; }
            splitTo(G, n.id, l.ids, 'write', amt);
          });
        }
        return;
      }
      case 'db':
        if (cls === 'read') {
          if (!r.ids.length) return;
          var k = r.ids.length + 1, part = amt / k;
          n.read -= amt - part;
          n.demand -= amt - part;
          r.ids.forEach(function (id) { addFlow(G, n.id, id, 'read', part); });
        } else if (r.ids.length) {
          // Change data capture: every committed write is published.
          r.ids.forEach(function (id) { addFlow(G, n.id, id, 'write', amt); });
        }
        return;
      case 'queue':
        if (cls !== 'write') return;
        r.groups.forEach(function (g) {
          var key = n.id + ':' + g.key;
          var prev = (P.backlog && P.backlog[key]) || 0;
          var cap = 0;
          g.ids.forEach(function (id) { cap += G.N[id].cap; });
          var want = amt + prev / P.dt;
          var del = g.dead ? 0 : Math.min(want, cap);
          G.lag[key] = { queue: n.id, group: g.key, ids: g.all.slice(), inflow: amt, cap: cap, delivered: del,
            backlog: Math.max(0, prev + (amt - del) * P.dt) };
          if (g.dead) return;
          g.ids.forEach(function (id) {
            var c = G.N[id], w = c.cap / cap;
            c.consumer = true;
            addFlow(G, n.id, id, 'write', del * w);
            c.demand += Math.max(0, amt - del) * w;   // what it would take to keep up
            if (del < want - 1e-9) c.pullCapped = true;
          });
          if (amt > cap + 1e-9) n.lagging = true;
        });
        return;
      default:
        return;
    }
  }
  function propagate(G, sc, P) {
    var total = sc.rps * P.mult;
    var R = total * clampNum(sc.readPct, 0, 100, 50) / 100, W = total - R;
    var nc = G.clients.length;
    G.clients.forEach(function (id) {
      var n = G.N[id];
      n.read += R / nc; n.write += W / nc; n.demand += total / nc;
    });
    G.topo.forEach(function (id) {
      var n = G.N[id];
      if (n.down) { n.dropped += n.read + n.write; return; }
      route(G, n, 'read', n.read, P);
      route(G, n, 'write', n.write, P);
    });
    G.ids.forEach(function (id) {
      var n = G.N[id];
      n.load = n.read + n.write;
      if (n.cat === 'client') { n.util = 0; n.served = 1; }
      else {
        n.util = n.cap === Infinity ? 0 : (n.cap > 0 ? n.load / n.cap : (n.load > 0 ? Infinity : 0));
        n.served = n.down ? 0 : (n.util > 1 ? 1 / n.util : 1);
      }
      n.status = n.down ? 'down' : !n.reachable ? 'unwired' : n.cat === 'client' ? (n.load > 0 ? 'ok' : 'idle')
        : n.load <= 0 ? 'idle' : n.util > 1 ? 'over' : n.util >= HOT_UTIL ? 'hot' : 'ok';
    });
  }

  // ───────────────────────── Monte Carlo latency ─────────────────────────
  var FAIL = { ok: false };
  function hop(n, rand) {
    if (!(n.base > 0)) return 0;
    var S = n.base, t = S * Math.exp(SIGMA * rand.gauss());
    if (rand() < TAIL_P) t += S * TAIL_X;
    var u = n.util;
    if (u >= 1) {
      // A saturated tier: whatever gets in waits behind a full queue.
      t += Math.min(2000, S * 40) * (0.6 + 0.8 * rand());
    } else if (u > 0.5) {
      var c = n.conc * Math.max(1, n.live);
      var pw = Math.pow(u, Math.sqrt(2 * (c + 1)) - 1);
      if (rand() < pw) t += -Math.log(1 - rand()) * S / (c * (1 - u));
    }
    return t;
  }
  function chain(n, t, sub) {
    if (!sub.ok) return FAIL;
    return { ok: true, t: t + sub.t, path: n.id + (sub.path ? '>' + sub.path : '') };
  }
  function done(n, t) { return { ok: true, t: t, path: String(n.id) }; }
  function visit(G, id, cls, fallback, rand, h, depth) {
    var n = G.N[id];
    if (!n || depth > 64) return FAIL;
    var r = n.routes && n.routes[cls];
    // A database with replicas picks the serving node before it does any work.
    if (n.role === 'db' && cls === 'read' && r && r.ids.length) {
      var k = (rand() * (r.ids.length + 1)) | 0;
      if (k > 0) return visit(G, r.ids[k - 1], 'read', null, rand, h, depth + 1);
    }
    if (n.down) return FAIL;
    if (n.served < 1 && rand() > n.served) return FAIL;
    var t = hop(n, rand), sub;
    if (!r) return done(n, t);
    switch (n.role) {
      case 'forward':
        if (!r.ids.length) return FAIL;
        return chain(n, t, visit(G, pickOne(r.ids, rand), cls, null, rand, h, depth + 1));
      case 'cdn':
        if (cls === 'read' && rand() < h) return done(n, t);
        if (!r.ids.length) return FAIL;
        return chain(n, t, visit(G, pickOne(r.ids, rand), cls, null, rand, h, depth + 1));
      case 'cache':
        if (cls === 'read') {
          if (rand() < h) return done(n, t);
          if (!r.lanes.length) {
            if (fallback) {
              if (fallback.dead) return FAIL;
              return chain(n, t, visit(G, pickOne(fallback.ids, rand), 'read', null, rand, h, depth + 1));
            }
            return done(n, t);
          }
        } else if (!r.lanes.length) return done(n, t);
        /* falls through */
      case 'compute': {
        if (!r.lanes.length) return done(n, t);
        if (cls === 'read') {
          var l = pickOne(r.lanes, rand);
          if (l.dead) return FAIL;
          return chain(n, t, visit(G, pickOne(l.ids, rand), 'read', l.fallback, rand, h, depth + 1));
        }
        var worst = null;
        for (var i = 0; i < r.lanes.length; i++) {
          var wl = r.lanes[i];
          if (wl.dead) return FAIL;
          sub = visit(G, pickOne(wl.ids, rand), 'write', null, rand, h, depth + 1);
          if (!sub.ok) return FAIL;
          if (!worst || sub.t > worst.t) worst = sub;
        }
        return chain(n, t, worst);
      }
      default:
        // Databases, stores and queues end the synchronous path. Work behind a
        // queue (and CDC out of a database) is asynchronous.
        return done(n, t);
    }
  }
  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    var i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[i];
  }
  function sample(G, sc, P, count, seed) {
    var out = { n: 0, errRate: 0, p50: 0, p95: 0, p99: 0, mean: 0, slowPath: [] };
    if (!count || !G.clients.length) return out;
    var rand = rng(seed), readP = clampNum(sc.readPct, 0, 100, 50) / 100;
    var lat = [], paths = [], errs = 0;
    for (var i = 0; i < count; i++) {
      var cls = rand() < readP ? 'read' : 'write';
      var res = visit(G, pickOne(G.clients, rand), cls, null, rand, P.hit, 0);
      if (res.ok) { lat.push(res.t); paths.push(res.path); } else errs++;
    }
    out.n = count;
    out.errRate = errs / count;
    if (!lat.length) return out;
    var idx = lat.map(function (_, i) { return i; }).sort(function (a, b) { return lat[a] - lat[b]; });
    var sorted = idx.map(function (i) { return lat[i]; });
    out.p50 = quantile(sorted, 0.5);
    out.p95 = quantile(sorted, 0.95);
    out.p99 = quantile(sorted, 0.99);
    out.mean = sorted.reduce(function (s, v) { return s + v; }, 0) / sorted.length;
    // The path most often seen at or beyond P99 is the one that sets the tail.
    var counts = {}, best = null;
    for (var j = Math.floor(sorted.length * 0.99); j < sorted.length; j++) {
      var p = paths[idx[j]];
      counts[p] = (counts[p] || 0) + 1;
      if (!best || counts[p] > counts[best]) best = p;
    }
    out.slowPath = best ? best.split('>').map(Number) : [];
    return out;
  }

  // ───────────────────────── one simulation ─────────────────────────
  function simulate(design, sc, opts) {
    opts = opts || {};
    var P = {
      mult: opts.mult == null ? 1 : Math.max(0, +opts.mult),
      hit: clampNum(opts.hit == null ? sc.cacheHit : opts.hit, 0, 100, 0) / 100,
      backlog: opts.backlog || null,
      dt: opts.dt || 1
    };
    var G = prepare(design, opts);
    buildRoutes(G);
    propagate(G, sc, P);
    var count = opts.samples == null ? 3000 : opts.samples;
    var S = sample(G, sc, P, count, opts.seed == null ? designSeed(design) : opts.seed);

    var total = sc.rps * P.mult;
    var res = {
      mult: P.mult, hit: P.hit, budget: sc.p99Budget || 0,
      nodes: {}, flow: G.flow, lag: [], back: G.back, clients: G.clients.length,
      offered: total, served: total * (1 - S.errRate), errRate: S.errRate,
      p50: S.p50, p95: S.p95, p99: S.p99, mean: S.mean, samples: S.n, slowPath: S.slowPath,
      cost: monthlyCost(design)
    };
    G.ids.forEach(function (id) {
      var n = G.N[id];
      res.nodes[id] = { id: id, type: n.type, cat: n.cat, label: n.label, inst: n.inst, live: n.live, down: n.down,
        read: n.read, write: n.write, load: n.load, demand: n.demand, cap: n.cap, util: n.util, served: n.served,
        status: n.status, reachable: n.reachable, consumer: n.consumer, pullCapped: n.pullCapped, lagging: n.lagging,
        dropped: n.dropped, deadEnd: n.deadEnd, slowBy: n.slowBy, lane: laneKey(n) };
    });
    Object.keys(G.lag).forEach(function (k) { res.lag.push(G.lag[k]); });
    var loaded = G.ids.filter(function (id) { var n = G.N[id]; return n.reachable && n.cat !== 'client' && n.load > 0; });
    var writes = total * (1 - clampNum(sc.readPct, 0, 100, 50) / 100);
    res.hasTraffic = loaded.length > 0;
    res.hasDurable = loaded.some(function (id) {
      var n = G.N[id];
      return !!n.comp.durable && (writes > 0 ? n.write > 0 : n.load > 0);
    });
    res.anyOver = loaded.some(function (id) { return G.N[id].util > 1 + 1e-9; });
    res.lagging = res.lag.some(function (l) { return l.inflow > l.cap + 1e-9; });
    res.lagSec = res.lag.reduce(function (m, l) { return Math.max(m, l.cap > 0 ? l.backlog / l.cap : (l.backlog > 0 ? Infinity : 0)); }, 0);
    res.passed = res.hasTraffic && !res.anyOver && !res.lagging && S.errRate <= ERR_OK;
    res.latencyOk = res.hasTraffic && S.errRate <= ERR_OK && (!res.budget || S.p99 <= res.budget);
    // Breaking point: loads are linear in the multiplier (pull-capped consumers
    // aside), so the first tier to hit 100% sets it.
    var minRatio = Infinity, limiter = null;
    loaded.forEach(function (id) {
      var n = G.N[id];
      if (n.consumer || n.cap === Infinity || !(n.load > 0)) return;
      var ratio = n.cap / n.load;
      if (ratio < minRatio) { minRatio = ratio; limiter = id; }
    });
    res.breaking = { mult: minRatio === Infinity ? Infinity : P.mult * minRatio, rps: minRatio === Infinity ? Infinity : total * minRatio, node: limiter };
    res.modes = detectModes(G, res, sc, opts);
    return res;
  }

  // ───────────────────────── findings ─────────────────────────
  function names(G, ids) { return ids.map(function (id) { return G.N[id].label; }); }
  function listText(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function detectModes(G, res, sc, opts) {
    var modes = [];
    function add(kind, sev, node, detail, fix) { modes.push({ kind: kind, sev: sev, node: node, detail: detail, fix: fix }); }
    var N = G.N;
    if (!G.clients.length) {
      add('No Client', 'error', null, 'Nothing on the canvas generates traffic.', 'Add a Client from the library and connect it to your entry point.');
      return modes;
    }
    if (!G.clients.some(function (id) { return G.fwd[id].length; })) {
      add('Not Connected', 'error', G.clients[0], 'The Client is not connected to anything yet, so every request fails.',
        'Drag from the Client\u2019s right-hand handle onto a Load Balancer or CDN.');
    }
    var unwired = G.ids.filter(function (id) { return !N[id].reachable && N[id].cat !== 'client'; });
    if (unwired.length) {
      var idle = unwired.reduce(function (s, id) { return s + (N[id].comp.cost || 0) * N[id].inst; }, 0);
      add('Unwired Components', 'warn', unwired[0], listText(names(G, unwired).slice(0, 4)) + (unwired.length > 4 ? ' and ' + (unwired.length - 4) + ' more' : '') +
        (unwired.length === 1 ? ' is' : ' are') + ' not reachable from the Client, so ' + (unwired.length === 1 ? 'it carries' : 'they carry') +
        ' no traffic and earn no credit' + (idle ? ', yet still cost ' + fmtMoney(idle) + '/mo' : '') + '.',
        'Wire ' + (unwired.length === 1 ? 'it' : 'them') + ' into the request path, or delete ' + (unwired.length === 1 ? 'it' : 'them') + '.');
    }
    G.back.forEach(function (b) {
      add('Loop Ignored', 'info', b[1], N[b[0]].label + ' \u2192 ' + N[b[1]].label + ' closes a loop. Requests cannot circle forever, so that connection carries no traffic.',
        'Delete that connection, or reverse it if you meant the other direction.');
    });
    G.ids.forEach(function (id) {
      var n = N[id];
      if (!n.deadEnd || !n.reachable) return;
      var classes = Object.keys(n.deadEnd);
      var why = classes.some(function (c) { return n.deadEnd[c] === 'down'; }) ? 'everything behind it is down' : 'nothing behind it can serve ' + listText(classes.map(function (c) { return c + 's'; }));
      add('Dead End', 'error', id, classes.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1) + 's'; }).join(' and ') + ' reach the ' + n.label + ' and stop: ' + why + '.',
        n.cat === 'cdn' ? 'A CDN needs an origin: connect it to a Load Balancer or app tier.' : 'Connect it to the tier that serves those requests.');
    });
    G.clients.forEach(function (cid) {
      var direct = G.fwd[cid].map(function (e) { return N[e.to]; }).filter(function (c) { return c.cat === 'compute'; });
      if (direct.length) add('No Load Balancer', 'warn', direct[0].id, 'Clients call ' + direct[0].label + ' directly. Nothing spreads load across instances or routes around a dead one.',
        'Put a Load Balancer or API Gateway between the Client and the app tier.');
    });
    // Saturation
    G.ids.forEach(function (id) {
      var n = N[id];
      if (!n.reachable || n.cat === 'client' || !(n.util > 1 + 1e-9)) return;
      var shed = 1 - n.served;
      var detail = n.label + ' receives ' + fmtNum(n.load) + ' req/s but ' + n.live + ' instance' + (n.live === 1 ? ' tops' : 's top') +
        ' out at ' + fmtNum(n.cap) + '. About ' + pct(shed) + ' of requests through it are shed and the rest queue.';
      var fix, kind = 'Throughput Bottleneck';
      if (n.cat === 'db') {
        kind = 'Database Saturation';
        fix = n.read > n.write ? 'Reads dominate: put a cache in front, add read replicas, or raise instances (shards).' : 'Writes dominate: shard it (raise instances), pick a write-optimised store, or buffer writes through a queue.';
      } else if (n.cat === 'queue') { kind = 'Queue Overload'; fix = 'Add partitions/brokers (raise instances) so ingest keeps up.'; }
      else if (n.cat === 'cache') { kind = 'Cache Saturation'; fix = 'Add shards (raise instances).'; }
      else if (n.cat === 'blob') { fix = 'Put a CDN in front for reads, or raise instances (prefix partitions).'; }
      else fix = 'Raise the instance count so instances share the load.';
      add(kind, 'error', id, detail, fix);
    });
    // Missing cache
    var hasCache = G.ids.some(function (id) { var n = N[id]; return n.reachable && n.load > 0 && (n.cat === 'cache' || n.cat === 'cdn'); });
    if (sc.readPct >= 70 && !hasCache && G.ids.some(function (id) { var n = N[id]; return n.reachable && n.cat === 'db' && n.util >= HOT_UTIL; })) {
      add('Missing Cache', 'warn', null, 'The workload is ' + sc.readPct + '% reads, yet every read reaches the database. Nothing absorbs the hot keys.',
        'Put a Redis cache (or CDN, for public content) in front of the database.');
    }
    // Consumer lag
    res.lag.forEach(function (l) {
      if (!(l.inflow > l.cap + 1e-9)) return;
      var q = N[l.queue], who = l.ids.length ? N[l.ids[0]].label : 'consumers';
      add('Consumer Lag', 'error', l.ids[0] || l.queue, q.label + ' is fed ' + fmtNum(l.inflow) + ' msg/s but ' + who + ' drain' + (l.ids.length === 1 && N[l.ids[0]].live === 1 ? 's' : '') +
        ' only ' + fmtNum(l.cap) + '/s. The backlog grows by ' + fmtNum(l.inflow - l.cap) + ' messages every second, so async work falls further behind forever.',
        'Add consumer instances so the drain rate beats the inflow.');
    });
    // Queue with no consumer that does not retain
    G.ids.forEach(function (id) {
      var n = N[id];
      if (n.cat !== 'queue' || !n.reachable || !(n.write > 0) || n.comp.durable) return;
      if (n.routes && n.routes.write.groups && n.routes.write.groups.length) return;
      add('No Consumer', 'warn', id, 'Messages published to ' + n.label + ' have no consumer, and ' + n.label + ' does not retain them.', 'Connect a Worker (or another consumer) behind it.');
    });
    // Running hot
    G.ids.forEach(function (id) {
      var n = N[id];
      if (!n.reachable || n.cat === 'client' || n.pullCapped || n.down) return;
      if (n.util >= HOT_UTIL && n.util <= 1 + 1e-9) {
        add('Running Hot', 'warn', id, n.label + ' is at ' + Math.round(n.util * 100) + '%. Queueing delay climbs steeply past ~85%, and losing one instance would tip it over.',
          'Add an instance for headroom (N+1).');
      }
    });
    // Single points of failure
    var laneCount = {};
    G.ids.forEach(function (id) { var n = N[id]; if (n.reachable && n.load > 0 && n.cat !== 'client') { var k = laneKey(n); laneCount[k] = (laneCount[k] || 0) + 1; } });
    G.ids.forEach(function (id) {
      var n = N[id];
      if (!n.reachable || n.cat === 'client' || !(n.load > 0) || n.down || n.inst > 1 || laneCount[laneKey(n)] > 1) return;
      if (n.cat === 'cache') {
        add('Single Cache Instance', 'warn', id, 'One ' + n.label + ' instance. When it restarts, every read it was absorbing falls through to the database at once (thundering herd).',
          'Run 2+ instances (replicated shards) so a restart costs a slice, not the tier.');
      } else {
        add('Single Point of Failure', 'warn', id, 'Only one ' + n.label + ' instance. If it dies, everything that goes through it fails.', 'Run 2+ instances (the + control).');
      }
    });
    // Latency
    if (res.budget && res.hasTraffic && res.p99 > res.budget && res.samples) {
      var chainTxt = res.slowPath.length ? res.slowPath.map(function (id) { return N[id] ? N[id].label : '?'; }).join(' \u2192 ') : 'the request path';
      add('Latency Budget Exceeded', 'error', null, 'P99 is ' + Math.round(res.p99) + 'ms against a ' + res.budget + 'ms budget. The tail is set by ' + chainTxt + '.',
        res.anyOver ? 'Fix the saturated tier first: queueing on an overloaded node dominates the tail.'
          : 'Shorten that path, or cache in front of its slowest hop. More instances will not help: the delay is hops, not capacity.');
    }
    // Durability
    if (!opts.statefree && res.hasTraffic && !res.hasDurable) {
      var replicaOnly = G.ids.some(function (id) { return N[id].reachable && N[id].cat === 'replica'; }) && !G.ids.some(function (id) { return N[id].reachable && N[id].cat === 'db'; });
      add('No Durable Store', 'error', null, replicaOnly ? 'Writes have nowhere to land: a read replica is a read-only copy of a primary that does not exist.'
        : 'No component that survives a restart receives the writes. A cache is not a system of record: restart it and the data is gone.',
        replicaOnly ? 'Add the primary database and point writes at it.' : 'Add a database or object store as the source of truth.');
    }
    // Over-provisioning
    var over = [], wasted = 0;
    G.ids.forEach(function (id) {
      var n = N[id];
      if (!n.reachable || n.cat === 'client' || !(n.demand > 0) || n.comp.maxRPS === Infinity) return;
      var want = Math.ceil(n.demand / (TARGET_UTIL * n.comp.maxRPS)) + 1;
      if (n.inst > 2 * want + 1) { over.push(n.label + ' \u00d7' + n.inst + ' (needs ~' + want + ')'); wasted += (n.comp.cost || 0) * (n.inst - want); }
    });
    if (over.length) {
      add('Over-Provisioned', 'warn', null, over.join(', ') + '. That is roughly ' + fmtMoney(wasted) + '/mo of idle capacity.',
        'Size each tier to its load plus one spare. "Scale everything" reads as guessing in an interview.');
    }
    var rank = { error: 0, warn: 1, info: 2 };
    modes.sort(function (a, b) { return rank[a.sev] - rank[b.sev]; });
    return modes;
  }

  // ───────────────────────── chaos ─────────────────────────
  function loadedIds(res) {
    return Object.keys(res.nodes).map(Number).filter(function (id) { var n = res.nodes[id]; return n.reachable && n.cat !== 'client' && n.load > 0 && !n.down; });
  }
  // Remove one instance from each loaded tier in turn and replay the load.
  function resilience(design, sc, opts) {
    opts = opts || {};
    var base = simulate(design, sc, { samples: 0, statefree: opts.statefree });
    var seed = designSeed(design);
    var results = loadedIds(base).map(function (id, i) {
      var f = {}; f[id] = 1;
      var r = simulate(design, sc, { failures: f, samples: opts.samples || 1500, seed: seed + 104729 * (i + 1), statefree: opts.statefree });
      var overloaded = Object.keys(r.nodes).map(Number).filter(function (k) { var x = r.nodes[k]; return x.reachable && x.util > 1 + 1e-9; });
      var n = base.nodes[id];
      return { id: id, label: n.label, cat: n.cat, inst: n.inst, errRate: r.errRate, lagging: r.lagging,
        ok: r.errRate <= ERR_OK, overloaded: overloaded,
        herd: n.cat === 'cache' && overloaded.some(function (k) { return r.nodes[k].cat === 'db' || r.nodes[k].cat === 'replica'; }) };
    });
    return { ok: results.length > 0 && results.every(function (x) { return x.ok; }), results: results };
  }
  // A burst of `mult` for 15s: synchronous tiers must hold it, and anything
  // queued must drain within 60s once traffic falls back to normal.
  function burstTest(design, sc, mult, opts) {
    opts = opts || {};
    var hi = simulate(design, sc, { mult: mult, samples: opts.samples || 2000, statefree: opts.statefree });
    var lo = simulate(design, sc, { mult: 1, samples: 0, statefree: opts.statefree });
    var base = {};
    lo.lag.forEach(function (l) { base[l.queue + ':' + l.group] = l.inflow; });
    var worstDrain = 0;
    hi.lag.forEach(function (l) {
      var backlog = Math.max(0, l.inflow - l.cap) * 15;
      if (!backlog) return;
      var rate = l.cap - (base[l.queue + ':' + l.group] || 0);
      worstDrain = Math.max(worstDrain, rate > 0 ? backlog / rate : Infinity);
    });
    return { mult: mult, errRate: hi.errRate, drainSec: worstDrain, ok: hi.hasTraffic && hi.errRate <= ERR_OK && worstDrain <= 60, result: hi };
  }

  var PATTERNS = {
    steady: { label: 'Steady load', dur: 30, at: function () { return 1; } },
    spike: { label: 'Flash spike (2\u00d7 for 15s)', dur: 50, at: function (t) { return t >= 15 && t < 30 ? 2 : 1; } },
    ramp: { label: 'Ramp to 3\u00d7 (find the breaking point)', dur: 60, at: function (t) { return 0.25 + 2.75 * t / 60; } },
    daily: { label: 'Daily cycle (0.4\u00d7 to 1.3\u00d7)', dur: 60, at: function (t) { return 0.4 + 0.9 * (1 - Math.cos(2 * Math.PI * t / 60)) / 2; } }
  };
  var CHAOS = {
    none: { label: 'No chaos' },
    'kill-busiest': { label: 'Kill one instance of the busiest tier' },
    'cache-flush': { label: 'Flush every cache (cold restart)' },
    'db-down': { label: 'Primary database goes down' },
    'slow-dep': { label: 'Slow dependency (+150ms on the busiest store)' },
    'zone-outage': { label: 'Zone outage (lose a third of every tier)' }
  };
  function chaosTarget(kind, base) {
    var ids = loadedIds(base), best = null;
    function by(filter, key) {
      ids.filter(filter).forEach(function (id) { var n = base.nodes[id]; if (best == null || key(n) > key(base.nodes[best])) best = id; });
    }
    if (kind === 'kill-busiest') by(function () { return true; }, function (n) { return n.util; });
    else if (kind === 'db-down') { by(function (id) { return base.nodes[id].cat === 'db'; }, function (n) { return n.load; }); }
    else if (kind === 'slow-dep') {
      by(function (id) { var c = base.nodes[id].cat; return c === 'db' || c === 'search' || c === 'blob' || c === 'replica'; }, function (n) { return n.load; });
      if (best == null) by(function (id) { return base.nodes[id].cat === 'cache'; }, function (n) { return n.load; });
    }
    return best;
  }
  function chaosNote(kind, target, base) {
    var n = target != null ? base.nodes[target] : null;
    switch (kind) {
      case 'kill-busiest': return n ? 'One ' + n.label + ' instance is killed' + (n.inst === 1 ? ' - it was the only one.' : ' (' + n.inst + ' \u2192 ' + (n.inst - 1) + ').') : 'Nothing is carrying load yet.';
      case 'cache-flush': return 'Every cache and CDN restarts empty and refills over ~20s.';
      case 'db-down': return n ? n.label + ' goes down completely.' : 'There is no database to take down.';
      case 'slow-dep': return n ? n.label + ' slows down by 150ms per request.' : 'There is no store to slow down.';
      case 'zone-outage': return 'One of three zones fails: every tier loses a third of its instances (rounded up).';
      default: return '';
    }
  }
  // A stateful run: call step(t) for t = 0..dur-1. Queue backlogs carry over
  // between ticks, which is how a queue visibly absorbs a spike.
  function makeRun(design, sc, o) {
    o = o || {};
    var pat = PATTERNS[o.pattern] ? o.pattern : 'steady';
    var chaos = CHAOS[o.chaos] ? o.chaos : 'none';
    var mult0 = o.mult || 1, userFail = o.failures || {}, userSlow = o.slow || {};
    var base = simulate(design, sc, { mult: mult0, samples: 0, failures: userFail, slow: userSlow });
    var target = chaos === 'none' || chaos === 'cache-flush' || chaos === 'zone-outage' ? null : chaosTarget(chaos, base);
    var backlog = {}, seed = designSeed(design);
    return {
      dur: PATTERNS[pat].dur, pattern: pat, chaos: chaos, chaosAt: CHAOS_AT, target: target,
      note: chaos === 'none' ? '' : chaosNote(chaos, target, base),
      step: function (t) {
        var m = mult0 * PATTERNS[pat].at(t);
        var f = {}, s = {}, hit = sc.cacheHit;
        Object.keys(userFail).forEach(function (k) { f[k] = userFail[k]; });
        Object.keys(userSlow).forEach(function (k) { s[k] = userSlow[k]; });
        var active = chaos !== 'none' && t >= CHAOS_AT;
        if (active) {
          if (chaos === 'kill-busiest' && target != null) f[target] = f[target] === 'down' ? 'down' : (f[target] | 0) + 1;
          else if (chaos === 'db-down' && target != null) f[target] = 'down';
          else if (chaos === 'slow-dep' && target != null) s[target] = (s[target] || 0) + 150;
          else if (chaos === 'cache-flush') hit = sc.cacheHit * (1 - Math.exp(-(t - CHAOS_AT) / 7));
          else if (chaos === 'zone-outage') {
            design.nodes.forEach(function (n) {
              var c = findComp(n.type);
              if (!c || c.cat === 'client' || f[n.id] === 'down') return;
              f[n.id] = (f[n.id] | 0) + Math.ceil((n.instances || 1) / 3);
            });
          }
        }
        var r = simulate(design, sc, { mult: m, hit: hit, failures: f, slow: s, backlog: backlog, dt: 1,
          samples: o.samples || 700, seed: seed + 7919 * (t + 1), statefree: o.statefree });
        backlog = {};
        r.lag.forEach(function (l) { backlog[l.queue + ':' + l.group] = l.backlog; });
        return { t: t, mult: m, active: active, hit: hit, result: r };
      }
    };
  }

  // ───────────────────────── scoring ─────────────────────────
  var DIMENSIONS = [
    { id: 'architecture', label: 'Architecture', weight: 25, blurb: 'The right building blocks, wired into the request path.' },
    { id: 'scalability', label: 'Scalability', weight: 25, blurb: 'Carries the target load with nothing saturated and no growing backlog.' },
    { id: 'latency', label: 'Latency', weight: 15, blurb: 'End-to-end P99 of the synchronous path within budget.' },
    { id: 'reliability', label: 'Reliability', weight: 25, blurb: 'Durable writes, and no single failure takes it down.' },
    { id: 'cost', label: 'Cost', weight: 10, blurb: 'Sized to the load rather than to guesswork.' }
  ];
  function verdictFor(score) {
    if (score >= 90) return { t: 'Strong Hire', tone: 'good' };
    if (score >= 75) return { t: 'Hire', tone: 'good' };
    if (score >= 55) return { t: 'Lean No Hire', tone: 'warn' };
    return { t: 'No Hire', tone: 'bad' };
  }
  function evaluate(ch, design, opts) {
    opts = opts || {};
    var sc = ch.scale;
    var steady = simulate(design, sc, { samples: opts.samples || 6000, statefree: ch.statefree });
    var res = steady.passed ? resilience(design, sc, { statefree: ch.statefree }) : null;
    var burst = sc.burst && steady.passed ? burstTest(design, sc, sc.burst, { statefree: ch.statefree }) : null;
    var ref = ch.ref && ch.ref.stack ? buildReference(ch) : null;
    var refCost = ref ? monthlyCost(ref) : 0;
    var cost = monthlyCost(design);
    var ratio = refCost > 0 ? cost / refCost : 1;
    var loadedCats = {};
    Object.keys(steady.nodes).forEach(function (id) {
      var n = steady.nodes[id];
      if (n.reachable && n.load > 0 && n.cat !== 'client') loadedCats[n.cat] = true;
    });
    var helper = {
      has: function () { for (var i = 0; i < arguments.length; i++) { if (loadedCats[arguments[i]]) return true; } return false; },
      simPassed: steady.passed, latencyOk: steady.latencyOk, hasDurable: steady.hasDurable
    };
    var checks = (ch.rubric || []).map(function (r) { return { label: r.label, dim: r.dim || 'architecture', pass: !!r.test(helper), cats: r.cats || null }; });
    checks.push({ label: 'Survives losing any one instance (chaos sweep)', dim: 'reliability', pass: !!(res && res.ok), auto: 'resilience',
      note: res ? null : 'Runs once the design handles the target load.' });
    if (sc.burst) checks.push({ label: 'Absorbs a ' + sc.burst + '\u00d7 burst for 15s', dim: 'scalability', pass: !!(burst && burst.ok), auto: 'burst',
      note: burst ? null : 'Runs once the design handles the target load.' });
    if (refCost > 0) checks.push({ label: 'Costs no more than ' + COST_SLACK + '\u00d7 the reference', dim: 'cost', pass: steady.passed && ratio <= COST_SLACK, auto: 'cost',
      note: steady.passed ? null : 'Only counts once the design handles the load: a design that drops requests is cheap for the wrong reason.' });

    var dims = DIMENSIONS.map(function (d) {
      var mine = checks.filter(function (c) { return c.dim === d.id; });
      return { id: d.id, label: d.label, blurb: d.blurb, weight: d.weight, checks: mine,
        passed: mine.filter(function (c) { return c.pass; }).length, total: mine.length };
    }).filter(function (d) { return d.total > 0; });
    var wsum = dims.reduce(function (s, d) { return s + d.weight; }, 0) || 1;
    var score = 0;
    dims.forEach(function (d) {
      d.weight = d.weight * 100 / wsum;
      d.earned = d.weight * d.passed / d.total;
      d.pct = Math.round(100 * d.passed / d.total);
      score += d.earned;
    });
    score = Math.round(score);
    return { score: score, verdict: verdictFor(score), dims: dims, checks: checks, steady: steady, resilience: res, burst: burst,
      cost: cost, refCost: refCost, ratio: ratio, ref: ref };
  }

  // ───────────────────────── reference architecture ─────────────────────────
  // ref.stack lists technologies, not a wiring order, so they are grouped by
  // role and wired into the standard topology:
  //
  //   client -> [CDN] -> [LB] -> app -+-> cache -> db / replica
  //                                   +-> search, object store
  //                                   +-> queue -> worker -> db
  function colX(col) { return 40 + col * 260; }
  function buildReference(ch) {
    var design = { nodes: [], edges: [], nextId: 1 };
    var role = { cdn: [], lb: [], app: [], worker: [], cache: [], db: [], replica: [], queue: [], search: [], blob: [] };
    ((ch.ref && ch.ref.stack) || []).forEach(function (lbl) {
      var id = LABEL2ID[lbl];
      var c = id && findComp(id);
      if (!c) return;
      if (id === 'worker' || id === 'stream') role.worker.push(id);
      else if (role[c.cat]) role[c.cat].push(id);
      else role.app.push(id);
    });
    var rows = {};
    function place(types, col) {
      return types.map(function (t) {
        var r = rows[col] || 0;
        rows[col] = r + 1;
        var id = design.nextId++;
        design.nodes.push({ id: id, type: t, x: colX(col), y: 60 + r * 104, instances: 1 });
        return id;
      });
    }
    function wire(from, to) {
      from.forEach(function (a) { to.forEach(function (b) {
        if (a !== b && !design.edges.some(function (e) { return e.from === a && e.to === b; })) design.edges.push({ from: a, to: b });
      }); });
    }
    var client = place(['client'], 0);
    var cdn = place(role.cdn, 1);
    var lb = place(role.lb, cdn.length ? 2 : 1);
    var app = place(role.app.length ? role.app : ['app-server'], cdn.length ? 3 : 2);
    var appCol = cdn.length ? 3 : 2;
    var cache = place(role.cache, appCol + 1);
    var side = place(role.search.concat(role.blob), appCol + 1);
    var queue = place(role.queue, appCol + 1);
    // Workers sit between the queue and the stores, so the stores move one
    // column right when there are any; every edge then points rightwards.
    var worker = place(role.worker, appCol + 2);
    var store = place(role.db.concat(role.replica), appCol + (worker.length ? 3 : 2));
    var edge = cdn.length ? cdn : (lb.length ? lb : app);
    wire(client, edge);
    if (cdn.length) wire(cdn, lb.length ? lb : app);
    if (lb.length) wire(lb, app);
    if (cache.length) { wire(app, cache); wire(cache, store); }
    else wire(app, store);
    wire(app, side);
    if (queue.length) {
      wire(app, queue);
      if (worker.length) { wire(queue, worker); wire(worker, store); }
    } else if (worker.length) { wire(app, worker); wire(worker, store); }
    sizeDesign(design, ch.scale, ch.statefree);
    return design;
  }
  // N+1 at <= 75%: every tier gets enough instances to run at 75% or less with
  // one of them gone. Synchronous tiers also hold a burst at <= 100%.
  function sizeDesign(design, sc, statefree) {
    for (var pass = 0; pass < 5; pass++) {
      var A = simulate(design, sc, { samples: 0, statefree: statefree });
      var B = sc.burst ? simulate(design, sc, { mult: sc.burst, samples: 0, statefree: statefree }) : null;
      var changed = false;
      design.nodes.forEach(function (n) {
        var c = findComp(n.type);
        if (!c || c.maxRPS === Infinity) return;
        var a = A.nodes[n.id];
        if (!a || !a.reachable) return;
        var need = Math.ceil(a.demand / (TARGET_UTIL * c.maxRPS)) + 1;
        if (B && !B.nodes[n.id].consumer) need = Math.max(need, Math.ceil(B.nodes[n.id].demand / c.maxRPS));
        need = clampInt(need, 1, MAX_INSTANCES);
        if (need !== n.instances) { n.instances = need; changed = true; }
      });
      if (!changed) break;
    }
    return design;
  }

  // ───────────────────────── share links ─────────────────────────
  // A design packed into a few dozen bytes for the URL fragment:
  //
  //   version byte (3), varint node count, then per node:
  //     varint (typeIndex << 1 | hasLabel), varint instances,
  //     zigzag varint dx, zigzag varint dy  (10px units, delta from the
  //     previous node, so a tidy layout costs about a byte per axis),
  //     [varint byteLength, UTF-8 label]
  //   varint edge count, then per edge: varint from, varint (to << 2 | kind)
  //
  // Node ids are renumbered 1..N on decode; they are internal. The previous
  // format (base64 JSON) still decodes, so links already shared keep working.
  //
  // SHARE_TYPES is APPEND-ONLY. A type's position is its wire code: reordering
  // or removing an entry silently changes what every existing link decodes to.
  var SHARE_TYPES = ['client', 'load-balancer', 'api-gateway', 'cdn', 'app-server', 'microservice', 'websocket', 'worker', 'stream',
    'postgresql', 'mysql', 'mongodb', 'dynamodb', 'cassandra', 'tsdb', 'db-replica', 'redis', 'memcached',
    'kafka', 'rabbitmq', 'sqs', 'pubsub', 's3', 'elasticsearch', 'vector-db'];
  var SHARE_V = 3, SHARE_Q = 10;
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64urlEncode(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
      if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
      if (i + 2 < bytes.length) s += B64[n & 63];
    }
    return s;
  }
  function b64urlDecode(str) {
    var map = {}, out = [], buf = 0, bits = 0;
    for (var k = 0; k < 64; k++) map[B64[k]] = k;
    str = String(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    for (var i = 0; i < str.length; i++) {
      var v = map[str[i]];
      if (v === undefined) return null;
      buf = (buf << 6) | v; bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return out;
  }
  function utf8Bytes(s) { var b = unescape(encodeURIComponent(s)), out = []; for (var i = 0; i < b.length; i++) out.push(b.charCodeAt(i)); return out; }
  function utf8String(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return decodeURIComponent(escape(s)); }
  function encodeShare(design) {
    var d = normalizeDesign(design), out = [SHARE_V];
    function uv(n) { n = Math.max(0, Math.floor(n)); while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); } out.push(n); }
    function sv(n) { n = Math.round(n); uv(n < 0 ? -2 * n - 1 : 2 * n); }
    var index = {}, px = 0, py = 0;
    var nodes = d.nodes.filter(function (n) { return SHARE_TYPES.indexOf(n.type) >= 0; });
    uv(nodes.length);
    nodes.forEach(function (n, i) {
      index[n.id] = i;
      var lbl = n.label ? utf8Bytes(n.label) : null;
      uv(SHARE_TYPES.indexOf(n.type) * 2 + (lbl ? 1 : 0));
      uv(n.instances || 1);
      var qx = Math.round(n.x / SHARE_Q), qy = Math.round(n.y / SHARE_Q);
      sv(qx - px); sv(qy - py); px = qx; py = qy;
      if (lbl) { uv(lbl.length); lbl.forEach(function (b) { out.push(b); }); }
    });
    var edges = d.edges.filter(function (e) { return index[e.from] != null && index[e.to] != null; });
    uv(edges.length);
    edges.forEach(function (e) { uv(index[e.from]); uv(index[e.to] * 4 + (e.kind === 'read' ? 1 : e.kind === 'write' ? 2 : 0)); });
    return b64urlEncode(out);
  }
  function decodeShare(str) {
    if (!str || typeof str !== 'string' || str.length > 30000) return null;
    var bytes = b64urlDecode(str);
    if (!bytes || !bytes.length) return null;
    if (bytes[0] === 0x7b) return decodeLegacyShare(bytes);   // '{': the v2 JSON format
    if (bytes[0] !== SHARE_V) return null;
    var p = 1, bad = false;
    function uv() {
      var n = 0, mul = 1, guard = 0;
      while (true) {
        if (p >= bytes.length || guard++ > 4) { bad = true; return 0; }
        var b = bytes[p++];
        n += (b & 127) * mul;
        if (b < 128) return n;
        mul *= 128;
      }
    }
    function sv() { var n = uv(); return n % 2 ? -(n + 1) / 2 : n / 2; }
    var count = uv();
    if (bad || count > MAX_NODES) return null;
    var nodes = [], px = 0, py = 0;
    for (var i = 0; i < count && !bad; i++) {
      var tl = uv(), inst = uv();
      px += sv(); py += sv();
      var node = { id: i + 1, type: SHARE_TYPES[tl >> 1] || '', instances: inst, x: px * SHARE_Q, y: py * SHARE_Q };
      if (tl & 1) {
        var len = uv();
        if (bad || len > 160 || p + len > bytes.length) { bad = true; break; }
        try { node.label = utf8String(bytes.slice(p, p + len)); } catch (e) { node.label = ''; }
        p += len;
      }
      nodes.push(node);
    }
    var edges = [], ec = bad ? 0 : uv();
    if (ec > MAX_EDGES) bad = true;
    for (var j = 0; j < ec && !bad; j++) {
      var f = uv(), tk = uv();
      edges.push({ from: f + 1, to: (tk >> 2) + 1, kind: (tk & 3) === 1 ? 'read' : (tk & 3) === 2 ? 'write' : undefined });
    }
    if (bad) return null;
    var d = normalizeDesign({ nodes: nodes, edges: edges });
    return d.nodes.length ? d : null;
  }
  function decodeLegacyShare(bytes) {
    try {
      var o = JSON.parse(utf8String(bytes));
      if (!o || !Array.isArray(o.n)) return null;
      var d = normalizeDesign({
        nodes: o.n.map(function (a) { return Array.isArray(a) ? { id: a[0], type: a[1], x: a[2], y: a[3], instances: a[4], label: a[5] || '' } : null; }),
        edges: (Array.isArray(o.e) ? o.e : []).map(function (a) { return Array.isArray(a) ? { from: a[0], to: a[1], kind: a[2] === 1 ? 'read' : a[2] === 2 ? 'write' : undefined } : null; })
      });
      return d.nodes.length ? d : null;
    } catch (e) { return null; }
  }

  // ───────────────────────── layout ─────────────────────────
  var LAYOUT = { colGap: 260, rowGap: 104, x0: 40, y0: 40 };
  function autoLayout(design) {
    var G = prepare(design, {});
    var depth = {};
    G.topo.forEach(function (id) { if (depth[id] == null) depth[id] = 0; G.fwd[id].forEach(function (e) { depth[e.to] = Math.max(depth[e.to] || 0, depth[id] + 1); }); });
    var maxD = 0;
    Object.keys(depth).forEach(function (k) { maxD = Math.max(maxD, depth[k]); });
    var cols = [];
    G.ids.forEach(function (id) {
      var d = depth[id] != null ? depth[id] : maxD + 1;
      (cols[d] = cols[d] || []).push(id);
    });
    var parents = {};
    G.ids.forEach(function (id) { G.fwd[id].forEach(function (e) { (parents[e.to] = parents[e.to] || []).push(id); }); });
    var row = {};
    cols.forEach(function (col, ci) {
      if (!col) return;
      if (ci > 0) {
        col.sort(function (a, b) {
          function bary(id) { var ps = (parents[id] || []).filter(function (p) { return row[p] != null; }); return ps.length ? ps.reduce(function (s, p) { return s + row[p]; }, 0) / ps.length : 1e9 + id; }
          return bary(a) - bary(b);
        });
      }
      col.forEach(function (id, i) { row[id] = i; });
    });
    var tallest = cols.reduce(function (m, c) { return Math.max(m, c ? c.length : 0); }, 0);
    var pos = {};
    cols.forEach(function (col, ci) {
      if (!col) return;
      var offset = (tallest - col.length) * LAYOUT.rowGap / 2;
      col.forEach(function (id, i) { pos[id] = { x: LAYOUT.x0 + ci * LAYOUT.colGap, y: LAYOUT.y0 + offset + i * LAYOUT.rowGap }; });
    });
    return pos;
  }

  root.SimEngine = {
    version: 2,
    LIBRARY: LIBRARY, ICONS: C.ICONS, CHALLENGES: CHALLENGES, SANDBOX_SCALE: C.SANDBOX_SCALE,
    PATTERNS: PATTERNS, CHAOS: CHAOS, DIMENSIONS: DIMENSIONS,
    MAX_INSTANCES: MAX_INSTANCES, MAX_NODES: MAX_NODES, NODE_W: NODE_W, NODE_H: NODE_H,
    TARGET_UTIL: TARGET_UTIL, HOT_UTIL: HOT_UTIL, ERR_OK: ERR_OK, COST_SLACK: COST_SLACK, CHAOS_AT: CHAOS_AT,
    findComp: findComp, normalizeDesign: normalizeDesign, cleanLabel: cleanLabel, designSeed: designSeed,
    monthlyCost: monthlyCost, simulate: simulate, resilience: resilience, burstTest: burstTest, makeRun: makeRun,
    evaluate: evaluate, verdictFor: verdictFor, buildReference: buildReference, sizeDesign: sizeDesign,
    autoLayout: autoLayout, laneKey: laneKey, fmtNum: fmtNum, fmtMoney: fmtMoney,
    encodeShare: encodeShare, decodeShare: decodeShare, SHARE_TYPES: SHARE_TYPES
  };
})(typeof window !== 'undefined' ? window : globalThis);
