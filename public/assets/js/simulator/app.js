/* SystemCraft simulator UI (v2): challenge picker and builder canvas.
 *
 * Everything the reader sees under /simulator/. The traffic model, scoring and
 * reference designs live in engine.js (pure, unit-tested); this file only owns
 * the DOM: an infinite pan/zoom canvas, the inspector, live analysis, timed
 * runs with chaos, the evaluation report, sharing and export.
 *
 * Renders into #sim-app only, so the site header and footer around it survive
 * every view change. All user-controlled text (component names, imported or
 * shared designs) goes through esc() or textContent, never raw innerHTML.
 */
(function () {
  'use strict';
  var E = window.SimEngine;
  if (!E) return;
  var CH = E.CHALLENGES, LIB = E.LIBRARY;
  var NODE_W = E.NODE_W, NODE_H = E.NODE_H;
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SAVE_V = 2;
  var WORLD = 5000;          // half-size of the SVG layer; nodes are clamped inside it
  var GRID = 8;              // drag snap
  var MAX_INST = E.MAX_INSTANCES;

  // ───────────────────────── utilities ─────────────────────────
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var fmt = E.fmtNum, money = E.fmtMoney;
  function ms(v) {
    if (!isFinite(v)) return '\u2014';
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 's';
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + 'ms';
  }
  function pctTxt(v) {
    if (!isFinite(v)) return '\u2014';
    var p = v * 100;
    return (p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)) + '%';
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota or private mode */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  function track(name, extra) {
    if (!window.gtag) return;
    try { window.gtag('event', name, Object.assign({ challenge: (S && S.slug) || '' }, extra || {})); } catch (e) { /* analytics is optional */ }
  }
  function svgIcon(cat) {
    var p = E.ICONS[cat] || E.ICONS.compute;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var UI_ICONS = {
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    layout: '<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M9 6.5h6M18 9v6"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5"/><path d="M5 4h14"/>',
    reset: '<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.3"/><path d="M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    bolt: '<path d="M13 2L5 13h6l-1 9 9-12h-6z"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><rect x="4" y="4" width="12" height="12" rx="2"/>',
    skull: '<path d="M12 3a8 8 0 00-5 14.2V20h10v-2.8A8 8 0 0012 3z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    library: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    sticky: '<path d="M15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/>',
    calc: '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/>'
  };
  var NOTE_PRESETS = {
    reqs: {
      label: 'Requirements', tag: 'REQS', icon: 'list', color: 'blue', mono: false, w: 288, h: 184,
      blurb: 'Functional & non-functional goals',
      title: 'Requirements',
      body: 'Functional:\n• Create & read resources\n• Real-time notifications\n\nNon-Functional:\n• P99 < 100ms · 99.99% uptime\n• Read-heavy (100:1)'
    },
    api: {
      label: 'API Contracts', tag: 'API', icon: 'code', color: 'purple', mono: true, w: 304, h: 176,
      blurb: 'REST / gRPC endpoints & payloads',
      title: 'API Endpoints',
      body: 'POST /v1/items\n  req: { userId, payload }\n  res: 201 { id }\n\nGET  /v1/items/:id\n  res: 200 { id, data }'
    },
    entity: {
      label: 'DB Entity / Schema', tag: 'SCHEMA', icon: 'table', color: 'green', mono: true, w: 288, h: 184,
      blurb: 'Tables, columns, PK/FK & indexes',
      title: 'Entity Schema',
      body: 'items\n──────────────────────\nid          UUID   PK\nuser_id     UUID   IDX\nstatus      VARCHAR\ncreated_at  TIMESTAMP'
    },
    math: {
      label: 'Capacity Math', tag: 'MATH', icon: 'calc', color: 'slate', mono: true, w: 280, h: 168,
      blurb: 'QPS, bandwidth & storage sizing',
      title: 'Capacity Estimation',
      body: 'DAU:        10M users\nRead QPS:   50k req/s\nWrite QPS:  5k req/s\nRow size:   ~500 B\nStorage/yr: ~80 TB'
    },
    note: {
      label: 'Sticky Note', tag: 'NOTE', icon: 'sticky', color: 'amber', mono: false, w: 248, h: 152,
      blurb: 'Freeform callouts & trade-offs',
      title: 'Design Note',
      body: 'Key trade-off or architecture callout...'
    }
  };
  var NOTE_ORDER = ['reqs', 'api', 'entity', 'math', 'note'];
  var NOTE_COLOR_LIST = ['amber', 'blue', 'purple', 'green', 'slate'];
  function ui(name, extra) {
    return '<svg class="ic' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (UI_ICONS[name] || '') + '</svg>';
  }
  function announce(msg) {
    var el = $('#sim-live');
    if (!el) { el = document.createElement('div'); el.id = 'sim-live'; el.className = 'sr-only'; el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 30);
  }
  function toast(msg, tone) {
    var host = $('#sim-toasts');
    if (!host) { host = document.createElement('div'); host.id = 'sim-toasts'; host.className = 'sim-toasts'; document.body.appendChild(host); }
    var t = document.createElement('div');
    t.className = 'sim-toast' + (tone ? ' is-' + tone : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }
  function compOf(type) { return E.findComp(type); }
  function labelOf(n) { return n.label || (compOf(n.type) || {}).label || n.type; }
  function rootEl() { return document.getElementById('sim-app') || document.body; }

  // ───────────────────────── challenge helpers ─────────────────────────
  function getChallenge(slug) {
    if (slug === 'sandbox') {
      var sc = Object.assign({}, E.SANDBOX_SCALE, store.get('scsim-sandbox-scale') || {});
      sc.rps = clamp(Math.round(+sc.rps) || 50000, 1000, 2000000);
      sc.readPct = clamp(Math.round(+sc.readPct), 0, 100);
      sc.cacheHit = clamp(Math.round(+sc.cacheHit), 0, 99);
      sc.p99Budget = clamp(Math.round(+sc.p99Budget) || 100, 10, 2000);
      var C = window.SimCatalog;
      return { title: 'Sandbox', difficulty: 'Sandbox', sandbox: true,
        prompt: 'Free build. Set your own traffic, wire up any architecture, and find out where it breaks.',
        scale: sc, reqs: [], rubric: [C.RSIM(), C.RLAT(), C.RDUR()], ref: null };
    }
    return CH[slug] || null;
  }
  function bestOf(slug) { return store.get('scsim-best:' + slug); }
  function hasDraft(slug) {
    var d = store.get('scsim:' + slug);
    return !!(d && Array.isArray(d.nodes) && d.nodes.length > 1);
  }
  function scaleText(sc) {
    return fmt(sc.rps) + ' req/s \u00b7 ' + sc.readPct + '% reads' + (sc.p99Budget ? ' \u00b7 P99 \u2264 ' + sc.p99Budget + 'ms' : '');
  }
  function tagsFor(ch) {
    var t = [], sc = ch.scale;
    if (sc.readPct >= 85) t.push('Read-heavy');
    else if (sc.readPct <= 40) t.push('Write-heavy');
    if (sc.p99Budget && sc.p99Budget <= 50) t.push('Tight latency');
    if (sc.burst) t.push('Bursty');
    if (sc.rps >= 300000) t.push('High scale');
    if (ch.statefree) t.push('Stateless');
    return t.slice(0, 3);
  }

  // ───────────────────────── boot ─────────────────────────
  var S = null;   // builder state, set by startBuilder
  function boot() {
    var slug = new URLSearchParams(location.search).get('c');
    var small = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    var forced = false;
    try { forced = sessionStorage.getItem('scsim-force-small') === '1'; } catch (e) { /* ignore */ }
    if (slug && !getChallenge(slug)) slug = null;
    if (slug && small && !forced) { showNotice(slug); return; }
    if (slug) startBuilder(slug);
    else showPicker();
  }

  function showNotice(slug) {
    var c = getChallenge(slug);
    var title = c && !c.sandbox ? c.title : '';
    var href = title ? '/hld/' + slug + '/' : '/hld/';
    rootEl().innerHTML =
      '<main class="sim-notice">' +
        '<div class="sim-notice-inner">' +
          '<div class="sim-notice-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg></div>' +
          '<span class="pk-eyebrow">System Design Simulator</span>' +
          '<h1>Best on a bigger screen</h1>' +
          '<p>The simulator is a canvas you build on: drag components, wire them up, then pan and zoom around the result. It works best on a laptop or a tablet in landscape' +
            (title ? ', where you can build and stress-test the <b>' + esc(title) + '</b> architecture.' : '.') + '</p>' +
          '<div class="sim-notice-actions">' +
            '<a class="btn btn-primary btn-lg" href="' + esc(href) + '">' + (title ? 'Read the ' + esc(title) + ' design' : 'Browse the system designs') + ' &rarr;</a>' +
            '<button type="button" class="btn" id="sim-force">Open the simulator anyway</button>' +
            '<a class="btn btn-ghost" href="/simulator/">All challenges</a>' +
          '</div>' +
        '</div>' +
      '</main>';
    $('#sim-force').onclick = function () {
      try { sessionStorage.setItem('scsim-force-small', '1'); } catch (e) { /* ignore */ }
      startBuilder(slug);
    };
  }

  // ───────────────────────── picker ─────────────────────────
  // Shown at /simulator/ with no ?c=. The nav's "Simulator" link lands here.
  function statusOf(slug) {
    var b = bestOf(slug);
    if (b && b.score >= 75) return 'passed';
    if (b || hasDraft(slug)) return 'started';
    return 'new';
  }
  function showPicker() {
    document.body.classList.remove('sim-canvas');
    document.body.classList.remove('sim-draw-mode');
    var levels = ['Beginner', 'Intermediate', 'Advanced'];
    var byDiff = { Beginner: [], Intermediate: [], Advanced: [] };
    Object.keys(CH).forEach(function (slug) { (byDiff[CH[slug].difficulty] || byDiff.Intermediate).push(slug); });
    var slugs = Object.keys(CH);
    var passed = slugs.filter(function (s) { return statusOf(s) === 'passed'; }).length;
    var started = slugs.filter(function (s) { return statusOf(s) === 'started'; });
    var nComp = Object.keys(LIB).reduce(function (s, k) { return s + LIB[k].length; }, 0) - 1;
    // Resume the most recent draft, else the first challenge not yet passed.
    var resume = null, latest = 0;
    started.forEach(function (s) { var d = store.get('scsim:' + s); var at = (d && d.at) || 1; if (at > latest) { latest = at; resume = s; } });
    var next = resume || slugs.filter(function (s) { return statusOf(s) !== 'passed'; })[0] || slugs[0];

    function card(slug) {
      var c = CH[slug], st = statusOf(slug), b = bestOf(slug);
      var badge = st === 'passed' ? '<span class="pk-badge is-pass">' + ui('check') + b.score + '</span>'
        : b ? '<span class="pk-badge is-try">' + b.score + '</span>'
        : st === 'started' ? '<span class="pk-badge is-draft">Draft</span>' : '';
      var tags = tagsFor(c).map(function (t) { return '<span class="pk-tag">' + esc(t) + '</span>'; }).join('');
      var q = [c.title, c.prompt, c.difficulty, tagsFor(c).join(' '), (c.ref && c.ref.stack || []).join(' '), (c.reqs || []).join(' ')].join(' ').toLowerCase();
      return '<a class="pk-card" href="/simulator/?c=' + encodeURIComponent(slug) + '" data-status="' + st + '" data-q="' + esc(q) + '">' +
        '<span class="pk-card-top"><span class="pk-card-title">' + esc(c.title) + '</span>' + badge + '</span>' +
        '<span class="pk-card-prompt">' + esc(c.prompt) + '</span>' +
        (tags ? '<span class="pk-tags">' + tags + '</span>' : '') +
        '<span class="pk-card-meta">' + esc(scaleText(c.scale)) + '</span>' +
      '</a>';
    }
    var groups = levels.filter(function (d) { return byDiff[d].length; }).map(function (d) {
      return '<section class="pk-group" id="pk-' + d.toLowerCase() + '" data-diff="' + d + '">' +
        '<h2><span class="pk-dot" aria-hidden="true"></span>' + d + ' <span class="pk-count">' + byDiff[d].length + '</span></h2>' +
        '<div class="pk-grid">' + byDiff[d].map(card).join('') + '</div></section>';
    }).join('');
    var nextTitle = CH[next].title;
    rootEl().innerHTML =
      '<div class="pk-wrap"><main class="pk-main">' +
        '<section class="pk-hero">' +
          '<div class="pk-hero-copy">' +
            '<span class="pk-eyebrow">Build it \u00b7 Break it \u00b7 Get scored</span>' +
            '<h1>System Design <em>Simulator</em></h1>' +
            '<p class="pk-lede">Wire up an architecture, push real traffic through it, then kill its servers and watch what happens. ' +
              'Every design is scored the way an interviewer would: on architecture, scale, P99 latency, resilience and cost.</p>' +
            '<div class="pk-cta">' +
              '<a class="btn btn-primary btn-lg" href="/simulator/?c=' + encodeURIComponent(next) + '">' + (resume ? 'Continue ' : 'Start with ') + esc(nextTitle) + ' &rarr;</a>' +
              '<a class="btn btn-lg" href="/simulator/?c=sandbox&mode=simulate">Open the sandbox</a>' +
              '<a class="btn btn-lg" href="/simulator/?c=sandbox&mode=draw">' + ui('pen') + ' Draw a diagram</a>' +
            '</div>' +
            '<ul class="pk-stats">' +
              '<li><b>' + slugs.length + '</b>challenges</li>' +
              '<li><b>' + nComp + '</b>components</li>' +
              '<li><b>' + (Object.keys(E.CHAOS).length - 1) + '</b>chaos scenarios</li>' +
              '<li><b>' + passed + '</b>passed by you</li>' +
            '</ul>' +
          '</div>' +
          '<div class="pk-hero-art" aria-hidden="true">' + heroArt() + '</div>' +
        '</section>' +
        '<ol class="pk-steps" aria-label="How it works">' +
          '<li><b>Build</b><span>Drag load balancers, caches, queues and databases onto the canvas and wire the request path.</span></li>' +
          '<li><b>Run traffic</b><span>Reads and writes take different paths. Watch utilisation, P99 and errors move live.</span></li>' +
          '<li><b>Break it</b><span>Spike the load, flush the cache, kill a database. Queues absorb bursts; single instances do not.</span></li>' +
          '<li><b>Get scored</b><span>Five dimensions, a chaos sweep of every tier, and a reference design to compare against.</span></li>' +
        '</ol>' +
        '<div class="pk-toolbar" id="pk-challenges" role="search">' +
          '<label class="pk-search">' + ui('search') + '<span class="sr-only">Search challenges</span>' +
            '<input type="search" id="pk-q" placeholder="Search 39 challenges: chat, payments, Kafka..." autocomplete="off"></label>' +
          '<div class="pk-chips" role="group" aria-label="Difficulty">' +
            ['All'].concat(levels).map(function (d, i) { return '<button type="button" class="pk-chip" data-diff="' + d + '" aria-pressed="' + (i === 0) + '">' + d + '</button>'; }).join('') +
          '</div>' +
          '<label class="pk-select"><span class="sr-only">Progress</span><select id="pk-status">' +
            '<option value="">Any progress</option><option value="new">Not started</option><option value="started">In progress</option><option value="passed">Passed</option>' +
          '</select></label>' +
          '<span class="pk-progress" aria-live="polite"><b>' + passed + '</b> / ' + slugs.length + ' passed<span class="pk-meter"><i style="width:' + Math.round(passed * 100 / slugs.length) + '%"></i></span></span>' +
        '</div>' +
        groups +
        '<p class="pk-empty" id="pk-empty" hidden>No challenge matches that. <button type="button" class="pk-link" id="pk-clear">Clear the filters</button></p>' +
      '</main></div>';
    $('#pk-q').placeholder = 'Search ' + slugs.length + ' challenges: chat, payments, Kafka\u2026';

    var state = { q: '', diff: 'All', st: '' };
    function apply() {
      var any = false;
      $$('.pk-group').forEach(function (g) {
        var showG = state.diff === 'All' || g.getAttribute('data-diff') === state.diff, n = 0;
        $$('.pk-card', g).forEach(function (c) {
          var ok = showG && (!state.q || c.getAttribute('data-q').indexOf(state.q) >= 0) && (!state.st || c.getAttribute('data-status') === state.st);
          c.hidden = !ok;
          if (ok) n++;
        });
        g.hidden = !n;
        if (n) any = true;
      });
      $('#pk-empty').hidden = any;
    }
    $('#pk-q').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); apply(); });
    $('#pk-status').addEventListener('change', function (e) { state.st = e.target.value; apply(); });
    $$('.pk-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        state.diff = b.getAttribute('data-diff');
        $$('.pk-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
    $('#pk-clear').addEventListener('click', function () {
      state = { q: '', diff: 'All', st: '' };
      $('#pk-q').value = ''; $('#pk-status').value = '';
      $$('.pk-chip').forEach(function (x, i) { x.setAttribute('aria-pressed', String(i === 0)); });
      apply();
    });
  }
  // Small decorative architecture for the hero: static SVG, no data.
  function heroArt() {
    var nodes = [
      { x: 10, y: 88, c: 'client', s: 'ok' }, { x: 120, y: 88, c: 'lb', s: 'ok' }, { x: 230, y: 40, c: 'compute', s: 'hot' },
      { x: 230, y: 136, c: 'compute', s: 'ok' }, { x: 340, y: 20, c: 'cache', s: 'ok' }, { x: 340, y: 100, c: 'queue', s: 'ok' }, { x: 340, y: 176, c: 'db', s: 'over' }
    ];
    var links = [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [5, 6]];
    var paths = links.map(function (l) {
      var a = nodes[l[0]], b = nodes[l[1]], x1 = a.x + 64, y1 = a.y + 20, x2 = b.x, y2 = b.y + 20, dx = (x2 - x1) / 2;
      return '<path class="ha-e ha-' + b.s + '" d="M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
    }).join('');
    var boxes = nodes.map(function (n) {
      return '<g transform="translate(' + n.x + ' ' + n.y + ')" class="ha-n ha-' + n.s + '"><rect width="64" height="40" rx="9"/>' +
        '<g transform="translate(20 8) scale(1)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (E.ICONS[n.c] || '') + '</svg></g></g>';
    }).join('');
    return '<svg viewBox="0 0 414 226" role="presentation">' + paths + boxes + '</svg>';
  }

  // ───────────────────────── builder state + persistence ─────────────────────────
  function blankDesign() { return { nodes: [{ id: 1, type: 'client', x: 60, y: 220, instances: 1 }], edges: [], notes: [], nextId: 2 }; }
  function snapshot() { return JSON.stringify({ nodes: S.design.nodes, edges: S.design.edges, notes: S.design.notes || [], nextId: S.design.nextId }); }
  function loadDraft(slug) {
    var raw = store.get('scsim:' + slug);
    if (!raw || (!Array.isArray(raw.nodes) && !Array.isArray(raw.notes))) return null;
    var d = E.normalizeDesign(raw);
    if (!d.nodes.length && !d.notes.length) return null;
    if (raw.v !== SAVE_V) {
      // v1 cards were 112px wide on a 130px column grid; spread them out so
      // the wider v2 cards do not overlap. The saved v1 view is meaningless now.
      d.nodes.forEach(function (n) { n.x = Math.round(n.x * 1.7); n.y = Math.round(n.y * 1.15); });
      return { design: d, view: null, live: d.nodes.length > 1 };
    }
    var v = raw.view;
    var view = v && isFinite(v.x) && isFinite(v.y) && isFinite(v.k) ? { x: +v.x, y: +v.y, k: clamp(+v.k, 0.25, 2) } : null;
    return { design: d, view: view, live: !!raw.live };
  }
  function save() {
    if (!S) return;
    store.set('scsim:' + S.slug, { v: SAVE_V, nodes: S.design.nodes, edges: S.design.edges, notes: S.design.notes || [], nextId: S.design.nextId,
      view: S.view, live: S.live, at: Date.now() });
  }
  var viewTimer = 0;
  function saveViewSoon() { clearTimeout(viewTimer); viewTimer = setTimeout(save, 400); }
  function pushHistory() {
    S.hist = S.hist.slice(0, S.hi + 1);
    S.hist.push(snapshot());
    if (S.hist.length > 80) S.hist.shift();
    S.hi = S.hist.length - 1;
    save();
    updateUndo();
  }
  var softTimer = 0;
  // A design mutation: history, save, repaint, re-analyse.
  function commit() {
    clearTimeout(softTimer);
    pruneSel();
    pushHistory();
    stopRun(true);
    renderNotes(); renderNodes(); renderEdges(); renderSide();
    scheduleAnalysis();
  }
  // For rapid changes (steppers, sliders, nudges): repaint now, record later.
  function touch() {
    stopRun(true);
    renderNotes(); renderNodes(); renderEdges();
    scheduleAnalysis();
    clearTimeout(softTimer);
    softTimer = setTimeout(function () { pushHistory(); renderSide(); }, 350);
  }
  function restore(str) {
    S.design = E.normalizeDesign(JSON.parse(str));
    S.sel = { nodes: [], edge: null, note: null };
    S.editingNote = null;
    pruneChaos();
    save(); stopRun(true);
    renderNotes(); renderNodes(); renderEdges(); renderSide(); updateUndo();
    scheduleAnalysis();
  }
  function undo() { clearTimeout(softTimer); if (S.hi > 0) { S.hi--; restore(S.hist[S.hi]); announce('Undone'); } }
  function redo() { clearTimeout(softTimer); if (S.hi < S.hist.length - 1) { S.hi++; restore(S.hist[S.hi]); announce('Redone'); } }
  function nodeById(id) { for (var i = 0; i < S.design.nodes.length; i++) if (S.design.nodes[i].id === id) return S.design.nodes[i]; return null; }
  function noteById(id) { var arr = S.design.notes || []; for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function nodeMap() { var m = {}; S.design.nodes.forEach(function (n) { m[n.id] = n; }); return m; }
  function pruneSel() {
    var m = nodeMap();
    S.sel.nodes = S.sel.nodes.filter(function (id) { return m[id]; });
    if (S.sel.edge && !S.design.edges.some(function (e) { return e.from + '>' + e.to === S.sel.edge; })) S.sel.edge = null;
    if (S.sel.note && !noteById(S.sel.note)) S.sel.note = null;
  }
  function pruneChaos() {
    var m = nodeMap();
    Object.keys(S.chaos).forEach(function (k) { if (!m[k]) delete S.chaos[k]; });
    Object.keys(S.slow).forEach(function (k) { if (!m[k]) delete S.slow[k]; });
  }

  // ── Share links: the design rides in the URL fragment, which is never sent
  // to a server. The compact codec lives in engine.js (unit-tested); whatever
  // it decodes still goes through normalizeDesign like any other input.
  function decodeShare(s) { try { return E.decodeShare(s); } catch (e) { return null; } }
  function shareUrl() { return location.origin + '/simulator/?c=' + encodeURIComponent(S.slug) + '#d=' + E.encodeShare(S.design); }
  function copyText(text, okMsg) {
    function fallback() { window.prompt('Copy this link:', text); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast(okMsg, 'ok'); }, fallback);
    else fallback();
  }

  // ───────────────────────── builder ─────────────────────────
  function isDraw() { return !!(S && S.mode === 'draw'); }
  function setMode(nextMode, silent) {
    if (!S) return;
    var m = nextMode === 'draw' ? 'draw' : 'simulate';
    if (S.mode === m && !silent) return;
    S.mode = m;
    store.set('scsim-mode', m);
    document.body.classList.toggle('sim-draw-mode', isDraw());
    var bSim = $('#sb-mode-sim'), bDraw = $('#sb-mode-draw');
    if (bSim) bSim.setAttribute('aria-pressed', String(!isDraw()));
    if (bDraw) bDraw.setAttribute('aria-pressed', String(isDraw()));
    if (isDraw()) {
      stopRun(true);
      stopDots();
      var dg = $('#sb-dots'); if (dg) dg.innerHTML = '';
      var dk = $('#sb-dock'); if (dk) dk.hidden = true;
      var st = $('#sb-stage'); if (st) st.classList.remove('has-dock');
    } else {
      if (S.dock) {
        var dk2 = $('#sb-dock'); if (dk2) dk2.hidden = false;
        var st2 = $('#sb-stage'); if (st2) st2.classList.add('has-dock');
      }
      if (S.live) scheduleAnalysis(true); else updateGoal();
    }
    updateLibraryMode();
    renderNotes(); renderNodes(); renderEdges(); renderSide(); updateStatus(); updateGoal();
    if (!silent) {
      toast(isDraw() ? 'Draw mode: clean diagramming without simulation overlays.' : 'Simulate mode: interactive traffic, queuing & chaos active.', 'ok');
      announce(isDraw() ? 'Switched to Draw diagram mode' : 'Switched to Interactive simulator mode');
    }
  }
  function updateLibraryMode() {
    var draw = isDraw();
    $$('#sb-lib .lib-spec').forEach(function (el) {
      el.textContent = draw ? (el.getAttribute('data-role') || '') : (el.getAttribute('data-spec') || '');
    });
  }
  function startBuilder(slug) {
    var ch = getChallenge(slug);
    var urlMode = new URLSearchParams(location.search).get('mode');
    var initMode = (urlMode === 'draw' || urlMode === 'simulate') ? urlMode : (store.get('scsim-mode') === 'draw' ? 'draw' : 'simulate');
    S = { slug: slug, ch: ch, scale: ch.scale, design: null, sel: { nodes: [], edge: null, note: null }, view: { x: 0, y: 0, k: 1 },
      hist: [], hi: -1, live: false, res: null, chaos: {}, slow: {}, mult: 1, pattern: 'steady', chaosKind: 'none',
      run: null, dock: false, space: false, mode: initMode, diagramTitle: '', editingNote: null };
    var m = /(?:^#|&)d=([^&]+)/.exec(location.hash || '');
    var shared = m ? decodeShare(m[1]) : null;
    if (m) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
    var draft = loadDraft(slug);
    S.design = draft ? draft.design : blankDesign();
    if (!Array.isArray(S.design.notes)) S.design.notes = [];
    if (draft) { S.live = draft.live; if (draft.view) S.view = draft.view; }
    S.hist = [snapshot()]; S.hi = 0;
    renderBuilder();
    if (shared) {
      S.design = shared; S.live = !isDraw();
      if (!Array.isArray(S.design.notes)) S.design.notes = [];
      pushHistory();
      toast(draft ? 'Opened a shared design. Undo brings back your own.' : 'Opened a shared design.', 'ok');
      track('sim_open_shared');
    }
    renderNotes(); renderNodes(); renderEdges(); renderSide(); updateUndo(); updateBest();
    if (shared || !draft || !draft.view) { if (S.design.nodes.length > 1 || S.design.notes.length) fitView(); }
    if (!isDraw() && S.live) scheduleAnalysis(true); else { updateGoal(); }
    if (!isDraw()) maybeOnboard();
    track('sim_open', { sandbox: !!ch.sandbox, mode: S.mode });
  }

  function tbtn(id, icon, title, extra) {
    return '<button type="button" class="sb-tbtn' + (extra || '') + '" id="' + id + '" aria-label="' + esc(title) + '" title="' + esc(title) + '">' + ui(icon) + '</button>';
  }
  function mitem(act, icon, label) {
    return '<button type="button" role="menuitem" class="sb-mi" data-act="' + act + '">' + ui(icon) + '<span>' + esc(label) + '</span></button>';
  }
  function renderBuilder() {
    document.body.classList.add('sim-canvas');
    document.body.classList.toggle('sim-draw-mode', isDraw());
    var ch = S.ch;
    var markers = ['idle', 'off', 'ok', 'hot', 'over', 'sel'].map(function (t) {
      return '<marker id="sb-ar-' + t + '" class="sb-ar sb-ar-' + t + '" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.6L10 5L0 9.4z"/></marker>';
    }).join('');
    rootEl().innerHTML =
    '<div class="sb" id="sb">' +
      '<div class="sb-bar">' +
        '<div class="sb-bar-l">' +
          tbtn('sb-libt', 'library', 'Components', ' sb-only-narrow') +
          '<a class="sb-back" href="/simulator/" title="All challenges"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Challenges</span></a>' +
          '<div class="sb-title"><h1 id="sb-title-h">' + esc(S.diagramTitle || ch.title) + '</h1>' +
            '<span class="sb-diff" data-diff="' + esc(ch.difficulty) + '">' + esc(ch.difficulty) + '</span>' +
            '<span class="sb-best" id="sb-best" hidden></span>' +
            '<span class="sb-draw-pill sb-draw-only">Diagram</span></div>' +
        '</div>' +
        '<div class="sb-bar-r" role="toolbar" aria-label="Canvas tools">' +
          '<div class="sb-mode-seg" role="group" aria-label="Workspace mode" title="Toggle Interactive Simulator or Diagram Drawing (M)">' +
            '<button type="button" class="sb-mode-btn" id="sb-mode-sim" data-mode="simulate" aria-pressed="' + (!isDraw()) + '">' + ui('bolt') + '<span>Simulate</span></button>' +
            '<button type="button" class="sb-mode-btn" id="sb-mode-draw" data-mode="draw" aria-pressed="' + isDraw() + '">' + ui('pen') + '<span>Draw</span></button>' +
          '</div>' +
          '<div class="sb-grp">' + tbtn('sb-undo', 'undo', 'Undo (Ctrl+Z)') + tbtn('sb-redo', 'redo', 'Redo (Ctrl+Shift+Z)') + '</div>' +
          '<div class="sb-grp">' + tbtn('sb-tidy', 'layout', 'Tidy layout (L)') + tbtn('sb-fit', 'fit', 'Fit to screen (F)') + '</div>' +
          '<div class="sb-grp">' +
            '<div class="sb-menu-wrap"><button type="button" class="sb-tbtn sb-txt" id="sb-note-btn" aria-haspopup="true" aria-expanded="false" title="Add Sticky Note, Requirements, API, or DB Entity card (N)">' + ui('sticky') + '<span>Note</span></button>' +
              '<div class="sb-menu" id="sb-note-menu" role="menu" hidden>' +
                NOTE_ORDER.map(function (k) { var p = NOTE_PRESETS[k]; return '<button type="button" role="menuitem" class="sb-mi" data-note="' + k + '">' + ui(p.icon) + '<span>' + esc(p.label) + '</span></button>'; }).join('') +
              '</div></div>' +
            '<button type="button" class="sb-tbtn sb-txt" id="sb-example" title="' + (ch.sandbox ? 'Load a starter architecture' : 'Load the reference architecture') + '">' + ui('sparkle') + '<span>' + (ch.sandbox ? 'Starter' : 'Example') + '</span></button>' +
            '<button type="button" class="sb-tbtn sb-txt" id="sb-share" title="Copy a link to this design">' + ui('share') + '<span>Share</span></button>' +
            '<div class="sb-menu-wrap"><button type="button" class="sb-tbtn" id="sb-more" aria-haspopup="true" aria-expanded="false" aria-label="More: export, import, reset" title="Export, import, reset">' + ui('more') + '</button>' +
              '<div class="sb-menu" id="sb-menu" role="menu" hidden>' +
                mitem('png', 'image', 'Download image (PNG)') +
                mitem('svg', 'image', 'Download vector (SVG)') +
                mitem('mermaid', 'code', 'Copy Mermaid diagram') +
                mitem('json', 'download', 'Download design (JSON)') +
                mitem('import', 'upload', 'Import design (JSON)') + mitem('link', 'copy', 'Copy share link') +
                '<div class="sb-msep" role="separator"></div>' + mitem('reset', 'reset', 'Reset the canvas') +
              '</div></div>' +
            tbtn('sb-help', 'help', 'How it works and keyboard shortcuts (?)') +
          '</div>' +
          '<button type="button" class="sb-run" id="sb-run" title="Run traffic through the design (R)">' + ui('play') + '<span>Run</span></button>' +
          '<button type="button" class="sb-eval" id="sb-eval" title="Score the design (E)">' + ui('check') + '<span>Evaluate</span></button>' +
          '<button type="button" class="sb-export sb-draw-only" id="sb-export-png" title="Export clean diagram as PNG">' + ui('image') + '<span>Export PNG</span></button>' +
          tbtn('sb-sidet', 'panel', 'Inspector', ' sb-only-narrow') +
          '<input type="file" id="sb-file" accept="application/json,.json" hidden>' +
        '</div>' +
      '</div>' +
      '<div class="sb-body">' +
        '<aside class="sb-lib" id="sb-lib" aria-label="Component library"></aside>' +
        '<div class="sb-stage" id="sb-stage" tabindex="0" aria-label="Design canvas. Tab moves between components; Delete removes the selection.">' +
          '<div class="sb-world" id="sb-world">' +
            '<svg class="sb-svg" width="' + (2 * WORLD) + '" height="' + (2 * WORLD) + '" style="left:' + (-WORLD) + 'px;top:' + (-WORLD) + 'px" aria-hidden="true">' +
              '<defs>' + markers + '</defs>' +
              '<g transform="translate(' + WORLD + ' ' + WORLD + ')"><g id="sb-edges"></g><g id="sb-dots" class="sb-dots"></g><path id="sb-temp" class="sb-temp" d=""/></g>' +
            '</svg>' +
            '<div class="sb-notes" id="sb-notes"></div>' +
            '<div class="sb-nodes" id="sb-nodes"></div>' +
          '</div>' +
          '<button type="button" class="sb-goal" id="sb-goal"></button>' +
          '<div class="sb-marquee" id="sb-marquee" hidden></div>' +
          '<div class="sb-empty" id="sb-empty" hidden></div>' +
          '<div class="sb-hud" id="sb-status"></div>' +
          '<div class="sb-zoom" role="group" aria-label="Zoom">' +
            tbtn('sb-zout', 'minus', 'Zoom out (-)') + '<button type="button" class="sb-zval" id="sb-zval" title="Reset to 100%">100%</button>' + tbtn('sb-zin', 'plus', 'Zoom in (+)') +
          '</div>' +
          '<section class="sb-dock" id="sb-dock" hidden aria-label="Simulation run"></section>' +
        '</div>' +
        '<aside class="sb-side" id="sb-side" aria-label="Inspector"></aside>' +
      '</div>' +
    '</div>';
    buildLibrary();
    wireToolbar();
    wireStage();
    applyView();
  }

  function buildLibrary() {
    var lib = $('#sb-lib');
    var draw = isDraw();
    var html = '<div class="lib-head"><label class="lib-search">' + ui('search') + '<span class="sr-only">Filter components</span>' +
      '<input type="search" id="lib-q" placeholder="Filter components &amp; notes" autocomplete="off"></label></div><div class="lib-list" id="lib-list">';
    html += '<div class="lib-grp"><div class="lib-cat">Notes &amp; Specs</div>';
    NOTE_ORDER.forEach(function (k) {
      var p = NOTE_PRESETS[k];
      html += '<button type="button" class="lib-item lib-note-item" draggable="true" data-note-kind="' + k + '" data-q="' + esc(('note sticky callout spec ' + p.label + ' ' + p.tag + ' ' + p.blurb).toLowerCase()) + '" title="' + esc(p.label + ': ' + p.blurb) + '">' +
        '<span class="lib-ic lib-ic-nt nt-c-' + p.color + '">' + ui(p.icon) + '</span>' +
        '<span class="lib-txt"><span class="lib-name">' + esc(p.label) + '</span><span class="lib-spec" data-spec="' + esc(p.blurb) + '" data-role="' + esc(p.blurb) + '">' + esc(p.blurb) + '</span></span></button>';
    });
    html += '</div>';
    Object.keys(LIB).forEach(function (g) {
      html += '<div class="lib-grp"><div class="lib-cat">' + esc(g) + '</div>';
      LIB[g].forEach(function (c) {
        var spec = c.maxRPS === Infinity ? 'Traffic source' : fmt(c.maxRPS) + '/s \u00b7 ' + c.latency + 'ms \u00b7 $' + c.cost;
        var role = CAT_NAMES[c.cat] || g;
        html += '<button type="button" class="lib-item" draggable="true" data-type="' + c.id + '" data-q="' + esc((c.label + ' ' + g + ' ' + c.blurb).toLowerCase()) + '" title="' + esc(c.label + ': ' + c.blurb) + '">' +
          '<span class="lib-ic" data-cat="' + c.cat + '">' + svgIcon(c.cat) + '</span>' +
          '<span class="lib-txt"><span class="lib-name">' + esc(c.label) + '</span><span class="lib-spec" data-spec="' + esc(spec) + '" data-role="' + esc(role) + '">' + esc(draw ? role : spec) + '</span></span></button>';
      });
      html += '</div>';
    });
    html += '<p class="lib-none" id="lib-none" hidden>No component matches.</p></div>' +
      '<p class="lib-tip">Drag onto the canvas or click to add. Add Requirements, API, Schema, or Sticky Note cards anywhere alongside your architecture.</p>';
    lib.innerHTML = html;
    $('#lib-q').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase(), any = false;
      $$('.lib-grp', lib).forEach(function (g) {
        var n = 0;
        $$('.lib-item', g).forEach(function (it) { var ok = !q || it.getAttribute('data-q').indexOf(q) >= 0; it.hidden = !ok; if (ok) n++; });
        g.hidden = !n; if (n) any = true;
      });
      $('#lib-none').hidden = any;
    });
    lib.addEventListener('dragstart', function (e) {
      var it = e.target.closest && e.target.closest('.lib-item');
      if (!it) return;
      var nk = it.getAttribute('data-note-kind');
      if (nk) {
        e.dataTransfer.setData('text/x-sim-note', nk);
        e.dataTransfer.setData('text/plain', 'note:' + nk);
      } else {
        e.dataTransfer.setData('text/x-sim-type', it.getAttribute('data-type'));
        e.dataTransfer.setData('text/plain', it.getAttribute('data-type'));
      }
      e.dataTransfer.effectAllowed = 'copy';
    });
    lib.addEventListener('click', function (e) {
      var it = e.target.closest('.lib-item');
      if (!it) return;
      var nk = it.getAttribute('data-note-kind');
      if (nk) addNote(nk);
      else clickAdd(it.getAttribute('data-type'));
      document.body.classList.remove('lib-open');
    });
  }

  function wireToolbar() {
    $('#sb-mode-sim').onclick = function () { setMode('simulate'); };
    $('#sb-mode-draw').onclick = function () { setMode('draw'); };
    $('#sb-undo').onclick = undo;
    $('#sb-redo').onclick = redo;
    $('#sb-tidy').onclick = tidy;
    $('#sb-fit').onclick = fitView;
    $('#sb-example').onclick = loadExample;
    $('#sb-share').onclick = function () { copyText(shareUrl(), 'Link copied. Anyone with it can open this design.'); track('sim_share'); };
    $('#sb-help').onclick = function () { openHelp(); };
    $('#sb-run').onclick = function () { startRun(); };
    $('#sb-eval').onclick = evaluateNow;
    var expBtn = $('#sb-export-png'); if (expBtn) expBtn.onclick = exportPng;
    $('#sb-zin').onclick = function () { zoomBy(1.2); };
    $('#sb-zout').onclick = function () { zoomBy(1 / 1.2); };
    $('#sb-zval').onclick = function () { zoomBy(1 / S.view.k); };
    $('#sb-goal').onclick = function () { setSel([]); document.body.classList.add('side-open'); };
    $('#sb-libt').onclick = function () { document.body.classList.toggle('lib-open'); document.body.classList.remove('side-open'); };
    $('#sb-sidet').onclick = function () { document.body.classList.toggle('side-open'); document.body.classList.remove('lib-open'); };
    var nbtn = $('#sb-note-btn'), nmenu = $('#sb-note-menu');
    if (nbtn && nmenu) {
      nbtn.onclick = function (e) {
        e.stopPropagation();
        var open = nmenu.hidden;
        closeMenus();
        if (open) { nmenu.hidden = false; nbtn.setAttribute('aria-expanded', 'true'); var f = $('.sb-mi', nmenu); if (f) f.focus(); }
      };
      nmenu.addEventListener('click', function (e) {
        var it = e.target.closest('.sb-mi');
        if (!it) return;
        closeMenus();
        addNote(it.getAttribute('data-note'));
      });
    }
    var more = $('#sb-more'), menu = $('#sb-menu');
    more.onclick = function (e) { e.stopPropagation(); var open = menu.hidden; closeMenus(); if (open) { menu.hidden = false; more.setAttribute('aria-expanded', 'true'); var f = $('.sb-mi', menu); if (f) f.focus(); } };
    menu.addEventListener('click', function (e) {
      var it = e.target.closest('.sb-mi');
      if (!it) return;
      closeMenus();
      var act = it.getAttribute('data-act');
      if (act === 'png') exportPng();
      else if (act === 'svg') exportSvg();
      else if (act === 'mermaid') copyMermaid();
      else if (act === 'json') exportJson();
      else if (act === 'import') $('#sb-file').click();
      else if (act === 'link') copyText(shareUrl(), 'Link copied.');
      else if (act === 'reset') resetCanvas();
    });
    menu.addEventListener('keydown', function (e) {
      var items = $$('.sb-mi', menu), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape') { closeMenus(); more.focus(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.sb-menu-wrap')) closeMenus(); });
    $('#sb-file').onchange = importJson;
  }
  function closeMenus() {
    var m = $('#sb-menu'); if (m && !m.hidden) { m.hidden = true; var mb = $('#sb-more'); if (mb) mb.setAttribute('aria-expanded', 'false'); }
    var nm = $('#sb-note-menu'); if (nm && !nm.hidden) { nm.hidden = true; var nb = $('#sb-note-btn'); if (nb) nb.setAttribute('aria-expanded', 'false'); }
  }
  function updateUndo() {
    var u = $('#sb-undo'), r = $('#sb-redo');
    if (u) u.disabled = !(S.hi > 0);
    if (r) r.disabled = !(S.hi < S.hist.length - 1);
  }
  function updateBest() {
    var el = $('#sb-best'); if (!el) return;
    var b = bestOf(S.slug);
    el.hidden = !b;
    if (b) { el.textContent = 'Best ' + b.score; el.className = 'sb-best' + (b.score >= 75 ? ' is-pass' : ''); el.title = 'Your best score: ' + b.score + ' (' + b.verdict + ')'; }
  }

  // ───────────────────────── view (pan / zoom) ─────────────────────────
  function stageRect() { return $('#sb-stage').getBoundingClientRect(); }
  function toWorld(cx, cy) { var r = stageRect(); return { x: (cx - r.left - S.view.x) / S.view.k, y: (cy - r.top - S.view.y) / S.view.k }; }
  function applyView() {
    var w = $('#sb-world'), st = $('#sb-stage');
    if (!w || !st) return;
    w.style.transform = 'translate(' + S.view.x + 'px,' + S.view.y + 'px) scale(' + S.view.k + ')';
    var g = 24 * S.view.k;
    st.style.backgroundSize = g + 'px ' + g + 'px';
    st.style.backgroundPosition = S.view.x + 'px ' + S.view.y + 'px';
    var z = $('#sb-zval'); if (z) z.textContent = Math.round(S.view.k * 100) + '%';
  }
  function zoomAt(k, sx, sy) {
    k = clamp(k, 0.25, 2);
    var v = S.view, wx = (sx - v.x) / v.k, wy = (sy - v.y) / v.k;
    v.k = k; v.x = sx - wx * k; v.y = sy - wy * k;
    applyView(); saveViewSoon();
  }
  function zoomBy(f) { var r = stageRect(); zoomAt(S.view.k * f, r.width / 2, r.height / 2); }
  function bbox(nodes, notes) {
    var b = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
    (nodes || []).forEach(function (n) { b.x = Math.min(b.x, n.x); b.y = Math.min(b.y, n.y); b.x2 = Math.max(b.x2, n.x + NODE_W); b.y2 = Math.max(b.y2, n.y + NODE_H); });
    (notes || []).forEach(function (nt) { b.x = Math.min(b.x, nt.x); b.y = Math.min(b.y, nt.y); b.x2 = Math.max(b.x2, nt.x + (nt.w || 264)); b.y2 = Math.max(b.y2, nt.y + (nt.h || 168)); });
    if (!isFinite(b.x)) return { x: 0, y: 0, x2: 200, y2: 120, w: 200, h: 120 };
    b.w = b.x2 - b.x; b.h = b.y2 - b.y;
    return b;
  }
  function fitView() {
    var st = $('#sb-stage');
    if (!st || (!S.design.nodes.length && !(S.design.notes && S.design.notes.length))) return;
    var r = st.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var b = bbox(S.design.nodes, S.design.notes);
    var top = 70, bottom = S.dock ? 230 : 70, side = 60;
    var k = clamp(Math.min((r.width - 2 * side) / Math.max(b.w, 1), (r.height - top - bottom) / Math.max(b.h, 1)), 0.3, 1.1);
    S.view.k = k;
    S.view.x = (r.width - b.w * k) / 2 - b.x * k;
    S.view.y = top + (r.height - top - bottom - b.h * k) / 2 - b.y * k;
    applyView(); saveViewSoon();
  }
  // Bring a node into view. Prefer zooming out to keep the whole design on
  // screen (so a growing chain never scrolls its start away); fall back to the
  // smallest pan that shows the node.
  function ensureVisible(n, preferFit) {
    var r = stageRect(), v = S.view, mx = 40, top = 64, bottom = S.dock ? 240 : 64;
    var nw = n.w || NODE_W, nh = n.h || NODE_H;
    var sx = n.x * v.k + v.x, sy = n.y * v.k + v.y, w = nw * v.k, h = nh * v.k;
    if (sx >= mx && sy >= top && sx + w <= r.width - mx && sy + h <= r.height - bottom) return;
    if (preferFit) {
      var b = bbox(S.design.nodes, S.design.notes);
      var k = Math.min(v.k, (r.width - 2 * mx) / b.w, (r.height - top - bottom) / b.h);
      if (k >= 0.55) {
        v.k = k;
        v.x = (r.width - b.w * k) / 2 - b.x * k;
        v.y = top + (r.height - top - bottom - b.h * k) / 2 - b.y * k;
        applyView(); saveViewSoon();
        return;
      }
    }
    if (sx < mx) v.x += mx - sx; else if (sx + w > r.width - mx) v.x -= sx + w - (r.width - mx);
    if (sy < top) v.y += top - sy; else if (sy + h > r.height - bottom) v.y -= sy + h - (r.height - bottom);
    applyView(); saveViewSoon();
  }

  // ───────────────────────── rendering ─────────────────────────
  function noteEl(id) { return $('.nt[data-nid="' + id + '"]', $('#sb-notes')); }
  function renderNotes() {
    var host = $('#sb-notes');
    if (!host) return;
    var list = S.design.notes || [];
    host.innerHTML = list.map(function (nt) {
      var p = NOTE_PRESETS[nt.kind] || NOTE_PRESETS.note;
      var isSel = S.sel.note === nt.id;
      var isEd = S.editingNote === nt.id;
      var mono = !!p.mono;
      return '<div class="nt nt-c-' + esc(nt.color || p.color) + (isSel ? ' is-sel' : '') + (isEd ? ' is-editing' : '') + '" data-nid="' + nt.id + '"' +
        ' style="transform:translate(' + nt.x + 'px,' + nt.y + 'px);width:' + (nt.w || 264) + 'px;min-height:' + (nt.h || 168) + 'px" tabindex="0">' +
        '<div class="nt-head">' +
          '<span class="nt-tag">' + ui(p.icon) + '<span>' + esc(p.tag) + '</span></span>' +
          (isEd
            ? '<input type="text" class="nt-title-ed" value="' + esc(nt.title || '') + '" maxlength="60" aria-label="Note title">'
            : '<span class="nt-title">' + esc(nt.title || p.title) + '</span>') +
          '<button type="button" class="nt-x" data-act="del-note" tabindex="-1" title="Delete note" aria-label="Delete note">' + ui('x') + '</button>' +
        '</div>' +
        (isEd
          ? '<textarea class="nt-body-ed' + (mono ? ' is-mono' : '') + '" aria-label="Note content">' + esc(nt.body || '') + '</textarea>'
          : '<div class="nt-body' + (mono ? ' is-mono' : '') + '">' + (nt.body ? esc(nt.body) : '<span class="nt-ph">Double-click to add details\u2026</span>') + '</div>') +
        '<span class="nt-resize" data-act="resize-note" title="Drag to resize" aria-hidden="true"></span>' +
      '</div>';
    }).join('');
    if (S.editingNote != null) wireInlineNote(S.editingNote);
  }
  function startInlineNoteEdit(id) {
    var nt = noteById(id);
    if (!nt) return;
    S.sel = { nodes: [], edge: null, note: id };
    S.editingNote = id;
    paintSelection();
    renderNotes();
    renderSide();
    var el = noteEl(id);
    var ta = el && $('.nt-body-ed', el);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function stopInlineNoteEdit(commitChange) {
    if (S.editingNote == null) return;
    S.editingNote = null;
    if (commitChange) commit();
    else renderNotes();
  }
  function wireInlineNote(id) {
    var nt = noteById(id), el = noteEl(id);
    if (!nt || !el) return;
    var ti = $('.nt-title-ed', el), ta = $('.nt-body-ed', el);
    var dirty = false;
    function finish() {
      setTimeout(function () {
        if (!el.contains(document.activeElement) && S.editingNote === id) {
          stopInlineNoteEdit(dirty);
        }
      }, 20);
    }
    if (ti) {
      ti.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      ti.oninput = function () {
        dirty = true;
        nt.title = E.cleanLabel(ti.value) || 'Note';
        var spT = $('#sp-nt-title'); if (spT && document.activeElement !== spT) spT.value = nt.title;
      };
      ti.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (ta) ta.focus(); }
        if (e.key === 'Escape') { e.preventDefault(); stopInlineNoteEdit(dirty); }
      };
      ti.onblur = finish;
    }
    if (ta) {
      ta.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      ta.addEventListener('wheel', function (e) { e.stopPropagation(); });
      ta.oninput = function () {
        dirty = true;
        nt.body = ta.value;
        var spB = $('#sp-nt-body'); if (spB && document.activeElement !== spB) spB.value = nt.body;
      };
      ta.onkeydown = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); stopInlineNoteEdit(dirty); }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); stopInlineNoteEdit(dirty); }
      };
      ta.onblur = finish;
    }
  }
  function liveNode(id) { return S.live && S.res ? S.res.nodes[id] || null : null; }
  function statusWord(r) {
    if (!r) return '';
    if (r.down) return 'down';
    if (r.status === 'unwired') return 'not connected';
    if (r.status === 'idle') return 'no traffic';
    if (r.pullCapped) return 'cannot keep up with its queue';
    return Math.round(r.util * 100) + '% utilised' + (r.status === 'over' ? ', overloaded' : r.status === 'hot' ? ', running hot' : '');
  }
  function renderNodes() {
    var host = $('#sb-nodes');
    if (!host) return;
    var sel = S.sel.nodes, draw = isDraw();
    host.innerHTML = S.design.nodes.map(function (n) {
      var c = compOf(n.type), r = draw ? null : liveNode(n.id), client = c.cat === 'client';
      var st = r ? r.status : 'idle';
      var util = r && isFinite(r.util) ? r.util : 0;
      var lost = draw ? null : S.chaos[n.id], slow = draw ? null : S.slow[n.id];
      var sub = draw
        ? (n.note || CAT_NAMES[c.cat] || c.label)
        : (client ? fmt(S.scale.rps * S.mult) + ' req/s'
          : '\u00d7' + n.instances + ' \u00b7 ' + (r && r.load > 0 ? fmt(r.load) + '/s' : fmt(c.maxRPS) + '/s each'));
      var badge = '';
      if (!draw && r && !client) {
        if (r.down) badge = lost === 'down' ? '' : 'Down';
        else if (r.status === 'unwired') badge = 'Unwired';
        else if (r.load > 0) badge = Math.round(util * 100) + '%';
      }
      var flags = '';
      if (!draw) {
        if (lost === 'down') flags += '<span class="nd-flag is-down">' + ui('skull') + 'Down</span>';
        else if (lost) flags += '<span class="nd-flag is-down">' + ui('skull') + '\u2212' + lost + '</span>';
        if (slow) flags += '<span class="nd-flag is-slow">' + ui('clock') + '+' + slow + 'ms</span>';
        if (r && r.pullCapped) flags += '<span class="nd-flag is-lag">Lagging</span>';
      }
      var aria = labelOf(n) + (labelOf(n) !== c.label ? ' (' + c.label + ')' : '') +
        (draw ? (n.note ? ', ' + n.note : '') : ((client ? ', traffic source' : ', ' + n.instances + ' instance' + (n.instances === 1 ? '' : 's')) + (r && !client ? ', ' + statusWord(r) : '')));
      return '<div class="nd st-' + st + (sel.indexOf(n.id) >= 0 ? ' is-sel' : '') + (client ? ' is-client' : '') + '" data-id="' + n.id + '" data-cat="' + c.cat + '"' +
        ' style="transform:translate(' + n.x + 'px,' + n.y + 'px)" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
        (client && !draw ? '' : '<span class="nd-port nd-in" aria-hidden="true"></span>') +
        '<span class="nd-ic">' + svgIcon(c.cat) + '</span>' +
        '<span class="nd-txt"><span class="nd-name">' + esc(labelOf(n)) + '</span><span class="nd-sub">' + esc(sub) + '</span></span>' +
        (badge ? '<span class="nd-badge">' + badge + '</span>' : '') +
        (!draw && r && !client && r.load > 0 && !r.down ? '<span class="nd-bar" aria-hidden="true"><i style="width:' + Math.min(100, util * 100).toFixed(1) + '%"></i></span>' : '') +
        (draw || client ? '' : '<span class="nd-step"><button type="button" class="nd-sbtn" data-act="dec" tabindex="-1" aria-label="Remove an instance" title="Remove an instance">' + ui('minus') + '</button>' +
          '<button type="button" class="nd-sbtn" data-act="inc" tabindex="-1" aria-label="Add an instance" title="Add an instance">' + ui('plus') + '</button></span>') +
        (flags ? '<span class="nd-flags">' + flags + '</span>' : '') +
        '<span class="nd-port nd-out" data-act="connect" title="Drag to another component to connect" aria-hidden="true"></span>' +
      '</div>';
    }).join('');
    updateEmpty();
    updateStatus();
  }
  function paintSelection() {
    $$('.nd', $('#sb-nodes')).forEach(function (el) { el.classList.toggle('is-sel', S.sel.nodes.indexOf(+el.getAttribute('data-id')) >= 0); });
    $$('.ed', $('#sb-edges')).forEach(function (el) { el.classList.toggle('is-sel', el.getAttribute('data-key') === S.sel.edge); });
    $$('.nt', $('#sb-notes')).forEach(function (el) { el.classList.toggle('is-sel', +el.getAttribute('data-nid') === S.sel.note); });
  }
  function edgeGeom(a, b) {
    var x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
    var dx = Math.max(56, Math.abs(x2 - x1) * 0.5);
    if (x2 < x1 + 20) dx = Math.max(dx, 110);
    return [x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2];
  }
  function bezPath(g) { return 'M' + g[0] + ' ' + g[1] + 'C' + g[2] + ' ' + g[3] + ' ' + g[4] + ' ' + g[5] + ' ' + g[6] + ' ' + g[7]; }
  function bezAt(g, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * g[0] + b * g[2] + c * g[4] + d * g[6], y: a * g[1] + b * g[3] + c * g[5] + d * g[7] };
  }
  function edgeTone(e) {
    if (isDraw() || !S.live || !S.res) return 'idle';
    var f = S.res.flow[e.from + '>' + e.to], v = f ? f.read + f.write : 0;
    if (!(v > 0)) return 'off';
    var rb = S.res.nodes[e.to];
    if (!rb) return 'ok';
    if (rb.status === 'over' || rb.status === 'down') return 'over';
    if (rb.status === 'hot' || rb.pullCapped) return 'hot';
    return 'ok';
  }
  function renderEdges(dragging) {
    var host = $('#sb-edges');
    if (!host) return;
    var m = nodeMap(), html = '', draw = isDraw();
    S.design.edges.forEach(function (e) {
      var a = m[e.from], b = m[e.to];
      if (!a || !b) return;
      var g = edgeGeom(a, b), d = bezPath(g), key = e.from + '>' + e.to;
      var tone = edgeTone(e), isSel = S.sel.edge === key;
      var ca = compOf(a.type).cat, cb = compOf(b.type).cat;
      var async = !!e.dashed || cb === 'queue' || ca === 'queue';
      html += '<g class="ed ed-' + tone + (async ? ' is-async' : '') + (isSel ? ' is-sel' : '') + '" data-key="' + key + '">' +
        '<path class="ed-hit" d="' + d + '"/>' +
        '<path class="ed-line" d="' + d + '" marker-end="url(#sb-ar-' + (isSel ? 'sel' : tone) + ')"/>';
      var lbl = '';
      if (draw) {
        lbl = e.label || (e.kind ? (e.kind === 'read' ? 'Reads' : 'Writes') : '');
      } else {
        var f = S.live && S.res ? S.res.flow[key] : null, v = f ? f.read + f.write : 0;
        if (v > 0) lbl = fmt(v) + '/s';
        if (e.kind) lbl = (e.kind === 'read' ? 'Reads' : 'Writes') + (lbl ? ' \u00b7 ' + lbl : ' only');
        if (!lbl && e.label) lbl = e.label;
      }
      var lw = Math.round(lbl.length * 6.2 + 16);
      // Skip the label where it would not fit between the two cards.
      if (lbl && Math.hypot(g[6] - g[0], g[7] - g[1]) < lw + 44) lbl = '';
      if (lbl) {
        var mid = bezAt(g, 0.5), w = lw;
        html += '<g class="ed-lbl" transform="translate(' + mid.x.toFixed(1) + ' ' + mid.y.toFixed(1) + ')"><rect x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="10"/><text text-anchor="middle" y="4">' + esc(lbl) + '</text></g>';
      }
      html += '</g>';
    });
    host.innerHTML = html;
    if (dragging) { var dg = $('#sb-dots'); if (dg) dg.classList.add('is-hidden'); }
    else rebuildDots();
  }

  // Request particles: a few dots per loaded edge, more for heavier flows,
  // faster and red into an overloaded tier. Off under reduced motion or draw mode.
  var dots = { raf: 0, items: [], last: 0 };
  function stopDots() { if (dots.raf) cancelAnimationFrame(dots.raf); dots.raf = 0; }
  function rebuildDots() {
    var host = $('#sb-dots');
    if (!host) return;
    host.classList.remove('is-hidden');
    stopDots();
    dots.items = [];
    if (isDraw() || !S.live || !S.res || REDUCED) { host.innerHTML = ''; return; }
    var m = nodeMap(), html = '';
    S.design.edges.forEach(function (e) {
      var f = S.res.flow[e.from + '>' + e.to], v = f ? f.read + f.write : 0;
      if (!(v > 0) || !m[e.from] || !m[e.to]) return;
      var g = edgeGeom(m[e.from], m[e.to]);
      var len = Math.hypot(g[6] - g[0], g[7] - g[1]) * 1.15 + 60;
      var n = clamp(Math.round(Math.log(v) / Math.LN10 - 1.5), 1, 5), tone = edgeTone(e);
      for (var i = 0; i < n; i++) {
        dots.items.push({ g: g, t: (i + 0.37 * (dots.items.length % 3)) / n % 1, speed: (tone === 'over' ? 300 : 170) / len });
        html += '<circle r="3" class="dot dot-' + tone + '"/>';
      }
    });
    host.innerHTML = html;
    var els = host.children;
    dots.items.forEach(function (d, i) { d.el = els[i]; });
    if (dots.items.length) { dots.last = 0; dots.raf = requestAnimationFrame(tickDots); }
  }
  function tickDots(ts) {
    var dt = dots.last ? Math.min(0.05, (ts - dots.last) / 1000) : 0.016;
    dots.last = ts;
    for (var i = 0; i < dots.items.length; i++) {
      var d = dots.items[i];
      d.t = (d.t + dt * d.speed) % 1;
      var p = bezAt(d.g, d.t);
      d.el.setAttribute('cx', p.x.toFixed(1));
      d.el.setAttribute('cy', p.y.toFixed(1));
    }
    dots.raf = requestAnimationFrame(tickDots);
  }

  function updateEmpty() {
    var el = $('#sb-empty');
    if (!el) return;
    var empty = S.design.nodes.length <= 1 && !S.design.edges.length && !(S.design.notes && S.design.notes.length);
    el.hidden = !empty;
    if (!empty) return;
    var draw = isDraw();
    el.innerHTML = '<div class="sb-empty-card"><b>' + (draw ? 'Sketch your architecture' : 'Start with the entry point') + '</b>' +
      '<p>' + (draw
        ? 'Click any component in the library to add it to your diagram, add Requirements / API / Schema cards, and drag handles to draw arrows.'
        : 'Click <i>Load Balancer</i> in the library: it lands next to the Client, already connected. Keep clicking components to extend the path, or drag them anywhere.') + '</p>' +
      '<div class="sb-empty-act"><button type="button" class="btn btn-primary" id="sb-empty-lb">' + ui('plus') + 'Add a Load Balancer</button>' +
      '<button type="button" class="btn" id="sb-empty-ex">' + ui('sparkle') + (S.ch.sandbox ? 'Load a starter' : 'Load the example') + '</button></div></div>';
    $('#sb-empty-lb').onclick = function () {
      var client = S.design.nodes.filter(function (n) { return n.type === 'client'; })[0];
      if (client) setSel([client.id], true);
      clickAdd('load-balancer');
    };
    $('#sb-empty-ex').onclick = loadExample;
  }
  function updateStatus() {
    var el = $('#sb-status');
    if (!el) return;
    var n = S.design.nodes.length, e = S.design.edges.length, nt = (S.design.notes || []).length;
    var notePart = nt ? '<span><b>' + nt + '</b> note' + (nt === 1 ? '' : 's') + '</span>' : '';
    if (isDraw()) {
      el.innerHTML = '<span><b>' + n + '</b> component' + (n === 1 ? '' : 's') + '</span><span><b>' + e + '</b> connection' + (e === 1 ? '' : 's') + '</span>' + notePart +
        '<span class="sb-draw-tag" title="Press M to switch to Interactive Simulator">Draw mode</span>';
    } else {
      el.innerHTML = '<span><b>' + n + '</b> component' + (n === 1 ? '' : 's') + '</span><span><b>' + e + '</b> connection' + (e === 1 ? '' : 's') + '</span>' + notePart +
        '<span><b>' + money(E.monthlyCost(S.design)) + '</b>/mo</span>' +
        (S.live ? '<span class="sb-live" title="Results update as you edit">Live</span>' : '');
    }
  }
  function updateGoal() {
    var el = $('#sb-goal');
    if (!el) return;
    var sc = S.scale, r = S.live ? S.res : null;
    var target = fmt(sc.rps * S.mult) + ' req/s' + (sc.p99Budget ? ' \u00b7 P99 \u2264 ' + sc.p99Budget + 'ms' : '');
    var state = '', cls = '';
    if (r && r.hasTraffic) {
      var issues = r.modes.filter(function (m) { return m.sev === 'error'; }).length;
      var ok = r.passed && r.latencyOk;
      cls = ok ? ' is-ok' : ' is-bad';
      state = ok ? ui('check') + 'Holding' : ui('x') + (issues || 1) + ' issue' + ((issues || 1) === 1 ? '' : 's');
    }
    el.className = 'sb-goal' + cls;
    el.innerHTML = '<span class="sb-goal-t">Target</span><span>' + esc(target) + '</span>' + (state ? '<span class="sb-goal-s">' + state + '</span>' : '');
    el.title = r ? 'P99 ' + ms(r.p99) + ', ' + pctTxt(r.errRate) + ' errors. Click for details.' : 'The load your design has to carry';
  }

  // ───────────────────────── interaction ─────────────────────────
  var drag = null, pointers = {};
  function snap(v) { return Math.round(v / GRID) * GRID; }
  function clampW(v) { return clamp(v, -WORLD + 200, WORLD - 400); }
  function nodeEl(id) { return $('.nd[data-id="' + id + '"]', $('#sb-nodes')); }
  function wireStage() {
    var st = $('#sb-stage');
    st.addEventListener('pointerdown', onDown);
    st.addEventListener('wheel', onWheel, { passive: false });
    st.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    st.addEventListener('drop', onDrop);
    st.addEventListener('dblclick', function (e) {
      var ntEl = e.target.closest('.nt');
      if (ntEl) {
        if (e.target.closest('.nt-x') || e.target.closest('.nt-resize')) return;
        startInlineNoteEdit(+ntEl.getAttribute('data-nid'));
        return;
      }
      var el = e.target.closest('.nd');
      if (!el) return;
      setSel([+el.getAttribute('data-id')]);
      document.body.classList.add('side-open');
      var inp = $('#sp-name'); if (inp) { inp.focus(); inp.select(); }
    });
    st.addEventListener('focusin', function (e) {
      var el = e.target.closest && e.target.closest('.nd');
      if (el && !drag && S.sel.nodes.indexOf(+el.getAttribute('data-id')) < 0 && !st.classList.contains('is-pointer')) setSel([+el.getAttribute('data-id')]);
    });
  }
  function onDown(e) {
    var st = $('#sb-stage');
    closeMenus();
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    if (e.target.closest('.nt-title-ed') || e.target.closest('.nt-body-ed')) return;
    st.classList.add('is-pointer');
    setTimeout(function () { st.classList.remove('is-pointer'); }, 0);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]], r = stageRect();
      drag = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: S.view.k,
        mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, vx: S.view.x, vy: S.view.y };
      clearTemp();
      return;
    }
    var t = e.target;
    var sbtn = t.closest('.nd-sbtn');
    if (sbtn) {
      e.preventDefault();
      var nid = +sbtn.closest('.nd').getAttribute('data-id');
      setInstances(nid, sbtn.getAttribute('data-act') === 'inc' ? 1 : -1);
      return;
    }
    var pan = e.button === 1 || S.space;
    var ntEl = !pan && t.closest('.nt');
    if (ntEl) {
      var noteId = +ntEl.getAttribute('data-nid');
      if (t.closest('.nt-x')) {
        e.preventDefault();
        deleteNote(noteId);
        return;
      }
      if (t.closest('.nt-resize')) {
        e.preventDefault();
        var ntR = noteById(noteId);
        if (!ntR) return;
        selectNote(noteId);
        var wr = toWorld(e.clientX, e.clientY);
        drag = { mode: 'note-resize', pid: e.pointerId, id: noteId, sx: wr.x, sy: wr.y, w0: ntR.w || 264, h0: ntR.h || 168, moved: false };
        return;
      }
      e.preventDefault();
      var ntM = noteById(noteId);
      if (!ntM) return;
      if (S.editingNote != null && S.editingNote !== noteId) stopInlineNoteEdit(true);
      selectNote(noteId);
      ntEl.focus({ preventScroll: true });
      var wm = toWorld(e.clientX, e.clientY);
      drag = { mode: 'note', pid: e.pointerId, id: noteId, sx: wm.x, sy: wm.y, x0: ntM.x, y0: ntM.y, moved: false };
      return;
    }
    var el = t.closest('.nd');
    if (!pan && t.closest('.nd-out') && el) {
      e.preventDefault();
      drag = { mode: 'connect', pid: e.pointerId, from: +el.getAttribute('data-id') };
      st.classList.add('is-connecting');
      drawTemp(e);
      return;
    }
    if (!pan && el) {
      e.preventDefault();
      if (S.editingNote != null) stopInlineNoteEdit(true);
      var id = +el.getAttribute('data-id');
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        var i = S.sel.nodes.indexOf(id);
        if (i >= 0) S.sel.nodes.splice(i, 1); else S.sel.nodes.push(id);
        S.sel.edge = null; S.sel.note = null;
        paintSelection(); renderSide();
      } else if (S.sel.nodes.indexOf(id) < 0) setSel([id]);
      el.focus({ preventScroll: true });
      var w = toWorld(e.clientX, e.clientY);
      drag = { mode: 'node', pid: e.pointerId, sx: w.x, sy: w.y, moved: false, id: id,
        orig: S.sel.nodes.map(function (sid) { var n = nodeById(sid); return { n: n, x: n.x, y: n.y }; }) };
      return;
    }
    var edgeG = !pan && t.closest('.ed');
    if (edgeG) { e.preventDefault(); if (S.editingNote != null) stopInlineNoteEdit(true); selectEdge(edgeG.getAttribute('data-key')); return; }
    e.preventDefault();
    if (S.editingNote != null) stopInlineNoteEdit(true);
    st.focus({ preventScroll: true });
    if (!pan && e.shiftKey) {
      drag = { mode: 'marquee', pid: e.pointerId, x0: e.clientX, y0: e.clientY, base: S.sel.nodes.slice() };
    } else {
      drag = { mode: 'pan', pid: e.pointerId, x0: e.clientX, y0: e.clientY, vx: S.view.x, vy: S.view.y, moved: false };
      st.classList.add('is-panning');
    }
  }
  function onMove(e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!drag || !S) return;
    if (drag.mode === 'pinch') {
      var ids = Object.keys(pointers);
      if (ids.length < 2) return;
      var a = pointers[ids[0]], b = pointers[ids[1]], r = stageRect();
      var k = clamp(drag.k0 * Math.hypot(a.x - b.x, a.y - b.y) / drag.d0, 0.25, 2);
      var mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      var wx = (drag.mx - drag.vx) / drag.k0, wy = (drag.my - drag.vy) / drag.k0;
      S.view.k = k; S.view.x = mx - wx * k; S.view.y = my - wy * k;
      applyView();
      return;
    }
    if (e.pointerId !== drag.pid) return;
    if (drag.mode === 'pan') {
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      S.view.x = drag.vx + dx; S.view.y = drag.vy + dy;
      applyView();
    } else if (drag.mode === 'node') {
      var w = toWorld(e.clientX, e.clientY), mdx = w.x - drag.sx, mdy = w.y - drag.sy;
      if (!drag.moved && Math.abs(mdx) + Math.abs(mdy) < 4 / S.view.k) return;
      drag.moved = true;
      drag.orig.forEach(function (o) {
        o.n.x = clampW(snap(o.x + mdx)); o.n.y = clampW(snap(o.y + mdy));
        var el = nodeEl(o.n.id); if (el) el.style.transform = 'translate(' + o.n.x + 'px,' + o.n.y + 'px)';
      });
      renderEdges(true);
    } else if (drag.mode === 'note') {
      var wn = toWorld(e.clientX, e.clientY), ndx = wn.x - drag.sx, ndy = wn.y - drag.sy;
      if (!drag.moved && Math.abs(ndx) + Math.abs(ndy) < 4 / S.view.k) return;
      drag.moved = true;
      var nt = noteById(drag.id);
      if (nt) {
        nt.x = clampW(snap(drag.x0 + ndx)); nt.y = clampW(snap(drag.y0 + ndy));
        var nel = noteEl(nt.id); if (nel) nel.style.transform = 'translate(' + nt.x + 'px,' + nt.y + 'px)';
      }
    } else if (drag.mode === 'note-resize') {
      var wr = toWorld(e.clientX, e.clientY), rdx = wr.x - drag.sx, rdy = wr.y - drag.sy;
      drag.moved = true;
      var ntr = noteById(drag.id);
      if (ntr) {
        ntr.w = clamp(snap(drag.w0 + rdx), 180, 640);
        ntr.h = clamp(snap(drag.h0 + rdy), 100, 560);
        var rel = noteEl(ntr.id);
        if (rel) { rel.style.width = ntr.w + 'px'; rel.style.minHeight = ntr.h + 'px'; }
      }
    } else if (drag.mode === 'connect') {
      drawTemp(e);
      var hit = document.elementFromPoint(e.clientX, e.clientY);
      var tgt = hit && hit.closest && hit.closest('.nd');
      $$('.nd.is-target').forEach(function (x) { if (x !== tgt) x.classList.remove('is-target'); });
      if (tgt && +tgt.getAttribute('data-id') !== drag.from && (isDraw() || !tgt.classList.contains('is-client'))) tgt.classList.add('is-target');
    } else if (drag.mode === 'marquee') {
      var rr = stageRect(), mq = $('#sb-marquee');
      var x1 = Math.min(drag.x0, e.clientX), y1 = Math.min(drag.y0, e.clientY), x2 = Math.max(drag.x0, e.clientX), y2 = Math.max(drag.y0, e.clientY);
      mq.hidden = false;
      mq.style.left = (x1 - rr.left) + 'px'; mq.style.top = (y1 - rr.top) + 'px';
      mq.style.width = (x2 - x1) + 'px'; mq.style.height = (y2 - y1) + 'px';
      var w1 = toWorld(x1, y1), w2 = toWorld(x2, y2);
      var inBox = S.design.nodes.filter(function (n) { return n.x < w2.x && n.x + NODE_W > w1.x && n.y < w2.y && n.y + NODE_H > w1.y; }).map(function (n) { return n.id; });
      S.sel.nodes = drag.base.concat(inBox.filter(function (id) { return drag.base.indexOf(id) < 0; }));
      S.sel.edge = null; S.sel.note = null;
      paintSelection();
    }
  }
  function onUp(e) {
    delete pointers[e.pointerId];
    if (!drag || !S) return;
    var st = $('#sb-stage');
    if (drag.mode === 'pinch') { if (Object.keys(pointers).length < 2) { drag = null; saveViewSoon(); } return; }
    if (e.pointerId !== drag.pid) return;
    var d = drag;
    drag = null;
    if (st) st.classList.remove('is-panning', 'is-connecting');
    if (d.mode === 'pan') {
      if (!d.moved && e.type === 'pointerup') { setSel([]); }
      else saveViewSoon();
    } else if (d.mode === 'node') {
      if (d.moved) { commit(); }
      else { renderSide(); if (window.innerWidth < 1000) document.body.classList.add('side-open'); }
    } else if (d.mode === 'note' || d.mode === 'note-resize') {
      if (d.moved) { commit(); }
      else { renderSide(); if (window.innerWidth < 1000) document.body.classList.add('side-open'); }
    } else if (d.mode === 'connect') {
      clearTemp();
      $$('.nd.is-target').forEach(function (x) { x.classList.remove('is-target'); });
      if (e.type !== 'pointerup') return;
      var hit = document.elementFromPoint(e.clientX, e.clientY);
      var tgt = hit && hit.closest && hit.closest('.nd');
      if (tgt) addEdge(d.from, +tgt.getAttribute('data-id'));
    } else if (d.mode === 'marquee') {
      $('#sb-marquee').hidden = true;
      renderSide();
    }
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  function onWheel(e) {
    if (!S) return;
    e.preventDefault();
    var r = stageRect();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(S.view.k * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025)), e.clientX - r.left, e.clientY - r.top);
    } else {
      var f = e.deltaMode === 1 ? 18 : 1;
      S.view.x -= e.deltaX * f; S.view.y -= e.deltaY * f;
      applyView(); saveViewSoon();
    }
  }
  function onDrop(e) {
    e.preventDefault();
    var w = toWorld(e.clientX, e.clientY);
    var nk = e.dataTransfer.getData('text/x-sim-note');
    var plain = e.dataTransfer.getData('text/plain') || '';
    if (!nk && plain.indexOf('note:') === 0) nk = plain.slice(5);
    if (nk && NOTE_PRESETS[nk]) {
      var p = NOTE_PRESETS[nk];
      addNote(nk, w.x - p.w / 2, w.y - p.h / 2);
      return;
    }
    var type = e.dataTransfer.getData('text/x-sim-type') || plain;
    if (!compOf(type)) return;
    addNode(type, w.x - NODE_W / 2, w.y - NODE_H / 2);
  }
  function drawTemp(e) {
    var a = nodeById(drag.from), p = toWorld(e.clientX, e.clientY), tmp = $('#sb-temp');
    if (!a || !tmp) return;
    var x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, dx = Math.max(50, Math.abs(p.x - x1) * 0.5);
    tmp.setAttribute('d', 'M' + x1 + ' ' + y1 + 'C' + (x1 + dx) + ' ' + y1 + ' ' + (p.x - dx) + ' ' + p.y + ' ' + p.x + ' ' + p.y);
  }
  function clearTemp() { var tmp = $('#sb-temp'); if (tmp) tmp.setAttribute('d', ''); }

  document.addEventListener('keydown', function (e) {
    if (!S || !$('#sb-stage')) return;
    if (document.querySelector('.sim-modal-ov')) return;   // the modal owns the keyboard
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    var mod = e.metaKey || e.ctrlKey, k = e.key;
    var onCanvas = !!(e.target.closest && e.target.closest('#sb-stage'));
    if (k === ' ' && onCanvas) { S.space = true; $('#sb-stage').classList.add('is-space'); e.preventDefault(); return; }
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
    if (mod && (k === 'd' || k === 'D')) { if (S.sel.nodes.length || S.sel.note) { e.preventDefault(); duplicateSel(); } return; }
    if (mod && (k === 'a' || k === 'A') && onCanvas) { e.preventDefault(); S.sel = { nodes: S.design.nodes.map(function (n) { return n.id; }), edge: null, note: null }; paintSelection(); renderSide(); return; }
    if (mod || e.altKey) return;
    var handled = true;
    switch (k) {
      case 'Delete': case 'Backspace': if (S.sel.nodes.length || S.sel.edge || S.sel.note) deleteSel(); else handled = false; break;
      case 'Escape': if (S.sel.nodes.length || S.sel.edge || S.sel.note) setSel([]); else handled = false; closeMenus(); document.body.classList.remove('lib-open', 'side-open'); break;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
        if ((!S.sel.nodes.length && !S.sel.note) || !onCanvas) { handled = false; break; }
        var step = e.shiftKey ? 40 : GRID;
        if (S.sel.note) {
          var snt = noteById(S.sel.note);
          if (snt) {
            if (k === 'ArrowLeft') snt.x -= step; else if (k === 'ArrowRight') snt.x += step; else if (k === 'ArrowUp') snt.y -= step; else snt.y += step;
            snt.x = clampW(snt.x); snt.y = clampW(snt.y);
            touch();
            var fne = noteEl(snt.id); if (fne) fne.focus({ preventScroll: true });
          }
          break;
        }
        S.sel.nodes.forEach(function (id) {
          var n = nodeById(id);
          if (k === 'ArrowLeft') n.x -= step; else if (k === 'ArrowRight') n.x += step; else if (k === 'ArrowUp') n.y -= step; else n.y += step;
          n.x = clampW(n.x); n.y = clampW(n.y);
        });
        touch();
        var fe = S.sel.nodes.length === 1 ? nodeEl(S.sel.nodes[0]) : null; if (fe) fe.focus({ preventScroll: true });
        break;
      case ']': if (!isDraw()) S.sel.nodes.forEach(function (id) { setInstances(id, 1); }); break;
      case '[': if (!isDraw()) S.sel.nodes.forEach(function (id) { setInstances(id, -1); }); break;
      case '=': case '+': zoomBy(1.2); break;
      case '-': case '_': zoomBy(1 / 1.2); break;
      case '0': zoomBy(1 / S.view.k); break;
      case 'f': case 'F': fitView(); break;
      case 'l': case 'L': tidy(); break;
      case 'm': case 'M': setMode(isDraw() ? 'simulate' : 'draw'); break;
      case 'n': case 'N': addNote('note'); break;
      case 'r': case 'R': if (isDraw()) toast('Switch to Simulate mode (M) to run traffic.'); else startRun(); break;
      case 'e': case 'E': if (isDraw()) toast('Switch to Simulate mode (M) to evaluate.'); else evaluateNow(); break;
      case '?': openHelp('keys'); break;
      case 'Enter':
        var ne = e.target.closest && e.target.closest('.nd');
        if (ne) { setSel([+ne.getAttribute('data-id')]); document.body.classList.add('side-open'); var inp = $('#sp-inst') || $('#sp-name'); if (inp) inp.focus(); }
        else handled = false;
        break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === ' ' && S) { S.space = false; var st = $('#sb-stage'); if (st) st.classList.remove('is-space'); }
  });

  // ───────────────────────── mutations ─────────────────────────
  function setSel(ids, silent) {
    S.sel = { nodes: ids.slice(), edge: null, note: null };
    if (silent) return;
    paintSelection();
    renderSide();
  }
  function selectEdge(key) {
    S.sel = { nodes: [], edge: key, note: null };
    paintSelection();
    renderSide();
    if (window.innerWidth < 1000) document.body.classList.add('side-open');
  }
  function selectNote(id) {
    S.sel = { nodes: [], edge: null, note: id };
    paintSelection();
    renderSide();
    if (window.innerWidth < 1000) document.body.classList.add('side-open');
  }
  function addNote(kind, wx, wy) {
    if (!S) return null;
    if (!Array.isArray(S.design.notes)) S.design.notes = [];
    if (S.design.notes.length >= 40) { toast('Note limit reached for one canvas.'); return null; }
    var k = NOTE_PRESETS[kind] ? kind : 'note';
    var p = NOTE_PRESETS[k];
    var x = wx, y = wy;
    if (x == null || y == null) {
      var r = stageRect(), ctr = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      var off = (S.design.notes.length % 5) * 28;
      // Place neatly below existing nodes if possible, or center of screen
      if (S.design.nodes.length && !S.design.notes.length) {
        var b = bbox(S.design.nodes);
        x = b.x; y = b.y2 + 48;
      } else if (S.design.notes.length) {
        var last = S.design.notes[S.design.notes.length - 1];
        x = last.x + (last.w || 264) + 24;
        y = last.y;
      } else {
        x = ctr.x - p.w / 2 + off; y = ctr.y - p.h / 2 + off;
      }
    }
    var nt = {
      id: S.design.nextId++,
      kind: k,
      color: p.color,
      title: p.title,
      body: p.body,
      x: clampW(snap(x)),
      y: clampW(snap(y)),
      w: p.w,
      h: p.h
    };
    S.design.notes.push(nt);
    S.sel = { nodes: [], edge: null, note: nt.id };
    S.editingNote = null;
    commit();
    ensureVisible(nt, false);
    announce(p.label + ' card added');
    return nt;
  }
  function deleteNote(id) {
    if (!S || !Array.isArray(S.design.notes)) return;
    S.design.notes = S.design.notes.filter(function (nt) { return nt.id !== id; });
    if (S.sel.note === id) S.sel.note = null;
    if (S.editingNote === id) S.editingNote = null;
    commit();
    announce('Note deleted');
  }
  function occupied(x, y) {
    return S.design.nodes.some(function (n) { return Math.abs(n.x - x) < NODE_W - 8 && Math.abs(n.y - y) < NODE_H + 8; });
  }
  function addNode(type, x, y, from) {
    var c = compOf(type);
    if (!c) return null;
    if (S.design.nodes.length >= E.MAX_NODES) { toast('That is the component limit for one canvas.'); return null; }
    var n = { id: S.design.nextId++, type: c.id, x: clampW(snap(x)), y: clampW(snap(y)), instances: 1 };
    S.design.nodes.push(n);
    // `from` is one upstream id or several (every box of a parallel tier).
    var froms = from == null ? [] : [].concat(from);
    if (c.cat !== 'client') froms.forEach(function (f) { S.design.edges.push({ from: f, to: n.id }); });
    S.sel = { nodes: [n.id], edge: null, note: null };
    commit();
    announce(c.label + ' added' + (froms.length > 1 ? ' and connected from ' + froms.length + ' boxes' : froms.length ? ' and connected' : ''));
    track('sim_add', { type: c.id });
    return n;
  }
  // A second click on the component that is already selected means "another
  // one of these", not "one after this": App Server three times is three
  // servers side by side behind the same load balancer, not App -> App -> App.
  // The copy takes the same upstream and downstream connections, so it joins
  // the tier as a parallel replica. Chaining still happens for a different
  // component, and a same-type chain can still be drawn by hand.
  function addBeside(src) {
    var c = compOf(src.type);
    if (S.design.nodes.length >= E.MAX_NODES) { toast('That is the component limit for one canvas.'); return null; }
    var x = src.x, y = src.y + 104, guard = 0;
    while (occupied(x, y) && guard++ < 30) y += 104;
    var n = { id: S.design.nextId++, type: c.id, x: clampW(snap(x)), y: clampW(snap(y)), instances: 1 };
    S.design.nodes.push(n);
    var copies = [];
    S.design.edges.forEach(function (e) {
      if (e.to === src.id) copies.push({ from: e.from, to: n.id });
      if (e.from === src.id) copies.push({ from: n.id, to: e.to });
    });
    S.design.edges = S.design.edges.concat(copies);
    S.sel = { nodes: [n.id], edge: null, note: null };
    commit();
    var same = S.design.nodes.filter(function (m) { return m.type === c.id; }).length;
    announce('Another ' + c.label + ' added beside the first, wired the same way');
    toast(same + ' \u00d7 ' + c.label + ', side by side' + (copies.length ? ' and wired the same way' : '') + '. For more capacity in one box, use + on its instances.', 'ok');
    track('sim_add', { type: c.id, beside: 1 });
    return n;
  }
  function clickAdd(type) {
    var c = compOf(type);
    if (!c) return;
    var from = S.sel.nodes.length === 1 ? nodeById(S.sel.nodes[0]) : null;
    if (from && from.type === c.id && c.cat !== 'client') {
      var twin = addBeside(from);
      if (twin) { ensureVisible(twin, true); var te = nodeEl(twin.id); if (te) te.focus({ preventScroll: true }); }
      return;
    }
    if (from && compOf(from.type).cat !== 'client' && c.cat === 'client') from = null;
    var x, y;
    if (from && c.cat !== 'client') {
      x = from.x + 264; y = from.y;
      var siblings = S.design.edges.filter(function (e) { return e.from === from.id; }).length;
      if (siblings) y = from.y + siblings * 104 - (siblings > 1 ? 52 : 0);
      var guard = 0;
      while (occupied(x, y) && guard++ < 30) y += 104;
    } else {
      var r = stageRect(), ctr = toWorld(r.left + r.width / 2, r.top + r.height / 2), k = S.design.nodes.length % 5;
      x = ctr.x - NODE_W / 2 + k * 24; y = ctr.y - NODE_H / 2 + k * 24;
      var g2 = 0;
      while (occupied(x, y) && g2++ < 30) y += 104;
    }
    // The selected box may be one of a tier made by addBeside (same type, same
    // upstreams). The new component sits behind the whole tier, so every
    // member connects to it, not only the one that happened to be selected;
    // otherwise two of three app servers could not reach the cache.
    var ups = from && c.cat !== 'client' ? tierOf(from).map(function (m) { return m.id; }) : null;
    var n = addNode(type, x, y, ups);
    if (n) { ensureVisible(n, true); var el = nodeEl(n.id); if (el) el.focus({ preventScroll: true }); }
  }
  // Boxes of the same type fed by exactly the same upstreams as `node`: the
  // parallel replicas of one tier. A box with no upstream has no tier.
  function tierOf(node) {
    var ups = function (id) { return S.design.edges.filter(function (e) { return e.to === id; }).map(function (e) { return e.from; }).sort().join(','); };
    var key = ups(node.id);
    if (!key) return [node];
    return S.design.nodes.filter(function (m) { return m.type === node.type && ups(m.id) === key; });
  }
  function addEdge(from, to) {
    if (from === to) return;
    var b = nodeById(to);
    if (!b) return;
    if (!isDraw() && compOf(b.type).cat === 'client') { toast('A Client only sends traffic. Connect from it, not into it.'); return; }
    if (S.design.edges.some(function (e) { return e.from === from && e.to === to; })) { toast('Those two are already connected.'); return; }
    S.design.edges.push({ from: from, to: to });
    S.sel = { nodes: [], edge: null, note: null };
    commit();
    announce(labelOf(nodeById(from)) + ' connected to ' + labelOf(b));
  }
  function deleteSel() {
    if (S.sel.note) {
      deleteNote(S.sel.note);
      return;
    }
    if (S.sel.edge) {
      var key = S.sel.edge;
      S.design.edges = S.design.edges.filter(function (e) { return e.from + '>' + e.to !== key; });
      S.sel.edge = null;
      commit();
      announce('Connection deleted');
      return;
    }
    var clients = S.design.nodes.filter(function (n) { return n.type === 'client'; });
    var kill = S.sel.nodes.filter(function (id) {
      var n = nodeById(id);
      return n && (isDraw() || !(n.type === 'client' && clients.length <= 1));
    });
    if (S.sel.nodes.length && !kill.length) { toast('Keep at least one Client: it is where traffic starts.'); return; }
    if (!kill.length) return;
    S.design.nodes = S.design.nodes.filter(function (n) { return kill.indexOf(n.id) < 0; });
    S.design.edges = S.design.edges.filter(function (e) { return kill.indexOf(e.from) < 0 && kill.indexOf(e.to) < 0; });
    S.sel = { nodes: [], edge: null, note: null };
    pruneChaos();
    commit();
    announce(kill.length + ' component' + (kill.length === 1 ? '' : 's') + ' deleted');
  }
  function duplicateSel() {
    if (S.sel.note) {
      var srcN = noteById(S.sel.note);
      if (!srcN) return;
      if ((S.design.notes || []).length >= 40) { toast('Note limit reached for one canvas.'); return; }
      var copyN = Object.assign({}, srcN, { id: S.design.nextId++, x: clampW(srcN.x + 32), y: clampW(srcN.y + 32) });
      S.design.notes.push(copyN);
      S.sel = { nodes: [], edge: null, note: copyN.id };
      commit();
      announce('Note duplicated');
      return;
    }
    var ids = S.sel.nodes.filter(function (id) { var n = nodeById(id); return n && (isDraw() || n.type !== 'client'); });
    if (!ids.length) return;
    if (S.design.nodes.length + ids.length > E.MAX_NODES) { toast('That would pass the component limit.'); return; }
    var map = {}, fresh = [];
    ids.forEach(function (id) {
      var n = nodeById(id), copy = { id: S.design.nextId++, type: n.type, x: clampW(n.x + 32), y: clampW(n.y + 32), instances: n.instances };
      if (n.label) copy.label = n.label;
      if (n.note) copy.note = n.note;
      map[id] = copy.id; fresh.push(copy.id);
      S.design.nodes.push(copy);
    });
    // Keep connections inside the copied group, and inbound ones from outside it.
    S.design.edges.slice().forEach(function (e) {
      var extra = {};
      if (e.kind) extra.kind = e.kind;
      if (e.label) extra.label = e.label;
      if (e.dashed) extra.dashed = true;
      if (map[e.from] && map[e.to]) S.design.edges.push(Object.assign({ from: map[e.from], to: map[e.to] }, extra));
      else if (map[e.to] && !map[e.from]) S.design.edges.push(Object.assign({ from: e.from, to: map[e.to] }, extra));
    });
    S.sel = { nodes: fresh, edge: null, note: null };
    commit();
    announce(fresh.length + ' duplicated');
  }
  function setInstances(id, v, abs) {
    var n = nodeById(id);
    if (!n) return;
    var c = compOf(n.type);
    if (c.maxRPS === Infinity) return;
    var nv = clamp(Math.round(abs ? v : n.instances + v), 1, MAX_INST);
    if (nv === n.instances) return;
    n.instances = nv;
    var lost = S.chaos[id];
    if (lost && lost !== 'down' && lost >= nv) S.chaos[id] = 'down';
    touch();
    refreshInspectorCount(n);
  }
  function setEdgeKind(key, kind) {
    var e = S.design.edges.filter(function (x) { return x.from + '>' + x.to === key; })[0];
    if (!e) return;
    if (kind === 'read' || kind === 'write') e.kind = kind; else delete e.kind;
    commit();
  }
  function reverseEdge(key) {
    var e = S.design.edges.filter(function (x) { return x.from + '>' + x.to === key; })[0];
    if (!e) return;
    var to = nodeById(e.from);
    if (!isDraw() && to && compOf(to.type).cat === 'client') { toast('Traffic cannot flow into a Client.'); return; }
    if (S.design.edges.some(function (x) { return x.from === e.to && x.to === e.from; })) { toast('There is already a connection the other way.'); return; }
    var f = e.from; e.from = e.to; e.to = f;
    S.sel.edge = e.from + '>' + e.to;
    commit();
  }
  function tidy() {
    var pos = E.autoLayout(S.design);
    S.design.nodes.forEach(function (n) { if (pos[n.id]) { n.x = snap(pos[n.id].x); n.y = snap(pos[n.id].y); } });
    commit();
    fitView();
    announce('Layout tidied');
  }
  function starterDesign() {
    var d = { nodes: [
      { id: 1, type: 'client', x: 0, y: 0, instances: 1 }, { id: 2, type: 'load-balancer', x: 0, y: 0, instances: 1 },
      { id: 3, type: 'app-server', x: 0, y: 0, instances: 1 }, { id: 4, type: 'redis', x: 0, y: 0, instances: 1 },
      { id: 5, type: 'postgresql', x: 0, y: 0, instances: 1 }], edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }], nextId: 6 };
    E.sizeDesign(d, S.scale);
    var pos = E.autoLayout(d);
    d.nodes.forEach(function (n) { n.x = pos[n.id].x; n.y = pos[n.id].y + 120; });
    return d;
  }
  function loadExample() {
    var mine = S.design.nodes.filter(function (n) { return n.type !== 'client'; }).length;
    var what = S.ch.sandbox ? 'starter' : 'reference';
    function go() {
      S.design = E.normalizeDesign(S.ch.sandbox ? starterDesign() : E.buildReference(S.ch));
      S.chaos = {}; S.slow = {}; S.sel = { nodes: [], edge: null }; S.live = true;
      commit();
      fitView();
      toast(S.ch.sandbox ? 'Starter loaded and sized to your traffic. Try to break it.' : 'Reference architecture loaded. Run it, then try to break it.', 'ok');
      track('sim_load_example');
    }
    if (mine) confirmModal('Replace your canvas with the ' + what + ' architecture?', 'Your current design stays in the undo history (Ctrl+Z).', 'Replace', go);
    else go();
  }
  function resetCanvas() {
    confirmModal('Reset the canvas?', 'Everything except the Client is removed. You can undo this.', 'Reset', function () {
      S.design = blankDesign(); S.chaos = {}; S.slow = {}; S.sel = { nodes: [], edge: null };
      S.live = false; S.res = null; S.dock = false; S.mult = 1;
      var dk = $('#sb-dock'); if (dk) dk.hidden = true;
      $('#sb-stage').classList.remove('has-dock');
      S.view = { x: 0, y: 0, k: 1 };
      applyView();
      commit();
      updateGoal();
    });
  }
  function setChaos(id, kind) {
    var n = nodeById(id);
    if (!n) return;
    if (kind === 'kill') {
      var cur = S.chaos[id];
      var next = cur === 'down' ? 'down' : (cur | 0) + 1;
      S.chaos[id] = next >= n.instances ? 'down' : next;
    } else if (kind === 'down') {
      if (S.chaos[id] === 'down') delete S.chaos[id]; else S.chaos[id] = 'down';
    } else if (kind === 'slow') {
      if (S.slow[id]) delete S.slow[id]; else S.slow[id] = 150;
    } else { delete S.chaos[id]; delete S.slow[id]; }
    S.live = true;
    stopRun(true);
    renderNodes(); renderEdges(); renderSide();
    scheduleAnalysis(true);
    track('sim_chaos_node', { kind: kind });
  }
  function clearAllChaos() { S.chaos = {}; S.slow = {}; stopRun(true); renderNodes(); renderSide(); scheduleAnalysis(true); }

  // ───────────────────────── side panel ─────────────────────────
  var MULTS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];
  var CAT_NAMES = { client: 'Traffic source', lb: 'Edge / load balancing', cdn: 'Edge cache', compute: 'Compute', db: 'Database', replica: 'Read replica',
    cache: 'In-memory cache', queue: 'Async messaging', blob: 'Object storage', search: 'Search index' };
  function row(k, v) { return '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>'; }
  function renderSide() {
    var side = $('#sb-side');
    if (!side || !S) return;
    // Re-rendering must not steal focus from a control the reader is using.
    var act = document.activeElement, keep = act && side.contains(act) && act.id ? act.id : null;
    var selStart = keep && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    if (S.sel.note && noteById(S.sel.note)) renderNoteInspector(side, noteById(S.sel.note));
    else if (S.sel.edge) renderEdgeInspector(side);
    else if (S.sel.nodes.length === 1 && nodeById(S.sel.nodes[0])) renderNodeInspector(side, nodeById(S.sel.nodes[0]));
    else if (S.sel.nodes.length > 1) renderMulti(side);
    else renderOverview(side);
    if (keep) {
      var el = document.getElementById(keep);
      if (el) { el.focus({ preventScroll: true }); if (selStart && el.setSelectionRange) { try { el.setSelectionRange(selStart[0], selStart[1]); } catch (e) { /* not a text input */ } } }
    }
  }
  function renderNoteInspector(side, nt) {
    var p = NOTE_PRESETS[nt.kind] || NOTE_PRESETS.note;
    var mono = !!p.mono;
    var html = '<div class="sp sp-insp">' +
      '<div class="sp-insp-h"><button type="button" class="sp-back" id="sp-back" aria-label="Back to the overview">' +
        '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<span class="sp-insp-ic nt-c-' + esc(nt.color || p.color) + '">' + ui(p.icon) + '</span>' +
        '<div class="sp-insp-t"><input class="sp-name" id="sp-nt-title" value="' + esc(nt.title || '') + '" maxlength="60" aria-label="Card title" spellcheck="false">' +
        '<span class="sp-type">' + esc(p.label) + ' card</span></div></div>' +
      '<section class="sp-sec"><h2 class="sp-h">Card type</h2>' +
        '<div class="sp-chips">' + NOTE_ORDER.map(function (k) {
          var kp = NOTE_PRESETS[k];
          return '<button type="button" class="sp-chip' + (nt.kind === k ? ' is-on' : '') + '" data-nk="' + k + '">' + esc(kp.tag) + '</button>';
        }).join('') + '</div>' +
      '</section>' +
      '<section class="sp-sec"><h2 class="sp-h">Color</h2>' +
        '<div class="sp-swatches">' + NOTE_COLOR_LIST.map(function (col) {
          return '<button type="button" class="sp-swatch nt-sw-' + col + (nt.color === col ? ' is-on' : '') + '" data-col="' + col + '" aria-label="' + col + ' color" title="' + col + '"></button>';
        }).join('') + '</div>' +
      '</section>' +
      '<section class="sp-sec"><h2 class="sp-h">Content</h2>' +
        '<textarea class="sp-textarea' + (mono ? ' is-mono' : '') + '" id="sp-nt-body" rows="10" placeholder="Write requirements, APIs, schema columns, or notes...">' + esc(nt.body || '') + '</textarea>' +
        '<p class="sp-note">Tip: Double-click any card on the canvas to edit directly inline, or drag its bottom-right corner to resize.</p>' +
      '</section>' +
      '<div class="sp-acts">' +
        '<button type="button" class="btn" id="sp-dup">' + ui('dup') + 'Duplicate</button>' +
        '<button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div>' +
    '</div>';
    side.innerHTML = html;
    $('#sp-back').onclick = function () { setSel([]); };
    var ti = $('#sp-nt-title');
    ti.oninput = function () {
      nt.title = E.cleanLabel(ti.value) || 'Note';
      var el = noteEl(nt.id), nm = el && $('.nt-title', el);
      if (nm) nm.textContent = nt.title;
    };
    ti.onchange = function () { commit(); };
    var ta = $('#sp-nt-body');
    ta.oninput = function () {
      nt.body = ta.value;
      var el = noteEl(nt.id), bd = el && $('.nt-body', el);
      if (bd) bd.textContent = nt.body;
    };
    ta.onchange = function () { commit(); };
    $$('[data-nk]', side).forEach(function (b) {
      b.onclick = function () {
        var nk = b.getAttribute('data-nk');
        var np = NOTE_PRESETS[nk];
        if (!np) return;
        var prevPreset = NOTE_PRESETS[nt.kind];
        nt.kind = nk;
        nt.color = np.color;
        if (prevPreset && nt.title === prevPreset.title) nt.title = np.title;
        if (prevPreset && nt.body === prevPreset.body) nt.body = np.body;
        commit();
      };
    });
    $$('[data-col]', side).forEach(function (b) {
      b.onclick = function () {
        nt.color = b.getAttribute('data-col');
        commit();
      };
    });
    $('#sp-dup').onclick = duplicateSel;
    $('#sp-del').onclick = deleteSel;
  }
  function options(map, cur) {
    return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(map[k].label) + '</option>'; }).join('');
  }
  function renderOverview(side) {
    var ch = S.ch, sc = S.scale;
    if (isDraw()) {
      var titleVal = S.diagramTitle || ch.title;
      var html = '<div class="sp">' +
        '<section class="sp-sec"><h2 class="sp-h">Diagram mode</h2>' +
          '<p class="sp-muted">Clean whiteboard canvas for sketching system architectures without simulation metrics, traffic numbers, or warnings.</p>' +
          '<label class="sp-field"><span>Diagram title</span><input type="text" class="sp-input" id="sp-diag-title" value="' + esc(titleVal) + '" maxlength="60" placeholder="System Architecture"></label>' +
        '</section>' +
        '<section class="sp-sec"><h2 class="sp-h">Add Spec / Note Card</h2>' +
          '<div class="sp-chips">' + NOTE_ORDER.map(function (k) {
            var kp = NOTE_PRESETS[k];
            return '<button type="button" class="sp-chip sp-chip-add" data-add-note="' + k + '">' + ui(kp.icon) + '<span>' + esc(kp.label) + '</span></button>';
          }).join('') + '</div>' +
        '</section>' +
        '<section class="sp-sec"><h2 class="sp-h">Export &amp; layout</h2>' +
          '<div class="sp-exgrid">' +
            '<button type="button" class="btn" id="sp-ex-png">' + ui('image') + 'PNG Image</button>' +
            '<button type="button" class="btn" id="sp-ex-svg">' + ui('image') + 'SVG Vector</button>' +
            '<button type="button" class="btn" id="sp-ex-mmd">' + ui('code') + 'Copy Mermaid</button>' +
            '<button type="button" class="btn" id="sp-ex-tidy">' + ui('layout') + 'Tidy Layout</button>' +
          '</div>' +
        '</section>' +
        '<section class="sp-sec"><h2 class="sp-h">Tips</h2>' +
          '<ul class="sp-reqs">' +
            '<li>Add Requirements, API, DB Schema, or Capacity Math cards from the toolbar or library.</li>' +
            '<li>Double-click any note card to edit inline, or drag its bottom-right corner to resize.</li>' +
            '<li>Press <kbd>M</kbd> anytime to toggle between Draw and Interactive Simulator modes.</li>' +
          '</ul>' +
        '</section>' +
        '<section class="sp-sec">' +
          '<button type="button" class="sp-run" id="sp-go-sim">' + ui('bolt') + '<span>Switch to Interactive Simulator</span></button>' +
        '</section>' +
      '</div>';
      side.innerHTML = html;
      var ti = $('#sp-diag-title');
      if (ti) {
        ti.oninput = function () {
          S.diagramTitle = ti.value.trim();
          var h = $('#sb-title-h'); if (h) h.textContent = S.diagramTitle || ch.title;
        };
      }
      $$('[data-add-note]', side).forEach(function (b) {
        b.onclick = function () { addNote(b.getAttribute('data-add-note')); };
      });
      $('#sp-ex-png').onclick = exportPng;
      $('#sp-ex-svg').onclick = exportSvg;
      $('#sp-ex-mmd').onclick = copyMermaid;
      $('#sp-ex-tidy').onclick = tidy;
      $('#sp-go-sim').onclick = function () { setMode('simulate'); };
      return;
    }
    var html = '<div class="sp">';
    html += '<section class="sp-sec"><h2 class="sp-h">' + (ch.sandbox ? 'Your traffic' : 'The brief') + '</h2>';
    if (!ch.sandbox) {
      html += '<p class="sp-prompt">' + esc(ch.prompt) + '</p>' +
        '<ul class="sp-reqs">' + ch.reqs.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>';
      html += '<dl class="sp-dl">' + row('Traffic', fmt(sc.rps) + ' req/s') + row('Mix', sc.readPct + '% reads \u00b7 ' + (100 - sc.readPct) + '% writes') +
        row('Cache hit', sc.cacheHit + '% of reads') + row('P99 budget', sc.p99Budget ? sc.p99Budget + 'ms' : 'None') +
        (sc.burst ? row('Burst', sc.burst + '\u00d7 for 15s') : '') + '</dl>';
    } else {
      var rpsSteps = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];
      var ri = rpsSteps.reduce(function (b, v, i) { return Math.abs(v - sc.rps) < Math.abs(rpsSteps[b] - sc.rps) ? i : b; }, 0);
      html += '<div class="sp-sliders">' +
        '<label class="sp-field"><span>Traffic <b id="sbx-rps-v">' + fmt(rpsSteps[ri]) + ' req/s</b></span><input type="range" id="sbx-rps" min="0" max="' + (rpsSteps.length - 1) + '" value="' + ri + '"></label>' +
        '<label class="sp-field"><span>Reads <b id="sbx-read-v">' + sc.readPct + '%</b></span><input type="range" id="sbx-read" min="0" max="100" step="5" value="' + sc.readPct + '"></label>' +
        '<label class="sp-field"><span>Cache hit on reads <b id="sbx-hit-v">' + sc.cacheHit + '%</b></span><input type="range" id="sbx-hit" min="0" max="99" value="' + sc.cacheHit + '"></label>' +
        '<label class="sp-field"><span>P99 budget <b id="sbx-p99-v">' + sc.p99Budget + 'ms</b></span><input type="range" id="sbx-p99" min="10" max="500" step="5" value="' + sc.p99Budget + '"></label>' +
      '</div>';
      S._rpsSteps = rpsSteps;
    }
    html += '</section>';
    var mi = MULTS.indexOf(S.mult); if (mi < 0) mi = 3;
    var nChaos = Object.keys(S.chaos).length + Object.keys(S.slow).length;
    html += '<section class="sp-sec"><h2 class="sp-h">Simulation</h2>' +
      '<label class="sp-field"><span>Traffic pattern</span><select id="sp-pattern">' + options(E.PATTERNS, S.pattern) + '</select></label>' +
      '<label class="sp-field"><span>Chaos event at ' + E.CHAOS_AT + 's</span><select id="sp-chaos">' + options(E.CHAOS, S.chaosKind) + '</select></label>' +
      '<label class="sp-field"><span>Load <b id="sp-mult-v">' + S.mult + '\u00d7</b><em id="sp-mult-rps">' + fmt(sc.rps * S.mult) + ' req/s</em></span>' +
        '<input type="range" id="sp-mult" min="0" max="' + (MULTS.length - 1) + '" value="' + mi + '" aria-valuetext="' + S.mult + ' times the target load"></label>' +
      '<button type="button" class="sp-run" id="sp-run">' + ui(S.run && !S.run.done ? 'stop' : 'play') + '<span>' + (S.run && !S.run.done ? 'Stop the run' : 'Run simulation') + '</span></button>' +
      (nChaos ? '<p class="sp-note">' + ui('skull') + nChaos + ' component' + (nChaos === 1 ? ' has' : 's have') + ' chaos applied. <button type="button" class="sp-link" id="sp-clear-chaos">Clear all</button></p>' : '') +
      '</section>';
    html += '<section class="sp-sec" id="sp-results">' + resultsHtml() + '</section>';
    if (!ch.sandbox && ch.ref) {
      html += '<section class="sp-sec sp-learn"><h2 class="sp-h">Go deeper</h2>' +
        '<a href="' + esc(ch.ref.link) + '">' + ui('chevron') + 'Read the ' + esc(ch.title) + ' design</a>' +
        '<button type="button" id="sp-to-draw">' + ui('chevron') + 'Switch to clean Diagram mode</button>' +
        '<button type="button" id="sp-howto">' + ui('chevron') + 'How the traffic model works</button></section>';
    } else {
      html += '<section class="sp-sec sp-learn"><button type="button" id="sp-to-draw">' + ui('chevron') + 'Switch to clean Diagram mode</button>' +
        '<button type="button" id="sp-howto">' + ui('chevron') + 'How the traffic model works</button></section>';
    }
    side.innerHTML = html + '</div>';

    $('#sp-pattern').onchange = function (e) { S.pattern = e.target.value; };
    $('#sp-chaos').onchange = function (e) { S.chaosKind = e.target.value; };
    $('#sp-mult').oninput = function (e) {
      S.mult = MULTS[+e.target.value] || 1;
      $('#sp-mult-v').textContent = S.mult + '\u00d7';
      $('#sp-mult-rps').textContent = fmt(sc.rps * S.mult) + ' req/s';
      e.target.setAttribute('aria-valuetext', S.mult + ' times the target load');
      S.live = true; stopRun(true); updateGoal(); renderNodes(); scheduleAnalysis();
    };
    $('#sp-run').onclick = function () { startRun(); };
    var cc = $('#sp-clear-chaos'); if (cc) cc.onclick = clearAllChaos;
    var td = $('#sp-to-draw'); if (td) td.onclick = function () { setMode('draw'); };
    $('#sp-howto').onclick = function () { openHelp(); };
    wireResults();
    if (ch.sandbox) {
      var sbx = function (id, key, fmtv, map) {
        $('#' + id).oninput = function (e) {
          var v = map ? map(+e.target.value) : +e.target.value;
          S.scale[key] = v;
          $('#' + id + '-v').textContent = fmtv(v);
          var mr = $('#sp-mult-rps'); if (mr) mr.textContent = fmt(S.scale.rps * S.mult) + ' req/s';
          store.set('scsim-sandbox-scale', S.scale);
          S.live = true; stopRun(true); updateGoal(); renderNodes(); scheduleAnalysis();
        };
      };
      sbx('sbx-rps', 'rps', function (v) { return fmt(v) + ' req/s'; }, function (i) { return S._rpsSteps[i]; });
      sbx('sbx-read', 'readPct', function (v) { return v + '%'; });
      sbx('sbx-hit', 'cacheHit', function (v) { return v + '%'; });
      sbx('sbx-p99', 'p99Budget', function (v) { return v + 'ms'; });
    }
  }
  function sevIcon(sev) { return sev === 'error' ? ui('x', 'is-error') : sev === 'warn' ? ui('bolt', 'is-warn') : ui('help', 'is-info'); }
  function resultsHtml() {
    var r = S.live ? S.res : null, sc = S.scale;
    if (!r) {
      return '<h2 class="sp-h">Results</h2><div class="sp-empty">' + ui('play') +
        '<p>Build the request path, then press <b>Run</b> to push ' + fmt(sc.rps) + ' req/s through it. Results then update live as you edit.</p></div>';
    }
    var ok = r.passed && r.latencyOk;
    var errors = r.modes.filter(function (m) { return m.sev === 'error'; }).length;
    var html = '<h2 class="sp-h">' + (S.run && !S.run.done ? 'Running\u2026' : 'Live results') +
      '<span class="sp-pill ' + (ok ? 'is-ok' : 'is-bad') + '">' + (ok ? 'Holding' : (errors || 1) + ' issue' + ((errors || 1) === 1 ? '' : 's')) + '</span></h2>';
    var overBudget = r.budget && r.p99 > r.budget;
    var br = r.breaking;
    html += '<div class="sp-kpis">' +
      kpi('P50', ms(r.p50)) +
      kpi('P99' + (r.budget ? ' / ' + r.budget + 'ms' : ''), ms(r.p99), overBudget ? 'bad' : '') +
      kpi('Errors', pctTxt(r.errRate), r.errRate > E.ERR_OK ? 'bad' : '') +
      kpi('Served', fmt(r.served) + '/s', r.errRate > E.ERR_OK ? 'bad' : '') +
      kpi('Cost / month', r.cost >= 10000 ? '$' + fmt(r.cost) : money(r.cost), '', money(r.cost) + ' per month') +
      kpi('Breaks at', !isFinite(br.rps) ? '\u2014' : fmt(br.rps) + '/s', br.mult < 1 ? 'bad' : br.mult < 1.3 ? 'warn' : '',
        br.node != null && nodeById(br.node) ? 'First to saturate: ' + labelOf(nodeById(br.node)) : '') +
      (r.lagSec > 0.05 ? kpi('Queue lag', r.lagSec >= 1 ? Math.round(r.lagSec) + 's' : r.lagSec.toFixed(1) + 's', r.lagging ? 'bad' : 'warn') : '') +
      '</div>';
    var nChaos = Object.keys(S.chaos).length + Object.keys(S.slow).length;
    if (S.mult !== 1 || nChaos || (S.run && S.run.run.chaos !== 'none')) {
      html += '<p class="sp-note">' + ui('flask') + 'Showing ' + (S.mult !== 1 ? S.mult + '\u00d7 load' : 'the target load') + (nChaos ? ' with chaos applied' : '') +
        '. Evaluate always scores 1\u00d7 with nothing broken.</p>';
    }
    if (r.modes.length) {
      html += '<ul class="sp-issues">' + r.modes.map(function (m, i) {
        return '<li class="sp-issue is-' + m.sev + '"><button type="button" class="sp-issue-b" data-i="' + i + '"' + (m.node != null ? '' : ' data-nonode="1"') + '>' +
          sevIcon(m.sev) + '<span><b>' + esc(m.kind) + '</b><span class="sp-issue-d">' + esc(m.detail) + '</span>' +
          '<span class="sp-issue-f">' + esc(m.fix) + '</span></span></button></li>';
      }).join('') + '</ul>';
    } else {
      html += '<div class="sp-allclear">' + ui('check') + '<p><b>Clean run.</b> Nothing saturated, no single points of failure, latency inside budget. Now try a chaos event, or press <b>Evaluate</b>.</p></div>';
    }
    return html;
  }
  function kpi(label, value, tone, title) {
    return '<div class="sp-kpi' + (tone ? ' is-' + tone : '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }
  function wireResults() {
    $$('.sp-issue-b').forEach(function (b) {
      b.onclick = function () {
        var m = S.res && S.res.modes[+b.getAttribute('data-i')];
        if (!m || m.node == null) return;
        var n = nodeById(m.node);
        if (!n) return;
        setSel([n.id]);
        ensureVisible(n);
        var el = nodeEl(n.id); if (el) { el.classList.add('is-ping'); setTimeout(function () { el.classList.remove('is-ping'); }, 900); }
      };
    });
  }
  function refreshResults() {
    var host = $('#sp-results');
    if (host && !S.sel.nodes.length && !S.sel.edge) { host.innerHTML = resultsHtml(); wireResults(); }
    else if (S.sel.nodes.length === 1 || S.sel.edge) {
      var lv = $('#sp-live');
      if (lv) { lv.innerHTML = S.sel.edge ? edgeLiveHtml(S.sel.edge) : nodeLiveHtml(nodeById(S.sel.nodes[0])); wireLive(); }
    }
  }

  function renderNodeInspector(side, n) {
    var c = compOf(n.type), client = c.cat === 'client', draw = isDraw();
    var html = '<div class="sp sp-insp">' +
      '<div class="sp-insp-h"><button type="button" class="sp-back" id="sp-back" aria-label="Back to the overview" title="Back to the overview">' +
        '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<span class="sp-insp-ic" data-cat="' + c.cat + '">' + svgIcon(c.cat) + '</span>' +
        '<div class="sp-insp-t"><input class="sp-name" id="sp-name" value="' + esc(labelOf(n)) + '" maxlength="40" aria-label="Component name" spellcheck="false">' +
        '<span class="sp-type">' + esc(c.label) + ' \u00b7 ' + esc(CAT_NAMES[c.cat] || c.cat) + '</span></div></div>' +
      '<p class="sp-blurb">' + esc(c.blurb) + '</p>';
    if (draw) {
      html += '<section class="sp-sec"><h2 class="sp-h">Annotation</h2>' +
        '<label class="sp-field"><span>Subtitle / note on card</span>' +
        '<input type="text" class="sp-input" id="sp-note" value="' + esc(n.note || '') + '" maxlength="48" placeholder="' + esc(CAT_NAMES[c.cat] || c.label) + '" spellcheck="false"></label>' +
        '<p class="sp-note">Shown underneath the component title on the canvas and exported diagrams.</p></section>';
      html += '<div class="sp-acts">' +
        '<button type="button" class="btn" id="sp-dup">' + ui('dup') + 'Duplicate</button>' +
        '<button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div>';
      side.innerHTML = html + '</div>';
      $('#sp-back').onclick = function () { setSel([]); };
      var nameD = $('#sp-name');
      nameD.oninput = function () {
        var v = E.cleanLabel(nameD.value);
        if (!v || v === c.label) delete n.label; else n.label = v;
        var el = nodeEl(n.id), nm = el && $('.nd-name', el);
        if (nm) nm.textContent = labelOf(n);
      };
      nameD.onchange = function () { commit(); };
      nameD.onkeydown = function (e) { if (e.key === 'Enter') { nameD.blur(); } if (e.key === 'Escape') { nameD.value = labelOf(n); nameD.blur(); } };
      var noteEl = $('#sp-note');
      noteEl.oninput = function () {
        var v = E.cleanLabel(noteEl.value);
        if (!v) delete n.note; else n.note = v;
        var el = nodeEl(n.id), sb = el && $('.nd-sub', el);
        if (sb) sb.textContent = n.note || CAT_NAMES[c.cat] || c.label;
      };
      noteEl.onchange = function () { commit(); };
      noteEl.onkeydown = function (e) { if (e.key === 'Enter') { noteEl.blur(); } if (e.key === 'Escape') { noteEl.value = n.note || ''; noteEl.blur(); } };
      $('#sp-dup').onclick = duplicateSel;
      $('#sp-del').onclick = deleteSel;
      return;
    }
    if (!client) {
      html += '<section class="sp-sec"><h2 class="sp-h">Instances</h2>' +
        '<div class="sp-inst"><button type="button" class="sp-ibtn" id="sp-dec" aria-label="Remove an instance">' + ui('minus') + '</button>' +
        '<input type="number" id="sp-inst" min="1" max="' + MAX_INST + '" value="' + n.instances + '" aria-label="Instances">' +
        '<button type="button" class="sp-ibtn" id="sp-inc" aria-label="Add an instance">' + ui('plus') + '</button>' +
        '<span class="sp-inst-cost" id="sp-inst-cost">' + money(c.cost * n.instances) + '/mo</span></div>' +
        '<dl class="sp-dl">' + row('Capacity', fmt(c.maxRPS) + '/s each \u00b7 <span id="sp-capt">' + fmt(c.maxRPS * n.instances) + '</span>/s total') +
          row('Latency', c.latency + 'ms median per hop') + row('Price', '$' + c.cost + '/mo per instance') +
          row('Durable', c.durable ? 'Yes: survives a restart' : 'No: in memory or rebuildable') + '</dl></section>';
    } else {
      html += '<section class="sp-sec"><dl class="sp-dl">' + row('Sends', fmt(S.scale.rps * S.mult) + ' req/s') + row('Mix', S.scale.readPct + '% reads') + '</dl>' +
        '<p class="sp-note">Traffic starts here and splits evenly across everything the Client connects to.</p></section>';
    }
    html += '<section class="sp-sec" id="sp-live">' + nodeLiveHtml(n) + '</section>';
    if (!client) {
      var lost = S.chaos[n.id], slow = S.slow[n.id];
      html += '<section class="sp-sec"><h2 class="sp-h">Break it</h2><div class="sp-chaos">' +
        '<button type="button" class="sp-cbtn" id="sp-kill" aria-pressed="' + (!!lost && lost !== 'down') + '"' + (lost === 'down' ? ' disabled' : '') + '>' + ui('skull') +
          '<span>Kill one instance' + (lost && lost !== 'down' ? ' <em>(' + lost + ' of ' + n.instances + ' dead)</em>' : '') + '</span></button>' +
        '<button type="button" class="sp-cbtn" id="sp-down" aria-pressed="' + (lost === 'down') + '">' + ui('x') + '<span>' + (lost === 'down' ? 'Bring it back up' : 'Take it down completely') + '</span></button>' +
        '<button type="button" class="sp-cbtn" id="sp-slow" aria-pressed="' + (!!slow) + '">' + ui('clock') + '<span>' + (slow ? 'Remove the +150ms' : 'Add +150ms latency') + '</span></button>' +
        ((lost || slow) ? '<button type="button" class="sp-link" id="sp-heal">Heal this component</button>' : '') +
        '</div></section>';
    }
    html += '<div class="sp-acts">' +
      (!client ? '<button type="button" class="btn" id="sp-dup">' + ui('dup') + 'Duplicate</button>' : '') +
      '<button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div>';
    side.innerHTML = html + '</div>';

    $('#sp-back').onclick = function () { setSel([]); };
    var name = $('#sp-name');
    name.oninput = function () {
      var v = E.cleanLabel(name.value);
      if (!v || v === c.label) delete n.label; else n.label = v;
      var el = nodeEl(n.id), nm = el && $('.nd-name', el);
      if (nm) nm.textContent = labelOf(n);
    };
    name.onchange = function () { commit(); };
    name.onkeydown = function (e) { if (e.key === 'Enter') { name.blur(); } if (e.key === 'Escape') { name.value = labelOf(n); name.blur(); } };
    if (!client) {
      $('#sp-dec').onclick = function () { setInstances(n.id, -1); };
      $('#sp-inc').onclick = function () { setInstances(n.id, 1); };
      $('#sp-inst').onchange = function (e) { setInstances(n.id, +e.target.value || 1, true); e.target.value = n.instances; };
      $('#sp-kill').onclick = function () { setChaos(n.id, 'kill'); };
      $('#sp-down').onclick = function () { setChaos(n.id, 'down'); };
      $('#sp-slow').onclick = function () { setChaos(n.id, 'slow'); };
      var heal = $('#sp-heal'); if (heal) heal.onclick = function () { setChaos(n.id, 'heal'); };
      $('#sp-dup').onclick = duplicateSel;
    }
    $('#sp-del').onclick = deleteSel;
    wireLive();
  }
  function refreshInspectorCount(n) {
    var inp = $('#sp-inst');
    if (!inp || S.sel.nodes[0] !== n.id) return;
    var c = compOf(n.type);
    if (document.activeElement !== inp) inp.value = n.instances;
    var cost = $('#sp-inst-cost'); if (cost) cost.textContent = money(c.cost * n.instances) + '/mo';
    var cap = $('#sp-capt'); if (cap) cap.textContent = fmt(c.maxRPS * n.instances);
  }
  function nodeLiveHtml(n) {
    if (!n) return '';
    var c = compOf(n.type), r = liveNode(n.id);
    if (!r) return '<h2 class="sp-h">Under load</h2><p class="sp-muted">Run the simulation to see the load this component carries.</p>';
    if (c.cat === 'client') {
      return '<h2 class="sp-h">Under load</h2><dl class="sp-dl">' + row('Reads', fmt(r.read) + '/s') + row('Writes', fmt(r.write) + '/s') + '</dl>';
    }
    var util = isFinite(r.util) ? r.util : 0;
    var html = '<h2 class="sp-h">Under load<span class="sp-pill is-' + (r.down || r.status === 'over' ? 'bad' : r.status === 'hot' || r.pullCapped ? 'warn' : r.load > 0 ? 'ok' : 'idle') + '">' + esc(statusWord(r)) + '</span></h2>';
    if (r.down) return html + '<p class="sp-muted">Every instance is down. Traffic that has another healthy path is routed around it; anything that depends on it fails. Watch the error rate and the tiers that absorb its load.</p>';
    if (r.status === 'unwired') return html + '<p class="sp-muted">Nothing upstream reaches this component, so it carries no traffic and earns no credit. Connect something into its left edge.</p>';
    html += '<div class="sp-meter' + (util > 1 ? ' is-over' : util >= E.HOT_UTIL ? ' is-hot' : '') + '" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(Math.min(util, 1) * 100) + '" aria-label="Utilisation">' +
      '<i style="width:' + Math.min(100, util * 100).toFixed(1) + '%"></i><span>' + Math.round(util * 100) + '% of ' + fmt(r.cap) + '/s</span></div>';
    html += '<dl class="sp-dl">' + row('Reads', fmt(r.read) + '/s') + row('Writes', fmt(r.write) + '/s') +
      (r.served < 1 ? row('Shed', '<span class="is-bad">' + pctTxt(1 - r.served) + ' of its requests</span>') : '') +
      (r.consumer ? row('Pulls', r.pullCapped ? '<span class="is-bad">Cannot keep up with its queue</span>' : 'From a queue at its own pace') : '') + '</dl>';
    var need = c.maxRPS === Infinity || !(r.demand > 0) ? 0 : Math.min(MAX_INST, Math.ceil(r.demand / (E.TARGET_UTIL * c.maxRPS)) + 1);
    if (need && need !== n.instances && S.mult === 1 && !Object.keys(S.chaos).length) {
      html += '<div class="sp-hint">' + ui('sparkle') + '<span>N+1 at \u226475% needs <b>\u00d7' + need + '</b> here.</span>' +
        '<button type="button" class="sp-link" id="sp-size" data-need="' + need + '">Apply</button></div>';
    }
    if (S.res.breaking.node === n.id && isFinite(S.res.breaking.rps)) {
      html += '<p class="sp-note">' + ui('bolt') + 'First tier to break as load grows: at about ' + fmt(S.res.breaking.rps) + ' req/s.</p>';
    }
    return html;
  }
  function wireLive() {
    var b = $('#sp-size');
    if (b) b.onclick = function () { setInstances(S.sel.nodes[0], +b.getAttribute('data-need'), true); renderSide(); };
  }
  function edgeLiveHtml(key) {
    var f = S.live && S.res ? S.res.flow[key] : null;
    if (!S.live || !S.res) return '<p class="sp-muted">Run the simulation to see what flows over this connection.</p>';
    if (!f || !(f.read + f.write > 0)) return '<p class="sp-muted">No traffic uses this connection right now.</p>';
    return '<dl class="sp-dl">' + row('Reads', fmt(f.read) + '/s') + row('Writes', fmt(f.write) + '/s') + '</dl>';
  }
  function renderEdgeInspector(side) {
    var key = S.sel.edge, parts = key.split('>'), a = nodeById(+parts[0]), b = nodeById(+parts[1]);
    var e = S.design.edges.filter(function (x) { return x.from + '>' + x.to === key; })[0];
    if (!a || !b || !e) { S.sel.edge = null; return renderOverview(side); }
    var async = compOf(b.type).cat === 'queue' || compOf(a.type).cat === 'queue';
    if (isDraw()) {
      var presets = ['HTTPS', 'gRPC', 'WebSocket', 'Async', 'Read', 'Write', 'Cache Hit', 'Replication'];
      var isDashed = !!e.dashed;
      side.innerHTML = '<div class="sp sp-insp">' +
        '<div class="sp-insp-h"><button type="button" class="sp-back" id="sp-back" aria-label="Back to the overview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
          '<div class="sp-insp-t"><span class="sp-edge-t">' + esc(labelOf(a)) + ' \u2192 ' + esc(labelOf(b)) + '</span><span class="sp-type">Connection</span></div></div>' +
        '<section class="sp-sec"><h2 class="sp-h">Label</h2>' +
          '<label class="sp-field"><span>Protocol or flow label</span><input type="text" class="sp-input" id="sp-elbl" value="' + esc(e.label || '') + '" maxlength="36" placeholder="e.g. HTTPS, gRPC, Async"></label>' +
          '<div class="sp-chips">' + presets.map(function (p) { return '<button type="button" class="sp-chip" data-preset="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>' +
        '</section>' +
        '<section class="sp-sec"><h2 class="sp-h">Line style</h2>' +
          '<div class="sp-seg" role="group" aria-label="Line style">' +
            '<button type="button" class="sp-seg-b" id="sp-line-solid" aria-pressed="' + (!isDashed) + '">Solid (Sync)</button>' +
            '<button type="button" class="sp-seg-b" id="sp-line-dash" aria-pressed="' + isDashed + '">Dashed (Async)</button>' +
          '</div>' +
        '</section>' +
        '<div class="sp-acts"><button type="button" class="btn" id="sp-rev">' + ui('reset') + 'Reverse</button><button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div>' +
      '</div>';
      $('#sp-back').onclick = function () { setSel([]); };
      var elbl = $('#sp-elbl');
      elbl.oninput = function () {
        var v = E.cleanLabel(elbl.value);
        if (!v) delete e.label; else e.label = v;
        renderEdges();
      };
      elbl.onchange = function () { commit(); };
      elbl.onkeydown = function (ev) { if (ev.key === 'Enter') elbl.blur(); if (ev.key === 'Escape') { elbl.value = e.label || ''; elbl.blur(); } };
      $$('.sp-chip', side).forEach(function (chBtn) {
        chBtn.onclick = function () {
          var v = chBtn.getAttribute('data-preset');
          e.label = (e.label === v) ? undefined : v;
          if (!e.label) delete e.label;
          elbl.value = e.label || '';
          commit();
        };
      });
      $('#sp-line-solid').onclick = function () { delete e.dashed; commit(); };
      $('#sp-line-dash').onclick = function () { e.dashed = true; commit(); };
      $('#sp-rev').onclick = function () { reverseEdge(key); };
      $('#sp-del').onclick = deleteSel;
      return;
    }
    var kind = e.kind || 'auto';
    function opt(v, t, d) {
      return '<label class="sp-radio"><input type="radio" name="sp-kind" value="' + v + '"' + (kind === v ? ' checked' : '') + '><span><b>' + t + '</b><em>' + d + '</em></span></label>';
    }
    side.innerHTML = '<div class="sp sp-insp">' +
      '<div class="sp-insp-h"><button type="button" class="sp-back" id="sp-back" aria-label="Back to the overview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
        '<div class="sp-insp-t"><span class="sp-edge-t">' + esc(labelOf(a)) + ' \u2192 ' + esc(labelOf(b)) + '</span><span class="sp-type">Connection' + (async ? ' \u00b7 asynchronous' : '') + '</span></div></div>' +
      (async ? '<p class="sp-blurb">' + (compOf(b.type).cat === 'queue' ? 'The caller waits only for the enqueue ack. Everything after the queue is off the request path.' : 'A consumer pulling from a queue. It works at its own pace; if it falls behind, the backlog grows instead of requests failing.') + '</p>' : '') +
      '<section class="sp-sec" id="sp-live"><h2 class="sp-h">Flow</h2>' + edgeLiveHtml(key) + '</section>' +
      '<section class="sp-sec"><h2 class="sp-h">Carries</h2><div class="sp-radios">' +
        opt('auto', 'Automatic', 'Reads take one path; writes reach every store wired in.') +
        opt('read', 'Reads only', 'For example a read replica, or a cache-aside lookup.') +
        opt('write', 'Writes only', 'For example an audit log, or a write-behind sink.') +
      '</div></section>' +
      '<div class="sp-acts"><button type="button" class="btn" id="sp-rev">' + ui('reset') + 'Reverse</button><button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div>' +
    '</div>';
    $('#sp-back').onclick = function () { setSel([]); };
    $$('input[name="sp-kind"]').forEach(function (r) { r.onchange = function () { setEdgeKind(key, r.value); }; });
    $('#sp-rev').onclick = function () { reverseEdge(key); };
    $('#sp-del').onclick = deleteSel;
  }
  function renderMulti(side) {
    var n = S.sel.nodes.length, draw = isDraw();
    var cost = S.sel.nodes.reduce(function (s, id) { var x = nodeById(id); return s + (x ? (compOf(x.type).cost || 0) * x.instances : 0); }, 0);
    side.innerHTML = '<div class="sp sp-insp"><div class="sp-insp-h"><button type="button" class="sp-back" id="sp-back" aria-label="Back to the overview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<div class="sp-insp-t"><span class="sp-edge-t">' + n + ' components selected</span><span class="sp-type">' + (draw ? 'Group selection' : money(cost) + '/mo together') + '</span></div></div>' +
      '<p class="sp-blurb">Drag any of them to move the group. Arrow keys nudge' + (draw ? '.' : ', <kbd>[</kbd> and <kbd>]</kbd> change instances on all of them.') + '</p>' +
      '<div class="sp-acts"><button type="button" class="btn" id="sp-dup">' + ui('dup') + 'Duplicate</button><button type="button" class="btn sp-del" id="sp-del">' + ui('trash') + 'Delete</button></div></div>';
    $('#sp-back').onclick = function () { setSel([]); };
    $('#sp-dup').onclick = duplicateSel;
    $('#sp-del').onclick = deleteSel;
  }

  // ───────────────────────── live analysis ─────────────────────────
  var anaTimer = 0;
  function scheduleAnalysis(now) {
    clearTimeout(anaTimer);
    if (!S || isDraw() || !S.live) { if (S && !isDraw()) { S.res = null; updateGoal(); } return; }
    anaTimer = setTimeout(runAnalysis, now ? 0 : 60);
  }
  function runAnalysis() {
    if (!S || !S.live) return;
    if (S.run && !S.run.done) return;    // a timed run owns the canvas
    S.res = E.simulate(S.design, S.scale, { samples: 2500, mult: S.mult, failures: S.chaos, slow: S.slow, statefree: S.ch.statefree });
    paintResults();
  }
  function paintResults() {
    renderNodes(); renderEdges(); refreshResults(); updateGoal(); updateStatus();
  }

  // ───────────────────────── timed runs ─────────────────────────
  function setRunButton(running) {
    var b = $('#sb-run');
    if (b) { b.innerHTML = ui(running ? 'stop' : 'play') + '<span>' + (running ? 'Stop' : 'Run') + '</span>'; b.classList.toggle('is-running', running); }
    var s = $('#sp-run');
    if (s) s.innerHTML = ui(running ? 'stop' : 'play') + '<span>' + (running ? 'Stop the run' : 'Run simulation') + '</span>';
  }
  function startRun() {
    if (!S) return;
    if (S.run && !S.run.done) { stopRun(); return; }
    var hasPath = S.design.edges.some(function (e) { var n = nodeById(e.from); return n && n.type === 'client'; });
    if (!hasPath) { toast('Connect the Client to something first: drag from its right-hand handle.'); return; }
    S.live = true;
    var run = E.makeRun(S.design, S.scale, { pattern: S.pattern, chaos: S.chaosKind, mult: S.mult, failures: S.chaos, slow: S.slow, statefree: S.ch.statefree });
    S.run = { run: run, ticks: [], t: 0, done: false, timer: 0 };
    var wasOpen = S.dock;
    S.dock = true;
    renderDock();
    if (!wasOpen) setTimeout(function () { if (S.design.nodes.length > 1) fitView(); }, 30);
    setRunButton(true);
    track('sim_run', { pattern: S.pattern, chaos: S.chaosKind, mult: S.mult });
    var me = S.run;
    (function step() {
      if (S.run !== me || me.done) return;
      var tk = run.step(me.t);
      me.ticks.push(tk);
      S.res = tk.result;
      paintResults();
      updateDock();
      me.t++;
      if (me.t >= run.dur) { finishRun(); return; }
      me.timer = setTimeout(step, REDUCED ? 0 : 100);
    })();
  }
  function finishRun() {
    var me = S.run;
    me.done = true;
    setRunButton(false);
    updateDock();
    refreshResults();
    var sm = runSummary(me);
    announce('Run finished. ' + sm.text);
    save();
  }
  function stopRun(silent) {
    if (!S || !S.run) return;
    clearTimeout(S.run.timer);
    var wasRunning = !S.run.done;
    S.run.done = true;
    if (wasRunning) S.run.stopped = true;
    setRunButton(false);
    if (silent && wasRunning) S.run.changed = true;
    if (!silent) updateDock();
    else if (S.dock) { var st = $('#dk-state'); if (st) st.textContent = S.run.changed || wasRunning ? 'Design changed: run again to replay' : st.textContent; }
  }
  function runSummary(me) {
    var ticks = me.ticks, budget = S.scale.p99Budget;
    if (!ticks.length) return { text: '', html: '' };
    var peak = ticks[0], worst = ticks[0], lagMax = 0, badFrom = -1, badTo = -1;
    ticks.forEach(function (t) {
      if (t.result.p99 > peak.result.p99) peak = t;
      if (t.result.errRate > worst.result.errRate) worst = t;
      lagMax = Math.max(lagMax, t.result.lagSec);
      var bad = t.result.errRate > E.ERR_OK || (budget && t.result.p99 > budget);
      if (bad) { if (badFrom < 0) badFrom = t.t; badTo = t.t; }
    });
    var last = ticks[ticks.length - 1];
    var recovered = badFrom >= 0 && !(last.result.errRate > E.ERR_OK || (budget && last.result.p99 > budget));
    var parts = [];
    parts.push('Peak P99 ' + ms(peak.result.p99) + ' at ' + peak.t + 's' + (budget ? (peak.result.p99 > budget ? ' (over the ' + budget + 'ms budget)' : ' (inside budget)') : ''));
    parts.push(worst.result.errRate > 0.0005 ? 'worst errors ' + pctTxt(worst.result.errRate) + ' at ' + worst.t + 's' : 'no errors');
    if (lagMax > 0.05) parts.push('queue backlog peaked at ' + (lagMax >= 1 ? Math.round(lagMax) : lagMax.toFixed(1)) + 's');
    var verdict = badFrom < 0 ? 'The design held for the whole run.' : recovered ? 'Degraded from ' + badFrom + 's to ' + badTo + 's, then recovered.' : 'Still failing at the end of the run.';
    var tone = badFrom < 0 ? 'ok' : recovered ? 'warn' : 'bad';
    var text = verdict + ' ' + parts.join(', ') + '.';
    return { text: text, tone: tone, html: '<span class="dk-v is-' + tone + '">' + esc(verdict) + '</span> ' + esc(parts.join(' \u00b7 ')) };
  }
  function renderDock() {
    var dk = $('#sb-dock');
    if (!dk) return;
    dk.hidden = !S.dock;
    $('#sb-stage').classList.toggle('has-dock', !!S.dock);
    if (!S.dock || !S.run) return;
    var run = S.run.run;
    // Plain divs on purpose: core.css styles every bare <header> as the sticky
    // site masthead, and the env banner offsets it.
    dk.innerHTML = '<div class="dk-h">' +
      '<div class="dk-title"><b>' + esc(E.PATTERNS[run.pattern].label) + '</b>' +
        (run.chaos !== 'none' ? '<span class="dk-chaos">' + ui('skull') + esc(E.CHAOS[run.chaos].label) + ' at ' + run.chaosAt + 's' + (run.note ? ': ' + esc(run.note) : '') + '</span>' : '') +
        (S.mult !== 1 ? '<span class="dk-chaos">' + S.mult + '\u00d7 load</span>' : '') + '</div>' +
      '<div class="dk-r"><span class="dk-time" id="dk-time">0s</span><span class="dk-state" id="dk-state"></span>' +
        '<button type="button" class="dk-btn" id="dk-replay">' + ui('play') + '<span>Run again</span></button>' +
        '<button type="button" class="dk-btn dk-x" id="dk-close" aria-label="Close the run panel">' + ui('x') + '</button></div>' +
      '</div>' +
      '<div class="dk-body">' +
        chartShell('tp', 'Throughput') + chartShell('p99', 'P99 latency') + chartShell('err', 'Errors') + chartShell('lag', 'Queue backlog') +
      '</div>' +
      '<div class="dk-sum" id="dk-sum" aria-live="polite"></div>';
    $('#dk-replay').onclick = function () { stopRun(true); startRun(); };
    $('#dk-close').onclick = function () {
      stopRun(true); S.dock = false; dk.hidden = true;
      $('#sb-stage').classList.remove('has-dock');
      if (S.live) scheduleAnalysis(true);
      $('#sb-run').focus();
    };
  }
  function chartShell(id, title) {
    return '<div class="dk-chart"><div class="dk-cap"><span>' + esc(title) + '</span><b id="dk-v-' + id + '">\u2014</b></div>' +
      '<svg id="dk-c-' + id + '" viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label="' + esc(title) + ' over time"></svg></div>';
  }
  function updateDock() {
    if (!S.run || !S.dock) return;
    var me = S.run, run = me.run, ticks = me.ticks, dur = run.dur, budget = S.scale.p99Budget;
    var last = ticks[ticks.length - 1];
    var tm = $('#dk-time'); if (tm) tm.textContent = (last ? last.t + 1 : 0) + 's / ' + dur + 's';
    var st = $('#dk-state');
    if (st) st.textContent = me.done ? (me.stopped ? 'Stopped' : 'Finished') : 'Running';
    if (!last) return;
    function X(t) { return (t / Math.max(1, dur - 1)) * 200; }
    function line(vals, max, cls, dash) {
      if (!vals.length) return '';
      var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + (57 - Math.min(1, v / max) * 52).toFixed(1); }).join('');
      return '<path class="' + cls + '" d="' + d + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + ' vector-effect="non-scaling-stroke"/>';
    }
    function area(vals, max, cls) {
      if (!vals.length) return '';
      var d = 'M0 57' + vals.map(function (v, i) { return 'L' + X(i).toFixed(1) + ' ' + (57 - Math.min(1, v / max) * 52).toFixed(1); }).join('') + 'L' + X(vals.length - 1).toFixed(1) + ' 57Z';
      return '<path class="' + cls + '" d="' + d + '"/>';
    }
    function marks(max) {
      var m = '';
      if (run.pattern === 'spike') m += '<rect class="dk-band" x="' + X(15) + '" y="0" width="' + (X(30) - X(15)) + '" height="60"/>';
      if (run.chaos !== 'none') m += '<line class="dk-mark" x1="' + X(run.chaosAt) + '" x2="' + X(run.chaosAt) + '" y1="0" y2="60" vector-effect="non-scaling-stroke"/>';
      return m;
    }
    var offered = ticks.map(function (t) { return t.result.offered; }), served = ticks.map(function (t) { return t.result.served; });
    var tpMax = Math.max.apply(null, offered.concat([1])) * 1.1;
    var p99 = ticks.map(function (t) { return t.result.p99; });
    var pMax = Math.max(budget || 0, Math.max.apply(null, p99.concat([1]))) * 1.15;
    var errs = ticks.map(function (t) { return t.result.errRate * 100; });
    var eMax = Math.max(5, Math.max.apply(null, errs.concat([0])) * 1.15);
    var lag = ticks.map(function (t) { return t.result.lagSec; });
    var lMax = Math.max(2, Math.max.apply(null, lag.concat([0])) * 1.15);
    var c;
    if ((c = $('#dk-c-tp'))) c.innerHTML = marks() + area(served, tpMax, 'dk-a-ok') + line(offered, tpMax, 'dk-l-dim', true) + line(served, tpMax, 'dk-l-ok');
    if ((c = $('#dk-c-p99'))) c.innerHTML = marks() + (budget ? '<line class="dk-budget" x1="0" x2="200" y1="' + (57 - Math.min(1, budget / pMax) * 52) + '" y2="' + (57 - Math.min(1, budget / pMax) * 52) + '" vector-effect="non-scaling-stroke"/>' : '') + line(p99, pMax, 'dk-l-warn');
    if ((c = $('#dk-c-err'))) c.innerHTML = marks() + area(errs, eMax, 'dk-a-bad') + line(errs, eMax, 'dk-l-bad');
    if ((c = $('#dk-c-lag'))) c.innerHTML = marks() + area(lag, lMax, 'dk-a-info') + line(lag, lMax, 'dk-l-info');
    var r = last.result;
    var v;
    if ((v = $('#dk-v-tp'))) { v.textContent = fmt(r.served) + ' / ' + fmt(r.offered); v.className = r.errRate > E.ERR_OK ? 'is-bad' : ''; }
    if ((v = $('#dk-v-p99'))) { v.textContent = ms(r.p99) + (budget ? ' / ' + budget + 'ms' : ''); v.className = budget && r.p99 > budget ? 'is-bad' : ''; }
    if ((v = $('#dk-v-err'))) { v.textContent = pctTxt(r.errRate); v.className = r.errRate > E.ERR_OK ? 'is-bad' : ''; }
    if ((v = $('#dk-v-lag'))) { v.textContent = r.lagSec > 0.05 ? (r.lagSec >= 1 ? Math.round(r.lagSec) + 's' : r.lagSec.toFixed(1) + 's') : 'None'; v.className = r.lagging ? 'is-bad' : ''; }
    var sum = $('#dk-sum');
    if (sum) sum.innerHTML = me.done && !me.stopped ? runSummary(me).html : (last.active ? '<span class="dk-v is-warn">' + ui('skull') + 'Chaos in progress</span> ' + esc(run.note) : '');
  }

  // ───────────────────────── diagram as SVG (report map + PNG export) ─────────────────────────
  function themeColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { return (cs.getPropertyValue(n) || '').trim() || d; }
    return { bg: v('--bg', '#0d1117'), surface: v('--surface', '#141a22'), surface2: v('--surface-2', '#1b222b'), border: v('--border-strong', '#3a4654'),
      text: v('--text', '#e8eef4'), muted: v('--text-muted', '#9fadba'), dim: v('--text-dim', '#71818f'), accent: v('--accent', '#a5b4fc'),
      ok: v('--success', '#34d399'), warn: v('--warning', '#fbbf24'), bad: v('--danger', '#f87171'),
      font: v('--font-sans', 'system-ui, sans-serif').replace(/"/g, "'") };
  }
  function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; }
  function diagramSvg(design, o) {
    o = o || {};
    var T = themeColors(), res = o.res || null;
    var notes = Array.isArray(design.notes) ? design.notes : [];
    if (!design.nodes.length && !notes.length) return '';
    var pad = o.pad == null ? 40 : o.pad, head = o.title ? 58 : 0, foot = o.footer ? 36 : 0;
    var b = bbox(design.nodes, notes);
    var W = Math.ceil(b.w + pad * 2), H = Math.ceil(b.h + pad * 2 + head + foot);
    var m = {};
    design.nodes.forEach(function (n) { m[n.id] = n; });
    var tone = { ok: T.ok, hot: T.warn, over: T.bad, down: T.bad };
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    var notePal = isLight ? {
      amber: { bg: '#fffbeb', bd: '#f59e0b', tag: '#b45309' },
      blue: { bg: '#eff6ff', bd: '#3b82f6', tag: '#1d4ed8' },
      purple: { bg: '#f5f3ff', bd: '#8b5cf6', tag: '#6d28d9' },
      green: { bg: '#ecfdf5', bd: '#10b981', tag: '#047857' },
      slate: { bg: '#f8fafc', bd: '#64748b', tag: '#334155' }
    } : {
      amber: { bg: '#211c12', bd: '#b45309', tag: '#fbbf24' },
      blue: { bg: '#111b2b', bd: '#2563eb', tag: '#60a5fa' },
      purple: { bg: '#1b1429', bd: '#7c3aed', tag: '#c084fc' },
      green: { bg: '#0f211b', bd: '#059669', tag: '#34d399' },
      slate: { bg: '#161e29', bd: '#475569', tag: '#94a3b8' }
    };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + esc(T.font) + '" role="img" aria-label="Architecture diagram">' +
      '<rect width="100%" height="100%" fill="' + T.bg + '"/>' +
      '<defs><marker id="sbx-a" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6L10 5L0 9.4z" fill="' + T.dim + '"/></marker></defs>';
    if (o.title) s += '<text x="' + pad + '" y="36" fill="' + T.text + '" font-size="19" font-weight="700">' + esc(o.title) + '</text>';
    s += '<g transform="translate(' + (pad - b.x) + ' ' + (pad + head - b.y) + ')">';
    notes.forEach(function (nt) {
      var p = NOTE_PRESETS[nt.kind] || NOTE_PRESETS.note;
      var pal = notePal[nt.color] || notePal.amber;
      var nw = nt.w || 264, nh = nt.h || 168;
      var rawLines = String(nt.body || '').split('\n');
      var maxChars = Math.max(18, Math.floor((nw - 28) / (p.mono ? 6.8 : 6.4)));
      var wrapped = [];
      rawLines.forEach(function (ln) {
        if (!ln) { wrapped.push(''); return; }
        var cur = ln;
        while (cur.length > maxChars) {
          var cut = cur.lastIndexOf(' ', maxChars);
          if (cut < Math.floor(maxChars * 0.4)) cut = maxChars;
          wrapped.push(cur.slice(0, cut));
          cur = cur.slice(cut).replace(/^ /, '');
        }
        wrapped.push(cur);
      });
      var effH = Math.max(nh, 46 + wrapped.length * 16 + 14);
      var cid = 'ntc-' + nt.id;
      s += '<defs><clipPath id="' + cid + '"><rect width="' + nw + '" height="' + effH + '" rx="10"/></clipPath></defs>';
      s += '<g transform="translate(' + nt.x + ' ' + nt.y + ')" clip-path="url(#' + cid + ')">' +
        '<rect width="' + nw + '" height="' + effH + '" rx="10" fill="' + pal.bg + '" stroke="' + pal.bd + '" stroke-width="1.4"/>' +
        '<rect width="' + nw + '" height="32" fill="' + pal.bd + '" fill-opacity="0.14"/>' +
        '<text x="12" y="20" fill="' + pal.tag + '" font-size="10" font-weight="750" letter-spacing="0.06em">' + esc(p.tag) + '</text>' +
        '<text x="' + (18 + p.tag.length * 6.8) + '" y="20" fill="' + T.text + '" font-size="12" font-weight="700">' + esc(trunc(nt.title || p.title, 28)) + '</text>';
      var fontAttr = p.mono ? ' font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"' : '';
      wrapped.forEach(function (ln, idx) {
        s += '<text x="12" y="' + (50 + idx * 16) + '" fill="' + T.text + '" fill-opacity="0.88" font-size="11.5"' + fontAttr + '>' + esc(ln) + '</text>';
      });
      s += '</g>';
    });
    design.edges.forEach(function (e) {
      var a = m[e.from], z = m[e.to];
      if (!a || !z) return;
      var g = edgeGeom(a, z);
      var async = !!e.dashed || compOf(z.type).cat === 'queue' || compOf(a.type).cat === 'queue';
      s += '<path d="' + bezPath(g) + '" fill="none" stroke="' + T.dim + '" stroke-width="2" marker-end="url(#sbx-a)"' + (async ? ' stroke-dasharray="7 5"' : '') + '/>';
      var elbl = e.label || (e.kind ? (e.kind === 'read' ? 'Reads' : 'Writes') : '');
      if (elbl) {
        var mid = bezAt(g, 0.5), lw = Math.round(elbl.length * 6.4 + 16);
        s += '<g transform="translate(' + mid.x.toFixed(1) + ' ' + mid.y.toFixed(1) + ')">' +
          '<rect x="' + (-lw / 2) + '" y="-10" width="' + lw + '" height="20" rx="10" fill="' + T.surface + '" stroke="' + T.border + '" stroke-width="1"/>' +
          '<text text-anchor="middle" y="4" fill="' + T.muted + '" font-size="11" font-weight="600">' + esc(elbl) + '</text></g>';
      }
    });
    design.nodes.forEach(function (n) {
      var c = compOf(n.type), r = o.drawMode ? null : (res && res.nodes[n.id]);
      var stroke = (r && tone[r.status]) || T.border;
      var sub = o.drawMode
        ? (n.note || CAT_NAMES[c.cat] || c.label)
        : (c.cat === 'client' ? 'Traffic source' : '\u00d7' + n.instances + ' \u00b7 ' + (r && r.load > 0 ? Math.round(r.util * 100) + '% \u00b7 ' + fmt(r.load) + '/s' : fmt(c.maxRPS) + '/s each'));
      s += '<g transform="translate(' + n.x + ' ' + n.y + ')">' +
        '<rect width="' + NODE_W + '" height="' + NODE_H + '" rx="12" fill="' + T.surface + '" stroke="' + stroke + '" stroke-width="1.6"/>' +
        '<rect x="12" y="14" width="36" height="36" rx="9" fill="' + T.surface2 + '"/>' +
        '<g transform="translate(18 20)" stroke="' + T.accent + '" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (E.ICONS[c.cat] || '') + '</g>' +
        '<text x="58" y="29" fill="' + T.text + '" font-size="13" font-weight="650">' + esc(trunc(labelOf(n), 16)) + '</text>' +
        '<text x="58" y="46" fill="' + T.muted + '" font-size="11">' + esc(trunc(sub, 22)) + '</text></g>';
    });
    s += '</g>';
    if (o.footer) s += '<text x="' + pad + '" y="' + (H - 15) + '" fill="' + T.dim + '" font-size="12">' + esc(o.footer) + '</text>';
    return s + '</svg>';
  }
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
  function exportSvgString() {
    var draw = isDraw();
    var best = bestOf(S.slug);
    var title = S.diagramTitle || (draw ? S.ch.title : S.ch.title + ' \u00b7 System Design Simulator');
    var footer = draw ? '' : ('systemcraft.in/simulator' + (best ? ' \u00b7 best score ' + best.score + ' (' + best.verdict + ')' : ''));
    return diagramSvg(S.design, { drawMode: draw, res: !draw && S.live ? S.res : null, title: title, footer: footer });
  }
  function exportPng() {
    if (!S.design.nodes.length && !(S.design.notes && S.design.notes.length)) { toast('Add at least one component or note before exporting.'); return; }
    var svg = exportSvgString();
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(2, 8000 / Math.max(img.width, img.height));
      var cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      var cx = cv.getContext('2d');
      cx.scale(scale, scale);
      cx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      cv.toBlob(function (blob) {
        if (!blob) { toast('Could not render the image.'); return; }
        download(blob, 'diagram-' + S.slug + '.png');
        track('sim_export_png');
      }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Could not render the image.'); };
    img.src = url;
  }
  function exportSvg() {
    if (!S.design.nodes.length && !(S.design.notes && S.design.notes.length)) { toast('Add at least one component or note before exporting.'); return; }
    var svg = exportSvgString();
    download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'diagram-' + S.slug + '.svg');
    toast('SVG diagram downloaded.', 'ok');
  }
  function copyMermaid() {
    if (!S.design.nodes.length) { toast('Add at least one component first.'); return; }
    var lines = ['flowchart LR'];
    var cleanMmd = function (t) { return String(t || '').replace(/"/g, "'"); };
    S.design.nodes.forEach(function (n) {
      var sub = n.note ? '<br/>' + n.note : '';
      lines.push('  N' + n.id + '["' + cleanMmd(labelOf(n) + sub) + '"]');
    });
    S.design.edges.forEach(function (e) {
      var a = nodeById(e.from), b = nodeById(e.to);
      if (!a || !b) return;
      var dashed = !!e.dashed || compOf(a.type).cat === 'queue' || compOf(b.type).cat === 'queue';
      var lbl = e.label || (e.kind ? (e.kind === 'read' ? 'Reads' : 'Writes') : '');
      var arrow = dashed ? (lbl ? '-. "' + cleanMmd(lbl) + '" .->' : '-.->') : (lbl ? '-- "' + cleanMmd(lbl) + '" -->' : '-->');
      lines.push('  N' + e.from + ' ' + arrow + ' N' + e.to);
    });
    copyText(lines.join('\n'), 'Mermaid flowchart copied to clipboard.');
  }
  function exportJson() {
    var data = JSON.stringify({ challenge: S.slug, v: SAVE_V, nodes: S.design.nodes, edges: S.design.edges, notes: S.design.notes || [], nextId: S.design.nextId }, null, 2);
    download(new Blob([data], { type: 'application/json' }), 'systemcraft-' + S.slug + '.json');
    track('sim_export_json');
  }
  function importJson(e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 500000) { toast('That file is too large to be a design export.'); return; }
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var raw = JSON.parse(rd.result);
        var d = E.normalizeDesign(raw);
        if (!d.nodes.length && !d.notes.length) throw new Error('empty');
        if (raw.v !== SAVE_V) d.nodes.forEach(function (n) { n.x = Math.round(n.x * 1.7); n.y = Math.round(n.y * 1.15); });
        S.design = d; S.chaos = {}; S.slow = {}; S.sel = { nodes: [], edge: null, note: null }; S.editingNote = null;
        commit(); fitView();
        toast('Design imported' + (raw.challenge && raw.challenge !== S.slug && getChallenge(raw.challenge) ? ' (it was built for ' + getChallenge(raw.challenge).title + ')' : '') + '.', 'ok');
      } catch (err) { toast('That file is not a valid design export.'); }
    };
    rd.readAsText(f);
  }

  // ───────────────────────── modals ─────────────────────────
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])', el)
      .filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
  }
  function openModal(html, o) {
    o = o || {};
    var prev = document.activeElement;
    var ov = document.createElement('div');
    ov.className = 'sim-modal-ov';
    ov.innerHTML = '<div class="sim-modal ' + (o.cls || '') + '" role="dialog" aria-modal="true"' + (o.label ? ' aria-labelledby="' + o.label + '"' : '') + ' tabindex="-1">' + html + '</div>';
    document.body.appendChild(ov);
    document.body.classList.add('sim-modal-open');
    var box = ov.firstChild;
    function onKey(e) {
      if (!ov.parentNode) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        var f = focusables(box);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    function close() {
      if (!ov.parentNode) return;
      ov.remove();
      document.removeEventListener('keydown', onKey, true);
      if (!document.querySelector('.sim-modal-ov')) document.body.classList.remove('sim-modal-open');
      if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
      if (o.onClose) o.onClose();
    }
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    $$('[data-close]', box).forEach(function (b) { b.addEventListener('click', close); });
    setTimeout(function () { var f = o.focus ? $(o.focus, box) : focusables(box)[0]; (f || box).focus({ preventScroll: true }); }, 20);
    return { el: box, close: close };
  }
  function confirmModal(title, body, ok, onOk) {
    var md = openModal('<h2 class="cm-h" id="cm-h">' + esc(title) + '</h2><p class="cm-b">' + esc(body) + '</p>' +
      '<div class="cm-act"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn btn-primary" id="cm-ok">' + esc(ok) + '</button></div>',
      { cls: 'cm', label: 'cm-h', focus: '#cm-ok' });
    $('#cm-ok', md.el).onclick = function () { md.close(); onOk(); };
  }
  function openHelp(section) {
    var dims = E.DIMENSIONS.map(function (d) { return '<li><b>' + esc(d.label) + ' (' + d.weight + ')</b> ' + esc(d.blurb) + '</li>'; }).join('');
    var keys = [
      ['Click a library item', 'Add it. With a component selected, it lands after that one, already connected. The same kind as the selected one lands beside it, wired the same way'],
      ['Drag from a right-hand handle', 'Connect to another component'],
      ['Drag empty canvas / Space + drag', 'Pan'], ['Scroll', 'Pan'], ['Ctrl or \u2318 + scroll, or pinch', 'Zoom'],
      ['Shift + drag on empty canvas', 'Select several'], ['Shift + click', 'Add to the selection'],
      ['Delete / Backspace', 'Delete the selection'], ['Ctrl/\u2318 + Z, Shift + Ctrl/\u2318 + Z', 'Undo, redo'],
      ['Ctrl/\u2318 + D', 'Duplicate'], ['Ctrl/\u2318 + A', 'Select everything'], ['Arrow keys (Shift for bigger steps)', 'Nudge'],
      ['[ and ]', 'One instance fewer or more'], ['M', 'Toggle Simulate / Draw diagram mode'], ['N', 'Add Sticky Note / Spec card'], ['R / E', 'Run, evaluate'], ['L / F', 'Tidy layout, fit to screen'],
      ['+ / - / 0', 'Zoom in, out, reset'], ['?', 'This help'], ['Esc', 'Clear the selection, close panels']
    ].map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var md = openModal(
      '<button type="button" class="rp-x" data-close aria-label="Close">' + ui('x') + '</button>' +
      '<h2 class="hp-h" id="hp-h">How the simulator works</h2>' +
      '<div class="hp-grid">' +
        '<section><h3>How traffic moves</h3><ul class="hp-list">' +
          '<li><b>Reads and writes</b> are split by the challenge\u2019s read percentage and take different paths.</li>' +
          '<li><b>Load balancers and gateways</b> send each request to one child, round-robin, and skip dead ones.</li>' +
          '<li><b>The app tier</b> sends a read down one path, picked evenly across the kinds of thing it is wired to. A write reaches every kind of store it is wired to.</li>' +
          '<li><b>Caches and CDNs</b> answer the hit rate of reads. Misses go to whatever is behind them; a cache beside a database is cache-aside, so the app reads the database on a miss. Writes never hit.</li>' +
          '<li><b>Read replicas</b> share the primary\u2019s reads and never take writes.</li>' +
          '<li><b>Queues</b> are the async boundary: the caller waits for the enqueue ack only. Consumers pull at their own pace, so they never overload; if they cannot keep up, the backlog grows.</li>' +
          '<li>Set a connection to <b>Reads only</b> or <b>Writes only</b> in its inspector to override any of this.</li>' +
        '</ul></section>' +
        '<section><h3>How latency is measured</h3><ul class="hp-list">' +
          '<li>Thousands of sample requests walk your graph. Each hop adds its service time with natural variance, a small chance of a stall (GC pause, retransmit), and queueing delay.</li>' +
          '<li>Queueing follows the M/M/c approximation: flat until a tier passes ~85% busy, then steep. That is why the reference runs every tier at 75% or less.</li>' +
          '<li>P99 is end to end on the synchronous path. More hops means more chances of a stall, so long paths pay at the tail.</li>' +
          '<li>Results are seeded by your design, so the same design always gets the same numbers.</li>' +
        '</ul></section>' +
        '<section><h3>What Evaluate scores</h3><ul class="hp-list">' + dims + '</ul>' +
          '<p class="hp-note">The chaos sweep removes one instance from every loaded tier in turn and replays full traffic. Passing it needs N+1: enough instances that losing any one still leaves headroom.</p></section>' +
        '<section id="hp-keys"><h3>Keyboard and mouse</h3><table class="hp-keys">' + keys + '</table></section>' +
      '</div>', { cls: 'hp', label: 'hp-h' });
    if (section === 'keys') { var k = $('#hp-keys', md.el); if (k) k.scrollIntoView({ block: 'start' }); }
    track('sim_help');
  }
  function maybeOnboard() {
    if (store.get('scsim-onboarded')) return;
    // A first visit straight into a shared design should look at the design.
    if (S.design.nodes.length > 1) { store.set('scsim-onboarded', 1); return; }
    var rps = fmt(S.scale.rps);
    var steps = [
      { h: 'Build it, break it, get scored', b: 'Your goal: an architecture for <b>' + esc(S.ch.title) + '</b> that carries ' + rps + ' req/s inside its latency budget, and keeps going when parts of it die.' },
      { h: '1 \u00b7 Add and connect', b: 'Click a component in the library to add it. If something is selected, the new one lands after it, <b>already connected</b>. Or drag from a component\u2019s right-hand handle onto another.' },
      { h: '2 \u00b7 Run traffic', b: 'Press <b>Run</b>. Reads and writes take their own paths; each tier shows how busy it is, and the run panel charts throughput, P99, errors and queue backlog. Red means overloaded: add instances with <b>+</b>.' },
      { h: '3 \u00b7 Break it', b: 'Pick a chaos event (kill an instance, flush the cache, take the database down) or break any component from its inspector. Queues absorb spikes; single instances do not.' },
      { h: '4 \u00b7 Evaluate', b: 'Scores architecture, scalability, P99, reliability and cost, runs a chaos sweep of every tier, and shows the reference design. Stuck? <b>Example</b> loads the reference ready to run.' }
    ];
    var i = 0;
    track('sim_onboarding_start');
    var md = openModal('<div id="ob"></div>', { cls: 'ob', label: 'ob-h', onClose: function () { store.set('scsim-onboarded', 1); if (i < steps.length - 1) track('sim_onboarding_dismiss', { step: i + 1 }); } });
    function render() {
      var s = steps[i];
      $('#ob', md.el).innerHTML = '<button type="button" class="rp-x" id="ob-x" aria-label="Close">' + ui('x') + '</button>' +
        '<h2 class="ob-h" id="ob-h">' + s.h + '</h2><p class="ob-b">' + s.b + '</p>' +
        '<div class="ob-foot"><div class="ob-dots" aria-hidden="true">' + steps.map(function (_, k) { return '<span class="' + (k === i ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
        '<div class="ob-btns">' + (i > 0 ? '<button type="button" class="btn" id="ob-prev">Back</button>' : '<button type="button" class="btn btn-ghost" id="ob-skip">Skip</button>') +
        (i === steps.length - 1 ? '<button type="button" class="btn" id="ob-ex">Load the example</button>' : '') +
        '<button type="button" class="btn btn-primary" id="ob-next">' + (i === steps.length - 1 ? 'Start building' : 'Next') + '</button></div></div>';
      $('#ob-x', md.el).onclick = md.close;
      var sk = $('#ob-skip', md.el); if (sk) sk.onclick = md.close;
      var pv = $('#ob-prev', md.el); if (pv) pv.onclick = function () { i--; render(); };
      var ex = $('#ob-ex', md.el); if (ex) ex.onclick = function () { track('sim_onboarding_complete', { step: i + 1 }); i = steps.length; md.close(); loadExample(); };
      $('#ob-next', md.el).onclick = function () {
        if (i === steps.length - 1) { track('sim_onboarding_complete', { step: i + 1 }); i = steps.length; md.close(); return; }
        i++; track('sim_onboarding_step', { step: i + 1 }); render(); $('#ob-next', md.el).focus();
      };
    }
    render();
  }

  // ───────────────────────── evaluate ─────────────────────────
  function evaluateNow() {
    if (!S) return;
    var hasPath = S.design.edges.some(function (e) { var n = nodeById(e.from); return n && n.type === 'client'; });
    if (!hasPath) { toast('Build something first: connect the Client to your entry point.'); return; }
    stopRun(true);
    var ev = E.evaluate(S.ch, S.design);
    var prev = bestOf(S.slug), isBest = !prev || ev.score > prev.score;
    if (isBest) store.set('scsim-best:' + S.slug, { score: ev.score, verdict: ev.verdict.t, at: Date.now() });
    if (!S.live) { S.live = true; }
    save();
    updateBest();
    scheduleAnalysis(true);
    showReport(ev, prev, isBest);
    track('sim_evaluate', { score: ev.score, verdict: ev.verdict.t });
  }
  function needsText(cats) {
    var names = cats.map(function (k) { return (CAT_NAMES[k] || k).toLowerCase(); }).join(' or ');
    return 'Needs ' + (/^[aeiou]/.test(names) ? 'an ' : 'a ') + names + ' on the request path, carrying traffic.';
  }
  function ring(score, tone) {
    var c = 2 * Math.PI * 52, off = c * (1 - score / 100);
    return '<svg class="rp-ring is-' + tone + '" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="rp-ring-bg"/>' +
      '<circle cx="60" cy="60" r="52" class="rp-ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>';
  }
  function costHtml(ev) {
    var max = Math.max(ev.cost, ev.refCost) || 1;
    var v = !ev.steady.passed ? 'Cost only counts once the design carries the load: dropping requests is cheap for the wrong reason.'
      : ev.ratio > 2.5 ? 'Far more than it needs to be. Size each tier to its load plus one spare.'
      : ev.ratio > E.COST_SLACK ? 'Noticeably pricier than the reference.'
      : ev.ratio < 0.6 ? 'Cheaper than the reference. If the chaos sweep failed, the saving is missing headroom.'
      : 'In the same range as the reference.';
    return '<section class="rp-sec"><h3>Cost</h3><div class="rp-cost">' +
      '<div><span>Yours</span><span class="rp-cbar"><i style="width:' + (ev.cost / max * 100).toFixed(1) + '%"></i></span><b>' + money(ev.cost) + '/mo</b></div>' +
      '<div><span>Reference</span><span class="rp-cbar"><i class="is-ref" style="width:' + (ev.refCost / max * 100).toFixed(1) + '%"></i></span><b>' + money(ev.refCost) + '/mo</b></div>' +
      '</div><p class="rp-muted">' + esc(v) + '</p></section>';
  }
  function showReport(ev, prev, isBest) {
    var ch = S.ch, st = ev.steady;
    var passed = ev.checks.filter(function (c) { return c.pass; }).length;
    var dims = ev.dims.map(function (d) {
      var tone = d.pct === 100 ? 'ok' : d.pct >= 50 ? 'warn' : 'bad';
      return '<li class="rp-dim"><span class="rp-dim-l">' + esc(d.label) + '</span><span class="rp-dim-bar" role="img" aria-label="' + d.pct + '%"><i class="is-' + tone + '" style="width:' + d.pct + '%"></i></span>' +
        '<span class="rp-dim-v">' + Math.round(d.earned) + '<em>/' + Math.round(d.weight) + '</em></span></li>';
    }).join('');
    var checks = ev.dims.map(function (d) {
      return '<div class="rp-cg"><h4>' + esc(d.label) + '<span>' + d.passed + '/' + d.total + '</span></h4><ul>' + d.checks.map(function (c) {
        return '<li class="' + (c.pass ? 'is-ok' : 'is-no') + '">' + ui(c.pass ? 'check' : 'x') + '<span>' + esc(c.label) +
          (!c.pass && c.note ? '<em>' + esc(c.note) + '</em>' : '') +
          (!c.pass && c.cats ? '<em>' + esc(needsText(c.cats)) + '</em>' : '') +
          '</span></li>';
      }).join('') + '</ul></div>';
    }).join('');
    var sweep;
    if (ev.resilience) {
      sweep = '<section class="rp-sec"><h3>Chaos sweep</h3><p class="rp-muted">Each loaded tier loses one instance in turn while full traffic keeps coming.</p>' +
        '<div class="rp-tablewrap"><table class="rp-table"><thead><tr><th scope="col">Component</th><th scope="col">Instances</th><th scope="col">Errors</th><th scope="col">Result</th></tr></thead><tbody>' +
        ev.resilience.results.map(function (x) {
          var why = x.ok ? 'Survives' : x.inst === 1 ? 'Single point of failure' : x.herd ? 'Thundering herd' : 'No spare capacity';
          return '<tr class="' + (x.ok ? 'is-ok' : 'is-no') + '"><td>' + esc(x.label) + '</td><td>\u00d7' + x.inst + ' \u2192 \u00d7' + (x.inst - 1) + '</td><td>' + pctTxt(x.errRate) + '</td><td>' + ui(x.ok ? 'check' : 'x') + esc(why) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    } else {
      sweep = '<section class="rp-sec"><h3>Chaos sweep</h3><p class="rp-muted">Skipped: a design has to carry the target load before it is worth breaking.</p></section>';
    }
    var burst = ev.burst ? '<p class="rp-muted">' + ev.burst.mult + '\u00d7 burst for 15s: ' + pctTxt(ev.burst.errRate) + ' errors' +
      (ev.burst.drainSec > 0 ? ', backlog clears in ' + (isFinite(ev.burst.drainSec) ? Math.round(ev.burst.drainSec) + 's' : 'never') : '') + '.</p>' : '';
    var modes = st.modes.length ? '<section class="rp-sec"><h3>What to fix</h3><ul class="rp-modes">' + st.modes.map(function (m) {
      return '<li class="is-' + m.sev + '">' + sevIcon(m.sev) + '<span><b>' + esc(m.kind) + '</b> ' + esc(m.detail) + '<em>' + esc(m.fix) + '</em></span></li>';
    }).join('') + '</ul></section>' : '';
    var ref = ch.ref && ev.ref ? '<section class="rp-sec"><h3>Reference architecture</h3><div class="rp-refmap">' + diagramSvg(ev.ref, { pad: 16 }) + '</div>' +
      '<p class="rp-note">' + esc(ch.ref.note) + '</p><div class="rp-links">' +
      '<button type="button" class="btn" id="rp-loadref">' + ui('sparkle') + 'Load it onto the canvas</button>' +
      '<a class="btn btn-ghost" href="' + esc(ch.ref.link) + '">Read the full design &rarr;</a>' +
      '<a class="btn btn-ghost" href="/draw/?d=' + encodeURIComponent(S.slug) + '">Draw it from memory &rarr;</a></div></section>' : '';
    var bestLine = isBest && prev ? ' \u00b7 <b class="rp-best">New best</b> (was ' + prev.score + ')' : (!isBest && prev ? ' \u00b7 your best is ' + prev.score : '');
    var html =
      '<button type="button" class="rp-x" data-close aria-label="Close the report">' + ui('x') + '</button>' +
      '<div class="rp-hero"><div class="rp-score">' + ring(ev.score, ev.verdict.tone) + '<span class="rp-num">' + ev.score + '<em>/100</em></span></div>' +
        '<div class="rp-hero-t"><span class="rp-eyebrow">' + esc(ch.title) + '</span><h2 id="rp-h" class="rp-verdict is-' + ev.verdict.tone + '">' + esc(ev.verdict.t) + '</h2>' +
        '<p class="rp-muted">' + passed + ' of ' + ev.checks.length + ' checks passed' + bestLine + '</p>' +
        '<ul class="rp-dims">' + dims + '</ul></div></div>' +
      '<div class="rp-kpis">' + kpi('P50', ms(st.p50)) + kpi('P99' + (st.budget ? ' / ' + st.budget + 'ms' : ''), ms(st.p99), st.budget && st.p99 > st.budget ? 'bad' : '') +
        kpi('Errors', pctTxt(st.errRate), st.errRate > E.ERR_OK ? 'bad' : '') +
        kpi('Breaks at', isFinite(st.breaking.rps) ? fmt(st.breaking.rps) + '/s' : '\u2014', st.breaking.mult < 1 ? 'bad' : '') +
        kpi('Cost', money(ev.cost) + '/mo', ev.refCost && ev.ratio > E.COST_SLACK ? 'bad' : '') + '</div>' +
      '<section class="rp-sec"><h3>Scorecard</h3><div class="rp-checks">' + checks + '</div>' + burst + '</section>' +
      modes + sweep + (ev.refCost ? costHtml(ev) : '') +
      '<section class="rp-sec rp-ai"><h3>' + ui('sparkle') + 'SensAI review</h3><div class="rp-ai-body" id="rp-ai" aria-live="polite"><span class="rp-ai-loading">Reading your design\u2026</span></div></section>' +
      ref +
      '<div class="rp-foot"><button type="button" class="btn" id="rp-share">' + ui('share') + 'Copy a link to this design</button>' +
        '<button type="button" class="btn btn-primary" data-close>Keep improving</button></div>';
    var md = openModal(html, { cls: 'rp', label: 'rp-h' });
    var lr = $('#rp-loadref', md.el);
    if (lr) lr.onclick = function () { md.close(); loadExample(); };
    $('#rp-share', md.el).onclick = function () { copyText(shareUrl(), 'Link copied.'); track('sim_share', { from: 'report' }); };
    fetchAIReview(ev, $('#rp-ai', md.el));
  }

  function describeForAI(ev) {
    var ch = S.ch, sc = S.scale, st = ev.steady, m = nodeMap();
    var t = 'Challenge: ' + ch.title + '\n' + (ch.prompt ? 'Prompt: ' + ch.prompt + '\n' : '') +
      'Scale: ' + sc.rps + ' req/s, ' + sc.readPct + '% reads, ' + sc.cacheHit + '% cache hit on reads, P99 budget ' + (sc.p99Budget || 'none') + 'ms' + (sc.burst ? ', must absorb a ' + sc.burst + 'x burst' : '') + '\n' +
      (ch.reqs && ch.reqs.length ? 'Requirements: ' + ch.reqs.join(', ') + '\n' : '') + '\nArchitecture:\n';
    S.design.nodes.forEach(function (n) {
      var c = compOf(n.type), r = st.nodes[n.id];
      t += '- ' + labelOf(n) + (labelOf(n) !== c.label ? ' [' + c.label + ']' : '') + (c.maxRPS === Infinity ? '' : ' x' + n.instances) +
        (r && r.load > 0 && c.cat !== 'client' ? ', ' + Math.round(r.util * 100) + '% busy' : '') + (r && !r.reachable && c.cat !== 'client' ? ', NOT CONNECTED' : '') + '\n';
    });
    t += '\nConnections:\n';
    S.design.edges.forEach(function (e) { if (m[e.from] && m[e.to]) t += '- ' + labelOf(m[e.from]) + ' -> ' + labelOf(m[e.to]) + (e.kind ? ' (' + e.kind + 's only)' : '') + '\n'; });
    t += '\nScore: ' + ev.score + '/100 (' + ev.verdict.t + '). ' + ev.dims.map(function (d) { return d.label + ' ' + d.passed + '/' + d.total; }).join(', ') + '\n';
    t += 'Failed checks: ' + (ev.checks.filter(function (c) { return !c.pass; }).map(function (c) { return c.label; }).join('; ') || 'none') + '\n';
    t += 'Simulation: P50 ' + Math.round(st.p50) + 'ms, P99 ' + Math.round(st.p99) + 'ms, errors ' + (st.errRate * 100).toFixed(1) + '%, cost $' + ev.cost + '/mo' + (ev.refCost ? ' vs reference $' + ev.refCost : '') + '\n';
    if (st.modes.length) t += 'Findings: ' + st.modes.map(function (x) { return x.kind + (x.node != null && m[x.node] ? ' (' + labelOf(m[x.node]) + ')' : ''); }).join(', ') + '\n';
    if (ev.resilience) {
      var bad = ev.resilience.results.filter(function (x) { return !x.ok; });
      t += 'Chaos sweep: ' + (bad.length ? bad.map(function (x) { return 'losing one ' + x.label + ' -> ' + (x.errRate * 100).toFixed(0) + '% errors'; }).join('; ') : 'survives losing any one instance') + '\n';
    }
    return t;
  }
  // Parsing lives in assets/js/md-render.js, shared with ai-chat, the judge,
  // the draw review and the AI-coding panels. This surface used to parse bold,
  // code and bullets but not italic or headings, so "*why it matters*" and
  // "## Heading" in a design review arrived as raw punctuation.
  var SIM_MD_OPTS = {
    bullet: function (c) { return '<span class="ai-li">' + c + '</span>'; },
    ordered: function (n, c) { return '<span class="ai-li"><strong>' + n + '.</strong> ' + c + '</span>'; },
    heading: function (lvl, t) { return '<strong class="ai-h">' + t + '</strong>'; },
  };
  function formatAIText(str) {
    // Without the shared module, fall back to escaped plain text.
    if (!window.SCMarkdown) return esc(String(str == null ? '' : str)).replace(/\n/g, '<br>');
    return window.SCMarkdown.render(str, SIM_MD_OPTS);
  }
  function fetchAIReview(ev, body) {
    if (!body) return;
    var api = (window.SC_OG || 'https://systemcraft-og.shaswat-kumar03.workers.dev') + '/chat';
    var headers = Object.assign({ 'Content-Type': 'application/json' }, window.scAuthHeader ? window.scAuthHeader() : {});
    fetch(api, {
      method: 'POST', headers: headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Review my system design like a senior interviewer. Give 3-5 specific, actionable bullet points: what to fix first and why, referring to my actual components and the simulation numbers. If the design is strong, say so briefly and suggest one follow-up question an interviewer would ask.' }],
        pageContext: describeForAI(ev),
        pageTitle: 'System Design Simulator - ' + S.ch.title,
        pageUrl: '/simulator/?c=' + S.slug,
        feature: 'design-review'
      })
    }).then(function (res) {
      // A Pro refusal is not an outage, and must not read like one. og-worker
      // answers 403 pro_required unless the caller holds Pro; the score, the
      // scorecard and the chaos sweep above it all stay free.
      if (res.status === 403) {
        return res.json().catch(function () { return null; }).then(function (g) {
          if (g && g.error === 'pro_required') {
            body.innerHTML = '<div class="sim-pro-required"><strong>AI design review is part of Pro.</strong>' +
              '<span>Your score, scorecard and chaos sweep above stay free.</span><a href="/pro/" class="sim-pro-cta">See plans</a></div>';
          } else body.innerHTML = '<em class="rp-muted">AI review unavailable right now.</em>';
        });
      }
      if (!res.ok || !res.body) { body.innerHTML = '<em class="rp-muted">AI review unavailable right now.</em>'; return; }
      body.innerHTML = '';
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '', full = '';
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) { if (!full) body.innerHTML = '<em class="rp-muted">No feedback came back. Try again in a moment.</em>'; return; }
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop() || '';
          lines.forEach(function (line) {
            line = line.trim();
            if (line.indexOf('data: ') !== 0) return;
            var data = line.slice(6);
            if (data === '[DONE]') return;
            try { var p = JSON.parse(data); if (p.content) { full += p.content; body.innerHTML = formatAIText(full); } } catch (e) { /* partial frame */ }
          });
          return pump();
        });
      }
      return pump();
    }).catch(function () { body.innerHTML = '<em class="rp-muted">Could not reach the AI reviewer.</em>'; });
  }

  // ───────────────────────── start ─────────────────────────
  window.addEventListener('beforeunload', function () { if (S) save(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
