import React, { useMemo, useState } from "react";
import { BookMarked, Check, CheckCircle2, ChevronDown, ChevronRight, Code2, Copy, Grid2x2, Layers, Lightbulb, ListChecks, MessagesSquare, Route, ScanLine, Sparkles, Workflow } from "lucide-react";
import { highlightCode } from "./highlight.js";
import { LLD_CHAPTERS, LLD_PATTERN_TABLE, LLD_STEPS, LLD_LADDER, LLD_RECAP_CARDS, LLD_FOLLOWUP_PROMPTS } from "./lld-data.js";

/* ---------------------------------- code frames ---------------------------------- */

function LldCode({ name, code }) {
  const lines = useMemo(() => highlightCode(code, "csharp"), [code]);
  const [copied, setCopied] = useState(false);
  return <div className="code-frame lld-code">
    <div className="code-frame-head">
      <i className="dot r" /><i className="dot y" /><i className="dot g" /><span>{name}</span>
      <button type="button" className="copy-code" onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>
    </div>
    <div className="code-body">
      <div className="code-gutter" aria-hidden="true">{lines.map((_, i) => <span key={i}>{i + 1}</span>)}</div>
      <pre className="code-view rich" dangerouslySetInnerHTML={{ __html: lines.join("\n") }} />
    </div>
  </div>;
}

/* ---------------------------------- SVG diagrams ----------------------------------
   Theme-aware via CSS classes (.ld-*); light + dark palettes live in styles.css.     */

const LD_TXT = { fontSize: 12, fontWeight: 700 };

function LruDiagram() {
  const nodes = [["A", 344], ["B", 436], ["C", 528], ["D", 620]];
  return <svg viewBox="0 0 860 290" className="lld-svg" role="img" aria-label="LRU cache: dictionary pointing into a doubly linked list">
    <defs>
      <marker id="ld-a-lru" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker" /></marker>
    </defs>
    {/* dictionary */}
    <rect x={20} y={70} width={190} height={150} rx={12} className="ld-box" />
    <text x={115} y={94} textAnchor="middle" className="ld-t" style={LD_TXT}>Dictionary&lt;TKey, Node&gt;</text>
    {nodes.map(([k, , ], i) => <text key={k} x={40} y={124 + i * 26} className="ld-mono">{`${k}  →  node`}</text>)}
    {/* dashed pointers dict -> list nodes */}
    {nodes.map(([k, x], i) => <path key={k} d={`M210 ${118 + i * 26} C ${250} ${118 + i * 26}, ${x - 30} 100, ${x + 30} 112`} className="ld-dash" fill="none" markerEnd="url(#ld-a-lru)" />)}
    {/* list */}
    <rect x={250} y={120} width={70} height={52} rx={10} className="ld-ghost" />
    <text x={285} y={146} textAnchor="middle" className="ld-t ld-muted" style={{ fontSize: 11 }}>HEAD</text>
    <text x={285} y={161} textAnchor="middle" className="ld-muted" style={{ fontSize: 9 }}>sentinel</text>
    {nodes.map(([k, x]) => <g key={k}><rect x={x} y={120} width={64} height={52} rx={10} className="ld-accent" /><text x={x + 32} y={143} textAnchor="middle" className="ld-t">{k}</text><text x={x + 32} y={159} textAnchor="middle" className="ld-muted" style={{ fontSize: 9 }}>key · val</text></g>)}
    <rect x={712} y={120} width={76} height={52} rx={10} className="ld-ghost" />
    <text x={750} y={143} textAnchor="middle" className="ld-t ld-muted" style={{ fontSize: 11 }}>TAIL</text>
    <text x={750} y={159} textAnchor="middle" className="ld-muted" style={{ fontSize: 9 }}>sentinel</text>
    {/* prev/next links */}
    {[[320, 344], [408, 436], [500, 528], [592, 620], [684, 712]].map(([a, b], i) => <line key={i} x1={a} y1={146} x2={b} y2={146} className="ld-line" markerStart="url(#ld-a-lru)" markerEnd="url(#ld-a-lru)" />)}
    {/* annotations */}
    <text x={285} y={100} textAnchor="middle" className="ld-good" style={{ fontSize: 10, fontWeight: 700 }}>most recently used</text>
    <text x={750} y={100} textAnchor="middle" className="ld-bad" style={{ fontSize: 10, fontWeight: 700 }}>evict from here</text>
    <path d="M750 106 V 116" className="ld-line" markerEnd="url(#ld-a-lru)" />
    <text x={430} y={216} textAnchor="middle" className="ld-muted" style={{ fontSize: 11 }}>Get/Put → unlink node, re-insert at the front  ·  over capacity → cut the node before TAIL</text>
    <text x={430} y={238} textAnchor="middle" className="ld-good" style={{ fontSize: 11, fontWeight: 700 }}>Dictionary = O(1) lookup · Doubly linked list = O(1) relink &amp; evict</text>
  </svg>;
}

function VendingDiagram() {
  return <svg viewBox="0 0 860 300" className="lld-svg" role="img" aria-label="Vending machine state machine">
    <defs>
      <marker id="ld-a-vend" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker" /></marker>
      <marker id="ld-a-vend-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker-warn" /></marker>
    </defs>
    <rect x={36} y={112} width={168} height={64} rx={12} className="ld-box" />
    <text x={120} y={138} textAnchor="middle" className="ld-t">IDLE</text>
    <text x={120} y={156} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>waiting for money</text>
    <rect x={344} y={26} width={180} height={64} rx={12} className="ld-box" />
    <text x={434} y={52} textAnchor="middle" className="ld-t">HAS_MONEY</text>
    <text x={434} y={70} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>balance &gt; 0</text>
    <rect x={652} y={112} width={184} height={64} rx={12} className="ld-box" />
    <text x={744} y={138} textAnchor="middle" className="ld-t">PRODUCT_SELECTED</text>
    <text x={744} y={156} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>product chosen</text>
    <rect x={344} y={210} width={180} height={64} rx={12} className="ld-accent" />
    <text x={434} y={236} textAnchor="middle" className="ld-t">DISPENSING</text>
    <text x={434} y={254} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>deliver · change · reset</text>
    {/* transitions */}
    <path d="M180 118 C 250 70, 280 55, 340 52" fill="none" className="ld-line" markerEnd="url(#ld-a-vend)" />
    <text x={246} y={72} className="ld-good" style={{ fontSize: 11, fontWeight: 700 }}>InsertMoney()</text>
    <path d="M528 52 C 600 55, 630 75, 678 108" fill="none" className="ld-line" markerEnd="url(#ld-a-vend)" />
    <text x={596} y={72} className="ld-good" style={{ fontSize: 11, fontWeight: 700 }}>SelectProduct()</text>
    <path d="M700 180 C 640 225, 600 236, 530 240" fill="none" className="ld-line" markerEnd="url(#ld-a-vend)" />
    <text x={612} y={226} textAnchor="end" className="ld-good" style={{ fontSize: 11, fontWeight: 700 }}>Dispense() — enough money</text>
    <path d="M340 240 C 250 236, 210 210, 166 180" fill="none" className="ld-line" markerEnd="url(#ld-a-vend)" />
    <text x={208} y={228} className="ld-good" style={{ fontSize: 11, fontWeight: 700 }}>done → Idle</text>
    {/* cancel transitions */}
    <path d="M372 94 C 320 118, 280 126, 210 134" fill="none" className="ld-dash-warn" markerEnd="url(#ld-a-vend-warn)" />
    <text x={288} y={124} textAnchor="middle" className="ld-warn" style={{ fontSize: 10, fontWeight: 700 }}>Cancel · refund</text>
    <path d="M700 176 C 560 300, 240 260, 138 182" fill="none" className="ld-dash-warn" markerEnd="url(#ld-a-vend-warn)" />
    <text x={420} y={292} textAnchor="middle" className="ld-warn" style={{ fontSize: 10, fontWeight: 700 }}>Cancel from any money-held state refunds the balance</text>
  </svg>;
}

function ParkingDiagram() {
  const isA = (x1, y1, x2, y2, key) => <path key={key} d={`M${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} fill="none" className="ld-dash" markerEnd="url(#ld-a-park)" />;
  return <svg viewBox="0 0 880 340" className="lld-svg" role="img" aria-label="Parking lot class and strategy diagram">
    <defs>
      <marker id="ld-a-park" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker" /></marker>
    </defs>
    {/* composition chain */}
    <rect x={240} y={66} width={160} height={56} rx={12} className="ld-box" />
    <text x={320} y={90} textAnchor="middle" className="ld-t">ParkingLot</text>
    <text x={320} y={107} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>Enter() · Exit()</text>
    <rect x={240} y={200} width={160} height={52} rx={12} className="ld-box" />
    <text x={320} y={222} textAnchor="middle" className="ld-t">ParkingFloor</text>
    <text x={320} y={239} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>per level</text>
    <path d="M306 122 V 200" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <text x={298} y={166} textAnchor="end" className="ld-muted" style={{ fontSize: 10 }}>has 1..* floors</text>
    <rect x={480} y={200} width={180} height={52} rx={12} className="ld-box" />
    <text x={570} y={222} textAnchor="middle" className="ld-t">ParkingSpot</text>
    <text x={570} y={239} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>abstract · CanFit()</text>
    <path d="M400 226 H 480" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <text x={440} y={218} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>1..* spots</text>
    <path d="M500 200 C 460 160, 430 140, 404 118" fill="none" className="ld-dash" markerEnd="url(#ld-a-park)" />
    <text x={474} y={156} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>allocates via strategy</text>
    {/* spot subclasses */}
    {[[442, 108, "MotorcycleSpot"], [562, 96, "CompactSpot"], [670, 88, "LargeSpot"]].map(([x, w, name], i) => <g key={name}><rect x={x} y={292} width={w} height={40} rx={10} className="ld-ghost" /><text x={x + w / 2} y={316} textAnchor="middle" className="ld-t" style={{ fontSize: 10 }}>{name}</text></g>)}
    {isA(536, 252, 496, 292, "s1")}{isA(570, 252, 610, 292, "s2")}{isA(604, 252, 714, 292, "s3")}
    <text x={700} y={270} className="ld-muted" style={{ fontSize: 10 }}>is-a</text>
    {/* vehicle */}
    <rect x={650} y={66} width={170} height={56} rx={12} className="ld-box" />
    <text x={735} y={90} textAnchor="middle" className="ld-t">Vehicle</text>
    <text x={735} y={107} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>LicensePlate · Type</text>
    <path d="M400 88 H 650" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <text x={524} y={80} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>Enter(vehicle) issues a ticket</text>
    {[[640, 60, "Car"], [712, 68, "Truck"], [792, 100, "Motorcycle"]].map(([x, w, name]) => <g key={name}><rect x={x} y={4} width={w} height={34} rx={9} className="ld-ghost" /><text x={x + w / 2} y={25} textAnchor="middle" className="ld-t" style={{ fontSize: 10 }}>{name}</text></g>)}
    {isA(670, 38, 700, 62, "v1")}{isA(746, 38, 735, 62, "v2")}{isA(842, 38, 770, 62, "v3")}
    <path d="M500 226 C 430 224, 420 140, 402 112" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <text x={398} y={184} textAnchor="end" className="ld-muted" style={{ fontSize: 10 }}>parks 0..1</text>
    <path d="M660 122 C 640 150, 620 170, 610 198" fill="none" className="ld-dash-warn" markerEnd="url(#ld-a-park)" />
    <text x={700} y={166} className="ld-warn" style={{ fontSize: 10, fontWeight: 700 }}>fits? CanFit(vehicle)</text>
    {/* strategies */}
    <rect x={16} y={52} width={186} height={40} rx={10} className="ld-accent" />
    <text x={109} y={76} textAnchor="middle" className="ld-t" style={{ fontSize: 11 }}>IParkingSpotStrategy</text>
    <rect x={16} y={128} width={186} height={40} rx={10} className="ld-accent" />
    <text x={109} y={152} textAnchor="middle" className="ld-t" style={{ fontSize: 11 }}>IPricingStrategy</text>
    <path d="M202 72 H 240" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <path d="M202 148 C 224 148, 224 116, 240 104" fill="none" className="ld-line" markerEnd="url(#ld-a-park)" />
    <text x={122} y={206} className="ld-good" style={{ fontSize: 10, fontWeight: 700 }}>injected — new rule = new class,</text>
    <text x={122} y={220} className="ld-good" style={{ fontSize: 10, fontWeight: 700 }}>ParkingLot never changes</text>
  </svg>;
}

function ElevatorDiagram() {
  const floors = [10, 8, 6, 4, 2, 0];
  const fy = (f) => 306 - f * 26;
  return <svg viewBox="0 0 860 340" className="lld-svg" role="img" aria-label="Elevator controller architecture and SCAN scheduling">
    <defs>
      <marker id="ld-a-elev" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="ld-marker" /></marker>
    </defs>
    {/* architecture */}
    <rect x={96} y={16} width={216} height={52} rx={12} className="ld-box" />
    <text x={204} y={38} textAnchor="middle" className="ld-t">ElevatorController</text>
    <text x={204} y={55} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>RequestElevator(floor, dir)</text>
    {[[16, "Elevator 1"], [136, "Elevator 2"], [256, "Elevator 3"]].map(([x, name], i) => <g key={name}>
      <rect x={x} y={120} width={104} height={54} rx={10} className="ld-box" />
      <text x={x + 52} y={142} textAnchor="middle" className="ld-t" style={{ fontSize: 11 }}>{name}</text>
      <text x={x + 52} y={159} textAnchor="middle" className="ld-muted" style={{ fontSize: 9 }}>floor · dir · state</text>
      <path d={`M204 68 C 204 92, ${x + 52} 90, ${x + 52} 116`} fill="none" className="ld-line" markerEnd="url(#ld-a-elev)" />
    </g>)}
    <text x={204} y={96} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>assigns via IElevatorSelectionStrategy</text>
    {/* elevator state cycle */}
    {[[16, "Idle"], [120, "Moving"], [226, "DoorOpen"]].map(([x, name]) => <g key={name}>
      <rect x={x} y={240} width={102} height={36} rx={9} className="ld-ghost" />
      <text x={x + 51} y={262} textAnchor="middle" className="ld-t" style={{ fontSize: 11 }}>{name}</text>
    </g>)}
    <path d="M170 174 V 240" fill="none" className="ld-dash" markerEnd="url(#ld-a-elev)" />
    <path d="M120 258 H 118" fill="none" className="ld-line" />
    <path d="M222 258 H 226" fill="none" className="ld-line" markerEnd="url(#ld-a-elev)" />
    <path d="M328 276 C 328 306, 40 306, 40 278" fill="none" className="ld-line" markerEnd="url(#ld-a-elev)" />
    <text x={184} y={320} textAnchor="middle" className="ld-muted" style={{ fontSize: 10 }}>arrive → doors → close → idle / next stop</text>
    <text x={26} y={214} className="ld-muted" style={{ fontSize: 10 }}>each car owns an</text>
    <text x={26} y={227} className="ld-muted" style={{ fontSize: 10 }}>ElevatorState</text>
    {/* SCAN chart */}
    <line x1={470} y1={296} x2={836} y2={296} className="ld-line" />
    {floors.map(f => <g key={f}><text x={462} y={fy(f) + 4} textAnchor="end" className="ld-muted" style={{ fontSize: 10 }}>F{f}</text><line x1={468} y1={fy(f)} x2={836} y2={fy(f)} className="ld-grid" /></g>)}
    <text x={650} y={fy(10) - 12} textAnchor="middle" className="ld-t" style={{ fontSize: 11 }}>SCAN scheduling — car at F5, direction UP</text>
    {/* requests */}
    {[[6, "ld-accent-dot"], [8, "ld-accent-dot"], [10, "ld-accent-dot"]].map(([f, cls]) => <circle key={f} cx={560} cy={fy(f)} r={7} className={cls} />)}
    <circle cx={560} cy={fy(2)} r={7} className="ld-warn-dot" />
    <text x={578} y={fy(8) + 4} className="ld-muted" style={{ fontSize: 10 }}>up: {`{6, 8, 10}`} → SortedSet</text>
    <text x={578} y={fy(2) + 4} className="ld-warn" style={{ fontSize: 10, fontWeight: 700 }}>down: {`{2}`}</text>
    {/* current floor + path */}
    <path d={`M540 ${fy(5)} l20 -12 l0 24 z`} className="ld-fill-accent" />
    <text x={532} y={fy(5) + 4} textAnchor="end" className="ld-good" style={{ fontSize: 10, fontWeight: 700 }}>now</text>
    <path d={`M560 ${fy(5)} V ${fy(10) + 14}`} fill="none" className="ld-line" markerEnd="url(#ld-a-elev)" />
    <path d={`M600 ${fy(10)} V ${fy(2) + 14}`} fill="none" className="ld-line" markerEnd="url(#ld-a-elev)" />
    <path d={`M560 ${fy(10)} H 600`} fill="none" className="ld-dash" />
    <text x={624} y={fy(10) - 2} className="ld-good" style={{ fontSize: 10, fontWeight: 700 }}>serve 6 → 8 → 10</text>
    <text x={612} y={fy(4) + 4} className="ld-warn" style={{ fontSize: 10, fontWeight: 700 }}>then reverse → 2</text>
  </svg>;
}

const LLD_DIAGRAMS = { lru: LruDiagram, vending: VendingDiagram, parking: ParkingDiagram, elevator: ElevatorDiagram };
const LLD_DIAGRAM_CAPTIONS = {
  lru: "The dictionary finds the node; the list keeps recency. Redraw this in 30 seconds in your interview.",
  vending: "Every box is a class. Illegal operations throw from the state that disallows them — the machine itself is a dispatcher.",
  parking: "Nouns form a composition tree; the two rules that change (allocation, pricing) are injected strategies.",
  elevator: "The controller picks the car, the car picks the floor — SCAN falls out of two SortedSets.",
};

/* ---------------------------------- chapter card ---------------------------------- */

function LldChapter({ chapter, open, onToggle }) {
  const [activeFile, setActiveFile] = useState(0);
  const Diagram = LLD_DIAGRAMS[chapter.diagram];
  return <div className={`lld-chapter${open ? " open" : ""}`} id={chapter.id} style={{ "--lld-accent": chapter.accent }}>
    <button type="button" className="lld-chapter-head" onClick={onToggle}>
      <span className="lld-num">{chapter.num}</span>
      <div className="lld-chapter-title"><h3>{chapter.title}</h3><p>{chapter.tagline}</p></div>
      <span className="lld-pattern-chip">{chapter.pattern}</span>
      <span className="collapse-icon">{open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
    </button>
    {open && <div className="lld-chapter-body">
      <div className="lld-cols">
        <div className="panel lld-inner">
          <h4><ListChecks size={15} /> Requirements to agree on first</h4>
          <ul className="lld-reqs">{chapter.requirements.map(r => <li key={r}><CheckCircle2 size={13} />{r}</li>)}</ul>
        </div>
        <div className="panel lld-inner">
          <h4><ScanLine size={15} /> Complexity contract</h4>
          <div className="lld-cx-grid">{chapter.complexity.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
        </div>
      </div>
      <div className="panel lld-inner">
        <h4><Lightbulb size={15} /> The design idea</h4>
        {chapter.idea.map((p, i) => <p key={i} className="lld-idea">{p}</p>)}
      </div>
      <figure className="panel lld-figure">
        <Diagram />
        <figcaption>{LLD_DIAGRAM_CAPTIONS[chapter.diagram]}</figcaption>
      </figure>
      <div className="panel lld-inner">
        <h4><Code2 size={15} /> Completed C# implementation</h4>
        <p className="lld-note">The original notes stopped at the happy path — every missing class below (bold in tabs) completes the design to interview standard.</p>
        <div className="lld-file-tabs" role="tablist">
          {chapter.files.map((f, i) => <button type="button" role="tab" aria-selected={activeFile === i} className={activeFile === i ? "active" : ""} key={f.name} onClick={() => setActiveFile(i)}>{f.name}</button>)}
        </div>
        <LldCode {...chapter.files[activeFile]} />
      </div>
      <div className="lld-cols">
        <div className="panel lld-inner">
          <h4><MessagesSquare size={15} /> Interview questions they'll ask</h4>
          <div className="lld-qa">{chapter.qa.map(([q, a]) => <div key={q}><b>{q}</b><p>{a}</p></div>)}</div>
        </div>
        <div className="panel lld-inner lld-followup">
          <h4><Route size={15} /> "Now change it…" follow-ups</h4>
          <ul className="lld-bullets">{chapter.followUps.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
      </div>
    </div>}
  </div>;
}

/* ---------------------------------- page ---------------------------------- */

export function LLDPage() {
  const [openId, setOpenId] = useState(() => new Set([LLD_CHAPTERS[0].id]));
  const toggle = (id) => setOpenId(x => { const next = new Set(x); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return <section className="lld-page">
    <div className="lld-hero">
      <div className="lld-hero-copy">
        <span className="eyebrow">LOW-LEVEL DESIGN · C#</span>
        <h2>Four designs that cover most LLD interviews</h2>
        <p>LRU Cache, Vending Machine, Parking Lot and the Elevator System — completed from skeleton notes into whole, defensible designs with diagrams, full implementations and the follow-up questions interviewers ask next.</p>
        <div className="lld-hero-chips">{["State Pattern", "Strategy Pattern", "Factory", "SCAN scheduling", "SOLID"].map(c => <span key={c}>{c}</span>)}</div>
      </div>
    </div>

    <div className="panel lld-inner lld-map">
      <h4><Grid2x2 size={15} /> The pattern map — which problem proves which skill</h4>
      <div className="lld-table-wrap"><table className="lld-table">
        <thead><tr><th>Problem</th><th>Main pattern / concept</th><th>The one thing it proves</th></tr></thead>
        <tbody>{LLD_PATTERN_TABLE.map(row => <tr key={row[0]}><td><b>{row[0]}</b></td><td><span className="lld-pattern-chip static">{row[1]}</span></td><td>{row[2]}</td></tr>)}</tbody>
      </table></div>
    </div>

    <div className="panel lld-inner">
      <h4><Workflow size={15} /> Run every LLD round in this order</h4>
      <div className="lld-steps">{LLD_STEPS.map(([title, body], i) => <div key={title} className="lld-step"><span>{i + 1}</span><div><b>{title}</b><p>{body}</p></div></div>)}</div>
    </div>

    {LLD_CHAPTERS.map(c => <LldChapter key={c.id} chapter={c} open={openId.has(c.id)} onToggle={() => toggle(c.id)} />)}

    <div className="lld-cols">
      <div className="panel lld-inner">
        <h4><Layers size={15} /> The maturity ladder — memorize the order, not the code</h4>
        <ol className="lld-ladder">{LLD_LADDER.map(x => <li key={x}>{x}</li>)}</ol>
      </div>
      <div className="panel lld-inner">
        <h4><BookMarked size={15} /> One-line recap cards</h4>
        <div className="lld-recap">{LLD_RECAP_CARDS.map(([k, v]) => <div key={k}><b>{k}</b><p>{v}</p></div>)}</div>
        <div className="analytics-note"><Sparkles size={16} /><span>For SDE-2, expect the design to be taken further: {LLD_FOLLOWUP_PROMPTS.slice(0, 3).map(p => <em key={p}>“{p}”</em>)} — those follow-ups matter more than the initial class diagram.</span></div>
      </div>
    </div>
  </section>;
}
