// Vending Machine — SDE-2 grade: State pattern with stateless singletons, cent-based money,
// two-phase stock reservation, and change that fails before anything mutates.

export const VENDING_CHAPTER = {
  id: "vending-machine",
  num: "02",
  title: "Vending Machine",
  level: "Classic pattern round · 40 min",
  tagline: "Everyone writes the State Pattern. Almost nobody handles the money, the stock race and the change.",
  pattern: "State Pattern + two-phase reservation + Strategy (change maker)",
  accent: "#f0c674",
  diagram: "vending",
  uml: "vending",
  sim: "vending",
  minutes: 40,
  requirements: [
    "Insert coins/notes; the machine keeps a running balance for the current session.",
    "Select a product by code; the choice must be changeable before checkout.",
    "Checkout validates price and change, debits, dispenses, returns coins, and resets.",
    "Cancel refunds the whole balance and returns nothing else.",
    "Every illegal operation is rejected with a typed error, not a boolean or a printed message.",
    "Concurrent button presses must never oversell a slot or hand out change twice.",
  ],
  clarify: [
    ["Is a product “selected then paid”, or “paid then selected”?", "Both exist. Pick select-then-pay: it lets you reserve stock at selection time, which is the only way to avoid two customers buying the last Snickers."],
    ["Do you hold physical coin denominations?", "Yes, and change must be made from what is actually in the vault — otherwise “Dispense” succeeds and the machine is stuck with a customer's money in it."],
    ["What is the money type?", "Integer cents. If you reach for double, the interviewer has their first rejection reason: 0.1 + 0.2 != 0.3."],
    ["Single device or a fleet?", "One machine, many controllers in a server fleet. Answer for one, then say what a fleet adds (the ledger moves behind a repository)."],
    ["Is a failed dispense a refund?", "Business question. Decide: dispensing is optimistic and a sensor failure triggers a compensating refund — that is a saga, and naming it earns the point."],
  ],
  entities: [
    ["VendingApi", "The user-facing contract: insertCoin / selectProduct / checkout / cancel. Nested Receipt and Product are its DTO surface."],
    ["VendingState", "The behaviour of one machine state. Five methods, one class each, no if-chains in the machine."],
    ["VendingMachine", "The context. Owns balance, selection, session id, and the state pointer; dispatches and stores, never decides."],
    ["Inventory", "Slots with counts, plus the two-phase reserve / commit / release that makes selling atomic."],
    ["CoinVault", "Denomination ladder + change making. A Strategy, so greedy can be swapped for exact-change-only."],
    ["VendingException family", "Typed failures: InsufficientBalance carries the shortfall, OutOfStock carries the code, IllegalState carries the transition."],
    ["SaleLedger", "Append-only record of completed sales. The audit trail an operator actually audits."],
  ],
  contract: [
    "void insertCoin(int cents)          // accumulates balance, stays in HAS_BALANCE",
    "void selectProduct(String code)     // reserves stock; may be re-selected",
    "Receipt checkout()                  // validate-all, then mutate-all",
    "int cancel()                        // releases reservation, refunds, returns refunded cents",
    "int balanceCents()",
    "String stateName()                  // what the LCD shows; also your test assertion",
  ],
  idea: [
    "The machine is a state machine, and the requirement is that legality depends on state. The naive version is one method per operation with a switch over an enum: legality then costs state × operations branches, and every new state is an edit to every method. The State Pattern inverts it — one class per state owning exactly its own legal operations, illegal ones throwing. Adding MAINTENANCE becomes one class plus the transitions it allows, and IdleState is never opened.",
    "Second move that reads senior: states are stateless, so they are singletons. All mutable data (balance, selection, session) lives on the context. New state objects per transition look fine but churn allocations, break identity comparison, and — the real cost — tempt you into storing data inside the state, which is exactly the bug that makes a state machine unrestartable after a crash.",
    "Third move is where candidates actually fail: money and stock. Money is integer cents in a value object, so arithmetic is exact and comparison is one field. Stock is reserved at selection (a decrement plus a pending entry keyed by session), committed at checkout, and released on cancel or rejection. Without the reservation, “checkout checks IsAvailable then decrements” is a check-then-act race that oversells on the last unit.",
    "And ordering inside checkout(): validate the price, the reservation, and change availability first, then mutate. If the vault cannot make change, the customer must find out before their Snickers left the slot — a failure after a side effect is a refund, and refunds are the most expensive code in the machine.",
  ],
  patterns: [
    ["State", "VendingState + 5 implementations", "Behavior varies by state; transitions are SetState calls, so legality is defined next to the state that owns it."],
    ["Strategy", "CoinVault's change ladder / IChangeMaker", "Greedy change-making is a policy: some machines must return exact coins, some accept a note dispensed as credit. Swapping it touches no state class."],
    ["Two-phase resource ownership", "Inventory.reserve → commit → release", "The general answer to “sell exactly one unit”. Same shape as a DB transaction or a seat hold."],
    ["Null Object", "SaleLedger.NOOP", "Tests and single-player mode pass a no-op ledger instead of null-checking it in three states."],
    ["Value Object", "Product / Receipt as records", "Immutable, comparable, safe to hand across layers and to log without defensive copies."],
  ],
  decisions: [
    ["Stateless singleton states over per-transition instances", "No allocation per button press, `state == IdleState.INSTANCE` is a valid test assertion, and no state can smuggle data.", "New object per transition (invites mutable state inside the state), or an enum with a switch (back to the if-maze)."],
    ["int cents over decimal/double", "Exact, cheap, serialisable, and impossible to accumulate float drift across 10k transactions.", "double (wrong), BigDecimal (right semantics, but noise in a whiteboard design; say you would use it for multi-currency)."],
    ["Reserve stock at selection", "Sells exactly one unit under concurrency and lets “out of stock” be answered before money is accepted.", "Decrement at dispense: oversells, and you must refund people who paid for air."],
    ["Validate everything before mutating", "One failure mode: nothing happened. No compensating code needed.", "Best-effort with rollback: needs a compensating transaction and a much longer explanation."],
    ["Session id on every transition", "Stale callbacks (a dispense sensor firing late) can be rejected by comparing session ids.", "Assuming callbacks are ordered — they are not once a thread pool is involved."],
  ],
  concurrency: [
    "All public operations are `synchronized` on the machine. That is one coarse lock on purpose: the critical section is microseconds and the operations are user-driven, so contention is not the problem — correctness is. Say the scale answer before being asked: a fleet of machines shards by device id, so the lock is already per-machine.",
    "Reentrancy is load-bearing: `checkout()` (synchronized) calls `state.checkout(this)` which calls `machine.settle(...)` (also synchronized). Java monitors are reentrant so this is safe; the same design with an explicit `ReentrantLock` would deadlock if you switched to a non-reentrant lock or forgot to make it reentrant.",
    "The race you must name unprompted: two customers press checkout for the last unit. With reserve-at-selection, the second one already failed at `selectProduct`, so the lock only has to protect bookkeeping. Without it you have a check-then-act bug that no amount of locking-after-the-fact fixes.",
    "Never call out to a slow collaborator (payment gateway, telemetry) while holding the machine lock. Publish events after the lock is released — a `TransactionListener` invoked at the end of `checkout()`, not inside `DispenseState`.",
    "In C#, `lock (_gate)` plus reentrancy via Monitor is the same story; do not `async` inside the lock, and mention that `SemaphoreSlim` is what you reach for when the dispense step really does become I/O-bound.",
  ],
  edgeCases: [
    "Inserting 0 or negative cents → rejected at the boundary, not accumulated.",
    "Selecting the same product twice → re-selection, not a second reservation (idempotency on the session key).",
    "Selecting an out-of-stock code while holding a balance → error, and the balance must survive; the customer decides whether to cancel.",
    "Exact payment where the vault has no matching coins → ChangeUnavailableException thrown before anything mutates.",
    "Empty vault with a nonzero balance → checkout must refuse, or the machine eats the customer's money. State it as a business rule (credit note), not a crash.",
    "Cancel during dispensing → refused with IllegalState; the seam where a real machine needs a physical interlock.",
    "Overpayment loop: customer inserts until balance is absurd. Cap the balance per session and force a refund.",
  ],
  atScale: [
    "Fleet of 40k machines: the device logic stays as-is, and state transitions become events written to a per-device stream (Kafka) so ops can replay a machine's LCD history.",
    "Cashless payment: `checkout` splits into `authorize` (gateway, may be slow, idempotency-key = session id) and `settle`. Never hold the machine across a gateway call.",
    "Inventory truth: an operator restocks from a tablet, so `Inventory` moves behind `IInventoryRepository` with an optimistic version column; a stale restock must fail rather than clobber.",
    "Telemetry: sales, jam faults and coin-vault levels are append-only facts; the “low coin” alert is a projection over them, not a field on the machine.",
    "Fault injection: the dispense motor can fail after the debit. Model `DISPENSE_FAILED` as a real state with a compensating refund and an alert — the interviewer is testing whether you pretend hardware is reliable.",
  ],
  files: [
    {
      name: "VendingApi",
      java: `import java.util.Map;

/** The whole user-facing surface. Write this first; everything else is an implementation detail. */
public interface VendingApi {

    void insertCoin(int cents);

    void selectProduct(String code);

    Receipt checkout();

    /** @return the amount refunded to the coin return. */
    int cancel();

    int balanceCents();

    /** The LCD text. Also the cheapest assertion in your tests. */
    String stateName();

    /** Immutable catalogue entry. Price in cents: never a floating point number for money. */
    record Product(String code, String name, int priceCents) {
        public Product {
            if (code == null || code.isBlank()) throw new IllegalArgumentException("code required");
            if (priceCents <= 0) throw new IllegalArgumentException("price must be positive for " + code);
        }
    }

    /** Everything a customer (and the audit log) needs about one completed sale. */
    record Receipt(long transactionId, String code, String name,
                   int chargedCents, int changeCents, Map<Integer, Integer> coinsReturned) {
        public Receipt { coinsReturned = Map.copyOf(coinsReturned); }
    }
}`,
      cs: `using System.Collections.Generic;

/// The whole user-facing surface. Write this first; everything else is an implementation detail.
public interface IVendingApi
{
    void InsertCoins(int cents);
    void SelectProduct(string code);
    Receipt Checkout();

    /// Returns the amount refunded to the coin return.
    int Cancel();

    int BalanceCents { get; }

    /// The LCD text. Also the cheapest assertion in your tests.
    string StateName { get; }
}

/// Immutable catalogue entry. Price in cents: never a floating point number for money.
public sealed record Product
{
    public string Code { get; }
    public string Name { get; }
    public int PriceCents { get; }

    public Product(string code, string name, int priceCents)
    {
        if (string.IsNullOrWhiteSpace(code)) throw new System.ArgumentException("code required");
        if (priceCents <= 0) throw new System.ArgumentException("price must be positive for " + code);

        Code = code;
        Name = name;
        PriceCents = priceCents;
    }
}

/// Everything a customer (and the audit log) needs about one completed sale.
public sealed record Receipt(long TransactionId, string Code, string Name,
                             int ChargedCents, int ChangeCents, IReadOnlyDictionary<int, int> CoinsReturned);`,
    },
    {
      name: "VendingException",
      java: `/** One base type so a caller can catch "vending went wrong" once, and a nested family so it
 *  can also branch on capability. Message-string matching is how production alerts rot. */
public class VendingException extends RuntimeException {
    public VendingException(String message) { super(message); }
    public VendingException(String message, Throwable cause) { super(message, cause); }

    /** Carries the shortfall so the UI can say "insert 25 more cents". */
    public static class InsufficientBalance extends VendingException {
        private final int shortfallCents;
        public InsufficientBalance(int shortfallCents) {
            super("Short by " + shortfallCents + " cents");
            this.shortfallCents = shortfallCents;
        }
        public int shortfallCents() { return shortfallCents; }
    }

    public static class OutOfStock extends VendingException {
        public OutOfStock(String code) { super("No stock for " + code); }
    }

    /** The State Pattern's answer to "you pressed that at the wrong time". */
    public static class IllegalTransition extends VendingException {
        public IllegalTransition(String state, String operation) {
            super(operation + " is not allowed in " + state);
        }
    }

    /** Thrown before any mutation: the machine cannot complete this sale at all. */
    public static class ChangeUnavailable extends VendingException {
        public ChangeUnavailable(int requiredCents) {
            super("Cannot make change for " + requiredCents + " cents");
        }
    }
}`,
      cs: `using System;

/// One base type so a caller can catch "vending went wrong" once, and a nested family so it
/// can also branch on capability. Message-string matching is how production alerts rot.
public class VendingException : Exception
{
    public VendingException(string message) : base(message) { }
    public VendingException(string message, Exception cause) : base(message, cause) { }

    /// Carries the shortfall so the UI can say "insert 25 more cents".
    public sealed class InsufficientBalance : VendingException
    {
        public int ShortfallCents { get; }
        public InsufficientBalance(int shortfallCents)
            : base("Short by " + shortfallCents + " cents") => ShortfallCents = shortfallCents;
    }

    public sealed class OutOfStock : VendingException
    {
        public OutOfStock(string code) : base("No stock for " + code) { }
    }

    /// The State Pattern's answer to "you pressed that at the wrong time".
    public sealed class IllegalTransition : VendingException
    {
        public IllegalTransition(string state, string operation)
            : base(operation + " is not allowed in " + state) { }
    }

    /// Thrown before any mutation: the machine cannot complete this sale at all.
    public sealed class ChangeUnavailable : VendingException
    {
        public ChangeUnavailable(int requiredCents)
            : base("Cannot make change for " + requiredCents + " cents") { }
    }
}`,
    },
    {
      name: "Inventory",
      java: `import java.util.HashMap;
import java.util.Map;

/**
 * Stock with two-phase ownership. reserve() takes the unit out of the sellable count and hangs
 * it on a session; commit() burns it; release() puts it back. That trio is why a checkout cannot
 * oversell, and it is the same shape as a DB transaction or a seat hold.
 */
public final class Inventory {

    private static final class Slot {
        final VendingApi.Product product;
        int count;
        Slot(VendingApi.Product product, int count) { this.product = product; this.count = count; }
    }

    private final Map<String, Slot> slots = new HashMap<>();

    /** session -> code it is holding. One reservation per session, so re-select is idempotent. */
    private final Map<Long, String> held = new HashMap<>();

    public void stock(VendingApi.Product product, int quantity) {
        if (quantity < 0) throw new IllegalArgumentException("quantity must not be negative");

        Slot existing = slots.get(product.code());
        if (existing == null) slots.put(product.code(), new Slot(product, quantity));
        else existing.count += quantity;
    }

    public VendingApi.Product require(String code) {
        Slot slot = slots.get(code);
        if (slot == null) throw new VendingException.OutOfStock("unknown code " + code);
        return slot.product;
    }

    public boolean available(String code) {
        Slot slot = slots.get(code);
        return slot != null && slot.count > 0;
    }

    /** @return true if this call took the unit, false if the session already held it. */
    public boolean reserve(String code, long session) {
        String alreadyHeld = held.get(session);
        if (code.equals(alreadyHeld)) return false;

        Slot slot = slots.get(code);
        if (slot == null || slot.count == 0) throw new VendingException.OutOfStock(code);

        if (alreadyHeld != null) release(session);      // switching products returns the previous unit
        slot.count--;
        held.put(session, code);
        return true;
    }

    public void commit(long session) { held.remove(session); }

    public void release(long session) {
        String code = held.remove(session);
        if (code != null) slots.get(code).count++;
    }

    public int sellableCount() {
        int total = 0;
        for (Slot slot : slots.values()) total += slot.count;
        return total;
    }
}`,
      cs: `using System.Collections.Generic;

/// Stock with two-phase ownership. Reserve() takes the unit out of the sellable count and hangs
/// it on a session; Commit() burns it; Release() puts it back. That trio is why a checkout cannot
/// oversell, and it is the same shape as a DB transaction or a seat hold.
public sealed class Inventory
{
    private sealed class Slot
    {
        public Product Product;
        public int Count;
        public Slot(Product product, int count) { Product = product; Count = count; }
    }

    private readonly Dictionary<string, Slot> _slots = new();

    /// session -> code it is holding. One reservation per session, so re-select is idempotent.
    private readonly Dictionary<long, string> _held = new();

    public void Stock(Product product, int quantity)
    {
        if (quantity < 0) throw new System.ArgumentException("quantity must not be negative");

        if (_slots.TryGetValue(product.Code, out var slot)) slot.Count += quantity;
        else _slots[product.Code] = new Slot(product, quantity);
    }

    public Product Require(string code)
    {
        if (!_slots.TryGetValue(code, out var slot) || slot.Count == 0)
            throw new VendingException.OutOfStock(code);
        return slot.Product;
    }

    public bool Available(string code) =>
        _slots.TryGetValue(code, out var slot) && slot.Count > 0;

    /// Returns true if this call took the unit, false if the session already held it.
    public bool Reserve(string code, long session)
    {
        _held.TryGetValue(session, out var alreadyHeld);
        if (Equals(code, alreadyHeld)) return false;

        if (!_slots.TryGetValue(code, out var slot) || slot.Count == 0)
            throw new VendingException.OutOfStock(code);

        if (alreadyHeld != null) Release(session);       // switching products returns the previous unit
        slot.Count--;
        _held[session] = code;
        return true;
    }

    public void Commit(long session) => _held.Remove(session);

    public void Release(long session)
    {
        if (!_held.Remove(session, out var code)) return;
        _slots[code].Count++;
    }

    public int SellableCount()
    {
        int total = 0;
        foreach (var slot in _slots.Values) total += slot.Count;
        return total;
    }
}`,
    },
    {
      name: "CoinVault",
      java: `import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Change making as a Strategy, because it is a policy: this implementation is greedy over the
 * denominations the vault actually holds. Greedy is optimal for canonical ladders (1,2,5,10,20,50,100,200)
 * — say that out loud, then say what happens for a non-canonical ladder (it needs DP, and the
 * vault must then be modelled as a bounded coin-change problem, which is why real machines accept
 * only a fixed ladder).
 */
public final class CoinVault {

    private final TreeMap<Integer, Integer> byDenomination = new TreeMap<>(java.util.Collections.reverseOrder());
    private int totalCents;

    public CoinVault(Map<Integer, Integer> denominations) {
        denominations.forEach((coin, count) -> addCoins(coin, count));
    }

    public synchronized void addCoins(int denominationCents, int count) {
        if (denominationCents <= 0 || count < 0) throw new IllegalArgumentException("bad coin spec");
        byDenomination.merge(denominationCents, count, Integer::sum);
        totalCents += denominationCents * count;
    }

    public synchronized int heldCents() { return totalCents; }

    /**
     * Pure probe: can the vault make this amount? checkout() calls this BEFORE debiting anything,
     * so a machine with no nickels never swallows a dollar.
     */
    public synchronized boolean canMakeChange(int cents) {
        return cents == 0 || plan(cents) != null;
    }

    /** @return denomination -> count dispensed, or null when impossible. */
    public synchronized Map<Integer, Integer> dispenseChange(int cents) {
        Map<Integer, Integer> plan = plan(cents);
        if (plan == null) throw new VendingException.ChangeUnavailable(cents);

        plan.forEach((coin, count) -> {
            int remaining = byDenomination.merge(coin, -count, Integer::sum);
            if (remaining == 0) byDenomination.remove(coin);
        });
        totalCents -= cents;
        return plan;
    }

    /** Greedy walk down the ladder. Kept side-effect free so canMakeChange and dispense agree. */
    private Map<Integer, Integer> plan(int cents) {
        if (cents < 0 || cents > totalCents) return null;

        Map<Integer, Integer> out = new LinkedHashMap<>();
        int remaining = cents;

        for (Integer coin : byDenomination.keySet()) {
            if (remaining == 0) break;
            int usable = Math.min(remaining / coin, byDenomination.get(coin));
            if (usable > 0) {
                out.put(coin, usable);
                remaining -= usable * coin;
            }
        }
        return remaining == 0 ? out : null;
    }
}`,
      cs: `using System;
using System.Collections.Generic;
using System.Linq;

/// Change making as a Strategy, because it is a policy: this implementation is greedy over the
/// denominations the vault actually holds. Greedy is optimal for canonical ladders
/// (1,2,5,10,20,50,100,200) — say that out loud, then say what happens for a non-canonical ladder.
public sealed class CoinVault
{
    private readonly SortedDictionary<int, int> _byDenomination = new(DescendingInts.Instance);
    private int _totalCents;

    public CoinVault(IReadOnlyDictionary<int, int> denominations)
    {
        foreach (var (coin, count) in denominations) AddCoins(coin, count);
    }

    public void AddCoins(int denominationCents, int count)
    {
        if (denominationCents <= 0 || count < 0) throw new ArgumentException("bad coin spec");

        _byDenomination.TryGetValue(denominationCents, out int current);
        _byDenomination[denominationCents] = current + count;
        _totalCents += denominationCents * count;
    }

    public int HeldCents => _totalCents;

    /// Pure probe: checkout calls this BEFORE debiting anything, so a machine with no nickels
    /// never swallows a dollar.
    public bool CanMakeChange(int cents) => cents == 0 || Plan(cents) != null;

    /// Returns denomination -> count dispensed.
    public IReadOnlyDictionary<int, int> DispenseChange(int cents)
    {
        var plan = Plan(cents);
        if (plan == null) throw new VendingException.ChangeUnavailable(cents);

        foreach (var (coin, count) in plan)
        {
            int remaining = _byDenomination[coin] - count;
            if (remaining == 0) _byDenomination.Remove(coin);
            else _byDenomination[coin] = remaining;
        }
        _totalCents -= cents;
        return plan;
    }

    /// Greedy walk down the ladder; side-effect free so probe and dispense can never disagree.
    private IReadOnlyDictionary<int, int> Plan(int cents)
    {
        if (cents < 0 || cents > _totalCents) return null;

        var out = new Dictionary<int, int>();
        int remaining = cents;

        foreach (int coin in _byDenomination.Keys.ToArray())
        {
            if (remaining == 0) break;
            int usable = Math.Min(remaining / coin, _byDenomination[coin]);
            if (usable > 0)
            {
                out[coin] = usable;
                remaining -= usable * coin;
            }
        }
        return remaining == 0 ? out : null;
    }

    private sealed class DescendingInts : IComparer<int>
    {
        public static readonly DescendingInts Instance = new();
        public int Compare(int x, int y) => y.CompareTo(x);
    }
}`,
    },
    {
      name: "VendingState",
      java: `import java.util.Map;

/**
 * One class per state. Note what is NOT here: no balance, no selection, no session.
 * States are stateless singletons, so the whole machine can be reset by pointing at
 * IdleState.INSTANCE — and no state can hold data that would be lost on a restart.
 * The implementations below are package-private on purpose: only the context constructs them.
 */
public interface VendingState {

    String name();

    void insertCoin(VendingMachine machine, int cents);

    void selectProduct(VendingMachine machine, String code);

    VendingApi.Receipt checkout(VendingMachine machine);

    int cancel(VendingMachine machine);

    default void reject(String operation) {
        throw new VendingException.IllegalTransition(name(), operation);
    }
}

final class IdleState implements VendingState {

    static final IdleState INSTANCE = new IdleState();
    private IdleState() { }

    @Override public String name() { return "IDLE"; }

    @Override
    public void insertCoin(VendingMachine machine, int cents) {
        machine.credit(cents);
        machine.transitionTo(new BalanceState());
    }

    @Override public void selectProduct(VendingMachine m, String code) { reject("SelectProduct"); }
    @Override public VendingApi.Receipt checkout(VendingMachine m) { reject("Checkout"); return null; }
    @Override public int cancel(VendingMachine m) { reject("Cancel"); return 0; }
}

final class BalanceState implements VendingState {

    BalanceState() { }

    @Override public String name() { return "HAS_BALANCE"; }

    /** Legal and non-transitioning: adding money to money is the same state. Interviewers probe this. */
    @Override
    public void insertCoin(VendingMachine machine, int cents) { machine.credit(cents); }

    @Override
    public void selectProduct(VendingMachine machine, String code) {
        machine.reserve(code);                       // throws OutOfStock before any state change
        machine.transitionTo(new SelectedState());
    }

    @Override public VendingApi.Receipt checkout(VendingMachine m) { reject("Checkout"); return null; }

    @Override
    public int cancel(VendingMachine machine) { return machine.refund(); }
}

final class SelectedState implements VendingState {

    @Override public String name() { return "PRODUCT_SELECTED"; }

    @Override
    public void insertCoin(VendingMachine machine, int cents) { machine.credit(cents); }

    @Override
    public void selectProduct(VendingMachine machine, String code) {
        machine.reserve(code);                       // switch: old unit is released inside reserve
    }

    @Override
    public VendingApi.Receipt checkout(VendingMachine machine) {
        int price = machine.selectedPriceCents();

        // Validate-all-then-mutate. Order here is the design: probe change before debiting.
        int change = machine.balanceCents() - price;
        if (change < 0) throw new VendingException.InsufficientBalance(-change);
        if (!machine.vault().canMakeChange(change)) throw new VendingException.ChangeUnavailable(change);

        Map<Integer, Integer> coins = machine.vault().dispenseChange(change);

        machine.debit(price);                        // balance -> 0, sale recorded
        machine.transitionTo(new DispensingState());
        return machine.completeSale(coins);          // re-dispatch: DispensingState owns the hardware step
    }

    @Override
    public int cancel(VendingMachine machine) { return machine.abandon(); }
}

final class DispensingState implements VendingState {

    @Override public String name() { return "DISPENSING"; }

    @Override public void insertCoin(VendingMachine m, int cents) { reject("InsertCoin"); }
    @Override public void selectProduct(VendingMachine m, String code) { reject("SelectProduct"); }
    @Override public VendingApi.Receipt checkout(VendingMachine m) { reject("Checkout"); return null; }
    @Override public int cancel(VendingMachine m) { reject("Cancel"); return 0; }
}

/** Operator mode: rejects every customer call but lets a technician restock. Adding a state must
 *  mean adding a class — not editing five methods elsewhere. */
final class MaintenanceState implements VendingState {

    @Override public String name() { return "MAINTENANCE"; }

    @Override public void insertCoin(VendingMachine m, int cents) { reject("InsertCoin"); }
    @Override public void selectProduct(VendingMachine m, String code) { reject("SelectProduct"); }
    @Override public VendingApi.Receipt checkout(VendingMachine m) { reject("Checkout"); return null; }
    @Override public int cancel(VendingMachine m) { reject("Cancel"); return 0; }
}`,
      cs: `using System.Collections.Generic;

/// One class per state. Note what is NOT here: no balance, no selection, no session.
/// States are stateless singletons, so the machine resets by pointing at IdleState.Instance,
/// and no state can hold data that would be lost on a restart.
public interface IVendingState
{
    string Name { get; }
    void InsertCoins(VendingMachine machine, int cents);
    void SelectProduct(VendingMachine machine, string code);
    Receipt Checkout(VendingMachine machine);
    int Cancel(VendingMachine machine);
}

/// Illegal operations are one throw expression each: legal as an expression body for void and
/// value-returning members alike, so no Reject() helper is needed to satisfy the compiler.
public sealed class IdleState : IVendingState
{
    public static readonly IdleState Instance = new();
    private IdleState() { }

    public string Name => "IDLE";

    public void InsertCoins(VendingMachine machine, int cents)
    {
        machine.Credit(cents);
        machine.TransitionTo(new BalanceState());
    }

    public void SelectProduct(VendingMachine m, string code) => throw new VendingException.IllegalTransition(Name, "SelectProduct");
    public Receipt Checkout(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Checkout");
    public int Cancel(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Cancel");
}

public sealed class BalanceState : IVendingState
{
    public string Name => "HAS_BALANCE";

    /// Legal and non-transitioning: adding money to money is the same state. Interviewers probe this.
    public void InsertCoins(VendingMachine machine, int cents) => machine.Credit(cents);

    public void SelectProduct(VendingMachine machine, string code)
    {
        machine.Reserve(code);                        // throws OutOfStock before any state change
        machine.TransitionTo(new SelectedState());
    }

    public Receipt Checkout(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Checkout");

    public int Cancel(VendingMachine machine) => machine.Refund();
}

public sealed class SelectedState : IVendingState
{
    public string Name => "PRODUCT_SELECTED";

    public void InsertCoins(VendingMachine machine, int cents) => machine.Credit(cents);

    public void SelectProduct(VendingMachine machine, string code) => machine.Reserve(code);

    public Receipt Checkout(VendingMachine machine)
    {
        int price = machine.SelectedPriceCents;

        // Validate-all-then-mutate. Order here is the design: probe change before debiting.
        int change = machine.BalanceCents - price;
        if (change < 0) throw new VendingException.InsufficientBalance(-change);
        if (!machine.Vault().CanMakeChange(change)) throw new VendingException.ChangeUnavailable(change);

        IReadOnlyDictionary<int, int> coins = machine.Vault().DispenseChange(change);

        machine.Debit(price);                         // balance -> 0, sale recorded
        machine.TransitionTo(new DispensingState());
        return machine.CompleteSale(coins);           // re-dispatch: DispensingState owns the hardware step
    }

    public int Cancel(VendingMachine machine) => machine.Abandon();
}

public sealed class DispensingState : IVendingState
{
    public string Name => "DISPENSING";

    public void InsertCoins(VendingMachine m, int cents) => throw new VendingException.IllegalTransition(Name, "InsertCoin");
    public void SelectProduct(VendingMachine m, string code) => throw new VendingException.IllegalTransition(Name, "SelectProduct");
    public Receipt Checkout(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Checkout");
    public int Cancel(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Cancel");
}

/// Operator mode: rejects every customer call but lets a technician restock. Adding a state must
/// mean adding a class, not editing five methods elsewhere.
public sealed class MaintenanceState : IVendingState
{
    public string Name => "MAINTENANCE";

    public void InsertCoins(VendingMachine m, int cents) => throw new VendingException.IllegalTransition(Name, "InsertCoin");
    public void SelectProduct(VendingMachine m, string code) => throw new VendingException.IllegalTransition(Name, "SelectProduct");
    public Receipt Checkout(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Checkout");
    public int Cancel(VendingMachine m) => throw new VendingException.IllegalTransition(Name, "Cancel");
}`,
    },
    {
      name: "VendingMachine",
      java: `import java.util.Map;

/**
 * The context: a dispatcher plus the only mutable state in the design.
 * If a state class ever needs a field, the design has leaked.
 */
public final class VendingMachine implements VendingApi {

    private final Inventory inventory;
    private final CoinVault vault;
    private final SaleLedger ledger;

    private VendingState state = IdleState.INSTANCE;
    private int balanceCents;
    private VendingApi.Product selected;
    private long session;                       // monotonic; ties reservations to one transaction

    private final Object gate = new Object();

    public VendingMachine(Inventory inventory, CoinVault vault, SaleLedger ledger) {
        this.inventory = inventory;
        this.vault = vault;
        this.ledger = ledger;
    }

    /* ------------------------------- public API: one lock, five delegations ------------------------------- */

    @Override
    public void insertCoin(int cents) {
        if (cents <= 0) throw new IllegalArgumentException("insert a positive amount");
        synchronized (gate) { state.insertCoin(this, cents); }
    }

    @Override
    public void selectProduct(String code) {
        synchronized (gate) { state.selectProduct(this, code); }
    }

    @Override
    public Receipt checkout() {
        synchronized (gate) { return state.checkout(this); }
    }

    @Override
    public int cancel() {
        synchronized (gate) { return state.cancel(this); }
    }

    @Override public int balanceCents() { synchronized (gate) { return balanceCents; } }

    @Override public String stateName() { synchronized (gate) { return state.name(); } }

    /** Operator path: a different API surface, the same state machine. This is how a new state
     *  gets used without any customer-facing method being edited. */
    public void enterMaintenance() {
        synchronized (gate) {
            if (balanceCents > 0) throw new IllegalStateException("refund the outstanding balance first");
            transitionTo(new MaintenanceState());
        }
    }

    /* -------- package-private context hooks: the states are the only callers, inside the lock -------- */

    void credit(int cents) {
        if (balanceCents + cents > 100_000) throw new IllegalStateException("per-session balance cap");
        balanceCents += cents;
    }

    void reserve(String code) {
        inventory.reserve(code, session);
        selected = inventory.require(code);
    }

    void transitionTo(VendingState next) { this.state = next; }

    VendingApi.Product selectedItem() { return selected; }

    int selectedPriceCents() { return selected.priceCents(); }

    CoinVault vault() { return vault; }

    int refund() {
        int refunded = balanceCents;
        balanceCents = 0;
        session++;                            // any in-flight callback for the old session is now stale
        state = IdleState.INSTANCE;
        return refunded;
    }

    int abandon() {
        inventory.release(session);
        selected = null;
        return refund();
    }

    void debit(int price) { balanceCents -= price; }

    /** Called by the state that owns the transition; DispensingState has already taken the unit. */
    Receipt completeSale(Map<Integer, Integer> coins) {
        inventory.commit(session);
        Receipt receipt = new Receipt(session, selected.code(), selected.name(),
                selected.priceCents(), sum(coins), coins);

        ledger.record(receipt);
        selected = null;
        session++;
        state = IdleState.INSTANCE;
        return receipt;
    }

    private static int sum(Map<Integer, Integer> coins) {
        int total = 0;
        for (Map.Entry<Integer, Integer> e : coins.entrySet()) total += e.getKey() * e.getValue();
        return total;
    }
}

/** Append-only audit trail; injectable, so tests assert on sales without parsing console output. */
interface SaleLedger {
    void record(VendingApi.Receipt receipt);

    SaleLedger NOOP = receipt -> { };
}

/*
 * Design notes worth saying out loud:
 *  - credit/debit/reserve are package-private. Nothing outside this package can put the machine
 *    into an inconsistent state, which is what makes the state machine provable.
 *  - session increments on every terminal transition. A late sensor callback carrying an old
 *    session id is rejected, which is how you stop a double refund.
 *  - synchronized is reentrant, so state.checkout(this) -> machine.debit(...) cannot deadlock.
 *    Swap this for a non-reentrant lock and the design breaks silently: know which you are using.
 */`,
      cs: `using System;
using System.Collections.Generic;

/// The context: a dispatcher plus the only mutable state in the design.
/// If a state class ever needs a field, the design has leaked.
public sealed class VendingMachine : IVendingApi
{
    private readonly Inventory _inventory;
    private readonly CoinVault _vault;
    private readonly Action<Receipt> _ledger;

    private readonly object _gate = new();
    private IVendingState _state = IdleState.Instance;
    private int _balanceCents;
    private Product _selected;
    private long _session;                    // monotonic; ties reservations to one transaction

    public VendingMachine(Inventory inventory, CoinVault vault, Action<Receipt> ledger = null)
    {
        _inventory = inventory;
        _vault = vault;
        _ledger = ledger ?? (_ => { });       // Null Object: no null checks sprinkled through the flow
    }

    /* ------------------------- public API: one lock, five delegations ------------------------- */

    public void InsertCoins(int cents)
    {
        if (cents <= 0) throw new ArgumentException("insert a positive amount");
        lock (_gate) { _state.InsertCoins(this, cents); }
    }

    public void SelectProduct(string code)
    {
        lock (_gate) { _state.SelectProduct(this, code); }
    }

    public Receipt Checkout()
    {
        lock (_gate) { return _state.Checkout(this); }
    }

    public int Cancel()
    {
        lock (_gate) { return _state.Cancel(this); }
    }

    public int BalanceCents { get { lock (_gate) return _balanceCents; } }

    public string StateName { get { lock (_gate) return _state.Name; } }

    /// Operator path: a different API surface, the same state machine. This is how a new state
    /// gets used without any customer-facing method being edited.
    public void EnterMaintenance()
    {
        lock (_gate)
        {
            if (_balanceCents > 0) throw new InvalidOperationException("refund the outstanding balance first");
            TransitionTo(new MaintenanceState());
        }
    }

    /* ------- context hooks: the states are the only callers, and always already inside the lock ------- */

    public void Credit(int cents)
    {
        if (_balanceCents + cents > 100_000) throw new InvalidOperationException("per-session balance cap");
        _balanceCents += cents;
    }

    public void Reserve(string code)
    {
        _inventory.Reserve(code, _session);
        _selected = _inventory.Require(code);
    }

    public void TransitionTo(IVendingState next) => _state = next;

    public int SelectedPriceCents => _selected.PriceCents;

    public CoinVault Vault() => _vault;

    public int Refund()
    {
        int refunded = _balanceCents;
        _balanceCents = 0;
        _session++;                           // any in-flight callback for the old session is now stale
        _state = IdleState.Instance;
        return refunded;
    }

    public int Abandon()
    {
        _inventory.Release(_session);
        _selected = null;
        return Refund();
    }

    public void Debit(int price) => _balanceCents -= price;

    /// Called by the state that owns the transition; DispensingState has already taken the unit.
    public Receipt CompleteSale(IReadOnlyDictionary<int, int> coins)
    {
        _inventory.Commit(_session);

        int change = 0;
        foreach (var (coin, count) in coins) change += coin * count;

        var receipt = new Receipt(_session, _selected.Code, _selected.Name,
                                  _selected.PriceCents, change, coins);

        _ledger(receipt);
        _selected = null;
        _session++;
        _state = IdleState.Instance;
        return receipt;
    }
}

/*
 * Design notes worth saying out loud:
 *  - Credit/Debit/Reserve are only reachable while the caller already holds _gate, which is what
 *    makes the state machine provable.
 *  - _session increments on every terminal transition, so a late sensor callback carrying an old
 *    session id is rejected. That is how you stop a double refund.
 *  - Monitor.Enter is reentrant, so Checkout() -> state.Checkout(this) -> machine.Debit(...)
 *    cannot deadlock. Swap in a non-reentrant lock and this design breaks silently.
 */`,
    },
  ],
  umlNote: "Draw the context with a single arrow to the interface, then five boxes implementing it. The absence of context→concrete arrows is the whole point of the pattern.",
  qa: [
    ["Why not an enum with a switch on state?", "Because the switch has to live in every operation method, so legality grows as states × operations and adding a state means editing every method. With classes, each state declares only what it allows, and MaintenanceState was added without opening a single existing file."],
    ["Where does the balance live?", "On the context. States are stateless singletons. The moment balance lives in a state object, a transition loses the customer's money — and that is the bug that makes the pattern look wrong to the interviewer."],
    ["How is checkout different from calling dispense directly?", "SelectedState validates (price, change availability) and only then mutates (dispense change, debit, commit stock), then re-dispatches so DispensingState owns the hardware step. Validate-before-mutate is why there is no rollback path."],
    ["You synchronized everything — isn't that a bottleneck?", "The operations are user-driven button presses; the critical section is microseconds. The scaling axis is devices, not requests per device, and each device already has its own lock. If one operation becomes I/O bound (card auth), it leaves the lock and becomes authorize/settle."],
    ["What happens when the motor jams after you debited?", "Nothing in this design pretends that is impossible: DISPENSING is a real state, so a failure event either drives it to a compensating refund (with the session id guarding against a duplicate) or to a technician alert. Say the word 'saga' and explain idempotency by session id."],
    ["Why is IdleState a singleton but BalanceState not?", "It isn't a rule, it's a demo: both could be singletons. Consistency is what a reviewer checks — either all states are stateless instances or none are."],
  ],
  followUps: [
    ["“Add a MAINTENANCE state.”", "Already in the design: MaintenanceState, plus the machine-level `enterMaintenance()` that flips the pointer. The answer is that no existing state was opened — and that the operator API is separate from the customer API, which is interface segregation."],
    ["“Accept a card payment.”", "Split checkout: `authorize(session, amount)` (idempotent, idempotency key = session id, called outside the lock, can be slow) and `settle(receipt)`. A gateway timeout must not leave the machine holding money with no product — so authorize-first, reserve-already-done, and a sweeper that voids stale authorizations."],
    ["“Now it is 40,000 machines in a cloud service.”", "Device firmware keeps this design; the cloud gains a DeviceRegistry, telemetry events per transition, and a config channel for price/catalog changes. Availability of the cloud must never block a sale — that is the offline-first constraint, and it is why the ledger is append-only."],
    ["“Give me minimal-coin change, not greedy.”", "Bounded coin-change DP over the vault's counts, O(amount × denominations × counts), memoised per vault snapshot; and the practical answer is to keep a canonical ladder so greedy is provably optimal and you never need the DP."],
    ["“Two customers, one machine, simultaneous presses.”", "One lock per machine serialises them, so the second customer sees a consistent machine: either the unit was reserved and they get OutOfStock, or they get it. Emphasise that reservation-at-selection is what removes the check-then-act window entirely."],
    ["“Persist the session so a reboot does not lose someone's money.”", "The machine's mutable state is now 3 fields plus a state id — write them as a snapshot on every transition (event sourcing) and rehydrate on boot. Discuss that balance is money you owe, so the snapshot must be in the same transaction as the vault count."],
  ],
  rubric: {
    strong: [
      "Names the state machine and draws it before writing code.",
      "Keeps states stateless and can explain the failure that happens otherwise.",
      "Integer cents, typed exceptions, and a validate-before-mutate order.",
      "Reserves stock at selection and calls it a two-phase ownership problem.",
      "Volunteers the jammed-motor / refund compensation path.",
    ],
    weak: [
      "A state enum plus switches in the machine.",
      "Balance stored inside state objects, or a new state instance per transition holding data.",
      "double/float for money, or booleans returned for failures.",
      "Checks availability and decrements in two steps (check-then-act).",
      "No answer at all for 'what if dispensing fails?'.",
    ],
  },
  complexity: [
    ["insertCoin", "O(1)"],
    ["selectProduct", "O(1) + hash lookup"],
    ["checkout", "O(denominations) for change"],
    ["cancel", "O(1)"],
    ["space", "O(SKUs + denominations)"],
    ["lock hold", "microseconds, never across I/O"],
  ],
};
