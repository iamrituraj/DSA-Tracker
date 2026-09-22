import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, LayoutDashboard, BookOpen, RefreshCw, Brain, BarChart3, Settings, CheckCircle2, Clock3, Download, Upload, ChevronRight, ChevronDown, Flame, Star, Filter, CalendarDays, Target, RotateCcw, Trash2, Timer, Lightbulb, BookmarkCheck, Lock, Unlock, Pencil, Plus, Code2, Moon, Sun, Copy, Check, Play, Layers, Layers3, List, LayoutGrid, AlertCircle, FileText, PenLine } from "lucide-react";
import "./styles.css";
import "./cloud-sync.css";
import { highlightCode } from "./highlight.js";
import { LLDPage } from "./lld.jsx";
import { HLDPage } from "./hld.jsx";
import { LLD_CHAPTERS } from "./lld-data.js";

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

let storageWarned = false;
function warnStorageError() {
  if (storageWarned) return;
  storageWarned = true;
  try { window.dispatchEvent(new CustomEvent("dsa-storage-error")); } catch { /* storage unavailable */ }
}
function useLocalState(key, initial) {
  const [v, setV] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) ?? initial } catch { return initial } });
  useEffect(() => {
    try {
      const next = JSON.stringify(v);
      if (typeof next === "string" && localStorage.getItem(key) !== next) localStorage.setItem(key, next);
    } catch { warnStorageError(); }
  }, [key, v]);
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== key || (event.storageArea && event.storageArea !== localStorage)) return;
      try { setV(event.newValue === null ? initial : JSON.parse(event.newValue)); } catch { /* ignore malformed cross-tab writes */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [v, setV];
}
const pad2 = (n) => String(n).padStart(2, "0");
const localDayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => localDayKey();
const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
const daysBetween = (a, b) => Math.max(0, Math.ceil((new Date(b) - new Date(a)) / 86400000));
const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const isSolved = (p) => p.status === "Solved" || p.status === "Mastered";
// A problem has a personal solution once the user saves their own copy (non-empty approaches).
const hasPersonalSolution = (solutions, id) => Boolean(solutions?.[id]?.approaches?.length);
function solutionLink(extractedUrl) {
  if (isHttp(extractedUrl)) return { href: extractedUrl, label: "View TakeUForward solution" };
  return null;
}
function leetCodeLink(p) {
  if (isHttp(p.url) && /leetcode\.com/i.test(p.url)) return { href: p.url, label: "Open on LeetCode" };
  return null;
}
const VALID_PAGES = ["dashboard", "roadmap", "revision", "lld", "hld", "patterns", "analytics", "settings"];
const pageLabels = { dashboard: "Dashboard", roadmap: "A2Z Roadmap", revision: "Revision", lld: "LLD Lab", hld: "HLD Lab", patterns: "Patterns", analytics: "Analytics", settings: "Settings" };
function parseHash() {
  try { return decodeURIComponent(window.location.hash.replace(/^#\/?/, "")); } catch { return ""; }
}
const defaultFilters = { topic: "All", status: "All", difficulty: "All", pattern: "All", confidence: "All", favorites: false, sort: "Order" };
const CONF_RANK = { "🔴 Weak": 0, "🟡 Learning": 1, "🟢 Strong": 2, "🔵 Interview Ready": 3 };
const codeFilled = (a) => {
  const c = a?.code;
  if (typeof c === "string") return Boolean(c.trim());
  if (c && typeof c === "object") return Object.values(c).some(v => String(v || "").trim());
  return false;
};
function sanitizeFilters(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const keys = ["topic", "status", "difficulty", "pattern", "confidence", "favorites", "sort"];
  if (!keys.some(k => k in v)) return null;
  const out = { ...defaultFilters };
  ["topic", "status", "difficulty", "pattern", "confidence"].forEach(k => { if (typeof v[k] === "string") out[k] = v[k]; });
  if (typeof v.favorites === "boolean") out.favorites = v.favorites;
  if (["Order", "Title", "Difficulty", "Weakest", "Strongest"].includes(v.sort)) out.sort = v.sort;
  return out;
}
function asBoolMap(v) {
  const out = {};
  if (v && typeof v === "object" && !Array.isArray(v)) Object.entries(v).forEach(([k, x]) => { if (typeof x === "boolean") out[k] = x; });
  return out;
}
function sanitizeCollapse(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const topics = asBoolMap(v.topics);
  const patterns = asBoolMap(v.patterns);
  const cards = asBoolMap(v.cards);
  if (!Object.keys(topics).length && !Object.keys(patterns).length && !Object.keys(cards).length) return null;
  return { topics, patterns, cards };
}
// Cloud/library merge: keep whichever side has more approaches for a problem.
function mergeLibs(base, extra) {
  const merged = { ...extra };
  Object.entries(base).forEach(([key, entry]) => {
    if ((entry?.approaches?.length || 0) > (merged[key]?.approaches?.length || 0)) merged[key] = entry;
  });
  return merged;
}
// Syntax highlighting lives in ./highlight.js (shared with the LLD lab).

function App() {
  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useLocalState("dsa-progress", {});
  const [notes, setNotes] = useLocalState("dsa-notes", {});
  const [solutions, setSolutions] = useLocalState("dsa-solutions", {});
  const [activity, setActivity] = useLocalState("dsa-activity", {});
  const [settings, setSettings] = useLocalState("dsa-settings", { dailyGoal: 3, theme: "light" });
  const [builtInSolutions, setBuiltInSolutions] = useState({});
  const [tufLinks, setTufLinks] = useState({});
  const [page, setPage] = useState(() => { const hash = parseHash(); if (hash.startsWith("problem/")) return "problem"; return VALID_PAGES.includes(hash) ? hash : "dashboard"; });
  const [selected, setSelected] = useState(() => { const hash = parseHash(); return hash.startsWith("problem/") ? hash.slice("problem/".length) : null; });
  const [originPage, setOriginPage] = useState("roadmap");
  const [query, setQuery] = useState("");
  const [lldFocus, setLldFocus] = useState(null);
  // Drop the deep-link once the lab is left, so returning to it later starts from the top.
  useEffect(() => { if (page !== "lld") setLldFocus(null); }, [page]);
  const [roadmapFilters, setRoadmapFilters] = useLocalState("dsa-filters", defaultFilters);
  const [collapse, setCollapse] = useLocalState("dsa-collapse", { topics: {}, patterns: {}, cards: {} });
  const [toast, setToastValue] = useState(null);
  const toastId = useRef(0);
  const setToast = (text) => setToastValue({ id: ++toastId.current, text });
  const [syncStatus, setSyncStatus] = useState("checking");
  const [cloudReady, setCloudReady] = useState(false);
  const [libApproaches, setLibApproaches] = useState(0);
  const cloudLibRef = useRef(0);
  const libSyncDone = useRef(false);
  const cloudState = () => ({ progress, notes, solutions, activity, settings, filters: roadmapFilters, collapse, libApproaches });
  const loadCloudState = async () => {
    libSyncDone.current = false;
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error("Could not load cloud data");
    const { state } = await response.json();
    if (state) {
      setProgress(state.progress || {});
      setNotes(state.notes || {});
      setSolutions(state.solutions || {});
      setActivity(state.activity || {});
      setSettings(s => ({ ...s, ...(state.settings || {}) }));
      const restoredFilters = sanitizeFilters(state.filters); if (restoredFilters) setRoadmapFilters(restoredFilters);
      const restoredCollapse = sanitizeCollapse(state.collapse); if (restoredCollapse) setCollapse(restoredCollapse);
      const libCount = Number(state.libApproaches) || 0;
      cloudLibRef.current = libCount;
      setLibApproaches(libCount);
    }
    setCloudReady(true);
  };
  const signIn = async password => {
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) {
      let message = "Could not sign in";
      try { message = (await response.json()).error || message } catch { /* non-JSON error body */ }
      throw new Error(message);
    }
    await loadCloudState();
    setSyncStatus("synced");
    setToast("Cloud sync connected.");
  };
  const signOut = async () => {
    try { await fetch("/api/auth", { method: "DELETE" }) } catch { /* offline: still switch this device to local mode */ }
    setCloudReady(false);
    setSyncStatus("signed-out");
    setToast("Cloud sync disconnected on this device.");
  };
  useEffect(() => { fetch(SEED).then(r => { if (!r.ok) throw new Error("data"); return r.json() }).then(setProblems).catch(() => setToast("Could not load problem data.")) }, []);
  useEffect(() => { fetch(SOLUTION_SEED).then(r => r.ok ? r.json() : {}).then(setBuiltInSolutions).catch(() => setBuiltInSolutions({})) }, []);
  // Sync the authored solution library with the cloud copy once per session:
  // the side with more approaches wins, so deploys and devices converge.
  useEffect(() => {
    if (!cloudReady || libSyncDone.current) return;
    const keys = Object.keys(builtInSolutions);
    if (!keys.length) return;
    const total = keys.reduce((n, k) => n + (builtInSolutions[k]?.approaches?.length || 0), 0);
    if (!total) return;
    libSyncDone.current = true;
    if (cloudLibRef.current === total) return;
    const pushToCloud = cloudLibRef.current < total;
    (async () => {
      try {
        if (pushToCloud) {
          const response = await fetch("/api/solutions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solutions: builtInSolutions }) });
          if (!response.ok) throw new Error("save failed");
          setLibApproaches(total);
          setToast("Solution library synced to cloud.");
        } else {
          const response = await fetch("/api/solutions");
          if (!response.ok) throw new Error("load failed");
          const { solutions: cloudLib } = await response.json();
          if (!cloudLib || typeof cloudLib !== "object") return;
          const nextLib = mergeLibs(builtInSolutions, cloudLib);
          setBuiltInSolutions(nextLib);
          setLibApproaches(Object.values(nextLib).reduce((n, v) => n + (v?.approaches?.length || 0), 0));
          setToast("Solution library pulled from cloud.");
        }
      } catch {
        setToast("Solution library sync failed.");
      }
    })();
  }, [cloudReady, builtInSolutions]);
  useEffect(() => { fetch(TUF_LINK_SEED).then(r => r.ok ? r.json() : {}).then(setTufLinks).catch(() => setTufLinks({})) }, []);
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
  }, [cloudReady, progress, notes, solutions, activity, settings, roadmapFilters, collapse, libApproaches]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToastValue(null), 2500); return () => clearTimeout(t) }, [toast]);
  useEffect(() => {
    const onStorageError = () => setToast("Could not save to browser storage — export a backup from Settings.");
    window.addEventListener("dsa-storage-error", onStorageError);
    return () => window.removeEventListener("dsa-storage-error", onStorageError);
  }, []);
  const enriched = useMemo(() => problems.map((p, i) => ({ ...p, index: i, ...(progress[p.id] || {}) })), [problems, progress]);
  const stats = useMemo(() => {
    const solved = enriched.filter(p => p.status === "Solved" || p.status === "Mastered").length;
    const mastered = enriched.filter(p => p.status === "Mastered").length;
    const weak = enriched.filter(p => p.confidence === "🔴 Weak").length;
    const due = enriched.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).length;
    const attempted = enriched.filter(p => p.status === "Attempted").length;
    const today = activity[todayKey()] || 0;
    let streak = 0; let d = new Date();
    if (!(activity[localDayKey(d)] > 0)) d.setDate(d.getDate() - 1);
    while (activity[localDayKey(d)] > 0) { streak++; d.setDate(d.getDate() - 1) }
    return { solved, mastered, weak, due, total: enriched.length, attempted, today, streak };
  }, [enriched, activity]);
  const filtered = useMemo(() => {
    const f = roadmapFilters;
    let arr = enriched.filter(p =>
      (!query || `${p.title} ${p.topic} ${p.pattern}`.toLowerCase().includes(query.toLowerCase())) &&
      (f.topic === "All" || p.topic === f.topic) && (f.status === "All" || p.status === f.status) &&
      (f.difficulty === "All" || p.difficulty === f.difficulty) && (f.pattern === "All" || p.pattern === f.pattern) &&
      (f.confidence === "All" || (f.confidence === "Not set" ? !p.confidence : p.confidence === f.confidence)) &&
      (!f.favorites || p.favorite)
    );
    if (f.sort === "Title") arr.sort((a, b) => a.title.localeCompare(b.title));
    if (f.sort === "Difficulty") arr.sort((a, b) => ["Easy", "Medium", "Hard"].indexOf(a.difficulty) - ["Easy", "Medium", "Hard"].indexOf(b.difficulty));
    if (f.sort === "Weakest") arr.sort((a, b) => Number(a.confidence?.includes("Weak") || false) - Number(b.confidence?.includes("Weak") || false));
    if (f.sort === "Strongest") arr.sort((a, b) => (CONF_RANK[b.confidence] ?? -1) - (CONF_RANK[a.confidence] ?? -1));
    return arr;
  }, [enriched, query, roadmapFilters]);
  const update = (id, patch) => setProgress(x => ({ ...x, [id]: { ...(x[id] || {}), ...patch } }));
  const recordActivity = () => setActivity(x => ({ ...x, [todayKey()]: ((x[todayKey()] || 0) + 1) }));
  const open = (p) => { if (page !== "problem") setOriginPage(page); setSelected(p.id); setPage("problem") };
  const selectedProblem = useMemo(() => enriched.find(p => p.id === selected) || null, [enriched, selected]);
  useEffect(() => {
    const target = page === "problem" && selected ? `#problem/${encodeURIComponent(selected)}` : `#${page}`;
    if (window.location.hash !== target) window.history.replaceState(null, "", target);
  }, [page, selected]);
  useEffect(() => {
    if (page === "problem" && problems.length && !selectedProblem) setPage(originPage);
  }, [page, problems.length, selectedProblem, originPage]);
  const exportData = () => { const blob = new Blob([JSON.stringify({ version: 4, progress, notes, solutions, activity, settings, filters: roadmapFilters, collapse, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dsa-tracker-backup.json"; a.click(); URL.revokeObjectURL(a.href) };
  const importData = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); const isObj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null; const next = { progress: isObj(d.progress), notes: isObj(d.notes), solutions: isObj(d.solutions), activity: isObj(d.activity), filters: sanitizeFilters(d.filters), collapse: sanitizeCollapse(d.collapse) }; if (!next.progress && !next.notes && !next.solutions && !next.activity) throw new Error("no tracker data"); if (next.progress) setProgress(next.progress); if (next.notes) setNotes(next.notes); if (next.solutions) setSolutions(next.solutions); if (next.activity) setActivity(next.activity); if (next.filters) setRoadmapFilters(next.filters); if (next.collapse) setCollapse(next.collapse); if (d.settings) setSettings(s => ({ ...s, dailyGoal: Math.min(50, Math.max(1, Number(d.settings.dailyGoal) || s.dailyGoal)), theme: d.settings.theme === "dark" ? "dark" : d.settings.theme === "light" ? "light" : s.theme })); setToast("Backup restored.") } catch { setToast("Invalid backup file.") } }; r.readAsText(f); e.target.value = "" };
  const resetAll = () => { if (confirm("Reset all progress, notes, solutions and activity? This cannot be undone unless you have a backup.")) { setProgress({}); setNotes({}); setSolutions({}); setActivity({}); setToast("All local progress reset.") } };
  const viewWeak = () => { setRoadmapFilters(f => ({ ...f, topic: "All", pattern: "All", difficulty: "All", favorites: false, confidence: "🔴 Weak" })); setPage("roadmap"); };
  // Search destinations: a pattern result jumps to that section of the roadmap, an LLD result opens
  // the lab on that chapter.
  const patternGroups = useMemo(() => {
    const out = [], seen = new Set();
    enriched.forEach(p => {
      const key = `${p.topic}::${p.pattern}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ topic: p.topic, pattern: p.pattern });
    });
    return out;
  }, [enriched]);
  const goPattern = (g) => { setRoadmapFilters({ ...defaultFilters, topic: g.topic, pattern: g.pattern }); setPage("roadmap") };
  const goChapter = (id) => { setLldFocus(id); setPage("lld") };
  const hasLocalData = [progress, notes, solutions, activity].some(x => Object.keys(x).length > 0);
  const topics = ["All", ...new Set(problems.map(p => p.topic))];
  const patterns = ["All", ...new Set(
    (roadmapFilters.topic === "All" ? problems : problems.filter(p => p.topic === roadmapFilters.topic)).map(p => p.pattern)
  )];
  useEffect(() => {
    if (roadmapFilters.topic !== "All" && !topics.includes(roadmapFilters.topic)) {
      setRoadmapFilters(f => ({ ...f, topic: "All", pattern: "All" }));
      return;
    }
    if (roadmapFilters.pattern !== "All" && !patterns.includes(roadmapFilters.pattern)) {
      setRoadmapFilters(f => ({ ...f, pattern: "All" }));
    }
  }, [roadmapFilters.topic, roadmapFilters.pattern, patterns, topics]);
  return <div className={`app theme-${settings.theme || "light"}`}>
    <aside><div className="brand"><div className="logo">DS</div><div><b>DSA Tracker</b><small>A2Z Learning System</small></div></div>
      <nav>{[["dashboard", "Dashboard", LayoutDashboard], ["roadmap", "A2Z Roadmap", BookOpen], ["revision", "Revision", RefreshCw], ["lld", "LLD Lab", Layers], ["hld", "HLD Lab", Layers3], ["patterns", "Patterns", Brain], ["analytics", "Analytics", BarChart3], ["settings", "Settings", Settings]].map(([id, label, I]) => <button className={page === id ? "active" : ""} onClick={() => setPage(id)} key={id}><I size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><Flame size={16} /> {syncStatus === "synced" ? "Cloud sync on" : syncStatus === "syncing" ? "Saving changes…" : "Local data"}</div>
      <button className="theme-toggle" type="button" onClick={() => setSettings(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))} aria-label="Toggle dark mode">{settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}<span>{settings.theme === "dark" ? "Light mode" : "Dark mode"}</span></button>
    </aside>
    <main><header><div><h1>{page === "problem" ? "Problem" : pageLabels[page]}</h1><p>Practice, track, revise, master.</p></div><GlobalSearch query={query} setQuery={setQuery} problems={enriched} patternGroups={patternGroups} chapters={LLD_CHAPTERS} open={open} onPattern={goPattern} onChapter={goChapter} /></header>
      {page === "dashboard" && <Dashboard stats={stats} problems={enriched} open={open} setPage={setPage} settings={settings} viewWeak={viewWeak} tufLinks={tufLinks} solutions={solutions} />}
      {page === "roadmap" && <Roadmap problems={enriched} topics={topics} patterns={patterns} open={open} filters={roadmapFilters} setFilters={setRoadmapFilters} filtered={filtered} collapse={collapse} setCollapse={setCollapse} query={query} clearQuery={() => setQuery("")} tufLinks={tufLinks} solutions={solutions} />}
      {page === "revision" && <Revision problems={enriched} open={open} update={update} recordActivity={recordActivity} query={query} />}
      {page === "lld" && <LLDPage focus={lldFocus} />}
      {page === "hld" && <HLDPage theme={settings.theme === "dark" ? "dark" : "light"} />}
      {page === "patterns" && <Patterns problems={enriched} tufLinks={tufLinks} open={open} collapse={collapse} setCollapse={setCollapse} />}
      {page === "analytics" && <Analytics stats={stats} problems={enriched} activity={activity} notes={notes} solutions={solutions} builtInSolutions={builtInSolutions} settings={settings} />}
      {page === "settings" && <SettingsPage exportData={exportData} importData={importData} resetAll={resetAll} settings={settings} setSettings={setSettings} syncStatus={syncStatus} signIn={signIn} signOut={signOut} hasLocalData={hasLocalData} />}
      {page === "problem" && selectedProblem && <Problem p={selectedProblem} update={update} notes={notes[selectedProblem.id] || {}} setNotes={setNotes} solutions={solutions[selectedProblem.id]} builtInSolutions={builtInSolutions[selectedProblem.id]} tufUrl={tufLinks[selectedProblem.id]} setSolutions={setSolutions} back={() => setPage(originPage)} backLabel={pageLabels[originPage] || "roadmap"} recordActivity={recordActivity} setToast={setToast} />}
    </main>
    {toast && <div className="toast" key={toast.id}>{toast.text}</div>}
  </div>
}

function Dashboard({ stats, problems, open, setPage, settings, viewWeak, tufLinks, solutions }) {
  const pct = stats.total ? Math.round(stats.solved / stats.total * 100) : 0;
  const due = problems.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)).slice(0, 5);
  const next = problems.filter(p => p.status === "Not Started").slice(0, 5);
  const weak = problems.filter(p => p.confidence === "🔴 Weak");
  return <section>
    <div className="hero"><div><span className="eyebrow">YOUR DSA JOURNEY</span><h2>{stats.solved} / {stats.total} problems completed</h2><p>Build consistency, revisit weak patterns, and turn solved problems into interview-ready knowledge.</p><div className="goal"><Target size={15} /> Today: <b>{Math.min(stats.today, settings.dailyGoal)}/{settings.dailyGoal}</b> activit{settings.dailyGoal !== 1 ? "ies" : "y"}</div></div><div className="ring" style={{ "--pct": `${pct * 3.6}deg` }}><span>{pct}%</span></div></div>
    <div className="cards">{[["🔥", "Streak", `${stats.streak} day${stats.streak !== 1 ? "s" : ""}`, "Consecutive active days"], ["🔁", "Due today", stats.due, "Revision queue"], ["🔴", "Weak", stats.weak, "Needs practice"], ["⭐", "Mastered", stats.mastered, "Interview ready"]].map((x, i) => <div className="card" key={i}><span className="card-icon">{x[0]}</span><div><small>{x[1]}</small><strong>{x[2]}</strong><em>{x[3]}</em></div></div>)}</div>
    <div className="grid2"><DashboardPanel title="Revision due" subtitle="Try from memory before opening notes." action="View all" onClick={() => setPage("revision")}>{due.length ? due.map(p => <ProblemRow key={p.id} p={p} open={open} tag="Due" tufLinks={tufLinks} solutions={solutions} />) : <Empty text="No revisions due. Nice work!" />}</DashboardPanel><DashboardPanel title="Continue A2Z" subtitle="Pick up where you left off." action="Open roadmap" onClick={() => setPage("roadmap")}>{next.map(p => <ProblemRow key={p.id} p={p} open={open} tufLinks={tufLinks} solutions={solutions} />)}</DashboardPanel></div>
    <div className="grid2"><DashboardPanel title="Weak problems" subtitle={weak.length ? `${weak.length} marked weak — clear these before learning more.` : "Prioritize weak problems before learning more."} action="View all" onClick={viewWeak}>{weak.length ? <div className="weak-scroll">{weak.map(p => <ProblemRow key={p.id} p={p} open={open} tag="Weak" tufLinks={tufLinks} solutions={solutions} />)}</div> : <Empty text="No weak problems marked." />}</DashboardPanel><div className="panel quick"><h3>Study loop</h3><div><span>1</span><p><b>Attempt</b><small>Think before checking anything.</small></p></div><div><span>2</span><p><b>Record</b><small>Save insight, mistake and complexity.</small></p></div><div><span>3</span><p><b>Revise</b><small>Follow the spaced schedule.</small></p></div></div></div>
  </section>
}
function DashboardPanel({ title, subtitle, action, onClick, children }) { return <div className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="text-btn" onClick={onClick}>{action}<ChevronRight size={15} /></button></div>{children}</div> }
// The header search is global: it works on every page by offering results rather than only
// re-filtering the roadmap, which is why typing elsewhere used to look like a dead input.
function GlobalSearch({ query, setQuery, problems, patternGroups, chapters, open, onPattern, onChapter }) {
  const [ui, setUi] = useState({ focused: false, active: 0 });
  const box = useRef(null);
  const input = useRef(null);
  const q = query.trim().toLowerCase();
  useEffect(() => {
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setUi(x => ({ ...x, focused: false })) };
    // "/" focuses the search from anywhere, unless the user is already typing in a field.
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      input.current?.focus();
      setUi(x => ({ ...x, focused: true }));
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) };
  }, []);
  const results = useMemo(() => {
    if (!q) return [];
    const out = [];
    const hit = (s) => String(s).toLowerCase().includes(q);
    const probs = problems
      .map(p => ({ p, rank: (hit(p.title) ? 0 : 1) + (p.status === "Mastered" ? 1 : 0) }))
      .filter(x => hit(x.p.title) || hit(x.p.topic) || hit(x.p.pattern))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 7);
    probs.forEach(({ p }) => out.push({ kind: "Problem", group: "Problems", icon: Code2, title: p.title, meta: `${p.topic} · ${p.pattern}`, diff: p.difficulty, p }));
    const seen = new Set();
    patternGroups.filter(g => (hit(g.pattern) || hit(g.topic)) && !seen.has(`${g.topic}::${g.pattern}`) && seen.add(`${g.topic}::${g.pattern}`))
      .slice(0, 4)
      .forEach(g => out.push({ kind: "Pattern", group: "Patterns", icon: Brain, title: g.pattern, meta: g.topic, g }));
    chapters.filter(c => hit(`${c.title} ${c.tagline} ${c.pattern}`)).slice(0, 3)
      .forEach(c => out.push({ kind: "LLD", group: "LLD Lab", icon: Layers, title: c.title, meta: c.pattern, c }));
    // Flag the first row of each group so the section label renders without mutating during map().
    return out.map((r, i) => ({ ...r, firstOfGroup: i === 0 || out[i - 1].group !== r.group }));
  }, [q, problems, patternGroups, chapters]);
  const show = ui.focused && query.trim() !== "";
  const hint = ui.focused && query.trim() === "";
  // Results carry data, not callbacks, so the memo above stays stable across App re-renders.
  const activate = (r) => {
    if (r.kind === "Problem") open(r.p);
    else if (r.kind === "Pattern") onPattern(r.g);
    else onChapter(r.c.id);
    setUi({ focused: false, active: 0 });
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") { setQuery(""); setUi({ focused: false, active: 0 }); return }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      setUi(x => ({ ...x, focused: true, active: (x.active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length }));
      return;
    }
    if (e.key === "Enter" && show && results[ui.active]) { e.preventDefault(); activate(results[ui.active]); }
  };
  return <div className="search global-search" ref={box}>
    <Search size={17} />
    <input ref={input} value={query} onChange={e => { setQuery(e.target.value); setUi(x => ({ focused: true, active: 0 })) }} onKeyDown={onKeyDown}
      onFocus={() => setUi(x => ({ ...x, focused: true }))} placeholder="Search problems, patterns, LLD…   /"
      role="combobox" aria-expanded={show} aria-label="Search problems, patterns and LLD chapters" aria-controls="global-search-results" />
    {hint && <div className="gs-results" role="listbox" aria-label="Search help">
      <div className="gs-hint">Search across problems, pattern groups and LLD chapters. ↑↓ to move, Enter to open, Esc to clear.</div>
    </div>}
    {show && <div className="gs-results" id="global-search-results" role="listbox" aria-label="Search results">
      {results.length ? results.map((r, i) => { const Icon = r.icon; return <React.Fragment key={`${r.kind}-${r.title}-${i}`}>
        {r.firstOfGroup && <div className="gs-group" aria-hidden="true">{r.group}</div>}
        <button type="button" id={`gs-opt-${i}`} role="option" aria-selected={ui.active === i} className={`gs-item${ui.active === i ? " active" : ""}`}
          onMouseEnter={() => setUi(x => ({ ...x, active: i }))} onClick={() => activate(r)}>
          <Icon size={14} />
          <span className="gs-item-main"><b>{r.title}</b><span>{r.meta}</span></span>
          {r.diff && <span className={`diff ${r.diff.toLowerCase()}`}>{r.diff}</span>}
          <ChevronRight size={14} className="gs-go" />
        </button>
      </React.Fragment>; }) : <div className="gs-none">No problem, pattern or LLD chapter matches “{query.trim()}”.</div>}
    </div>}
  </div>;
}

// Quick action icons shown on problem rows (roadmap/dashboard): personal solution, editorial solution, LeetCode, video.
function RowExtLinks({ p, tufLinks, solutions }) {
  const link = solutionLink(tufLinks?.[p.id]);
  const leetCode = leetCodeLink(p);
  const video = isHttp(p.videoUrl) ? p.videoUrl : null;
  const mine = hasPersonalSolution(solutions, p.id);
  if (!link && !leetCode && !video && !mine) return null;
  return <span className="row-ext" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
    {mine && <a className="row-ext-btn mine" href={`#problem/${encodeURIComponent(p.id)}`} title="Your saved solutions"><PenLine size={14} /></a>}
    {link && <a className="row-ext-btn" href={link.href} target="_blank" rel="noreferrer" title="View TakeUForward solution"><FileText size={14} /></a>}
    {leetCode && <a className="row-ext-btn" href={leetCode.href} target="_blank" rel="noreferrer" title="Open on LeetCode"><Code2 size={14} /></a>}
    {video && <a className="row-ext-btn" href={video} target="_blank" rel="noreferrer" title="Watch explanation video"><Play size={14} /></a>}
  </span>;
}
function ProblemRow({ p, open, tag, tufLinks, solutions }) { return <button className="problem-row" onClick={() => open(p)}><div className={`status-dot ${String(p.status || "Not Started").toLowerCase().replace(/\s+/g, "-")}`}></div><div className="row-main"><b>{p.title}{p.favorite && <Star size={12} fill="currentColor" />}</b><span>{p.topic} · {p.pattern}</span></div><RowExtLinks p={p} tufLinks={tufLinks} solutions={solutions} /><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>{tag && <span className="due">{tag}</span>}<ChevronRight size={17} /></button> }

function groupByTopicPattern(list) {
  const topics = {};
  list.forEach(p => {
    (topics[p.topic] ??= {});
    (topics[p.topic][p.pattern] ??= []).push(p);
  });
  return topics;
}

function Roadmap({ problems, topics, patterns, open, filters, setFilters, filtered, collapse, setCollapse, query, clearQuery, tufLinks, solutions }) {
  const set = (k, v) => setFilters(x => ({ ...x, [k]: v }));
  const grouped = useMemo(() => groupByTopicPattern(filtered), [filtered]);
  const searching = query.trim() !== "";
  // Collapse state lives in App and persists to localStorage + the cloud DB: topic sections stay
  // open by default, pattern sub-sections start collapsed, and every toggle survives reloads.
  const collapsedTopics = collapse.topics || {};
  const collapsedPatterns = collapse.patterns || {};
  const toggleTopic = (topic) => setCollapse(x => ({ ...x, topics: { ...(x.topics || {}), [topic]: !(x.topics || {})[topic] } }));
  const togglePattern = (topic, pattern) => {
    const key = `${topic}::${pattern}`;
    setCollapse(x => {
      const stored = x.patterns || {};
      // The search-time default (open) is what a first click has to flip against.
      return { ...x, patterns: { ...stored, [key]: !(stored[key] ?? !searching) } };
    });
  };
  return <section>
    <div className="roadmap-summary">
      <div className="roadmap-count"><b>{filtered.length}</b><span>{searching ? ` match${filtered.length === 1 ? "" : "es"} for “${query.trim()}”` : " visible problems"}</span></div>
      <div className="legend">
        <span><i className="dot done" /><em>Solved</em></span>
        <span><i className="dot todo" /><em>Not started</em></span>
        <span><i className="dot weak" /><em>Weak</em></span>
      </div>
    </div>
    <div className="filters panel"><div className="filter-title"><Filter size={15} /> Filters <button onClick={() => { setFilters({ ...defaultFilters }); clearQuery(); }}><RotateCcw size={13} />Reset</button></div><div className="filter-grid"><select value={filters.topic} onChange={e => set("topic", e.target.value)}>{topics.map(x => <option key={x}>{x}</option>)}</select><select value={filters.status} onChange={e => set("status", e.target.value)}><option>All</option>{statuses.map(x => <option key={x}>{x}</option>)}</select><select value={filters.difficulty} onChange={e => set("difficulty", e.target.value)}><option>All</option>{["Easy", "Medium", "Hard"].map(x => <option key={x}>{x}</option>)}</select><select value={filters.pattern} onChange={e => set("pattern", e.target.value)}>{patterns.map(x => <option key={x}>{x}</option>)}</select><select value={filters.confidence || "All"} onChange={e => set("confidence", e.target.value)}><option>All</option>{confidence.map(x => <option key={x}>{x}</option>)}<option>Not set</option></select><select value={filters.sort} onChange={e => set("sort", e.target.value)}><option>Order</option><option>Title</option><option>Difficulty</option><option>Weakest</option><option>Strongest</option></select><button className={filters.favorites ? "toggle on" : "toggle"} onClick={() => set("favorites", !filters.favorites)}><Star size={14} fill={filters.favorites ? "currentColor" : "none"} /> Favorites</button></div></div>
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
          // Pattern sections start collapsed, which used to make a search look dead — every block
          // still listed while searching is a hit, so it opens unless the user toggled it.
          const closed = key in collapsedPatterns ? !!collapsedPatterns[key] : !searching;
          return <div className={`pattern-block${closed ? " collapsed" : ""}`} key={pattern}>
            <button type="button" className="pattern-head" onClick={() => togglePattern(topic, pattern)}>
              <span className="collapse-icon">{closed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}</span>
              <span className="pattern-icon" aria-hidden="true">◆</span>
              <h4>{pattern}</h4>
              <span className="pattern-count">{solved}/{ps.length}</span>
            </button>
            {!closed && <div className="problem-list">{ps.map(p => <ProblemRow key={p.id} p={p} open={open} tufLinks={tufLinks} solutions={solutions} />)}</div>}
          </div>;
        })}
      </div>;
    }) : <Empty text={searching ? `No problems match “${query.trim()}”.` : "No problems match these filters."} />}
  </section>
}

function Revision({ problems, open, update, recordActivity, query }) { const now = Date.now(); const q = String(query || "").trim().toLowerCase(); const matches = (p) => !q || `${p.title} ${p.topic} ${p.pattern}`.toLowerCase().includes(q); const due = problems.filter(p => p.nextRevision && new Date(p.nextRevision).getTime() <= now).filter(matches).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)); const upcoming = problems.filter(p => p.nextRevision && new Date(p.nextRevision) > now).filter(matches).sort((a, b) => new Date(a.nextRevision) - new Date(b.nextRevision)).slice(0, 10); const complete = (p) => { const count = p.revisionCount || 0; const step = revisionSteps[Math.min(count, revisionSteps.length - 1)]; update(p.id, { revisionCount: count + 1, lastRevised: new Date().toISOString(), nextRevision: addDays(step), status: p.status === "Attempted" ? "Solved" : p.status }); recordActivity() }; return <section><div className="callout"><RefreshCw size={22} /><div><b>{due.length} revisions due{q ? ` matching “${q}”` : ""}</b><span>Attempt first. Mark reviewed after you can explain the approach without notes.</span></div></div><div className="revision-columns"><div><h3 className="section-title">Due now</h3><div className="problem-list">{due.length ? due.map(p => <RevisionRow key={p.id} p={p} open={open} complete={complete} />) : <Empty text={q ? "Nothing due matches the search." : "Nothing is due right now."} />}</div></div><div><h3 className="section-title">Upcoming</h3><div className="panel upcoming">{upcoming.length ? upcoming.map(p => <button key={p.id} onClick={() => open(p)}><div><b>{p.title}</b><span>{new Date(p.nextRevision).toLocaleDateString()} · {daysBetween(new Date(), p.nextRevision)} day{daysBetween(new Date(), p.nextRevision) !== 1 ? "s" : ""}</span></div><ChevronRight size={15} /></button>) : <Empty text={q ? "No upcoming revision matches the search." : "No scheduled revisions yet."} />}</div></div></div></section> }
function RevisionRow({ p, open, complete }) { return <div className="revision-row"><button className="revision-main" onClick={() => open(p)}><div className="status-dot" /><div><b>{p.title}</b><span>{p.topic} · Revision #{(p.revisionCount || 0) + 1}</span></div></button><button className="review-btn" onClick={() => complete(p)}><CheckCircle2 size={15} />Reviewed</button></div> }

const defaultPatternFilters = { q: "", topic: "All", progress: "All", sort: "Order" };
const patternProgressLabels = ["All", "In progress", "Complete", "Not started"];

// One card per (topic, pattern) pair, with the numbers the page needs for triage:
// solved/total, difficulty mix, weak count and the next problem to work on.
function buildPatternCards(problems) {
  const grouped = groupByTopicPattern(problems);
  return Object.entries(grouped).flatMap(([topic, pats]) => Object.entries(pats).map(([pattern, ps]) => {
    const solved = ps.filter(isSolved).length;
    const attempted = ps.filter(p => p.status === "Attempted").length;
    const mastered = ps.filter(p => p.status === "Mastered").length;
    const weak = ps.filter(p => p.confidence === "🔴 Weak").length;
    const diff = { Easy: 0, Medium: 0, Hard: 0 };
    ps.forEach(p => { if (diff[p.difficulty] !== undefined) diff[p.difficulty]++ });
    const pct = ps.length ? Math.round(solved / ps.length * 100) : 0;
    const progress = solved === ps.length ? "Complete" : solved + attempted === 0 ? "Not started" : "In progress";
    // Weak problems come back first, even when already solved — they need another pass.
    const next = ps.find(p => p.confidence === "🔴 Weak") || ps.find(p => !isSolved(p)) || null;
    return { topic, pattern, ps, solved, attempted, mastered, weak, diff, pct, progress, next };
  }));
}

function Patterns({ problems, tufLinks, open, collapse, setCollapse }) {
  const [filters, setFilters] = useLocalState("dsa-pattern-filters", defaultPatternFilters);
  // Card expansion rides on the same cloud-synced collapse payload as the roadmap, under its own
  // `cards` map so a pattern's roadmap state and its patterns-page state stay independent.
  const expanded = collapse.cards || {};
  const set = (k, v) => setFilters(x => ({ ...x, [k]: v }));
  const topicNames = useMemo(() => ["All", ...new Set(problems.map(p => p.topic))], [problems]);
  useEffect(() => {
    if (filters.topic !== "All" && !topicNames.includes(filters.topic)) set("topic", "All");
  }, [topicNames, filters.topic]);
  const cards = useMemo(() => buildPatternCards(problems), [problems]);
  const q = String(filters.q || "").trim().toLowerCase();
  const visible = useMemo(() => {
    let arr = cards.filter(c =>
      (filters.topic === "All" || c.topic === filters.topic) &&
      (filters.progress === "All" || c.progress === filters.progress) &&
      (!q || c.pattern.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q) || c.ps.some(p => p.title.toLowerCase().includes(q)))
    );
    if (filters.sort === "Weakest") arr = [...arr].sort((a, b) => a.pct - b.pct || b.ps.length - a.ps.length);
    if (filters.sort === "Strongest") arr = [...arr].sort((a, b) => b.pct - a.pct || b.ps.length - a.ps.length);
    if (filters.sort === "Most problems") arr = [...arr].sort((a, b) => b.ps.length - a.ps.length);
    if (filters.sort === "Pattern A-Z") arr = [...arr].sort((a, b) => a.pattern.localeCompare(b.pattern));
    return arr;
  }, [cards, filters, q]);
  const byTopic = useMemo(() => {
    const out = {};
    // Re-group so topics keep catalog order and empty topics drop out after filtering.
    visible.forEach(c => { (out[c.topic] ??= []).push(c) });
    return out;
  }, [visible]);
  const totals = useMemo(() => {
    const problemsAll = cards.reduce((n, c) => n + c.ps.length, 0);
    const solvedAll = cards.reduce((n, c) => n + c.solved, 0);
    const focus = cards.filter(c => c.weak || c.pct < 100).sort((a, b) => a.pct - b.pct || b.weak - a.weak)[0] || null;
    return {
      patterns: cards.length,
      complete: cards.filter(c => c.progress === "Complete").length,
      partial: cards.filter(c => c.progress === "In progress").length,
      untouched: cards.filter(c => c.progress === "Not started").length,
      pct: problemsAll ? Math.round(solvedAll / problemsAll * 100) : 0,
      focus,
    };
  }, [cards]);
  const toggleCard = (key) => setCollapse(x => ({ ...x, cards: { ...(x.cards || {}), [key]: !((x.cards || {})[key]) } }));
  const expandAll = () => setCollapse(x => ({ ...x, cards: { ...(x.cards || {}), ...Object.fromEntries(visible.map(c => [`${c.topic}::${c.pattern}`, true])) } }));
  const collapseAll = () => setCollapse(x => ({ ...x, cards: {} }));
  const goFocus = () => { const f = totals.focus; if (!f) return; setFilters(x => ({ ...x, topic: f.topic, progress: "All", q: "" })); setCollapse(x => ({ ...x, cards: { ...(x.cards || {}), [`${f.topic}::${f.pattern}`]: true } })) };
  const anyExpanded = visible.some(c => expanded[`${c.topic}::${c.pattern}`] === true);
  return <section className="patterns-page">
    <div className="panel patterns-overview">
      <div className="po-stats">
        <div><small>{totals.pct}%</small><span>of all problems solved across {totals.patterns} patterns</span></div>
        <div><b>{totals.complete}</b><span>patterns complete</span></div>
        <div><b>{totals.partial}</b><span>in progress</span></div>
        <div><b>{totals.untouched}</b><span>not started</span></div>
      </div>
      <div className="po-bar"><i style={{ width: `${totals.pct}%` }} /></div>
      {totals.focus && <button type="button" className="po-focus" onClick={goFocus}><AlertCircle size={15} /><span>Weakest pattern right now: <b>{totals.focus.pattern}</b> ({totals.focus.topic}) — {totals.focus.solved}/{totals.focus.ps.length} solved{totals.focus.weak ? `, ${totals.focus.weak} flagged weak` : ""}</span><ChevronRight size={15} /></button>}
    </div>
    <div className="filters panel patterns-filters">
      <div className="filter-title"><Filter size={15} /> Patterns <button onClick={() => setFilters({ ...defaultPatternFilters })}><RotateCcw size={13} />Reset</button></div>
      <div className="filter-grid pattern-filter-grid">
        <label className="pattern-search"><Search size={14} /><input value={filters.q || ""} onChange={e => set("q", e.target.value)} placeholder="Filter patterns on this page…" title="Narrow the pattern cards below (the header search is app-wide)" /></label>
        <select value={filters.topic} onChange={e => set("topic", e.target.value)}>{topicNames.map(x => <option key={x}>{x}</option>)}</select>
        <select value={filters.progress} onChange={e => set("progress", e.target.value)}>{patternProgressLabels.map(x => <option key={x}>{x}</option>)}</select>
        <select value={filters.sort} onChange={e => set("sort", e.target.value)}><option>Order</option><option>Weakest</option><option>Strongest</option><option>Most problems</option><option>Pattern A-Z</option></select>
        <button className="toggle" onClick={() => (anyExpanded ? collapseAll() : expandAll())}>{anyExpanded ? <List size={14} /> : <LayoutGrid size={14} />}{anyExpanded ? "Collapse all" : "Expand all"}</button>
      </div>
    </div>
    {visible.length ? Object.entries(byTopic).map(([topic, list]) => {
      const all = list.flatMap(c => c.ps);
      const topicSolved = all.filter(isSolved).length;
      return <div className="topic-block" key={topic}>
        <div className="topic-head"><h3>{topic}</h3><span>{topicSolved}/{all.length} problems · {list.filter(c => c.progress === "Complete").length}/{list.length} patterns done</span></div>
        <div className="pattern-grid">
          {list.map(c => {
            const key = `${topic}::${c.pattern}`;
            // A search that lands on one of this pattern's problems opens the card, unless it was
            // toggled deliberately — a manual open/close always wins over the auto-expand.
            const hitByQuery = q !== "" && c.ps.some(p => p.title.toLowerCase().includes(q));
            const isExpanded = key in expanded ? !!expanded[key] : hitByQuery;
            return <article className={`pattern-card pc-${c.progress.toLowerCase().replace(/\s+/g, "-")}${isExpanded ? " expanded" : ""}`} key={c.pattern}>
              <button type="button" className="pc-head" onClick={() => toggleCard(key)} aria-expanded={isExpanded}>
                <span className="collapse-icon">{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                <span className="pattern-icon" aria-hidden="true">◆</span>
                <div className="pc-title"><b>{c.pattern}</b><small>{topic}</small></div>
                <span className="pc-pct">{c.pct}%</span>
              </button>
              <div className="bar"><i style={{ width: `${c.pct}%` }} /></div>
              <div className="pc-meta">
                <span className="pc-count">{c.solved}/{c.ps.length} solved</span>
                {c.mastered > 0 && <span className="pc-chip mastered">{c.mastered} mastered</span>}
                {c.attempted > 0 && <span className="pc-chip attempted">{c.attempted} attempted</span>}
                {c.weak > 0 && <span className="pc-chip weak">{c.weak} weak</span>}
                {["Easy", "Medium", "Hard"].map(d => c.diff[d] > 0 && <span className={`pc-chip diff-${d.toLowerCase()}`} key={d}>{c.diff[d]} {d[0]}</span>)}
              </div>
              {c.next && !isExpanded && <button type="button" className="pc-next" onClick={() => open(c.next)}>Next up · {c.next.title}<ChevronRight size={14} /></button>}
              {isExpanded && <div className="pattern-list">{c.ps.map(p => { const link = solutionLink(tufLinks[p.id]); return <div className="pattern-row" key={p.id}><button onClick={() => open(p)}><span>{p.title}</span><span className={`mini-status ${String(p.status || "Not Started").toLowerCase().replace(/\s+/g, "-")}`}>{p.status || "Not Started"}</span></button>{link && <a className="pattern-ext" href={link.href} target="_blank" rel="noreferrer" title={link.label} onClick={e => e.stopPropagation()}><FileText size={14} /></a>}</div>; })}</div>}
            </article>;
          })}
        </div>
      </div>;
    }) : <Empty text="No patterns match these filters." />}
  </section>;
}

function Analytics({ stats, problems, activity, notes, solutions, builtInSolutions, settings }) {
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
    const sol = (solutions[p.id]?.approaches?.length ? solutions[p.id].approaches : builtInSolutions?.[p.id]?.approaches) || [];
    const available = sol.filter(a => a.explanation?.trim() || codeFilled(a));
    if (available.length) {
      solutionsCount++;
      approachesFilled += available.length;
    }
  });
  const topicRows = Object.entries(topics).map(([k, v]) => ({ name: k, ...v, pct: v.t ? Math.round(v.s / v.t * 100) : 0 })).sort((a, b) => a.pct - b.pct);
  const weakest = topicRows.filter(t => t.t > 0).slice(0, 5);
  const strongest = [...topicRows].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    last14.push({ key, label: d.toLocaleDateString(undefined, { weekday: "short" }), count: activity[key] || 0 });
  }
  const maxAct = Math.max(1, ...last14.map(d => d.count));
  const dueSoon = problems.filter(p => p.nextRevision).length;
  const dueNow = problems.filter(p => p.nextRevision && new Date(p.nextRevision) <= new Date()).length;
  const totalAttempts = problems.reduce((s, p) => s + (p.attempts || 0), 0);
  const activeKeys = Object.keys(activity).filter(k => (activity[k] || 0) > 0).sort();
  const activeDays = activeKeys.length;
  let bestStreak = 0, run = 0, prevDay = null;
  activeKeys.forEach(k => {
    const day = new Date(`${k}T00:00:00`);
    run = prevDay && Math.round((day - prevDay) / 86400000) === 1 ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
    prevDay = day;
  });
  const totalActivity = activeKeys.reduce((s, k) => s + activity[k], 0);
  const avgPerActiveDay = activeDays ? (totalActivity / activeDays).toFixed(1) : "0";
  let last7 = 0, prev7 = 0;
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() - i); const c = activity[localDayKey(d)] || 0; if (i < 7) last7 += c; else prev7 += c; }
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 86400000);
  const in7 = Date.now() + 7 * 86400000;
  let overdue = 0, dueToday = 0, next7 = 0, later = 0;
  problems.forEach(p => { if (!p.nextRevision) return; const t = new Date(p.nextRevision).getTime(); if (t < startOfToday.getTime()) overdue++; else if (t < endOfToday.getTime()) dueToday++; else if (t <= in7) next7++; else later++; });
  const pipelineMax = Math.max(1, overdue, dueToday, next7, later);
  let goalDays = 0;
  for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); if ((activity[localDayKey(d)] || 0) >= (settings?.dailyGoal || 3)) goalDays++; }
  return <section className="analytics-page">
    <div className="stats-large">
      <div><small>Completion</small><strong>{stats.total ? Math.round(stats.solved / stats.total * 100) : 0}%</strong><em>{stats.solved}/{stats.total}</em></div>
      <div><small>Mastered</small><strong>{stats.mastered}</strong><em>Interview ready</em></div>
      <div><small>In progress</small><strong>{stats.attempted}</strong><em>Attempted</em></div>
      <div><small>Streak</small><strong>{stats.streak}</strong><em>Active days</em></div>
    </div>
    <div className="stats-large secondary">
      <div><small>Notes coverage</small><strong>{notesCount}</strong><em>{stats.total ? Math.round(notesCount / stats.total * 100) : 0}% of problems</em></div>
      <div><small>Solution coverage</small><strong>{solutionsCount}</strong><em>{approachesFilled} approaches available</em></div>
      <div><small>Revisions due</small><strong>{dueNow}</strong><em>{dueSoon} scheduled total</em></div>
      <div><small>Total attempts</small><strong>{totalAttempts}</strong><em>Across all problems</em></div>
    </div>
    <div className="stats-large secondary">
      <div><small>Best streak</small><strong>{bestStreak}</strong><em>Longest active run</em></div>
      <div><small>Active days</small><strong>{activeDays}</strong><em>With at least one activity</em></div>
      <div><small>Last 7 days</small><strong>{last7}</strong><em>{prev7} in previous 7</em></div>
      <div><small>Avg / active day</small><strong>{avgPerActiveDay}</strong><em>{totalActivity} activities total</em></div>
    </div>
    <div className="grid2">
      <div className="panel">
        <h3>Revision pipeline</h3>
        {[["Overdue", overdue], ["Due today", dueToday], ["Next 7 days", next7], ["Later", later]].map(([label, v]) => (
          <div className="bar-row" key={label}><div><span>{label}</span><b>{v}</b></div><div className="bar"><i style={{ width: `${v / pipelineMax * 100}%` }} /></div></div>
        ))}
      </div>
      <div className="panel">
        <h3>Daily goal consistency</h3>
        <div className="bar-row"><div><span>Days hit goal in last 30</span><b>{goalDays}/30</b></div><div className="bar"><i style={{ width: `${goalDays / 30 * 100}%` }} /></div></div>
        <p style={{ marginTop: 12 }}>{settings?.dailyGoal || 3} activities per day is your goal — consistency beats volume.</p>
      </div>
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
    <ActivityHeatmap activity={activity} />
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

function ActivityHeatmap({ activity }) {
  const days = useMemo(() => {
    const list = [];
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(start.getDate() - 363); start.setDate(start.getDate() - start.getDay());
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = localDayKey(d);
      list.push({ key, count: activity[key] || 0, day: d.toLocaleDateString() });
    }
    return list;
  }, [activity]);
  const level = n => n === 0 ? "h0" : n <= 2 ? "h1" : n <= 5 ? "h2" : "h3";
  return <div className="panel">
    <h3>Yearly activity</h3>
    <p>One cell per day — darker means more activity. Hover a cell for details.</p>
    <div className="heatmap-scroll"><div className="heatmap">{days.map(d => <i key={d.key} className={level(d.count)} title={`${d.day}: ${d.count} activit${d.count === 1 ? "y" : "ies"}`} />)}</div></div>
    <div className="heat-legend"><span>Less</span><i className="h0" /><i className="h1" /><i className="h2" /><i className="h3" /><span>More</span></div>
  </div>;
}
function CodeBlock({ code, language }) {
  const lines = useMemo(() => highlightCode(code || "", language), [code, language]);
  if (!code || !code.trim()) return <div className="code-view empty">No code yet.</div>;
  return <div className="code-frame">
    <div className="code-frame-head"><i className="dot r" /><i className="dot y" /><i className="dot g" /><span>{language === "csharp" ? "Solution.cs" : "Solution.java"}</span></div>
    <div className="code-body">
      <div className="code-gutter" aria-hidden="true">{lines.map((_, i) => <span key={i}>{i + 1}</span>)}</div>
      <pre className="code-view rich" dangerouslySetInnerHTML={{ __html: lines.join("\n") }} />
    </div>
  </div>;
}
function Problem({ p, update, notes, setNotes, solutions, builtInSolutions, tufUrl, setSolutions, back, backLabel, recordActivity, setToast }) {
  const supplied = solutions?.approaches?.length ? solutions : builtInSolutions;
  const [tab, setTab] = useState("solutions");
  const [localNotes, setLocalNotes] = useState(() => ({ ...emptyNotes(), ...notes }));
  const [editingNotes, setEditingNotes] = useState(() => !Object.values(notes || {}).some(v => String(v || "").trim()));
  const [localSol, setLocalSol] = useState(() => (supplied?.approaches?.length ? supplied.approaches : defaultApproaches()));
  const [editingSol, setEditingSol] = useState(false);
  const [openApproach, setOpenApproach] = useState(0);
  const [language, setLanguage] = useState("java");
  const [copied, setCopied] = useState("");
  const [drafts, setDrafts] = useLocalState("dsa-note-drafts", {});
  const [draftRestored, setDraftRestored] = useState(false);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    const saved = { ...emptyNotes(), ...notes };
    const draft = draftsRef.current?.[p.id];
    const draftFilled = Boolean(draft && NOTE_FIELDS.some(([k]) => String(draft[k] || "").trim()));
    setLocalNotes(draftFilled ? { ...emptyNotes(), ...draft } : saved);
    setEditingNotes(draftFilled ? true : !Object.values(notes || {}).some(v => String(v || "").trim()));
    setDraftRestored(draftFilled);
    setLocalSol(supplied?.approaches?.length ? supplied.approaches : defaultApproaches());
    setEditingSol(false);
    setOpenApproach(0);
    setTab("solutions");
    // Saved solutions are intentionally not a dependency: saving must not reset the tab or accordion.
  }, [p.id, builtInSolutions]);

  const status = p.status || "Not Started";
  const link = solutionLink(tufUrl);
  const leetCode = leetCodeLink(p);
  const video = isHttp(p.videoUrl) ? p.videoUrl : null;
  const filledNotes = NOTE_FIELDS.filter(([k]) => localNotes[k]?.trim()).length;
  const filledApproaches = localSol.filter(a => a.explanation?.trim() || codeFilled(a)).length;
  const codeFor = (a, lang) => { const c = a?.code; if (typeof c === "string") return lang === "java" ? c : ""; if (c && typeof c === "object") return c[lang] || ""; return ""; };

  const dropDraft = () => setDrafts(x => { if (!x[p.id]) return x; const next = { ...x }; delete next[p.id]; return next; });
  const saveNotes = () => {
    setNotes(x => ({ ...x, [p.id]: localNotes }));
    setEditingNotes(false);
    setDraftRestored(false);
    dropDraft();
    setToast("Notes saved.");
  };
  const clearNotes = () => {
    if (!confirm("Clear all learning notes for this problem?")) return;
    const blank = emptyNotes();
    setLocalNotes(blank);
    setNotes(x => { const next = { ...x }; delete next[p.id]; return next; });
    dropDraft();
    setDraftRestored(false);
    setEditingNotes(true);
    setToast("Notes cleared.");
  };
  const cancelNotes = () => {
    setLocalNotes({ ...emptyNotes(), ...notes });
    setEditingNotes(false);
    setDraftRestored(false);
    dropDraft();
  };
  // While editing, drafts autosave to localStorage so navigation never loses work; Save clears the draft.
  useEffect(() => {
    if (!editingNotes) return;
    const saved = { ...emptyNotes(), ...notes };
    const changed = NOTE_FIELDS.some(([k]) => String(localNotes[k] || "") !== String(saved[k] || ""));
    const hasText = NOTE_FIELDS.some(([k]) => String(localNotes[k] || "").trim());
    setDrafts(x => {
      if (!changed || !hasText) { if (!x[p.id]) return x; const next = { ...x }; delete next[p.id]; return next; }
      return { ...x, [p.id]: localNotes };
    });
  }, [localNotes, editingNotes, p.id, notes]);
  useEffect(() => {
    const onKey = (e) => {
      if (!((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "s")) return;
      if (tab !== "notes" || !editingNotes) return;
      e.preventDefault();
      saveNotes();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, editingNotes, localNotes, p.id, notes]);
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
    // Attempts count fresh starts only: leaving "Not Started" (including after a Reset).
    // Re-labelling progress between active statuses must not inflate the counter.
    const startsNewAttempt = status === "Not Started" && nextStatus !== "Not Started";
    update(p.id, {
      status: nextStatus,
      lastRevised: new Date().toISOString(),
      nextRevision: nextStatus === "Not Started" ? null : addDays(revisionSteps[Math.min(p.revisionCount || 0, revisionSteps.length - 1)]),
      revisionCount: p.revisionCount || 0,
      attempts: (p.attempts || 0) + (startsNewAttempt ? 1 : 0),
      favorite: !!p.favorite,
      confidence: nextStatus === "Mastered" ? "🔵 Interview Ready" : (p.confidence || "🟡 Learning")
    });
    recordActivity();
    setToast(`${nextStatus} saved.`);
  };

  return <section className="problem-page">
    <button type="button" className="back" onClick={back}>← Back to {backLabel || "roadmap"}</button>
    <div className="problem-header">
      <div>
        <span className="eyebrow">{p.topic} · {p.pattern}</span>
        <div className="meta">
          <h2>{p.title}</h2>
          <span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
          <span className="meta-icons">
            {hasPersonalSolution(solutions, p.id) && <button type="button" className="meta-ext mine" onClick={() => setTab("solutions")} title="View your saved solutions"><PenLine size={16} /></button>}
            {link && <a className="meta-ext" href={link.href} target="_blank" rel="noreferrer" title="View TakeUForward solution"><FileText size={16} /></a>}
            {leetCode && <a className="meta-ext" href={leetCode.href} target="_blank" rel="noreferrer" title="Open on LeetCode"><Code2 size={16} /></a>}
            {video && <a className="meta-ext" href={video} target="_blank" rel="noreferrer" title="Watch explanation video"><Play size={16} /></a>}
          </span>
          {!link && <span className="no-link">No TakeUForward solution</span>}
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
      <button type="button" className={tab === "solutions" ? "active" : ""} onClick={() => setTab("solutions")}><Code2 size={13} className="tab-icon" /> Java & C# solutions <em>{filledApproaches}/{localSol.length}</em></button>
      <button type="button" className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>Learning notes <em>{filledNotes}/5</em></button>
      <button type="button" className={tab === "meta" ? "active" : ""} onClick={() => setTab("meta")}>Revision & meta</button>
    </div>

    {tab === "notes" && <div className="panel notes-panel visible-block">
      <div className="notes-head">
        <div>
          <h3>Learning notes</h3>
          <p>{editingNotes ? "Edit mode — write freely, then save (⌘S / Ctrl+S)." : "View mode — unlock edit to change notes."}</p>
          {editingNotes && drafts[p.id] && <em className="draft-chip">Draft auto-saved — press Save to store</em>}
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
              <button type="button" className="status-btn ghost" onClick={cancelNotes}>Cancel</button>
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
          return <div className={`approach-card${open ? " open" : ""}`} key={a.id || `approach-${idx}`}>
            <button type="button" className="approach-head" onClick={() => setOpenApproach(open ? -1 : idx)}>
              <span className="collapse-icon">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
              <div className="approach-title">
                {editingSol ? <input value={a.title} onClick={e => e.stopPropagation()} onChange={e => updateApproach(idx, { title: e.target.value })} /> : <strong>{a.title}</strong>}
                <small><b className={`level-chip ${a.level === "Optimal" || a.level === "Optimal+" ? "optimal" : a.level === "Better" ? "better" : a.level === "Brute" ? "brute" : "custom"}`}>{a.level}</b> · Time {a.time || "—"} · Space {a.space || "—"}</small>
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
                <div className="code-label"><span className="with-icon"><Code2 size={13} /> {editingSol ? "Code / pseudocode" : "Implementation"}</span><div className="language-switch" role="group" aria-label="Select solution language"><button type="button" className={[language === "java" && "active", codeFor(a, "java").trim() && "has-code"].filter(Boolean).join(" ")} onClick={() => setLanguage("java")}><i className="code-dot" />Java</button><button type="button" className={[language === "csharp" && "active", codeFor(a, "csharp").trim() && "has-code"].filter(Boolean).join(" ")} onClick={() => setLanguage("csharp")}><i className="code-dot" />C#</button></div>{!editingSol && <button type="button" className="copy-code" onClick={() => { const code = codeFor(a, language) || (typeof a.code === "string" ? a.code : ""); navigator.clipboard?.writeText(code); setCopied(a.id); setTimeout(() => setCopied(""), 1400); }}>{copied === a.id ? <Check size={13} /> : <Copy size={13} />}{copied === a.id ? "Copied" : "Copy"}</button>}</div>
                {editingSol ? <textarea className="code" rows={8} value={codeFor(a, language)} onChange={e => updateApproach(idx, { code: { ...(a.code && typeof a.code === "object" && !Array.isArray(a.code) ? a.code : { java: typeof a.code === "string" ? a.code : "" }), [language]: e.target.value } })} placeholder={`// Write ${language === "csharp" ? "C#" : "Java"} code or pseudocode here`} /> : <CodeBlock code={codeFor(a, language) || (typeof a.code === "string" ? a.code : "")} language={language} />}
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

function SettingsPage({ exportData, importData, resetAll, settings, setSettings, syncStatus, signIn, signOut, hasLocalData }) {
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const connected = ["synced", "syncing", "error"].includes(syncStatus);
  const connect = async e => {
    e.preventDefault();
    setAuthError("");
    if (hasLocalData && !confirm("Connect cloud sync? If the cloud already contains data, this browser's local copy will be replaced by it. Export a backup first if you are unsure.")) return;
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
      {connected ? <div className="setting-row"><div><b>{syncStatus === "syncing" ? "Saving changes…" : syncStatus === "error" ? "Sync needs attention" : "Connected"}</b><span>Your progress, notes, solutions, activity and settings are synced to your private Neon database.</span></div><button onClick={signOut}>Disconnect</button></div> : <form className="setting-row cloud-sync-row" onSubmit={connect}><div><b>Connect this device</b><span>Enter the single app password configured in Vercel to load and sync your tracker data.</span>{authError && <em className="auth-error">{authError}</em>}</div><div className="cloud-login"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="App password" /><button className="primary" type="submit">Connect</button></div></form>}
    </div>
    <div className="panel settings"><h3>Data & Privacy</h3><p>{connected ? "Cloud sync is enabled. Your local browser copy is also retained for offline use." : "Your progress stays in this browser until you connect cloud sync."}</p><div className="setting-row"><div><b>Daily goal</b><span>How many problem activities count toward your daily target.</span></div><input className="goal-input" type="number" min="1" max="50" value={settings.dailyGoal} onChange={e => setSettings({ ...settings, dailyGoal: Math.max(1, Number(e.target.value) || 1) })} /></div><div className="setting-row"><div><b>Export backup</b><span>Download all progress, notes, solutions, activity and settings as JSON.</span></div><button onClick={exportData}><Download size={16} /> Export</button></div><div className="setting-row"><div><b>Import backup</b><span>Restore a previous DSA Tracker backup.</span></div><label className="file-btn"><Upload size={16} /> Import<input type="file" accept=".json" onChange={importData} /></label></div><div className="setting-row danger-row"><div><b>Reset local data</b><span>{connected ? "Clear your synced and local progress, notes, solutions and activity." : "Delete all progress, notes, solutions and activity from this browser."}</span></div><button className="danger" onClick={resetAll}><Trash2 size={16} /> Reset</button></div></div><div className="panel settings"><h3>How the tracker works</h3><div className="help-grid"><div><Timer size={18} /><b>Revision</b><p>Attempted → 1 day, then 3 → 7 → 14 → 30 day spacing.</p></div><div><BookmarkCheck size={18} /><b>Mastery</b><p>Mastered marks the problem interview-ready and keeps it on a longer review cycle.</p></div><div><Download size={18} /><b>Backup</b><p>Export regularly because local browser storage is device/browser specific.</p></div></div></div></section>
}
function Empty({ text }) { return <div className="empty"><Clock3 size={22} /><span>{text}</span></div> }
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("DSA Tracker crashed", error, info); }
  render() { if (!this.state.error) return this.props.children; return <div className="crash"><h2>Something went wrong</h2><p>Your saved progress is still in this browser. Reload to continue.</p><button onClick={() => window.location.reload()}>Reload</button></div>; }
}
createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
