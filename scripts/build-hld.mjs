// Build clean standalone HLD revision sheets and SystemCraft offline pages
// into public/hld/ and public/hld/systemcraft/ so the in-app HLD Lab can embed them.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_HLD = path.join(ROOT, "public", "hld");
const OUT_SC = path.join(OUT_HLD, "systemcraft");
const DATA_FILE = path.join(ROOT, "src", "hld-data.js");

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

/* ----------------- 1. Standalone Revision Sheets from /hld ----------------- */
const REVISION_SHEETS = [
  {
    id: "rider-matching",
    slug: "rider-matching",
    out: "rider-matching.html",
    file: "/hld/rider-matching.html",
    src: path.join(ROOT, "hld", "H3 + Redis Rider Matching — Revision Sheet_files", "saved_resource.html"),
    frame: true,
    icon: "Radar",
    title: "H3 + Redis Rider Matching",
    fullTitle: "H3 + Redis Rider Matching — Revision Sheet",
    category: "Mobility & Logistics",
    source: "Revision Sheet",
    tagline: "Match an accepted order to the nearest available rider in under a second — hexagonal geo-indexing, shard-aware Redis structures, and k-ring expansion.",
    sections: ["Architecture", "Capacity Plan", "Geohash vs H3", "Redis Model", "Match Algorithm", "Consistency & Failures", "Edge Cases", "Alternatives", "Interview Playbook"],
    chips: ["Uber H3", "geohash", "GEOSEARCH", "k-ring", "Lua lock", "sharding"],
  },
  {
    id: "notification-system",
    slug: "notification-system",
    out: "notification-system.html",
    file: "/hld/notification-system.html",
    src: path.join(ROOT, "hld", "Notification System — Revision Sheet_files", "saved_resource.html"),
    frame: true,
    icon: "BellRing",
    title: "Multi-Channel Notification System",
    fullTitle: "Multi-Channel Notification System — Revision Sheet",
    category: "Social & Real-Time",
    source: "Revision Sheet",
    tagline: "Push, SMS and email at millions per second — at-least-once delivery, idempotency keys, vendor rate limits and flash-sale-sized fan-out.",
    sections: ["Requirements", "Architecture", "Request Sequence", "Data Models", "Reliability", "Scaling", "Data Store Choice", "Rate Limits", "Capacity Plan", "Observability", "Security", "Multi-Region & DR", "Alternatives", "Playbook"],
    chips: ["Kafka", "idempotency", "fan-out", "at-least-once", "DLQ", "Cassandra"],
  },
  {
    id: "job-scheduler",
    slug: "job-scheduler",
    out: "job-scheduler.html",
    file: "/hld/job-scheduler.html",
    src: path.join(ROOT, "hld", "job-scheduler.html"),
    frame: false,
    icon: "CalendarClock",
    title: "Distributed Job Scheduler",
    fullTitle: "Distributed Job Scheduler — Revision Sheet",
    category: "Distributed Infrastructure",
    source: "Revision Sheet",
    tagline: "Cron jobs and billions of executions a day — timing wheels, distributed leases, SKIP LOCKED vs CDC, sharding and tiered storage.",
    sections: ["Requirements", "Architecture", "Data Model", "Timing Wheel & Lease", "Due-Job Queries", "Sharding", "Partitioning", "Tiered Storage", "Fault Tolerance", "Capacity Plan", "Alternatives", "Playbook"],
    chips: ["timing wheel", "lease", "SKIP LOCKED", "CDC", "partitioning", "tiered storage"],
  },
  {
    id: "hotel-booking",
    slug: "hotel-booking",
    out: "hotel-booking.html",
    file: "/hld/hotel-booking.html",
    src: path.join(ROOT, "hld", "hotel-booking.html"),
    frame: false,
    icon: "Hotel",
    title: "Hotel Booking System",
    fullTitle: "Hotel Booking System — Revision Sheet",
    category: "E-Commerce & Booking",
    source: "Revision Sheet",
    tagline: "Never sell the same room-night twice — date-range inventory, Redis TTL holds over a CAS-enforced DB, hold-pay-confirm saga, search read path and OTA channel management.",
    sections: ["Requirements", "Architecture", "Data Model", "Availability & Concurrency", "Booking Lifecycle", "Search & Read Path", "Distribution & OTA", "Sharding", "Capacity Plan", "Fault Tolerance", "Alternatives", "Playbook"],
    chips: ["oversell prevention", "TTL hold", "CHECK invariant", "ARI/VCR", "idempotency", "shard locality"],
  },
  {
    id: "kafka",
    slug: "kafka",
    out: "kafka.html",
    file: "/hld/kafka.html",
    src: path.join(ROOT, "hld", "kafka.html"),
    frame: false,
    icon: "Workflow",
    title: "Apache Kafka",
    fullTitle: "Apache Kafka — End-to-End Architectural Deep Dive",
    category: "Distributed Infrastructure",
    source: "Revision Sheet",
    tagline: "The distributed event streaming platform end to end — append-only log, zero-copy I/O, partitions and key routing, offset commits, rebalancing, exactly-once transactions, ISR replication, KRaft and production tuning.",
    sections: ["What Kafka Is", "Core Architecture", "Log-Centric File System", "Partitions", "Producers & Consumers", "Consumer Groups", "Offsets & Commits", "Exactly-Once", "Replication & ISR", "Priority Messages", "Retention & Tiered Storage", "Streams/Schema/DLQ", "KRaft", "Production Deployment", "Tuning Matrix", "Playbook", "Recap"],
    chips: ["partitions", "__consumer_offsets", "EOS", "ISR", "KRaft", "zero-copy"],
  },
  {
    id: "payments",
    slug: "payments",
    out: "payments.html",
    file: "/hld/payments.html",
    src: path.join(ROOT, "hld", "payments.html"),
    frame: false,
    icon: "Landmark",
    title: "Payment System",
    fullTitle: "Payment System — Architectural Deep Dive",
    category: "Fintech & Payments",
    source: "Revision Sheet",
    tagline: "Charge exactly once across systems you don't control — idempotency keys, the unknown-state problem, auth/capture/settle lifecycle, double-entry ledger, reconciliation, PSP adapters and hot-account sharding.",
    sections: ["Requirements", "Architecture", "Data Model", "Lifecycle", "Idempotency", "Timeouts & Unknowns", "Ledger", "Reconciliation", "Refunds & Disputes", "Tokens & PSPs", "Events & Webhooks", "Sharding", "Capacity Plan", "Security & PCI", "Alternatives", "Playbook", "Cheat Sheet"],
    chips: ["idempotency", "UNKNOWN state", "double-entry", "settlement", "3DS", "hot accounts"],
  },
];

/* ----------------- 2. SystemCraft HLD Catalog Config ----------------- */
const SYSTEMCRAFT_CONFIG = {
  AdSystem: {
    kebab: "ad-system",
    category: "E-Commerce & Booking",
    icon: "Target",
    title: "Ad Serving & Auction System",
    chips: ["RTB", "Sub-100ms", "Redis", "Kafka", "CTR Prediction", "Aerospike"],
  },
  BookMyShow: {
    kebab: "bookmyshow",
    category: "E-Commerce & Booking",
    icon: "Ticket",
    title: "BookMyShow / Ticketmaster",
    chips: ["Seat Locking", "Redis TTL", "PostgreSQL", "Idempotency", "Kafka", "CDN"],
  },
  CartSystem: {
    kebab: "cart-management-system",
    category: "E-Commerce & Booking",
    icon: "ShoppingCart",
    title: "Cart Management System",
    chips: ["DynamoDB", "Session State", "Stock Hold", "Eventual Consistency", "TTL", "Redis"],
  },
  ChatGPT: {
    kebab: "chatgpt",
    category: "Cloud & AI",
    icon: "Bot",
    title: "ChatGPT / AI Token Streaming",
    chips: ["Token Streaming", "WebSockets", "SSE", "GPU Scheduling", "KV Cache", "Rate Limiter"],
  },
  ChatSystem: {
    kebab: "whatsapp-chat-system",
    category: "Social & Real-Time",
    icon: "MessageSquare",
    title: "WhatsApp / iMessage Chat System",
    chips: ["WebSockets", "Cassandra", "E2E Encryption", "Presence", "Message ACK", "Push Notification"],
  },
  DelayedTriggerService: {
    kebab: "delayed-trigger-service",
    category: "Distributed Infrastructure",
    icon: "Clock",
    title: "Delayed Trigger Service",
    chips: ["Timing Wheel", "Cassandra", "SQS Delay", "Lease Lock", "Idempotency", "Worker Pool"],
  },
  DigitalWallet: {
    kebab: "digital-wallet",
    category: "Fintech & Payments",
    icon: "Wallet",
    title: "Digital Wallet (PhonePe / Venmo)",
    chips: ["Double-Entry", "ACID", "Idempotency", "Reconciliation", "PostgreSQL", "2PC"],
  },
  DistributedCache: {
    kebab: "distributed-cache",
    category: "Distributed Infrastructure",
    icon: "Database",
    title: "Distributed Cache (Redis Cluster)",
    chips: ["Consistent Hashing", "Virtual Nodes", "LRU Eviction", "Gossip Protocol", "Slot Sharding"],
  },
  Dropbox: {
    kebab: "dropbox",
    category: "Cloud & AI",
    icon: "HardDrive",
    title: "Dropbox / File Storage & Sync",
    chips: ["Block Chunking", "Deduplication", "Content Addressable", "S3", "Sync Protocol"],
  },
  EcommercePlatform: {
    kebab: "ecommerce-platform",
    category: "E-Commerce & Booking",
    icon: "ShoppingBag",
    title: "E-Commerce Platform (Amazon / Flipkart)",
    chips: ["Inventory Hold", "Order Saga", "Flash Sales", "Kafka", "PostgreSQL", "CQRS"],
  },
  FreightBidding: {
    kebab: "real-time-bidding",
    category: "Mobility & Logistics",
    icon: "Activity",
    title: "Real-Time Bidding Platform",
    chips: ["Sub-50ms Bids", "In-Memory State", "WebSockets", "Auction Clearing", "Redis"],
  },
  FreightLogistics: {
    kebab: "freight-logistics",
    category: "Mobility & Logistics",
    icon: "Truck",
    title: "Freight Logistics Platform",
    chips: ["Route Optimization", "Geofencing", "Driver Match", "GPS Streaming", "Time Windows"],
  },
  GoogleDocs: {
    kebab: "google-docs",
    category: "Cloud & AI",
    icon: "FileText",
    title: "Google Docs Collaborative Editing",
    chips: ["OT / CRDT", "WebSockets", "Redis Pub/Sub", "Snapshotting", "Version History"],
  },
  ImageProcessing: {
    kebab: "image-processing-microservice",
    category: "Streaming & Media",
    icon: "Image",
    title: "Image Processing Microservice",
    chips: ["Async Pipeline", "S3 Events", "Worker Queue", "Thumbnail Resizing", "CDN Cache"],
  },
  Instagram: {
    kebab: "instagram",
    category: "Social & Real-Time",
    icon: "Camera",
    title: "Instagram Photo Sharing & Feed",
    chips: ["Fan-Out On Write", "Hybrid Feed", "Object Store", "CDN", "Cassandra", "Redis Timeline"],
  },
  JobScheduler: {
    kebab: "distributed-job-scheduler",
    category: "Distributed Infrastructure",
    icon: "CalendarClock",
    title: "Distributed Job Scheduler (SystemCraft)",
    chips: ["Cron Parsing", "Leader Election", "Zookeeper", "Distributed Lock", "Worker Heartbeats"],
  },
  KeyValueStore: {
    kebab: "key-value-store",
    category: "Distributed Infrastructure",
    icon: "Layers",
    title: "Distributed Key-Value Store",
    chips: ["LSM-Tree", "SSTables", "WAL", "Consistent Hashing", "Quorum Consensus", "Compaction"],
  },
  Leaderboard: {
    kebab: "real-time-leaderboard",
    category: "Cloud & AI",
    icon: "Trophy",
    title: "Real-Time Gaming Leaderboard",
    chips: ["Redis Sorted Sets", "ZREVRANK", "SkipList", "Sharded Buckets", "Kafka Ingestion"],
  },
  MessageQueue: {
    kebab: "distributed-message-queue-kafka",
    category: "Distributed Infrastructure",
    icon: "Workflow",
    title: "Distributed Message Queue (Kafka)",
    chips: ["Partitioning", "Append-Only Log", "Zero-Copy", "Consumer Groups", "ISR", "KRaft"],
  },
  MetricsMonitoring: {
    kebab: "metrics-monitoring",
    category: "Search & Big Data",
    icon: "Activity",
    title: "Metrics Monitoring & Alerting",
    chips: ["Time-Series DB", "Downsampling", "Prometheus", "Alert Rules", "Grafana", "Kafka"],
  },
  NearbyService: {
    kebab: "nearby-service",
    category: "Mobility & Logistics",
    icon: "MapPin",
    title: "Nearby Proximity Service (Yelp / Maps)",
    chips: ["Geohash", "QuadTree", "Spatial Indexing", "PostGIS", "Read Caching", "Edge CDN"],
  },
  Netflix: {
    kebab: "netflix",
    category: "Streaming & Media",
    icon: "Video",
    title: "Netflix Video Streaming Platform",
    chips: ["Adaptive Bitrate", "HLS/DASH", "Transcoding Pipeline", "Open Connect CDN", "DRM"],
  },
  NewsAggregator: {
    kebab: "google-news-aggregator",
    category: "Search & Big Data",
    icon: "Newspaper",
    title: "Google News Aggregator",
    chips: ["Distributed Crawler", "SimHash", "Clustering", "Inverted Index", "Personalized Feed"],
  },
  NotificationSystem: {
    kebab: "notification-system",
    category: "Social & Real-Time",
    icon: "Bell",
    title: "Notification System (SystemCraft)",
    chips: ["Multi-Channel", "Vendor Rate Limits", "Idempotency", "Kafka DLQ", "Cassandra"],
  },
  Pastebin: {
    kebab: "pastebin",
    category: "Cloud & AI",
    icon: "FileCode",
    title: "Pastebin Text Sharing Service",
    chips: ["Base62 Encoding", "Object Storage", "TTL Expiry", "Read Cache", "PostgreSQL"],
  },
  PaymentSystem: {
    kebab: "payment-system-stripe",
    category: "Fintech & Payments",
    icon: "CreditCard",
    title: "Payment System (Stripe / Razorpay)",
    chips: ["Idempotency Keys", "Payment Gateway", "Webhooks", "Reconciliation", "Double-Entry"],
  },
  QAForum: {
    kebab: "qa-forum-quora",
    category: "Social & Real-Time",
    icon: "HelpCircle",
    title: "Q&A Forum (Quora / StackOverflow)",
    chips: ["Vote Aggregation", "Search Ranking", "Elasticsearch", "Redis Counters", "Badges"],
  },
  RateLimiter: {
    kebab: "rate-limiter",
    category: "Distributed Infrastructure",
    icon: "ShieldAlert",
    title: "Distributed Rate Limiter",
    chips: ["Token Bucket", "Sliding Window", "Redis Lua", "Race Elimination", "API Gateway"],
  },
  RulesEngine: {
    kebab: "rules-engine",
    category: "Cloud & AI",
    icon: "Cpu",
    title: "Business Rules Engine",
    chips: ["Rete Algorithm", "AST Parsing", "Expression Eval", "Dynamic Rules", "Cache Invalidation"],
  },
  SearchAutocomplete: {
    kebab: "search-autocomplete",
    category: "Search & Big Data",
    icon: "Search",
    title: "Search Autocomplete & Typeahead",
    chips: ["Trie Structure", "Frequency Ranking", "Prefix Sharding", "Browser Cache", "Offline Pipeline"],
  },
  Spotify: {
    kebab: "spotify",
    category: "Streaming & Media",
    icon: "Music",
    title: "Spotify Music Streaming Platform",
    chips: ["Audio Chunking", "P2P Caching", "Content CDN", "Offline Sync", "Playlists"],
  },
  StockBroker: {
    kebab: "stock-broker-zerodha",
    category: "Fintech & Payments",
    icon: "TrendingUp",
    title: "Stock Broker (Zerodha / Robinhood)",
    chips: ["Order Matching", "L2/L3 Order Book", "RMS Risk Checks", "Exchange Gateways", "Audit Log"],
  },
  TrendingTopics: {
    kebab: "trending-topics",
    category: "Streaming & Media",
    icon: "Flame",
    title: "Trending Topics (Top K in a Stream)",
    chips: ["Count-Min Sketch", "Heavy Hitters", "Lossy Counting", "Sliding Window", "Flink Streaming"],
  },
  TwitterFeed: {
    kebab: "twitter-feed",
    category: "Social & Real-Time",
    icon: "Radio",
    title: "Twitter (X) Feed System",
    chips: ["Fan-Out On Write/Read", "Celebrity Handling", "Redis Timeline", "Kafka", "Graph DB"],
  },
  URLShortner: {
    kebab: "url-shortener",
    category: "Cloud & AI",
    icon: "Link2",
    title: "URL Shortener (Bitly / TinyURL)",
    chips: ["Base62 Encoding", "Range ID Allocator", "301 Redirect", "Bloom Filters", "Redis Cache"],
  },
  Uber: {
    kebab: "uber-ride-sharing",
    category: "Mobility & Logistics",
    icon: "Car",
    title: "Uber / Ride Sharing System",
    chips: ["Geohash / H3", "Driver Location Ping", "Trip State Machine", "Surge Pricing", "Dispatch"],
  },
  UniqueIDGenerator: {
    kebab: "unique-id-generator",
    category: "Distributed Infrastructure",
    icon: "Sparkles",
    title: "Distributed Unique ID Generator",
    chips: ["Twitter Snowflake", "Clock Drift", "Worker ID", "64-bit Structure", "High Throughput"],
  },
  WebCrawler: {
    kebab: "web-crawler",
    category: "Search & Big Data",
    icon: "Globe",
    title: "Web Crawler & Search Engine",
    chips: ["Frontier Queue", "robots.txt", "DNS Cache", "PageRank", "Document Indexing"],
  },
  Zomato: {
    kebab: "zomato-food-delivery",
    category: "Mobility & Logistics",
    icon: "Utensils",
    title: "Zomato / Uber Eats Food Delivery",
    chips: ["3-Party Dispatch", "Live GPS Tracking", "Kitchen ETA", "Geofencing", "Idempotent Checkout"],
  },
};

/* ----------------- Helpers ----------------- */

function addThemeParamSupport(doc) {
  const light = doc.match(/@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\)\s*\{([^}]*)\}/);
  if (!light) return doc;
  const bootstrap = "<script>try{var t=new URLSearchParams(location.search).get('theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}</" + "script>";
  doc = doc.replace(/<style>/, bootstrap + "<style>\n  :root[data-theme=\"light\"]{" + light[1] + "}");
  return doc;
}

function cleanFrameDoc(raw) {
  const start = raw.indexOf('<meta name="viewport"');
  if (start === -1) throw new Error("viewport meta not found");
  let doc = raw.slice(start);
  doc = doc.replace(/<!--\s*\/?frame-runtime\s*-->/g, "");
  doc = doc.replace(/href="\.\/css2"/, `href="${FONTS_HREF}"`);
  doc = doc.replace(/https:\/\/[^"']*?\.frame\.claudeusercontent\.com\/_f\/[^"']*?#/g, "#");
  doc = doc.replace(/https:\/\/[^"']*?\.frame\.claudeusercontent\.com\/_f\/[^"']*?/g, "#");
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n${doc}`;
}

const SC_IFRAME_HELPER = `<script>
(function(){
  function applyTheme(t){
    if(!t && window.matchMedia){
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if(t === 'dark'){
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if(t === 'light'){
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
  try {
    var t = new URLSearchParams(location.search).get('theme');
    applyTheme(t);
  } catch(e){}
  window.addEventListener('message', function(e){
    if(e.data && e.data.type === 'THEME_CHANGE'){
      applyTheme(e.data.theme);
    }
  });
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest('a');
    if(!a || !a.href) return;
    if(a.getAttribute('data-hld-home') === 'true'){
      e.preventDefault();
      try{ window.parent.postMessage({ type: 'HLD_BACK' }, '*'); }catch(err){}
      return;
    }
    var url;
    try { url = new URL(a.href, window.location.href); } catch(err){ return; }
    if(url.origin === window.location.origin && url.pathname.endsWith('.html')){
      var curTheme = new URLSearchParams(window.location.search).get('theme');
      if(curTheme && !url.searchParams.get('theme')){
        url.searchParams.set('theme', curTheme);
        a.href = url.href;
      }
    } else if(url.origin !== window.location.origin) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  }, true);
})();
</script>
<style>
  html[data-theme="dark"] { background: #0d1117 !important; color: #e8eef4 !important; }
  html[data-theme="light"] { background: #ffffff !important; color: #0c0e14 !important; }
  body { min-height: 100vh; }
</style>`;

function unescapeHtml(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/* ----------------- Main Build Runner ----------------- */

await mkdir(OUT_HLD, { recursive: true });
await mkdir(OUT_SC, { recursive: true });

console.log("=== Building Standalone Revision Sheets ===");
for (const sheet of REVISION_SHEETS) {
  const raw = await readFile(sheet.src, "utf8");
  let doc = sheet.frame ? cleanFrameDoc(raw) : raw;
  doc = addThemeParamSupport(doc);
  if (/frame\.claudeusercontent\.com|__FRAME_PREAMBLE|href="\.\/css2"/.test(doc)) {
    throw new Error(`${sheet.out}: frame artifacts still present`);
  }
  if (!/<title>/.test(doc) || !doc.includes("</body>")) {
    throw new Error(`${sheet.out}: document looks truncated`);
  }
  await writeFile(path.join(OUT_HLD, sheet.out), doc);
  console.log(`  wrote public/hld/${sheet.out} (${(doc.length / 1024).toFixed(1)} kb)`);
}

console.log("\n=== Building SystemCraft HLD Offline Pages ===");
const scDir = path.join(ROOT, "SystemCraft HLD");
const scSheets = [];

if (existsSync(scDir)) {
  const scFiles = (await readdir(scDir)).filter(f => f.endsWith(".html"));

  for (const f of scFiles) {
    const srcPath = path.join(scDir, f);
    let doc = await readFile(srcPath, "utf8");

    const urlMatch = doc.slice(0, 3000).match(/url:\s*(https?:\/\/[^\s\n]+)/);
    const origUrl = urlMatch ? urlMatch[1] : "";
    const slugMatch = origUrl.replace(/\/+$/, "").split("/").pop();
    const slug = slugMatch || f;

    const cfg = SYSTEMCRAFT_CONFIG[slug];
    if (!cfg) {
      console.warn(`  Warning: unknown slug '${slug}' for file ${f}`);
      continue;
    }

    // Extract meta description
    const descMatch = doc.match(/<meta\s+name=["']?description["']?\s+content=["'](.*?)["']/i);
    const desc = descMatch ? unescapeHtml(descMatch[1].trim()) : "";

    // Extract title
    const titleMatch = doc.match(/<title>(.*?)<\/title>/i);
    const rawTitle = titleMatch ? unescapeHtml(titleMatch[1].trim()) : cfg.title;

    // Extract H2 sections
    const h2Matches = [...doc.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
    const sections = [];
    for (const m of h2Matches) {
      const clean = unescapeHtml(m[1].replace(/<[^>]+>/g, "").trim());
      if (clean && !/table of contents|navigation|subscribe|share|author/i.test(clean)) {
        sections.push(clean);
      }
    }

    // Rewrite internal SystemCraft HLD URLs
    for (const [otherSlug, otherCfg] of Object.entries(SYSTEMCRAFT_CONFIG)) {
      const re1 = new RegExp(`https?://systemcraft\\.in/hld/${otherSlug}/?`, "g");
      const re2 = new RegExp(`/hld/${otherSlug}/?`, "g");
      doc = doc.replace(re1, `/hld/systemcraft/${otherCfg.kebab}.html`);
      doc = doc.replace(re2, `/hld/systemcraft/${otherCfg.kebab}.html`);
    }

    // Rewrite home/catalog links to trigger back message
    doc = doc.replace(/https?:\/\/systemcraft\.in\/hld\/?(?=["'\s>])/g, '#" data-hld-home="true"');
    doc = doc.replace(/"\/hld\/?"/g, '"#" data-hld-home="true"');

    // Inject helper script & style before </head>
    if (doc.includes("</head>")) {
      doc = doc.replace("</head>", `${SC_IFRAME_HELPER}</head>`);
    } else {
      doc = `${SC_IFRAME_HELPER}${doc}`;
    }

    const outFileName = `${cfg.kebab}.html`;
    await writeFile(path.join(OUT_SC, outFileName), doc);
    console.log(`  wrote public/hld/systemcraft/${outFileName} (${(doc.length / 1024).toFixed(1)} kb)`);

    scSheets.push({
      id: `sc-${cfg.kebab}`,
      slug: cfg.kebab,
      out: outFileName,
      file: `/hld/systemcraft/${outFileName}`,
      icon: cfg.icon,
      title: cfg.title,
      fullTitle: rawTitle,
      category: cfg.category,
      source: "SystemCraft",
      tagline: desc || `${cfg.title} architecture, data modeling, scale estimation and interview trade-offs.`,
      sections: sections.slice(0, 16),
      chips: cfg.chips,
    });
  }
} else if (existsSync(OUT_SC)) {
  console.log("  SystemCraft HLD directory not mounted; scanning existing public/hld/systemcraft output");
  const scFiles = (await readdir(OUT_SC)).filter(f => f.endsWith(".html"));
  for (const f of scFiles) {
    const slug = f.replace(/\.html$/, "");
    const cfgEntry = Object.entries(SYSTEMCRAFT_CONFIG).find(([_, c]) => c.kebab === slug);
    const cfg = cfgEntry ? cfgEntry[1] : null;
    if (cfg) {
      scSheets.push({
        id: `sc-${cfg.kebab}`,
        slug: cfg.kebab,
        out: f,
        file: `/hld/systemcraft/${f}`,
        icon: cfg.icon,
        title: cfg.title,
        fullTitle: cfg.title,
        category: cfg.category,
        source: "SystemCraft",
        tagline: `${cfg.title} architecture, data modeling, scale estimation and interview trade-offs.`,
        sections: ["Architecture", "Data Model", "Scaling & Bottlenecks", "Failure Scenarios"],
        chips: cfg.chips,
      });
    }
  }
}

// Sort SystemCraft sheets alphabetically by title
scSheets.sort((a, b) => a.title.localeCompare(b.title));

const ALL_DESIGNS = [
  ...REVISION_SHEETS,
  ...scSheets,
];

console.log(`\n=== Total HLD Sheets Built: ${ALL_DESIGNS.length} (6 revision + ${scSheets.length} SystemCraft) ===`);

/* ----------------- 3. Generate src/hld-data.js ----------------- */

const allIcons = new Set();
ALL_DESIGNS.forEach(d => allIcons.add(d.icon));
const iconImports = Array.from(allIcons).sort().join(", ");

const dataJsContent = `// Auto-generated by scripts/build-hld.mjs — DO NOT EDIT MANUALLY
// Unified catalog of all ${ALL_DESIGNS.length} High-Level System Designs:
// - ${REVISION_SHEETS.length} Interactive Revision Sheets (deep dive interview playbooks)
// - ${scSheets.length} SystemCraft HLD Offline Deep Dives (production blueprints & trade-offs)

import {
  ${iconImports}
} from "lucide-react";

export const ICON_MAP = {
  ${Array.from(allIcons).sort().map(i => `${i}`).join(",\n  ")}
};

export const HLD_CATEGORIES = [
  "All",
  "Distributed Infrastructure",
  "Fintech & Payments",
  "E-Commerce & Booking",
  "Mobility & Logistics",
  "Social & Real-Time",
  "Streaming & Media",
  "Search & Big Data",
  "Cloud & AI",
];

export const HLD_SOURCES = [
  "All",
  "SystemCraft Library",
  "Revision Sheets",
];

export const HLD_SHEETS = ${JSON.stringify(
  ALL_DESIGNS.map(d => ({
    id: d.id,
    slug: d.slug,
    file: d.file,
    iconName: d.icon,
    title: d.title,
    fullTitle: d.fullTitle,
    category: d.category,
    source: d.source,
    tagline: d.tagline,
    sections: d.sections,
    chips: d.chips,
  })),
  null,
  2
).replace(/"iconName": "([^"]+)"/g, '"iconName": "$1",\n    icon: ICON_MAP["$1"]')};
`;

await writeFile(DATA_FILE, dataJsContent);
console.log(`\nGenerated ${DATA_FILE} (${(dataJsContent.length / 1024).toFixed(1)} kb)`);
