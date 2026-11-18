import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Layers3, Search, Sparkles, X, Sliders } from "lucide-react";
import { HLD_SHEETS, HLD_CATEGORIES, HLD_SOURCES } from "./hld-data.js";

const SIMULATOR_SLUG_MAP = {
  "url-shortener": "URLShortner",
  "real-time-leaderboard": "Leaderboard",
  "rate-limiter": "RateLimiter",
  "pastebin": "Pastebin",
  "unique-id-generator": "UniqueIDGenerator",
  "key-value-store": "KeyValueStore",
  "twitter-feed": "TwitterFeed",
  "chat-system": "ChatSystem",
  "notification-system": "NotificationSystem",
  "instagram": "Instagram",
  "bookmyshow": "BookMyShow",
  "google-news": "NewsAggregator",
  "distributed-job-scheduler": "JobScheduler",
  "job-scheduler": "JobScheduler",
  "delayed-trigger-service": "DelayedTriggerService",
  "digital-wallet": "DigitalWallet",
  "food-delivery": "Zomato",
  "stock-broker": "StockBroker",
  "ride-sharing": "Uber",
  "rider-matching": "Uber",
  "netflix": "Netflix",
  "google-docs": "GoogleDocs",
  "search-autocomplete": "SearchAutocomplete",
  "qa-forum": "QAForum",
  "web-crawler": "WebCrawler",
  "dropbox": "Dropbox",
  "distributed-message-queue": "MessageQueue",
  "kafka": "MessageQueue",
  "metrics-monitoring": "MetricsMonitoring",
  "nearby-service": "NearbyService",
  "payment-system": "PaymentSystem",
  "payments": "PaymentSystem",
  "cart-management": "CartSystem",
  "chatgpt": "ChatGPT",
  "distributed-cache": "DistributedCache",
  "e-commerce": "EcommercePlatform"
};

/* ---------------------------------- sheet viewer ---------------------------------- */

function SheetViewer({ sheet, allSheets, theme, onBack, onSelect, onOpenSimulator }) {
  const iframeRef = useRef(null);
  const src = `${sheet.file}?theme=${theme === "dark" ? "dark" : "light"}`;

  // Find index in current list for prev/next buttons
  const currentIndex = allSheets.findIndex(s => s.id === sheet.id);
  const prevSheet = currentIndex > 0 ? allSheets[currentIndex - 1] : null;
  const nextSheet = currentIndex < allSheets.length - 1 ? allSheets[currentIndex + 1] : null;

  // PostMessage theme sync when theme prop changes dynamically
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "THEME_CHANGE", theme }, "*");
    } catch (e) {
      // ignore cross-origin error
    }
  }, [theme]);

  // Listen for back message from iframe (e.g. clicking catalog link)
  useEffect(() => {
    const handleMsg = (e) => {
      if (e.data && e.data.type === "HLD_BACK") {
        onBack();
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [onBack]);

  const Icon = sheet.icon;

  return (
    <div className="panel hld-viewer">
      <div className="hld-toolbar">
        <div className="hld-toolbar-left">
          <button type="button" className="hld-back" onClick={onBack}>
            <ArrowLeft size={15} />
            <span>All designs</span>
          </button>
          <div className="hld-toolbar-meta">
            <span className={`hld-badge ${sheet.source === "SystemCraft" ? "systemcraft" : "revision"}`}>
              {sheet.source}
            </span>
            <span className="hld-cat-tag">{sheet.category}</span>
            <h3>{sheet.title}</h3>
          </div>
        </div>

        <div className="hld-toolbar-nav">
          <button
            type="button"
            className="hld-nav-btn"
            disabled={!prevSheet}
            onClick={() => prevSheet && onSelect(prevSheet.id)}
            title={prevSheet ? `Previous: ${prevSheet.title}` : "First design"}
            aria-label="Previous design"
          >
            <ChevronLeft size={16} />
          </button>

          <select
            className="hld-jump-select"
            value={sheet.id}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Jump to design"
          >
            {HLD_CATEGORIES.filter(c => c !== "All").map(cat => {
              const catSheets = allSheets.filter(s => s.category === cat);
              if (!catSheets.length) return null;
              return (
                <optgroup key={cat} label={cat}>
                  {catSheets.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.source === "SystemCraft" ? "SC: " : "Rev: "}
                      {s.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <button
            type="button"
            className="hld-nav-btn"
            disabled={!nextSheet}
            onClick={() => nextSheet && onSelect(nextSheet.id)}
            title={nextSheet ? `Next: ${nextSheet.title}` : "Last design"}
            aria-label="Next design"
          >
            <ChevronRight size={16} />
          </button>

          {onOpenSimulator && (
            <button
              type="button"
              className="hld-open"
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                borderColor: "rgba(99, 102, 241, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              onClick={() => {
                const targetSlug = SIMULATOR_SLUG_MAP[sheet.slug] || "sandbox";
                onOpenSimulator(targetSlug);
              }}
              title="Simulate this system design in the Interactive Simulator"
            >
              <Sliders size={14} />
              <span>Simulate</span>
            </button>
          )}

          <a
            className="hld-open"
            href={sheet.file}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${sheet.title} in a new tab`}
          >
            <ExternalLink size={14} />
            <span>New tab</span>
          </a>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        key={src}
        className="hld-frame"
        src={src}
        title={sheet.title}
        loading="lazy"
      />
    </div>
  );
}

/* ---------------------------------- chapter cards ---------------------------------- */

function SheetCard({ sheet, onOpen }) {
  const Icon = sheet.icon;
  return (
    <button type="button" className="hld-card" onClick={onOpen}>
      <div className="hld-card-top">
        <span className={`hld-badge ${sheet.source === "SystemCraft" ? "systemcraft" : "revision"}`}>
          {sheet.source}
        </span>
        <span className="hld-cat-tag">{sheet.category}</span>
      </div>
      <div className="hld-card-head">
        <span className={`hld-card-icon ${sheet.source === "SystemCraft" ? "systemcraft" : ""}`}>
          <Icon size={19} />
        </span>
        <div>
          <h3>{sheet.title}</h3>
          <small>
            {sheet.source === "SystemCraft" ? "Production Blueprint" : "Revision Sheet"} · {sheet.sections.length} sections
          </small>
        </div>
      </div>
      <p>{sheet.tagline}</p>
      <div className="hld-card-chips">
        {sheet.chips.map(c => <span key={c}>{c}</span>)}
      </div>
      <div className="hld-card-cta">
        <span>Read design</span>
        <ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} />
      </div>
    </button>
  );
}

/* ---------------------------------- page ---------------------------------- */

export function HLDPage({ theme = "light", focus = null, onOpenSimulator = null }) {
  const [openId, setOpenId] = useState(focus);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (focus) setOpenId(focus);
  }, [focus]);

  // Counts by source and category
  const sourceCounts = useMemo(() => {
    const counts = { All: HLD_SHEETS.length };
    HLD_SHEETS.forEach(s => {
      const srcKey = s.source === "SystemCraft" ? "SystemCraft Library" : "Revision Sheets";
      counts[srcKey] = (counts[srcKey] || 0) + 1;
    });
    return counts;
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = { All: HLD_SHEETS.length };
    HLD_SHEETS.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtered sheets
  const filteredSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HLD_SHEETS.filter(s => {
      if (source === "SystemCraft Library" && s.source !== "SystemCraft") return false;
      if (source === "Revision Sheets" && s.source !== "Revision Sheet") return false;
      if (category !== "All" && s.category !== category) return false;
      if (q) {
        const text = `${s.title} ${s.fullTitle} ${s.tagline} ${s.chips.join(" ")} ${s.category}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [search, source, category]);

  const active = HLD_SHEETS.find(s => s.id === openId);

  return (
    <div>
      <div className="hld-hero">
        <div className="lld-hero-copy">
          <div className="eyebrow">HLD LAB · ARCHITECTURE & REVISION</div>
          <h2>High-Level Design, production-grade</h2>
          <p>
            45 comprehensive system designs: 39 SystemCraft architectural blueprints with capacity math, data models,
            and scale trade-offs, alongside 6 interactive revision sheets with interview defense playbooks.
          </p>
          <div className="hld-hero-stats">
            <span className="hld-hero-stat">
              <Sparkles size={13} /> 39 SystemCraft Blueprints
            </span>
            <span className="hld-hero-stat">
              <Layers3 size={13} /> 6 Revision Sheets
            </span>
            <span className="hld-hero-stat">
              45 Total Systems
            </span>
            <span className="hld-hero-stat">
              100% Offline
            </span>
          </div>
        </div>
      </div>

      {active ? (
        <SheetViewer
          sheet={active}
          allSheets={filteredSheets.length ? filteredSheets : HLD_SHEETS}
          theme={theme}
          onBack={() => setOpenId(null)}
          onSelect={setOpenId}
          onOpenSimulator={onOpenSimulator}
        />
      ) : (
        <>
          <div className="hld-controls">
            <div className="hld-search-row">
              <div className="hld-search-box">
                <Search size={16} className="hld-search-icon" />
                <input
                  type="text"
                  className="hld-search-input"
                  placeholder="Search 45 high-level designs by title, tech (Kafka, Redis, Paxos), or keyword…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="hld-search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <span className="hld-count-badge">
                Showing {filteredSheets.length} of {HLD_SHEETS.length} designs
              </span>
            </div>

            <div className="hld-filter-row">
              <span className="hld-filter-label">Source:</span>
              <div className="hld-pills">
                {HLD_SOURCES.map(srcName => (
                  <button
                    key={srcName}
                    type="button"
                    className={`hld-pill ${source === srcName ? "active" : ""}`}
                    onClick={() => setSource(srcName)}
                  >
                    <span>{srcName}</span>
                    <span className="hld-pill-count">({sourceCounts[srcName] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="hld-filter-row">
              <span className="hld-filter-label">Category:</span>
              <div className="hld-pills">
                {HLD_CATEGORIES.map(catName => (
                  <button
                    key={catName}
                    type="button"
                    className={`hld-pill ${category === catName ? "active" : ""}`}
                    onClick={() => setCategory(catName)}
                  >
                    <span>{catName}</span>
                    <span className="hld-pill-count">({categoryCounts[catName] || 0})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredSheets.length === 0 ? (
            <div className="hld-empty">
              <h3>No system designs match your filter</h3>
              <p>Try clearing your search term or selecting "All" categories and sources.</p>
              <button
                type="button"
                className="hld-empty-reset"
                onClick={() => {
                  setSearch("");
                  setSource("All");
                  setCategory("All");
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="hld-grid">
              {filteredSheets.map(s => (
                <SheetCard key={s.id} sheet={s} onOpen={() => setOpenId(s.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
