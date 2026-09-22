import React, { useState } from "react";
import { ArrowLeft, BellRing, CalendarClock, ExternalLink, Radar } from "lucide-react";

/* ---------------------------------- sheet data ----------------------------------
   Each entry mirrors a standalone revision sheet built from /hld into /public/hld
   (see scripts/build-hld.mjs). The viewer embeds those pages in an iframe and
   passes ?theme= so the sheet follows the app's light/dark setting.              */

const HLD_SHEETS = [
  {
    id: "rider-matching",
    file: "/hld/rider-matching.html",
    icon: Radar,
    title: "H3 + Redis Rider Matching",
    tagline: "Match an accepted order to the nearest available rider in under a second — hexagonal geo-indexing, shard-aware Redis structures, and k-ring expansion.",
    sections: ["Architecture", "Capacity Plan", "Geohash vs H3", "Redis Model", "Match Algorithm", "Consistency & Failures", "Edge Cases", "Alternatives", "Interview Playbook"],
    chips: ["Uber H3", "geohash", "GEOSEARCH", "k-ring", "Lua lock", "sharding"],
  },
  {
    id: "notification-system",
    file: "/hld/notification-system.html",
    icon: BellRing,
    title: "Multi-Channel Notification System",
    tagline: "Push, SMS and email at millions per second — at-least-once delivery, idempotency keys, vendor rate limits and flash-sale-sized fan-out.",
    sections: ["Requirements", "Architecture", "Request Sequence", "Data Models", "Reliability", "Scaling", "Data Store Choice", "Rate Limits", "Capacity Plan", "Observability", "Security", "Multi-Region & DR", "Alternatives", "Playbook"],
    chips: ["Kafka", "idempotency", "fan-out", "at-least-once", "DLQ", "Cassandra"],
  },
  {
    id: "job-scheduler",
    file: "/hld/job-scheduler.html",
    icon: CalendarClock,
    title: "Distributed Job Scheduler",
    tagline: "Cron jobs and billions of executions a day — timing wheels, distributed leases, SKIP LOCKED vs CDC, sharding and tiered storage.",
    sections: ["Requirements", "Architecture", "Data Model", "Timing Wheel & Lease", "Due-Job Queries", "Sharding", "Partitioning", "Tiered Storage", "Fault Tolerance", "Capacity Plan", "Alternatives", "Playbook"],
    chips: ["timing wheel", "lease", "SKIP LOCKED", "CDC", "partitioning", "tiered storage"],
  },
];

/* ---------------------------------- sheet viewer ---------------------------------- */

function SheetViewer({ sheet, theme, onBack, onSelect }) {
  const src = `${sheet.file}?theme=${theme === "dark" ? "dark" : "light"}`;
  return <div className="panel hld-viewer">
    <div className="hld-toolbar">
      <button type="button" className="hld-back" onClick={onBack}><ArrowLeft size={15} /><span>All sheets</span></button>
      <div className="hld-tabs">{HLD_SHEETS.map(s => <button type="button" key={s.id} className={s.id === sheet.id ? "active" : ""} onClick={() => onSelect(s.id)}>{s.title}</button>)}</div>
      <a className="hld-open" href={sheet.file} target="_blank" rel="noreferrer" aria-label={`Open ${sheet.title} in a new tab`}><ExternalLink size={14} /><span>New tab</span></a>
    </div>
    <iframe key={src} className="hld-frame" src={src} title={sheet.title} loading="lazy" />
  </div>;
}

/* ---------------------------------- chapter cards ---------------------------------- */

function SheetCard({ sheet, onOpen }) {
  const Icon = sheet.icon;
  return <button type="button" className="hld-card" onClick={onOpen}>
    <div className="hld-card-head">
      <span className="hld-card-icon"><Icon size={19} /></span>
      <div><h3>{sheet.title}</h3><small>System design · SDE-2 depth · {sheet.sections.length} sections</small></div>
    </div>
    <p>{sheet.tagline}</p>
    <div className="hld-card-chips">{sheet.chips.map(c => <span key={c}>{c}</span>)}</div>
    <div className="hld-card-cta">Read revision sheet <ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} /></div>
  </button>;
}

/* ---------------------------------- page ---------------------------------- */

export function HLDPage({ theme = "light" }) {
  const [openId, setOpenId] = useState(null);
  const active = HLD_SHEETS.find(s => s.id === openId);
  return <div>
    <div className="hld-hero">
      <div className="lld-hero-copy">
        <div className="eyebrow">HLD LAB</div>
        <h2>High-Level Design, revision-grade</h2>
        <p>Production-scale system designs the way you would defend them in an interview — capacity math, data models, consistency trade-offs, failure modes and the interview playbook, all in one sheet per system.</p>
        <div className="lld-hero-chips">{["capacity estimation", "sharding", "consistency", "fault tolerance", "trade-offs", "interview playbook"].map(c => <span key={c}>{c}</span>)}</div>
      </div>
    </div>
    {active
      ? <SheetViewer sheet={active} theme={theme} onBack={() => setOpenId(null)} onSelect={setOpenId} />
      : <div className="hld-grid">{HLD_SHEETS.map(s => <SheetCard key={s.id} sheet={s} onOpen={() => setOpenId(s.id)} />)}</div>}
  </div>;
}
