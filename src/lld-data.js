// Aggregate of the LLD Lab chapters. One module per design under src/lld-data/, merged here
// so lld.jsx keeps a single import. Chapter shape is documented on LLD_CHAPTER_KEYS.

import { LRU_CHAPTER } from "./lld-data/lru-cache.js";
import { VENDING_CHAPTER } from "./lld-data/vending-machine.js";
import { PARKING_CHAPTER } from "./lld-data/parking-lot.js";
import { ELEVATOR_CHAPTER } from "./lld-data/elevator-system.js";

/** Documented shape of a chapter object (see any file in src/lld-data/). */
export const LLD_CHAPTER_KEYS = [
  "id", "num", "title", "level", "tagline", "pattern", "accent",
  "diagram", "uml", "sim", "minutes",
  "requirements", "clarify", "entities", "contract", "idea", "patterns",
  "decisions", "concurrency", "edgeCases", "atScale", "files", "umlNote",
  "qa", "followUps", "rubric", "complexity",
];

export const LLD_CHAPTERS = [
  LRU_CHAPTER,
  VENDING_CHAPTER,
  PARKING_CHAPTER,
  ELEVATOR_CHAPTER,
];

export const LLD_PATTERN_TABLE = [
  ["LRU Cache", "Composition + HashMap + LinkedList", "Two structures covering each other's weakness — and the lock story that follows from get() being a write."],
  ["Vending Machine", "State Pattern + two-phase reservation", "Legality belongs to the state; money is exact and stock cannot be oversold."],
  ["Parking Lot", "Strategy + Factory + CAS claim", "Fit is data, the two volatile rules are injected, and the resource arbitrates its own exclusion."],
  ["Elevator System", "State + Strategy + SCAN + actor", "Two owners for two volatile decisions, one writer per car, and a scheduler you can test."],
];

export const LLD_STEPS = [
  ["Clarify, then write the assumptions down", "Scale, concurrency model, persistence, failure policy, what is explicitly out of scope. Unstated assumptions cost more points than wrong code."],
  ["Design the API before the fields", "The contract is what a reviewer can argue with. Names, return types, error taxonomy, idempotency."],
  ["Nouns to classes, verbs to methods, change to a pattern", "Each axis of change becomes an interface; each lifecycle becomes a state; each creation rule becomes a factory."],
  ["Draw the object graph, then the sequence", "UML for ownership, sequence for one real flow. Interviewers read the arrows for coupling."],
  ["Implement the happy path in layers", "Domain first, service second, adapter last. Never let a controller own business rules."],
  ["Price the concurrency and the failure modes", "Who locks what, in which order, and what happens when the DB is slow or two requests race."],
  ["State the tradeoff you rejected out loud", "“I considered X and chose Y because Z, the cost is W.” That sentence separates SDE-2 from SDE-1."],
  ["Extend one axis without touching the others", "New pricing rule, new AI strategy, new vehicle type — the demo is that nothing else changes."],
];

export const LLD_LADDER = [
  "SOLID, with a named violation for each letter",
  "Composition over inheritance",
  "Interface segregation and dependency inversion",
  "Layering: domain / application / infrastructure",
  "Strategy and State as the two answers to “it depends”",
  "Factory and Builder where construction has rules",
  "Observer for side effects that must not leak into the flow",
  "Locking discipline: granularity, ordering, and lock-free reads",
  "Idempotency, leases, and retries that cannot double-charge",
  "Collections and their real complexity, not the brochure one",
  "Derived state vs stored state, and cache invalidation",
  "Testability: seams you can inject a fake into",
];

export const LLD_RECAP_CARDS = [
  ["LRU", "HashMap key→node + sentinel DLL → O(1) get/put; get() is a write, so shard instead of using a read lock"],
  ["Vending Machine", "Stateless state singletons + cent-based money + reserve/commit/release stock + change probed before debiting"],
  ["Parking Lot", "Fit as data, best-then-nearest ladder, per-kind free index, CAS claim, idempotent exit"],
  ["Elevator", "Dispatcher picks the car, car picks the floor; four pure-comparator sets = SCAN, one writer per car"],
];

export const LLD_FOLLOWUP_PROMPTS = [
  "Now make it thread-safe — and tell me what you locked.",
  "Two requests arrive at the same instant. Who wins, and how do you know?",
  "The database just took 4 seconds. What does the user see?",
  "Traffic is 1000× this. What breaks first?",
  "Add a new rule without touching the classes you already wrote.",
  "How would you test this? Show me the seam you inject a fake into.",
];
