import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,LayoutDashboard,BookOpen,RefreshCw,Brain,BarChart3,Settings,CheckCircle2,Clock3,Download,Upload,ExternalLink,ChevronRight,Flame,Star,Filter,CalendarDays,Target,RotateCcw,Trash2,Timer,Lightbulb,AlertCircle,BookmarkCheck, X} from "lucide-react";
import "./styles.css";

const SEED="/data/problems.json";
const statuses=["Not Started","Attempted","Solved","Mastered"];
const confidence=["🔴 Weak","🟡 Learning","🟢 Strong","🔵 Interview Ready"];
const revisionSteps=[1,3,7,14,30];

function useLocalState(key,initial){
 const [v,setV]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??initial}catch{return initial}});
 useEffect(()=>localStorage.setItem(key,JSON.stringify(v)),[key,v]);
 return [v,setV];
}
const todayKey=()=>new Date().toISOString().slice(0,10);
const addDays=(days)=>new Date(Date.now()+days*86400000).toISOString();
const daysBetween=(a,b)=>Math.max(0,Math.ceil((new Date(b)-new Date(a))/86400000));
const isHttp=(u)=>typeof u==="string"&&/^https?:\/\//i.test(u);
function practiceLink(p){
 if(isHttp(p.url)){
  const label=/leetcode\.com/i.test(p.url)?"Open on LeetCode":/geeksforgeeks\.org/i.test(p.url)?"Open on GFG":/takeuforward\.org/i.test(p.url)?"Open practice":"Open problem";
  return {href:p.url,label};
 }
 if(isHttp(p.videoUrl)) return {href:p.videoUrl,label:"Watch video"};
 return null;
}

function App(){
 const [problems,setProblems]=useState([]);
 const [progress,setProgress]=useLocalState("dsa-progress",{});
 const [notes,setNotes]=useLocalState("dsa-notes",{});
 const [activity,setActivity]=useLocalState("dsa-activity",{});
 const [settings,setSettings]=useLocalState("dsa-settings",{dailyGoal:3});
 const [page,setPage]=useState("dashboard");
 const [selected,setSelected]=useState(null);
 const [query,setQuery]=useState("");
 const [roadmapFilters,setRoadmapFilters]=useState({topic:"All",status:"All",difficulty:"All",pattern:"All",favorites:false,sort:"Order"});
 const [toast,setToast]=useState("");
 useEffect(()=>fetch(SEED).then(r=>{if(!r.ok)throw new Error("data");return r.json()}).then(setProblems).catch(()=>setToast("Could not load problem data.")),[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2500);return()=>clearTimeout(t)},[toast]);
 const enriched=useMemo(()=>problems.map((p,i)=>({...p,index:i,...(progress[p.id]||{})})),[problems,progress]);
 const stats=useMemo(()=>{
   const solved=enriched.filter(p=>p.status==="Solved"||p.status==="Mastered").length;
   const mastered=enriched.filter(p=>p.status==="Mastered").length;
   const weak=enriched.filter(p=>p.confidence==="🔴 Weak").length;
   const due=enriched.filter(p=>p.nextRevision&&new Date(p.nextRevision)<=new Date()).length;
   const attempted=enriched.filter(p=>p.status==="Attempted").length;
   const today=activity[todayKey()]||0;
   let streak=0; let d=new Date();
   while(activity[d.toISOString().slice(0,10)]>0){streak++;d.setDate(d.getDate()-1)}
   return {solved,mastered,weak,due,total:enriched.length,attempted,today,streak};
 },[enriched,activity]);
 const filtered=useMemo(()=>{
   const f=roadmapFilters;
   let arr=enriched.filter(p=>
    (!query||`${p.title} ${p.topic} ${p.pattern}`.toLowerCase().includes(query.toLowerCase())) &&
    (f.topic==="All"||p.topic===f.topic) && (f.status==="All"||p.status===f.status) &&
    (f.difficulty==="All"||p.difficulty===f.difficulty) && (f.pattern==="All"||p.pattern===f.pattern) &&
    (!f.favorites||p.favorite)
   );
   if(f.sort==="Title")arr.sort((a,b)=>a.title.localeCompare(b.title));
   if(f.sort==="Difficulty")arr.sort((a,b)=>["Easy","Medium","Hard"].indexOf(a.difficulty)-["Easy","Medium","Hard"].indexOf(b.difficulty));
   if(f.sort==="Weakest")arr.sort((a,b)=>Number(a.confidence?.includes("Weak")||false)-Number(b.confidence?.includes("Weak")||false));
   return arr;
 },[enriched,query,roadmapFilters]);
 const update=(id,patch)=>setProgress(x=>({...x,[id]:{...(x[id]||{}),...patch}}));
 const recordActivity=()=>setActivity(x=>({...x,[todayKey()]:((x[todayKey()]||0)+1)}));
 const open=(p)=>{setSelected(p.id);setPage("problem")};
 const selectedProblem=useMemo(()=>enriched.find(p=>p.id===selected)||null,[enriched,selected]);
 const exportData=()=>{const blob=new Blob([JSON.stringify({version:2,progress,notes,activity,settings,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="dsa-tracker-backup.json";a.click();URL.revokeObjectURL(a.href)};
 const importData=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.progress)setProgress(d.progress);if(d.notes)setNotes(d.notes);if(d.activity)setActivity(d.activity);if(d.settings)setSettings(d.settings);setToast("Backup restored.")}catch{setToast("Invalid backup file.")}};r.readAsText(f);e.target.value=""};
 const resetAll=()=>{if(confirm("Reset all progress, notes and activity? This cannot be undone unless you have a backup.")){setProgress({});setNotes({});setActivity({});setToast("All local progress reset.")}};
 const topics=["All",...new Set(problems.map(p=>p.topic))]; const patterns=["All",...new Set(problems.map(p=>p.pattern))];
 return <div className="app">
  <aside><div className="brand"><div className="logo">DS</div><div><b>DSA Tracker</b><small>A2Z Learning System</small></div></div>
   <nav>{[["dashboard","Dashboard",LayoutDashboard],["roadmap","A2Z Roadmap",BookOpen],["revision","Revision",RefreshCw],["patterns","Patterns",Brain],["analytics","Analytics",BarChart3],["settings","Settings",Settings]].map(([id,label,I])=><button className={page===id?"active":""} onClick={()=>setPage(id)} key={id}><I size={18}/><span>{label}</span></button>)}</nav>
   <div className="sidebar-foot"><Flame size={16}/> Local-first • no account</div>
  </aside>
  <main><header><div><h1>{page==="dashboard"?"Dashboard":page==="roadmap"?"A2Z Roadmap":page==="problem"?"Problem":page[0].toUpperCase()+page.slice(1)}</h1><p>Practice, track, revise, master.</p></div><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search problems, topics, patterns…"/></div></header>
   {page==="dashboard"&&<Dashboard stats={stats} problems={enriched} open={open} setPage={setPage} settings={settings}/>} 
   {page==="roadmap"&&<Roadmap problems={enriched} topics={topics} patterns={patterns} open={open} filters={roadmapFilters} setFilters={setRoadmapFilters} filtered={filtered}/>} 
   {page==="revision"&&<Revision problems={enriched} open={open} update={update} recordActivity={recordActivity}/>} 
   {page==="patterns"&&<Patterns problems={enriched} open={open}/>} 
   {page==="analytics"&&<Analytics stats={stats} problems={enriched}/>} 
   {page==="settings"&&<SettingsPage exportData={exportData} importData={importData} resetAll={resetAll} settings={settings} setSettings={setSettings}/>} 
   {page==="problem"&&selectedProblem&&<Problem p={selectedProblem} update={update} notes={notes[selectedProblem.id]||{}} setNotes={setNotes} back={()=>setPage("roadmap")} recordActivity={recordActivity} setToast={setToast}/>} 
  </main>
  {toast&&<div className="toast">{toast}</div>}
 </div>
}

function Dashboard({stats,problems,open,setPage,settings}){
 const pct=stats.total?Math.round(stats.solved/stats.total*100):0;
 const due=problems.filter(p=>p.nextRevision&&new Date(p.nextRevision)<=new Date()).sort((a,b)=>new Date(a.nextRevision)-new Date(b.nextRevision)).slice(0,5);
 const next=problems.filter(p=>p.status==="Not Started").slice(0,5);
 const weak=problems.filter(p=>p.confidence==="🔴 Weak").slice(0,4);
 return <section>
  <div className="hero"><div><span className="eyebrow">YOUR DSA JOURNEY</span><h2>{stats.solved} / {stats.total} problems completed</h2><p>Build consistency, revisit weak patterns, and turn solved problems into interview-ready knowledge.</p><div className="goal"><Target size={15}/> Today: <b>{Math.min(stats.today,settings.dailyGoal)}/{settings.dailyGoal}</b> activity{settings.dailyGoal!==1?"ies":""}</div></div><div className="ring" style={{"--pct":`${pct*3.6}deg`}}><span>{pct}%</span></div></div>
  <div className="cards">{[["🔥","Streak",`${stats.streak} day${stats.streak!==1?"s":""}`,"Consecutive active days"],["🔁","Due today",stats.due,"Revision queue"],["🔴","Weak",stats.weak,"Needs practice"],["⭐","Mastered",stats.mastered,"Interview ready"]].map((x,i)=><div className="card" key={i}><span className="card-icon">{x[0]}</span><div><small>{x[1]}</small><strong>{x[2]}</strong><em>{x[3]}</em></div></div>)}</div>
  <div className="grid2"><DashboardPanel title="Revision due" subtitle="Try from memory before opening notes." action="View all" onClick={()=>setPage("revision")}>{due.length?due.map(p=><ProblemRow key={p.id} p={p} open={open} tag="Due"/>):<Empty text="No revisions due. Nice work!"/>}</DashboardPanel><DashboardPanel title="Continue A2Z" subtitle="Pick up where you left off." action="Open roadmap" onClick={()=>setPage("roadmap")}>{next.map(p=><ProblemRow key={p.id} p={p} open={open}/>)}</DashboardPanel></div>
  <div className="grid2"><DashboardPanel title="Weak problems" subtitle="Prioritize these before learning more." action="Open roadmap" onClick={()=>setPage("roadmap")}>{weak.length?weak.map(p=><ProblemRow key={p.id} p={p} open={open} tag="Weak"/>):<Empty text="No weak problems marked."/>}</DashboardPanel><div className="panel quick"><h3>Study loop</h3><div><span>1</span><p><b>Attempt</b><small>Think before checking anything.</small></p></div><div><span>2</span><p><b>Record</b><small>Save insight, mistake and complexity.</small></p></div><div><span>3</span><p><b>Revise</b><small>Follow the spaced schedule.</small></p></div></div></div>
 </section>
}
function DashboardPanel({title,subtitle,action,onClick,children}){return <div className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="text-btn" onClick={onClick}>{action}<ChevronRight size={15}/></button></div>{children}</div>}
function ProblemRow({p,open,tag}){return <button className="problem-row" onClick={()=>open(p)}><div className={`status-dot ${String(p.status||"Not Started").toLowerCase().replace(/\s+/g,"-")}`}></div><div className="row-main"><b>{p.title}{p.favorite&&<Star size={12} fill="currentColor"/>}</b><span>{p.topic} · {p.pattern}</span></div><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>{tag&&<span className="due">{tag}</span>}<ChevronRight size={17}/></button>}

function Roadmap({problems,topics,patterns,open,filters,setFilters,filtered}){const set=(k,v)=>setFilters(x=>({...x,[k]:v}));return <section><div className="roadmap-summary"><div><b>{filtered.length}</b><span> visible problems</span></div><div className="legend"><span><i className="dot done"/>Solved</span><span><i className="dot todo"/>Not started</span><span><i className="dot weak"/>Weak</span></div></div><div className="filters panel"><div className="filter-title"><Filter size={15}/> Filters <button onClick={()=>setFilters({topic:"All",status:"All",difficulty:"All",pattern:"All",favorites:false,sort:"Order"})}><RotateCcw size={13}/>Reset</button></div><div className="filter-grid"><select value={filters.topic} onChange={e=>set("topic",e.target.value)}>{topics.map(x=><option key={x}>{x}</option>)}</select><select value={filters.status} onChange={e=>set("status",e.target.value)}><option>All</option>{statuses.map(x=><option key={x}>{x}</option>)}</select><select value={filters.difficulty} onChange={e=>set("difficulty",e.target.value)}><option>All</option>{["Easy","Medium","Hard"].map(x=><option key={x}>{x}</option>)}</select><select value={filters.pattern} onChange={e=>set("pattern",e.target.value)}>{patterns.map(x=><option key={x}>{x}</option>)}</select><select value={filters.sort} onChange={e=>set("sort",e.target.value)}><option>Order</option><option>Title</option><option>Difficulty</option><option>Weakest</option></select><button className={filters.favorites?"toggle on":"toggle"} onClick={()=>set("favorites",!filters.favorites)}><Star size={14} fill={filters.favorites?"currentColor":"none"}/> Favorites</button></div></div><div className="problem-list">{filtered.length?filtered.map(p=><ProblemRow key={p.id} p={p} open={open}/>):<Empty text="No problems match these filters."/>}</div></section>}

function Revision({problems,open,update,recordActivity}){const now=Date.now();const due=problems.filter(p=>p.nextRevision&&new Date(p.nextRevision).getTime()<=now).sort((a,b)=>new Date(a.nextRevision)-new Date(b.nextRevision));const upcoming=problems.filter(p=>p.nextRevision&&new Date(p.nextRevision)>now).sort((a,b)=>new Date(a.nextRevision)-new Date(b.nextRevision)).slice(0,10);const complete=(p)=>{const count=p.revisionCount||0;const step=revisionSteps[Math.min(count,revisionSteps.length-1)];update(p.id,{revisionCount:count+1,lastRevised:new Date().toISOString(),nextRevision:addDays(step),status:p.status==="Attempted"?"Solved":p.status});recordActivity()};return <section><div className="callout"><RefreshCw size={22}/><div><b>{due.length} revisions due</b><span>Attempt first. Mark reviewed after you can explain the approach without notes.</span></div></div><div className="revision-columns"><div><h3 className="section-title">Due now</h3><div className="problem-list">{due.length?due.map(p=><RevisionRow key={p.id} p={p} open={open} complete={complete}/>):<Empty text="Nothing is due right now."/>}</div></div><div><h3 className="section-title">Upcoming</h3><div className="panel upcoming">{upcoming.length?upcoming.map(p=><button key={p.id} onClick={()=>open(p)}><div><b>{p.title}</b><span>{new Date(p.nextRevision).toLocaleDateString()} · {daysBetween(new Date(),p.nextRevision)} day{daysBetween(new Date(),p.nextRevision)!==1?"s":""}</span></div><ChevronRight size={15}/></button>):<Empty text="No scheduled revisions yet."/>}</div></div></div></section>}
function RevisionRow({p,open,complete}){return <div className="revision-row"><button className="revision-main" onClick={()=>open(p)}><div className="status-dot"/><div><b>{p.title}</b><span>{p.topic} · Revision #{(p.revisionCount||0)+1}</span></div></button><button className="review-btn" onClick={()=>complete(p)}><CheckCircle2 size={15}/>Reviewed</button></div>}

function Patterns({problems,open}){const map={};problems.forEach(p=>(map[p.pattern]??=[]).push(p));return <section><div className="pattern-grid">{Object.entries(map).map(([pat,ps])=>{const solved=ps.filter(p=>p.status==="Solved"||p.status==="Mastered").length;return <div className="pattern-card" key={pat}><div className="pattern-top"><div><span className="pattern-icon">◆</span><h3>{pat}</h3><p>{solved}/{ps.length} completed</p></div><strong>{ps.length?Math.round(solved/ps.length*100):0}%</strong></div><div className="bar"><i style={{width:`${ps.length?solved/ps.length*100:0}%`}}/></div><div className="pattern-list">{ps.map(p=>{const link=practiceLink(p);return <div className="pattern-row" key={p.id}><button onClick={()=>open(p)}><span>{p.title}</span><span className={`mini-status ${String(p.status||"Not Started").toLowerCase().replace(/\s+/g,"-")}`}>{p.status||"Not Started"}</span></button>{link&&<a className="pattern-ext" href={link.href} target="_blank" rel="noreferrer" title={link.label} onClick={e=>e.stopPropagation()}><ExternalLink size={13}/></a>}</div>})}</div></div>})}</div></section>}

function Analytics({stats,problems}){const topics={};const diffs={Easy:0,Medium:0,Hard:0};problems.forEach(p=>{topics[p.topic]??={t:0,s:0};topics[p.topic].t++;if(p.status==="Solved"||p.status==="Mastered")topics[p.topic].s++;diffs[p.difficulty]++});return <section><div className="stats-large"><div><small>Completion</small><strong>{stats.total?Math.round(stats.solved/stats.total*100):0}%</strong></div><div><small>Completed</small><strong>{stats.solved}</strong></div><div><small>Mastered</small><strong>{stats.mastered}</strong></div><div><small>Attempts</small><strong>{problems.reduce((s,p)=>s+(p.attempts||0),0)}</strong></div></div><div className="grid2"><div className="panel"><h3>Topic progress</h3>{Object.entries(topics).map(([k,v])=><div className="bar-row" key={k}><div><span>{k}</span><b>{v.s}/{v.t}</b></div><div className="bar"><i style={{width:`${v.t?v.s/v.t*100:0}%`}}/></div></div>)}</div><div className="panel"><h3>Difficulty mix</h3>{Object.entries(diffs).map(([k,v])=><div className="bar-row" key={k}><div><span>{k}</span><b>{v}</b></div><div className="bar"><i style={{width:`${problems.length?v/problems.length*100:0}%`}}/></div></div>)}<div className="analytics-note"><Lightbulb size={16}/><span>Use topic completion to spot gaps; use weak confidence and revision history to decide what to revisit.</span></div></div></div></section>}

function Problem({p,update,notes,setNotes,back,recordActivity,setToast}){
 const [local,setLocal]=useState(notes);useEffect(()=>setLocal(notes),[p.id]);
 const status=p.status||"Not Started";
 const link=practiceLink(p);
 const saveNotes=()=>{setNotes(x=>({...x,[p.id]:local}));setToast("Notes saved.")};
 const mark=(nextStatus)=>{
  if(status===nextStatus){setToast(`Already marked ${nextStatus}.`);return;}
  update(p.id,{
   status:nextStatus,
   lastRevised:new Date().toISOString(),
   nextRevision:nextStatus==="Not Started"?null:addDays(revisionSteps[Math.min(p.revisionCount||0,revisionSteps.length-1)]),
   revisionCount:p.revisionCount||0,
   attempts:(p.attempts||0)+(nextStatus!=="Not Started"?1:0),
   favorite:!!p.favorite,
   confidence:nextStatus==="Mastered"?"🔵 Interview Ready":(p.confidence||"🟡 Learning")
  });
  recordActivity();
  setToast(`${nextStatus} saved.`);
 };
 const changeConfidence=e=>update(p.id,{confidence:e.target.value});
 const scheduleRevision=()=>{const count=p.revisionCount||0;const step=revisionSteps[Math.min(count,revisionSteps.length-1)];update(p.id,{nextRevision:addDays(step),lastRevised:new Date().toISOString(),revisionCount:count});setToast(`Next revision in ${step} day${step!==1?"s":""}.`)};
 return <section><button className="back" onClick={back}>← Back to roadmap</button><div className="problem-header"><div><span className="eyebrow">{p.topic} · {p.pattern}</span><h2>{p.title}</h2><div className="meta"><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>{link?<a href={link.href} target="_blank" rel="noreferrer">{link.label} <ExternalLink size={13}/></a>:<span className="no-link">No practice link available</span>}</div></div><div className="actions"><button type="button" className={p.favorite?"fav active":"fav"} onClick={()=>update(p.id,{favorite:!p.favorite})}><Star size={15} fill={p.favorite?"currentColor":"none"}/></button>{statuses.filter(s=>s!=="Not Started").map(s=><button type="button" key={s} className={status===s?"status-btn active":"status-btn"} onClick={()=>mark(s)}>{s==="Solved"&&<CheckCircle2 size={16}/>}{s}</button>)}<button type="button" className="status-btn ghost" onClick={()=>mark("Not Started")}>Reset</button></div></div>
 <div className="detail-grid"><div><div className="panel"><div className="field"><label>Confidence</label><select value={p.confidence||"🟡 Learning"} onChange={changeConfidence}>{confidence.map(c=><option key={c}>{c}</option>)}</select></div><div className="mini-stats"><span>Status<b>{status}</b></span><span>Attempts<b>{p.attempts||0}</b></span><span>Revisions<b>{p.revisionCount||0}</b></span></div><div className="problem-tools"><button type="button" onClick={scheduleRevision}><CalendarDays size={15}/>Schedule next revision</button><span>{p.nextRevision?`Next: ${new Date(p.nextRevision).toLocaleDateString()}`:"No revision scheduled"}</span></div></div><div className="panel"><h3>Learning notes</h3><label>Key insight</label><textarea value={local.insight||""} onChange={e=>setLocal({...local,insight:e.target.value})} placeholder="What is the key idea?"/><label>My mistake</label><textarea value={local.mistake||""} onChange={e=>setLocal({...local,mistake:e.target.value})} placeholder="What did you miss or get wrong?"/><label>Approach</label><textarea value={local.approach||""} onChange={e=>setLocal({...local,approach:e.target.value})} placeholder="Write the approach in your own words."/><label>Complexity</label><textarea className="short" value={local.complexity||""} onChange={e=>setLocal({...local,complexity:e.target.value})} placeholder="Time: O(?)  Space: O(?)"/><label>Interview cue</label><textarea className="short" value={local.interviewCue||""} onChange={e=>setLocal({...local,interviewCue:e.target.value})} placeholder="What should trigger this pattern in an interview?"/><button type="button" className="primary save" onClick={saveNotes}>Save notes</button></div></div><div><div className="panel challenge"><Brain size={22}/><h3>Revision ladder</h3><p>Each review moves the problem farther into the future. Reconstruct the solution before looking at your notes.</p><div className="revision-steps">{revisionSteps.map((d,i)=><span className={(p.revisionCount||0)>i?"done-step":""} key={d}>{d} day{d!==1?"s":""}</span>)}</div></div><div className="panel"><h3>Problem metadata</h3><div className="metadata"><span>Topic<b>{p.topic}</b></span><span>Pattern<b>{p.pattern}</b></span><span>Difficulty<b>{p.difficulty}</b></span><span>Last revised<b>{p.lastRevised?new Date(p.lastRevised).toLocaleDateString():"Never"}</b></span></div></div><div className="panel checklist"><h3>Before marking mastered</h3><p><CheckCircle2 size={14}/>Can explain the pattern?</p><p><CheckCircle2 size={14}/>Can solve without looking?</p><p><CheckCircle2 size={14}/>Know time & space complexity?</p><p><CheckCircle2 size={14}/>Know when to use this pattern?</p></div></div></div></section>}

function SettingsPage({exportData,importData,resetAll,settings,setSettings}){return <section><div className="panel settings"><h3>Data & Privacy</h3><p>Your progress, notes and activity are stored only in this browser. There is no account or server database.</p><div className="setting-row"><div><b>Daily goal</b><span>How many problem activities count toward your daily target.</span></div><input className="goal-input" type="number" min="1" max="50" value={settings.dailyGoal} onChange={e=>setSettings({...settings,dailyGoal:Math.max(1,Number(e.target.value)||1)})}/></div><div className="setting-row"><div><b>Export backup</b><span>Download all progress, notes, activity and settings as JSON.</span></div><button onClick={exportData}><Download size={16}/> Export</button></div><div className="setting-row"><div><b>Import backup</b><span>Restore a previous DSA Tracker backup.</span></div><label className="file-btn"><Upload size={16}/> Import<input type="file" accept=".json" onChange={importData}/></label></div><div className="setting-row danger-row"><div><b>Reset local data</b><span>Delete all progress, notes and activity from this browser.</span></div><button className="danger" onClick={resetAll}><Trash2 size={16}/> Reset</button></div></div><div className="panel settings"><h3>How the tracker works</h3><div className="help-grid"><div><Timer size={18}/><b>Revision</b><p>Attempted → 1 day, then 3 → 7 → 14 → 30 day spacing.</p></div><div><BookmarkCheck size={18}/><b>Mastery</b><p>Mastered marks the problem interview-ready and keeps it on a longer review cycle.</p></div><div><Download size={18}/><b>Backup</b><p>Export regularly because local browser storage is device/browser specific.</p></div></div></div></section>}
function Empty({text}){return <div className="empty"><Clock3 size={22}/><span>{text}</span></div>}
createRoot(document.getElementById("root")).render(<App/>);
