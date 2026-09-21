// Headless smoke harness for the LLD Playground simulators.
// The sims live in a .jsx file, so this transforms them with esbuild, imports the result,
// and drives the reducers through thousands of random operations — the same invariants an
// interview would ask about (size never exceeds capacity, stock never goes negative, no spot
// sold twice, every hall call eventually served) checked without a browser.
//
//   node scripts/verify-lld-sims.mjs [ops]

import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const OPS = Number(process.argv[2] || 4000);
const OUT = resolve(".tmp-lld-sims.mjs");
const fails = [];

function report() {
  if (!fails.length) { console.log("\nall simulator invariants held"); return; }
  const byName = new Map();
  for (const f of fails) { const k = f.split(" \u2014 ")[0]; if (!byName.has(k)) byName.set(k, f); }
  console.error(`\nFAIL (${fails.length} captured, ${byName.size} distinct invariants):`);
  [...byName.values()].forEach(f => console.error("  \u2717 " + f));
}

function check(name, cond, detail = "") {
  if (cond) return;
  fails.push(`${name}${detail ? " — " + detail : ""}`);
  if (fails.length > 60) { report(); process.exit(1); }
}

/* ---- load the JSX module through esbuild ---- */
const js = execFileSync("npx", ["--no-install", "esbuild", "src/lld-sim.jsx", "--format=esm", "--log-level=warning"], { encoding: "utf8", maxBuffer: 1 << 28 });
writeFileSync(OUT, js);
const M = await import(pathToFileURL(OUT).href);
rmSync(OUT, { force: true });

for (const sym of ["lru0", "lruReducer", "vend0", "vendReducer", "park0", "parkReducer", "el0", "elReducer"])
  check(`export ${sym}`, typeof M[sym] === "function" || M[sym] !== undefined, "missing from lld-sim.jsx");

/* mulberry32 — a 32-bit LCG-style mix. (A plain x*a+c LCG overflows double precision here and
   collapses to a constant, which silently turns the fuzz into a no-op workload.) */
const mkRnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const rnd = mkRnd(0xC0FFEE);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const KEYS = ["A", "B", "C", "D", "E", "F"];

/* ------------------------------- 01 · LRU ------------------------------- */
{
  let s = M.lru0();
  s = M.lruReducer(s, { type: "ttl", on: true });
  for (let i = 0; i < OPS; i++) {
    const r = rnd();
    const t = r < 0.45 ? "get" : r < 0.8 ? "put" : r < 0.88 ? "rm" : r < 0.97 ? "clock" : "cap";
    const action = t === "cap" ? { type: t, n: 2 + Math.floor(rnd() * 4) }
      : t === "rand" || t === "clock" ? { type: t }
        : { type: t, k: pick(KEYS) };
    s = M.lruReducer(s, action);
    check("lru: size within capacity", s.order.length <= s.cap, `size=${s.order.length} cap=${s.cap}`);
    check("lru: no duplicate node in the list", new Set(s.order).size === s.order.length, s.order.join(""));
    check("lru: map and list agree", s.order.every(k => k in s.exp) && Object.keys(s.exp).every(k => s.order.includes(k)), `order=${s.order} exp=${Object.keys(s.exp)}`);
    check("lru: capacity changed took effect", s.cap === (t === "cap" ? action.n : s.cap));
  }
  check("lru: the fuzz actually evicted", s.st.evicts > 0, `evicts=${s.st.evicts}`);
  check("lru: the fuzz actually expired a node", s.st.expired > 0, `expired=${s.st.expired}`);
  const total = s.st.hits + s.st.misses;
  console.log(`  lru      ops=${OPS} hits=${s.st.hits} misses=${s.st.misses} evicts=${s.st.evicts} expired=${s.st.expired} hitRate=${total ? Math.round(100 * s.st.hits / total) : 0}%`);
  // a put→get on the same key must hit while capacity has room
  let t2 = { ...M.lru0(), cap: 4, order: ["A"] };
  t2 = M.lruReducer(t2, { type: "put", k: "Z" });
  t2 = M.lruReducer(t2, { type: "get", k: "Z" });
  check("lru: read-after-write is a hit", t2.st.hits === 1, `hits=${t2.st.hits}`);
  check("lru: the hit moved Z to HEAD", t2.order[0] === "Z", t2.order.join(""));
}

/* --------------------------- 02 · Vending --------------------------- */
{
  let s = M.vend0();
  for (let i = 0; i < OPS; i++) {
    const r = rnd();
    // maint is a mode switch, not traffic: keep it rare or the run spends itself in IllegalStateException
    // "maint" is a toggle, so a symmetric draw would park the machine in MAINTENANCE ~50% of the time.
    // Enter it rarely and leave it fast, the way an operator would.
    const t = s.state === "MAINTENANCE" ? (r < 0.3 ? "maint" : "noop")
      : r < 0.35 ? "coin" : r < 0.64 ? "select" : r < 0.82 ? "checkout" : r < 0.95 ? "cancel" : r < 0.99 ? "restock" : "maint";
    if (t === "noop") continue;
    s = M.vendReducer(s, t === "coin" ? { type: t, v: pick([25, 50, 100]) }
      : t === "select" ? { type: t, code: pick(s.products).code }
        : { type: t });
    if (s.state === "DISPENSING") s = M.vendReducer(s, { type: "finish" });
    check("vending: balance never negative", s.balance >= 0, `balance=${s.balance}`);
    check("vending: no negative stock", s.products.every(p => p.stock >= 0 && p.stock <= p.cap), JSON.stringify(s.products.map(p => [p.code, p.stock])));
    check("vending: vault denominations never negative", Object.values(s.vault).every(v => v >= 0), JSON.stringify(s.vault));
    check("vending: idle state holds no reservation", !(s.state === "IDLE" && s.held), "held leaked into IDLE");
    check("vending: SELECTED always names a held product", s.state !== "SELECTED" || (!!s.held && s.products.some(p => p.code === s.held)), `state=${s.state} held=${s.held}`);
    check("vending: a held reservation is counted in stock", !s.held || s.products.find(p => p.code === s.held).stock < s.products.find(p => p.code === s.held).cap, `held=${s.held}`);
    if (s.receipt) {
      const sum = s.receipt.coins.reduce((a, b) => a + b, 0);
      check("vending: change is exact", sum === s.receipt.change, `${sum} != ${s.receipt.change}`);
      check("vending: paid = price + change", s.receipt.paid === s.receipt.price + s.receipt.change, JSON.stringify(s.receipt));
    }
  }
  check("vending: the fuzz reached a completed sale", s.st.sales > 0, `sales=${s.st.sales} illegal=${s.st.illegal}`);
  check("vending: the fuzz refunded something", s.st.refunded > 0, `refunds=${s.st.refunded}`);
  console.log(`  vending  sales=${s.st.sales} denied=${s.st.denied} refunds=${s.st.refunded} illegalThrows=${s.st.illegal} session=${s.session}`);
  // the invariant that matters most: an illegal call must not move money
  let t3 = M.vendReducer(M.vend0(), { type: "maint" });
  const bal = t3.balance;
  t3 = M.vendReducer(t3, { type: "coin", v: 100 });
  check("vending: insertCoin in MAINTENANCE throws and keeps the balance", t3.state === "MAINTENANCE" && t3.balance === bal, `state=${t3.state} balance=${t3.balance}`);

  // scripted happy path: random traffic proves safety, this proves the receipt arithmetic
  let h = M.vend0();
  h = M.vendReducer(h, { type: "coin", v: 100 });
  h = M.vendReducer(h, { type: "coin", v: 50 });
  const price = h.products.find(p => p.code === "A1").price;
  const stockBefore = h.products.find(p => p.code === "A1").stock;
  h = M.vendReducer(h, { type: "select", code: "A1" });
  check("vending: select reserved the unit", h.state === "SELECTED" && h.products.find(p => p.code === "A1").stock === stockBefore - 1, `stock=${h.products.find(x => x.code === "A1").stock}`);
  h = M.vendReducer(h, { type: "checkout" });
  check("vending: checkout issued a receipt", !!h.receipt, h.log.slice(-1)[0]?.text);
  if (h.receipt) {
    check("vending: change = paid - price", h.receipt.change === 150 - price, `${h.receipt.change} vs ${150 - price}`);
    check("vending: change coins are real vault coins", h.receipt.coins.every(c => [25, 50, 100].includes(c)) && h.vault[25] >= 0, JSON.stringify(h.receipt.coins));
    check("vending: a second checkout() is illegal while dispensing", h.state === "DISPENSING", h.state);
  }
  h = M.vendReducer(h, { type: "finish" });
  check("vending: finish clears the session", h.state === "IDLE" && h.balance === 0 && !h.held, `state=${h.state} bal=${h.balance} held=${h.held}`);
}

/* --------------------------- 03 · Parking --------------------------- */
{
  let s = M.park0();
  for (let i = 0; i < OPS; i++) {
    const r = rnd();
    if (r < 0.45) s = M.parkReducer(s, { type: "enter", t: pick(["CAR", "EV", "MOTORCYCLE", "TRUCK"]) });
    else if (r < 0.6) s = M.parkReducer(s, { type: "race", i });
    else if (r < 0.8) { const open = s.tickets.filter(t => !t.settled); if (open.length) s = M.parkReducer(s, { type: "exit", id: pick(open).id }); }
    else if (r < 0.86) s = M.parkReducer(s, { type: "clock" });
    else if (r < 0.92) s = M.parkReducer(s, { type: "mode", m: rnd() < 0.5 ? "bestfit" : "firstfit" });
    else s = M.parkReducer(s, { type: "replay" });

    const ids = new Set(s.spots.map(x => x.id));
    check("parking: spot ids unique", ids.size === s.spots.length);
    check("parking: one vehicle per spot", s.spots.every(x => !x.occupant || typeof x.occupant.plate === "string"));
    check("parking: tickets are unique by id", new Set(s.tickets.map(t => t.id)).size === s.tickets.length);
    check("parking: occupancy equals unsettled tickets", s.spots.filter(x => x.occupant).length === s.tickets.filter(t => !t.settled).length,
      `spots=${s.spots.filter(x => x.occupant).length} tickets=${s.tickets.filter(t => !t.settled).length}`);
  }
  check("parking: the fuzz filled and emptied the lot", s.st.entered > 0 && s.st.exited > 0, `entered=${s.st.entered} exited=${s.st.exited}`);
  check("parking: the fuzz hit both a full lot and a retry", s.st.full > 0 && s.st.retries > 0, `full=${s.st.full} retries=${s.st.retries}`);
  const avgExamined = (s.st.examined / Math.max(1, s.st.scans)).toFixed(2);
  console.log(`  parking  entered=${s.st.entered} exited=${s.st.exited} waste=${s.st.waste} retries=${s.st.retries} full=${s.st.full} impossible=${s.st.struct} examined/entry=${avgExamined}`);

  // best-fit must examine no more spots than first-fit for the same traffic, and never waste on a truck
  const drive = (mode) => {
    let x = M.parkReducer(M.park0(), { type: "mode", m: mode });
    for (const t of ["MOTORCYCLE", "CAR", "CAR", "MOTORCYCLE", "EV"]) x = M.parkReducer(x, { type: "enter", t });
    return x;
  };
  const bf = drive("bestfit"), ff = drive("firstfit");
  check("parking: best fit wastes less premium space", bf.st.waste <= ff.st.waste, `best=${bf.st.waste} first=${ff.st.waste}`);
  console.log(`  parking  waste bestFit=${bf.st.waste} firstFit=${ff.st.waste} · examined bestFit=${bf.st.examined} firstFit=${ff.st.examined}`);
}

/* --------------------------- 04 · Elevator --------------------------- */
{
  let s = M.el0();
  for (let i = 0; i < OPS; i++) {
    const r = rnd();
    if (r < 0.16) s = M.elReducer(s, { type: "press", floor: Math.floor(rnd() * 8), dir: rnd() < 0.5 ? "UP" : "DOWN" });
    else if (r < 0.26) s = M.elReducer(s, { type: "dest", car: Math.floor(rnd() * 3), floor: Math.floor(rnd() * 8) });
    else if (r < 0.28) s = M.elReducer(s, { type: "fault", car: Math.floor(rnd() * 3) });
    s = M.elReducer(s, { type: "step" });
    s = M.elReducer(s, { type: "fault", car: Math.floor(rnd() * 3) });   // and bring it back
    for (const c of s.cars) {
      check("elevator: floor in range", c.floor >= 0 && c.floor < 8, `car${c.id} floor=${c.floor}`);
      check("elevator: no served call left in a set", [c.up, c.down, c.hallUp, c.hallDown].every(set => set.every(id => !s.callsById[id]?.servedAt)), `car${c.id}`);
      check("elevator: a set never holds duplicates", [c.up, c.down, c.hallUp, c.hallDown].every(set => new Set(set).size === set.length), `car${c.id} ${c.up}`);
      check("elevator: every held call belongs to this car", [c.up, c.down, c.hallUp, c.hallDown].flat().every(id => s.callsById[id]?.car === c.id), `car${c.id} owns ${c.up.concat(c.down, c.hallUp, c.hallDown).join(",")}`);
      check("elevator: a call is registered before it is held", [c.up, c.down, c.hallUp, c.hallDown].flat().every(id => !!s.callsById[id]), `car${c.id}`);
    }
  }
  check("elevator: the fuzz served real demand", s.st.served > 20, `served=${s.st.served}`);
  check("elevator: SCAN actually reversed", s.st.reversals > 0, `reversals=${s.st.reversals}`);
  console.log(`  elevator ticks=${s.ticks} served=${s.st.served} reversals=${s.st.reversals} escalations=${s.st.escalations} released=${s.st.released} worstWait=${s.st.waits.length ? Math.max(...s.st.waits) : 0}`);

  // demand-only run: every hall call must be served, which is the starvation-guard contract
  let q = M.el0();
  for (const [f, d] of [[3, "UP"], [6, "UP"], [1, "DOWN"], [7, "DOWN"], [4, "UP"], [0, "UP"], [5, "DOWN"]]) q = M.elReducer(q, { type: "press", floor: f, dir: d });
  let ticks = 0;
  while (Object.values(q.callsById).some(c => !c.servedAt) && ticks < 400) { q = M.elReducer(q, { type: "step" }); ticks++; }
  const unserved = Object.values(q.callsById).filter(c => !c.servedAt);
  check("elevator: every hall call is eventually served", unserved.length === 0, `unserved=${unserved.map(c => c.floor + c.direction).join(",")} after ${ticks} ticks`);
  console.log(`  elevator 7 calls quiesced in ${ticks} ticks · reversals=${q.st.reversals} · worstWait=${Math.max(...q.st.waits)}`);

  // emergency must park every car at G with doors open and serve nothing new
  let e = M.elReducer(M.el0(), { type: "press", floor: 5, dir: "UP" });
  e = M.elReducer(e, { type: "step" });
  e = M.elReducer(e, { type: "emergency" });
  for (let i = 0; i < 20; i++) e = M.elReducer(e, { type: "step" });
  check("elevator: emergency parks all cars at G", e.cars.every(c => c.floor === 0 && c.state === "DOORS_OPEN"), JSON.stringify(e.cars.map(c => [c.floor, c.state])));
  const before = Object.keys(e.callsById).length;
  e = M.elReducer(e, { type: "press", floor: 4, dir: "UP" });
  check("elevator: emergency rejects new calls", Object.keys(e.callsById).length === before);
}

if (fails.length) { report(); process.exit(1); }
report();
