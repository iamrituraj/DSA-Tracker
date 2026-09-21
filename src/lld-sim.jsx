import React, { useEffect, useReducer, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 * Interactive step-through simulators for the four LLD chapters.
 * Each one runs the real algorithm from the chapter data (not a mock-up),
 * so the animation is the design: relink-on-get, IllegalTransition from the
 * state that disallows it, CAS claim per spot, SCAN with four ordered sets.
 *
 * The reducers and their initial-state factories are exported for scripts/verify-lld-sims.mjs,
 * which drives each one through thousands of random operations and asserts the invariants an
 * interviewer would ask about. The UI only ever uses the components.
 * ------------------------------------------------------------------ */

/* ------------------------------- shared bits ------------------------------- */

function SimAct({ children, onClick, tone = "", disabled, title }) {
  return <button type="button" title={title} className={`sim-act${tone ? " " + tone : ""}`} disabled={disabled} onClick={onClick}>{children}</button>;
}

function SimSeg({ label, options, value, onChange }) {
  return <div className="sim-field">{label && <span className="sim-lbl">{label}</span>}<div className="sim-seg">
    {options.map(o => <button type="button" key={String(o.value)} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}</button>)}
  </div></div>;
}

function SimLog({ rows, hint }) {
  return <div className="sim-log-wrap">
    <ol className="sim-log" aria-live="polite">
      {rows.map(r => <li key={r.id} className={`tone-${r.tone}`}><i>#{r.at}</i><span>{r.text}</span></li>)}
    </ol>
    {hint && <p className="sim-hint">{hint}</p>}
  </div>;
}

function SimStat({ items }) {
  return <div className="sim-stats">{items.map(([k, v, tone]) => <div key={k} className={tone ? `t-${tone}` : ""}><small>{k}</small><b>{v}</b></div>)}</div>;
}

/* push a log row; keeps the newest 40 and numbers them by op sequence */
function log(s, tone, text) {
  const rows = s.log.concat([{ id: s.seq, at: s.seq, tone, text }]);
  return { log: rows.slice(-40), seq: s.seq + 1 };
}

/* ------------------------------- 01 · LRU cache ------------------------------- */

const LRU_KEYS = ["A", "B", "C", "D", "E", "F"];
const COL = 84;                       // px per column in the list strip
const LRU_TTL = 3;                    // ticks

export const lru0 = () => ({
  cap: 4, ttl: false, clock: 0, order: ["B", "A", "C"], exp: {},
  seq: 1, log: [], st: { hits: 0, misses: 0, evicts: 0, expired: 0 },
  leaving: null, fx: [], pulse: 0,
});

function lruDead(s, k) {
  return s.ttl && s.exp[k] != null && s.exp[k] <= s.clock;
}

function lruCut(s, k) {
  // unlink one node from the list (map entry drops with it)
  const exp = { ...s.exp }; delete exp[k];
  return { order: s.order.filter(x => x !== k), exp };
}

export function lruReducer(s, a) {
  switch (a.type) {
    case "reset": return lru0();
    case "cap": {
      let order = s.order.slice(), exp = { ...s.exp }, evicts = s.st.evicts, rows = [];
      while (order.length > a.n) { const k = order.pop(); delete exp[k]; evicts++; rows.push(`capacity ↓ → cut the LRU node (${k}) before TAIL`); }
      let next = { ...s, cap: a.n, order, exp, st: { ...s.st, evicts } };
      for (const t of rows) next = { ...next, ...log(next, "warn", t) };
      return next;
    }
    case "ttl": {
      const exp = {}; let order = s.order;
      if (a.on) order.forEach((k, i) => { exp[k] = s.clock + LRU_TTL + i; });   // staggered, so a sweep un-links them one at a time
      const next = { ...s, ttl: a.on, exp, order };
      return { ...next, ...log(next, "info", a.on ? `TTL on — every live node gets expiresAt = now+${LRU_TTL}. Now a get() has to un-link too.` : "TTL off — pure recency.") };
    }
    case "get": case "put": {
      const k = a.k, isGet = a.type === "get";
      const inMap = s.order.includes(k);
      if (inMap && lruDead(s, k)) {
        const cut = lruCut(s, k);
        let next = { ...s, ...cut, st: { ...s.st, expired: s.st.expired + 1 } };
        next = { ...next, ...log(next, "warn", `${isGet ? "get" : "put"}(${k}) → the map still points at the node, but expiresAt ≤ now → unlink it first${isGet ? " and return −1" : ""}`) };
        next = { ...next, leaving: { k, id: next.seq }, fx: next.fx.concat([{ id: next.seq + 0.5, kind: "expire", at: next.order.length }]).slice(-5) };
        if (isGet) return { ...next, st: { ...next.st, misses: next.st.misses + 1 } };
        return lruInsert(next, k);
      }
      if (isGet && !inMap) {
        const next = { ...s, ...log(s, "bad", `get(${k}) → miss: no map entry, nothing to relink → return −1`), st: { ...s.st, misses: s.st.misses + 1 }, pulse: s.pulse + 1 };
        return next;
      }
      if (inMap) {
        const order = [k].concat(s.order.filter(x => x !== k));
        let next = { ...s, order, exp: s.ttl ? { ...s.exp, [k]: s.clock + LRU_TTL } : s.exp };
        next = { ...next, ...log(next, "good", isGet
          ? `get(${k}) → hit. Read is a write: unlink the node, insert at HEAD. O(1) because the map hands you the node, not an index.`
          : `put(${k}) → overwrite in place: same node, new value, moved to HEAD — no eviction because size is unchanged.`) };
        next = { ...next, fx: next.fx.concat([{ id: next.seq + 0.5, kind: "relink", at: 0 }]).slice(-5) };
        return isGet ? { ...next, st: { ...next.st, hits: next.st.hits + 1 } } : next;
      }
      return lruInsert(s, k);
    }
    case "rm": {
      if (!s.order.includes(a.k)) return { ...s, ...log(s, "bad", `remove(${a.k}) → not present; return null and leave the list untouched`) };
      const cut = lruCut(s, a.k);
      const next = { ...s, ...cut, leaving: { k: a.k, id: s.seq } };
      return { ...next, ...log(next, "warn", `remove(${a.k}) → unlink from the middle: prev.next = next, next.prev = prev. This is why the list is doubly linked.`) };
    }
    case "clock": {
      const clock = s.clock + 1;
      let next = { ...s, clock };
      const dead = next.order.filter(k => next.ttl && next.exp[k] != null && next.exp[k] <= clock);
      if (!next.ttl) return { ...next, ...log(next, "info", `tick → clock = ${clock}. Turn TTL on to see expiry un-link nodes.`) };
      if (!dead.length) return { ...next, ...log(next, "info", `tick → clock = ${clock}; every entry still live (${next.order.map(k => `${k}@${next.exp[k] - clock}`).join(" ")}).`) };
      for (const k of dead) {
        const cut = lruCut(next, k);
        next = { ...next, ...cut, st: { ...next.st, expired: next.st.expired + 1 }, leaving: { k, id: next.seq } };
        next = { ...next, ...log(next, "warn", `tick → clock = ${clock}: ${k} expired. A lazy sweep removes it from BOTH structures — a stale map entry is a leak.`) };
      }
      return next;
    }
    case "rand": {
      const k = LRU_KEYS[Math.floor(a.rng[0] * LRU_KEYS.length)];
      return lruReducer(s, { type: a.rng[1] < 0.62 ? "get" : "put", k });
    }
    default: return s;
  }
}

function lruInsert(s, k) {
  let order = [k].concat(s.order.filter(x => x !== k));
  const exp = s.ttl ? { ...s.exp, [k]: s.clock + LRU_TTL } : s.exp;
  let next = { ...s, order, exp };
  next = { ...next, ...log(next, "good", `put(${k}) → new node at HEAD + map entry added in the same step (two structures, one invariant).`) };
  if (order.length > s.cap) {
    const victim = order[order.length - 1];
    order = order.slice(0, s.cap);
    const clean = { ...exp }; delete clean[victim];
    next = { ...next, order, exp: clean, leaving: { k: victim, id: next.seq }, st: { ...next.st, evicts: next.st.evicts + 1 } };
    next = { ...next, ...log(next, "bad", `size ${order.length + 1} > capacity ${s.cap} → evict ${victim} (the node before TAIL) and delete its map key too.`) };
    next = { ...next, fx: next.fx.concat([{ id: next.seq + 0.5, kind: "evict", at: s.cap + 1 }]).slice(-5) };
  }
  return next;
}

export function LruSim() {
  const [s, dispatch] = useReducer(lruReducer, undefined, lru0);
  const [auto, setAuto] = useState(false);
  const rng = useRef(0.4);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => { rng.current = (rng.current * 9301 + 49297) % 233280 / 233280; dispatch({ type: "rand", rng: [rng.current, (rng.current * 7) % 1] }); }, 1100);
    return () => clearInterval(t);
  }, [auto]);

  const hitRate = s.st.hits + s.st.misses ? Math.round(100 * s.st.hits / (s.st.hits + s.st.misses)) : 0;
  return <div className="sim sim-lru">
    <div className="sim-stage">
      <div className="sim-strip" style={{ width: (s.cap + 3) * COL }}>
        <div className="sim-sentinel" style={{ left: 0 }}><b>HEAD</b><small>MRU · sentinel</small></div>
        {s.order.map((k, i) => <div key={k} className={`sim-col${i === 0 ? " at-head" : ""}${i === s.order.length - 1 ? " at-tail" : ""}`} style={{ left: (i + 1) * COL }}>
          <div className="sim-node">{k}<small>{s.ttl ? `t+${Math.max(0, (s.exp[k] ?? 0) - s.clock)}` : "val"}</small></div>
          <div className="sim-ptr" />
          <div className="sim-mapcell">{k} ↦ <em>node</em></div>
        </div>)}
        {s.leaving && <div key={s.leaving.id} className="sim-col is-leaving" style={{ left: (s.cap + 2) * COL }}>
          <div className="sim-node is-victim">{s.leaving.k}<small>evicted</small></div>
        </div>}
        <div className="sim-sentinel" style={{ left: (s.order.length + 1) * COL }}><b>TAIL</b><small>LRU · evict here</small></div>
        {s.fx.map(f => <div key={f.id} className={`sim-fx fx-${f.kind}`} style={{ left: (f.at + 1) * COL }} />)}
      </div>
      <div className="sim-mapbox"><b>HashMap&lt;K, Node&gt;</b><span>O(1) lookup gives you the node itself, so unlinking it is O(1) too — that pairing <em>is</em> the design.</span></div>
    </div>

    <div className="sim-controls">
      <SimSeg label="capacity" value={s.cap} onChange={n => dispatch({ type: "cap", n })} options={[2, 3, 4, 5].map(n => ({ value: n, label: n }))} />
      <SimSeg label="TTL" value={s.ttl ? "on" : "off"} onChange={v => dispatch({ type: "ttl", on: v === "on" })} options={[{ value: "off", label: "off" }, { value: "on", label: `on (${LRU_TTL} ticks)`}]} />
      <div className="sim-keys">
        <span className="sim-lbl">get(key)</span>
        {LRU_KEYS.map(k => <SimAct key={k} tone={s.order.includes(k) ? "good" : ""} onClick={() => dispatch({ type: "get", k })}>{k}</SimAct>)}
      </div>
      <div className="sim-keys">
        <span className="sim-lbl">put(key)</span>
        {LRU_KEYS.map(k => <SimAct key={k} onClick={() => dispatch({ type: "put", k })}>{k}</SimAct>)}
      </div>
      <div className="sim-keys">
        <span className="sim-lbl">other</span>
        {LRU_KEYS.filter(k => s.order.includes(k)).map(k => <SimAct key={k} tone="ghost" onClick={() => dispatch({ type: "rm", k })}>remove {k}</SimAct>)}
      </div>
      <div className="sim-row">
        <SimAct onClick={() => dispatch({ type: "clock" })}>⏱ advance clock</SimAct>
        <SimAct tone={auto ? "warn" : ""} onClick={() => setAuto(x => !x)}>{auto ? "■ stop random workload" : "▶ run random workload"}</SimAct>
        <SimAct tone="ghost" onClick={() => { setAuto(false); dispatch({ type: "reset" }); }}>reset</SimAct>
      </div>
    </div>

    <SimStat items={[["size", `${s.order.length}/${s.cap}`], ["hits", s.st.hits, "good"], ["misses", s.st.misses, "bad"], ["evictions", s.st.evicts], ["expired", s.st.expired, "warn"], ["hit rate", `${hitRate}%`]]} />
    <SimLog rows={s.log.slice(-8).reverse()} hint="Watch what a get() costs: the node slides to HEAD on every hit. That is why a read-write lock does not help and sharding does." />
  </div>;
}

/* --------------------------- 02 · Vending machine --------------------------- */

const VEND_PRODUCTS = [
  { code: "A1", name: "Cola", price: 125, stock: 3, cap: 3 },
  { code: "B2", name: "Chips", price: 100, stock: 2, cap: 2 },
  { code: "C3", name: "Water", price: 50, stock: 0, cap: 3 },
  { code: "D4", name: "Coffee", price: 150, stock: 4, cap: 4 },
];
const DENOMS = [100, 50, 25];
const STATE_BOXES = {
  IDLE: [24, 130, 140, 58], HAS_BALANCE: [218, 30, 158, 58], SELECTED: [440, 30, 150, 58],
  DISPENSING: [440, 208, 150, 58], MAINTENANCE: [196, 258, 176, 54],
};
const VEND_EDGES = [
  ["IDLE", "HAS_BALANCE", "insertCoin", "r", "l", 0],
  ["HAS_BALANCE", "SELECTED", "select · reserve", "r", "l", 0],
  ["SELECTED", "DISPENSING", "checkout · commit", "b", "t", 0],
  ["DISPENSING", "IDLE", "receipt · reset", "l", "b", 40],
  ["HAS_BALANCE", "IDLE", "cancel · refund", "l", "r", 26],
  ["SELECTED", "IDLE", "cancel · release", "b", "t", -70],
  ["IDLE", "MAINTENANCE", "enterMaintenance", "b", "l", 0],
  ["MAINTENANCE", "IDLE", "restore", "t", "b", 0],
  ["SELECTED", "HAS_BALANCE", "denied → rollback", "l", "r", 20],
];
const STATE_ALLOWED = {
  IDLE: ["insertCoin", "enterMaintenance"],
  HAS_BALANCE: ["insertCoin", "select", "cancel"],
  SELECTED: ["checkout", "cancel"],
  DISPENSING: [],
  MAINTENANCE: ["restore"],
};

export const vend0 = () => ({
  state: "IDLE", balance: 0, vault: { 25: 4, 50: 2, 100: 1 }, products: VEND_PRODUCTS.map(p => ({ ...p })),
  held: null, session: 1, seq: 1, log: [], st: { sales: 0, denied: 0, refunded: 0, illegal: 0 },
  receipt: null, fx: [], error: null, busy: false,
});

function canMake(vault, amount) {
  const coins = []; let left = amount;
  for (const d of DENOMS) {
    while (left >= d && (vault[d] ?? 0) > coins.filter(c => c === d).length) { coins.push(d); left -= d; }
  }
  return left === 0 ? coins : null;
}

export function vendReducer(s, a) {
  const ill = (op) => {
    const next = { ...s, ...log(s, "bad", `IllegalStateException from ${op}(): ${STATE_ALLOWED[s.state].length ? `state ${s.state} only allows ${STATE_ALLOWED[s.state].join(" / ")}` : `${s.state} accepts no customer calls at all`}`), st: { ...s.st, illegal: s.st.illegal + 1 }, error: { op, id: s.seq } };
    return { ...next, fx: next.fx.concat([{ id: next.seq + 0.5, kind: "shake", at: 0 }]).slice(-4) };
  };
  switch (a.type) {
    case "reset": return vend0();
    case "coin": {
      if (s.state === "MAINTENANCE" || s.state === "DISPENSING") return ill(`insertCoin(${a.v})`);
      const vault = { ...s.vault, [a.v]: (s.vault[a.v] ?? 0) + 1 };
      const balance = s.balance + a.v;
      const next = { ...s, vault, balance, state: "HAS_BALANCE", error: null };
      return { ...next, ...log(next, "good", `insertCoin(${a.v}) → vault credited, balance = ${balance}. IdleState/HasBalanceState own this transition, the machine just delegates.`) };
    }
    case "select": {
      if (s.state !== "HAS_BALANCE" && s.state !== "SELECTED") return ill(`select("${a.code}")`);
      const p = s.products.find(x => x.code === a.code);
      if (!p) return ill(`select("${a.code}")`);
      if (p.stock - (s.held === a.code ? 1 : 0) <= 0) {
        const products = s.held ? s.products.map(x => x.code === s.held ? { ...x, stock: x.stock + 1 } : x) : s.products;
        const state = s.balance > 0 ? "HAS_BALANCE" : "IDLE";
        const next = { ...s, products, held: null, state, st: { ...s.st, denied: s.st.denied + 1 }, error: { op: a.code, id: s.seq } };
        const logged = { ...next, ...log(next, "bad", `OutOfStock: ${a.code} — rejected before any money moved${s.held ? `, and the previous reservation was released back to ${state}` : ""}.`) };
        return { ...logged, fx: logged.fx.concat([{ id: logged.seq + 0.5, kind: "shake", at: 0 }]).slice(-4) };
      }
      if (s.balance < p.price) {
        const products = s.held ? s.products.map(x => x.code === s.held ? { ...x, stock: x.stock + 1 } : x) : s.products;
        const state = s.balance > 0 ? "HAS_BALANCE" : "IDLE";   // the reservation is gone, so SELECTED would be a lie
        const next = { ...s, held: null, products, state, error: { op: a.code, id: s.seq } };
        return { ...next, ...log(next, "warn", `InsufficientBalance: ${a.code} costs ${p.price}, you have ${s.balance}. Rejected before mutating anything${s.held ? `, and the earlier reservation was released` : ""} — back to ${state}.`) };
      }
      const prev = s.held ? s.products.map(x => x.code === s.held ? { ...x, stock: x.stock + 1 } : x) : s.products;
      const next = { ...s, state: "SELECTED", held: a.code, products: prev.map(x => x.code === a.code ? { ...x, stock: x.stock - 1 } : x), error: null };
      return { ...next, ...log(next, "good", `select("${a.code}") → stock RESERVED for session ${s.session} (count ${next.products.find(x => x.code === a.code).stock} left). Balance ${s.balance} ≥ ${p.price}.`) };
    }
    case "checkout": {
      if (s.state !== "SELECTED") return ill("checkout()");
      const p = s.products.find(x => x.code === s.held);
      if (!p) return ill("checkout()");   // a SELECTED state with nothing held is a bug, and it must fail loudly, not dispense undefined
      const change = s.balance - p.price;
      const coins = canMake(s.vault, change);
      if (!coins && change > 0) {
        return { ...s, ...log(s, "warn", `ChangeUnavailable for ${change}: probed the vault BEFORE debiting anything, so the reservation stands and the balance is untouched. Ordering matters.`), error: { op: "change", id: s.seq }, st: { ...s.st, denied: s.st.denied + 1 } };
      }
      const vault = { ...s.vault };
      coins.forEach(d => { vault[d] -= 1; });
      const next = {
        ...s, busy: true, state: "DISPENSING", vault,
        receipt: { code: p.code, name: p.name, price: p.price, paid: s.balance, change, coins },
        st: { ...s.st, sales: s.st.sales + 1 }, error: null,
      };
      return { ...next, ...log(next, "good", `checkout() → commit reservation, dispense ${p.code}, return ${change} as [${coins.join(", ") || "—"}]. DispensingState runs it; a second checkout() now throws.`) };
    }
    case "finish": {
      const r = s.receipt;
      const next = { ...s, busy: false, state: "IDLE", balance: 0, held: null, session: s.session + 1, products: r ? s.products.map(x => x.code === r.code ? { ...x, sold: (x.sold ?? 0) + 1 } : x) : s.products };
      return { ...next, ...log(next, "info", `→ IDLE. Session id ${next.session} opens: a stale request from session ${next.session - 1} can no longer touch this one.`) };
    }
    case "cancel": {
      if (s.state === "MAINTENANCE") return ill("cancel()");
      if (s.balance === 0 && !s.held) return { ...s, ...log(s, "info", "cancel() with nothing held → returns 0 and stays Idle. Idempotent, so a double press is harmless.") };
      const refund = s.balance;
      const vault = { ...s.vault };
      let left = refund; const give = [];
      for (const d of DENOMS) { while (left >= d && (vault[d] ?? 0) > give.filter(c => c === d).length) { give.push(d); vault[d] -= 1; left -= d; } }
      if (left > 0) for (const d of give) vault[d] += 1;
      const products = s.held ? s.products.map(x => x.code === s.held ? { ...x, stock: x.stock + 1 } : x) : s.products;
      const next = { ...s, balance: 0, held: null, state: "IDLE", vault, products, st: { ...s.st, refunded: s.st.refunded + 1 }, error: null };
      return { ...next, ...log(next, "warn", left > 0
        ? `cancel() → the vault cannot refund ${refund} exactly, so nothing was dispensed and the balance is held for an attendant. Reserved stock released.`
        : `cancel() → reservation released back to stock, ${refund} refunded as [${give.join(", ") || "—"}]. Two-phase reserve/commit/release is what makes this safe.`) };
    }
    case "maint": {
      if (s.state === "MAINTENANCE") return { ...s, ...log(s, "info", "restore() → Idle. Every other call threw while we were here.") };
      const products = s.held ? s.products.map(x => x.code === s.held ? { ...x, stock: x.stock + 1 } : x) : s.products;
      const next = { ...s, state: "MAINTENANCE", balance: 0, held: null, products };
      return { ...next, ...log(next, "warn", `enterMaintenance() → added state: no customer call is legal here. In the old if-ladder design this was a boolean checked in five methods.`) };
    }
    case "restock": {
      // respect an in-flight reservation: refilling to cap must not conjure a second unit of the held slot
      const next = { ...s, products: s.products.map(x => ({ ...x, stock: x.code === s.held ? x.cap - 1 : x.cap })) };
      return { ...next, ...log(next, "info", "Restocked every slot — a Machine operation, never reachable from the customer-facing interface.") };
    }
    default: return s;
  }
}

function StateNode({ id, box, current, error }) {
  const [x, y, w, h] = box;
  return <g className={`sim-state${current ? " is-current" : ""}${error ? " is-error" : ""}`}>
    <rect x={x} y={y} width={w} height={h} rx={12} className="ld-box" />
    <text x={x + w / 2} y={y + (id.length > 10 ? 24 : 27)} textAnchor="middle" className="ld-t" style={{ fontSize: 12, fontWeight: 800 }}>{id}</text>
    {current && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={14} className="sim-halo" />}
  </g>;
}

export function VendingSim() {
  const [s, dispatch] = useReducer(vendReducer, undefined, vend0);
  useEffect(() => {
    if (s.state !== "DISPENSING" || !s.busy) return;
    const t = setTimeout(() => dispatch({ type: "finish" }), 1050);
    return () => clearTimeout(t);
  }, [s.state, s.busy]);

  const anchor = (id, side) => {
    const [x, y, w, h] = STATE_BOXES[id];
    return side === "r" ? [x + w, y + h / 2] : side === "l" ? [x, y + h / 2] : side === "t" ? [x + w / 2, y] : [x + w / 2, y + h];
  };
  const total = s.products.reduce((a, p) => a + p.stock, 0);

  return <div className="sim sim-vend">
    <div className="sim-stage sim-vend-stage">
      <svg viewBox="0 0 640 340" className="lld-svg sim-machine" role="img" aria-label="Vending machine state machine you drive">
        <defs><marker id="sim-vend-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker" /></marker></defs>
        {VEND_EDGES.map(([from, to, label, s1, s2, bow], i) => {
          const [x1, y1] = anchor(from, s1), [x2, y2] = anchor(to, s2);
          const mx = (x1 + x2) / 2 + bow * (y2 > y1 ? 0.3 : -0.3), my = (y1 + y2) / 2 - bow;
          const used = s.state === to || (s.state === from && s.balance === 0 && to === "IDLE");
          return <g key={i} className={used ? "is-hot" : ""}>
            <path d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" markerEnd="url(#sim-vend-a)" className="ld-line sim-edge" />
            <text x={mx} y={my - 4} textAnchor="middle" className="ld-muted sim-elabel">{label}</text>
          </g>;
        })}
        {Object.entries(STATE_BOXES).map(([id, box]) => <StateNode key={id} id={id} box={box} current={s.state === id} error={s.error && s.state === id} />)}
        {s.state === "DISPENSING" && <g className="sim-drop"><circle cx={515} cy={268} r={7} className="ld-fill-accent" /></g>}
      </svg>

      <div className="sim-vend-side">
        <div className="sim-money">
          <div><small>balance (cents)</small><b key={s.balance} className={s.error ? "shake" : ""}>◉ {s.balance}</b></div>
          <div><small>state</small><b className="sim-statepill">{s.state}</b></div>
          <div><small>session</small><b>#{s.session}</b></div>
        </div>
        <div className="sim-keys">
          {DENOMS.slice().reverse().map(d => <SimAct key={d} onClick={() => dispatch({ type: "coin", v: d })} disabled={s.busy}>+{d}</SimAct>)}
        </div>
        <div className="sim-keys">
          <SimAct tone="primary" disabled={s.busy} onClick={() => dispatch({ type: "checkout" })}>checkout()</SimAct>
          <SimAct tone="warn" disabled={s.busy} onClick={() => dispatch({ type: "cancel" })}>cancel()</SimAct>
        </div>
        <div className="sim-keys">
          <SimAct tone="ghost" onClick={() => dispatch({ type: "maint" })}>{s.state === "MAINTENANCE" ? "restore()" : "enterMaintenance()"}</SimAct>
          <SimAct tone="ghost" onClick={() => dispatch({ type: "restock" })}>restock()</SimAct>
        </div>
        <p className="sim-allowed">legal right now in <b>{s.state}</b>: {STATE_ALLOWED[s.state].join(" · ") || "— nothing —"}</p>

        <div className="sim-slots">
          {s.products.map(p => <div key={p.code} className={`sim-slot${p.stock === 0 ? " is-empty" : ""}${s.held === p.code ? " is-held" : ""}`}>
            <b>{p.code}</b><span>{p.name} · {p.price}</span>
            <div className="sim-stock"><i style={{ width: `${100 * p.stock / p.cap}%` }} /></div>
            <em>{p.stock}/{p.cap}{s.held === p.code ? " · held" : ""}</em>
            <SimAct disabled={s.busy} onClick={() => dispatch({ type: "select", code: p.code })}>select</SimAct>
          </div>)}
        </div>

        <div className="sim-vault">
          <small>coin vault</small>
          {DENOMS.slice().reverse().map(d => <span key={d}>{d}×<b>{s.vault[d] ?? 0}</b></span>)}
          <span className="sim-vault-note">change for {s.state === "SELECTED" ? (s.balance - (s.products.find(p => p.code === s.held)?.price ?? 0)) : 0} = {JSON.stringify((() => { const p = s.products.find(x => x.code === s.held); return canMake(s.vault, p ? s.balance - p.price : 0) ?? "impossible"; })())}</span>
        </div>

        {s.receipt && s.state === "DISPENSING" && <div className="sim-receipt"><b>RECEIPT · {s.receipt.name}</b><span>paid {s.receipt.paid} · price {s.receipt.price} · change {s.receipt.change} {s.receipt.coins.length ? `(${s.receipt.coins.join("+")})` : ""}</span></div>}
      </div>
    </div>

    <SimStat items={[["sales", s.st.sales, "good"], ["denied", s.st.denied, "warn"], ["refunds", s.st.refunded], ["illegal throws", s.st.illegal, "bad"], ["units left", total], ["vault coins", DENOMS.reduce((a, d) => a + (s.vault[d] ?? 0), 0)]]} />
    <SimLog rows={s.log.slice(-8).reverse()} hint="Every button calls the context, which delegates to the state object. Illegal operations throw from the state — there is no if-chain anywhere." />
  </div>;
}

/* ------------------------------- 03 · Parking lot ------------------------------- */

const SPOT_KINDS = {
  M: { letter: "M", label: "motorcycle", maxLen: 2.5, maxHgt: 1.6 },
  C: { letter: "C", label: "compact", maxLen: 5.0, maxHgt: 2.0 },
  L: { letter: "L", label: "large", maxLen: 9.5, maxHgt: 3.5 },
  E: { letter: "E", label: "ev · charger", maxLen: 5.2, maxHgt: 2.0, charger: true },
};
const VEH = {
  MOTORCYCLE: { name: "Motorcycle", short: "M", len: 2.2, hgt: 1.3, ladder: ["M", "C"] },
  CAR: { name: "Car", short: "C", len: 4.5, hgt: 1.5, ladder: ["C", "L", "E"] },
  EV: { name: "EV · needs charger", short: "E", len: 4.6, hgt: 1.6, ladder: ["E", "C", "L"], charger: true },
  TRUCK: { name: "Truck", short: "T", len: 9.0, hgt: 3.2, ladder: ["L"], chock: true },
};
const PLAN = [
  { level: 0, name: "G", kinds: "MCCCLECLLCEM".split("") },
  { level: 1, name: "L1", kinds: "MCCLLECCMLCE".split("") },
];
const RATE = { graceMin: 15, perHour: 120, dayCap: 600 };

const spots0 = () => PLAN.flatMap(f => f.kinds.map((k, i) => ({
  id: `${f.name}-${String(i + 1).padStart(2, "0")}`, kind: k, level: f.level, floor: f.name,
  dist: 8 + i * 7 + f.level * 45, occupant: null,
})));

export const park0 = () => ({
  mode: "bestfit", spots: spots0(), tickets: [], seq: 1, log: [], plate: 1, clock: 0,
  st: { entered: 0, exited: 0, full: 0, struct: 0, scans: 0, examined: 0, waste: 0, races: 0, retries: 0 },
  probe: null, last: null, settled: null,
});

const fitsDims = (spot, v) => v.len <= SPOT_KINDS[spot.kind].maxLen && v.hgt <= SPOT_KINDS[spot.kind].maxHgt;
const accepts = (spot, v) => v.ladder.includes(spot.kind) && fitsDims(spot, v) && (!v.charger || spot.kind === "E");

function allocate(s, v) {
  const probe = [];
  let examined = 0;
  if (s.mode === "bestfit") {
    for (const kind of v.ladder) {
      const free = s.spots.filter(sp => sp.kind === kind && !sp.occupant);
      const ok = free.filter(sp => fitsDims(sp, v));
      examined += free.length;
      if (!ok.length) { probe.push({ kind, verdict: `kind ladder step: ${SPOT_KINDS[kind].label} — ${free.length} free, none accepted the shape` }); continue; }
      const nearest = ok.slice().sort((a, b) => a.dist - b.dist)[0];
      probe.push({ kind, verdict: `${ok.length} candidates of ${SPOT_KINDS[kind].label} → nearest is ${nearest.id} (${nearest.dist} m from the exit)`, winner: nearest.id });
      return { spot: nearest, probe, examined };
    }
    return { spot: null, probe, examined };
  }
  for (const sp of s.spots) {
    examined += 1;
    if (!sp.occupant && accepts(sp, v)) { probe.push({ kind: sp.kind, verdict: `scan order hit: ${sp.id} is the first free spot that accepts it (kind preference ignored)`, winner: sp.id }); return { spot: sp, probe, examined }; }
  }
  return { spot: null, probe, examined };
}

export function parkReducer(s, a) {
  switch (a.type) {
    case "reset": return park0();
    case "mode": {
      const next = { ...s, mode: a.m };
      return { ...next, ...log(next, "info", a.m === "bestfit" ? "Strategy = bestFitNearest(): kind ladder first, then distance. Compare the two counters it moves — premium waste falls, spots examined may rise. That trade is the argument." : "Strategy = firstFit(): scan every spot in index order. Same code path, different injected strategy — that is the whole point of the seam.") };
    }
    case "clock": {
      const next = { ...s, clock: s.clock + 15 };
      return { ...next, ...log(next, "info", `clock → +15 min (now t=${next.clock}). Fees are computed from instants, never from a local wall clock.`) };
    }
    case "enter": {
      const v = VEH[a.t];
      const plate = `DL-${100 + s.plate}`;
      const { spot, probe, examined } = allocate(s, v);
      let next = { ...s, probe, st: { ...s.st, scans: s.st.scans + 1, examined: s.st.examined + examined } };
      if (!spot) {
        const structural = !s.spots.some(sp => accepts(sp, v));
        next = { ...next, st: { ...next.st, ...(structural ? { struct: next.st.struct + 1 } : { full: next.st.full + 1 }) }, last: null };
        return { ...next, ...log(next, "bad", `${v.name} ${plate} → ${structural ? `structurally impossible: no spot in this layout ever accepts ${v.len} m × ${v.hgt} m. Distinguish that from "full" — ops alerts differently.` : "temporarily full. Nothing was debited: allocation is all-or-nothing."}`) };
      }
      const waste = spot.kind !== v.ladder[0] && !v.charger;
      const ticket = { id: `T-${s.plate}`, plate, type: a.t, spotId: spot.id, floor: spot.floor, entry: s.clock, settled: false };
      const spots = s.spots.map(sp => sp.id === spot.id ? { ...sp, occupant: { plate, type: a.t } } : sp);
      next = { ...next, spots, tickets: next.tickets.concat([ticket]), plate: s.plate + 1, last: ticket.id, settled: null, st: { ...next.st, entered: next.st.entered + 1, waste: next.st.waste + (waste ? 1 : 0) } };
      return { ...next, ...log(next, waste ? "warn" : "good", `CAS ${spot.id}: null → ${plate} succeeded. ${waste ? `Premium capacity spent: a ${v.name} took a ${SPOT_KINDS[spot.kind].label} spot — first-fit does this all day.` : `Best fit honored (${SPOT_KINDS[spot.kind].label}).`} · examined ${examined} spots` + (ticket ? ` · ticket ${ticket.id}` : "")) };
    }
    case "race": {
      const pairs = [["CAR", "EV"], ["MOTORCYCLE", "CAR"], ["CAR", "TRUCK"], ["EV", "MOTORCYCLE"]];
      const [ta, tb] = pairs[a.i % pairs.length];
      const va = VEH[ta], vb = VEH[tb];
      const ra = allocate(s, va), rb = allocate(s, vb);
      let next = { ...s, st: { ...s.st, races: s.st.races + 1 } };
      const plateA = `DL-${100 + s.plate}`, plateB = `DL-${101 + s.plate}`;
      if (ra.spot && rb.spot && ra.spot.id === rb.spot.id) {
        const spots = s.spots.map(sp => sp.id === ra.spot.id ? { ...sp, occupant: { plate: plateA, type: va.name } } : sp);
        const retry = allocate({ ...s, spots }, vb);
        if (!retry.spot) {
          // gate 1 still won that spot, so it still owns a ticket — otherwise the lot holds a car no receipt accounts for
          const tWin = { id: `T-${s.plate}`, plate: plateA, type: va.name, spotId: ra.spot.id, floor: ra.spot.floor, entry: s.clock, settled: false };
          next = { ...next, spots, tickets: next.tickets.concat([tWin]), plate: s.plate + 1, last: tWin.id, probe: rb.probe.concat([{ kind: rb.spot ? rb.spot.kind : va.ladder[0], verdict: `gate 2 lost the CAS on ${ra.spot.id} and every later candidate failed → ParkingFullException` }]), st: { ...next.st, entered: next.st.entered + 1, retries: next.st.retries + 1, full: next.st.full + 1 } };
          return { ...next, ...log(next, "bad", `Both gates read ${ra.spot.id} from the free queue. gate 1 CAS(null→${plateA}) = true · gate 2 CAS(null→${plateB}) = false → loop to the next candidate; none left. No lock spanned a decision, so the loser just retried.`) };
        }
        const spots2 = spots.map(sp => sp.id === retry.spot.id ? { ...sp, occupant: { plate: plateB, type: vb.name } } : sp);
        const t = [
          { id: `T-${s.plate}`, plate: plateA, type: va.name, spotId: ra.spot.id, floor: ra.spot.floor, entry: s.clock, settled: false },
          { id: `T-${s.plate + 1}`, plate: plateB, type: vb.name, spotId: retry.spot.id, floor: retry.spot.floor, entry: s.clock, settled: false },
        ];
        next = { ...next, spots: spots2, tickets: next.tickets.concat(t), plate: s.plate + 2, last: t[1].id, st: { ...next.st, entered: next.st.entered + 2, retries: next.st.retries + 1, examined: next.st.examined + ra.examined + rb.examined + retry.examined } };
        return { ...next, ...log(next, "warn", `Two gates wanted ${ra.spot.id}: CAS winner = gate 1 (${plateA}); gate 2 retried and claimed ${retry.spot.id}. One spot, one vehicle — invariant held without a lot-wide mutex.`) };
      }
      if (!ra.spot || !rb.spot) return { ...next, ...log(next, "bad", "Race aborted: the lot cannot serve both. Same typed exception as a normal full-lot entry.") };
      const spots = s.spots.map(sp => (sp.id === ra.spot.id ? { ...sp, occupant: { plate: plateA, type: va.name } } : sp.id === rb.spot.id ? { ...sp, occupant: { plate: plateB, type: vb.name } } : sp));
      const t = [
        { id: `T-${s.plate}`, plate: plateA, type: va.name, spotId: ra.spot.id, floor: ra.spot.floor, entry: s.clock, settled: false },
        { id: `T-${s.plate + 1}`, plate: plateB, type: vb.name, spotId: rb.spot.id, floor: rb.spot.floor, entry: s.clock, settled: false },
      ];
      next = { ...next, spots, tickets: next.tickets.concat(t), plate: s.plate + 2, last: t[1].id, probe: ra.probe, st: { ...next.st, entered: next.st.entered + 2, examined: next.st.examined + ra.examined + rb.examined } };
      return { ...next, ...log(next, "good", `Two gates, no collision: gate 1 → ${ra.spot.id}, gate 2 → ${rb.spot.id}. The kind ladder diverged before the CAS, so there was nothing to fight over.`) };
    }
    case "exit": {
      const t = s.tickets.find(x => x.id === a.id);
      if (!t) return { ...s, ...log(s, "bad", `exit("${a.id}") → unknown ticket. Return a typed error; do not scan the active list for a near match.`) };
      const mins = Math.max(0, s.clock - t.entry);
      const bill = Math.min(RATE.dayCap, Math.max(0, Math.ceil(Math.max(0, mins - RATE.graceMin) / 60) * RATE.perHour));
      if (t.settled) {
        const next = { ...s, settled: { id: t.id, bill, note: "replay" } };
        return { ...next, ...log(next, "warn", `exit("${t.id}") replayed after a timeout → same bill (${bill}), zero side effects. The spot was already released, so a second clear would have created a capacity ghost.`) };
      }
      const spots = s.spots.map(sp => sp.id === t.spotId ? { ...sp, occupant: null } : sp);
      const tickets = s.tickets.map(x => x.id === t.id ? { ...x, settled: true } : x);
      const next = { ...s, spots, tickets, settled: { id: t.id, bill, note: "fresh" }, st: { ...s.st, exited: s.st.exited + 1 } };
      return { ...next, ...log(next, "good", `exit(${t.id}) → CAS(${t.spotId} → null) succeeded, spot back in the per-kind free queue. ${mins} min − ${RATE.graceMin} grace → ${bill} (day cap ${RATE.dayCap}).`) };
    }
    case "replay": return parkReducer(s, { type: "exit", id: s.last });
    case "clear": return { ...s, probe: null };
    default: return s;
  }
}

export function ParkingSim() {
  const [s, dispatch] = useReducer(parkReducer, undefined, park0);
  const occupied = s.spots.filter(x => x.occupant).length;
  const freeByKind = k => s.spots.filter(x => x.kind === k && !x.occupant).length;
  const open = s.tickets.filter(t => !t.settled);
  const winner = s.probe && s.probe[s.probe.length - 1]?.winner;
  useEffect(() => { if (!s.probe) return; const t = setTimeout(() => dispatch({ type: "clear" }), 2600); return () => clearTimeout(t); }, [s.probe]);

  return <div className="sim sim-park">
    <div className="sim-stage sim-park-stage">
      <div className="sim-lot">
        {PLAN.map(f => {
          const row = s.spots.filter(x => x.floor === f.name);
          return <div key={f.name} className="sim-floor">
            <div className="sim-floor-head"><b>{f.name === "G" ? "Ground" : f.name}</b><span>exit walk +{f.level * 45} m</span>
              <div className="sim-occ-bar"><i style={{ width: `${100 * row.filter(x => x.occupant).length / row.length}%` }} /></div>
            </div>
            <div className="sim-spots">
              {row.map((sp, i) => <div key={sp.id} className={`sim-spot k-${sp.kind}${sp.occupant ? " is-occ" : " is-free"}${winner === sp.id ? " is-win" : ""}`} style={winner === sp.id ? { animationDelay: `${(s.probe.length - 1) * 160}ms` } : undefined}>
                <b>{sp.id.split("-")[1]}</b><span>{sp.occupant ? sp.occupant.plate.replace("DL-", "") : SPOT_KINDS[sp.kind].letter}</span>
                {sp.occupant && <em title={sp.occupant.type}>{VEH[sp.occupant.type]?.short ?? "·"}</em>}
                {sp.kind === "E" && <i className="sim-charger" />}
                <small>{sp.dist}m</small>
              </div>)}
            </div>
          </div>;
        })}
        <div className="sim-gates"><span className="sim-gate in">ENTRY ▸ gate 1 · gate 2</span><span className="sim-gate out">◂ EXIT · toll</span></div>
      </div>

      <div className="sim-park-side">
        <SimSeg label="allocation strategy" value={s.mode} onChange={m => dispatch({ type: "mode", m })} options={[{ value: "bestfit", label: "bestFitNearest()" }, { value: "firstfit", label: "firstFit()" }]} />
        <div className="sim-keys">
          {Object.entries(VEH).map(([k, v]) => <SimAct key={k} title={`${v.len} m long · ${v.hgt} m high`} onClick={() => dispatch({ type: "enter", t: k })}>{v.name}</SimAct>)}
        </div>
        <div className="sim-keys">
          <SimAct tone="warn" onClick={() => dispatch({ type: "race", i: s.st.races })}>⚡ two gates, same instant</SimAct>
          <SimAct onClick={() => dispatch({ type: "clock" })}>⏱ +15 min</SimAct>
          <SimAct tone="ghost" onClick={() => dispatch({ type: "replay" })} disabled={!s.last}>exit(last) twice</SimAct>
        </div>

        {winner && <div className="sim-probe">{s.probe.map((p, i) => <div key={i} className={`sim-probe-row${p.winner ? " is-hit" : ""}`} style={{ animationDelay: `${i * 160}ms` }}><b>{p.winner ? "→ " + p.winner : "✕"} {SPOT_KINDS[p.kind]?.label ?? "?"}</b><span>{p.verdict}</span></div>)}</div>}

        <div className="sim-tickets">
          <small>active tickets · exit is idempotent by id</small>
          {open.length === 0 && <p className="sim-none">— none —</p>}
          {open.slice(-5).map(t => <div key={t.id} className={`sim-ticket${s.last === t.id ? " is-new" : ""}`}>
            <b>{t.id}</b><span>{t.plate} · {t.spotId} · in at t={t.entry}</span>
            <SimAct onClick={() => dispatch({ type: "exit", id: t.id })} disabled={t.settled}>exit</SimAct>
          </div>)}
        </div>
        {s.settled && <div className={`sim-bill ${s.settled.note === "replay" ? "is-replay" : ""}`}><b>{s.settled.id} → {s.settled.bill} cents</b><span>{s.settled.note === "replay" ? "replay of a settled ticket — same answer, no second charge" : `grace ${RATE.graceMin} min · ${RATE.perHour}/hour · cap ${RATE.dayCap}`}</span></div>}
      </div>
    </div>

    <SimStat items={[["occupied", `${occupied}/${s.spots.length}`], ["free M/C/L/E", [freeByKind("M"), freeByKind("C"), freeByKind("L"), freeByKind("E")].join("/")], ["entered", s.st.entered, "good"], ["premium wasted", s.st.waste, "warn"], ["spots examined", s.st.examined], ["avg per entry", s.st.scans ? (s.st.examined / s.st.scans).toFixed(1) : "0"], ["CAS retries", s.st.retries], ["full / impossible", `${s.st.full} / ${s.st.struct}`, "bad"]]} />
    <SimLog rows={s.log.slice(-8).reverse()} hint="Same ParkingLot code in both modes — only the injected strategy changes. Then press 'two gates' and read the CAS lines." />
  </div>;
}

/* ------------------------------ 04 · Elevator system ------------------------------ */

const EL_FLOORS = 8, EL_CARS = 3, EL_DWELL = 2, EL_STARVE = 9;
export const el0 = () => ({
  ticks: 0, callsById: {}, nextId: 1, seq: 1, log: [], fx: [],
  cars: Array.from({ length: EL_CARS }, (_, i) => ({ id: i, floor: i, dir: "NONE", state: "IDLE", up: [], down: [], hallUp: [], hallDown: [], openUntil: 0, travel: 0, served: 0 })),
  st: { served: 0, waits: [], escalations: 0, reversals: 0, released: 0 }, emergency: false,
});

const elFl = (s, id) => s.callsById[id]?.floor;
const elActive = (s, c, dir) => (dir === "UP" ? c.up.concat(c.hallUp) : c.down.concat(c.hallDown)).map(id => elFl(s, id)).filter(f => f != null);
const elAhead = (s, c, dir) => elActive(s, c, dir).some(f => dir === "UP" ? f >= c.floor : f <= c.floor);
function elPick(s, c) {
  if (c.dir === "UP" && elAhead(s, c, "UP")) return "UP";
  if (c.dir === "DOWN" && elAhead(s, c, "DOWN")) return "DOWN";
  if (elAhead(s, c, "UP")) return "UP";
  if (elAhead(s, c, "DOWN")) return "DOWN";
  return "NONE";
}
const EL_SET_DIR = { up: "UP", hallUp: "UP", down: "DOWN", hallDown: "DOWN" };

/* Serve everything this car holds for `dir` at its current floor. Doors, dwell and the
   wait stamp all happen here, which keeps the two call sites honest. */
function elServe(c, dir, now, callsById, lookup) {
  const taken = [];
  Object.keys(EL_SET_DIR).forEach(k => {
    if (EL_SET_DIR[k] !== dir) return;
    c[k] = c[k].filter(id => { if (lookup(id) === c.floor) { taken.push(id); return false; } return true; });
  });
  taken.forEach(id => { callsById[id] = { ...callsById[id], servedAt: now }; });
  c.state = "DOORS_OPEN"; c.openUntil = now + EL_DWELL; c.dir = dir; c.served += taken.length;
  return taken;
}

/* The sets are keyed by direction relative to the floor where the button was pressed, so a
   destination can end up behind the car after a reversal. Re-key it once — this is exactly the
   cost the chapter pays for two pure comparators instead of one mutable-comparator TreeSet. */
function elReroute(s, c) {
  const up = [], down = [];
  let moved = 0;
  c.up.concat(c.down).forEach(id => {
    const f = elFl(s, id);
    if (f > c.floor) { if (c.down.includes(id)) moved++; up.push(id); }
    else if (f < c.floor) { if (c.up.includes(id)) moved++; down.push(id); }
  });
  c.up = Array.from(new Set(up)); c.down = Array.from(new Set(down));
  return moved;
}
const elClone = c => ({ ...c, up: c.up.slice(), down: c.down.slice(), hallUp: c.hallUp.slice(), hallDown: c.hallDown.slice() });
const elStopsHere = (s, c, dir) => elActive(s, c, dir).includes(c.floor);
const elHeldFloors = (s, c) => c.up.concat(c.down, c.hallUp, c.hallDown).map(id => elFl(s, id)).filter(f => f != null);
/* Held calls sitting at the car's own floor, whichever way the passenger wants to go. */
const elAnyHere = (s, c) => c.up.concat(c.down, c.hallUp, c.hallDown).filter(id => elFl(s, id) === c.floor);
/* Positioning: a DOWN call can be assigned above the car (or an UP call below it). Nothing is
   ahead in a direction this car could serve, so drive toward the nearest stop instead of
   idling on it — "assigned" without "reachable" is how a passenger waits forever. */
function elNearest(s, c) {
  const fs = elHeldFloors(s, c);
  const above = fs.filter(f => f > c.floor), below = fs.filter(f => f < c.floor);
  if (!above.length && !below.length) return "NONE";
  if (!above.length) return "DOWN";
  if (!below.length) return "UP";
  return Math.min(...above) - c.floor <= c.floor - Math.max(...below) ? "UP" : "DOWN";
}
/* Where the positioning leg is aiming, for the log line. */
const elTargetFloor = (s, c, d) => (d === "UP" ? Math.min(...elHeldFloors(s, c).filter(f => f > c.floor)) : Math.max(...elHeldFloors(s, c).filter(f => f < c.floor)));
/* Board everything at this floor. Used when the car is stopping here anyway, which is the one
   time a direction mismatch is allowed: the wait ends at pickup, not at drop-off. */
function elBoard(c, now, callsById, lookup) {
  const taken = [];
  ["up", "down", "hallUp", "hallDown"].forEach(k => {
    c[k] = c[k].filter(id => { if (lookup(id) === c.floor) { taken.push(id); return false; } return true; });
  });
  taken.forEach(id => { callsById[id] = { ...callsById[id], servedAt: now }; });
  c.state = "DOORS_OPEN"; c.openUntil = now + EL_DWELL; c.served += taken.length;
  return taken;
}
const elCount = c => c.up.length + c.down.length + c.hallUp.length + c.hallDown.length;
function elScore(c, call) {
  const dist = Math.abs(c.floor - call.floor);
  const away = (c.dir === "UP" && call.direction === "DOWN" && call.floor <= c.floor) || (c.dir === "DOWN" && call.direction === "UP" && call.floor >= c.floor);
  return { dist, load: elCount(c), away, total: dist + 3 * elCount(c) + (away ? 12 : 0) + (c.state === "DOORS_OPEN" ? 2 : 0) };
}

export function elReducer(s, a) {
  switch (a.type) {
    case "reset": return el0();
    case "press": {
      if (s.emergency) return { ...s, ...log(s, "bad", `hall button ▲/▼ at F${a.floor} ignored — EMERGENCY mode accepts no calls (checked before the strategy, so no policy can win)`) };
      const id = s.nextId, call = { id, kind: "HALL", floor: a.floor, direction: a.dir, at: s.ticks, car: null, servedAt: null };
      const next = { ...s, callsById: { ...s.callsById, [id]: call }, nextId: id + 1 };
      return { ...next, ...log(next, "good", `pressHallButton(${a.floor}, ${a.dir}) → registered in the unassigned registry at tick ${s.ticks}. The dispatcher decides the car; the button owns no state.`) };
    }
    case "dest": {
      const car = s.cars.find(c => c.id === a.car);
      if (car.state === "FAULT") return { ...s, ...log(s, "bad", `car ${car.id} is out of service — destination ${a.floor} rejected at the boundary`) };
      if (a.floor === car.floor) return { ...s, ...log(s, "info", `car ${car.id}: destination = current floor → no-op`) };
      const id = s.nextId, call = { id, kind: "CAR", floor: a.floor, direction: "NONE", at: s.ticks, car: car.id, servedAt: null };
      const set = a.floor > car.floor ? "up" : "down";
      const cars = s.cars.map(c => c.id === car.id ? { ...c, [set]: c[set].concat([id]) } : c);
      const next = { ...s, cars, callsById: { ...s.callsById, [id]: call }, nextId: id + 1 };
      return { ...next, ...log(next, "good", `car ${car.id}: destination F${a.floor} → ${set}-set (it is ${a.floor > car.floor ? "above" : "below"} you). A car call below you while moving up is not an error, it is a next-cycle stop.`) };
    }
    case "fault": {
      const car = s.cars.find(c => c.id === a.car);
      if (car.state === "FAULT") {
        const cars = s.cars.map(c => c.id === car.id ? { ...c, state: "IDLE" } : c);
        const next = { ...s, cars };
        return { ...next, ...log(next, "info", `car ${car.id} back in service (it is not in the registry snapshot until the next tick)`) };
      }
      const stranded = Object.values(s.callsById).filter(c => c.car === car.id && !c.servedAt);
      const cars = s.cars.map(c => c.id === car.id ? { ...elClone(c), state: "FAULT", up: [], down: [], hallUp: [], hallDown: [] } : c);
      const callsById = { ...s.callsById };
      stranded.forEach(c => { callsById[c.id] = { ...c, car: null }; });
      const next = { ...s, cars, callsById, st: { ...s.st, released: s.st.released + stranded.length } };
      return { ...next, ...log(next, "bad", `car ${car.id} → FAULT. Its ${stranded.length} pending call(s) went back to the dispatcher; a stranded call is the bug that makes passengers wait forever.`) };
    }
    case "emergency": {
      if (s.emergency) {
        const next = { ...s, emergency: false };
        return { ...next, ...log(next, "info", "alarm cleared → cars resume accepting calls from the registry") };
      }
      const next = { ...s, emergency: true };
      return { ...next, ...log(next, "bad", `fireEmergency() → every car: cancel stops, drive to G, open and stay. Checked BEFORE the strategy, because a mode must beat every policy.`) };
    }
    case "step": {
      const now = s.ticks + 1;
      let cars = s.cars.map(elClone);
      let callsById = { ...s.callsById };
      const rows = [];
      let { escalations, reversals, served, released } = s.st;
      const waits = s.st.waits.slice();

      /* --- dispatcher pass: assign every unassigned hall call --- */
      if (!s.emergency) {
        cars.forEach(c => { c.hallUp = c.hallUp.filter(id => callsById[id] && !callsById[id].servedAt); c.hallDown = c.hallDown.filter(id => callsById[id] && !callsById[id].servedAt); });
        const pending = Object.values(callsById).filter(c => c.kind === "HALL" && !c.servedAt && c.car == null);
        const live = cars.filter(c => c.state !== "FAULT");
        for (const call of pending) {
          if (!live.length) { rows.push({ tone: "warn", text: `no car in service — call ${call.id} (F${call.floor} ${call.direction}) stays in the registry instead of being dropped` }); continue; }
          const scored = live.map(c => ({ c, ...elScore(c, call) })).sort((x, y) => x.total - y.total || x.c.id - y.c.id);
          const starved = now - call.at > EL_STARVE;
          const chosen = starved ? live.slice().sort((x, y) => elCount(x) - elCount(y) || x.id - y.id)[0] : scored[0].c;
          if (starved) escalations++;
          const set = call.direction === "UP" ? "hallUp" : "hallDown";
          const target = chosen[set];
          if (!target.includes(call.id)) target.push(call.id);
          callsById[call.id] = { ...call, car: chosen.id };
          rows.push({
            tone: starved ? "warn" : "good",
            text: starved
              ? `call ${call.id} waited ${now - call.at} ticks → starvation guard: force-assigned to the least loaded car ${chosen.id} (${elCount(chosen)} stops)`
              : `F${call.floor} ${call.direction} → car ${chosen.id}  [${scored.map(x => `car${x.c.id} ${x.total}=d${x.dist}+3·${x.load}${x.away ? "+12" : ""}`).join("  ")}]`,
          });
        }
      }

      /* --- one writer per car: each car advances itself, no locks inside --- */
      const boardAt = (c, why) => {
        const taken = elBoard(c, now, callsById, id => elFl(s, id));
        taken.forEach(id => waits.push(now - s.callsById[id].at));
        served += taken.length;
        if (taken.length) rows.push({ tone: "good", text: `car ${c.id} ${why} at F${c.floor} · ${taken.length} call(s) boarded · doors ${EL_DWELL} ticks` });
        return taken.length;
      };
      const startLeg = (c, d, why) => {
        c.dir = d; c.state = d === "UP" ? "MOVING_UP" : "MOVING_DOWN";
        if (why) rows.push({ tone: "warn", text: `car ${c.id} ${why}` });
      };
      cars = cars.map(c => {
        if (c.state === "FAULT") return c;
        if (s.emergency) {
          if (c.floor > 0) { c.floor -= 1; c.dir = "DOWN"; c.state = "MOVING_DOWN"; c.travel++; return c; }
          if (c.state !== "DOORS_OPEN") {
            const dropped = c.up.concat(c.down, c.hallUp, c.hallDown);
            dropped.forEach(id => { callsById[id] = { ...callsById[id], car: null }; });
            released += dropped.length;
            c.up = []; c.down = []; c.hallUp = []; c.hallDown = [];
            c.state = "DOORS_OPEN"; c.openUntil = Infinity;
            rows.push({ tone: "bad", text: `car ${c.id} parked at G, doors open and staying open · ${dropped.length} call(s) handed back to the registry` });
          }
          c.dir = "NONE"; return c;
        }
        if (c.state === "DOORS_OPEN") {
          if (now < c.openUntil) return c;
          c.state = "IDLE";
          const moved = elReroute(s, c);
          if (moved) rows.push({ tone: "info", text: `car ${c.id}: re-keyed ${moved} destination(s) into the other set at F${c.floor} — the price of pure comparators, paid once` });
        }
        if (c.state === "MOVING_UP" || c.state === "MOVING_DOWN") {
          const dir = c.state === "MOVING_UP" ? "UP" : "DOWN";
          c.floor += dir === "UP" ? 1 : -1; c.travel++;
          if (elStopsHere(s, c, dir)) {
            const taken = elServe(c, dir, now, callsById, id => elFl(s, id));
            taken.forEach(id => waits.push(now - s.callsById[id].at));
            served += taken.length;
            rows.push({ tone: "good", text: `car ${c.id} arrives F${c.floor} (${dir}) · ${taken.length} call(s) served · doors ${EL_DWELL} ticks · remaining up{${c.up.map(id => elFl(s, id)).join(",") || "∅"}} down{${c.down.map(id => elFl(s, id)).join(",") || "∅"}} hallUp{${c.hallUp.map(id => elFl(s, id)).join(",") || "∅"}}` });
            return c;
          }
          if (elAnyHere(s, c).length && !elAhead(s, c, dir)) { boardAt(c, "reaches the end of its leg and boards a call that wanted the other direction"); return c; }
          const nd = elPick(s, c);
          if (nd === "NONE") {
            const pd = elNearest(s, c);
            if (pd === "NONE") { c.dir = "NONE"; c.state = "IDLE"; rows.push({ tone: "info", text: `car ${c.id}: the ${dir}-set is exhausted at F${c.floor} and nothing else is pending → IDLE` }); }
            else startLeg(c, pd, `positions toward F${elTargetFloor(s, c, pd)}: its remaining stops are all behind it. Direction-ordered sets need this deadhead leg, or an assigned call above a car facing down is a passenger nobody picks up.`);
          } else if (nd !== dir) { reversals++; c.dir = nd; c.state = nd === "UP" ? "MOVING_UP" : "MOVING_DOWN"; rows.push({ tone: "warn", text: `car ${c.id} reverses at F${c.floor}: the ${dir}-set is empty, the ${nd}-set holds {${elActive(s, c, nd).join(",")}} → SCAN falls out of that, it is not a special case` }); }
          return c;
        }
        if (elAnyHere(s, c).length) { boardAt(c, "is stopping on its own floor for a call that wanted the other direction — a car that stops anyway never leaves a passenger behind"); return c; }
        const nd = elPick(s, c);
        if (nd === "NONE") {
          const pd = elNearest(s, c);
          if (pd !== "NONE") startLeg(c, pd, `positions toward F${elTargetFloor(s, c, pd)}: nothing is ahead in a servable direction, but it still owns calls`);
          else { c.dir = "NONE"; c.state = "IDLE"; }
          return c;
        }
        c.dir = nd;
        if (elStopsHere(s, c, nd)) {
          const taken = elServe(c, nd, now, callsById, id => elFl(s, id));
          taken.forEach(id => waits.push(now - s.callsById[id].at));
          served += taken.length;
          rows.push({ tone: "good", text: `car ${c.id} boards at F${c.floor} going ${nd} — hall calls are only served when the direction matches, so no drive-by of every floor` });
          return c;
        }
        c.state = nd === "UP" ? "MOVING_UP" : "MOVING_DOWN";
        return c;
      });

      /* --- drop served ids out of the sets, release anything stranded --- */
      cars.forEach(c => { c.hallUp = c.hallUp.filter(id => !callsById[id]?.servedAt); c.hallDown = c.hallDown.filter(id => !callsById[id]?.servedAt); c.up = c.up.filter(id => !callsById[id]?.servedAt); c.down = c.down.filter(id => !callsById[id]?.servedAt); });

      let next = { ...s, ticks: now, cars, callsById, st: { served, waits: waits.slice(-40), escalations, reversals, released } };
      if (!rows.length) next = { ...next, ...log(next, "info", `tick ${now} — all three cars idle, registry empty. Press hall buttons to generate demand.`) };
      else rows.forEach(r => { next = { ...next, ...log(next, r.tone, r.text) }; });
      return next;
    }
    default: return s;
  }
}

function ElShaft({ car, s, onDest, onFault }) {
  const CELL = 34;
  const litDest = f => car.up.map(elFl2(s)).includes(f) || car.down.map(elFl2(s)).includes(f);
  return <div className="sim-el-col">
    <div className="sim-shaft" style={{ height: EL_FLOORS * CELL }}>
      {Array.from({ length: EL_FLOORS }, (_, f) => <div key={f} className="sim-fline" style={{ bottom: f * CELL }}>
        <span>{f}</span><i className={litDest(f) ? "on-dest" : (car.hallUp.map(elFl2(s)).includes(f) || car.hallDown.map(elFl2(s)).includes(f)) ? "on-hall" : ""} />
      </div>)}
      <div className={`sim-car${car.state === "DOORS_OPEN" ? " doors-open" : ""}${car.state === "FAULT" ? " is-fault" : ""}`} style={{ bottom: car.floor * CELL + 2, transitionDuration: "420ms" }}>
        <span className="sim-car-dir">{car.state === "FAULT" ? "✕" : car.dir === "UP" ? "▲" : car.dir === "DOWN" ? "▼" : "■"}</span>
        <b>{car.floor}</b>
        <div className="sim-door l" /><div className="sim-door r" />
      </div>
      {s.emergency && <div className="sim-emergency-stripe" />}
    </div>
    <div className="sim-car-readout">
      <div className="sim-sets">
        <span><em>up</em>{car.up.map(elFl2(s)).join(", ") || "∅"}</span>
        <span><em>down</em>{car.down.map(elFl2(s)).join(", ") || "∅"}</span>
        <span><em>hallUp</em>{car.hallUp.map(elFl2(s)).join(", ") || "∅"}</span>
        <span><em>hallDown</em>{car.hallDown.map(elFl2(s)).join(", ") || "∅"}</span>
      </div>
      <div className="sim-dest-grid">{Array.from({ length: EL_FLOORS }, (_, f) => <button type="button" key={f} className={litDest(f) ? "on" : ""} disabled={car.state === "FAULT"} onClick={() => onDest(f)}>{f}</button>)}</div>
      <SimAct tone="ghost" onClick={onFault}>{car.state === "FAULT" ? "return to service" : "simulate FAULT"}</SimAct>
    </div>
  </div>;
}
const elFl2 = s => id => elFl(s, id);

export function ElevatorSim() {
  const [s, dispatch] = useReducer(elReducer, undefined, el0);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(700);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => dispatch({ type: "step" }), speed);
    return () => clearInterval(t);
  }, [auto, speed]);

  const avg = s.st.waits.length ? (s.st.waits.reduce((a, b) => a + b, 0) / s.st.waits.length).toFixed(1) : "0";
  const worst = s.st.waits.length ? Math.max(...s.st.waits) : 0;
  const pending = Object.values(s.callsById).filter(c => !c.servedAt);

  return <div className="sim sim-el">
    <div className="sim-stage sim-el-stage">
      <div className="sim-hall">
        {Array.from({ length: EL_FLOORS }, (_, f) => <div key={f} className="sim-hall-row" style={{ height: 34 }}>
          <span>{f}</span>
          <button type="button" disabled={f === EL_FLOORS - 1 || s.emergency} className={pending.some(c => c.kind === "HALL" && c.floor === f && c.direction === "UP") ? "lit" : ""} onClick={() => dispatch({ type: "press", floor: f, dir: "UP" })}>▲</button>
          <button type="button" disabled={f === 0 || s.emergency} className={pending.some(c => c.kind === "HALL" && c.floor === f && c.direction === "DOWN") ? "lit" : ""} onClick={() => dispatch({ type: "press", floor: f, dir: "DOWN" })}>▼</button>
        </div>)}
        <p className="sim-lbl">hall<br />panel</p>
      </div>
      {s.cars.map(c => <ElShaft key={c.id} car={c} s={s} onDest={f => dispatch({ type: "dest", car: c.id, floor: f })} onFault={() => dispatch({ type: "fault", car: c.id })} />)}
    </div>

    <div className="sim-controls sim-controls-el">
      <div className="sim-row">
        <SimAct tone="primary" onClick={() => dispatch({ type: "step" })} disabled={auto}>⏭ one tick</SimAct>
        <SimAct tone={auto ? "warn" : ""} onClick={() => setAuto(x => !x)}>{auto ? "■ pause" : "▶ run scheduler"}</SimAct>
        <SimAct tone="bad" onClick={() => dispatch({ type: "emergency" })}>{s.emergency ? "clear alarm" : "🔥 fire alarm"}</SimAct>
        <SimAct tone="ghost" onClick={() => { setAuto(false); dispatch({ type: "reset" }); }}>reset</SimAct>
      </div>
      <SimSeg label="tick every" value={speed} onChange={setSpeed} options={[{ value: 1100, label: "slow" }, { value: 700, label: "normal" }, { value: 380, label: "fast" }]} />
      <div className="sim-workload">
        <span className="sim-lbl">scripted workload</span>
        {[[3, "UP"], [6, "UP"], [1, "DOWN"], [7, "DOWN"], [4, "UP"]].map(([f, d]) => <SimAct key={f + d} tone="ghost" onClick={() => dispatch({ type: "press", floor: f, dir: d })}>F{f} {d === "UP" ? "▲" : "▼"}</SimAct>)}
      </div>
    </div>

    <SimStat items={[["tick", s.ticks], ["served", s.st.served, "good"], ["avg wait", `${avg} ticks`], ["worst wait", worst, worst > EL_STARVE ? "bad" : ""], ["reversals", s.st.reversals], ["starve escalations", s.st.escalations, "warn"], ["released by faults", s.st.released], ["registry", pending.length]]} />
    <SimLog rows={s.log.slice(-9).reverse()} hint={`Each car's four ordered sets are printed live: next stop is always first() in the active set, and a reversal is just "this set is empty". The starvation guard fires after ${EL_STARVE} ticks.`} />
  </div>;
}

/* --------------------------------- registry --------------------------------- */

export const LLD_SIMS = { lru: LruSim, vending: VendingSim, parking: ParkingSim, elevator: ElevatorSim };

export const LLD_SIM_NOTES = {
  lru: "Capacity, TTL and workload are live. Every hit relinks a node, which is why the lock has to be per-shard.",
  vending: "Drive the state machine. Illegal calls throw from the state object — the balance never moves.",
  parking: "Swap the injected strategy and the wasted-premium counter changes with no other edit. Then race two gates.",
  elevator: "Assign the car, then let the car pick the floor. Watch the sets drain and reverse.",
};
