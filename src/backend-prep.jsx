import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookMarked, Check, ChevronDown, ChevronRight, Copy, Database, ExternalLink, Layers, Link2, Loader2, Search, Server, Sparkles } from "lucide-react";
import { highlightCode, escHtml } from "./highlight.js";
import "./backend-prep.css";

/* ---------------------------------- dataset ----------------------------------
   The dataset is generated from the "Backend Interview Preparation" Notion site by
   scripts/fetch-backend-prep.mjs and lands in public/data/backend-prep.json as a
   tree of plain nodes ({ type, text, children, … }). It is ~0.5 MB, so we fetch it
   lazily the first time this page opens rather than on app start.               */

const DATA_URL = "/data/backend-prep.json";
let datasetPromise = null;
const loadDataset = () => {
  if (!datasetPromise) datasetPromise = fetch(DATA_URL).then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
  return datasetPromise;
};

/* ---------------------------------- utilities ---------------------------------- */

const isUrl = (s) => /^https?:\/\/\S+$/.test(String(s || "").trim());
const HIGHLIGHTABLE = { java: "java", "c#": "csharp", csharp: "csharp" };

// Notion stores inline marks as markdown; translate them to safe HTML.
function inline(text) {
  let h = escHtml(String(text || ""));
  h = h.replace(/`([^`]+)`/g, (_, c) => `<code class="bp-mono">${c}</code>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<b>${b}</b>`);
  // Keep the full URL as the label so nothing from the source text is lost.
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) => `${pre}<a class="bp-link" href="${url}" target="_blank" rel="noreferrer">${url}</a>`);
  return h;
}

const Rich = ({ text, tag = "span" }) => tag === "span"
  ? <span dangerouslySetInnerHTML={{ __html: inline(text) }} />
  : React.createElement(tag, { dangerouslySetInnerHTML: { __html: inline(text) } });

// Flattened searchable text, computed once per topic.
function searchText(node, acc) {
  if (!node) return acc;
  if (node.text) acc.push(node.text);
  (node.children || []).forEach(c => searchText(c, acc));
  return acc;
}

function outlineOf(node) {
  const heads = [];
  const walk = (n, depth) => {
    if (!n) return;
    if (n.type === "header" || n.type === "sub_header" || n.type === "sub_sub_header") {
      heads.push({ id: n._id, level: n.type === "header" ? 2 : n.type === "sub_header" ? 3 : 4, text: (n.text || "").replace(/\*\*|`/g, "") });
    }
    (n.children || []).forEach(c => walk(c, depth + 1));
  };
  walk(node, 0);
  return heads;
}

// Give every block a stable id so headings can be linked from the contents rail.
let uidSeq = 0;
function stampIds(node) {
  if (!node || node._id) return node;
  node._id = `bp${++uidSeq}`;
  (node.children || []).forEach(stampIds);
  return node;
}

/* ---------------------------------- blocks ---------------------------------- */

function CodeBlock({ node }) {
  const [copied, setCopied] = useState(false);
  const lang = String(node.lang || "Plain Text").toLowerCase();
  const kind = HIGHLIGHTABLE[lang];
  const lines = useMemo(() => {
    if (kind) return highlightCode(node.text || "", kind);
    return String(node.text || "").split("\n");
  }, [node.text, kind]);
  const copy = () => {
    navigator.clipboard?.writeText(node.text || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  };
  return <div className="bp-code">
    <div className="bp-code-bar"><span>{node.lang || "text"}</span><button type="button" onClick={copy} aria-label="Copy code">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div>
    {/* Reuse the app's code surface + token palette (see .code-view[.rich] in styles.css). */}
    <pre className={`code-view bp-pre ${kind ? "rich" : ""}`}>{lines.map((l, i) => <span className="bp-line" key={i}>{kind ? <span dangerouslySetInnerHTML={{ __html: l }} /> : l}{"\n"}</span>)}</pre>
  </div>;
}

function ListGroup({ items, kind, render }) {
  const Tag = kind === "numbered_list" ? "ol" : "ul";
  return <Tag className={`bp-list bp-${kind}`}>{items.map(render)}</Tag>;
}

function Block({ node }) {
  const kids = node.children || [];
  switch (node.type) {
    case "header": return <h2 id={node._id} className="bp-h bp-h2"><Rich text={node.text} /></h2>;
    case "sub_header": return <h3 id={node._id} className="bp-h bp-h3"><Rich text={node.text} /></h3>;
    case "sub_sub_header": return <h4 id={node._id} className="bp-h bp-h4"><Rich text={node.text} /></h4>;
    case "divider": return null;
    case "code": return <CodeBlock node={node} />;
    case "quote": return <blockquote className="bp-quote"><Rich text={node.text} />{kids.length ? <div className="bp-kids">{kids.map((k, i) => <Block key={i} node={k} />)}</div> : null}</blockquote>;
    case "image": return node.src
      ? <figure className="bp-figure"><img src={node.src} alt={node.text || ""} loading="lazy" />{node.text ? <figcaption>{node.text}</figcaption> : null}</figure>
      : (node.href ? <a className="bp-link" href={node.href} target="_blank" rel="noreferrer"><ExternalLink size={13} />{node.text || "image"}</a> : null);
    case "table": return <div className="bp-table-wrap"><table className="bp-table">{node.header ? <thead><tr>{node.header.map((c, i) => <th key={i}><Rich text={c} /></th>)}</tr></thead> : null}<tbody>{(node.rows || []).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody></table></div>;
    case "toggle": case "callout": return <details className="bp-toggle"><summary><Rich text={node.text} /></summary><div className="bp-kids">{kids.map((k, i) => <Block key={i} node={k} />)}</div></details>;
    case "page": return <SubPage node={node} />;
    case "text": {
      const text = (node.text || "").trim();
      if (!text) return null;
      if (isUrl(text) && !kids.length) return <a className="bp-ref" href={text} target="_blank" rel="noreferrer"><Link2 size={13} /><span>{text}</span><ExternalLink size={12} /></a>;
      // Notion nests lists/code under plain text; keep those as block children.
      const blocky = kids.some(k => k.type !== "bulleted_list" && k.type !== "numbered_list" && k.type !== "text");
      if (blocky) return <div className="bp-block-text"><Rich text={text} tag="p" /><Blocks nodes={kids} /></div>;
      return <p className="bp-p"><Rich text={text} />{kids.length ? <Blocks nodes={kids} /> : null}</p>;
    }
    case "bulleted_list": case "numbered_list": {
      return <li className="bp-li"><Rich text={node.text} />{kids.length ? <Blocks nodes={kids} /> : null}</li>;
    }
    default: return node.text ? <p className="bp-p"><Rich text={node.text} /></p> : null;
  }
}

// Group runs of list items so consecutive bullets/numbers become real <ul>/<ol>.
export function Blocks({ nodes }) {
  const out = [];
  let run = null;
  const flush = () => {
    if (run && run.items.length) out.push(<ListGroup key={out.length} kind={run.kind} items={run.items} render={(item, i) => <Block key={i} node={item} />} />);
    run = null;
  };
  (nodes || []).forEach(node => {
    if (node.type === "bulleted_list" || node.type === "numbered_list") {
      if (!run || run.kind !== node.type) { flush(); run = { kind: node.type, items: [] }; }
      run.items.push(node);
    } else {
      flush();
      out.push(<Block key={out.length} node={node} />);
    }
  });
  flush();
  return <>{out}</>;
}

function SubPage({ node }) {
  const [open, setOpen] = useState(false);
  const count = useMemo(() => searchText(node, []).length, [node]);
  return <section className={`bp-sub ${open ? "open" : ""}`}>
    <button type="button" className="bp-sub-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      <BookMarked size={14} />
      <span><Rich text={node.text} /></span>
      <small>{count} blocks</small>
    </button>
    {open ? <div className="bp-sub-body"><Blocks nodes={node.children || []} /></div> : null}
  </section>;
}

/* ---------------------------------- reader ---------------------------------- */

function Reader({ topic, onBack, onSelect, siblings }) {
  const heads = useMemo(() => outlineOf(topic.tree), [topic]);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const idx = siblings.findIndex(s => s.id === topic.id);
  return <div className="panel bp-reader">
    <div className="bp-reader-bar">
      <button type="button" className="bp-back" onClick={onBack}><ArrowLeft size={15} /><span>All topics</span></button>
      <div className="bp-reader-nav">
        {idx > 0 ? <button type="button" onClick={() => onSelect(siblings[idx - 1].id)}>{siblings[idx - 1].title}</button> : <span />}
        {idx < siblings.length - 1 ? <button type="button" className="next" onClick={() => onSelect(siblings[idx + 1].id)}>{siblings[idx + 1].title}<ChevronRight size={13} /></button> : <span />}
      </div>
    </div>
    <div className="bp-reader-grid">
      <article className="bp-doc">
        <div className="bp-topic-kicker">{topic.cluster}{topic.group !== topic.cluster ? ` · ${topic.group}` : ""}</div>
        <h2 className="bp-topic-title">{topic.title}</h2>
        <Blocks nodes={topic.tree.children || []} />
      </article>
      <aside className="bp-rail">
        <div className="bp-rail-inner">
          <h4>On this page</h4>
          {heads.length ? heads.slice(0, 60).map(h => <button type="button" key={h.id} data-level={h.level} onClick={() => jump(h.id)}>{h.text || "—"}</button>) : <p className="bp-rail-empty">No headings on this page.</p>}
        </div>
      </aside>
    </div>
  </div>;
}

/* ---------------------------------- cards ---------------------------------- */

function TopicCard({ topic, onOpen }) {
  const Icon = topic.nodes > 200 ? Sparkles : topic.subPages ? Layers : Database;
  return <button type="button" className="bp-card" onClick={onOpen}>
    <div className="bp-card-head">
      <span className="bp-card-icon"><Icon size={18} /></span>
      <div><h3>{topic.title}</h3><small>{topic.nodes} blocks · {topic.codeBlocks} code {topic.codeBlocks === 1 ? "sample" : "samples"}{topic.subPages ? ` · ${topic.subPages} sub-pages` : ""}</small></div>
    </div>
    <p>{topic.preview}</p>
    <div className="bp-card-cta">Open notes <ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} /></div>
  </button>;
}

/* ---------------------------------- page ---------------------------------- */

export function BackendPrepPage({ query = "" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    let live = true;
    loadDataset().then(d => {
      if (!live) return;
      // Enrich once: stable heading ids, code counts and a card preview.
      d.topics.forEach(t => {
        stampIds(t.tree);
        const flat = searchText(t.tree, []);
        t.codeBlocks = (function count(n) { return (n.type === "code" ? 1 : 0) + (n.children || []).reduce((a, c) => a + count(c), 0); })(t.tree);
        t.haystack = flat.join(" \u0001 ").toLowerCase();
        t.preview = (flat.find(s => s.length > 60 && !isUrl(s)) || flat.find(Boolean) || "Linked reference material.").replace(/\*\*|`/g, "").slice(0, 165);
      });
      setData(d);
    }).catch(e => live && setError(e.message || String(e)));
    return () => { live = false; };
  }, []);

  const term2 = (term || query).trim().toLowerCase();
  const visible = useMemo(() => {
    if (!data) return [];
    if (!term2) return data.topics;
    return data.topics.filter(t => t.title.toLowerCase().includes(term2) || t.haystack.includes(term2));
  }, [data, term2]);

  const clusters = useMemo(() => {
    if (!data) return [];
    const out = [];
    visible.forEach(t => {
      let c = out.find(x => x.cluster === t.cluster);
      if (!c) { c = { cluster: t.cluster, groups: [] }; out.push(c); }
      let g = c.groups.find(x => x.heading === t.group);
      if (!g) { g = { heading: t.group, items: [] }; c.groups.push(g); }
      g.items.push(t);
    });
    return out;
  }, [data, visible]);

  const allTopics = data?.topics || [];
  const active = allTopics.find(t => t.id === openId);

  if (error) return <div className="panel bp-empty"><Server size={22} /><h3>Backend prep notes unavailable</h3><p>{error}. Run <code className="bp-mono">npm run fetch-backend-prep</code> to regenerate public/data/backend-prep.json.</p></div>;
  if (!data) return <div className="panel bp-loading"><Loader2 size={18} className="bp-spin" /><span>Loading {allTopics.length || "backend"} interview topics…</span></div>;

  if (active) return <Reader topic={active} siblings={allTopics} onBack={() => setOpenId(null)} onSelect={setOpenId} />;

  const stats = { topics: data.topics.length, nodes: data.topics.reduce((n, t) => n + t.nodes, 0), code: data.topics.reduce((n, t) => n + t.codeBlocks, 0) };

  return <div>
    <div className="bp-hero">
      <div className="lld-hero-copy">
        <div className="eyebrow">BACKEND PREP</div>
        <h2>{data.title}</h2>
        <p>{stats.topics} interview topics pulled straight from the source notes — OS and data-structure fundamentals, the .NET and web-security cluster, system design, and the Java sheet — with every code sample and comparison table kept intact.</p>
        <div className="lld-hero-chips">{data.groups.map(g => g.heading).filter((h, i, a) => a.indexOf(h) === i).slice(0, 6).map(c => <span key={c}>{c}</span>)}</div>
      </div>
      <div className="bp-hero-stats">
        <div><b>{stats.topics}</b><small>topics</small></div>
        <div><b>{stats.nodes.toLocaleString()}</b><small>blocks</small></div>
        <div><b>{stats.code}</b><small>code samples</small></div>
      </div>
    </div>

    <div className="bp-search">
      <Search size={15} />
      <input value={term} onChange={e => setTerm(e.target.value)} placeholder={`Search all ${stats.topics} topics and ${stats.nodes.toLocaleString()} blocks…`} aria-label="Search backend prep topics" />
      {term ? <button type="button" onClick={() => setTerm("")}>Clear</button> : null}
    </div>

    {!visible.length ? <div className="panel bp-empty"><Search size={22} /><h3>No topic matches “{term}”</h3><p>Try a concept instead — “isolation”, “cache”, “garbage collection”.</p></div> : null}

    {clusters.map(c => <section className="bp-cluster" key={c.cluster}>
      <header><h3>{c.cluster}</h3><span>{c.groups.reduce((n, g) => n + g.items.length, 0)} topics</span></header>
      {c.groups.map(g => <div className="bp-group" key={g.heading}>
        {g.heading !== c.cluster ? <h4 className="bp-group-title">{g.heading}</h4> : null}
        <div className="bp-grid">{g.items.map(t => <TopicCard key={t.id} topic={t} onOpen={() => setOpenId(t.id)} />)}</div>
      </div>)}
    </section>)}
  </div>;
}
