import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LIBRARY,
  CHALLENGES,
  ICONS,
  SANDBOX_SCALE,
  getChallenge,
  R, RSIM, RLAT, RDUR
} from "./simulator-catalog.js";
import {
  simulate,
  evaluate,
  buildReference,
  autoLayout,
  sizeDesign,
  makeRun,
  PATTERNS,
  CHAOS,
  DIMENSIONS,
  verdictFor,
  fmtNum,
  fmtMoney,
  pct,
  encodeShare,
  decodeShare,
  NODE_W,
  NODE_H,
  findComp
} from "./simulator-engine.js";
import {
  ArrowLeft, Play, Square, CheckCircle, RotateCcw, Undo2, Redo2,
  LayoutGrid, Maximize2, Share2, Download, Upload, HelpCircle,
  Plus, Trash2, Zap, AlertTriangle, ShieldAlert, Sparkles, X,
  Search, Sliders, Activity, Server, Database, Layers, Cpu, Flame
} from "lucide-react";
import "./simulator.css";

const GRID = 8;
const SNAP = (v) => Math.round(v / GRID) * GRID;

function edgeGeom(a, b) {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  let dx = Math.max(56, Math.abs(x2 - x1) * 0.5);
  if (x2 < x1 + 20) dx = Math.max(dx, 110);
  return [x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2];
}

function bezPath(g) {
  return `M${g[0]} ${g[1]} C${g[2]} ${g[3]}, ${g[4]} ${g[5]}, ${g[6]} ${g[7]}`;
}

function bezAt(g, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * g[0] + b * g[2] + c * g[4] + d * g[6],
    y: a * g[1] + b * g[3] + c * g[5] + d * g[7]
  };
}

export function SystemSimulatorPage({ initialSlug = "sandbox", onBackToLab }) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [viewMode, setViewMode] = useState("builder"); // "picker" | "builder"
  const [challenge, setChallenge] = useState(() => getChallenge(initialSlug) || getChallenge("sandbox"));

  // Design state
  const [design, setDesign] = useState(() => {
    const ch = getChallenge(initialSlug) || getChallenge("sandbox");
    if (ch.ref) {
      return buildReference(ch);
    }
    return {
      nodes: [
        { id: 1, type: "client", label: "Client", x: 80, y: 160, instances: 1 },
        { id: 2, type: "load-balancer", label: "Load Balancer", x: 340, y: 160, instances: 1 },
        { id: 3, type: "app-server", label: "App Server", x: 600, y: 160, instances: 2 },
        { id: 4, type: "redis", label: "Redis", x: 860, y: 100, instances: 1 },
        { id: 5, type: "postgresql", label: "PostgreSQL", x: 860, y: 240, instances: 1 }
      ],
      edges: [
        { from: 1, to: 2, kind: "all" },
        { from: 2, to: 3, kind: "all" },
        { from: 3, to: 4, kind: "all" },
        { from: 3, to: 5, kind: "all" },
        { from: 4, to: 5, kind: "read" }
      ],
      nextId: 6
    };
  });

  // History for Undo/Redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Sandbox scale sliders
  const [scale, setScale] = useState(() => ({
    ...(challenge.scale || SANDBOX_SCALE)
  }));

  // Canvas viewport
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Selection & Wiring
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [tempEdgeEnd, setTempEdgeEnd] = useState(null);

  // Dragging node
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Simulation controls
  const [pattern, setPattern] = useState("steady");
  const [chaosKind, setChaosKind] = useState("none");
  const [mult, setMult] = useState(1);
  const [nodeChaos, setNodeChaos] = useState({});
  const [nodeSlow, setNodeSlow] = useState({});

  // Real-time run state
  const [simRun, setSimRun] = useState(null);
  const [runTickIdx, setRunTickIdx] = useState(0);
  const [dockOpen, setDockOpen] = useState(false);

  // Modals
  const [reportModal, setReportModal] = useState(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Component Library search
  const [libSearch, setLibSearch] = useState("");

  const stageRef = useRef(null);
  const animRef = useRef(null);
  const dotsHostRef = useRef(null);

  // Sync challenge change
  const selectChallenge = (slug) => {
    setActiveSlug(slug);
    const ch = getChallenge(slug) || getChallenge("sandbox");
    setChallenge(ch);
    setScale({ ...(ch.scale || SANDBOX_SCALE) });
    setHistory([]);
    setFuture([]);
    setSelectedNodeIds([]);
    setSelectedEdge(null);
    setNodeChaos({});
    setNodeSlow({});
    setDockOpen(false);

    if (ch.ref) {
      setDesign(buildReference(ch));
    } else {
      setDesign({
        nodes: [
          { id: 1, type: "client", label: "Client", x: 80, y: 160, instances: 1 },
          { id: 2, type: "load-balancer", label: "Load Balancer", x: 340, y: 160, instances: 1 },
          { id: 3, type: "app-server", label: "App Server", x: 600, y: 160, instances: 2 },
          { id: 4, type: "redis", label: "Redis", x: 860, y: 100, instances: 1 },
          { id: 5, type: "postgresql", label: "PostgreSQL", x: 860, y: 240, instances: 1 }
        ],
        edges: [
          { from: 1, to: 2, kind: "all" },
          { from: 2, to: 3, kind: "all" },
          { from: 3, to: 4, kind: "all" },
          { from: 3, to: 5, kind: "all" },
          { from: 4, to: 5, kind: "read" }
        ],
        nextId: 6
      });
    }
    setViewMode("builder");
  };

  // Push history checkpoint
  const pushHistory = useCallback((currentDesign) => {
    setHistory((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentDesign))]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture((f) => [JSON.parse(JSON.stringify(design)), ...f]);
    setDesign(prev);
    setHistory((h) => h.slice(0, -1));
  }, [history, design]);

  const handleRedo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h, JSON.parse(JSON.stringify(design))]);
    setDesign(next);
    setFuture((f) => f.slice(1));
  }, [future, design]);

  // Compute live steady-state simulation
  const simResult = useMemo(() => {
    return simulate(design, scale, {
      mult: mult,
      chaos: nodeChaos,
      slow: nodeSlow,
      statefree: challenge.statefree
    });
  }, [design, scale, mult, nodeChaos, nodeSlow, challenge.statefree]);

  // Handle Animated Dots
  useEffect(() => {
    if (!dotsHostRef.current || !simResult || viewMode !== "builder") return;
    const host = dotsHostRef.current;
    host.innerHTML = "";

    const nodeMap = {};
    design.nodes.forEach((n) => { nodeMap[n.id] = n; });

    const dots = [];
    design.edges.forEach((e) => {
      const a = nodeMap[e.from];
      const b = nodeMap[e.to];
      if (!a || !b) return;

      const flow = simResult.flow[`${e.from}>${e.to}`];
      const vol = flow ? flow.read + flow.write : 0;
      if (vol <= 0) return;

      const geom = edgeGeom(a, b);
      const count = Math.max(1, Math.min(5, Math.round(Math.log10(vol) - 1.5)));
      const bStat = simResult.nodes[e.to];
      const tone = (bStat && (bStat.status === "over" || bStat.status === "down"))
        ? "is-over"
        : (bStat && bStat.status === "hot")
        ? "is-hot"
        : "is-ok";

      for (let i = 0; i < count; i++) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("r", "3.5");
        circle.setAttribute("class", `sim-dot ${tone}`);
        host.appendChild(circle);

        dots.push({
          circle,
          geom,
          t: (i / count),
          speed: (tone === "is-over" ? 0.35 : 0.22)
        });
      }
    });

    let lastTs = performance.now();
    let frameId;

    const tick = (ts) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      dots.forEach((d) => {
        d.t = (d.t + dt * d.speed) % 1;
        const pt = bezAt(d.geom, d.t);
        d.circle.setAttribute("cx", pt.x.toFixed(1));
        d.circle.setAttribute("cy", pt.y.toFixed(1));
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [design, simResult, viewMode]);

  // Timed Simulation Run loop
  useEffect(() => {
    if (!simRun) return;
    const interval = setInterval(() => {
      setRunTickIdx((idx) => {
        if (idx + 1 >= simRun.dur) {
          clearInterval(interval);
          return idx;
        }
        return idx + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [simRun]);

  // Start Simulation Run
  const handleStartRun = () => {
    const runData = makeRun(design, scale, {
      pattern: pattern,
      chaos: chaosKind,
      mult: mult
    });
    setSimRun(runData);
    setRunTickIdx(0);
    setDockOpen(true);
  };

  // Run Evaluation
  const handleEvaluate = () => {
    const ev = evaluate(challenge, design, { samples: 5000 });
    setReportModal(ev);
  };

  // Auto Layout
  const handleTidyLayout = () => {
    pushHistory(design);
    const newPositions = autoLayout(design);
    setDesign((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => ({
        ...n,
        ...(newPositions[n.id] || { x: n.x, y: n.y })
      }))
    }));
  };

  // Fit to screen
  const handleFitScreen = () => {
    if (!design.nodes.length) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const minX = Math.min(...design.nodes.map((n) => n.x));
    const maxX = Math.max(...design.nodes.map((n) => n.x + NODE_W));
    const minY = Math.min(...design.nodes.map((n) => n.y));
    const maxY = Math.max(...design.nodes.map((n) => n.y + NODE_H));

    const w = maxX - minX + 160;
    const h = maxY - minY + 160;
    const stage = stageRef.current;
    if (!stage) return;

    const sw = stage.clientWidth || 800;
    const sh = stage.clientHeight || 600;
    const z = Math.min(1.2, Math.max(0.5, Math.min(sw / w, sh / h)));

    setZoom(z);
    setPan({
      x: (sw - (maxX + minX) * z) / 2,
      y: (sh - (maxY + minY) * z) / 2
    });
  };

  // Add Component via click
  const handleAddComponent = (typeId) => {
    pushHistory(design);
    const comp = findComp(typeId) || { label: typeId, maxRPS: 10000 };
    const newId = design.nextId;

    let posX = 300;
    let posY = 200;

    // If a node is selected, place beside/after it and auto-wire
    let autoWireFrom = null;
    if (selectedNodeIds.length === 1) {
      const parent = design.nodes.find((n) => n.id === selectedNodeIds[0]);
      if (parent) {
        posX = parent.x + 240;
        posY = parent.y;
        autoWireFrom = parent.id;
      }
    }

    const newNode = {
      id: newId,
      type: typeId,
      label: comp.label,
      x: SNAP(posX),
      y: SNAP(posY),
      instances: comp.maxRPS === Infinity ? 1 : 1
    };

    const newEdges = [...design.edges];
    if (autoWireFrom) {
      newEdges.push({ from: autoWireFrom, to: newId, kind: "all" });
    }

    setDesign((prev) => ({
      nodes: [...prev.nodes, newNode],
      edges: newEdges,
      nextId: newId + 1
    }));
    setSelectedNodeIds([newId]);
    setSelectedEdge(null);
  };

  // Canvas Mouse Interactions
  const handleStageMouseDown = (e) => {
    if (e.target.closest(".sim-node") || e.target.closest(".sim-node-port")) return;
    if (e.target.closest(".sim-edge-path")) return;

    // Background drag / pan
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedNodeIds([]);
    setSelectedEdge(null);
  };

  const handleStageMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (draggingNodeId) {
      const stage = stageRef.current;
      const rect = stage.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;

      setDesign((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: SNAP(rawX - dragOffset.x), y: SNAP(rawY - dragOffset.y) }
            : n
        )
      }));
    }

    if (connectingFrom) {
      const stage = stageRef.current;
      const rect = stage.getBoundingClientRect();
      setTempEdgeEnd({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handleStageMouseUp = () => {
    setIsPanning(false);
    if (draggingNodeId) setDraggingNodeId(null);
    if (connectingFrom) {
      setConnectingFrom(null);
      setTempEdgeEnd(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.0, Math.max(0.4, zoom * factor));
    setZoom(newZoom);
  };

  // Node Drag Start
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    pushHistory(design);
    setSelectedNodeIds([nodeId]);
    setSelectedEdge(null);

    const node = design.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const stage = stageRef.current;
    const rect = stage.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y
    });
  };

  // Edge Port Drag Start
  const handlePortMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
    const node = design.nodes.find((n) => n.id === nodeId);
    setTempEdgeEnd({ x: node.x + NODE_W, y: node.y + NODE_H / 2 });
  };

  // Node Port Drop / Wire Connection
  const handleNodeMouseUp = (e, targetNodeId) => {
    if (connectingFrom && connectingFrom !== targetNodeId) {
      e.stopPropagation();
      pushHistory(design);
      // Avoid duplicate edges
      if (!design.edges.some((edge) => edge.from === connectingFrom && edge.to === targetNodeId)) {
        setDesign((prev) => ({
          ...prev,
          edges: [...prev.edges, { from: connectingFrom, to: targetNodeId, kind: "all" }]
        }));
      }
      setConnectingFrom(null);
      setTempEdgeEnd(null);
    }
  };

  // Delete Selection
  const handleDeleteSelected = () => {
    if (!selectedNodeIds.length && !selectedEdge) return;
    pushHistory(design);
    if (selectedEdge) {
      setDesign((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => !(e.from === selectedEdge.from && e.to === selectedEdge.to))
      }));
      setSelectedEdge(null);
    } else if (selectedNodeIds.length) {
      setDesign((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => !selectedNodeIds.includes(n.id)),
        edges: prev.edges.filter((e) => !selectedNodeIds.includes(e.from) && !selectedNodeIds.includes(e.to))
      }));
      setSelectedNodeIds([]);
    }
  };

  // Share Link
  const handleShare = () => {
    const encoded = encodeShare(design);
    const url = `${window.location.origin}${window.location.pathname}#simulator?c=${activeSlug}&share=${encoded}`;
    navigator.clipboard.writeText(url);
    alert("Simulator share link copied to clipboard!");
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(design, null, 2));
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${activeSlug}-architecture.json`);
    dl.click();
  };

  // Keyboard events
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key.toLowerCase() === "l") {
        handleTidyLayout();
      } else if (e.key.toLowerCase() === "f") {
        handleFitScreen();
      } else if (e.key.toLowerCase() === "r") {
        handleStartRun();
      } else if (e.key.toLowerCase() === "e") {
        handleEvaluate();
      } else if (e.key === "?") {
        setHelpModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [design, selectedNodeIds, selectedEdge, history, future]);

  // Selected Node Data
  const selectedNode = selectedNodeIds.length === 1
    ? design.nodes.find((n) => n.id === selectedNodeIds[0])
    : null;
  const selectedNodeStat = selectedNode && simResult.nodes[selectedNode.id];

  // ─────────────────────────── RENDER PICKER VIEW ───────────────────────────
  if (viewMode === "picker") {
    const slugs = Object.keys(CHALLENGES);
    const byDiff = { Beginner: [], Intermediate: [], Advanced: [] };
    slugs.forEach((s) => {
      const c = CHALLENGES[s];
      (byDiff[c.difficulty] || byDiff.Intermediate).push(s);
    });

    return (
      <div className="sim-app">
        <header className="sim-toolbar">
          <div className="sim-tb-left">
            {onBackToLab && (
              <button className="sim-back-btn" onClick={onBackToLab}>
                <ArrowLeft size={16} />
                <span>Back to Labs</span>
              </button>
            )}
            <h1 className="sim-ch-title">System Design Simulator</h1>
          </div>
          <div className="sim-tb-right">
            <button
              className="sim-action-btn sim-eval-btn"
              onClick={() => selectChallenge("sandbox")}
            >
              <Sliders size={16} />
              <span>Open Free Sandbox</span>
            </button>
          </div>
        </header>

        <div className="sim-picker">
          <div className="sim-picker-hero">
            <span className="sim-picker-eyebrow">Build it · Break it · Get Scored</span>
            <h2 className="sim-picker-title">System Architecture Stress-Test Simulator</h2>
            <p className="sim-picker-subtitle">
              Wire up real distributed architectures, push traffic up to millions of requests per second,
              inject chaos, and watch bottlenecks ignite. Scored against FAANG rubric standards.
            </p>
            <div className="sim-picker-actions">
              <button
                className="sim-action-btn sim-eval-btn"
                style={{ padding: "10px 24px", fontSize: "1rem" }}
                onClick={() => selectChallenge("sandbox")}
              >
                <Sliders size={18} />
                <span>Launch Interactive Sandbox</span>
              </button>
            </div>
          </div>

          {["Beginner", "Intermediate", "Advanced"].map((diff) => (
            <div key={diff} style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <span className="sim-diff-badge" data-diff={diff}>{diff}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--sim-text-dim)" }}>
                  {byDiff[diff].length} Challenges
                </span>
              </div>
              <div className="sim-grid">
                {byDiff[diff].map((slug) => {
                  const ch = CHALLENGES[slug];
                  return (
                    <div
                      key={slug}
                      className="sim-card"
                      onClick={() => selectChallenge(slug)}
                    >
                      <div className="sim-card-top">
                        <span className="sim-card-title">{ch.title}</span>
                        <span className="sim-diff-badge" data-diff={ch.difficulty}>{ch.difficulty}</span>
                      </div>
                      <p className="sim-card-prompt">{ch.prompt}</p>
                      <div className="sim-card-scale">
                        Target: {fmtNum(ch.scale.rps)} req/s · {ch.scale.readPct}% reads · P99 &lt; {ch.scale.p99Budget}ms
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────── RENDER BUILDER VIEW ───────────────────────────
  return (
    <div className="sim-app">
      {/* Top Action Toolbar */}
      <header className="sim-toolbar">
        <div className="sim-tb-left">
          <button
            className="sim-back-btn"
            onClick={() => setViewMode("picker")}
            title="All Challenges"
          >
            <ArrowLeft size={16} />
            <span>Challenges</span>
          </button>
          <div className="sim-ch-info">
            <h1 className="sim-ch-title">{challenge.title}</h1>
            <span className="sim-diff-badge" data-diff={challenge.difficulty}>
              {challenge.difficulty}
            </span>
          </div>
        </div>

        <div className="sim-tb-right">
          <div className="sim-btn-group">
            <button
              className="sim-tbtn"
              onClick={handleUndo}
              disabled={!history.length}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="sim-tbtn"
              onClick={handleRedo}
              disabled={!future.length}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="sim-btn-group">
            <button
              className="sim-tbtn"
              onClick={handleTidyLayout}
              title="Tidy Layout (L)"
            >
              <LayoutGrid size={16} />
              <span>Tidy</span>
            </button>
            <button
              className="sim-tbtn"
              onClick={handleFitScreen}
              title="Fit to Screen (F)"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div className="sim-btn-group">
            <button
              className="sim-tbtn"
              onClick={() => {
                if (challenge.ref) {
                  pushHistory(design);
                  setDesign(buildReference(challenge));
                }
              }}
              title="Load Reference / Starter"
            >
              <Sparkles size={16} />
              <span>{challenge.sandbox ? "Starter" : "Reference"}</span>
            </button>
            <button
              className="sim-tbtn"
              onClick={handleShare}
              title="Share Design Link"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button
              className="sim-tbtn"
              onClick={handleExportJson}
              title="Export JSON"
            >
              <Download size={16} />
            </button>
            <button
              className="sim-tbtn"
              onClick={() => setHelpModalOpen(true)}
              title="Help & Theory (?)"
            >
              <HelpCircle size={16} />
            </button>
          </div>

          <button
            className="sim-action-btn sim-run-btn"
            onClick={handleStartRun}
            title="Run simulation (R)"
          >
            <Play size={16} />
            <span>Run Test</span>
          </button>

          <button
            className="sim-action-btn sim-eval-btn"
            onClick={handleEvaluate}
            title="Evaluate score (E)"
          >
            <CheckCircle size={16} />
            <span>Evaluate</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="sim-workspace">
        {/* Component Library Sidebar */}
        <aside className="sim-lib-panel">
          <div className="sim-lib-search">
            <Search size={15} color="var(--sim-text-dim)" />
            <input
              type="text"
              placeholder="Search components..."
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
            />
          </div>
          <div className="sim-lib-list">
            {Object.keys(LIBRARY).map((catName) => {
              const items = LIBRARY[catName].filter((c) =>
                !libSearch ||
                c.label.toLowerCase().includes(libSearch.toLowerCase()) ||
                c.blurb.toLowerCase().includes(libSearch.toLowerCase())
              );
              if (!items.length) return null;

              return (
                <div key={catName}>
                  <div className="sim-lib-cat">{catName}</div>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      className="sim-lib-item"
                      onClick={() => handleAddComponent(c.id)}
                      title={`${c.label}: ${c.blurb}`}
                    >
                      <div
                        className="sim-lib-icon"
                        style={{ color: `var(--cat-${c.cat})` }}
                        dangerouslySetInnerHTML={{
                          __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${ICONS[c.cat] || ICONS.compute}</svg>`
                        }}
                      />
                      <div className="sim-lib-info">
                        <span className="sim-lib-name">{c.label}</span>
                        <span className="sim-lib-spec">
                          {c.maxRPS === Infinity
                            ? "Traffic source"
                            : `${fmtNum(c.maxRPS)}/s · ${c.latency}ms · $${c.cost}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Canvas Stage */}
        <main
          ref={stageRef}
          className={`sim-stage ${isPanning ? "panning" : ""}`}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="sim-world"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* SVG Connections & Particle Dots Layer */}
            <svg
              className="sim-svg-layer"
              width="8000"
              height="8000"
              style={{ left: "-4000px", top: "-4000px" }}
            >
              <g transform="translate(4000, 4000)">
                {/* Edges */}
                {design.edges.map((e, idx) => {
                  const fromNode = design.nodes.find((n) => n.id === e.from);
                  const toNode = design.nodes.find((n) => n.id === e.to);
                  if (!fromNode || !toNode) return null;

                  const geom = edgeGeom(fromNode, toNode);
                  const d = bezPath(geom);
                  const isSel = selectedEdge && selectedEdge.from === e.from && selectedEdge.to === e.to;
                  const isDashed = findComp(fromNode.type)?.cat === "queue" || findComp(toNode.type)?.cat === "queue";

                  const toStat = simResult.nodes[e.to];
                  const toneClass = (toStat && (toStat.status === "over" || toStat.status === "down"))
                    ? "is-over"
                    : (toStat && toStat.status === "hot")
                    ? "is-hot"
                    : (toStat && toStat.load > 0)
                    ? "is-ok"
                    : "";

                  return (
                    <path
                      key={idx}
                      d={d}
                      className={`sim-edge-path ${isSel ? "selected" : ""} ${toneClass} ${isDashed ? "is-dashed" : ""}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedEdge(e);
                        setSelectedNodeIds([]);
                      }}
                    />
                  );
                })}

                {/* Connecting Line Preview */}
                {connectingFrom && tempEdgeEnd && (() => {
                  const fromNode = design.nodes.find((n) => n.id === connectingFrom);
                  if (!fromNode) return null;
                  const startX = fromNode.x + NODE_W;
                  const startY = fromNode.y + NODE_H / 2;
                  const dx = Math.max(40, Math.abs(tempEdgeEnd.x - startX) * 0.5);
                  const d = `M${startX} ${startY} C${startX + dx} ${startY}, ${tempEdgeEnd.x - dx} ${tempEdgeEnd.y}, ${tempEdgeEnd.x} ${tempEdgeEnd.y}`;
                  return (
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--sim-accent)"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                    />
                  );
                })()}

                {/* Animated Particles Host */}
                <g ref={dotsHostRef}></g>
              </g>
            </svg>

            {/* DOM Node Cards */}
            {design.nodes.map((n) => {
              const comp = findComp(n.type) || { cat: "compute", label: n.label, maxRPS: 10000 };
              const stat = simResult.nodes[n.id] || { load: 0, util: 0, status: "ok" };
              const isSelected = selectedNodeIds.includes(n.id);
              const isKilled = nodeChaos[n.id] === "kill";
              const isSlowed = nodeSlow[n.id];

              const statusCls = isKilled ? "is-down" : stat.status ? `is-${stat.status}` : "is-ok";

              return (
                <div
                  key={n.id}
                  className={`sim-node ${isSelected ? "selected" : ""} ${statusCls}`}
                  style={{
                    left: `${n.x}px`,
                    top: `${n.y}px`
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, n.id)}
                >
                  <div
                    className="sim-node-icon"
                    style={{ color: `var(--cat-${comp.cat})` }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${ICONS[comp.cat] || ICONS.compute}</svg>`
                    }}
                  />
                  <div className="sim-node-body">
                    <div className="sim-node-header">
                      <span className="sim-node-label">{n.label}</span>
                      {comp.maxRPS !== Infinity && (
                        <span className="sim-node-instances">×{n.instances}</span>
                      )}
                    </div>
                    <div className="sim-node-sub">
                      {comp.cat === "client" ? (
                        <span>Source</span>
                      ) : (
                        <>
                          <span>{fmtNum(stat.load)}/s</span>
                          <span>{Math.round(stat.util * 100)}%</span>
                        </>
                      )}
                    </div>
                    {comp.cat !== "client" && (
                      <div className="sim-node-bar">
                        <div
                          className={`sim-node-bar-fill ${stat.util > 1 ? "is-over" : stat.util > 0.8 ? "is-hot" : ""}`}
                          style={{ width: `${Math.min(100, Math.round(stat.util * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Port Handle for Edge Dragging */}
                  <div
                    className="sim-node-port"
                    title="Drag to connect"
                    onMouseDown={(e) => handlePortMouseDown(e, n.id)}
                  />
                </div>
              );
            })}
          </div>

          {/* Zoom Control Pill */}
          <div className="sim-zoom-bar">
            <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>–</button>
            <button onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}>+</button>
          </div>

          {/* Bottom Simulation Dock */}
          {dockOpen && simRun && (
            <div className="sim-dock">
              <div className="sim-dock-head">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <b>{PATTERNS[simRun.pattern]?.label}</b>
                  {simRun.chaos !== "none" && (
                    <span style={{ color: "var(--sim-warning)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertTriangle size={14} />
                      {CHAOS[simRun.chaos]?.label} at {simRun.chaosAt}s
                    </span>
                  )}
                  {mult !== 1 && (
                    <span style={{ color: "var(--sim-accent)" }}>{mult}× Load</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span>{runTickIdx}s / {simRun.dur}s</span>
                  <button
                    className="sim-tbtn"
                    onClick={() => {
                      setRunTickIdx(0);
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Replay</span>
                  </button>
                  <button
                    className="sim-tbtn"
                    onClick={() => setDockOpen(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="sim-dock-charts">
                {/* Throughput */}
                <div className="sim-dock-chart">
                  <div className="sim-dock-chart-title">
                    <span>Throughput</span>
                    <b>{fmtNum(simRun.ticks[runTickIdx]?.result.served || 0)} / {fmtNum(simRun.ticks[runTickIdx]?.result.offered || 0)}</b>
                  </div>
                  <svg className="sim-dock-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      points={simRun.ticks.map((t, i) => `${(i / (simRun.dur - 1)) * 100},${40 - Math.min(38, (t.result.served / (scale.rps * 2)) * 38)}`).join(" ")}
                    />
                  </svg>
                </div>

                {/* P99 Latency */}
                <div className="sim-dock-chart">
                  <div className="sim-dock-chart-title">
                    <span>P99 Latency</span>
                    <b>{Math.round(simRun.ticks[runTickIdx]?.result.p99 || 0)}ms</b>
                  </div>
                  <svg className="sim-dock-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      points={simRun.ticks.map((t, i) => `${(i / (simRun.dur - 1)) * 100},${40 - Math.min(38, ((t.result.p99 || 10) / 200) * 38)}`).join(" ")}
                    />
                  </svg>
                </div>

                {/* Error Rate */}
                <div className="sim-dock-chart">
                  <div className="sim-dock-chart-title">
                    <span>Errors</span>
                    <b>{((simRun.ticks[runTickIdx]?.result.errRate || 0) * 100).toFixed(1)}%</b>
                  </div>
                  <svg className="sim-dock-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      points={simRun.ticks.map((t, i) => `${(i / (simRun.dur - 1)) * 100},${40 - Math.min(38, (t.result.errRate || 0) * 38)}`).join(" ")}
                    />
                  </svg>
                </div>

                {/* Queue Lag */}
                <div className="sim-dock-chart">
                  <div className="sim-dock-chart-title">
                    <span>Queue Backlog</span>
                    <b>{simRun.ticks[runTickIdx]?.result.lagSec > 0.05 ? `${simRun.ticks[runTickIdx]?.result.lagSec.toFixed(1)}s` : "0s"}</b>
                  </div>
                  <svg className="sim-dock-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="2"
                      points={simRun.ticks.map((t, i) => `${(i / (simRun.dur - 1)) * 100},${40 - Math.min(38, ((t.result.lagSec || 0) / 10) * 38)}`).join(" ")}
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Inspector Sidebar */}
        <aside className="sim-side-panel">
          {/* Node Inspector */}
          {selectedNode && (
            <div className="sim-side-sec">
              <div className="sim-side-title">
                <span>Configure Node</span>
                <button
                  className="sim-tbtn"
                  style={{ color: "var(--sim-danger)" }}
                  onClick={handleDeleteSelected}
                  title="Delete node"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="sim-field">
                <span className="sim-field-head">Node Label</span>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDesign((prev) => ({
                      ...prev,
                      nodes: prev.nodes.map((n) =>
                        n.id === selectedNode.id ? { ...n, label: val } : n
                      )
                    }));
                  }}
                />
              </div>

              {findComp(selectedNode.type)?.maxRPS !== Infinity && (
                <div className="sim-field">
                  <div className="sim-field-head">
                    <span>Instances</span>
                    <b>×{selectedNode.instances}</b>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="64"
                    value={selectedNode.instances}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10);
                      setDesign((prev) => ({
                        ...prev,
                        nodes: prev.nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, instances: count } : n
                        )
                      }));
                    }}
                  />
                </div>
              )}

              {selectedNodeStat && (
                <div className="sim-kpi-grid" style={{ marginTop: "12px" }}>
                  <div className="sim-kpi-card">
                    <span className="sim-kpi-val">{fmtNum(selectedNodeStat.load)}/s</span>
                    <span className="sim-kpi-lbl">Current Load</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className="sim-kpi-val">{Math.round(selectedNodeStat.util * 100)}%</span>
                    <span className="sim-kpi-lbl">Utilization</span>
                  </div>
                </div>
              )}

              {/* Node Chaos Buttons */}
              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <button
                  className={`sim-tbtn ${nodeChaos[selectedNode.id] === "kill" ? "sim-run-btn" : ""}`}
                  style={{ flex: 1, border: "1px solid var(--sim-border)" }}
                  onClick={() => {
                    setNodeChaos((prev) => ({
                      ...prev,
                      [selectedNode.id]: prev[selectedNode.id] === "kill" ? null : "kill"
                    }));
                  }}
                >
                  <Flame size={14} />
                  <span>{nodeChaos[selectedNode.id] === "kill" ? "Revive" : "Kill"}</span>
                </button>
                <button
                  className={`sim-tbtn ${nodeSlow[selectedNode.id] ? "sim-run-btn" : ""}`}
                  style={{ flex: 1, border: "1px solid var(--sim-border)" }}
                  onClick={() => {
                    setNodeSlow((prev) => ({
                      ...prev,
                      [selectedNode.id]: !prev[selectedNode.id]
                    }));
                  }}
                >
                  <Activity size={14} />
                  <span>{nodeSlow[selectedNode.id] ? "Normal" : "+150ms Lag"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Edge Inspector */}
          {selectedEdge && (
            <div className="sim-side-sec">
              <div className="sim-side-title">
                <span>Configure Edge</span>
                <button
                  className="sim-tbtn"
                  style={{ color: "var(--sim-danger)" }}
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="sim-field">
                <span className="sim-field-head">Traffic Routing</span>
                <select
                  value={selectedEdge.kind || "all"}
                  onChange={(e) => {
                    const kind = e.target.value === "all" ? null : e.target.value;
                    setDesign((prev) => ({
                      ...prev,
                      edges: prev.edges.map((edge) =>
                        edge.from === selectedEdge.from && edge.to === selectedEdge.to
                          ? { ...edge, kind }
                          : edge
                      )
                    }));
                    setSelectedEdge((prev) => ({ ...prev, kind }));
                  }}
                >
                  <option value="all">All Traffic (Reads + Writes)</option>
                  <option value="read">Reads Only</option>
                  <option value="write">Writes Only</option>
                </select>
              </div>
            </div>
          )}

          {/* General Overview Panel */}
          {!selectedNode && !selectedEdge && (
            <>
              {/* Scale / Brief */}
              <div className="sim-side-sec">
                <div className="sim-side-title">
                  <span>{challenge.sandbox ? "Traffic Controls" : "Brief & Target"}</span>
                </div>

                {challenge.sandbox ? (
                  <>
                    <div className="sim-field">
                      <div className="sim-field-head">
                        <span>Traffic Load</span>
                        <b>{fmtNum(scale.rps)} req/s</b>
                      </div>
                      <input
                        type="range"
                        min="5000"
                        max="1000000"
                        step="5000"
                        value={scale.rps}
                        onChange={(e) => setScale((s) => ({ ...s, rps: parseInt(e.target.value, 10) }))}
                      />
                    </div>
                    <div className="sim-field">
                      <div className="sim-field-head">
                        <span>Read Percentage</span>
                        <b>{scale.readPct}%</b>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={scale.readPct}
                        onChange={(e) => setScale((s) => ({ ...s, readPct: parseInt(e.target.value, 10) }))}
                      />
                    </div>
                    <div className="sim-field">
                      <div className="sim-field-head">
                        <span>Cache Hit on Reads</span>
                        <b>{scale.cacheHit}%</b>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="99"
                        value={scale.cacheHit}
                        onChange={(e) => setScale((s) => ({ ...s, cacheHit: parseInt(e.target.value, 10) }))}
                      />
                    </div>
                    <div className="sim-field">
                      <div className="sim-field-head">
                        <span>P99 Budget</span>
                        <b>{scale.p99Budget}ms</b>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="300"
                        step="10"
                        value={scale.p99Budget}
                        onChange={(e) => setScale((s) => ({ ...s, p99Budget: parseInt(e.target.value, 10) }))}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <p style={{ fontSize: "0.82rem", color: "var(--sim-text-muted)", margin: "0 0 10px 0" }}>
                      {challenge.prompt}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.78rem", color: "var(--sim-text-dim)" }}>
                      {challenge.reqs.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Simulation Settings */}
              <div className="sim-side-sec">
                <div className="sim-side-title">
                  <span>Simulation Modes</span>
                </div>
                <div className="sim-field">
                  <span className="sim-field-head">Traffic Pattern</span>
                  <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
                    {Object.keys(PATTERNS).map((k) => (
                      <option key={k} value={k}>{PATTERNS[k].label}</option>
                    ))}
                  </select>
                </div>
                <div className="sim-field">
                  <span className="sim-field-head">Chaos Scenario</span>
                  <select value={chaosKind} onChange={(e) => setChaosKind(e.target.value)}>
                    {Object.keys(CHAOS).map((k) => (
                      <option key={k} value={k}>{CHAOS[k].label}</option>
                    ))}
                  </select>
                </div>
                <div className="sim-field">
                  <div className="sim-field-head">
                    <span>Load Multiplier</span>
                    <b>{mult}×</b>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="5.0"
                    step="0.25"
                    value={mult}
                    onChange={(e) => setMult(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Real-time KPIs */}
              <div className="sim-side-sec">
                <div className="sim-side-title">
                  <span>Live Metrics</span>
                </div>
                <div className="sim-kpi-grid">
                  <div className="sim-kpi-card">
                    <span className="sim-kpi-val">{Math.round(simResult.p50)}ms</span>
                    <span className="sim-kpi-lbl">P50 Latency</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className={`sim-kpi-val ${!simResult.latencyOk ? "is-bad" : ""}`}>
                      {Math.round(simResult.p99)}ms
                    </span>
                    <span className="sim-kpi-lbl">P99 ({scale.p99Budget}ms)</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className={`sim-kpi-val ${simResult.errRate > 0.01 ? "is-bad" : ""}`}>
                      {(simResult.errRate * 100).toFixed(1)}%
                    </span>
                    <span className="sim-kpi-lbl">Errors</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className="sim-kpi-val">{fmtNum(simResult.served)}/s</span>
                    <span className="sim-kpi-lbl">Served RPS</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className="sim-kpi-val">{fmtMoney(simResult.cost)}</span>
                    <span className="sim-kpi-lbl">Est. Monthly Cost</span>
                  </div>
                  <div className="sim-kpi-card">
                    <span className={`sim-kpi-val ${simResult.lagging ? "is-bad" : ""}`}>
                      {simResult.lagSec > 0.05 ? `${simResult.lagSec.toFixed(1)}s` : "None"}
                    </span>
                    <span className="sim-kpi-lbl">Queue Lag</span>
                  </div>
                </div>
              </div>

              {/* Failure Modes & Diagnosis */}
              <div className="sim-side-sec">
                <div className="sim-side-title">
                  <span>Architecture Diagnostics</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--sim-text-dim)" }}>
                    {simResult.modes.length ? `${simResult.modes.length} detected` : "Clean"}
                  </span>
                </div>
                {simResult.modes.length === 0 ? (
                  <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.08)", borderRadius: "6px", color: "#10b981", fontSize: "0.82rem" }}>
                    ✓ Architecture is holding healthy. Zero saturations detected.
                  </div>
                ) : (
                  <div className="sim-issue-list">
                    {simResult.modes.map((m, idx) => (
                      <div
                        key={idx}
                        className={`sim-issue-item ${m.sev === "warn" ? "is-warn" : ""}`}
                        onClick={() => {
                          if (m.node) {
                            setSelectedNodeIds([m.node]);
                          }
                        }}
                      >
                        <div className="sim-issue-title">{m.kind}</div>
                        <div className="sim-issue-desc">{m.detail}</div>
                        <div className="sim-issue-fix">{m.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Evaluation Report Modal */}
      {reportModal && (
        <div className="sim-modal-overlay" onClick={() => setReportModal(null)}>
          <div className="sim-report-card" onClick={(e) => e.stopPropagation()}>
            <div className="sim-report-hero">
              <div className="sim-report-score-ring">
                <span className="sim-report-score-num">{reportModal.score}</span>
                <span className="sim-report-score-max">/ 100</span>
              </div>
              <div>
                <span className="sim-diff-badge" data-diff={challenge.difficulty}>
                  {challenge.title}
                </span>
                <h3 className={`sim-report-verdict is-${reportModal.verdict.tone}`}>
                  {reportModal.verdict.t}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--sim-text-muted)" }}>
                  {reportModal.checks.filter((c) => c.pass).length} of {reportModal.checks.length} architecture checks passed
                </p>
              </div>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Dimension Breakdown Bars */}
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Core Dimensions</h4>
              <div className="sim-dim-list">
                {reportModal.dims.map((d) => (
                  <div key={d.id} className="sim-dim-row">
                    <span style={{ width: "100px", fontWeight: 600 }}>{d.label}</span>
                    <div className="sim-dim-bar-wrap">
                      <div
                        className="sim-dim-bar"
                        style={{
                          width: `${d.pct}%`,
                          background: d.pct >= 80 ? "#10b981" : d.pct >= 50 ? "#f59e0b" : "#ef4444"
                        }}
                      />
                    </div>
                    <span style={{ width: "50px", textAlign: "right", color: "var(--sim-text-muted)" }}>
                      {Math.round(d.earned)} / {d.weight}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rubric Checklist */}
              <h4 style={{ margin: "20px 0 10px 0", fontSize: "0.9rem" }}>Interview Rubric Checks</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {reportModal.checks.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.82rem",
                      color: c.pass ? "var(--sim-text)" : "var(--sim-text-dim)"
                    }}
                  >
                    {c.pass ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <X size={16} color="#ef4444" />
                    )}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Chaos Resilience Table */}
              {reportModal.resilience && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>
                    Resilience Chaos Sweep (N-1 Instance Drops)
                  </h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--sim-border)", textAlign: "left", color: "var(--sim-text-dim)" }}>
                        <th style={{ padding: "6px 0" }}>Component</th>
                        <th>Scale Drop</th>
                        <th>Error Rate</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportModal.resilience.results.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--sim-border)" }}>
                          <td style={{ padding: "6px 0", fontWeight: 600 }}>{r.label}</td>
                          <td>×{r.inst} → ×{r.inst - 1}</td>
                          <td>{(r.errRate * 100).toFixed(1)}%</td>
                          <td style={{ color: r.ok ? "#10b981" : "#ef4444" }}>
                            {r.ok ? "✓ Survives" : r.inst === 1 ? "✗ SPOF" : "✗ Saturated"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cost Comparison */}
              {reportModal.refCost > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Cost Comparison</h4>
                  <div style={{ display: "flex", gap: "20px", fontSize: "0.85rem" }}>
                    <div>Your Design: <b>{fmtMoney(reportModal.cost)}/mo</b></div>
                    <div>Reference: <b>{fmtMoney(reportModal.refCost)}/mo</b></div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--sim-border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {challenge.ref && (
                <button
                  className="sim-action-btn"
                  style={{ background: "var(--sim-surface-2)", color: "var(--sim-text)" }}
                  onClick={() => {
                    setDesign(buildReference(challenge));
                    setReportModal(null);
                  }}
                >
                  <Sparkles size={16} />
                  <span>Load Reference Architecture</span>
                </button>
              )}
              <button
                className="sim-action-btn sim-eval-btn"
                onClick={() => setReportModal(null)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModalOpen && (
        <div className="sim-modal-overlay" onClick={() => setHelpModalOpen(false)}>
          <div className="sim-report-card" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--sim-border)" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>SystemCraft Simulator Guide</h3>
            </div>
            <div style={{ padding: "20px 24px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--sim-text-muted)" }}>
              <h4 style={{ color: "var(--sim-text)", margin: "0 0 6px 0" }}>Traffic Flow Rules</h4>
              <p>
                <b>Reads vs Writes:</b> Reads take ONE downstream path chosen across connected components.
                Writes FAN OUT in parallel to every connected store (Database, Cache, Kafka).
              </p>
              <p>
                <b>CDN &amp; In-Memory Cache:</b> Absorb reads up to the configured Cache Hit %. Misses and all writes flow to the origin store.
              </p>
              <p>
                <b>Async Queues (Kafka / RabbitMQ / SQS):</b> Caller latency terminates immediately at the enqueue ACK.
                Downstream workers drain the queue at their own pace. If ingress &gt; drain rate, queue backlog builds up over time.
              </p>
              <h4 style={{ color: "var(--sim-text)", margin: "16px 0 6px 0" }}>Queuing &amp; Latency Theory</h4>
              <p>
                Latency is modeled via the <i>M/M/c Sakasegawa waiting time approximation</i>.
                Latency stays near nominal flat until utilization reaches ~75–80%, after which queueing delays explode exponentially.
              </p>
              <h4 style={{ color: "var(--sim-text)", margin: "16px 0 6px 0" }}>Keyboard Shortcuts</h4>
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                <li><b>L:</b> Tidy auto-layout</li>
                <li><b>F:</b> Fit architecture to screen</li>
                <li><b>R:</b> Run simulation test</li>
                <li><b>E:</b> Score &amp; evaluate</li>
                <li><b>Delete / Backspace:</b> Remove selected component or connection</li>
                <li><b>Ctrl+Z / Cmd+Z:</b> Undo / Redo</li>
              </ul>
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid var(--sim-border)", display: "flex", justifyContent: "flex-end" }}>
              <button className="sim-action-btn sim-eval-btn" onClick={() => setHelpModalOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
