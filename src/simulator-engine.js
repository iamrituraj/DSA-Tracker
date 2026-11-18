// SystemCraft Simulator Engine
// Pure functional simulation, queuing theory, failure mode detection, and evaluation logic.

import { LIBRARY, CHALLENGES, ICONS, SANDBOX_SCALE } from './simulator-catalog.js';

export const MAX_INSTANCES = 128;
export const MAX_NODES = 120;
export const MAX_EDGES = 400;
export const NODE_W = 172;
export const NODE_H = 64;
export const TARGET_UTIL = 0.75;
export const HOT_UTIL = 0.8;
export const ERR_OK = 0.01;
export const COST_SLACK = 1.6;
export const CHAOS_AT = 12;

const SIGMA = 0.4;
const TAIL_P = 0.004;
const TAIL_X = 6;

const COMP = {};
const LABEL2ID = {};
Object.keys(LIBRARY).forEach(function (g) {
  LIBRARY[g].forEach(function (c) {
    COMP[c.id] = c;
    LABEL2ID[c.label] = c.id;
  });
});

export function findComp(type) {
  return Object.prototype.hasOwnProperty.call(COMP, type) ? COMP[type] : null;
}

export function roleOf(cat) {
  switch (cat) {
    case 'client':
    case 'lb':
      return 'forward';
    case 'cdn':
      return 'cdn';
    case 'compute':
      return 'compute';
    case 'cache':
      return 'cache';
    case 'db':
      return 'db';
    case 'queue':
      return 'queue';
    default:
      return 'store';
  }
}

export function clampInt(v, lo, hi) {
  v = Math.floor(+v);
  if (!isFinite(v)) v = lo;
  return Math.max(lo, Math.min(hi, v));
}

export function clampNum(v, lo, hi, d) {
  v = +v;
  if (!isFinite(v)) v = d;
  return Math.max(lo, Math.min(hi, v));
}

export function fmtNum(v) {
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  var a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1) + 'K';
  return Math.round(v).toLocaleString('en-US');
}

export function fmtMoney(v) {
  return '$' + Math.round(v).toLocaleString('en-US');
}

export function pct(v) {
  return (v * 100 >= 10 ? Math.round(v * 100) : (Math.round(v * 1000) / 10)) + '%';
}

export function cleanLabel(s) {
  return String(s || '').trim().slice(0, 40);
}

export function hashStr(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

export function rng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne(arr, rand) {
  return arr[(rand() * arr.length) | 0];
}

export function normalizeDesign(raw) {
  raw = raw || {};
  var nodes = (raw.nodes || []).slice(0, MAX_NODES).map(function (n) {
    var c = findComp(n.type) || COMP['app-server'];
    return {
      id: +n.id,
      type: c.id,
      label: cleanLabel(n.label) || c.label,
      instances: c.maxRPS === Infinity ? 1 : clampInt(n.instances, 1, MAX_INSTANCES),
      x: clampNum(n.x, -5000, 5000, 100),
      y: clampNum(n.y, -5000, 5000, 100)
    };
  });
  var known = {};
  nodes.forEach(function (n) { known[n.id] = true; });
  var seen = {}, edges = [];
  (raw.edges || []).slice(0, MAX_EDGES).forEach(function (e) {
    var f = +e.from, t = +e.to;
    if (!known[f] || !known[t] || f === t) return;
    var k = f + '>' + t;
    if (seen[k]) return;
    seen[k] = true;
    var kind = (e.kind === 'read' || e.kind === 'write') ? e.kind : null;
    edges.push({ from: f, to: t, kind: kind });
  });
  var maxId = nodes.reduce(function (m, n) { return Math.max(m, n.id); }, 0);
  return { nodes: nodes, edges: edges, nextId: Math.max(maxId + 1, (raw.nextId || 1)) };
}

export function designSeed(design) {
  var s = design.nodes.map(function (n) { return n.id + ':' + n.type + ':' + n.instances; }).join(',') +
    '|' + design.edges.map(function (e) { return e.from + '>' + e.to + (e.kind ? ':' + e.kind : ''); }).join(',');
  return hashStr(s);
}

export function monthlyCost(design) {
  return design.nodes.reduce(function (sum, n) {
    var c = findComp(n.type);
    if (!c || c.cost === 0) return sum;
    return sum + c.cost * n.instances;
  }, 0);
}

export function laneKey(n) {
  var c = findComp(n.type);
  if (!c) return 'other';
  if (c.cat === 'db') return n.label;
  if (c.cat === 'replica') return 'replica:' + n.label;
  return c.cat;
}

export function prepare(design, opts) {
  opts = opts || {};
  var G = {
    N: {}, ids: [], fwd: {}, rev: {},
    inDeg: {}, topo: [], roots: [], leaves: [],
    cyclic: false, valid: true
  };
  design.nodes.forEach(function (n) {
    var c = findComp(n.type);
    var chaos = opts.chaos && opts.chaos[n.id];
    var slow = opts.slow && opts.slow[n.id];
    var dead = chaos === 'kill' || n.instances === 0;
    var inst = dead ? 0 : Math.max(1, n.instances - (chaos === 'drop1' ? 1 : 0));
    G.N[n.id] = {
      id: n.id, type: n.type, label: n.label,
      cat: c ? c.cat : 'compute',
      role: c ? roleOf(c.cat) : 'compute',
      durable: !!(c && c.durable),
      instances: inst,
      maxRPS: (c ? c.maxRPS : 10000) * inst,
      baseLatency: (c ? c.latency : 5) + (slow ? 150 : 0),
      cost: (c ? c.cost : 50) * inst,
      down: dead,
      routes: null
    };
    G.ids.push(n.id);
    G.fwd[n.id] = [];
    G.rev[n.id] = [];
    G.inDeg[n.id] = 0;
  });
  design.edges.forEach(function (e) {
    if (!G.N[e.from] || !G.N[e.to]) return;
    G.fwd[e.from].push({ to: e.to, kind: e.kind || 'all' });
    G.rev[e.to].push({ from: e.from, kind: e.kind || 'all' });
    G.inDeg[e.to]++;
  });

  var q = [], deg = Object.assign({}, G.inDeg);
  G.ids.forEach(function (id) {
    if (deg[id] === 0) { q.push(id); G.roots.push(id); }
    if (G.fwd[id].length === 0) G.leaves.push(id);
  });
  while (q.length) {
    var u = q.shift();
    G.topo.push(u);
    G.fwd[u].forEach(function (e) {
      if (--deg[e.to] === 0) q.push(e.to);
    });
  }
  if (G.topo.length < G.ids.length) G.cyclic = true;
  return G;
}

function readKids(G, id) {
  return G.fwd[id].filter(function (e) { return e.kind !== 'write'; }).map(function (e) { return e.to; });
}
function writeKids(G, id) {
  return G.fwd[id].filter(function (e) { return e.kind !== 'read'; }).map(function (e) { return e.to; });
}
function liveOf(G, ids) {
  return ids.filter(function (id) { return !G.N[id].down; });
}
function lanesOf(G, ids) {
  var groups = {};
  ids.forEach(function (id) {
    var k = laneKey(G.N[id]);
    (groups[k] = groups[k] || []).push(id);
  });
  return Object.keys(groups).map(function (k) { return groups[k]; });
}

function reachOf(G, id) {
  var visited = {}, out = [];
  function dfs(u) {
    G.fwd[u].forEach(function (e) {
      if (!visited[e.to]) { visited[e.to] = true; out.push(e.to); dfs(e.to); }
    });
  }
  dfs(id);
  return out;
}

function writeTargets(G, n, kids) {
  var live = liveOf(G, kids);
  var out = [];
  var hasCache = live.some(function (id) { return G.N[id].role === 'cache'; });
  var hasStore = live.some(function (id) { var r = G.N[id].role; return r === 'db' || r === 'store' || r === 'queue'; });
  live.forEach(function (id) {
    var k = G.N[id];
    if (k.cat === 'replica') return;
    if (hasCache && hasStore && k.role === 'cache') {
      var reachable = reachOf(G, id);
      var reachesStore = reachable.some(function (rid) { var r = G.N[rid].role; return r === 'db' || r === 'store'; });
      if (!reachesStore) return;
    }
    out.push(id);
  });
  return out;
}

function coverOf(G, n) {
  var dbs = G.ids.filter(function (id) { return G.N[id].cat === 'db'; });
  if (dbs.length !== 1) return null;
  var dbId = dbs[0];
  var live = G.fwd[n.id].filter(function (e) { return e.to === dbId && !G.N[e.to].down; });
  if (live.length) return dbId;
  var repKids = G.fwd[n.id].filter(function (e) { return G.N[e.to].cat === 'replica' && !G.N[e.to].down; });
  return repKids.length ? dbId : null;
}

function routeFor(G, n, cls) {
  var rawKids = cls === 'read' ? readKids(G, n.id) : writeKids(G, n.id);
  if (cls === 'read' && (n.role === 'compute' || n.role === 'forward')) {
    var directDb = rawKids.filter(function (id) { return G.N[id].cat === 'db' && !G.N[id].down; });
    var reps = rawKids.filter(function (id) { return G.N[id].cat === 'replica' && !G.N[id].down; });
    var caches = rawKids.filter(function (id) { return G.N[id].role === 'cache' && !G.N[id].down; });
    var covered = caches.map(function (cid) { return coverOf(G, G.N[cid]); }).filter(Boolean);
    var filtered = rawKids.filter(function (id) {
      if (covered.indexOf(id) >= 0) return false;
      return true;
    });
    if (directDb.length && reps.length) {
      filtered = filtered.filter(function (id) { return id !== directDb[0]; });
    }
    rawKids = filtered;
  }
  var live = liveOf(G, rawKids);
  if (cls === 'write' && n.role === 'compute') {
    live = writeTargets(G, n, rawKids);
  }
  if (!live.length) return { lanes: [], fanout: false, dead: rawKids.length > 0 };
  if (cls === 'write' && (n.role === 'compute' || n.role === 'store')) {
    return { lanes: lanesOf(G, live), fanout: true, dead: false };
  }
  return { lanes: lanesOf(G, live), fanout: false, dead: false };
}

function buildRoutes(G) {
  G.ids.forEach(function (id) {
    var n = G.N[id];
    n.routes = {
      read: routeFor(G, n, 'read'),
      write: routeFor(G, n, 'write')
    };
  });
}

function isLeafCache(n) {
  return n.role === 'cache' && n.routes && !n.routes.read.lanes.length;
}

function addFlow(G, from, to, cls, amt) {
  if (!G._flow) G._flow = {};
  var k = from + '>' + to;
  var rec = G._flow[k] || (G._flow[k] = { read: 0, write: 0 });
  rec[cls] += amt;
}

function splitTo(G, from, ids, cls, amt) {
  if (!ids.length || amt <= 0) return;
  var per = amt / ids.length;
  ids.forEach(function (to) { addFlow(G, from, to, cls, per); });
}

function route(G, n, cls, amt, P) {
  if (amt <= 0 || n.down) return;
  if (n.role === 'cdn') {
    if (cls === 'read') {
      var hit = amt * P.cacheHit;
      var miss = amt - hit;
      P.hitRPS += hit;
      P.hitReadRPS += hit;
      splitTo(G, n.id, n.routes.read.lanes.length ? n.routes.read.lanes[0] : [], 'read', miss);
      return;
    }
    splitTo(G, n.id, n.routes.write.lanes.length ? n.routes.write.lanes[0] : [], 'write', amt);
    return;
  }

  if (n.role === 'cache') {
    if (cls === 'read') {
      var cHit = amt * P.cacheHit;
      var cMiss = amt - cHit;
      P.hitRPS += cHit;
      P.hitReadRPS += cHit;
      if (n.routes.read.lanes.length) {
        splitTo(G, n.id, n.routes.read.lanes[0], 'read', cMiss);
      } else {
        P.cacheAsideMisses = (P.cacheAsideMisses || 0) + cMiss;
      }
      return;
    }
    return;
  }

  var rt = cls === 'read' ? n.routes.read : n.routes.write;
  if (!rt.lanes.length) {
    if (rt.dead) {
      if (cls === 'read') P.droppedReads += amt;
      else P.droppedWrites += amt;
    }
    return;
  }

  if (rt.fanout) {
    rt.lanes.forEach(function (lane) { splitTo(G, n.id, lane, cls, amt); });
    return;
  }

  var perLane = amt / rt.lanes.length;
  rt.lanes.forEach(function (lane) { splitTo(G, n.id, lane, cls, perLane); });
}

function propagate(G, sc, P) {
  var clientNodes = G.ids.filter(function (id) { return G.N[id].type === 'client'; });
  var totalRPS = sc.rps * P.mult;
  var readRPS = totalRPS * (sc.readPct / 100);
  var writeRPS = totalRPS - readRPS;
  P.offered = totalRPS;
  P.offeredRead = readRPS;
  P.offeredWrite = writeRPS;
  P.cacheHit = sc.cacheHit / 100;

  if (!clientNodes.length) {
    P.droppedReads = readRPS;
    P.droppedWrites = writeRPS;
    return;
  }

  var perClientR = readRPS / clientNodes.length;
  var perClientW = writeRPS / clientNodes.length;
  G.ids.forEach(function (id) {
    P.inFlow[id] = { read: 0, write: 0 };
    P.demand[id] = 0;
  });

  clientNodes.forEach(function (cid) {
    P.inFlow[cid].read += perClientR;
    P.inFlow[cid].write += perClientW;
    P.demand[cid] += perClientR + perClientW;
  });

  G.topo.forEach(function (id) {
    var n = G.N[id];
    var inf = P.inFlow[id];
    var dem = inf.read + inf.write;
    P.demand[id] = dem;

    if (n.role === 'queue') {
      var consumers = G.fwd[id].map(function (e) { return e.to; }).filter(function (tid) {
        var k = G.N[tid];
        return !k.down && (k.cat === 'compute' || k.role === 'compute');
      });
      var cap = consumers.reduce(function (s, tid) { return s + G.N[tid].maxRPS; }, 0);
      var enq = inf.read + inf.write;
      var outAmt = Math.min(enq, cap);
      var ratio = enq > 0 ? outAmt / enq : 1;
      route(G, n, 'read', inf.read * ratio, P);
      route(G, n, 'write', inf.write * ratio, P);
      if (cap < enq) {
        P.queueBacklogRate = (P.queueBacklogRate || 0) + (enq - cap);
      }
      return;
    }

    if (n.role === 'compute' && n.routes && !n.routes.read.lanes.length) {
      if (inf.read > 0) P.droppedReads += inf.read;
      if (inf.write > 0 && !n.routes.write.lanes.length) P.droppedWrites += inf.write;
      return;
    }

    route(G, n, 'read', inf.read, P);
    route(G, n, 'write', inf.write, P);

    (G.fwd[id] || []).forEach(function (e) {
      var f = G._flow ? G._flow[id + '>' + e.to] : null;
      if (f) {
        P.inFlow[e.to].read += f.read;
        P.inFlow[e.to].write += f.write;
      }
    });
  });

  if (P.cacheAsideMisses > 0) {
    var dbs = G.ids.filter(function (id) { return G.N[id].cat === 'db' && !G.N[id].down; });
    if (dbs.length) {
      var perDb = P.cacheAsideMisses / dbs.length;
      dbs.forEach(function (id) {
        P.inFlow[id].read += perDb;
        P.demand[id] += perDb;
      });
    }
  }

  G.ids.forEach(function (id) {
    var n = G.N[id];
    var dem = P.demand[id];
    var max = n.maxRPS;
    if (max !== Infinity && dem > max) {
      var drop = dem - max;
      var rRatio = dem > 0 ? P.inFlow[id].read / dem : 0;
      P.droppedReads += drop * rRatio;
      P.droppedWrites += drop * (1 - rRatio);
      P.load[id] = max;
      P.util[id] = dem / max;
    } else {
      P.load[id] = dem;
      P.util[id] = max === Infinity ? 0 : dem / max;
    }
  });

  P.served = Math.max(0, P.offered - (P.droppedReads + P.droppedWrites));
  P.errRate = P.offered > 0 ? (P.droppedReads + P.droppedWrites) / P.offered : 0;
}

function hopLatency(n, rand) {
  var base = n.baseLatency;
  var u = n.instances === 0 ? 1 : Math.min(0.999, (n.load || 0) / (n.maxRPS || 1));
  var qDelay = 0;
  if (u > 0.01 && n.instances > 0) {
    var c = n.instances;
    var waitFactor = Math.pow(u, Math.sqrt(2 * (c + 1)) - 1) / (c * (1 - u));
    qDelay = base * waitFactor;
  }
  var z0 = Math.sqrt(-2 * Math.log(Math.max(1e-9, rand()))) * Math.cos(2 * Math.PI * rand());
  var st = base * Math.exp(SIGMA * z0);
  var tail = rand() < TAIL_P ? base * TAIL_X : 0;
  return st + qDelay + tail;
}

function sampleLatencies(G, sc, P, count, seed) {
  var rand = rng(seed);
  var samples = [];
  var clients = G.ids.filter(function (id) { return G.N[id].type === 'client'; });
  if (!clients.length) return { p50: 999, p90: 999, p99: 999, p999: 999 };

  for (var i = 0; i < count; i++) {
    var isRead = rand() < (sc.readPct / 100);
    var curr = pickOne(clients, rand);
    var t = 0;
    var visited = 0;
    var failed = false;

    while (curr && visited < 20) {
      visited++;
      var n = G.N[curr];
      if (!n || n.down) { failed = true; break; }
      t += hopLatency(n, rand);

      if (n.role === 'queue') break;

      var rts = isRead ? n.routes.read : n.routes.write;
      if (!rts.lanes.length) break;

      if (n.role === 'cdn' && isRead) {
        if (rand() < P.cacheHit) break;
      } else if (n.role === 'cache' && isRead) {
        if (rand() < P.cacheHit) break;
        if (!rts.lanes.length) {
          var dbs = G.ids.filter(function (id) { return G.N[id].cat === 'db' && !G.N[id].down; });
          if (dbs.length) {
            t += hopLatency(G.N[pickOne(dbs, rand)], rand);
          }
          break;
        }
      }

      var lane = pickOne(rts.lanes, rand);
      curr = pickOne(lane, rand);
    }

    if (!failed) samples.push(t);
  }

  samples.sort(function (a, b) { return a - b; });
  if (!samples.length) return { p50: 999, p90: 999, p99: 999, p999: 999 };

  function q(pctVal) {
    var idx = Math.min(samples.length - 1, Math.floor(samples.length * pctVal));
    return samples[idx];
  }
  return { p50: q(0.50), p90: q(0.90), p99: q(0.99), p999: q(0.999) };
}

export function simulate(design, sc, opts) {
  opts = opts || {};
  var G = prepare(design, opts);
  buildRoutes(G);

  var P = {
    mult: opts.mult || 1,
    hitRPS: 0,
    hitReadRPS: 0,
    droppedReads: 0,
    droppedWrites: 0,
    inFlow: {},
    demand: {},
    load: {},
    util: {},
    queueBacklogRate: 0
  };

  propagate(G, sc, P);

  G.ids.forEach(function (id) {
    G.N[id].load = P.load[id];
    G.N[id].demand = P.demand[id];
    G.N[id].util = P.util[id];
  });

  var lat = sampleLatencies(G, sc, P, opts.samples || 3000, opts.seed || designSeed(design));
  var cost = monthlyCost(design);
  var lagSec = P.queueBacklogRate > 0 ? (P.queueBacklogRate * 60) / Math.max(1, sc.rps) : 0;

  var nodeStats = {};
  G.ids.forEach(function (id) {
    var n = G.N[id];
    var u = P.util[id] || 0;
    var st = n.down ? 'down' : u > 1 ? 'over' : u > HOT_UTIL ? 'hot' : 'ok';
    nodeStats[id] = {
      id: id,
      label: n.label,
      cat: n.cat,
      type: n.type,
      instances: n.instances,
      load: P.load[id] || 0,
      demand: P.demand[id] || 0,
      util: u,
      maxRPS: n.maxRPS,
      status: st,
      reachable: (P.demand[id] || 0) > 0 || n.type === 'client'
    };
  });

  var res = {
    offered: P.offered,
    served: P.served,
    errRate: P.errRate,
    passed: P.errRate <= ERR_OK,
    latencyOk: !sc.p99Budget || lat.p99 <= sc.p99Budget,
    p50: lat.p50,
    p90: lat.p90,
    p99: lat.p99,
    p999: lat.p999,
    budget: sc.p99Budget,
    cost: cost,
    lagSec: lagSec,
    lagging: lagSec > 5,
    nodes: nodeStats,
    flow: G._flow || {},
    breaking: { mult: 1, rps: sc.rps, node: null },
    modes: []
  };

  detectModes(G, res, sc, opts);
  return res;
}

export function detectModes(G, res, sc, opts) {
  var modes = [];
  var hasCache = false;
  var hasDb = false;
  var hasQueue = false;
  var hasLB = false;
  var hasDurableStore = false;

  G.ids.forEach(function (id) {
    var n = G.N[id];
    if (n.role === 'cache' || n.role === 'cdn') hasCache = true;
    if (n.cat === 'db') hasDb = true;
    if (n.role === 'queue') hasQueue = true;
    if (n.role === 'forward' && n.type !== 'client') hasLB = true;
    if (n.durable && (res.nodes[id].load > 0)) hasDurableStore = true;
  });

  if (!hasDurableStore && !opts.statefree) {
    modes.push({
      sev: 'error',
      kind: 'Missing Durable Storage',
      detail: 'No durable system of record on write path. Data will vanish on process restart.',
      fix: 'Add a persistent database (PostgreSQL, Cassandra, DynamoDB, or Kafka commit log).'
    });
  }

  G.ids.forEach(function (id) {
    var st = res.nodes[id];
    if (st.util > 1.0) {
      modes.push({
        sev: 'error',
        node: id,
        kind: 'Saturated Tier',
        detail: st.label + ' is at ' + Math.round(st.util * 100) + '% capacity. Dropping requests.',
        fix: 'Scale out instances or place a cache / queue upstream.'
      });
    } else if (st.util > HOT_UTIL) {
      modes.push({
        sev: 'warn',
        node: id,
        kind: 'High Utilization',
        detail: st.label + ' is running hot at ' + Math.round(st.util * 100) + '%. Tail latency may climb.',
        fix: 'Add spare instances (N+1 sizing).'
      });
    }

    if (st.instances === 1 && st.load > 0 && st.cat !== 'client' && st.cat !== 'cdn') {
      modes.push({
        sev: 'warn',
        node: id,
        kind: 'Single Point of Failure (SPOF)',
        detail: st.label + ' has only 1 instance. If it dies, the service goes down.',
        fix: 'Increase instances to at least 2 for high availability.'
      });
    }
  });

  if (res.lagging) {
    modes.push({
      sev: 'error',
      kind: 'Unbounded Queue Backlog',
      detail: 'Queue consumption cannot keep up with write rate. Consumer lag grows indefinitely.',
      fix: 'Scale worker instances behind the queue.'
    });
  }

  if (res.budget && res.p99 > res.budget) {
    modes.push({
      sev: 'error',
      kind: 'P99 Latency Budget Exceeded',
      detail: 'P99 is ' + Math.round(res.p99) + 'ms vs budget of ' + res.budget + 'ms.',
      fix: 'Cut downstream synchronous hops or cache hot reads.'
    });
  }

  res.modes = modes;
}

export function resilience(design, sc, opts) {
  opts = opts || {};
  var steady = simulate(design, sc, opts);
  var results = [];
  var pass = true;

  design.nodes.forEach(function (n) {
    var c = findComp(n.type);
    if (!c || c.maxRPS === Infinity || n.instances <= 0) return;
    if (!steady.nodes[n.id] || steady.nodes[n.id].load === 0) return;

    var chaosOpt = { chaos: {} };
    chaosOpt.chaos[n.id] = 'drop1';
    var r = simulate(design, sc, Object.assign({}, opts, chaosOpt, { samples: 1000 }));
    var survived = r.errRate <= ERR_OK;
    if (!survived) pass = false;
    results.push({
      id: n.id,
      label: n.label,
      inst: n.instances,
      errRate: r.errRate,
      ok: survived,
      herd: n.instances > 1 && r.errRate > 0.1
    });
  });

  return { pass: pass, results: results };
}

export function burstTest(design, sc, mult, opts) {
  opts = opts || {};
  var burstRes = simulate(design, sc, Object.assign({}, opts, { mult: mult, samples: 1500 }));
  return {
    mult: mult,
    errRate: burstRes.errRate,
    passed: burstRes.passed,
    drainSec: burstRes.lagSec
  };
}

export const PATTERNS = {
  steady: { label: 'Steady load', dur: 30, at: function () { return 1; } },
  spike: { label: 'Flash spike (2× for 15s)', dur: 50, at: function (t) { return t >= 15 && t < 30 ? 2 : 1; } },
  ramp: { label: 'Ramp to 3× (find breaking point)', dur: 60, at: function (t) { return 0.25 + 2.75 * (t / 60); } },
  daily: { label: 'Daily cycle (0.4× to 1.3×)', dur: 60, at: function (t) { return 0.4 + 0.9 * (1 - Math.cos(2 * Math.PI * (t / 60))) / 2; } }
};

export const CHAOS = {
  none: { label: 'No chaos' },
  'kill-busiest': { label: 'Kill one instance of the busiest tier' },
  'cache-flush': { label: 'Flush every cache (cold restart)' },
  'db-down': { label: 'Primary database goes down' },
  'slow-dep': { label: 'Slow dependency (+150ms on busiest store)' },
  'zone-outage': { label: 'Zone outage (lose 1/3 of every tier)' }
};

export function makeRun(design, sc, opts) {
  opts = opts || {};
  var patKey = opts.pattern || 'steady';
  var pat = PATTERNS[patKey] || PATTERNS.steady;
  var chaosKey = opts.chaos || 'none';
  var dur = pat.dur;
  var ticks = [];

  var baseSim = simulate(design, sc, { mult: 1, samples: 500 });
  var busiestId = null, maxU = -1;
  Object.keys(baseSim.nodes).forEach(function (id) {
    if (baseSim.nodes[id].util > maxU && baseSim.nodes[id].cat !== 'client') {
      maxU = baseSim.nodes[id].util;
      busiestId = id;
    }
  });

  for (var t = 0; t < dur; t++) {
    var mult = pat.at(t) * (opts.mult || 1);
    var chaosApplied = {};
    var slowApplied = {};
    var active = false;
    var note = '';

    if (chaosKey !== 'none' && t >= CHAOS_AT) {
      active = true;
      if (chaosKey === 'kill-busiest' && busiestId) {
        chaosApplied[busiestId] = 'drop1';
        note = '1 instance killed in busiest tier';
      } else if (chaosKey === 'db-down') {
        var dbs = design.nodes.filter(function (n) { return findComp(n.type).cat === 'db'; });
        if (dbs.length) { chaosApplied[dbs[0].id] = 'kill'; note = 'Primary database went down'; }
      } else if (chaosKey === 'slow-dep') {
        var stores = design.nodes.filter(function (n) { var c = findComp(n.type).cat; return c === 'db' || c === 'blob'; });
        if (stores.length) { slowApplied[stores[0].id] = true; note = 'Store slowed by +150ms'; }
      }
    }

    var tickSim = simulate(design, sc, {
      mult: mult,
      chaos: chaosApplied,
      slow: slowApplied,
      samples: 400
    });

    ticks.push({
      t: t,
      mult: mult,
      active: active,
      note: note,
      result: tickSim
    });
  }

  return {
    pattern: patKey,
    chaos: chaosKey,
    dur: dur,
    chaosAt: CHAOS_AT,
    ticks: ticks,
    note: ticks[ticks.length - 1].note
  };
}

export const DIMENSIONS = [
  { id: 'architecture', label: 'Architecture', weight: 25, blurb: 'The right building blocks, wired cleanly in path.' },
  { id: 'scalability', label: 'Scalability', weight: 25, blurb: 'Carries target load with no saturation and clear queues.' },
  { id: 'latency', label: 'Latency', weight: 15, blurb: 'End-to-end P99 within latency budget.' },
  { id: 'reliability', label: 'Reliability', weight: 25, blurb: 'Durable writes and survives N+1 chaos sweep.' },
  { id: 'cost', label: 'Cost', weight: 10, blurb: 'Sized to the load rather than guesswork.' }
];

export function verdictFor(score) {
  if (score >= 90) return { t: 'Strong Hire', tone: 'good' };
  if (score >= 75) return { t: 'Hire', tone: 'good' };
  if (score >= 55) return { t: 'Lean No Hire', tone: 'warn' };
  return { t: 'No Hire', tone: 'bad' };
}

export function evaluate(ch, design, opts) {
  opts = opts || {};
  var sc = ch.scale || SANDBOX_SCALE;
  var steady = simulate(design, sc, { samples: opts.samples || 5000, statefree: ch.statefree });
  var resSweep = steady.passed ? resilience(design, sc, { statefree: ch.statefree }) : null;
  var burst = sc.burst && steady.passed ? burstTest(design, sc, sc.burst, { statefree: ch.statefree }) : null;
  var ref = ch.ref && ch.ref.stack ? buildReference(ch) : null;
  var refCost = ref ? monthlyCost(ref) : 0;
  var cost = monthlyCost(design);
  var ratio = refCost > 0 ? cost / refCost : 1;

  var loadedCats = {};
  var hasDurable = false;
  Object.keys(steady.nodes).forEach(function (id) {
    var n = steady.nodes[id];
    if (n.load > 0) {
      loadedCats[n.cat] = true;
      if (findComp(n.type) && findComp(n.type).durable) hasDurable = true;
    }
  });

  var helper = {
    has: function () {
      var cats = Array.prototype.slice.call(arguments);
      return cats.some(function (c) { return loadedCats[c]; });
    },
    simPassed: steady.passed && !steady.lagging,
    latencyOk: steady.latencyOk,
    hasDurable: hasDurable
  };

  var checks = (ch.rubric || []).map(function (r) {
    var pass = r.test(helper);
    return {
      label: r.label,
      dim: r.dim,
      cats: r.cats,
      pass: pass
    };
  });

  var dimScore = {};
  DIMENSIONS.forEach(function (d) {
    dimScore[d.id] = { id: d.id, label: d.label, weight: d.weight, earned: 0, passed: 0, total: 0, checks: [] };
  });

  checks.forEach(function (c) {
    var d = dimScore[c.dim] || dimScore.architecture;
    d.total++;
    d.checks.push(c);
    if (c.pass) d.passed++;
  });

  ['architecture', 'scalability', 'latency'].forEach(function (dimKey) {
    var d = dimScore[dimKey];
    if (d.total > 0) d.earned = (d.passed / d.total) * d.weight;
  });

  var relD = dimScore.reliability;
  var relBase = relD.total > 0 ? (relD.passed / relD.total) * (relD.weight * 0.5) : 0;
  var sweepPoints = resSweep && resSweep.pass ? (relD.weight * 0.5) : 0;
  relD.earned = relBase + sweepPoints;

  var costD = dimScore.cost;
  if (refCost > 0) {
    if (ratio <= 1.25) costD.earned = costD.weight;
    else if (ratio <= COST_SLACK) costD.earned = costD.weight * 0.7;
    else if (ratio <= 2.5) costD.earned = costD.weight * 0.3;
    else costD.earned = 0;
  } else {
    costD.earned = costD.weight;
  }

  var totalEarned = 0;
  var dimsList = DIMENSIONS.map(function (d) {
    var item = dimScore[d.id];
    var earned = Math.max(0, Math.min(item.weight, item.earned));
    totalEarned += earned;
    item.pct = item.weight > 0 ? Math.round((earned / item.weight) * 100) : 100;
    return item;
  });

  var finalScore = Math.round(totalEarned);
  return {
    score: finalScore,
    verdict: verdictFor(finalScore),
    dims: dimsList,
    checks: checks,
    steady: steady,
    resilience: resSweep,
    burst: burst,
    cost: cost,
    refCost: refCost,
    ratio: ratio,
    ref: ref
  };
}

export function buildReference(ch) {
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

  function colX(col) { return 40 + col * 260; }
  var rows = {};
  function place(types, col) {
    return types.map(function (t) {
      var r = rows[col] || 0;
      rows[col] = r + 1;
      var id = design.nextId++;
      design.nodes.push({ id: id, type: t, label: (findComp(t) || {}).label || t, x: colX(col), y: 60 + r * 104, instances: 1 });
      return id;
    });
  }

  function wire(from, to) {
    from.forEach(function (a) {
      to.forEach(function (b) {
        if (a !== b && !design.edges.some(function (e) { return e.from === a && e.to === b; })) {
          design.edges.push({ from: a, to: b, kind: 'all' });
        }
      });
    });
  }

  var client = place(['client'], 0);
  var cdn = place(role.cdn, 1);
  var lb = place(role.lb, cdn.length ? 2 : 1);
  var appCol = cdn.length ? (lb.length ? 3 : 2) : (lb.length ? 2 : 1);
  var app = place(role.app.length ? role.app : ['app-server'], appCol);
  var cache = place(role.cache, appCol + 1);
  var side = place(role.search.concat(role.blob), appCol + 1);
  var queue = place(role.queue, appCol + 1);
  var worker = place(role.worker, appCol + 2);
  var storeCol = appCol + (worker.length ? 3 : 2);
  var store = place(role.db.concat(role.replica), storeCol);

  var edge = cdn.length ? cdn : (lb.length ? lb : app);
  wire(client, edge);
  if (cdn.length) wire(cdn, lb.length ? lb : app);
  if (lb.length) wire(lb, app);

  if (cache.length) {
    wire(app, cache);
    wire(cache, store);
  } else {
    wire(app, store);
  }
  wire(app, side);

  if (queue.length) {
    wire(app, queue);
    if (worker.length) {
      wire(queue, worker);
      wire(worker, store);
    }
  } else if (worker.length) {
    wire(app, worker);
    wire(worker, store);
  }

  sizeDesign(design, ch.scale || SANDBOX_SCALE, ch.statefree);
  return design;
}

export function sizeDesign(design, sc, statefree) {
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
      if (B && B.nodes[n.id] && c.cat !== 'worker') {
        need = Math.max(need, Math.ceil(B.nodes[n.id].demand / c.maxRPS));
      }
      need = clampInt(need, 1, MAX_INSTANCES);
      if (need !== n.instances) {
        n.instances = need;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return design;
}

export function autoLayout(design) {
  var G = prepare(design, {});
  var depth = {};
  G.topo.forEach(function (id) {
    if (depth[id] == null) depth[id] = 0;
    G.fwd[id].forEach(function (e) {
      depth[e.to] = Math.max(depth[e.to] || 0, depth[id] + 1);
    });
  });
  var maxD = 0;
  Object.keys(depth).forEach(function (k) { maxD = Math.max(maxD, depth[k]); });
  var cols = [];
  G.ids.forEach(function (id) {
    var d = depth[id] != null ? depth[id] : maxD + 1;
    (cols[d] = cols[d] || []).push(id);
  });

  var pos = {};
  var colGap = 240, rowGap = 100, x0 = 60, y0 = 60;
  var tallest = cols.reduce(function (m, c) { return Math.max(m, c ? c.length : 0); }, 0);

  cols.forEach(function (col, ci) {
    if (!col) return;
    var offset = (tallest - col.length) * rowGap / 2;
    col.forEach(function (id, i) {
      pos[id] = { x: x0 + ci * colGap, y: y0 + offset + i * rowGap };
    });
  });
  return pos;
}

export function encodeShare(design) {
  try {
    var clean = {
      n: design.nodes.map(function (n) { return [n.id, n.type, n.instances, Math.round(n.x), Math.round(n.y), n.label]; }),
      e: design.edges.map(function (e) { return [e.from, e.to, e.kind || '']; })
    };
    var json = JSON.stringify(clean);
    return btoa(encodeURIComponent(json));
  } catch (err) {
    return '';
  }
}

export function decodeShare(str) {
  try {
    var json = decodeURIComponent(atob(str));
    var raw = JSON.parse(json);
    var nodes = raw.n.map(function (arr) {
      return { id: arr[0], type: arr[1], instances: arr[2], x: arr[3], y: arr[4], label: arr[5] };
    });
    var edges = raw.e.map(function (arr) {
      return { from: arr[0], to: arr[1], kind: arr[2] || null };
    });
    return normalizeDesign({ nodes: nodes, edges: edges });
  } catch (err) {
    return null;
  }
}
