// LRU Cache — SDE-2 grade design chapter.
// Contract first, then structure, then concurrency, then the operational story.

export const LRU_CHAPTER = {
  id: "lru-cache",
  num: "01",
  title: "LRU Cache",
  level: "Warm-up round · 35 min",
  tagline: "Looks trivial. SDE-2 is decided by the last 15 minutes: TTL, thread-sharding, eviction policy hooks.",
  pattern: "Composition + HashMap + Doubly Linked List",
  accent: "#7aa2ff",
  diagram: "lru",
  uml: "lru",
  sim: "lru",
  minutes: 35,
  requirements: [
    "get(key) returns the value and marks the entry as most-recently-used; miss returns null.",
    "put(key, value) inserts or overwrites and marks the entry as most-recently-used.",
    "On exceeding capacity the least-recently-used entry is evicted.",
    "get and put are worst-case O(1) — not amortised, not “average case HashMap”.",
    "Eviction must be observable so a backing store can be notified (write-behind).",
  ],
  clarify: [
    ["Is a read supposed to change eviction order?", "Yes — access-ordered, not write-ordered. This single answer changes get() from a read into a mutation, and it is what kills a naive ReadWriteLock later."],
    ["What is the value — a raw object or a handle?", "A materialised value plus byte size. That matters because capacity should really be bounded by weight/memory, not entry count."],
    ["May entries expire on their own?", "Ask. If yes you need TTL, and an expiring LRU is a different data structure (see the follow-up ladder)."],
    ["Who else reads this cache?", "One thread, many threads in one JVM, or many processes — each answer escalates to sharding and then to a distributed cache."],
  ],
  entities: [
    ["Cache<K,V>", "The contract. Write it before you write a single field — interviewers score the API as much as the internals."],
    ["LruCache<K,V>", "The only class that knows about the HashMap and the list, and the only place the invariant is maintained."],
    ["Node", "Map value + list member in one object. Storing the node reference is precisely what makes relink O(1)."],
    ["EvictionListener<K,V>", "The seam that lets a caller flush an evicted entry to disk/DB without LruCache knowing about storage."],
    ["CacheStats", "hits / misses / evictions. Say out loud that a cache without a hit-rate metric is invisible in production."],
    ["ShardedLruCache<K,V>", "N independent LRU segments, each with its own lock. Turns lock contention into a tuning knob."],
  ],
  contract: [
    "V get(K key)                  // null on miss; promotes the entry",
    "void put(K key, V value)      // insert or overwrite; may evict",
    "V remove(K key)               // explicit invalidation, returns the removed value",
    "int size()",
    "CacheStats stats()",
    "protected void removeEldest(Node eldest)   // overridable policy hook",
  ],
  idea: [
    "Two structures, each covering the other's weakness: a HashMap gives O(1) key→node lookup but no ordering; a doubly linked list gives O(1) unlink-anywhere and O(1) push/pop but no lookup. Keep the *node* in the map, not the value, and the two fuse: lookup finds the exact list cell you then relink in constant time.",
    "Sentinel head and tail make the list never empty, so insert and remove contain zero null-checks and zero first/last special cases. This is the difference between 6 correct pointer updates and the 14-line if-ladder most candidates write. Say the reason: “sentinels remove the boundary cases that cause the bugs”.",
    "Why doubly linked and not singly: eviction is from the tail, promotion is from the middle. Removing a middle node in O(1) needs its predecessor, which a singly linked list can only find by scanning. An ArrayList, a TreeMap or LinkedHashMap-with-access-order can look right, but they either pay O(n) shifts, O(log n) comparisons, or they hide the mechanism you are being asked to demonstrate.",
    "Layer policy on top of the mechanism: TTL, weight-based capacity, and eviction hooks are the parts that vary between real systems, so they belong behind a method (`removeEldest`) and a listener, not smeared through get() and put().",
  ],
  patterns: [
    ["Composition over inheritance", "LruCache HAS-A map and a list", "Inheriting HashMap (like java.util.LinkedHashMap does) couples you to its iteration order and rehash behaviour; composition keeps the invariant local."],
    ["Template Method", "protected removeEldest(node)", "Subclasses change eviction policy — weight-based, refresh-ahead, write-behind — without copying the list surgery."],
    ["Observer", "EvictionListener<K,V>", "Decouples “an entry died” from “so the DB row must be flushed”; also the seam for metrics."],
    ["Sharding / striping", "ShardedLruCache", "Same trick as ConcurrentHashMap's segments: shrink the critical section instead of making it smarter."],
  ],
  decisions: [
    ["Doubly linked list + HashMap", "O(1) worst-case lookup, relink and evict; node reference in the map is the bridge.", "LinkedTreeMap (O(log n)), ArrayList recency (O(n)), two heaps (O(log n) + lazy deletion mess)."],
    ["Move the node, not the value", "Relinking an existing node is allocation-free; a fresh node per get() would double GC pressure in a hot cache.", "Remove-then-insert into the map: two hash operations plus an allocation per read."],
    ["Store byte weight per entry", "Lets capacity mean “memory” instead of “count”, which is the only definition that stops OOM.", "Entry-count-only capacity: a 5-key cache of 200 MB strings still OOMs."],
    ["Synchronise the whole compound operation, or shard", "get() mutates, so the atomic unit is lookup + relink; you cannot lock at a finer grain without breaking the list.", "ReadWriteLock — documented as the trap answer, because the “read” path writes."],
  ],
  concurrency: [
    "The trap: `ReadWriteLock` feels right because most calls are `get`. But `get` relinks the list, so it is a write. Two “readers” under a read lock will corrupt `_head.next` and you get a lost node or a cycle — a bug that reproduces once a week under load.",
    "Correct single-JVM answer: one mutex around the compound operation, or shard by key hash so the mutex is contended by 1/N of the traffic. Sharding is preferred over a smarter lock; that is the same conclusion ConcurrentHashMap reached.",
    "Iterator safety: never walk the list while another thread can relink it. The sharded version keeps every traversal inside the segment's lock, which is also why stats snapshot per segment.",
    "`LongAdder` over `AtomicLong` for hit/miss counters: counters are write-heavy and reads are only for reporting, so striping the counter beats one contended cache line.",
    "Multi-process: an in-JVM LRU is not a cache strategy. The honest sentence is “beyond one JVM this becomes Redis with maxmemory-lru, and my class becomes a local L1 in front of it”.",
  ],
  edgeCases: [
    "capacity 0 or negative → reject at construction; a silent no-op cache is a production incident.",
    "put() of an entry larger than the whole capacity → store it alone and evict everything else, or reject it; decide, do not discover.",
    "null value stored vs key absent — with `V get()` returning null you must either forbid nulls or return an Optional.",
    "Duplicate key on put must not create a second node; the map assignment and the list insert must be one code path.",
    "Key mutated after insertion — hashCode changes, the map can never find the node, and it leaks until eviction. Use immutable keys; say it before the interviewer does.",
    "TTL expiry during get(): an expired entry is a miss, and it must be unlinked from the list too, or the list grows past capacity with dead nodes.",
  ],
  atScale: [
    "10k QPS single thread: fine — the structure is O(1); profile the lock first, not the list.",
    "100k QPS 32 threads: contention on one mutex dominates. Go sharded (16–64 segments), then tune segment count by measured wait time, not by vibes.",
    "1M+ keys: entry-count capacity stops meaning anything. Weight-based eviction plus a max heap share, and a background sampler that evicts 1% when the JVM nears the high-water mark.",
    "Hot key: an LRU cannot fix a key that is read 40% of the time — it is always at the head and always invalidating. Answer: request coalescing (single-flight) plus a local copy.",
    "Cold start: after a deploy every read is a miss and the origin takes the full load. Answer: warm-up, or a short negative-TTL stampede guard.",
  ],
  files: [
    {
      name: "Cache",
      java: `import java.util.function.BiConsumer;

/** Write the contract before the structure — this is the part interviewers read first. */
public interface Cache<K, V> {

    /** @return the value, or null on a miss. A hit promotes the entry (access order). */
    V get(K key);

    /** Insert or overwrite; promotes the entry and may evict the least recently used one. */
    void put(K key, V value);

    /** Explicit invalidation (config change, DB write-through). @return removed value or null. */
    V remove(K key);

    int size();

    CacheStats stats();

    /** Nested so the type travels with the contract it belongs to. */
    record CacheStats(long hits, long misses, long evictions, long expirations) {
        public double hitRate() {
            long reads = hits + misses;
            return reads == 0 ? 0d : (double) hits / reads;
        }
    }

    /** Value + metadata. Storing the wrapper (not V) is what lets us expire and weight entries. */
    record Entry<V>(V value, long bytes, long expiresAtMillis) {
        boolean isLive(long now) { return expiresAtMillis == 0 || now < expiresAtMillis; }
    }

    /** Seam for write-behind / metrics; fired outside the cache's own reasoning. */
    @FunctionalInterface
    interface EvictionListener<K, V> extends BiConsumer<K, V> { }
}`,
      cs: `using System;
using System.Collections.Generic;

/// Write the contract before the structure — this is the part interviewers read first.
public interface ICache<TKey, TValue>
{
    /// A hit promotes the entry (access order). Null means miss.
    TValue Get(TKey key);
    void Put(TKey key, TValue value);
    TValue Remove(TKey key);
    int Size { get; }
    CacheStats Stats();
}

/// Value + metadata. Storing the wrapper (not TValue) is what lets us expire and weight entries.
public sealed record Entry<TValue>(TValue Value, long Bytes, long ExpiresAtMillis)
{
    public bool IsLive(long now) => ExpiresAtMillis == 0 || now < ExpiresAtMillis;
}

public readonly record struct CacheStats(long Hits, long Misses, long Evictions, long Expirations)
{
    public double HitRate
    {
        get
        {
            long reads = Hits + Misses;
            return reads == 0 ? 0d : (double)Hits / reads;
        }
    }
}`,
    },
    {
      name: "LruCache",
      java: `import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.LongAdder;

/**
 * NOT thread safe by design; see ShardedLruCache for the concurrent answer.
 * Invariant: map.size() == list length == number of live entries, and the list is
 * ordered head->tail = most->least recently used. Both are only touched under 'this'.
 */
public class LruCache<K, V> implements Cache<K, V> {

    /** Doubly linked cell. Key lives here so eviction can delete the map entry.
     *  Package-private on purpose: removeEldest() is protected and must be overridable. */
    static class Node<V> {
        Node<V> prev, next;
        final Object key;
        Cache.Entry<V> entry;                // mutable: overwrite swaps the payload, never the cell
        Node(Object key, Cache.Entry<V> entry) { this.key = key; this.entry = entry; }
    }

    private final int capacity;
    private final long ttlMillis;                       // 0 = never expires on its own
    private final Map<K, Node<V>> index;
    private final Node<V> head, tail;                   // sentinels: list is never empty

    private final LongAdder hits = new LongAdder(), misses = new LongAdder(),
                          evictions = new LongAdder(), expirations = new LongAdder();
    private volatile Cache.EvictionListener<K, V> listener = (k, v) -> { };

    public LruCache(int capacity, long ttlMillis) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity must be positive");
        if (ttlMillis < 0) throw new IllegalArgumentException("ttl must not be negative");
        this.capacity = capacity;
        this.ttlMillis = ttlMillis;
        this.index = new HashMap<>(Math.max(16, capacity * 2));   // pre-size: no rehash in the hot path
        this.head = new Node<>(null, null);
        this.tail = new Node<>(null, null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    @Override
    public synchronized V get(K key) {
        Node<V> node = index.get(key);
        if (node == null) { misses.increment(); return null; }

        if (!node.entry.isLive(System.currentTimeMillis())) {
            unlink(node);                       // dead nodes must leave the list too, or capacity lies
            index.remove(key);
            expirations.increment();
            misses.increment();
            return null;
        }

        moveToHead(node);
        hits.increment();
        return node.entry.value();
    }

    @Override
    public synchronized void put(K key, V value) {
        put(key, value, ttlMillis == 0 ? 0 : System.currentTimeMillis() + ttlMillis, 0L);
    }

    /** Weight-aware overload: bytes feed a future weight-based eviction policy. */
    public synchronized void put(K key, V value, long expiresAtMillis, long bytes) {
        Cache.Entry<V> entry = new Cache.Entry<>(value, bytes, expiresAtMillis);
        Node<V> existing = index.get(key);

        if (existing != null) {                // overwrite path: reuse the cell, swap the payload
            existing.entry = entry;
            moveToHead(existing);
            return;
        }

        Node<V> node = new Node<>(key, entry);
        index.put(key, node);
        addFirst(node);

        if (index.size() > capacity) {
            Node<V> eldest = tail.prev;
            unlink(eldest);
            index.remove((K) eldest.key);
            evictions.increment();
            removeEldest(eldest);               // policy hook, still inside the lock: order is observable
        }
    }

    @Override
    public synchronized V remove(K key) {
        Node<V> node = index.remove(key);
        if (node == null) return null;
        unlink(node);
        return node.entry.value();
    }

    /** Overridable policy: write-behind, refresh-ahead, logging. Template Method on purpose. */
    protected void removeEldest(Node<V> eldest) {
        listener.accept((K) eldest.key, eldest.entry.value());
    }

    public void onEvict(Cache.EvictionListener<K, V> listener) { this.listener = listener; }

    @Override public synchronized int size() { return index.size(); }

    @Override
    public CacheStats stats() {                 // no lock: adders are eventually consistent, good enough for a gauge
        return new CacheStats(hits.sum(), misses.sum(), evictions.sum(), expirations.sum());
    }

    /* ----------------------------- list surgery: the only 4 methods that touch pointers ----------------------------- */

    private void addFirst(Node<V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void unlink(Node<V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
        node.prev = node.next = null;           // let GC reclaim the tail of a dropped chain
    }

    private void moveToHead(Node<V> node) { unlink(node); addFirst(node); }
}`,
      cs: `using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

/// NOT thread safe by design; see ShardedLruCache for the concurrent answer.
/// Invariant: map.Count == list length, and the list runs head->tail = MRU->LRU.
public class LruCache<TKey, TValue> : ICache<TKey, TValue>
{
    private sealed class Node
    {
        public Node Prev, Next;
        public TKey Key;
        public Entry<TValue> Entry;
        public Node(TKey key, Entry<TValue> entry) { Key = key; Entry = entry; }
    }

    private readonly int _capacity;
    private readonly long _ttlMillis;                     // 0 = never expires on its own
    private readonly Dictionary<TKey, Node> _index;
    private readonly Node _head, _tail;                   // sentinels: list is never empty

    private long _hits, _misses, _evictions, _expirations;
    private Action<TKey, TValue> _onEvict = (_, _) => { };

    public LruCache(int capacity, long ttlMillis = 0)
    {
        if (capacity <= 0) throw new ArgumentException("capacity must be positive");
        if (ttlMillis < 0) throw new ArgumentException("ttl must not be negative");

        _capacity = capacity;
        _ttlMillis = ttlMillis;
        _index = new Dictionary<TKey, Node>(Math.Max(16, capacity * 2));
        _head = new Node(default, null);
        _tail = new Node(default, null);
        _head.Next = _tail;
        _tail.Prev = _head;
    }

    public TValue Get(TKey key)
    {
        lock (_index)
        {
            if (!_index.TryGetValue(key, out var node)) { _misses++; return default; }

            if (!node.Entry.IsLive(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()))
            {
                Unlink(node);                             // dead nodes must leave the list too
                _index.Remove(key);
                _expirations++;
                _misses++;
                return default;
            }

            MoveToHead(node);
            _hits++;
            return node.Entry.Value;
        }
    }

    public void Put(TKey key, TValue value) =>
        Put(key, value, _ttlMillis == 0 ? 0 : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + _ttlMillis, 0L);

    /// Weight-aware overload: bytes feed a future weight-based eviction policy.
    public void Put(TKey key, TValue value, long expiresAtMillis, long bytes)
    {
        lock (_index)
        {
            var entry = new Entry<TValue>(value, bytes, expiresAtMillis);

            if (_index.TryGetValue(key, out var existing))
            {
                existing.Entry = entry;                   // overwrite path: never a second node
                MoveToHead(existing);
                return;
            }

            var node = new Node(key, entry);
            _index[key] = node;
            AddFirst(node);

            if (_index.Count > _capacity)
            {
                var eldest = _tail.Prev;
                Unlink(eldest);
                _index.Remove(eldest.Key);
                _evictions++;
                RemoveEldest(eldest);                     // policy hook, inside the lock: order is observable
            }
        }
    }

    public TValue Remove(TKey key)
    {
        lock (_index)
        {
            if (!_index.Remove(key, out var node)) return default;
            Unlink(node);
            return node.Entry.Value;
        }
    }

    /// Overridable policy: write-behind, refresh-ahead, logging.
    protected virtual void RemoveEldest(Node eldest) => _onEvict(eldest.Key, eldest.Entry.Value);

    public void OnEvict(Action<TKey, TValue> listener) => _onEvict = listener;

    public int Size { get { lock (_index) return _index.Count; } }

    public CacheStats Stats()
    {
        lock (_index)
            return new CacheStats(_hits, _misses, _evictions, _expirations);
    }

    /* --------------------- the only four methods that touch pointers --------------------- */

    private void AddFirst(Node node)
    {
        node.Next = _head.Next;
        node.Prev = _head;
        _head.Next.Prev = node;
        _head.Next = node;
    }

    private void Unlink(Node node)
    {
        node.Prev.Next = node.Next;
        node.Next.Prev = node.Prev;
        node.Prev = node.Next = null;                     // let GC reclaim a dropped chain
    }

    private void MoveToHead(Node node) { Unlink(node); AddFirst(node); }
}`,
    },
    {
      name: "ShardedLruCache",
      java: `import java.util.stream.IntStream;   // (shard fan-out is a plain loop; no streams in the hot path)

/**
 * The concurrency answer, in one sentence: do not make the lock cheaper, make it colder.
 * N independent LRUs, each guarded by its own monitor; a key always maps to the same shard.
 * Lock convoy on one mutex becomes contention on one of N mutexes. Cost: capacity is per-shard,
 * so eviction is approximate (LRU inside a shard, not global) — that trade is the interview.
 */
public final class ShardedLruCache<K, V> implements Cache<K, V> {

    private final LruCache<K, V>[] shards;

    @SuppressWarnings("unchecked")
    public ShardedLruCache(int totalCapacity, int shardCount, long ttlMillis) {
        if (shardCount <= 0 || totalCapacity < shardCount)
            throw new IllegalArgumentException("need at least one slot per shard");

        int perShard = Math.max(1, totalCapacity / shardCount);

        this.shards = new LruCache[shardCount];            // generic array: unchecked, once, in the ctor
        for (int i = 0; i < shardCount; i++) this.shards[i] = new LruCache<>(perShard, ttlMillis);
    }

    /** floorMod, not %: hashCode can be Integer.MIN_VALUE and % keeps the sign. */
    private LruCache<K, V> shard(K key) {
        return shards[Math.floorMod(key.hashCode(), shards.length)];
    }

    @Override public V get(K key) { return shard(key).get(key); }
    @Override public void put(K key, V value) { shard(key).put(key, value); }
    @Override public V remove(K key) { return shard(key).remove(key); }

    /** size() and stats() fan out across shards: each locks separately, so the total is a snapshot, not a fence. */
    @Override
    public int size() {
        int total = 0;
        for (LruCache<K, V> s : shards) total += s.size();
        return total;
    }

    @Override
    public CacheStats stats() {
        long h = 0, m = 0, e = 0, x = 0;
        for (LruCache<K, V> s : shards) {
            CacheStats st = s.stats();
            h += st.hits(); m += st.misses(); e += st.evictions(); x += st.expirations();
        }
        return new CacheStats(h, m, e, x);
    }
}`,
      cs: `using System;
using System.Linq;

/// The concurrency answer, in one sentence: do not make the lock cheaper, make it colder.
/// N independent LRUs, each with its own monitor; a key always maps to the same shard.
/// Cost: capacity is per-shard, so eviction is approximate (LRU within a shard, not global).
public sealed class ShardedLruCache<TKey, TValue> : ICache<TKey, TValue>
{
    private readonly LruCache<TKey, TValue>[] _shards;

    public ShardedLruCache(int totalCapacity, int shardCount, long ttlMillis = 0)
    {
        if (shardCount <= 0 || totalCapacity < shardCount)
            throw new ArgumentException("need at least one slot per shard");

        int perShard = Math.Max(1, totalCapacity / shardCount);

        _shards = Enumerable.Range(0, shardCount)
            .Select(_ => new LruCache<TKey, TValue>(perShard, ttlMillis))
            .ToArray();
    }

    // Math.Abs is unsafe here: int.MinValue has no positive counterpart. FloorMod keeps it sane.
    private LruCache<TKey, TValue> ShardOf(TKey key) =>
        _shards[Math.FloorMod(key.GetHashCode(), _shards.Length)];

    public TValue Get(TKey key) => ShardOf(key).Get(key);
    public void Put(TKey key, TValue value) => ShardOf(key).Put(key, value);
    public TValue Remove(TKey key) => ShardOf(key).Remove(key);

    public int Size => _shards.Sum(s => s.Size);

    public CacheStats Stats() => _shards
        .Select(s => s.Stats())
        .Aggregate(new CacheStats(0, 0, 0, 0),
            (a, b) => a with { Hits = a.Hits + b.Hits, Misses = a.Misses + b.Misses,
                               Evictions = a.Evictions + b.Evictions,
                               Expirations = a.Expirations + b.Expirations });
}`,
    },
  ],
  umlNote: "LruCache owns two fields that must never disagree. The UML is the artifact where you prove you know which object is the source of truth.",
  qa: [
    ["Why not just extend LinkedHashMap?", "It does exactly this (accessOrder=true + removeEldestEntry), and in production you should use it or Caffeine. In the interview, extending it hides the mechanism you were asked to demonstrate — and you cannot add weight-based eviction, eviction listeners or sharding inside its removeEldestEntry hook without rewriting its entry semantics."],
    ["Why is a ReadWriteLock wrong here?", "Because get() mutates the recency list. Read locks allow concurrent get() calls, which then race on the same prev/next pointers and corrupt the list. ReadWriteLock only pays off when reads are truly read-only — e.g. an LFU counter you update lazily."],
    ["Your HashMap is not thread-safe either — why?", "It is guarded by the same monitor as the list, which is required: map.put and addFirst are one atomic unit. A concurrent map would let a second thread observe a node that exists in the map but is not yet linked, and its relink would dereference null sentinels."],
    ["What is the actual complexity of get()?", "HashMap lookup is O(1) average and O(n) worst case when hashes collide; the list work is O(1) worst case. The honest answer is 'O(1) amortised with a worst-case degenerate input', and the mitigation is a good hash and a load factor below 1."],
    ["How do you know eviction order is right after a crash?", "You do not need to. LRU is a heuristic — after a restart you rebuild by warming up. If correctness depended on eviction order, it would not be a cache."],
    ["When is LRU the wrong policy?", "Sequential scans (it evicts everything it just read — use LRU-K or 2Q), one-hit wonders in a log-processing workload, and anything with Zipf-biased hot keys where LFU wins because frequency survives bursts."],
  ],
  followUps: [
    ["“Make it thread-safe.”", "Reach for sharding, not a bigger lock: N segments, floorMod on the key hash, per-segment monitor. State the cost — eviction becomes per-shard approximate. Only then mention ConcurrentHashMap + an atomic timestamp-based relink (no list at all) as the lock-free alternative, and explain that it trades exact recency for throughput."],
    ["“Now it is an LFU cache.”", "Frequency is a third dimension: you need O(1) get/put AND O(1) min-frequency lookup. That is a map key→node plus a map freq→doubly-linked-list-of-nodes, with a minFreq pointer. When the bucket for minFreq empties, minFreq++ is O(1) because you never decrement on read. Saying 'I keep one list per frequency and a pointer to the minimum' is the whole answer."],
    ["“Add TTL — but do not scan the map.”", "Keep an expiry queue (PriorityQueue ordered by expiresAt, or a hashed timing wheel) and purge lazily: on get(), and in a background thread popping entries whose deadline passed. The subtlety to raise: a refreshed entry makes the queued deadline stale, so queue entries carry a version stamp and are skipped when it no longer matches."],
    ["“Capacity in bytes, not entries.”", "Track total weight; evict from the tail while weight > budget; reject a single value larger than the budget outright. Mention fragmentation: an oversized entry that fits no tail eviction silently breaks the invariant unless you handle it."],
    ["“Two threads miss the same key at once — both hit the DB.”", "Single-flight: the map stores a FutureTask per in-flight key; the first miss installs it, others join it. This is the difference between a cache and a cache that protects its origin. Guard against the failure case too — if the loader throws, everyone waiting must see the exception and the entry must be removed, or you cache a null forever."],
    ["“Now it is distributed across 20 pods.”", "LRU is per-pod; the union of 20 per-pod LRUs is not LRU and eviction amplifies misses. Options: consistent hashing so a key lands on one pod, or Redis maxmemory-policy allkeys-lru and keep the local cache as L1 with a short TTL. Mention invalidation broadcast (pub/sub) as the cost of L1."],
  ],
  rubric: {
    strong: [
      "Writes the interface and states the invariant before touching pointers.",
      "Sentinel nodes, and can say why in one sentence.",
      "Names LinkedHashMap/Caffeine, then explains why the hand-rolled version exists.",
      "Volunteers that get() is a mutation — and why that kills ReadWriteLock.",
      "Escalates to sharding, then to Redis, with the trade of each stated.",
    ],
    weak: [
      "Two-pass eviction or a list rebuild to find the LRU entry (that is O(n)).",
      "Stores values in the map and re-derives order later.",
      "Silent capacity-0 handling or null-on-miss without saying it.",
      "Adds a lock only on put() because 'get is read-only'.",
      "Cannot answer 'what happens at 200k QPS' at all.",
    ],
  },
  complexity: [
    ["get", "O(1) amortised"],
    ["put", "O(1) amortised"],
    ["remove", "O(1)"],
    ["space", "O(capacity) + map overhead"],
    ["lock wait", "O(1/N) under sharding"],
    ["GC", "0 allocations per hit"],
  ],
};
