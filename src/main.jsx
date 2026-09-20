import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search,LayoutDashboard,BookOpen,RefreshCw,Brain,BarChart3,Settings,CheckCircle2,Clock3,AlertCircle,Download,Upload,ExternalLink,ChevronRight,Flame} from "lucide-react";
import "./styles.css";

const SEED="/data/problems.json";
const statuses=["Not Started","Attempted","Solved","Mastered"];
const confidence=["🔴 Weak","🟡 Learning","🟢 Strong","🔵 Interview Ready"];

function useLocalState(key,initial){
  const [v,setV]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??initial}catch{return initial}});
  useEffect(()=>localStorage.setItem(key,JSON.stringify(v)),[key,v]);
  return [v,setV];
}
function App(){
 const [problems,setProblems]=useState([]);
 const [progress,setProgress]=useLocalState("dsa-progress",{});
 const [notes,setNotes]=useLocalState("dsa-notes",{});
 const [page,setPage]=useState("dashboard");
 const [selected,setSelected]=useState(null);
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("All");
 useEffect(()=>fetch(SEED).then(r=>r.json()).then(setProblems),[]);
 const enriched=useMemo(()=>problems.map(p=>({...p,...(progress[p.id]||{})})),[problems,progress]);
 const stats=useMemo(()=>{
   const solved=enriched.filter(p=>p.status==="Solved"||p.status==="Mastered").length;
   const mastered=enriched.filter(p=>p.status==="Mastered").length;
   const weak=enriched.filter(p=>p.confidence==="🔴 Weak").length;
   const due=enriched.filter(p=>p.nextRevision && new Date(p.nextRevision)<=new Date()).length;
   return {solved,mastered,weak,due,total:enriched.length};
 },[enriched]);
 const filtered=enriched.filter(p=>(filter==="All"||p.status===filter)&&
   (p.title.toLowerCase().includes(query.toLowerCase())||p.topic.toLowerCase().includes(query.toLowerCase())||p.pattern.toLowerCase().includes(query.toLowerCase())));
 const update=(id,patch)=>setProgress(x=>({...x,[id]:{...(x[id]||{}),...patch}}));
 const open=(p)=>{setSelected(p);setPage("problem")};
 const exportData=()=>{const blob=new Blob([JSON.stringify({progress,notes,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="dsa-tracker-backup.json";a.click()};
 const importData=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.progress)setProgress(d.progress);if(d.notes)setNotes(d.notes)}catch{alert("Invalid backup file")}};r.readAsText(f)};
 return <div className="app">
  <aside><div className="brand"><div className="logo">DS</div><div><b>DSA Tracker</b><small>A2Z Learning System</small></div></div>
   <nav>{[
    ["dashboard","Dashboard",LayoutDashboard],["roadmap","A2Z Roadmap",BookOpen],["revision","Revision",RefreshCw],["patterns","Patterns",Brain],["analytics","Analytics",BarChart3],["settings","Settings",Settings]
   ].map(([id,label,I])=><button className={page===id?"active":""} onClick={()=>setPage(id)} key={id}><I size={18}/>{label}</button>)}</nav>
   <div className="sidebar-foot"><Flame size={16}/> Local-first • no account</div>
  </aside>
  <main><header><div><h1>{page==="dashboard"?"Dashboard":page==="roadmap"?"A2Z Roadmap":page[0].toUpperCase()+page.slice(1)}</h1><p>Practice, track, revise, master.</p></div><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search problems, topics, patterns…"/></div></header>
   {page==="dashboard"&&<Dashboard stats={stats} problems={enriched} open={open} setPage={setPage}/>}
   {page==="roadmap"&&<Roadmap problems={enriched} topics={["All",...new Set(problems.map(p=>p.topic))]} open={open} filter={filter} setFilter={setFilter} filtered={filtered}/>}
   {page==="revision"&&<Revision problems={enriched} open={open}/>}
   {page==="patterns"&&<Patterns problems={enriched} open={open}/>}
   {page==="analytics"&&<Analytics stats={stats} problems={enriched}/>}
   {page==="settings"&&<SettingsPage exportData={exportData} importData={importData}/>}
   {page==="problem"&&selected&&<Problem p={selected} progress={progress[selected.id]||{}} update={update} notes={notes[selected.id]||{}} setNotes={setNotes} back={()=>setPage("roadmap")}/>}
  </main>
 </div>
}
function Dashboard({stats,problems,open,setPage}){
 const pct=stats.total?Math.round(stats.solved/stats.total*100):0;
 const due=problems.filter(p=>p.nextRevision&&new Date(p.nextRevision)<=new Date()).slice(0,5);
 const next=problems.filter(p=>p.status==="Not Started").slice(0,4);
 return <section>
  <div className="hero"><div><span className="eyebrow">YOUR DSA JOURNEY</span><h2>{stats.solved} / {stats.total} problems completed</h2><p>Build consistency, revisit weak patterns, and turn solved problems into interview-ready knowledge.</p></div><div className="ring" style={{"--pct":`${pct*3.6}deg`}}><span>{pct}%</span></div></div>
  <div className="cards">{[
   ["🔥","Streak","Start tracking","Keep your daily momentum"],
   ["🔁","Due today",stats.due,"Revision queue"],
   ["🔴","Weak",stats.weak,"Needs practice"],
   ["⭐","Mastered",stats.mastered,"Interview ready"]
  ].map((x,i)=><div className="card" key={i}><span className="card-icon">{x[0]}</span><div><small>{x[1]}</small><strong>{x[2]}</strong><em>{x[3]}</em></div></div>)}</div>
  <div className="grid2"><div className="panel"><div className="panel-head"><div><h3>Revision due</h3><p>Problems your memory schedule says to revisit.</p></div><button className="text-btn" onClick={()=>setPage("revision")}>View all <ChevronRight size={15}/></button></div>
   {due.length?due.map(p=><ProblemRow key={p.id} p={p} open={open} tag="Due"/>):<Empty text="No revisions due. Nice work!"/>}</div>
   <div className="panel"><div className="panel-head"><div><h3>Continue A2Z</h3><p>Pick up where you left off.</p></div><button className="text-btn" onClick={()=>setPage("roadmap")}>Open roadmap <ChevronRight size={15}/></button></div>
   {next.map(p=><ProblemRow key={p.id} p={p} open={open}/>)}</div>
  </div>
 </section>
}
function ProblemRow({p,open,tag}){return <button className="problem-row" onClick={()=>open(p)}><div className="status-dot"></div><div className="row-main"><b>{p.title}</b><span>{p.topic} · {p.pattern}</span></div><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>{tag&&<span className="due">{tag}</span>}<ChevronRight size={17}/></button>}
function Roadmap({problems,topics,open,filter,setFilter,filtered}){return <section><div className="topic-tabs">{topics.map(t=><button className={filter===t?"sel":""} onClick={()=>setFilter(t)} key={t}>{t}</button>)}</div><div className="toolbar"><div><b>{filtered.length} problems</b><span> • Filtered from your A2Z dataset</span></div><select onChange={e=>setFilter(e.target.value)} value={["All",...statuses].includes(filter)?filter:"All"}><option>All</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="problem-list">{filtered.map(p=><ProblemRow key={p.id} p={p} open={open}/>)}</div></section>}
function Revision({problems,open}){const due=problems.filter(p=>p.nextRevision&&new Date(p.nextRevision)<=new Date());return <section><div className="callout"><RefreshCw size={22}/><div><b>{due.length} revisions due</b><span>Try the problem before opening your notes or solution.</span></div></div><div className="problem-list">{due.length?due.map(p=><ProblemRow key={p.id} p={p} open={open} tag="Review now"/>):<Empty text="Nothing is due right now."/>}</div></section>}
function Patterns({problems,open}){const map={};problems.forEach(p=>(map[p.pattern]??=[]).push(p));return <section><div className="pattern-grid">{Object.entries(map).map(([pat,ps])=><div className="pattern-card" key={pat}><div><span className="pattern-icon">◆</span><h3>{pat}</h3><p>{ps.length} problem{ps.length!==1?"s":""}</p></div>{ps.slice(0,3).map(p=><button key={p.id} onClick={()=>open(p)}>{p.title}<ChevronRight size={14}/></button>)}</div>)}</div></section>}
function Analytics({stats,problems}){const topics={};problems.forEach(p=>(topics[p.topic]??={t:0,s:0}),(x)=>x);problems.forEach(p=>{topics[p.topic].t++;if(p.status==="Solved"||p.status==="Mastered")topics[p.topic].s++});return <section><div className="stats-large"><div><small>Completion</small><strong>{stats.total?Math.round(stats.solved/stats.total*100):0}%</strong></div><div><small>Completed</small><strong>{stats.solved}</strong></div><div><small>Mastered</small><strong>{stats.mastered}</strong></div><div><small>Weak</small><strong>{stats.weak}</strong></div></div><div className="panel"><h3>Topic progress</h3>{Object.entries(topics).map(([k,v])=><div className="bar-row" key={k}><div><span>{k}</span><b>{v.s}/{v.t}</b></div><div className="bar"><i style={{width:`${v.t?v.s/v.t*100:0}%`}}/></div></div>)}</div></section>}
function Problem({p,progress,update,notes,setNotes,back}){const [local,setLocal]=useState(notes);useEffect(()=>setLocal(notes),[p.id]);const saveNotes=()=>setNotes(x=>({...x,[p.id]:local}));const mark=(status)=>{let days=status==="Mastered"?30:status==="Solved"?7:status==="Attempted"?1:0;update(p.id,{status,lastRevised:new Date().toISOString(),nextRevision:days?new Date(Date.now()+days*86400000).toISOString():null,confidence:status==="Mastered"?"🔵 Interview Ready":progress.confidence||"🟡 Learning"});};
return <section><button className="back" onClick={back}>← Back to roadmap</button><div className="problem-header"><div><span className="eyebrow">{p.topic} · {p.pattern}</span><h2>{p.title}</h2><div className="meta"><span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span><a href={p.url} target="_blank">Open problem <ExternalLink size={13}/></a></div></div><div className="actions"><button onClick={()=>mark("Attempted")}>Attempted</button><button className="primary" onClick={()=>mark("Solved")}><CheckCircle2 size={16}/>Solved</button><button onClick={()=>mark("Mastered")}>Mastered</button></div></div>
 <div className="detail-grid"><div><div className="panel"><h3>Your progress</h3><div className="field"><label>Confidence</label><select value={progress.confidence||"🟡 Learning"} onChange={e=>update(p.id,{confidence:e.target.value})}>{confidence.map(x=><option key={x}>{x}</option>)}</select></div><div className="mini-stats"><span>Attempts <b>{progress.attempts||0}</b></span><span>Status <b>{progress.status||"Not Started"}</b></span><span>Next revision <b>{progress.nextRevision?new Date(progress.nextRevision).toLocaleDateString():"—"}</b></span></div></div>
 <div className="panel"><h3>Learning notes</h3><label>Key insight</label><textarea value={local.insight||""} onChange={e=>setLocal({...local,insight:e.target.value})} placeholder="What is the key idea?"/><label>My mistake</label><textarea value={local.mistake||""} onChange={e=>setLocal({...local,mistake:e.target.value})} placeholder="What did you miss or get wrong?"/><label>Approach</label><textarea value={local.approach||""} onChange={e=>setLocal({...local,approach:e.target.value})} placeholder="Write the approach in your own words."/><button className="primary save" onClick={saveNotes}>Save notes</button></div></div>
 <div><div className="panel challenge"><Brain size={22}/><h3>Revision rule</h3><p>Don't open your notes first. Try to reconstruct the pattern, key observation, and complexity from memory.</p><div className="revision-steps"><span>1 day</span><span>3 days</span><span>7 days</span><span>14 days</span><span>30 days</span></div></div><div className="panel"><h3>Problem metadata</h3><div className="metadata"><span>Topic<b>{p.topic}</b></span><span>Pattern<b>{p.pattern}</b></span><span>Difficulty<b>{p.difficulty}</b></span></div></div></div></div>
 </section>}
function SettingsPage({exportData,importData}){return <section><div className="panel settings"><h3>Data & Privacy</h3><p>Your progress is stored only in this browser using local storage. There is no account or server database.</p><div className="setting-row"><div><b>Export backup</b><span>Download all progress and notes as JSON.</span></div><button onClick={exportData}><Download size={16}/> Export</button></div><div className="setting-row"><div><b>Import backup</b><span>Restore a previous DSA Tracker backup.</span></div><label className="file-btn"><Upload size={16}/> Import<input type="file" accept=".json" onChange={importData}/></label></div></div></section>}
function Empty({text}){return <div className="empty"><Clock3 size={22}/><span>{text}</span></div>}
createRoot(document.getElementById("root")).render(<App/>);
