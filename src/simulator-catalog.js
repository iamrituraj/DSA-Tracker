// SystemCraft Architecture Simulator: Component Library and Challenge Catalog
// Pure data definitions and rubrics.

export const LIBRARY = {
  'Clients': [
    {
      id: 'client',
      label: 'Client',
      icon: 'CLI',
      maxRPS: Infinity,
      latency: 0,
      cat: 'client',
      cost: 0,
      blurb: 'Where traffic starts. Requests split evenly across everything it connects to.'
    }
  ],
  'Edge / LB': [
    {
      id: 'load-balancer',
      label: 'Load Balancer',
      icon: 'LB',
      maxRPS: 500000,
      latency: 2,
      cat: 'lb',
      cost: 25,
      blurb: 'Spreads requests across the tier behind it and routes around dead instances.'
    },
    {
      id: 'api-gateway',
      label: 'API Gateway',
      icon: 'GW',
      maxRPS: 200000,
      latency: 5,
      cat: 'lb',
      cost: 40,
      blurb: 'Edge router with auth, rate limits and request shaping. Slower than a plain LB.'
    },
    {
      id: 'cdn',
      label: 'CDN',
      icon: 'CDN',
      maxRPS: 1000000,
      latency: 1,
      cat: 'cdn',
      cost: 60,
      blurb: 'Edge cache. Serves cacheable reads near the user; misses and writes go to the origin.'
    }
  ],
  'Compute': [
    {
      id: 'app-server',
      label: 'App Server',
      icon: 'APP',
      maxRPS: 10000,
      latency: 5,
      cat: 'compute',
      cost: 70,
      blurb: 'Stateless API tier. A read takes one path downstream; a write updates every store it is wired to.'
    },
    {
      id: 'microservice',
      label: 'Microservice',
      icon: 'SVC',
      maxRPS: 8000,
      latency: 8,
      cat: 'compute',
      cost: 60,
      blurb: 'A separately deployed service. Rename it to model several distinct services.'
    },
    {
      id: 'websocket',
      label: 'WebSocket Gateway',
      icon: 'WS',
      maxRPS: 20000,
      latency: 3,
      cat: 'compute',
      cost: 90,
      blurb: 'Holds long-lived client connections for push: chat, live tracking, collaborative editing.'
    },
    {
      id: 'worker',
      label: 'Worker',
      icon: 'WRK',
      maxRPS: 5000,
      latency: 20,
      cat: 'compute',
      cost: 50,
      blurb: 'Background consumer. Behind a queue it pulls at its own pace, so it never gets overrun.'
    },
    {
      id: 'stream',
      label: 'Stream Processor',
      icon: 'STR',
      maxRPS: 40000,
      latency: 15,
      cat: 'compute',
      cost: 160,
      blurb: 'Flink / Kafka Streams style consumer for windowed aggregation over an event log.'
    }
  ],
  'Databases': [
    {
      id: 'postgresql',
      label: 'PostgreSQL',
      icon: 'PG',
      maxRPS: 5000,
      latency: 10,
      cat: 'db',
      cost: 250,
      durable: true,
      blurb: 'Relational and strongly consistent. Transactions, joins, constraints. Scales reads with replicas.'
    },
    {
      id: 'mysql',
      label: 'MySQL',
      icon: 'SQL',
      maxRPS: 6000,
      latency: 8,
      cat: 'db',
      cost: 220,
      durable: true,
      blurb: 'Relational and strongly consistent. Similar trade-offs to Postgres.'
    },
    {
      id: 'mongodb',
      label: 'MongoDB',
      icon: 'MDB',
      maxRPS: 20000,
      latency: 5,
      cat: 'db',
      cost: 200,
      durable: true,
      blurb: 'Document store. Flexible schema, shards by key.'
    },
    {
      id: 'dynamodb',
      label: 'DynamoDB',
      icon: 'DDB',
      maxRPS: 100000,
      latency: 5,
      cat: 'db',
      cost: 300,
      durable: true,
      blurb: 'Managed key-value store. Predictable single-digit ms at very high throughput, no joins.'
    },
    {
      id: 'cassandra',
      label: 'Cassandra',
      icon: 'CAS',
      maxRPS: 50000,
      latency: 4,
      cat: 'db',
      cost: 280,
      durable: true,
      blurb: 'Wide-column, write-optimised, multi-node by design. Good for time-ordered and append-heavy data.'
    },
    {
      id: 'tsdb',
      label: 'Time-Series DB',
      icon: 'TS',
      maxRPS: 80000,
      latency: 6,
      cat: 'db',
      cost: 260,
      durable: true,
      blurb: 'Columnar time-series store with compression and rollups. Built for metrics firehoses.'
    },
    {
      id: 'db-replica',
      label: 'DB Read Replica',
      icon: 'REP',
      maxRPS: 8000,
      latency: 8,
      cat: 'replica',
      cost: 180,
      durable: true,
      blurb: 'Read-only copy of a primary. Takes reads, never writes. Wire it beside or behind the primary.'
    }
  ],
  'Cache': [
    {
      id: 'redis',
      label: 'Redis',
      icon: 'RDS',
      maxRPS: 100000,
      latency: 1,
      cat: 'cache',
      cost: 150,
      blurb: 'In-memory cache and data structures (sorted sets, counters, geo). Not a system of record.'
    },
    {
      id: 'memcached',
      label: 'Memcached',
      icon: 'MEM',
      maxRPS: 120000,
      latency: 1,
      cat: 'cache',
      cost: 120,
      blurb: 'Plain in-memory key-value cache. Fast and simple, nothing persists.'
    }
  ],
  'Async': [
    {
      id: 'kafka',
      label: 'Kafka',
      icon: 'KAF',
      maxRPS: 100000,
      latency: 3,
      cat: 'queue',
      cost: 200,
      durable: true,
      blurb: 'Replicated, partitioned log. Producers get an ack; consumers read at their own pace.'
    },
    {
      id: 'rabbitmq',
      label: 'RabbitMQ',
      icon: 'MQ',
      maxRPS: 30000,
      latency: 5,
      cat: 'queue',
      cost: 120,
      blurb: 'Broker with routing and per-message acks. Lower throughput than a log.'
    },
    {
      id: 'sqs',
      label: 'SQS',
      icon: 'SQS',
      maxRPS: 50000,
      latency: 10,
      cat: 'queue',
      cost: 40,
      durable: true,
      blurb: 'Managed queue with visibility timeouts and dead-letter queues.'
    },
    {
      id: 'pubsub',
      label: 'Pub/Sub',
      icon: 'PUB',
      maxRPS: 150000,
      latency: 4,
      cat: 'queue',
      cost: 60,
      blurb: 'Fan-out messaging. Every subscriber group gets every message; nothing is retained.'
    }
  ],
  'Storage / Search': [
    {
      id: 's3',
      label: 'Object Store',
      icon: 'OBJ',
      maxRPS: 5000,
      latency: 50,
      cat: 'blob',
      cost: 30,
      durable: true,
      blurb: 'Cheap, durable blob storage for files and media. High per-request latency.'
    },
    {
      id: 'elasticsearch',
      label: 'Elasticsearch',
      icon: 'ES',
      maxRPS: 20000,
      latency: 10,
      cat: 'search',
      cost: 250,
      blurb: 'Inverted index for full-text search and facets. A derived view you can rebuild.'
    },
    {
      id: 'vector-db',
      label: 'Vector DB',
      icon: 'VEC',
      maxRPS: 4000,
      latency: 20,
      cat: 'search',
      cost: 320,
      blurb: 'Approximate nearest-neighbour index over embeddings for semantic search and RAG.'
    }
  ]
};

export const ICONS = {
  client: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18"/><path d="M9 21h6"/>',
  lb: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v3M12 10L6 17M12 10l6 7"/>',
  cdn: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
  compute: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><circle cx="8" cy="7.5" r=".6"/><circle cx="8" cy="16.5" r=".6"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  replica: '<ellipse cx="10" cy="7" rx="5" ry="2.3"/><path d="M5 7v9c0 1.3 2.2 2.3 5 2.3s5-1 5-2.3V7"/><path d="M14 10.5h4a1 1 0 011 1V19"/>',
  cache: '<path d="M13 2L5 13h6l-1 9 9-12h-6z"/>',
  queue: '<rect x="3" y="5" width="18" height="3.2" rx="1"/><rect x="3" y="10.4" width="18" height="3.2" rx="1"/><rect x="3" y="15.8" width="18" height="3.2" rx="1"/>',
  blob: '<path d="M5 7h14l-1.4 12.1a1 1 0 01-1 .9H7.4a1 1 0 01-1-.9z"/><path d="M4 7h16"/><path d="M9 4h6l1 3H8z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/>'
};

export function R(label, cats) {
  return { label: label, dim: 'architecture', cats: cats, test: function (h) { return h.has.apply(h, cats); } };
}
export function RSIM() {
  return { label: 'Handles the target load: nothing saturated, no growing backlog', dim: 'scalability', test: function (h) { return h.simPassed; } };
}
export function RLAT() {
  return { label: 'Meets the P99 latency budget', dim: 'latency', test: function (h) { return h.latencyOk; } };
}
export function RDUR() {
  return { label: 'Writes land in a durable system of record', dim: 'reliability', test: function (h) { return h.hasDurable; } };
}

export const CHALLENGES = {
  'URLShortner': {
    title: 'URL Shortener',
    difficulty: 'Beginner',
    prompt: 'Design TinyURL: turn long URLs into short codes and redirect. Redirects vastly outnumber creates.',
    scale: { rps: 100000, readPct: 95, cacheHit: 90, p99Budget: 50 },
    reqs: ['Redirect < 50ms P99', '100K RPS (95% reads)', 'Durable URL mappings'],
    rubric: [R('Load balancer to spread traffic', ['lb']), R('Cache/CDN for hot redirects', ['cache', 'cdn']), R('Durable database for mappings', ['db']), R('Compute tier between edge and data', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Redis', 'DynamoDB'], link: '/hld/systemcraft/url-shortener.html',
      note: 'Reads dominate ~20:1, so CDN + Redis absorb almost all redirects. Creates go to a KV store. The app tier only handles cache misses and writes.' }
  },
  'Leaderboard': {
    title: 'Real-Time Leaderboard',
    difficulty: 'Beginner',
    prompt: 'Show top players and a user\'s rank among millions, updating live as scores change.',
    scale: { rps: 120000, readPct: 85, cacheHit: 70, p99Budget: 75 },
    reqs: ['Rank query < 50ms', '120K RPS', 'Live updates on score change'],
    rubric: [R('Load balancer at the edge', ['lb']), R('Sorted-set store for rankings (Redis)', ['cache']), R('Durable database for scores', ['db']), R('Compute tier for the API', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'PostgreSQL'], link: '/hld/systemcraft/real-time-leaderboard.html',
      note: 'Redis Sorted Sets (ZADD/ZRANK) give O(log n) rank and top-K in one call. The relational DB is source of truth; Redis serves all reads.' }
  },
  'RateLimiter': {
    title: 'Rate Limiter',
    difficulty: 'Beginner',
    prompt: 'Cap each API key to N requests/sec consistently across many app servers.',
    scale: { rps: 200000, readPct: 50, cacheHit: 0, p99Budget: 40 },
    reqs: ['Limiter decision < 5ms', 'Consistent counts across servers', '200K RPS'],
    statefree: true,
    rubric: [R('Edge/gateway where limiting is enforced', ['lb']), R('Shared fast counter store (Redis)', ['cache']), R('Compute tier running limiter logic', ['compute']), RSIM(), RLAT()],
    ref: { stack: ['API Gateway', 'App Server', 'Redis'], link: '/hld/systemcraft/rate-limiter.html',
      note: 'A central Redis holds per-key counters (token bucket / sliding window). Every server checks atomically via Lua. Shard by key past one node.' }
  },
  'Pastebin': {
    title: 'Pastebin / Text Sharing',
    difficulty: 'Beginner',
    prompt: 'Store text snippets, return a short link, serve reads cheaply with expiry.',
    scale: { rps: 80000, readPct: 90, cacheHit: 80, p99Budget: 200 },
    reqs: ['Cached read < 80ms at the edge', 'Durable blob storage', 'CDN-cached reads'],
    rubric: [R('CDN/LB at the edge', ['cdn', 'lb']), R('Compute tier for the API', ['compute']), R('Object store for paste bodies', ['blob', 'db']), R('Cache for hot pastes', ['cache', 'cdn']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Object Store', 'PostgreSQL'], link: '/hld/systemcraft/pastebin.html',
      note: 'Metadata (id, expiry) in a DB; large bodies in object storage. CDN caches hot pastes so the app tier only handles writes and misses.' }
  },
  'UniqueIDGenerator': {
    title: 'Unique ID Generator',
    difficulty: 'Beginner',
    prompt: 'Generate unique, roughly-sortable 64-bit IDs across many nodes with no coordination on the hot path.',
    scale: { rps: 150000, readPct: 0, cacheHit: 0, p99Budget: 30 },
    reqs: ['ID generation < 5ms in-process', 'No global lock on hot path', 'Monotonic-ish ordering'],
    statefree: true,
    rubric: [R('Load balancer at the edge', ['lb']), R('Compute tier issuing IDs (Snowflake-style)', ['compute']), R('Store for range/segment allocation', ['db', 'cache']), RSIM(), RLAT()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis'], link: '/hld/systemcraft/unique-id-generator.html',
      note: 'Snowflake = timestamp + machine id + sequence, generated locally with no coordination. Range/segment allocators lease blocks of IDs from a store to avoid per-ID DB hits.' }
  },
  'KeyValueStore': {
    title: 'Distributed Key-Value Store',
    difficulty: 'Beginner',
    prompt: 'Design a Dynamo-style KV store: consistent hashing, replication, tunable quorum reads/writes.',
    scale: { rps: 200000, readPct: 60, cacheHit: 0, p99Budget: 75 },
    reqs: ['Storage-node get/put < 10ms', 'Replicated for durability', 'No single point of failure'],
    rubric: [R('Load balancer / coordinator', ['lb']), R('Compute/coordinator tier', ['compute']), R('Primary data nodes', ['db']), R('Replicas for durability (no SPOF)', ['replica', 'db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Cassandra', 'DB Read Replica'], link: '/hld/systemcraft/key-value-store.html',
      note: 'Consistent hashing places keys on a ring; each key replicated to N nodes. Quorum (R+W>N) tunes consistency vs latency. LSM-tree storage underneath.' }
  },
  'TwitterFeed': {
    title: 'Twitter / Social Feed',
    difficulty: 'Intermediate',
    prompt: 'Home timeline: users follow others and see a merged feed. Celebrities have millions of followers.',
    scale: { rps: 300000, readPct: 90, cacheHit: 80, p99Budget: 125 },
    reqs: ['Feed < 200ms P99', '300K RPS', 'Fan-out on write, pull for celebrities'],
    rubric: [R('LB / API gateway at the edge', ['lb']), R('Cache for precomputed timelines', ['cache']), R('Async queue for fan-out on write', ['queue']), R('Database for tweets and graph', ['db']), R('Worker/compute tier for fan-out', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Worker', 'Redis', 'Cassandra'], link: '/hld/systemcraft/twitter-feed.html',
      note: 'Hybrid fan-out: workers push tweets into follower timeline caches via Kafka for normal users; celebrity timelines are pulled and merged at read time.' }
  },
  'ChatSystem': {
    title: 'Chat / Messaging',
    difficulty: 'Intermediate',
    prompt: 'Real-time 1:1 and group chat with delivery guarantees, offline delivery, and presence.',
    scale: { rps: 150000, readPct: 60, cacheHit: 40, p99Budget: 50 },
    reqs: ['Delivery < 100ms', '150K msgs/sec', 'Durable history'],
    rubric: [R('Gateway/LB for connections', ['lb']), R('Async queue for reliable delivery', ['queue']), R('Database for message history', ['db']), R('Cache for presence / recent msgs', ['cache']), R('Compute tier for chat services', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'WebSocket Gateway', 'Kafka', 'Redis', 'Cassandra'], link: '/hld/systemcraft/chat-system.html',
      note: 'WebSocket servers hold connections; messages flow through Kafka for durability and fan-out. Cassandra stores time-ordered history; Redis tracks presence and routing.' }
  },
  'NotificationSystem': {
    title: 'Notification System',
    difficulty: 'Intermediate',
    prompt: 'Send push/email/SMS across channels at scale with templates, retries, and rate control.',
    scale: { rps: 120000, readPct: 20, cacheHit: 0, p99Budget: 150 },
    reqs: ['Enqueue ack < 50ms', 'Retry + dead-letter', 'Multi-channel fan-out'],
    rubric: [R('LB / API gateway at the edge', ['lb']), R('Async queue decoupling send from request', ['queue']), R('Worker/compute tier per channel', ['compute']), R('Database for templates and status', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Worker', 'PostgreSQL'], link: '/hld/systemcraft/notification-system.html',
      note: 'Requests enqueue to Kafka; per-channel workers render templates and call providers. Retries and DLQ handle provider failures. Never send synchronously in the request path.' }
  },
  'Instagram': {
    title: 'Photo Sharing (Instagram)',
    difficulty: 'Intermediate',
    prompt: 'Upload photos, deliver via CDN, and generate a fan-out news feed of followed accounts.',
    scale: { rps: 250000, readPct: 92, cacheHit: 85, p99Budget: 200 },
    reqs: ['Feed/media < 150ms P99', 'CDN media delivery', 'Fan-out feed'],
    rubric: [R('CDN for media delivery', ['cdn']), R('LB at the edge', ['lb']), R('Compute tier for upload + feed', ['compute']), R('Object store for photos', ['blob', 'db']), R('Cache for feeds', ['cache']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Object Store', 'Redis', 'Cassandra'], link: '/hld/systemcraft/instagram.html',
      note: 'Originals in object storage, variants pushed to CDN. Feed fan-out into Redis timelines. Metadata in a wide-column store. The app tier never serves image bytes directly.' }
  },
  'BookMyShow': {
    title: 'Ticket Booking (BookMyShow)',
    difficulty: 'Intermediate',
    prompt: 'Seat selection with temporary holds, no double-booking, and payment integration.',
    scale: { rps: 90000, readPct: 70, cacheHit: 50, p99Budget: 75, burst: 2 },
    reqs: ['No double booking', 'Seat hold TTL', 'Handle 2x booking bursts'],
    rubric: [R('LB at the edge', ['lb']), R('Compute tier for booking logic', ['compute']), R('Database as source of truth for seats', ['db']), R('Cache/lock store for holds', ['cache']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'PostgreSQL'], link: '/hld/systemcraft/bookmyshow.html',
      note: 'Seats held with a Redis lock + TTL so abandoned carts auto-release. The relational DB commits the booking transactionally to guarantee no double-booking.' }
  },
  'NewsAggregator': {
    title: 'News Aggregator (Google News)',
    difficulty: 'Intermediate',
    prompt: 'Crawl thousands of sources, cluster stories, and serve a personalized ranked feed.',
    scale: { rps: 120000, readPct: 88, cacheHit: 75, p99Budget: 75 },
    reqs: ['Feed < 200ms', 'Fresh crawl pipeline', 'Full-text search'],
    rubric: [R('LB at the edge', ['lb']), R('Async queue for the crawl pipeline', ['queue']), R('Search index for stories', ['search']), R('Compute tier for ranking', ['compute']), R('Database for articles/metadata', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Elasticsearch', 'PostgreSQL'], link: '/hld/systemcraft/google-news.html',
      note: 'Crawlers feed Kafka; workers dedupe and cluster with embeddings. Elasticsearch powers query + facets. Ranking service personalizes the feed at read time.' }
  },
  'JobScheduler': {
    title: 'Distributed Job Scheduler',
    difficulty: 'Advanced',
    prompt: 'Schedule and run millions of jobs at a target time with retries and exactly-once execution.',
    scale: { rps: 100000, readPct: 30, cacheHit: 0, p99Budget: 150 },
    reqs: ['Fire within 1s of due time', 'Retries + DLQ', 'No duplicate execution'],
    rubric: [R('LB / API for job submission', ['lb']), R('Hot-window store (Redis ZSET)', ['cache']), R('Async queue to dispatch due jobs', ['queue']), R('Worker/compute tier to execute', ['compute']), R('Database for job definitions', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'Kafka', 'Worker', 'PostgreSQL'], link: '/hld/systemcraft/distributed-job-scheduler.html',
      note: 'A Redis ZSET holds the near-term window keyed by run-time; a poller moves due jobs onto Kafka for workers. Durable definitions live in the DB; leader election avoids double-dispatch.' }
  },
  'DelayedTriggerService': {
    title: 'Delayed Trigger Service',
    difficulty: 'Advanced',
    prompt: 'Fire a callback after an arbitrary delay (seconds to months) reliably at massive scale.',
    scale: { rps: 120000, readPct: 20, cacheHit: 0, p99Budget: 75 },
    reqs: ['Fire near due time', 'Survive restarts', 'At-least-once delivery'],
    rubric: [R('LB / API to register triggers', ['lb']), R('Queue to dispatch fired triggers', ['queue']), R('Compute tier (timing wheel)', ['compute']), R('Durable store for pending triggers', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'SQS', 'Cassandra'], link: '/hld/systemcraft/delayed-trigger-service.html',
      note: 'Hierarchical timing wheels bucket triggers by due time; long delays persist in Cassandra and get promoted into the wheel as they approach. SQS delivers fired events with retries.' }
  },
  'DigitalWallet': {
    title: 'Digital Wallet (PhonePe / Venmo)',
    difficulty: 'Advanced',
    prompt: 'Money transfers with a correct ledger, idempotency, and reconciliation. Correctness over speed.',
    scale: { rps: 80000, readPct: 50, cacheHit: 0, p99Budget: 75 },
    reqs: ['No lost/double money', 'Idempotent writes', 'Strong consistency'],
    rubric: [R('LB at the edge', ['lb']), R('Compute tier for transaction logic', ['compute']), R('Strongly-consistent ledger DB', ['db']), R('Async queue for async settlement', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'PostgreSQL', 'Kafka'], link: '/hld/systemcraft/digital-wallet.html',
      note: 'Double-entry ledger in a strongly-consistent relational DB. Idempotency keys dedupe retries. A saga coordinates external payment steps; reconciliation catches drift.' }
  },
  'Zomato': {
    title: 'Food Delivery (Zomato)',
    difficulty: 'Advanced',
    prompt: 'Restaurant search, order placement, delivery-partner dispatch, and live order tracking.',
    scale: { rps: 200000, readPct: 75, cacheHit: 60, p99Budget: 75 },
    reqs: ['Search < 100ms', 'Geo dispatch', 'Live tracking'],
    rubric: [R('LB at the edge', ['lb']), R('Search index for restaurants', ['search']), R('Geo cache for proximity', ['cache']), R('Compute tier for dispatch', ['compute']), R('Database for orders', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Elasticsearch', 'Redis', 'Cassandra'], link: '/hld/systemcraft/food-delivery.html',
      note: 'Elasticsearch powers restaurant search + facets. Redis Geo finds nearby partners for dispatch. Orders persist durably; live location streams over WebSockets.' }
  },
  'StockBroker': {
    title: 'Stock Broker (Robinhood / Zerodha)',
    difficulty: 'Advanced',
    prompt: 'Place orders into a matching engine with exactly-once processing and real-time updates.',
    scale: { rps: 180000, readPct: 60, cacheHit: 40, p99Budget: 75 },
    reqs: ['Order ack < 50ms', 'Exactly-once processing', 'Real-time fills'],
    rubric: [R('LB / gateway at the edge', ['lb']), R('Compute tier (matching engine)', ['compute']), R('Event log for orders (Kafka)', ['queue']), R('Database for positions/trades', ['db']), R('Cache for market data', ['cache']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Redis', 'PostgreSQL'], link: '/hld/systemcraft/stock-broker.html',
      note: 'Orders are appended to a Kafka log (event sourcing) and consumed by a single-writer matching engine for determinism. CQRS splits the write path from real-time read views.' }
  },
  'Uber': {
    title: 'Ride Sharing (Uber)',
    difficulty: 'Advanced',
    prompt: 'Match riders to nearby drivers, ingest a firehose of location pings, and track trips live.',
    scale: { rps: 250000, readPct: 70, cacheHit: 50, p99Budget: 50 },
    reqs: ['Match < 2s', '250K location pings/sec', 'Low-latency geo queries'],
    rubric: [R('LB at the edge', ['lb']), R('Geo cache / index (Redis)', ['cache']), R('Queue for the location firehose', ['queue']), R('Database for trips and users', ['db']), R('Compute tier for matching', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Redis', 'Cassandra'], link: '/hld/systemcraft/ride-sharing.html',
      note: 'Location pings flow through Kafka into a Redis geo-index (S2/geohash). Matching queries nearby drivers from Redis; the main DB never sees the raw ping firehose.' }
  },
  'Netflix': {
    title: 'Video Streaming (Netflix)',
    difficulty: 'Advanced',
    prompt: 'Ingest and transcode video, then stream adaptively to millions via CDN edge caches.',
    scale: { rps: 400000, readPct: 98, cacheHit: 95, p99Budget: 200 },
    reqs: ['Start < 2s', 'CDN edge delivery', 'Adaptive bitrate'],
    rubric: [R('CDN for segment delivery', ['cdn']), R('LB at the edge', ['lb']), R('Compute tier for the API', ['compute']), R('Object store for encoded variants', ['blob', 'db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Object Store', 'PostgreSQL'], link: '/hld/systemcraft/netflix.html',
      note: 'Uploads are transcoded into per-resolution HLS/DASH segments stored in object storage and pushed to CDN edges. Playback is almost entirely served from CDN; the app tier only handles manifests and metadata.' }
  },
  'GoogleDocs': {
    title: 'Collaborative Editing (Google Docs)',
    difficulty: 'Advanced',
    prompt: 'Real-time multi-user editing with conflict resolution (OT/CRDT), presence, and version history.',
    scale: { rps: 150000, readPct: 55, cacheHit: 40, p99Budget: 75 },
    reqs: ['Edit propagation < 100ms', 'Conflict-free merges', 'Durable history'],
    rubric: [R('LB / gateway for connections', ['lb']), R('Compute tier for OT/CRDT logic', ['compute']), R('Cache for live document sessions', ['cache']), R('Database for document + history', ['db']), R('Queue for change broadcast', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'WebSocket Gateway', 'Redis', 'Kafka', 'PostgreSQL'], link: '/hld/systemcraft/google-docs.html',
      note: 'A per-doc server applies OT/CRDT ops in order and broadcasts to collaborators over WebSockets. Redis holds live session state; ops persist to the DB for history and recovery.' }
  },
  'SearchAutocomplete': {
    title: 'Search Autocomplete / Typeahead',
    difficulty: 'Beginner',
    prompt: 'Suggest completions on every keystroke. Latency budget is brutal and the same prefixes repeat constantly.',
    scale: { rps: 100000, readPct: 99, cacheHit: 92, p99Budget: 50 },
    reqs: ['Suggestions < 100ms P99', 'Cache-friendly prefix reads', 'Trending terms within minutes'],
    rubric: [R('CDN/edge cache for hot prefixes', ['cdn', 'cache']), R('LB at the edge', ['lb']), R('Compute tier serving the trie', ['compute']), R('Store for prefix data', ['db', 'search']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Redis', 'Cassandra'], link: '/hld/systemcraft/search-autocomplete.html',
      note: 'Prefixes are precomputed into a trie with top-K completions baked into each node, so a request is a lookup rather than a search. A tiny set of prefixes covers most traffic, which is why the CDN and cache carry almost all of it.' }
  },
  'QAForum': {
    title: 'Q&A Forum (Quora / Stack Overflow)',
    difficulty: 'Intermediate',
    prompt: 'Questions, answers and votes, with full-text search. Reads outnumber writes about 100:1.',
    scale: { rps: 50000, readPct: 99, cacheHit: 88, p99Budget: 75 },
    reqs: ['Question page < 100ms P99', 'Full-text search < 200ms', 'No sharding needed at this size'],
    rubric: [R('CDN/cache for anonymous page reads', ['cdn', 'cache']), R('LB at the edge', ['lb']), R('Compute tier for the API', ['compute']), R('Search index for questions', ['search']), R('Database as source of truth', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'App Server', 'Redis', 'Elasticsearch', 'PostgreSQL'], link: '/hld/systemcraft/qa-forum.html',
      note: 'A 100:1 read skew makes the cache load-bearing, not an optimisation. 100GB and ~500 writes/sec fits one Postgres primary plus read replicas. Elasticsearch is a separate failure domain.' }
  },
  'WebCrawler': {
    title: 'Web Crawler & Search Engine',
    difficulty: 'Advanced',
    prompt: 'Crawl billions of pages politely, dedupe URLs, and serve ranked search results over the index.',
    scale: { rps: 100000, readPct: 95, cacheHit: 85, p99Budget: 200 },
    reqs: ['Query < 200ms P99', '10K pages/sec crawl', 'Respect robots.txt / politeness'],
    rubric: [R('Cache for repeated queries', ['cache', 'cdn']), R('LB at the edge', ['lb']), R('Queue for the crawl frontier', ['queue']), R('Search index for documents', ['search']), R('Object store for raw pages', ['blob', 'db']), R('Worker/compute tier for fetching', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'Kafka', 'Worker', 'Elasticsearch', 'Object Store'], link: '/hld/systemcraft/web-crawler.html',
      note: 'The frontier is a queue, the dedup filter is a ~12GB Bloom filter in RAM, and 750TB of raw HTML lives in object storage. A query fans out to every document shard.' }
  },
  'Dropbox': {
    title: 'File Storage & Sync (Dropbox)',
    difficulty: 'Intermediate',
    prompt: 'Upload large files in chunks, dedupe by content hash, and sync changes to every device.',
    scale: { rps: 60000, readPct: 70, cacheHit: 40, p99Budget: 200 },
    reqs: ['Zero data loss', 'Delta sync (changed chunks only)', 'Sync within 5-10s'],
    rubric: [R('LB at the edge', ['lb']), R('Compute tier for the metadata API', ['compute']), R('Object store for file chunks', ['blob']), R('Database for file metadata', ['db']), R('Queue for sync notifications', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Object Store', 'Kafka', 'PostgreSQL'], link: '/hld/systemcraft/dropbox.html',
      note: 'Files split into content-addressed 4MB chunks. Clients PUT chunks straight to object storage via pre-signed URLs. Metadata is the source of truth.' }
  },
  'MessageQueue': {
    title: 'Distributed Message Queue (Kafka)',
    difficulty: 'Advanced',
    prompt: 'A partitioned, replicated commit log: durable writes, ordered within a partition, at very high throughput.',
    scale: { rps: 400000, readPct: 50, cacheHit: 0, p99Budget: 40 },
    reqs: ['Broker produce-to-consume < 10ms', 'Zero loss on acked writes', 'Order within a partition'],
    rubric: [R('LB / gateway in front of brokers', ['lb']), R('Replicated broker tier - the durable log itself', ['queue']), R('Compute tier for producers/consumers', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka'], link: '/hld/systemcraft/distributed-message-queue.html',
      note: 'Throughput comes from append-only sequential writes plus zero-copy reads. The broker log is the durable store across in-sync replica sets.' }
  },
  'MetricsMonitoring': {
    title: 'Metrics & Monitoring (Prometheus)',
    difficulty: 'Advanced',
    prompt: 'Ingest a firehose of time-series data points, serve dashboard queries fast, and fire alerts within a minute.',
    scale: { rps: 300000, readPct: 20, cacheHit: 30, p99Budget: 50, burst: 2 },
    reqs: ['1M+ data points/sec', 'Dashboard query P95 < 500ms', 'Absorb 2x ingest spikes'],
    rubric: [R('LB at the edge', ['lb']), R('Queue to buffer the ingest firehose', ['queue']), R('Compute tier for ingest + query', ['compute']), R('Time-series store', ['db']), R('Cache for dashboard queries', ['cache']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Kafka', 'Stream Processor', 'Redis', 'Time-Series DB'], link: '/hld/systemcraft/metrics-monitoring.html',
      note: 'Writes buffered through a queue so ingest spikes never stall the write path. Columnar time-series layout with delta-of-delta compression and rollups.' }
  },
  'NearbyService': {
    title: 'Nearby / Proximity Service (Yelp)',
    difficulty: 'Intermediate',
    prompt: 'Find places or moving entities within a radius, while ingesting millions of location updates per second.',
    scale: { rps: 200000, readPct: 80, cacheHit: 65, p99Budget: 50 },
    reqs: ['Radius query < 100ms P99', '2M location updates/sec', 'Freshness within 3-5s'],
    rubric: [R('LB at the edge', ['lb']), R('Geo cache / spatial index', ['cache']), R('Compute tier for search', ['compute']), R('Database for place data', ['db']), R('Queue for location updates', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'Kafka', 'Cassandra'], link: '/hld/systemcraft/nearby-service.html',
      note: 'Geohash or S2 cells turn a 2D radius query into a prefix range scan. Moving entities go through a queue into an in-memory geo index.' }
  },
  'PaymentSystem': {
    title: 'Payment System (Stripe)',
    difficulty: 'Advanced',
    prompt: 'Take payments with an exact ledger, safe retries, and reconciliation against external banks. Correctness beats speed.',
    scale: { rps: 50000, readPct: 40, cacheHit: 0, p99Budget: 150 },
    reqs: ['Zero double-charges', 'Every request safely retryable', 'Ledger balanced to the penny'],
    rubric: [R('LB at the edge', ['lb']), R('Compute tier for payment logic', ['compute']), R('Strongly-consistent ledger DB', ['db']), R('Queue for async settlement', ['queue']), R('Worker tier for reconciliation', ['compute']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'PostgreSQL', 'Kafka', 'Worker'], link: '/hld/systemcraft/payment-system.html',
      note: 'Double-entry ledger in a relational DB with unique idempotency keys. Saga orchestrates external banks with compensating transactions.' }
  },
  'CartSystem': {
    title: 'Shopping Cart',
    difficulty: 'Intermediate',
    prompt: 'A cart that survives flash sales: very high write rate, never loses a logged-in user\'s items.',
    scale: { rps: 500000, readPct: 80, cacheHit: 75, p99Budget: 50, burst: 2 },
    reqs: ['Add-to-cart < 100ms P99', 'Never lose a logged-in cart', 'Survive 2x flash-sale bursts'],
    rubric: [R('LB at the edge', ['lb']), R('Compute tier for cart API', ['compute']), R('Hot in-memory cart store', ['cache']), R('Durable backing store', ['db']), R('Queue for cart events', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'Kafka', 'DynamoDB'], link: '/hld/systemcraft/cart-management.html',
      note: 'Session-like cart in Redis with write-behind to DynamoDB. Inventory reservation is where strong transactional consistency is isolated.' }
  },
  'ChatGPT': {
    title: 'LLM Chat Service (ChatGPT)',
    difficulty: 'Advanced',
    prompt: 'Stream tokens from GPU inference, queue requests under load, and keep conversation context. GPUs are the scarce resource.',
    scale: { rps: 60000, readPct: 30, cacheHit: 35, p99Budget: 125 },
    reqs: ['First token < 500ms', 'Stream 30-80 tokens/sec', 'Degrade rather than go down'],
    rubric: [R('LB / gateway for streaming connections', ['lb']), R('Queue to buffer inference requests', ['queue']), R('Compute tier for GPU inference', ['compute']), R('Cache for context + rate limits', ['cache']), R('Database for conversation history', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'Kafka', 'Worker', 'DynamoDB'], link: '/hld/systemcraft/chatgpt.html',
      note: 'Inference is the bottleneck: requests queue and get continuously batched. Tokens stream over SSE; context in Redis, history in DynamoDB.' }
  },
  'DistributedCache': {
    title: 'Distributed Cache (Redis Cluster)',
    difficulty: 'Intermediate',
    prompt: 'Spread a 500GB hot working set across RAM nodes with sub-ms GETs, and lose a node without stampeding the database.',
    scale: { rps: 500000, readPct: 91, cacheHit: 95, p99Budget: 50 },
    reqs: ['Cache GET < 5ms P99', '95%+ hit rate', 'Node loss costs a slice, not the tier'],
    rubric: [R('Load balancer in front of the app tier', ['lb']), R('App tier running the cache client + near cache', ['compute']), R('Sharded, replicated in-memory cache tier', ['cache']), R('Origin database as the source of truth', ['db']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['Load Balancer', 'App Server', 'Redis', 'PostgreSQL'], link: '/hld/systemcraft/distributed-cache.html',
      note: 'Keys hashed across 16384 hash slots. Losing a node drops only a fraction of cached keys; single-flight fills with jittered TTLs prevent stampedes.' }
  },
  'EcommercePlatform': {
    title: 'E-Commerce Platform (Amazon / Flipkart)',
    difficulty: 'Advanced',
    prompt: 'Browse and search 100M products, then check out without ever selling a unit you do not have, even in a flash sale.',
    scale: { rps: 200000, readPct: 95, cacheHit: 85, p99Budget: 200, burst: 2 },
    reqs: ['Search P95 < 200ms', 'Never oversell a unit', 'Survive a 2x flash sale'],
    rubric: [R('CDN/cache for product pages', ['cdn', 'cache']), R('LB at the edge', ['lb']), R('Compute tier for catalog, search and orders', ['compute']), R('Search index for text + facets', ['search']), R('Transactional DB for inventory and orders', ['db']), R('Event bus / CDC to keep the index in sync', ['queue']), RSIM(), RLAT(), RDUR()],
    ref: { stack: ['CDN', 'Load Balancer', 'Microservice', 'MongoDB', 'Elasticsearch', 'PostgreSQL', 'Kafka'], link: '/hld/systemcraft/e-commerce.html',
      note: 'Catalog reads served by CDN and MongoDB document store. Inventory updates committed in PostgreSQL with conditional decrements.' }
  }
};

export const SANDBOX_SCALE = {
  rps: 50000,
  readPct: 80,
  cacheHit: 80,
  p99Budget: 100
};

export function getChallenge(slug) {
  if (slug === 'sandbox') {
    return {
      title: 'Sandbox Playground',
      difficulty: 'Freeform',
      prompt: 'Design any software architecture without constraints. Drag components, wire links, tune traffic sliders, and inject chaos.',
      scale: { ...SANDBOX_SCALE },
      reqs: ['Free-form canvas', 'Adjustable traffic sliders', 'Interactive chaos engineering'],
      sandbox: true,
      rubric: [RSIM(), RLAT(), RDUR()]
    };
  }
  return CHALLENGES[slug] || null;
}
