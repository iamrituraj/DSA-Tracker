import React from "react";

/* ------------------------------------------------------------------ *
 * Data-driven UML class diagrams for the four LLD chapters.
 * Theme-aware through CSS classes (.uml-*), animated in on reveal.
 * ------------------------------------------------------------------ */

const ROW = 15;

function boxGeometry(node) {
  const rows = (node.fields?.length || 0) + (node.methods?.length || 0);
  const h = 34 + rows * ROW + 6;
  return { ...node, h: node.h ?? h };
}

function anchor(node, side) {
  const { x, y, w, h } = node;
  if (side === "top") return [x + w / 2, y];
  if (side === "bottom") return [x + w / 2, y + h];
  if (side === "left") return [x, y + h / 2];
  return [x + w, y + h / 2];
}

const DIAMOND = {
  top: (p) => `${p[0]},${p[1] - 5} ${p[0] + 6},${p[1] + 4} ${p[0]},${p[1] + 13} ${p[0] - 6},${p[1] + 4}`,
  bottom: (p) => `${p[0]},${p[1] + 5} ${p[0] + 6},${p[1] - 4} ${p[0]},${p[1] - 13} ${p[0] - 6},${p[1] - 4}`,
  left: (p) => `${p[0] - 5},${p[1]} ${p[0] + 4},${p[1] - 6} ${p[0] + 13},${p[1]} ${p[0] + 4},${p[1] + 6}`,
  right: (p) => `${p[0] + 5},${p[1]} ${p[0] - 4},${p[1] - 6} ${p[0] - 13},${p[1]} ${p[0] - 4},${p[1] + 6}`,
};

function Edge({ edge, nodes, uid, index }) {
  const from = nodes[edge.from], to = nodes[edge.to];
  if (!from || !to) return null;

  const [sx, sy] = anchor(from, edge.side[0]);
  const [tx, ty] = anchor(to, edge.side[1]);

  // Slight elbow so parallel edges do not overlap and the routing reads like a real diagram.
  const mid = edge.bow ?? 0;
  const cx = (sx + tx) / 2 + mid * (ty > sy ? 1 : -1) * 0.2;
  const cy = (sy + ty) / 2 - mid;
  const d = `M${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;

  const kind = edge.type || "association";
  const isDiamond = kind === "composition" || kind === "aggregation";
  const marker = kind === "realization" || kind === "inheritance" ? `url(#uml-tri-${uid})` : `url(#uml-open-${uid})`;

  return (
    <g className={`uml-edge ${kind}`} style={{ animationDelay: `${320 + index * 60}ms` }}>
      <path d={d} fill="none" markerEnd={isDiamond ? undefined : marker} className={kind === "dependency" || kind === "realization" ? "uml-dash" : "uml-solid"} />
      {isDiamond && <polygon points={DIAMOND[edge.side[0]]([sx, sy])} className={kind === "composition" ? "uml-diamond-filled" : "uml-diamond-hollow"} />}
      {edge.label && (
        <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 6} textAnchor="middle" className="uml-edge-label">{edge.label}</text>
      )}
    </g>
  );
}

function ClassBox({ node, uid, index, highlight }) {
  const { x, y, w, h, name, stereotype, fields = [], methods = [], kind = "class" } = node;
  const header = y + 24;
  const splitA = header + 4 + fields.length * ROW;

  return (
    <g className={`uml-class${kind === "interface" ? " is-interface" : ""}${kind === "enum" ? " is-enum" : ""}${kind === "record" ? " is-record" : ""}${kind === "abstract" ? " is-abstract" : ""}`}
       style={{ animationDelay: `${index * 70}ms` }} data-uml={name}>
      <rect x={x} y={y} width={w} height={h} rx={7} className="uml-box" />
      {stereotype && <text x={x + w / 2} y={y + 12} textAnchor="middle" className="uml-stereotype">&laquo;{stereotype}&raquo;</text>}
      <text x={x + w / 2} y={stereotype ? header + 6 : header} textAnchor="middle" className="uml-name">{name}</text>
      {fields.length > 0 && <line x1={x} y1={header + 10} x2={x + w} y2={header + 10} className="uml-rule" />}
      {fields.map((f, i) => (
        <text key={f} x={x + 8} y={header + 10 + (i + 1) * ROW - 3} className="uml-field">{f}</text>
      ))}
      {methods.length > 0 && <line x1={x} y1={splitA + 4} x2={x + w} y2={splitA + 4} className="uml-rule" />}
      {methods.map((m, i) => (
        <text key={m} x={x + 8} y={splitA + 4 + (i + 1) * ROW - 3} className="uml-method">{m}</text>
      ))}
      {highlight && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={9} className="uml-halo" />}
    </g>
  );
}

export function ClassDiagram({ uid, viewBox, classes, edges, legend }) {
  const nodes = {};
  const laid = classes.map(boxGeometry);
  laid.forEach((node) => { nodes[node.id] = node; });

  return (
    <div className="uml-wrap">
      <svg viewBox={viewBox} className="uml-svg" role="img" aria-label="UML class diagram">
        <defs>
          <marker id={`uml-tri-${uid}`} viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
            <path d="M1,11 L6,1 L11,11 z" className="uml-triangle" />
          </marker>
          <marker id={`uml-open-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M1,1 L9,5 L1,9" className="uml-arrow" />
          </marker>
        </defs>
        {edges.map((edge, i) => <Edge key={i} edge={edge} nodes={nodes} uid={uid} index={i} />)}
        {laid.map((node, i) => <ClassBox key={node.id} node={node} uid={uid} index={i} highlight={node.highlight} />)}
      </svg>
      {legend && <div className="uml-legend">{legend.map((item) => <span key={item}><i className={`uml-key uml-key-${item[1]}`} />{item[0]}</span>)}</div>}
    </div>
  );
}

/* ------------------------------- the four diagrams ------------------------------- */

export function LruUml() {
  return <ClassDiagram
    uid="lru" viewBox="0 0 900 420"
    classes={[
      { id: "cache", x: 20, y: 16, w: 236, name: "Cache<K,V>", stereotype: "interface",
        fields: ["", ""], methods: ["V get(K)", "void put(K,V)", "V remove(K)", "CacheStats stats()"] },
      { id: "entry", x: 20, y: 210, w: 236, name: "Cache.Entry<V>", stereotype: "record", kind: "record",
        fields: ["V value · long bytes", "long expiresAtMillis"], methods: ["boolean isLive(long now)"] },
      { id: "listener", x: 300, y: 16, w: 214, name: "EvictionListener<K,V>", stereotype: "functional interface", kind: "interface",
        fields: [], methods: ["void accept(K,V)"] },
      { id: "lru", x: 300, y: 150, w: 250, name: "LruCache<K,V>", stereotype: "class", kind: "class",
        fields: ["int capacity · long ttlMillis", "HashMap<K,Node> index", "Node head, tail  // sentinels"],
        methods: ["synchronized V get(K)", "synchronized void put(K,V,long,long)", "protected void removeEldest(Node)"] },
      { id: "node", x: 300, y: 336, w: 250, name: "LruCache.Node<V>", stereotype: "private static class",
        fields: ["Node prev, next", "Object key · Entry<V> entry"], methods: [] },
      { id: "sharded", x: 616, y: 150, w: 264, name: "ShardedLruCache<K,V>", stereotype: "class",
        fields: ["LruCache<K,V>[] shards", "int shardOf(K)  // floorMod"], methods: ["V get(K)", "void put(K,V)", "CacheStats stats()"] },
      { id: "map", x: 616, y: 336, w: 200, name: "HashMap<K,Node>", stereotype: "jdk", kind: "record",
        fields: ["O(1) avg lookup"], methods: [] },
    ]}
    edges={[
      { from: "lru", to: "cache", side: ["top", "bottom"], type: "realization", label: "implements" },
      { from: "sharded", to: "cache", side: ["right", "bottom"], type: "realization" },
      { from: "lru", to: "node", side: ["bottom", "top"], type: "composition", label: "1 ◆— 0..*" },
      { from: "lru", to: "map", side: ["right", "left"], type: "dependency", label: "keys on" },
      { from: "node", to: "entry", side: ["left", "right"], type: "association", label: "holds" },
      { from: "sharded", to: "lru", side: ["left", "right"], type: "aggregation", label: "1 ◆— N" },
      { from: "lru", to: "listener", side: ["top", "bottom"], type: "dependency", label: "notifies" },
    ]}
    legend={[["implements / realizes", "realization"], ["owns (composition)", "composition"], ["uses (dependency)", "dependency"]]}
  />;
}

export function VendingUml() {
  return <ClassDiagram
    uid="vending" viewBox="0 0 900 452"
    classes={[
      { id: "api", x: 24, y: 16, w: 226, name: "VendingApi", stereotype: "interface", kind: "interface",
        fields: [], methods: ["void insertCoin(int)", "void selectProduct(String)", "Receipt checkout()", "int cancel()"] },
      { id: "machine", x: 24, y: 170, w: 226, name: "VendingMachine", stereotype: "context",
        fields: ["VendingState state", "int balanceCents · long session", "Product selected · Object gate"],
        methods: ["void credit(int)", "void reserve(String)", "Receipt completeSale(Map)", "void enterMaintenance()"] },
      { id: "inventory", x: 330, y: 20, w: 236, name: "Inventory", stereotype: "class",
        fields: ["Map<String,Slot> slots", "Map<Long,String> held  // reservations"],
        methods: ["boolean reserve(String,long)", "void commit(long) · void release(long)"] },
      { id: "vault", x: 330, y: 150, w: 236, name: "CoinVault", stereotype: "strategy",
        fields: ["TreeMap<Integer,Integer> coins", "int totalCents"],
        methods: ["boolean canMakeChange(int)", "Map<Integer,Integer> dispenseChange(int)"] },
      { id: "state", x: 626, y: 20, w: 250, name: "VendingState", stereotype: "interface", kind: "interface",
        fields: [], methods: ["String name()", "void insertCoin(Machine,int)", "Receipt checkout(Machine)", "int cancel(Machine)"] },
      { id: "idle", x: 626, y: 200, w: 118, name: "IdleState", stereotype: "singleton", fields: ["INSTANCE"], methods: [] },
      { id: "balance", x: 758, y: 200, w: 118, name: "BalanceState", fields: [], methods: [] },
      { id: "selected", x: 626, y: 296, w: 118, name: "SelectedState", fields: [], methods: [] },
      { id: "dispensing", x: 758, y: 296, w: 118, name: "DispensingState", fields: [], methods: [] },
      { id: "maint", x: 626, y: 380, w: 250, name: "MaintenanceState", stereotype: "the added state", fields: [], methods: ["rejects every customer call"] },
    ]}
    edges={[
      { from: "machine", to: "api", side: ["top", "bottom"], type: "realization", label: "implements" },
      { from: "machine", to: "state", side: ["right", "left"], type: "dependency", label: "dispatches to" },
      { from: "machine", to: "inventory", side: ["top", "left"], type: "composition", label: "1 ◆— 1" },
      { from: "machine", to: "vault", side: ["right", "left"], type: "composition", label: "1 ◆— 1" },
      { from: "idle", to: "state", side: ["top", "bottom"], type: "realization" },
      { from: "balance", to: "state", side: ["top", "bottom"], type: "realization" },
      { from: "selected", to: "balance", side: ["left", "bottom"], type: "transition", label: "select" },
      { from: "maint", to: "selected", side: ["top", "bottom"], type: "realization" },
    ]}
    legend={[["implements / realizes", "realization"], ["owns (composition)", "composition"], ["uses (dependency)", "dependency"]]}
  />;
}

export function ParkingUml() {
  return <ClassDiagram
    uid="parking" viewBox="0 0 900 470"
    classes={[
      { id: "lot", x: 26, y: 150, w: 244, name: "ParkingLot", stereotype: "application service",
        fields: ["List<ParkingFloor> floors", "Map<String,ParkingSpot> spotIndex", "Map<String,ParkingTicket> tickets"],
        methods: ["Ticket enter(Vehicle)", "Bill exit(String,Instant)", "Optional<Ticket> ticketFor(String)"] },
      { id: "builder", x: 26, y: 20, w: 244, name: "ParkingLot.Builder", stereotype: "factory",
        fields: ["allocation · pricing · clock"], methods: ["Builder floor(int, factory)", "ParkingLot build()"] },
      { id: "alloc", x: 330, y: 20, w: 246, name: "SpotAllocationStrategy", stereotype: "strategy · interface", kind: "interface",
        fields: ["int CANDIDATE_WINDOW = 12"], methods: ["ParkingSpot allocate(floors, Vehicle)"] },
      { id: "bestfit", x: 330, y: 150, w: 246, name: "bestFitNearest()", stereotype: "kind ladder + distance sort", fields: [], methods: ["minimum → EV → COMPACT → LARGE"] },
      { id: "pricing", x: 330, y: 240, w: 246, name: "PricingStrategy", stereotype: "strategy · interface", kind: "interface",
        fields: [], methods: ["int calculate(Ticket, Instant)"] },
      { id: "rate", x: 330, y: 330, w: 118, name: "RateCard", stereotype: "record", kind: "record", fields: ["grace · /hour · dayCap"], methods: [] },
      { id: "tiered", x: 458, y: 330, w: 118, name: "tiered()", stereotype: "static", fields: [], methods: [] },
      { id: "floor", x: 632, y: 240, w: 244, name: "ParkingFloor", stereotype: "class",
        fields: ["int number", "EnumMap<SpotType, Queue> freeByType"],
        methods: ["List<ParkingSpot> candidates(type, n)", "void notifyTaken(spot) / notifyFreed(spot)"] },
      { id: "spot", x: 632, y: 400, w: 244, name: "ParkingSpot", stereotype: "abstract", kind: "abstract",
        fields: ["AtomicReference<Vehicle> occupant", "double distanceToExit"],
        methods: ["abstract SpotType type()", "boolean tryPark(Vehicle)  // CAS", "boolean release()"] },
      { id: "vehicle", x: 632, y: 20, w: 244, name: "Vehicle", stereotype: "final",
        fields: ["String plate · Type type", "Dimensions length · height · width"], methods: ["boolean requiresChock()"] },
      { id: "ticket", x: 330, y: 418, w: 246, name: "ParkingTicket", stereotype: "immutable",
        fields: ["id · plate · spotId", "Instant entryTime · Status"], methods: ["boolean trySettle()  // idempotent exit"] },
    ]}
    edges={[
      { from: "lot", to: "builder", side: ["top", "bottom"], type: "dependency", label: "created by" },
      { from: "lot", to: "alloc", side: ["right", "left"], type: "dependency", label: "uses" },
      { from: "lot", to: "pricing", side: ["right", "left"], type: "dependency", label: "uses" },
      { from: "bestfit", to: "alloc", side: ["top", "bottom"], type: "realization" },
      { from: "rate", to: "pricing", side: ["top", "bottom"], type: "realization" },
      { from: "tiered", to: "pricing", side: ["top", "bottom"], type: "realization" },
      { from: "lot", to: "floor", side: ["right", "left"], type: "composition", label: "1 ◆— N" },
      { from: "floor", to: "spot", side: ["bottom", "top"], type: "composition", label: "1 ◆— N" },
      { from: "lot", to: "ticket", side: ["bottom", "right"], type: "aggregation", label: "active" },
      { from: "vehicle", to: "spot", side: ["bottom", "right"], type: "association", label: "fits? SpotRules" },
    ]}
    legend={[["implements / realizes", "realization"], ["owns (composition)", "composition"], ["uses (dependency)", "dependency"], ["aggregates", "aggregation"]]}
  />;
}

export function ElevatorUml() {
  return <ClassDiagram
    uid="elevator" viewBox="0 0 900 452"
    classes={[
      { id: "dispatcher", x: 300, y: 150, w: 268, name: "Dispatcher", stereotype: "controller",
        fields: ["List<ElevatorCar> cars  // immutable", "ConcurrentHashMap unassigned", "ScheduledExecutorService engine"],
        methods: ["void pressHallButton(int, Direction, long)", "void tick()  // assign, then step each car", "void fireEmergency()", "Snapshot metrics()"] },
      { id: "strategy", x: 300, y: 20, w: 268, name: "AssignmentStrategy", stereotype: "strategy · interface", kind: "interface",
        fields: ["record Weights(4 ints)"], methods: ["ElevatorCar choose(cars, call)", "static int score(car, call, w)"] },
      { id: "car", x: 636, y: 150, w: 240, name: "ElevatorCar", stereotype: "actor · one writer",
        fields: ["TreeSet upStops, downStops", "TreeSet hallUp, hallDown", "State state · int currentFloor", "ConcurrentLinkedQueue inbox"],
        methods: ["boolean submit(ElevatorCall)", "boolean stepOnce(long now)", "void enterEmergency()"] },
      { id: "call", x: 636, y: 20, w: 240, name: "ElevatorCall", stereotype: "record", kind: "record",
        fields: ["int floor · Kind · Direction", "long requestedAtMillis"], methods: ["static hall(...) / destination(...)", "long ageMillis(now)"] },
      { id: "state", x: 636, y: 340, w: 240, name: "ElevatorCar.State", stereotype: "enum", kind: "enum",
        fields: ["IDLE · MOVING_UP · MOVING_DOWN", "DOORS_OPEN · FAULT"], methods: [] },
      { id: "doors", x: 300, y: 400, w: 268, name: "DoorPolicy", stereotype: "record", kind: "record",
        fields: ["long openDwellMillis · closeMillis"], methods: ["static INSTANT  // for tests"] },
      { id: "observer", x: 24, y: 150, w: 232, name: "CarObserver", stereotype: "interface", kind: "interface",
        fields: [], methods: ["void onArrived(ElevatorCar, int)"] },
      { id: "snapshot", x: 24, y: 300, w: 232, name: "Dispatcher.Snapshot", stereotype: "record", kind: "record",
        fields: ["ticks · served · worstWait", "List<Integer> floorsPerCar"], methods: [] },
    ]}
    edges={[
      { from: "dispatcher", to: "strategy", side: ["top", "bottom"], type: "dependency", label: "asks which car" },
      { from: "dispatcher", to: "car", side: ["right", "left"], type: "aggregation", label: "registry 1 ◆— N" },
      { from: "car", to: "call", side: ["top", "bottom"], type: "dependency", label: "inbox" },
      { from: "car", to: "state", side: ["bottom", "top"], type: "composition", label: "has" },
      { from: "car", to: "doors", side: ["left", "right"], type: "association", label: "dwell" },
      { from: "dispatcher", to: "observer", side: ["left", "right"], type: "dependency", label: "notified by cars" },
      { from: "dispatcher", to: "snapshot", side: ["left", "top"], type: "realization", label: "reports" },
    ]}
    legend={[["implements / realizes", "realization"], ["owns (composition)", "composition"], ["uses (dependency)", "dependency"], ["aggregates", "aggregation"]]}
  />;
}

export const LLD_UML = {
  lru: LruUml,
  vending: VendingUml,
  parking: ParkingUml,
  elevator: ElevatorUml,
};

export const LLD_UML_NOTES = {
  lru: "One ownership diamond and one dashed notify arrow: LruCache owns the nodes, and the map is a dependency it must keep in step.",
  vending: "The context points at the interface, never at a concrete state. Five boxes implement it, and MaintenanceState arrived without opening any of the other four.",
  parking: "Composition on the left (lot → floor → spot), dependencies on the right (the two strategies). That split is the whole design.",
  elevator: "The car owns its sets and its state; the dispatcher owns routing. The arrow between them is aggregation, not composition — a car outlives a dispatcher restart.",
};
