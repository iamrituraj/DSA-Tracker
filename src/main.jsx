import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, LayoutDashboard, BookOpen, RefreshCw, Brain, BarChart3, Settings, CheckCircle2, Clock3, Download, Upload, ExternalLink, ChevronRight, ChevronDown, Flame, Star, Filter, CalendarDays, Target, RotateCcw, Trash2, Timer, Lightbulb, BookmarkCheck, Lock, Unlock, Pencil, Plus, Code2, Moon, Sun, Copy, Check } from "lucide-react";
import "./styles.css";

const SEED = "/data/problems.json";
const SOLUTION_SEED = "/data/solutions.json";
const TUF_LINK_SEED = "/data/tuf-links.json";
const statuses = ["Not Started", "Attempted", "Solved", "Mastered"];
const confidence = ["🔴 Weak", "🟡 Learning", "🟢 Strong", "🔵 Interview Ready"];
const revisionSteps = [1, 3, 7, 14, 30];
const NOTE_FIELDS = [
  ["insight", "Key insight", "What is the core idea or pattern behind this problem?"],
  ["mistake", "My mistake", "What did you miss, misread, or get wrong on the first try?"],
  ["approach", "Approach", "Write the approach in your own words, step by step."],
  ["complexity", "Complexity", "Time: O(?)   Space: O(?)"],
  ["interviewCue", "Interview cue", "What keywords or constraints should trigger this pattern?"],
];
const emptyNotes = () => ({ insight: "", mistake: "", approach: "", complexity: "", interviewCue: "" });
const defaultApproaches = () => ([
  { id: "brute", title: "1. Brute Force", level: "Brute", time: "O(?)", space: "O(?)", explanation: "", code: "" },
  { id: "better", title: "2. Better", level: "Better", time: "O(?)", space: "O(?)", explanation: "", code: "" },
  { id: "optimal", title: "3. Optimal", level: "Optimal", time: "O(?)", space: "O(?)", explanation: "", code: "" },
  { id: "optimal-alt", title: "4. Optimal (alt)", level: "Optimal+", time: "O(?)", space: "O(?)", explanation: "", code: "" },
]);
function uid() { return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }

function useLocalState(key, initial) {
  const [v, setV] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) ?? initial } catch { return initial } });
  useEffect(() => localStorage.setItem(key, JSON.stringify(v)), [key, v]);
  return [v, setV];
}
const todayKey = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
const daysBetween = (a, b) => Math.max(0, Math.ceil((new Date(b) - new Date(a)) / 86400000));
const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
function solutionLink(extractedUrl) {
  if (isHttp(extractedUrl)) return { href: extractedUrl, label: "View TakeUForward solution" };
  return null;
}
function leetCodeLink(p) {
  if (isHttp(p.url) && /leetcode\.com/i.test(p.url)) return { href: p.url, label: "Open on LeetCode" };
  return null;
}

function App() {
  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useLocalState("dsa-progress", {});
  const [notes, setNotes] = useLocalState("dsa-notes", {});
  const [solutions, setSolutions] = useLocalState("dsa-solutions", {});
  const [activity, setActivity] = useLocalState("dsa-activity", {});
  const [settings, setSettings] = useLocalState("dsa-settings", { dailyGoal: 3, theme: "light" });
  const [builtInSolutions, setBuiltInSolutions] = useState({});
  const [tufLinks, setTufLinks] = useState({});
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [roadmapFilters, setRoadmapFilters] = useState({ topic: "All", status: "All", difficulty: "All", pattern: "All", favorites: false, sort: "Order" });
  const [toast, setToast] = useState("");
  const [syncStatus, setSyncStatus] = useState("checking");
  const [cloudReady, setCloudReady] = useState(false);
  const cloudState = () => ({ progress, notes, solutions, activity, settings });
  const loadCloudState = async () => {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("Could not load cloud data");
    const { state } = await response.json();
    if (state) {
      setProgress(state.progress || {});
      setNotes(state.notes || {});
      setSolutions(state.solutions || {});
      setActivity(state.activity || {});
      setSettings(s => ({ ...s, ...(state.settings || {}) }));
    }
    setCloudReady(true);
  };
  const signIn = async password => {
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) throw new Error((await response.json()).error || "Could not sign in");
    await loadCloudState();
    setSyncStatus("synced");
    setToast("Cloud sync connected.");
  };
  const signOut = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setCloudReady(false);
    setSyncStatus("signed-out");
    setToast("Cloud sync disconnected on this device.");
  };
  useEffect(() => fetch(SEED).then(r => { if (!r.ok) throw new Error("data"); return r.json() }).then(setProblems).catch(() => setToast("Could not load problem data.")), []);
  useEffect(() => fetch(SOLUTION_SEED).then(r => r.ok ? r.json() : {}).then(setBuiltInSolutions).catch(() => setBuiltInSolutions({})), []);
  useEffect(() => fetch(TUF_LINK_SEED).then(r => r.ok ? r.json() : {}).then(setTufLinks).catch(() => setTufLinks({})), []);
  useEffect(() => {
    fetch("/api/auth").then(r => r.ok ? r.json() : { authenticated: false }).then(async ({ authenticated }) => {
      if (!authenticated) { setSyncStatus("signed-out"); return; }
      await loadCloudState();
      setSyncStatus("synced");
    }).catch(() => setSyncStatus("unavailable"));
  }, []);
  useEffect(() => {
    if (!cloudReady) return;
    const timer = setTimeout(async () => {
      setSyncStatus("syncing");
      try {
        const response = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: cloudState() }) });
        if (!response.ok) throw new Error("save failed");
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cloudReady, progress, notes, solutions, activity, settings]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t) }, [toast]);
  const enriched = useMemo(() => problems.map((p, i) => ({ ...p, index: i, ...(progress[p.id] || {}) })), [problems, progress]);
  const stats = useMemo(() => {
    const solved = enriched.filter(p => p.status === "Solved" || p.status === "Mastered").length;
    const mastered = enriched.filter(p => p.status === "Mastered").length;
    const weak = enriched.filter(p => p.confidence === "🔴 Weak").length;
    const due = enriched.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).length;
    const attempted = enriched.filter(p => p.status === "Attempted").length;
    const today = activity[todayKey()] || 0;
    let streak = 0; let d = new Date();
    while (activity[d.toISOString().slice(0, 10)] > 0) { streak++; d.setDate(d.getDate() - 1) }
    return { solved, mastered, weak, due, total: enriched.length, attempted, today, streak };
  }, [enriched, activity]);
  const filtered = useMemo(() => {
    const f = roadmapFilters;
    let arr = enriched.filter(p =>
      (!query || `${p.title} ${p.topic} ${p.pattern}`.toLowerCase().includes(query.toLowerCase())) &&
      (f.topic === "All" || p.topic === f.topic) && (f.status === "All" || p.status === f.status) &&
      (f.difficulty === "All" || p.difficulty === f.difficulty) && (f.pattern === "All" || p.pattern === f.pattern) &&
      (!f.favorites || p.favorite)
    );
    if (f.sort === "Title") arr.sort((a, b) => a.title.localeCompare(b.title));
    if (f.sort === "Difficulty") arr.sort((a, b) => ["Easy", "Medium", "Hard"].indexOf(a.difficulty) - ["Easy", "Medium", "Hard"].indexOf(b.difficulty));
    if (f.sort === "Weakest") arr.sort((a, b) => Number(a.confidence?.includes("Weak") || false) - Number(b.confidence?.includes("Weak") || false));
    return arr;
  }, [enriched, query, roadmapFilters]);
  const update = (id, patch) => setProgress(x => ({ ...x, [id]: { ...(x[id] || {}), ...patch } }));
  const recordActivity = () => setActivity(x => ({ ...x, [todayKey()]: ((x[todayKey()] || 0) + 1) }));
  const open = (p) => { setSelected(p.id); setPage("problem") };
  const selectedProblem = useMemo(() => enriched.find(p => p.id === selected) || null, [enriched, selected]);
  const exportData = () => { const blob = new Blob([JSON.stringify({ version: 3, progress, notes, solutions, activity, settings, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dsa-tracker-backup.json"; a.click(); URL.revokeObjectURL(a.href) };
  const importData = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.progress) setProgress(d.progress); if (d.notes) setNotes(d.notes); if (d.solutions) setSolutions(d.solutions); if (d.activity) setActivity(d.activity); if (d.settings) setSettings(d.settings); setToast("Backup restored.") } catch { setToast("Invalid backup file.") } }; r.readAsText(f); e.target.value = "" };
  const resetAll = () => { if (confirm("Reset all progress, notes, solutions and activity? This cannot be undone unless you have a backup.")) { setProgress({}); setNotes({}); setSolutions({}); setActivity({}); setToast("All local progress reset.") } };
  const topics = ["All", ...new Set(problems.map(p => p.topic))];
  const patterns = ["All", ...new Set(
    (roadmapFilters.topic === "All" ? problems : problems.filter(p => p.topic === roadmapFilters.topic)).map(p => p.pattern)
  )];
  useEffect(() => {
    if (roadmapFilters.pattern !== "All" && !patterns.includes(roadmapFilters.pattern)) {
      setRoadmapFilters(f => ({ ...f, pattern: "All" }));
    }
  }, [roadmapFilters.topic, roadmapFilters.pattern, patterns]);
  return <div className={`app theme-${settings.theme || "light"}`}>
    <aside><div className="brand"><div className="logo">DS</div><div><b>DSA Tracker</b><small>A2Z Learning System</small></div></div>
      <nav>{[["dashboard", "Dashboard", LayoutDashboard], ["roadmap", "A2Z Roadmap", BookOpen], ["revision", "Revision", RefreshCw], ["patterns", "Patterns", Brain], ["analytics", "Analytics", BarChart3], ["settings", "Settings", Settings]].map(([id, label, I]) => <button className={page === id ? "active" : ""} onClick={() => setPage(id)} key={id}><I size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><Flame size={16} /> {syncStatus === "synced" ? "Cloud sync on" : syncStatus === "syncing" ? "Saving changes…" : "Local data"}</div>
      <button className="theme-toggle" type="button" onClick={() => setSettings(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))} aria-label="Toggle dark mode">{settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}<span>{settings.theme === "dark" ? "Light mode" : "Dark mode"}</span></button>
    </aside>
    <main><header><div><h1>{page === "dashboard" ? "Dashboard" : page === "roadmap" ? "A2Z Roadmap" : page === "problem" ? "Problem" : page[0].toUpperCase() + page.slice(1)}</h1><p>Practice, track, revise, master.</p></div><div className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search problems, topics, patterns…" /></div></header>
      {page === "dashboard" && <Dashboard stats={stats} problems={enriched} open={open} setPage={setPage} settings={settings} />}
      {page === "roadmap" && <Roadmap problems={enriched} topics={topics} patterns={patterns} open={open} filters={roadmapFilters} setFilters={setRoadmapFilters} filtered={filtered} />}
      {page === "revision" && <Revision problems={enriched} open={open} update={update} recordActivity={recordActivity} />}
      {page === "patterns" && <Patterns problems={enriched} tufLinks={tufLinks} open={open} />}
      {page === "analytics" && <Analytics stats={stats} problems={enriched} activity={activity} notes={notes} solutions={solutions} />}
      {page === "settings" && <SettingsPage exportData={exportData} importData={importData} resetAll={resetAll} settings={settings} setSettings={setSettings} syncStatus={syncStatus} signIn={signIn} signOut={signOut} />}
      {page === "problem" && selectedProblem && <Problem p={selectedProblem} update={update} notes={notes[selectedProblem.id] || {}} setNotes={setNotes} solutions={solutions[selectedProblem.id]} builtInSolutions={builtInSolutions[selectedProblem.id]} tufUrl={tufLinks[selectedProblem.id]} setSolutions={setSolutions} back={() => setPage("roadmap")} recordActivity={recordActivity} setToast={setToast} />}
    </main>
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Dashboard({ stats, problems, open, setPage, settings }) {
  const pct = stats.total ? Math.round(stats.solved / stats.total * 100) : 0;
  const due = problems.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)).slice(0, 5);
  const next = problems.filter(p => p.status === "Not Started").slice(0, 5);
  const weak = problems.filter(p => p.confidence === "🔴 Weak").slice(0, 4);
  return <section>
    <div className="hero"><div><span className="eyebrow">YOUR DSA JOURNEY</span><h2>{stats.solved} / {stats.total} problems completed</h2><p>Build consistency, revisit weak patterns, and turn solved problems into interview-ready knowledge.</p><div className="goal"><Target size={15} /> Today: <b>{Math.min(stats.today, settings.dailyGoal)}/{settings.dailyGoal}</b> activity{settings.dailyGoal !== 1 ? "ies" : ""}</div></div><div className="ring" style={{ "--pct": `${pct * 3.6}deg` }}><span>{pct}%</span></div></div>
    <div className="cards">{[["🔥", "Streak", `${stats.streak} day${stats.streak !== 1 ? "s" : ""}`, "Consecutive active days"], ["🔁", "Due today", stats.due, "Revision queue"], ["🔴", "Weak", stats.weak, "Needs practice"], ["⭐", "Mastered", stats.mastered, "Interview ready"]].map((x, i) => <div className="card" key={i}><span className="card-icon">{x[0]}</span><div><small>{x[1]}</small><strong>{x[2]}</strong><em>{x[3]}</em></div></div>)}</div>
    <div className="grid2"><DashboardPanel title="Revision due" subtitle="Try from memory before opening notes." action="View all" onClick={() => setPage("revision")}>{due.length ? due.map(p => <ProblemRow key={p.id} p={p} open={open} tag="Due" />) : <Empty text="No revisions due. Nice work!" />}</DashboardPanel><DashboardPanel title="Continue A2Z" subtitle="Pick up where you left off." action="Open roadmap" onClick={() => setPage("roadmap")}>{next.map(p => <ProblemRow key={p.id} p={p} open={open} />)}</DashboardPanel></div>
    <div className="grid2"><DashboardPanel title="Weak problems" subtitle="Prioritize these before learning more." action="Open roadmap" onClick={() => setPage("roadmap")}>{weak.length ? weak.map(p => <ProblemRow key={p.id} p={p} open={open} tag="Weak" />) : <Empty text="No weak problems marked." />}</DashboardPanel><div className="panel quick"><h3>Study loop</h3><div><span>1</span><p><b>Attempt</b><small>Think before checking anything.</small></p></div><div><span>2</span><p><b>Record</b><small>Save insight, mistake and complexity.</small></p></div><div><span>3</span><p><b>Revise</b><small>Follow the spaced schedule.</small></p></div></div></div>
  </section>
}
function DashboardPanel({ title, subtitle, action, onClick, children }) { return <div className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="text-btn" onClick={onClick}>{action}<ChevronRight size={15} /></button></div>{children}</div> }
function ProblemRow({ p, open, tag }) { return <button className="problem-row" onClick={() => open(p)}><div className={`status-dot ${String(p.status || "Not Started").toLowerCase().replace(/\s+/g, "-")}`}></div><div className="row-main"><b>{p.title}{p.favorite && <Star size={12} fill="currentColor" />}</b><span>{p.topic} · {p.pattern}</span></div><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>{tag && <span className="due">{tag}</span>}<ChevronRight size={17} /></button> }

function groupByTopicPattern(list) {
  const topics = {};
  list.forEach(p => {
    (topics[p.topic] ??= {});
    (topics[p.topic][p.pattern] ??= []).push(p);
  });
  return topics;
}

function Roadmap({ problems, topics, patterns, open, filters, setFilters, filtered }) {
  const set = (k, v) => setFilters(x => ({ ...x, [k]: v }));
  const grouped = useMemo(() => groupByTopicPattern(filtered), [filtered]);
  const [collapsedTopics, setCollapsedTopics] = useState({});
  const [collapsedPatterns, setCollapsedPatterns] = useState({});
  const toggleTopic = (topic) => setCollapsedTopics(x => ({ ...x, [topic]: !x[topic] }));
  const togglePattern = (topic, pattern) => {
    const key = `${topic}::${pattern}`;
    setCollapsedPatterns(x => ({ ...x, [key]: !x[key] }));
  };
  return <section>
    <div className="roadmap-summary">
      <div className="roadmap-count"><b>{filtered.length}</b><span> visible problems</span></div>
      <div className="legend">
        <span><i className="dot done" /><em>Solved</em></span>
        <span><i className="dot todo" /><em>Not started</em></span>
        <span><i className="dot weak" /><em>Weak</em></span>
      </div>
    </div>
    <div className="filters panel"><div className="filter-title"><Filter size={15} /> Filters <button onClick={() => setFilters({ topic: "All", status: "All", difficulty: "All", pattern: "All", favorites: false, sort: "Order" })}><RotateCcw size={13} />Reset</button></div><div className="filter-grid"><select value={filters.topic} onChange={e => set("topic", e.target.value)}>{topics.map(x => <option key={x}>{x}</option>)}</select><select value={filters.status} onChange={e => set("status", e.target.value)}><option>All</option>{statuses.map(x => <option key={x}>{x}</option>)}</select><select value={filters.difficulty} onChange={e => set("difficulty", e.target.value)}><option>All</option>{["Easy", "Medium", "Hard"].map(x => <option key={x}>{x}</option>)}</select><select value={filters.pattern} onChange={e => set("pattern", e.target.value)}>{patterns.map(x => <option key={x}>{x}</option>)}</select><select value={filters.sort} onChange={e => set("sort", e.target.value)}><option>Order</option><option>Title</option><option>Difficulty</option><option>Weakest</option></select><button className={filters.favorites ? "toggle on" : "toggle"} onClick={() => set("favorites", !filters.favorites)}><Star size={14} fill={filters.favorites ? "currentColor" : "none"} /> Favorites</button></div></div>
    {filtered.length ? Object.entries(grouped).map(([topic, pats]) => {
      const topicCount = Object.values(pats).reduce((n, arr) => n + arr.length, 0);
      const topicSolved = Object.values(pats).flat().filter(p => p.status === "Solved" || p.status === "Mastered").length;
      const topicClosed = !!collapsedTopics[topic];
      return <div className="topic-block" key={topic}>
        <button type="button" className="topic-head" onClick={() => toggleTopic(topic)}>
          <span className="collapse-icon">{topicClosed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
          <h3>{topic}</h3>
          <span>{topicSolved}/{topicCount}</span>
        </button>
        {!topicClosed && Object.entries(pats).map(([pattern, ps]) => {
          const solved = ps.filter(p => p.status === "Solved" || p.status === "Mastered").length;
          const key = `${topic}::${pattern}`;
          const closed = !!collapsedPatterns[key];
          return <div className={`pattern-block${closed ? " collapsed" : ""}`} key={pattern}>
            <button type="button" className="pattern-head" onClick={() => togglePattern(topic, pattern)}>
              <span className="collapse-icon">{closed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
              <h4>{pattern}</h4>
              <span>{solved}/{ps.length}</span>
            </button>
            {!closed && <div className="problem-list">{ps.map(p => <ProblemRow key={p.id} p={p} open={open} />)}</div>}
          </div>;
        })}
      </div>;
    }) : <Empty text="No problems match these filters." />}
  </section>
}

function Revision({ problems, open, update, recordActivity }) { const now = Date.now(); const due = problems.filter(p => p.nextRevision && new Date(p.nextRevision).getTime() <= now).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)); const upcoming = problems.filter(p => p.nextRevision && new Date(p.nextRevision) > now).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)).slice(0, 10); const complete = (p) => { const count = p.revisionCount || 0; const step = revisionSteps[Math.min(count, revisionSteps.length - 1)]; update(p.id, { revisionCount: count + 1, lastRevised: new Date().toISOString(), nextRevision: addDays(step), status: p.status === "Attempted" ? "Solved" : p.status }); recordActivity() }; return <section><div className="callout"><RefreshCw size={22} /><div><b>{due.length} revisions due</b><span>Attempt first. Mark reviewed after you can explain the approach without notes.</span></div></div><div className="revision-columns"><div><h3 className="section-title">Due now</h3><div className="problem-list">{due.length ? due.map(p => <RevisionRow key={p.id} p={p} open={open} complete={complete} />) : <Empty text="Nothing is due right now." />}</div></div><div><h3 className="section-title">Upcoming</h3><div className="panel upcoming">{upcoming.length ? upcoming.map(p => <button key={p.id} onClick={() => open(p)}><div><b>{p.title}</b><span>{new Date(p.nextRevision).toLocaleDateString()} · {daysBetween(new Date(), p.nextRevision)} day{daysBetween(new Date(), p.nextRevision) !== 1 ? "s" : ""}</span></div><ChevronRight size={15} /></button>) : <Empty text="No scheduled revisions yet." />}</div></div></div></section> }
function RevisionRow({ p, open, complete }) { return <div className="revision-row"><button className="revision-main" onClick={() => open(p)}><div className="status-dot" /><div><b>{p.title}</b><span>{p.topic} · Revision #{(p.revisionCount || 0) + 1}</span></div></button><button className="review-btn" onClick={() => complete(p)}><CheckCircle2 size={15} />Reviewed</button></div> }

function Patterns({ problems, tufLinks, open }) {
  const grouped = useMemo(() => groupByTopicPattern(problems), [problems]);
  return <section className="patterns-page">
    {Object.entries(grouped).map(([topic, pats]) => {
      const all = Object.values(pats).flat();
      const topicSolved = all.filter(p => p.status === "Solved" || p.status === "Mastered").length;
      return <div className="topic-block" key={topic}>
        <div className="topic-head"><h3>{topic}</h3><span>{topicSolved}/{all.length} completed</span></div>
        <div className="pattern-grid">
          {Object.entries(pats).map(([pattern, ps]) => {
            const solved = ps.filter(p => p.status === "Solved" || p.status === "Mastered").length;
            return <div className="pattern-card" key={pattern}>
              <div className="pattern-top"><div><span className="pattern-icon">◆</span><h3>{pattern}</h3><p>{solved}/{ps.length} completed</p></div><strong>{ps.length ? Math.round(solved / ps.length * 100) : 0}%</strong></div>
              <div className="bar"><i style={{ width: `${ps.length ? solved / ps.length * 100 : 0}%` }} /></div>
              <div className="pattern-list">{ps.map(p => { const link = solutionLink(tufLinks[p.id]); return <div className="pattern-row" key={p.id}><button onClick={() => open(p)}><span>{p.title}</span><span className={`mini-status ${String(p.status || "Not Started").toLowerCase().replace(/\s+/g, "-")}`}>{p.status || "Not Started"}</span></button>{link && <a className="pattern-ext" href={link.href} target="_blank" rel="noreferrer" title={link.label} onClick={e => e.stopPropagation()}><ExternalLink size={13} /></a>}</div> })}</div>
            </div>;
          })}
        </div>
      </div>;
    })}
  </section>;
}

function Analytics({ stats, problems, activity, notes, solutions }) {
  const statusCounts = { "Not Started": 0, Attempted: 0, Solved: 0, Mastered: 0 };
  const confCounts = { "🔴 Weak": 0, "🟡 Learning": 0, "🟢 Strong": 0, "🔵 Interview Ready": 0, Unset: 0 };
  const topics = {};
  const diffs = { Easy: { t: 0, s: 0 }, Medium: { t: 0, s: 0 }, Hard: { t: 0, s: 0 } };
  let notesCount = 0, solutionsCount = 0, approachesFilled = 0;
  problems.forEach(p => {
    statusCounts[p.status || "Not Started"] = (statusCounts[p.status || "Not Started"] || 0) + 1;
    const conf = p.confidence || "Unset";
    confCounts[conf] = (confCounts[conf] || 0) + 1;
    topics[p.topic] ??= { t: 0, s: 0, a: 0, weak: 0 };
    topics[p.topic].t++;
    if (p.status === "Solved" || p.status === "Mastered") topics[p.topic].s++;
    if (p.status === "Attempted") topics[p.topic].a++;
    if (p.confidence === "🔴 Weak") topics[p.topic].weak++;
    if (diffs[p.difficulty]) {
      diffs[p.difficulty].t++;
      if (p.status === "Solved" || p.status === "Mastered") diffs[p.difficulty].s++;
    }
    const n = notes[p.id];
    if (n && Object.values(n).some(v => String(v || "").trim())) notesCount++;
    const sol = solutions[p.id]?.approaches || [];
    if (sol.some(a => a.explanation?.trim() || a.code?.trim())) {
      solutionsCount++;
      approachesFilled += sol.filter(a => a.explanation?.trim() || a.code?.trim()).length;
    }
  });
  const topicRows = Object.entries(topics).map(([k, v]) => ({ name: k, ...v, pct: v.t ? Math.round(v.s / v.t * 100) : 0 })).sort((a, b) => a.pct - b.pct);
  const weakest = topicRows.filter(t => t.t > 0).slice(0, 5);
  const strongest = [...topicRows].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    last14.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }), count: activity[key] || 0 });
  }
  const maxAct = Math.max(1, ...last14.map(d => d.count));
  const dueSoon = problems.filter(p => p.nextRevision).length;
  const dueNow = problems.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).length;
  const totalAttempts = problems.reduce((s, p) => s + (p.attempts || 0), 0);
  return <section className="analytics-page">
    <div className="stats-large">
      <div><small>Completion</small><strong>{stats.total ? Math.round(stats.solved / stats.total * 100) : 0}%</strong><em>{stats.solved}/{stats.total}</em></div>
      <div><small>Mastered</small><strong>{stats.mastered}</strong><em>Interview ready</em></div>
      <div><small>In progress</small><strong>{stats.attempted}</strong><em>Attempted</em></div>
      <div><small>Streak</small><strong>{stats.streak}</strong><em>Active days</em></div>
    </div>
    <div className="stats-large secondary">
      <div><small>Notes coverage</small><strong>{notesCount}</strong><em>{stats.total ? Math.round(notesCount / stats.total * 100) : 0}% of problems</em></div>
      <div><small>Solutions written</small><strong>{solutionsCount}</strong><em>{approachesFilled} approaches filled</em></div>
      <div><small>Revisions due</small><strong>{dueNow}</strong><em>{dueSoon} scheduled total</em></div>
      <div><small>Total attempts</small><strong>{totalAttempts}</strong><em>Across all problems</em></div>
    </div>
    <div className="panel">
      <h3>Last 14 days activity</h3>
      <div className="activity-chart">
        {last14.map(d => (
          <div className="activity-col" key={d.key} title={`${d.key}: ${d.count}`}>
            <div className="activity-bar-wrap"><i style={{ height: `${(d.count / maxAct) * 100}%` }} /></div>
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="grid2">
      <div className="panel">
        <h3>Status breakdown</h3>
        {Object.entries(statusCounts).map(([k, v]) => (
          <div className="bar-row" key={k}><div><span>{k}</span><b>{v}</b></div><div className="bar"><i style={{ width: `${stats.total ? v / stats.total * 100 : 0}%` }} /></div></div>
        ))}
      </div>
      <div className="panel">
        <h3>Confidence mix</h3>
        {Object.entries(confCounts).filter(([, v]) => v > 0).map(([k, v]) => (
          <div className="bar-row" key={k}><div><span>{k}</span><b>{v}</b></div><div className="bar"><i style={{ width: `${stats.total ? v / stats.total * 100 : 0}%` }} /></div></div>
        ))}
      </div>
    </div>
    <div className="grid2">
      <div className="panel">
        <h3>Difficulty completion</h3>
        {Object.entries(diffs).map(([k, v]) => (
          <div className="bar-row" key={k}><div><span>{k}</span><b>{v.s}/{v.t}</b></div><div className="bar"><i style={{ width: `${v.t ? v.s / v.t * 100 : 0}%` }} /></div></div>
        ))}
      </div>
      <div className="panel">
        <h3>Focus next (weakest topics)</h3>
        {weakest.length ? weakest.map(t => (
          <div className="bar-row" key={t.name}><div><span>{t.name}</span><b>{t.pct}% · {t.weak} weak</b></div><div className="bar"><i style={{ width: `${t.pct}%` }} /></div></div>
        )) : <Empty text="No topic data yet." />}
      </div>
    </div>
    <div className="grid2">
      <div className="panel">
        <h3>Topic progress</h3>
        {topicRows.map(t => (
          <div className="bar-row" key={t.name}><div><span>{t.name}</span><b>{t.s}/{t.t}</b></div><div className="bar"><i style={{ width: `${t.pct}%` }} /></div></div>
        ))}
      </div>
      <div className="panel">
        <h3>Strongest topics</h3>
        {strongest.map(t => (
          <div className="bar-row" key={t.name}><div><span>{t.name}</span><b>{t.pct}%</b></div><div className="bar"><i style={{ width: `${t.pct}%` }} /></div></div>
        ))}
        <div className="analytics-note"><Lightbulb size={16} /><span>Pair weakest topics with revision due items. Fill notes and locked solutions after each solve so review stays high-signal.</span></div>
      </div>
    </div>
  </section>;
}

function Problem({ p, update, notes, setNotes, solutions, builtInSolutions, tufUrl, setSolutions, back, recordActivity, setToast }) {
  const supplied = solutions?.approaches?.length ? solutions : builtInSolutions;
  const [tab, setTab] = useState("notes");
  const [localNotes, setLocalNotes] = useState(() => ({ ...emptyNotes(), ...notes }));
  const [editingNotes, setEditingNotes] = useState(() => !Object.values(notes || {}).some(v => String(v || "").trim()));
  const [localSol, setLocalSol] = useState(() => (supplied?.approaches?.length ? supplied.approaches : defaultApproaches()));
  const [editingSol, setEditingSol] = useState(false);
  const [openApproach, setOpenApproach] = useState(0);
  const [language, setLanguage] = useState("java");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setLocalNotes({ ...emptyNotes(), ...notes });
    setEditingNotes(!Object.values(notes || {}).some(v => String(v || "").trim()));
    setLocalSol(supplied?.approaches?.length ? supplied.approaches : defaultApproaches());
    setEditingSol(false);
    setOpenApproach(0);
    setTab("notes");
  }, [p.id, builtInSolutions, solutions]);

  const status = p.status || "Not Started";
  const link = solutionLink(tufUrl);
  const leetCode = leetCodeLink(p);
  const filledNotes = NOTE_FIELDS.filter(([k]) => localNotes[k]?.trim()).length;
  const filledApproaches = localSol.filter(a => a.explanation?.trim() || a.code?.trim()).length;

  const saveNotes = () => {
    setNotes(x => ({ ...x, [p.id]: localNotes }));
    setEditingNotes(false);
    setToast("Notes saved.");
  };
  const clearNotes = () => {
    if (!confirm("Clear all learning notes for this problem?")) return;
    const blank = emptyNotes();
    setLocalNotes(blank);
    setNotes(x => { const next = { ...x }; delete next[p.id]; return next; });
    setEditingNotes(true);
    setToast("Notes cleared.");
  };
  const saveSolutions = () => {
    setSolutions(x => ({ ...x, [p.id]: { approaches: localSol, updatedAt: new Date().toISOString() } }));
    setEditingSol(false);
    setToast("Solutions locked & saved.");
  };
  const cancelSolEdit = () => {
    setLocalSol(supplied?.approaches?.length ? supplied.approaches : defaultApproaches());
    setEditingSol(false);
    setToast("Solution edits discarded.");
  };
  const updateApproach = (idx, patch) => setLocalSol(list => list.map((a, i) => i === idx ? { ...a, ...patch } : a));
  const addApproach = () => {
    setLocalSol(list => [...list, { id: uid(), title: `${list.length + 1}. New approach`, level: "Custom", time: "O(?)", space: "O(?)", explanation: "", code: "" }]);
    setOpenApproach(localSol.length);
  };
  const removeApproach = (idx) => {
    if (!confirm("Delete this approach?")) return;
    setLocalSol(list => list.filter((_, i) => i !== idx));
    setOpenApproach(0);
  };
  const mark = (nextStatus) => {
    if (status === nextStatus) { setToast(`Already marked ${nextStatus}.`); return; }
    update(p.id, {
      status: nextStatus,
      lastRevised: new Date().toISOString(),
      nextRevision: nextStatus === "Not Started" ? null : addDays(revisionSteps[Math.min(p.revisionCount || 0, revisionSteps.length - 1)]),
      revisionCount: p.revisionCount || 0,
      attempts: (p.attempts || 0) + (nextStatus !== "Not Started" ? 1 : 0),
      favorite: !!p.favorite,
      confidence: nextStatus === "Mastered" ? "🔵 Interview Ready" : (p.confidence || "🟡 Learning")
    });
    recordActivity();
    setToast(`${nextStatus} saved.`);
  };

  return <section className="problem-page">
    <button type="button" className="back" onClick={back}>← Back to roadmap</button>
    <div className="problem-header">
      <div>
        <span className="eyebrow">{p.topic} · {p.pattern}</span>
        <h2>{p.title}</h2>
        <div className="meta">
          <span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
          {link ? <a href={link.href} target="_blank" rel="noreferrer">{link.label} <ExternalLink size={13} /></a> : <span className="no-link">No TakeUForward solution available</span>}
          {leetCode && <a className="tuf-link" href={leetCode.href} target="_blank" rel="noreferrer">{leetCode.label} <ExternalLink size={13} /></a>}
        </div>
      </div>
      <div className="actions">
        <button type="button" className={p.favorite ? "fav active" : "fav"} onClick={() => update(p.id, { favorite: !p.favorite })}><Star size={15} fill={p.favorite ? "currentColor" : "none"} /></button>
        {statuses.filter(s => s !== "Not Started").map(s => <button type="button" key={s} className={status === s ? "status-btn active" : "status-btn"} onClick={() => mark(s)}>{s === "Solved" && <CheckCircle2 size={16} />}{s}</button>)}
        <button type="button" className="status-btn ghost" onClick={() => mark("Not Started")}>Reset</button>
      </div>
    </div>

    <div className="problem-toolbar panel">
      <div className="field tight"><label>Confidence</label><select value={p.confidence || "🟡 Learning"} onChange={e => update(p.id, { confidence: e.target.value })}>{confidence.map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="mini-stats compact"><span>Status<b>{status}</b></span><span>Attempts<b>{p.attempts || 0}</b></span><span>Revisions<b>{p.revisionCount || 0}</b></span></div>
      <div className="problem-tools"><button type="button" onClick={() => { const count = p.revisionCount || 0; const step = revisionSteps[Math.min(count, revisionSteps.length - 1)]; update(p.id, { nextRevision: addDays(step), lastRevised: new Date().toISOString(), revisionCount: count }); setToast(`Next revision in ${step} day${step !== 1 ? "s" : ""}.`); }}><CalendarDays size={15} />Schedule revision</button><span>{p.nextRevision ? `Next: ${new Date(p.nextRevision).toLocaleDateString()}` : "No revision scheduled"}</span></div>
    </div>

    <div className="problem-tabs">
      <button type="button" className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>Learning notes <em>{filledNotes}/5</em></button>
      <button type="button" className={tab === "solutions" ? "active" : ""} onClick={() => setTab("solutions")}>Java & C# solutions <em>{filledApproaches}/{localSol.length}</em></button>
      <button type="button" className={tab === "meta" ? "active" : ""} onClick={() => setTab("meta")}>Revision & meta</button>
    </div>

    {tab === "notes" && <div className="panel notes-panel visible-block">
      <div className="notes-head">
        <div>
          <h3>Learning notes</h3>
          <p>{editingNotes ? "Edit mode — write freely, then save." : "View mode — unlock edit to change notes."}</p>
        </div>
        <div className="notes-actions">
          {!editingNotes ? (
            <>
              <button type="button" className="status-btn" onClick={() => setEditingNotes(true)}><Pencil size={14} /> Edit</button>
              <button type="button" className="status-btn ghost" onClick={clearNotes}><Trash2 size={14} /> Clear</button>
            </>
          ) : (
            <>
              <button type="button" className="primary" onClick={saveNotes}>Save notes</button>
              <button type="button" className="status-btn ghost" onClick={() => { setLocalNotes({ ...emptyNotes(), ...notes }); setEditingNotes(false); }}>Cancel</button>
            </>
          )}
        </div>
      </div>
      <div className="notes-fields">
        {NOTE_FIELDS.map(([key, label, placeholder]) => (
          <div className="note-field" key={key}>
            <span>{label}</span>
            {editingNotes ? (
              <textarea
                className={key === "complexity" || key === "interviewCue" ? "short" : ""}
                value={localNotes[key] || ""}
                onChange={e => setLocalNotes({ ...localNotes, [key]: e.target.value })}
                placeholder={placeholder}
                rows={key === "complexity" || key === "interviewCue" ? 2 : 5}
              />
            ) : (
              <div className={`note-view${localNotes[key]?.trim() ? "" : " empty"}`}>{localNotes[key]?.trim() || "No notes yet — click Edit to add."}</div>
            )}
          </div>
        ))}
      </div>
    </div>}

    {tab === "solutions" && <div className="panel solutions-panel visible-block">
      <div className="notes-head">
        <div>
          <h3>Java & C# solutions — brute → optimal</h3>
          <p>{editingSol ? "Edit your personal copy, then save it locally." : supplied?.approaches?.length ? "Original reference implementations. Choose a named approach and language." : "No reference solution is available yet; unlock to add your own."}</p>
        </div>
        <div className="notes-actions">
          {!editingSol ? (
            <button type="button" className="status-btn" onClick={() => setEditingSol(true)}><Unlock size={14} /> {supplied?.approaches?.length ? "Create personal copy" : "Unlock to edit"}</button>
          ) : (
            <>
              <button type="button" className="status-btn" onClick={addApproach}><Plus size={14} /> Add approach</button>
              <button type="button" className="primary" onClick={saveSolutions}><Lock size={14} /> Save & lock</button>
              <button type="button" className="status-btn ghost" onClick={cancelSolEdit}>Cancel</button>
            </>
          )}
        </div>
      </div>
      <div className="approach-list">
        {localSol.map((a, idx) => {
          const open = openApproach === idx;
          return <div className={`approach-card${open ? " open" : ""}`} key={a.id}>
            <button type="button" className="approach-head" onClick={() => setOpenApproach(open ? -1 : idx)}>
              <span className="collapse-icon">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
              <div className="approach-title">
                {editingSol ? <input value={a.title} onClick={e => e.stopPropagation()} onChange={e => updateApproach(idx, { title: e.target.value })} /> : <strong>{a.title}</strong>}
                <small>{a.level} · Time {a.time || "—"} · Space {a.space || "—"}</small>
              </div>
              {editingSol && <button type="button" className="icon-danger" onClick={e => { e.stopPropagation(); removeApproach(idx); }}><Trash2 size={14} /></button>}
            </button>
            {open && <div className="approach-body">
              <div className="complexity-row">
                <label>Level{editingSol ? <select value={a.level} onChange={e => updateApproach(idx, { level: e.target.value })}>{["Brute", "Better", "Optimal", "Optimal+", "Custom"].map(x => <option key={x}>{x}</option>)}</select> : <b>{a.level}</b>}</label>
                <label>Time{editingSol ? <input value={a.time} onChange={e => updateApproach(idx, { time: e.target.value })} placeholder="O(n)" /> : <b>{a.time || "—"}</b>}</label>
                <label>Space{editingSol ? <input value={a.space} onChange={e => updateApproach(idx, { space: e.target.value })} placeholder="O(1)" /> : <b>{a.space || "—"}</b>}</label>
              </div>
              <div className="note-field">
                <span>Explanation</span>
                {editingSol ? <textarea rows={4} value={a.explanation} onChange={e => updateApproach(idx, { explanation: e.target.value })} placeholder={a.level === "Brute" ? "Most straightforward idea — often nested loops / all possibilities…" : a.level === "Better" ? "Improve with hashing, sorting, two pointers, prefix…" : "Best interview solution for this pattern…"} /> : <div className={`note-view${a.explanation?.trim() ? "" : " empty"}`}>{a.explanation?.trim() || "No explanation yet."}</div>}
              </div>
              <div className="note-field">
                <div className="code-label"><span className="with-icon"><Code2 size={13} /> {editingSol ? "Code / pseudocode" : "Implementation"}</span>{!editingSol && <><div className="language-switch" role="group" aria-label="Select solution language"><button type="button" className={language === "java" ? "active" : ""} onClick={() => setLanguage("java")}>Java</button><button type="button" className={language === "csharp" ? "active" : ""} onClick={() => setLanguage("csharp")}>C#</button></div><button type="button" className="copy-code" onClick={() => { const code = a.code?.[language] || a[language] || a.code || ""; navigator.clipboard?.writeText(code); setCopied(a.id); setTimeout(() => setCopied(""), 1400); }}>{copied === a.id ? <Check size={13} /> : <Copy size={13} />}{copied === a.id ? "Copied" : "Copy"}</button></>}</div>
                {editingSol ? <textarea className="code" rows={8} value={typeof a.code === "string" ? a.code : a.code?.[language] || ""} onChange={e => updateApproach(idx, { code: e.target.value })} placeholder="// Write code or pseudocode here" /> : <pre className={`code-view${(a.code?.[language] || a[language] || a.code)?.trim?.() ? "" : " empty"}`}>{a.code?.[language] || a[language] || a.code || "No code yet."}</pre>}
              </div>
            </div>}
          </div>;
        })}
      </div>
    </div>}

    {tab === "meta" && <div className="meta-grid">
      <div className="panel challenge"><Brain size={22} /><h3>Revision ladder</h3><p>Each review moves the problem farther into the future. Reconstruct the solution before looking at your notes.</p><div className="revision-steps">{revisionSteps.map((d, i) => <span className={(p.revisionCount || 0) > i ? "done-step" : ""} key={d}>{d} day{d !== 1 ? "s" : ""}</span>)}</div></div>
      <div className="panel"><h3>Problem metadata</h3><div className="metadata"><span>Topic<b>{p.topic}</b></span><span>Pattern<b>{p.pattern}</b></span><span>Difficulty<b>{p.difficulty}</b></span><span>Last revised<b>{p.lastRevised ? new Date(p.lastRevised).toLocaleDateString() : "Never"}</b></span></div></div>
      <div className="panel checklist"><h3>Before marking mastered</h3><p><CheckCircle2 size={14} />Can explain the pattern?</p><p><CheckCircle2 size={14} />Can solve without looking?</p><p><CheckCircle2 size={14} />Know time & space complexity?</p><p><CheckCircle2 size={14} />Know when to use this pattern?</p></div>
    </div>}
  </section>;
}

function SettingsPage({ exportData, importData, resetAll, settings, setSettings, syncStatus, signIn, signOut }) {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const connected = ["synced", "syncing", "error"].includes(syncStatus);
  const connect = async e => {
    e.preventDefault();
    setAuthError("");
    try {
      await signIn(password);
      setPassword("");
    } catch (error) {
      setAuthError(error.message || "Could not connect cloud sync.");
    }
  };
  return <section>
    <div className="panel settings">
      <h3>Cloud sync</h3>
      {connected ? <div className="setting-row"><div><b>{syncStatus === "syncing" ? "Saving changes…" : syncStatus === "error" ? "Sync needs attention" : "Connected"}</b><span>Your progress, notes, solutions, activity and settings are synced to your private Neon database.</span></div><button onClick={signOut}>Disconnect</button></div> : <form className="setting-row" onSubmit={connect}><div><b>Connect this device</b><span>Enter the single app password configured in Vercel to load and sync your tracker data.</span>{authError && <em className="auth-error">{authError}</em>}</div><div className="cloud-login"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="App password" /><button className="primary" type="submit">Connect</button></div></form>}
    </div>
    <div className="panel settings"><h3>Data & Privacy</h3><p>{connected ? "Cloud sync is enabled. Your local browser copy is also retained for offline use." : "Your progress stays in this browser until you connect cloud sync."}</p><div className="setting-row"><div><b>Daily goal</b><span>How many problem activities count toward your daily target.</span></div><input className="goal-input" type="number" min="1" max="50" value={settings.dailyGoal} onChange={e => setSettings({ ...settings, dailyGoal: Math.max(1, Number(e.target.value) || 1) })} /></div><div className="setting-row"><div><b>Export backup</b><span>Download all progress, notes, solutions, activity and settings as JSON.</span></div><button onClick={exportData}><Download size={16} /> Export</button></div><div className="setting-row"><div><b>Import backup</b><span>Restore a previous DSA Tracker backup.</span></div><label className="file-btn"><Upload size={16} /> Import<input type="file" accept=".json" onChange={importData} /></label></div><div className="setting-row danger-row"><div><b>Reset local data</b><span>{connected ? "Clear your synced and local progress, notes, solutions and activity." : "Delete all progress, notes, solutions and activity from this browser."}</span></div><button className="danger" onClick={resetAll}><Trash2 size={16} /> Reset</button></div></div><div className="panel settings"><h3>How the tracker works</h3><div className="help-grid"><div><Timer size={18} /><b>Revision</b><p>Attempted → 1 day, then 3 → 7 → 14 → 30 day spacing.</p></div><div><BookmarkCheck size={18} /><b>Mastery</b><p>Mastered marks the problem interview-ready and keeps it on a longer review cycle.</p></div><div><Download size={18} /><b>Backup</b><p>Export regularly because local browser storage is device/browser specific.</p></div></div></div></section>
}
function Empty({ text }) { return <div className="empty"><Clock3 size={22} /><span>{text}</span></div> }
createRoot(document.getElementById("root")).render(<App />);
