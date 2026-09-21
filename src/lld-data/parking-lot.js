// Parking Lot — SDE-2 grade: fit rules as data, a free-spot index so allocation is O(1),
// CAS-claimed spots so two gates cannot sell the same space, and cost functions instead of if-ladders.

export const PARKING_CHAPTER = {
  id: "parking-lot",
  num: "03",
  title: "Parking Lot",
  level: "Modeling round · 45 min",
  tagline: "The one where candidates optimise the wrong thing: the allocation scan, not the lock.",
  pattern: "Strategy (allocation + pricing) + Factory + CAS claim + cost function",
  accent: "#4ec9b0",
  diagram: "parking",
  uml: "parking",
  sim: "parking",
  minutes: 45,
  requirements: [
    "Multiple floors; each floor has spots of several types (motorcycle, compact, large, EV).",
    "Vehicles have a type and physical dimensions; a spot accepts a vehicle only if it fits.",
    "An entry gate allocates a spot and issues a ticket; an exit gate charges and frees the spot.",
    "Allocation must prefer the best fit, not the first fit — never park a motorcycle in a large spot if a compact is free.",
    "Pricing must change without redeploying: hourly, day cap, grace period, weekend/peak multipliers.",
    "Several gates operate concurrently and must never sell the same spot twice.",
  ],
  clarify: [
    ["How many floors, spots, and gates?", "Say 5 floors × 200 spots × 4 gates. That answer decides whether a full scan is fine (it is) and whether contention matters (it doesn't) — being able to size the problem is the point."],
    ["Is a spot reserved at the gate or at the pay station?", "At the gate: allocation and occupancy are one transaction, or a car drives in while you compute a fee."],
    ["What defines 'best fit'?", "Smallest spot that accepts the vehicle, nearest the exit/elevator within that class. Get the ordering agreed before choosing a data structure."],
    ["Do trucks need anything special?", "Height clearance and, in some lots, wheel chocks. Behavior differences justify subclasses; size differences do not."],
    ["Is overbooking allowed?", "No for physical spots. Saying 'this is the opposite of an airline — capacity is atomic and physical' is a strong line."],
  ],
  entities: [
    ["Vehicle", "Final class: Type + Dimensions + plate. The fit question is answered by data, so no subclass tree is needed."],
    ["ParkingSpot (abstract)", "Identity, type, and an AtomicReference<Vehicle> occupancy. tryPark() is a CAS, so the spot itself arbitrates."],
    ["Compact / Large / Motorcycle / Ev", "Spot variants; each only answers fits(vehicle). New spot kind = new subclass, nothing else changes."],
    ["ParkingFloor", "Owns its spots and a per-type free queue — the index that turns allocation from a scan into a poll."],
    ["SpotAllocationStrategy", "Chooses among candidate spots (best-fit-then-nearest), expressed as a cost function."],
    ["PricingStrategy", "Ticket + exit time → cents. RateCard, Tiered, WeekendSurcharge."],
    ["ParkingTicket", "The receipt and the lookup key: id, plate, spot id, entry instant. Immutable."],
    ["ParkingLot", "Application service: Enter / Exit / occupancy queries, the active-ticket map, and the layout builder."],
  ],
  contract: [
    "Ticket enter(Vehicle v)                    // throws ParkingFullException",
    "Bill exit(String ticketId, Instant now)    // idempotent by ticketId",
    "Optional<Ticket> ticketFor(String plate)   // 'where is my car?' kiosk lookup",
    "int freeSpots(SpotType type)",
    "static ParkingLot.Builder layout()         // floors and spots from config",
  ],
  idea: [
    "Model nouns first, and resist inheritance where the variation is data. A Truck is not a Car with different behavior — it is a Vehicle with different dimensions. So Vehicle is final and carries (type, lengthMetres, heightMetres); `fits()` is a predicate on numbers. You keep the IS-A tree only where behavior genuinely differs, which here is spot kinds: an EV spot has a charger to switch off, a compact spot does not care.",
    "Then separate the two things that actually vary in production: which spot you pick (allocation) and how much you charge (pricing). Both become injected interfaces, so a new rule is a new class — that is Open/Closed with something real behind it, not just a buzzword. Allocation is expressed as a cost function rather than a nested loop, because every real policy ('near the elevator', 'keep floors balanced', 'prefer the row with the fewest occupied neighbours') is a different weighting of the same candidates.",
    "The old version of this design scanned every spot on every floor inside a global lock: O(floors × spots) under a mutex, which is exactly the shape of a gate queue at 08:00. Two changes fix it — a per-floor, per-type free list so a candidate is a poll, and a CAS claim on the spot so the allocation lock never covers the mutation.",
    "Finally, correctness under two gates. The invariant is 'a spot is occupied by at most one vehicle', so put the decision in the object that owns the resource: `AtomicReference.compareAndSet(null, vehicle)`. A stale candidate is skipped and the loop retries. Now the lot lock only protects the index, and even that can be a concurrent queue.",
  ],
  patterns: [
    ["Strategy", "SpotAllocationStrategy, PricingStrategy", "The two rules that differ per customer and per day, isolated behind one method each."],
    ["Cost function over control flow", "AllocationScore (distance, floor, clearance)", "Every allocation policy becomes weights on the same candidate list instead of a new loop someone must review."],
    ["Factory / Builder", "ParkingLot.layout() from a FloorPlan config", "Spot kinds and counts come from config; the constructor that takes an enum switch belongs in one place."],
    ["CAS ownership (actor-ish)", "ParkingSpot.tryPark()", "The resource arbitrates its own exclusions, so the 'manager' never holds a lock across a mutation."],
    ["Enum-as-data", "SpotType.supports(VehicleType)", "The compatibility matrix is readable and testable as a table; subclasses extend it, they don't replace it."],
  ],
  decisions: [
    ["Vehicle is final with dimensions; spots keep the subclass tree", "Fit is arithmetic, not polymorphism. Spot behavior genuinely differs (charger, oversized signage).", "Car/Truck/Motorcycle subclasses: three classes that add no behavior and block dimension-based rules."],
    ["Best-fit then nearest, via one comparator", "Stops a motorcycle consuming a large space, which is how lots run 'full' with 40 empty big spots.", "First-fit: fast to write, wastes premium capacity, and costs real revenue."],
    ["Per-(floor,type) free queue + CAS claim", "Allocation is O(candidates) not O(all spots); the claim is wait-free and cannot double-sell.", "One global mutex around a scan: correct, but the queue at the gate is the failure."],
    ["Money in integer cents", "Exact, comparable, serialisable.", "double for rates (0.1 drift) or BigDecimal on the whiteboard (correct, but it hides the design)."],
    ["Ticket keyed by id, with a plate index", "Exit is O(1) and 'where is my car?' works without scanning tickets.", "Searching the active list by plate on every kiosk lookup."],
  ],
  concurrency: [
    "Two gates, one spot: both read it from the free queue, both call `spot.tryPark(v)`. Exactly one CAS wins; the loser loops to the next candidate. No lock spans a business decision, so the worst case is a retry, never a corrupted lot.",
    "The free list and the occupancy flag are two pieces of state that can disagree. Fix: pop-and-claim is ordered (claim, then remove on success) and `release()` re-adds only if the CAS back to null succeeded — so a duplicate release cannot inflate capacity.",
    "Why not `synchronized` on the lot? It is correct and simpler, and for 5×200 spots and 4 gates it is the right production choice too. Say that: choosing the boring option deliberately is senior; choosing it accidentally is not.",
    "Lock ordering if you do lock per floor and per spot: always lot → floor → spot, never the reverse, and never take a spot lock and then call into pricing (which reads a rate config that may itself be locked). Deadlocks in this design always come from an exit path that frees a spot while holding another gate's floor lock.",
    "Idempotent exit: an exit gate that retries after a timeout must not charge twice, so exit is keyed on ticketId with a terminal state on the ticket. Same rule as any payment-adjacent endpoint.",
  ],
  edgeCases: [
    "Lot full → a typed ParkingFullException, and the gate must not have debited anything (allocation is all-or-nothing).",
    "Vehicle that fits nothing (an RV in a compact-only lot) → distinguish 'temporarily full' from 'structurally impossible', because ops alerts on them differently.",
    "Exit with an unknown or already-settled ticket.",
    "Lost ticket → lookup by plate; the fee is computed from the spot's entry stamp, not from a piece of paper.",
    "Stay over a day boundary with a day cap, or a re-issue that spans midnight — always compute the duration from instants, never local time.",
    "A spot released twice (two attendants press clear) — CAS-to-null makes the second one a no-op instead of a capacity ghost.",
  ],
  atScale: [
    "One lot, 5 floors: any structure works; spend the time on readability.",
    "A city of 300 lots: the lot becomes an aggregate with a `LotId`, and the query service reads a projection (occupancy per lot per type) instead of the truth tables — that is where CQRS is worth naming.",
    "Real-time guidance ('drive to B3 row 4'): occupancy events feed a sensor stream; allocation gains a walk-distance graph per floor, which is exactly why it was a cost function.",
    "Monthly passes and prepaid: pricing becomes a chain of strategies (base, then pass discount, then EV energy), i.e. decorator, not a bigger method.",
    "Persistence: tickets and spot state belong in a store with an optimistic version column; a lot must survive an attendant app restart mid-transaction, so the claim and the ticket row are written together.",
  ],
  files: [
    {
      name: "Vehicle",
      java: `/**
 * Final, and deliberately so. The question "does it fit?" is answered by numbers, not by
 * overriding a method, so a Car/Truck/Motorcycle subclass tree would be ceremony.
 * Keep the IS-A hierarchy for the thing that really varies in behaviour: the spot.
 */
public final class Vehicle {

    public enum Type { MOTORCYCLE, CAR, TRUCK }

    /** Metres and metres: the fit matrix is arithmetic, which makes it testable without mocks. */
    public record Dimensions(double lengthMetres, double heightMetres, double widthMetres) {
        public Dimensions {
            if (lengthMetres <= 0 || heightMetres <= 0 || widthMetres <= 0)
                throw new IllegalArgumentException("dimensions must be positive");
        }
    }

    private final String plate;
    private final Type type;
    private final Dimensions dimensions;

    public Vehicle(String plate, Type type, Dimensions dimensions) {
        this.plate = plate;
        this.type = type;
        this.dimensions = dimensions;
    }

    /* Named constructors: the enum + dimensions pairing is easy to get wrong at a call site. */
    public static Vehicle motorcycle(String plate) {
        return new Vehicle(plate, Type.MOTORCYCLE, new Dimensions(2.2, 1.2, 0.8));
    }
    public static Vehicle car(String plate) {
        return new Vehicle(plate, Type.CAR, new Dimensions(4.5, 1.5, 1.9));
    }
    public static Vehicle truck(String plate) {
        return new Vehicle(plate, Type.TRUCK, new Dimensions(9.0, 3.2, 2.6));
    }

    public String plate() { return plate; }
    public Type type() { return type; }
    public Dimensions dimensions() { return dimensions; }

    /** Behaviour hooks for the rare case where a vehicle type really does act differently. */
    public boolean requiresChock() { return type == Type.TRUCK; }

    @Override public String toString() { return type + " " + plate; }
}`,
      cs: `/// Final, and deliberately so. The question "does it fit?" is answered by numbers, not by
/// overriding a method, so a Car/Truck/Motorcycle subclass tree would be ceremony.
/// Keep the IS-A hierarchy for the thing that really varies in behaviour: the spot.
public sealed class Vehicle
{
    public enum VehicleKind { Motorcycle, Car, Truck }

    /// Metres everywhere: the fit matrix is arithmetic, which makes it testable without mocks.
    public sealed record Dimensions(double LengthMetres, double HeightMetres, double WidthMetres);

    public string Plate { get; }
    public VehicleKind Kind { get; }
    public Dimensions Size { get; }

    private Vehicle(string plate, VehicleKind kind, Dimensions dimensions)
    {
        if (dimensions.LengthMetres <= 0 || dimensions.HeightMetres <= 0 || dimensions.WidthMetres <= 0)
            throw new System.ArgumentException("dimensions must be positive");

        Plate = plate;
        Kind = kind;
        Size = dimensions;
    }

    /* Named constructors: the kind + dimensions pairing is easy to get wrong at a call site. */
    public static Vehicle Motorcycle(string plate) =>
        new(plate, VehicleKind.Motorcycle, new Dimensions(2.2, 1.2, 0.8));

    public static Vehicle Car(string plate) =>
        new(plate, VehicleKind.Car, new Dimensions(4.5, 1.5, 1.9));

    public static Vehicle Truck(string plate) =>
        new(plate, VehicleKind.Truck, new Dimensions(9.0, 3.2, 2.6));

    /// Behaviour hooks for the rare case where a vehicle type really does act differently.
    public bool RequiresChock => Kind == VehicleKind.Truck;

    public override string ToString() => Kind + " " + Plate;
}`,
    },
    {
      name: "ParkingSpot",
      java: `import java.util.concurrent.atomic.AtomicReference;

/**
 * The resource arbitrates its own exclusions. Occupancy is an AtomicReference, so two gates
 * asking for the same spot is a CAS race with exactly one winner — no manager lock involved.
 */
public abstract class ParkingSpot {

    /** Pure data. Every fit rule lives in SpotRules, so the matrix has exactly one answer. */
    public enum SpotType { MOTORCYCLE, COMPACT, LARGE, EV }

    private final String id;
    private final int floorNumber;
    private final double distanceToExit;             // metres; feeds the allocation cost function
    private final AtomicReference<Vehicle> occupant = new AtomicReference<>();

    protected ParkingSpot(String id, int floorNumber, double distanceToExit) {
        this.id = id;
        this.floorNumber = floorNumber;
        this.distanceToExit = distanceToExit;
    }

    public abstract SpotType type();

    /** Extension point for spots with real behaviour: an EV spot must stop charging on release. */
    public boolean fits(Vehicle vehicle) { return SpotRules.accepts(type(), vehicle); }

    public String id() { return id; }
    public int floorNumber() { return floorNumber; }
    public double distanceToExit() { return distanceToExit; }

    public boolean isFree() { return occupant.get() == null; }

    /** @return true only if this call is the one that claimed the spot. */
    public boolean tryPark(Vehicle vehicle) {
        if (!fits(vehicle)) return false;
        return occupant.compareAndSet(null, vehicle);
    }

    /** @return true if this call actually freed it; a duplicate release is a no-op, not a ghost slot. */
    public boolean release() {
        Vehicle before = occupant.getAndSet(null);
        if (before == null) return false;
        onVacated(before);
        return true;
    }

    protected void onVacated(Vehicle vehicle) { /* EV spots switch off the charger here. */ }

    @Override public String toString() { return id; }
}

/** Package-private variants: they differ only in the type they report, which is the point. */
final class CompactSpot extends ParkingSpot {
    CompactSpot(String id, int floor, double distanceToExit) { super(id, floor, distanceToExit); }
    @Override public SpotType type() { return SpotType.COMPACT; }
}

final class LargeSpot extends ParkingSpot {
    LargeSpot(String id, int floor, double distanceToExit) { super(id, floor, distanceToExit); }
    @Override public SpotType type() { return SpotType.LARGE; }
}

final class MotorcycleSpot extends ParkingSpot {
    MotorcycleSpot(String id, int floor, double distanceToExit) { super(id, floor, distanceToExit); }
    @Override public SpotType type() { return SpotType.MOTORCYCLE; }
}

final class EvChargingSpot extends ParkingSpot {
    private volatile boolean charging;

    EvChargingSpot(String id, int floor, double distanceToExit) { super(id, floor, distanceToExit); }

    @Override public SpotType type() { return SpotType.EV; }

    @Override public boolean tryPark(Vehicle v) {
        if (!super.tryPark(v)) return false;
        charging = true;                             // hardware call would go here
        return true;
    }

    @Override protected void onVacated(Vehicle v) { charging = false; }
}`,
      cs: `using System.Threading;

/// The resource arbitrates its own exclusions. Occupancy is an interlocked reference, so two
/// gates asking for the same spot is a compare-exchange with exactly one winner.
public abstract class ParkingSpot
{
    public enum SpotKind { Motorcycle, Compact, Large, Ev }

    public string Id { get; }
    public int FloorNumber { get; }

    /// Metres from the exit/elevator: the only reason allocation is not "give me any free one".
    public double DistanceToExit { get; }

    private Vehicle _occupant;

    protected ParkingSpot(string id, int floorNumber, double distanceToExit)
    {
        Id = id;
        FloorNumber = floorNumber;
        DistanceToExit = distanceToExit;
    }

    public abstract SpotKind Type { get; }

    public bool IsFree => Volatile.Read(ref _occupant) is null;

    public Vehicle Occupant => Volatile.Read(ref _occupant);

    /// Fit is arithmetic on the limits this kind publishes; subclasses override for real rules.
    public virtual bool Fits(Vehicle vehicle) => SpotRules.Accepts(Type, vehicle);

    /// Returns true only if this call is the one that claimed the spot.
    public virtual bool TryPark(Vehicle vehicle)
    {
        if (!Fits(vehicle)) return false;
        return Interlocked.CompareExchange(ref _occupant, vehicle, null) is null;
    }

    /// Returns true if this call actually freed it; a duplicate release is a no-op, not a ghost slot.
    public bool Release()
    {
        Vehicle before = Interlocked.Exchange(ref _occupant, null);
        if (before is null) return false;
        OnVacated(before);
        return true;
    }

    protected virtual void OnVacated(Vehicle vehicle) { /* EV spots switch off the charger here. */ }

    public override string ToString() => Id;
}

public sealed class CompactSpot : ParkingSpot
{
    public CompactSpot(string id, int floor, double distanceToExit) : base(id, floor, distanceToExit) { }
    public override SpotKind Type => SpotKind.Compact;
}

public sealed class LargeSpot : ParkingSpot
{
    public LargeSpot(string id, int floor, double distanceToExit) : base(id, floor, distanceToExit) { }
    public override SpotKind Type => SpotKind.Large;
}

public sealed class MotorcycleSpot : ParkingSpot
{
    public MotorcycleSpot(string id, int floor, double distanceToExit) : base(id, floor, distanceToExit) { }
    public override SpotKind Type => SpotKind.Motorcycle;
}

/// The one spot kind with genuine extra behaviour, which is why the tree exists at all.
public sealed class EvChargingSpot : ParkingSpot
{
    private volatile bool _charging;

    public EvChargingSpot(string id, int floor, double distanceToExit) : base(id, floor, distanceToExit) { }

    public override SpotKind Type => SpotKind.Ev;

    public bool Charging => _charging;

    public override bool TryPark(Vehicle vehicle)
    {
        if (!base.TryPark(vehicle)) return false;
        _charging = true;                            // hardware call would go here
        return true;
    }

    protected override void OnVacated(Vehicle vehicle) => _charging = false;
}`,
    },
    {
      name: "SpotRules",
      java: `import java.util.Map;
import java.util.Set;

/**
 * The compatibility matrix, isolated. Keeping it out of the spot classes means "can a car use an
 * EV bay?" is one answerable lookup and one unit test, not five overrides that drifted apart.
 */
final class SpotRules {

    private SpotRules() { }

    private record Rule(double maxLength, double maxHeight, Set<Vehicle.Type> allowed) { }

    private static final Map<ParkingSpot.SpotType, Rule> MATRIX = Map.of(
            ParkingSpot.SpotType.MOTORCYCLE, new Rule(2.5, 1.4, Set.of(Vehicle.Type.MOTORCYCLE)),
            ParkingSpot.SpotType.COMPACT, new Rule(4.8, 1.7, Set.of(Vehicle.Type.CAR, Vehicle.Type.MOTORCYCLE)),
            ParkingSpot.SpotType.EV, new Rule(5.0, 1.7, Set.of(Vehicle.Type.CAR)),
            ParkingSpot.SpotType.LARGE, new Rule(9.5, 3.4, Set.of(Vehicle.Type.TRUCK, Vehicle.Type.CAR)));

    static boolean accepts(ParkingSpot.SpotType spotType, Vehicle vehicle) {
        Rule rule = MATRIX.get(spotType);
        return rule != null
                && rule.allowed().contains(vehicle.type())
                && vehicle.dimensions().lengthMetres() <= rule.maxLength()
                && vehicle.dimensions().heightMetres() <= rule.maxHeight();
    }

    /** The smallest kind that could still take this vehicle: what best-fit actually means. */
    static ParkingSpot.SpotType minimumKindFor(Vehicle vehicle) {
        return switch (vehicle.type()) {
            case MOTORCYCLE -> ParkingSpot.SpotType.MOTORCYCLE;
            case CAR -> ParkingSpot.SpotType.COMPACT;
            case TRUCK -> ParkingSpot.SpotType.LARGE;
        };
    }
}`,
      cs: `using System.Collections.Generic;

/// The compatibility matrix, isolated. Keeping it out of the spot classes means "can a car use an
/// EV bay?" is one answerable lookup and one unit test, not five overrides that drifted apart.
public static class SpotRules
{
    private sealed record Rule(double MaxLength, double MaxHeight, HashSet<Vehicle.VehicleKind> Allowed);

    private static readonly Dictionary<ParkingSpot.SpotKind, Rule> Matrix = new()
    {
        [ParkingSpot.SpotKind.Motorcycle] = new Rule(2.5, 1.4, new() { Vehicle.VehicleKind.Motorcycle }),
        [ParkingSpot.SpotKind.Compact] = new Rule(4.8, 1.7, new() { Vehicle.VehicleKind.Car, Vehicle.VehicleKind.Motorcycle }),
        [ParkingSpot.SpotKind.Ev] = new Rule(5.0, 1.7, new() { Vehicle.VehicleKind.Car }),
        [ParkingSpot.SpotKind.Large] = new Rule(9.5, 3.4, new() { Vehicle.VehicleKind.Truck, Vehicle.VehicleKind.Car }),
    };

    public static bool Accepts(ParkingSpot.SpotKind kind, Vehicle vehicle)
    {
        if (!Matrix.TryGetValue(kind, out var rule)) return false;
        return rule.Allowed.Contains(vehicle.Kind)
               && vehicle.Size.LengthMetres <= rule.MaxLength
               && vehicle.Size.HeightMetres <= rule.MaxHeight;
    }

    /// The smallest kind that could still take this vehicle: what "best fit" actually means.
    public static ParkingSpot.SpotKind MinimumKindFor(Vehicle vehicle) => vehicle.Kind switch
    {
        Vehicle.VehicleKind.Motorcycle => ParkingSpot.SpotKind.Motorcycle,
        Vehicle.VehicleKind.Car => ParkingSpot.SpotKind.Compact,
        Vehicle.VehicleKind.Truck => ParkingSpot.SpotKind.Large,
    };
}`,
    },
    {
      name: "ParkingFloor",
      java: `import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Owns its spots and, crucially, a free list per spot kind. That index is what turns allocation
 * from "scan 1000 spots under a mutex" into "peek a candidate, CAS it, done".
 * The queue may hand out a spot that another gate already claimed, so candidates are always re-validated.
 */
public final class ParkingFloor {

    private final int number;
    private final List<ParkingSpot> spots = new ArrayList<>();
    private final Map<ParkingSpot.SpotType, ConcurrentLinkedQueue<ParkingSpot>> freeByType =
            new EnumMap<>(ParkingSpot.SpotType.class);

    public ParkingFloor(int number) {
        this.number = number;
        for (ParkingSpot.SpotType type : ParkingSpot.SpotType.values()) freeByType.put(type, new ConcurrentLinkedQueue<>());
    }

    public int number() { return number; }

    public ParkingFloor add(ParkingSpot spot) {
        spots.add(spot);
        freeByType.get(spot.type()).add(spot);
        return this;
    }

    public List<ParkingSpot> spots() { return List.copyOf(spots); }

    /** Bounded peek: look at up to 'limit' candidates instead of draining the queue optimistically. */
    public List<ParkingSpot> candidates(ParkingSpot.SpotType type, int limit) {
        ConcurrentLinkedQueue<ParkingSpot> queue = freeByType.get(type);
        List<ParkingSpot> out = new ArrayList<>(limit);
        for (ParkingSpot spot : queue) {
            if (out.size() == limit) break;
            if (spot.isFree()) out.add(spot);
        }
        return out;
    }

    /** Called by the lot once a claim succeeded; the spot leaves the free list here. */
    public void notifyTaken(ParkingSpot spot) { freeByType.get(spot.type()).remove(spot); }

    public void notifyFreed(ParkingSpot spot) {
        ConcurrentLinkedQueue<ParkingSpot> queue = freeByType.get(spot.type());
        if (!queue.contains(spot)) queue.add(spot);
    }

    public int freeCount(ParkingSpot.SpotType type) { return freeByType.get(type).size(); }

    public int occupancy() {
        int busy = 0;
        for (ParkingSpot spot : spots) if (!spot.isFree()) busy++;
        return busy;
    }
}`,
      cs: `using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

/// Owns its spots and, crucially, a free list per spot kind. That index is what turns allocation
/// from "scan 1000 spots under a mutex" into "peek a candidate, CAS it, done".
/// The queue may hand out a spot another gate already claimed, so candidates are re-validated.
public sealed class ParkingFloor
{
    public int Number { get; }

    private readonly List<ParkingSpot> _spots = new();
    private readonly Dictionary<ParkingSpot.SpotKind, ConcurrentQueue<ParkingSpot>> _freeByType =
        Enum.GetValues<ParkingSpot.SpotKind>().ToDictionary(k => k, _ => new ConcurrentQueue<ParkingSpot>());

    public ParkingFloor(int number) => Number = number;

    public ParkingFloor Add(ParkingSpot spot)
    {
        _spots.Add(spot);
        _freeByType[spot.Type].Enqueue(spot);
        return this;
    }

    public IReadOnlyList<ParkingSpot> Spots => _spots;

    /// Bounded peek: look at up to 'limit' candidates instead of draining the queue optimistically.
    public IReadOnlyList<ParkingSpot> Candidates(ParkingSpot.SpotKind kind, int limit)
    {
        var out = new List<ParkingSpot>(limit);
        foreach (var spot in _freeByType[kind])
        {
            if (out.Count == limit) break;
            if (spot.IsFree) out.Add(spot);
        }
        return out;
    }

    /// Called by the lot once a claim succeeded. ConcurrentQueue has no O(1) removal, so this is a
    /// rebuild: say so in the interview, and that a HashSet + lock is the alternative.
    public void NotifyTaken(ParkingSpot spot)
    {
        var fresh = new ConcurrentQueue<ParkingSpot>();
        foreach (var s in _freeByType[spot.Type])
            if (!ReferenceEquals(s, spot)) fresh.Enqueue(s);
        _freeByType[spot.Type] = fresh;
    }

    public void NotifyFreed(ParkingSpot spot)
    {
        var queue = _freeByType[spot.Type];
        if (!queue.Contains(spot)) queue.Enqueue(spot);
    }

    public int FreeCount(ParkingSpot.SpotKind kind) => _freeByType[kind].Count;

    public int Occupancy() => _spots.Count(s => !s.IsFree);
}`,
    },
    {
      name: "SpotAllocationStrategy",
      java: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Allocation as a cost function, because every real policy is a different weighting of the same
 * candidates: nearest exit, keep floors balanced, handicap row, EV preferred for ICE cars.
 * If it were a nested loop, each new policy would be a new loop to review.
 */
public interface SpotAllocationStrategy {

    /** @return the claimed spot, or null when nothing fits. Implementations must use tryPark(). */
    ParkingSpot allocate(List<ParkingFloor> floors, Vehicle vehicle);

    /** How many candidates to price per kind before giving up: the knob that bounds worst-case cost. */
    int CANDIDATE_WINDOW = 12;

    /** Best fit, then nearest exit. This is the default most candidates never write down. */
    static SpotAllocationStrategy bestFitNearest() {
        return (floors, vehicle) -> {
            ParkingSpot.SpotType minimum = SpotRules.minimumKindFor(vehicle);
            ParkingSpot.SpotType[] ladder = { minimum, ParkingSpot.SpotType.EV,
                    ParkingSpot.SpotType.COMPACT, ParkingSpot.SpotType.LARGE };

            for (ParkingSpot.SpotType kind : ladder) {
                List<ParkingSpot> candidates = new ArrayList<>();

                for (ParkingFloor floor : floors) {
                    for (ParkingSpot spot : floor.candidates(kind, CANDIDATE_WINDOW)) {
                        if (spot.fits(vehicle)) candidates.add(spot);
                    }
                }
                if (candidates.isEmpty()) continue;

                candidates.sort(Comparator.comparingDouble(ParkingSpot::distanceToExit));

                for (ParkingSpot spot : candidates) {
                    if (spot.tryPark(vehicle)) {
                        floorOf(floors, spot).notifyTaken(spot);
                        return spot;
                    }
                }
            }
            return null;                                    // structurally full for this vehicle
        };
    }

    /** Small helper kept here so the strategy is honest about what a lookup really costs. */
    static ParkingFloor floorOf(List<ParkingFloor> floors, ParkingSpot spot) {
        for (ParkingFloor floor : floors) {
            for (ParkingSpot candidate : floor.spots()) if (candidate == spot) return floor;
        }
        throw new IllegalStateException("allocated spot is not on any floor: " + spot);
    }
}`,
      cs: `using System.Collections.Generic;
using System.Linq;

/// Allocation as a cost function, because every real policy is a different weighting of the same
/// candidates: nearest exit, balanced floors, elevator row, EV bay preferred for an EV.
public interface ISpotAllocationStrategy
{
    /// How many candidates to price per kind before giving up: the knob that bounds worst-case cost.
    const int CandidateWindow = 12;

    /// Returns the claimed spot, or null when nothing fits. Implementations must use TryPark.
    ParkingSpot Allocate(IReadOnlyList<ParkingFloor> floors, Vehicle vehicle);
}

/// Best fit, then nearest exit — the default most candidates never write down.
/// (In Java this is a one-line lambda; C# has no SAM conversion for user-defined interfaces,
/// which is itself worth naming in an interview about the two ecosystems.)
public sealed class BestFitNearestAllocation : ISpotAllocationStrategy
{
    public ParkingSpot Allocate(IReadOnlyList<ParkingFloor> floors, Vehicle vehicle)
    {
        var minimum = SpotRules.MinimumKindFor(vehicle);
        ParkingSpot.SpotKind[] ladder = { minimum, ParkingSpot.SpotKind.Ev,
                                          ParkingSpot.SpotKind.Compact, ParkingSpot.SpotKind.Large };

        foreach (var kind in ladder)
        {
            var candidates = new List<ParkingSpot>();

            foreach (var floor in floors)
                foreach (var spot in floor.Candidates(kind, ISpotAllocationStrategy.CandidateWindow))
                    if (spot.Fits(vehicle)) candidates.Add(spot);

            if (candidates.Count == 0) continue;

            candidates.Sort((a, b) => a.DistanceToExit.CompareTo(b.DistanceToExit));

            foreach (var spot in candidates)
            {
                if (!spot.TryPark(vehicle)) continue;
                floors.First(f => f.Spots.Contains(spot)).NotifyTaken(spot);
                return spot;
            }
        }
        return null;                                       // structurally full for this vehicle
    }
}`,
    },
    {
      name: "PricingStrategy",
      java: `import java.time.Duration;
import java.time.Instant;

/**
 * Pricing is the second volatile axis, and the one that actually changes in production.
 * Everything is integer cents; the fee function takes instants so a stay across midnight,
 * a re-issue, or a lost ticket all compute the same number.
 */
public interface PricingStrategy {

    /** @return the amount owed in cents. Must be pure: no clocks, no side effects. */
    int calculate(ParkingTicket ticket, Instant exitTime);

    /** Flat hourly rate with a grace window and a per-day cap. Covers 80% of real lots. */
    record RateCard(int graceMinutes, int centsPerHour, int dayCapCents) implements PricingStrategy {
        public RateCard {
            if (centsPerHour < 0 || dayCapCents < centsPerHour)
                throw new IllegalArgumentException("inconsistent rate card");
        }
        @Override
        public int calculate(ParkingTicket ticket, Instant exitTime) {
            long minutes = Duration.between(ticket.entryTime(), exitTime).toMinutes();
            if (minutes <= graceMinutes) return 0;

            long hours = (minutes + 59) / 60;                      // ceiling without floating point
            long uncapped = hours * centsPerHour;
            long days = (minutes + 1439) / 1440;                   // cap applies per started day
            return (int) Math.min(uncapped, days * (long) dayCapCents);
        }
    }

    /** First hour discounted, then standard: the shape of every promotional rate you will be asked for. */
    static PricingStrategy tiered(int firstHourCents, int laterHoursCents, int dayCapCents) {
        return (ticket, exitTime) -> {
            long minutes = Duration.between(ticket.entryTime(), exitTime).toMinutes();
            long hours = (minutes + 59) / 60;
            long fee = Math.min(1, hours) * firstHourCents + Math.max(0, hours - 1) * laterHoursCents;
            return (int) Math.min(fee, ((minutes + 1439) / 1440) * (long) dayCapCents);
        };
    }

    /** Decorator: this is why pricing is an interface and not a method on the lot. */
    static PricingStrategy surchargeOn(PricingStrategy base, int percentBps, java.util.function.Predicate<Instant> when) {
        return (ticket, exitTime) -> {
            int fee = base.calculate(ticket, exitTime);
            return when.test(exitTime) ? fee + (fee * percentBps / 10_000) : fee;
        };
    }
}`,
      cs: `using System;

/// Pricing is the second volatile axis, and the one that actually changes in production.
/// Everything is integer cents; the fee function takes instants so a stay across midnight,
/// a re-issue, or a lost ticket all compute the same number.
public interface IPricingStrategy
{
    /// Returns the amount owed in cents. Must be pure: no clocks, no side effects.
    int Calculate(ParkingTicket ticket, DateTimeOffset exitTime);
}

/// Flat hourly rate with a grace window and a per-day cap. Covers 80% of real lots.
public sealed class RateCard : IPricingStrategy
{
    public int GraceMinutes { get; }
    public int CentsPerHour { get; }
    public int DayCapCents { get; }

    public RateCard(int graceMinutes, int centsPerHour, int dayCapCents)
    {
        if (centsPerHour < 0 || dayCapCents < centsPerHour)
            throw new ArgumentException("inconsistent rate card");

        GraceMinutes = graceMinutes;
        CentsPerHour = centsPerHour;
        DayCapCents = dayCapCents;
    }

    public int Calculate(ParkingTicket ticket, DateTimeOffset exitTime)
    {
        long minutes = (long)(exitTime - ticket.EntryTime).TotalMinutes;
        if (minutes <= GraceMinutes) return 0;

        long hours = (minutes + 59) / 60;                       // ceiling without floating point
        long uncapped = hours * CentsPerHour;
        long days = (minutes + 1439) / 1440;                    // cap applies per started day
        return (int)Math.Min(uncapped, days * (long)DayCapCents);
    }
}

/// First hour discounted, then standard: the shape of every promotional rate you will be asked for.
public sealed class TieredPricing : IPricingStrategy
{
    private readonly int _firstHourCents, _laterHoursCents, _dayCapCents;

    public TieredPricing(int firstHourCents, int laterHoursCents, int dayCapCents)
    {
        _firstHourCents = firstHourCents;
        _laterHoursCents = laterHoursCents;
        _dayCapCents = dayCapCents;
    }

    public int Calculate(ParkingTicket ticket, DateTimeOffset exitTime)
    {
        long minutes = (long)(exitTime - ticket.EntryTime).TotalMinutes;
        long hours = (minutes + 59) / 60;
        long fee = Math.Min(1, hours) * _firstHourCents + Math.Max(0, hours - 1) * _laterHoursCents;
        return (int)Math.Min(fee, ((minutes + 1439) / 1440) * (long)_dayCapCents);
    }
}

/// Decorator: this is why pricing is an interface and not a method on the lot.
public sealed class WeekendSurcharge : IPricingStrategy
{
    private readonly IPricingStrategy _base;
    private readonly int _percentBps;

    public WeekendSurcharge(IPricingStrategy baseStrategy, int percentBps)
    {
        _base = baseStrategy;
        _percentBps = percentBps;
    }

    public int Calculate(ParkingTicket ticket, DateTimeOffset exitTime)
    {
        int fee = _base.Calculate(ticket, exitTime);
        bool peak = exitTime.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
        return peak ? fee + fee * _percentBps / 10_000 : fee;
    }
}`,
    },
    {
      name: "ParkingTicket",
      java: `import java.time.Instant;

/** Immutable value object: the receipt, the exit-gate lookup key, and the pricing input. */
public final class ParkingTicket {

    public enum Status { ACTIVE, SETTLED, CANCELLED }

    private final String id;
    private final String plate;
    private final Vehicle.Type vehicleType;
    private final String spotId;
    private final int floorNumber;
    private final Instant entryTime;
    private volatile Status status;                    // the only mutable field, and it is monotonic

    public ParkingTicket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryTime) {
        this.id = id;
        this.plate = vehicle.plate();
        this.vehicleType = vehicle.type();
        this.spotId = spot.id();
        this.floorNumber = spot.floorNumber();
        this.entryTime = entryTime;
        this.status = Status.ACTIVE;
    }

    public String id() { return id; }
    public String plate() { return plate; }
    public Vehicle.Type vehicleType() { return vehicleType; }
    public String spotId() { return spotId; }
    public int floorNumber() { return floorNumber; }
    public Instant entryTime() { return entryTime; }
    public Status status() { return status; }

    /** @return false when the ticket was already settled — the guard that makes exit idempotent. */
    public boolean trySettle() {
        synchronized (this) {
            if (status != Status.ACTIVE) return false;
            status = Status.SETTLED;
            return true;
        }
    }

    @Override public String toString() {
        return "Ticket " + id + " plate=" + plate + " spot=" + spotId + " since=" + entryTime;
    }
}`,
      cs: `/// Immutable value object: the receipt, the exit-gate lookup key, and the pricing input.
public sealed class ParkingTicket
{
    public enum TicketStatus { Active, Settled, Cancelled }

    public string Id { get; }
    public string Plate { get; }
    public Vehicle.VehicleKind Kind { get; }
    public string SpotId { get; }
    public int FloorNumber { get; }
    public DateTimeOffset EntryTime { get; }
    public TicketStatus Status { get; private set; }

    private readonly object _gate = new();

    public ParkingTicket(string id, Vehicle vehicle, ParkingSpot spot, DateTimeOffset entryTime)
    {
        Id = id;
        Plate = vehicle.Plate;
        Kind = vehicle.Kind;
        SpotId = spot.Id;
        FloorNumber = spot.FloorNumber;
        EntryTime = entryTime;
        Status = TicketStatus.Active;
    }

    /// Returns false when the ticket was already settled — the guard that makes Exit idempotent.
    public bool TrySettle()
    {
        lock (_gate)
        {
            if (Status != TicketStatus.Active) return false;
            Status = TicketStatus.Settled;
            return true;
        }
    }

    public override string ToString() =>
        "Ticket " + Id + " plate=" + Plate + " spot=" + SpotId + " since=" + EntryTime;
}`,
    },
    {
      name: "ParkingLot",
      java: `import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Application service over the domain. Two dependencies are injected and both are the axes of
 * change; the clock is injected too, because a fee function that reads DateTime.now() cannot be
 * tested across a day boundary.
 */
public final class ParkingLot {

    /** Typed failure: "temporarily full" and "nothing fits this vehicle" page different humans. */
    public static class ParkingFullException extends RuntimeException {
        ParkingFullException(String message) { super(message); }
    }

    public record Bill(ParkingTicket ticket, int amountCents, Instant exitTime) { }

    private final List<ParkingFloor> floors;
    private final Map<String, ParkingSpot> spotIndex;
    private final Map<String, ParkingFloor> floorBySpot;
    private final Map<String, ParkingTicket> ticketsById = new HashMap<>();
    private final Map<String, String> ticketIdByPlate = new HashMap<>();

    private final SpotAllocationStrategy allocation;
    private final PricingStrategy pricing;
    private final Clock clock;
    private final AtomicLong ticketSequence = new AtomicLong();

    private ParkingLot(List<ParkingFloor> floors, Map<String, ParkingSpot> spotIndex,
                       Map<String, ParkingFloor> floorBySpot,
                       SpotAllocationStrategy allocation, PricingStrategy pricing, Clock clock) {
        this.floors = floors;
        this.spotIndex = spotIndex;
        this.floorBySpot = floorBySpot;
        this.allocation = allocation;
        this.pricing = pricing;
        this.clock = clock;
    }

    public static Builder layout() { return new Builder(); }

    /** Entry gate. Allocation is all-or-nothing: either we have a claimed spot and a ticket, or nothing. */
    public ParkingTicket enter(Vehicle vehicle) {
        ParkingSpot spot = allocation.allocate(floors, vehicle);
        if (spot == null) throw new ParkingFullException("no spot fits " + vehicle);

        ParkingTicket ticket;
        synchronized (ticketsById) {
            ticket = new ParkingTicket("T-" + ticketSequence.incrementAndGet(), vehicle, spot, clock.instant());
            ticketsById.put(ticket.id(), ticket);
            ticketIdByPlate.put(vehicle.plate(), ticket.id());
        }
        return ticket;
    }

    /** Exit gate. Idempotent by ticket id, so a flaky barrier arm retrying cannot double-charge. */
    public Bill exit(String ticketId, Instant exitTime) {
        ParkingTicket ticket = findTicket(ticketId);
        ParkingSpot spot = spotIndex.get(ticket.spotId());

        if (!ticket.trySettle()) {
            // Already settled: return a zero bill rather than throwing at a barrier that is retrying.
            return new Bill(ticket, 0, exitTime);
        }

        int amount = pricing.calculate(ticket, exitTime);

        if (spot.release()) {
            ParkingFloor floor = floorBySpot.get(ticket.spotId());
            if (floor != null) floor.notifyFreed(spot);                // back into the free index
        }
        synchronized (ticketsById) {
            ticketsById.remove(ticketId);
            ticketIdByPlate.remove(ticket.plate());
        }
        return new Bill(ticket, amount, exitTime);
    }

    public Optional<ParkingTicket> ticketFor(String plate) {
        synchronized (ticketsById) {
            return Optional.ofNullable(ticketIdByPlate.get(plate)).map(ticketsById::get);
        }
    }

    public int freeSpots(ParkingSpot.SpotType type) {
        int total = 0;
        for (ParkingFloor floor : floors) total += floor.freeCount(type);
        return total;
    }

    private ParkingTicket findTicket(String ticketId) {
        synchronized (ticketsById) {
            ParkingTicket ticket = ticketsById.get(ticketId);
            if (ticket == null) throw new IllegalArgumentException("unknown or already settled ticket " + ticketId);
            return ticket;
        }
    }

    /** Builder doubles as the Factory: spot kinds come from config, and the switch lives in one place. */
    public static final class Builder {
        private final List<ParkingFloor> floors = new ArrayList<>();
        private final Map<String, ParkingSpot> spotIndex = new HashMap<>();
        private final Map<String, ParkingFloor> floorBySpot = new HashMap<>();
        private SpotAllocationStrategy allocation = SpotAllocationStrategy.bestFitNearest();
        private PricingStrategy pricing = new PricingStrategy.RateCard(5, 300, 2400);
        private Clock clock = Clock.systemUTC();

        public Builder floor(int number, java.util.function.IntFunction<ParkingFloor> factory) {
            ParkingFloor floor = factory.apply(number);
            floors.add(floor);
            for (ParkingSpot spot : floor.spots()) {
                spotIndex.put(spot.id(), spot);
                floorBySpot.put(spot.id(), floor);        // O(1) "which index do I return this to?"
            }
            return this;
        }

        public Builder pricing(PricingStrategy pricing) { this.pricing = pricing; return this; }
        public Builder allocation(SpotAllocationStrategy strategy) { this.allocation = strategy; return this; }
        public Builder clock(Clock clock) { this.clock = clock; return this; }

        public ParkingLot build() { return new ParkingLot(floors, spotIndex, floorBySpot, allocation, pricing, clock); }
    }
}`,
      cs: `using System;
using System.Collections.Generic;
using System.Linq;

/// Application service over the domain. The two injected dependencies are the axes of change,
/// and the clock is injected too: a fee function that reads DateTime.Now cannot be tested across
/// a day boundary.
public sealed class ParkingLot
{
    /// Typed failure: "temporarily full" and "nothing fits this vehicle" page different humans.
    public sealed class ParkingFullException : Exception
    {
        public ParkingFullException(string message) : base(message) { }
    }

    public sealed record Bill(ParkingTicket Ticket, int AmountCents, DateTimeOffset ExitTime);

    private readonly List<ParkingFloor> _floors;
    private readonly Dictionary<string, ParkingSpot> _spotIndex;
    private readonly Dictionary<string, ParkingFloor> _floorBySpot;
    private readonly Dictionary<string, ParkingTicket> _ticketsById = new();
    private readonly Dictionary<string, string> _ticketIdByPlate = new();

    private readonly ISpotAllocationStrategy _allocation;
    private readonly IPricingStrategy _pricing;
    private readonly TimeProvider _clock;                // .NET 8: injectable, fakeable, no static Now
    private long _ticketSequence;

    private ParkingLot(List<ParkingFloor> floors, Dictionary<string, ParkingSpot> spotIndex,
                       Dictionary<string, ParkingFloor> floorBySpot,
                       ISpotAllocationStrategy allocation, IPricingStrategy pricing, TimeProvider clock)
    {
        _floors = floors;
        _spotIndex = spotIndex;
        _floorBySpot = floorBySpot;
        _allocation = allocation;
        _pricing = pricing;
        _clock = clock;
    }

    public static Builder Layout() => new();

    /// Entry gate. Allocation is all-or-nothing: either a claimed spot and a ticket, or nothing.
    public ParkingTicket Enter(Vehicle vehicle)
    {
        ParkingSpot spot = _allocation.Allocate(_floors, vehicle)
                           ?? throw new ParkingFullException("no spot fits " + vehicle);

        lock (_ticketsById)
        {
            var ticket = new ParkingTicket("T-" + ++_ticketSequence, vehicle, spot, _clock.GetUtcNow());
            _ticketsById[ticket.Id] = ticket;
            _ticketIdByPlate[vehicle.Plate] = ticket.Id;
            return ticket;
        }
    }

    /// Exit gate. Idempotent by ticket id, so a flaky barrier arm retrying cannot double-charge.
    public Bill Exit(string ticketId, DateTimeOffset exitTime)
    {
        ParkingTicket ticket;
        lock (_ticketsById)
        {
            if (!_ticketsById.TryGetValue(ticketId, out ticket))
                throw new ArgumentException("unknown or already settled ticket " + ticketId);
        }

        if (!ticket.TrySettle()) return new Bill(ticket, 0, exitTime);   // retry after success

        int amount = _pricing.Calculate(ticket, exitTime);

        var spot = _spotIndex[ticket.SpotId];
        if (spot.Release()) _floorBySpot[ticket.SpotId].NotifyFreed(spot);   // back into the free index

        lock (_ticketsById)
        {
            _ticketsById.Remove(ticketId);
            _ticketIdByPlate.Remove(ticket.Plate);
        }
        return new Bill(ticket, amount, exitTime);
    }

    public ParkingTicket TicketFor(string plate)
    {
        lock (_ticketsById)
            return _ticketIdByPlate.TryGetValue(plate, out var id) && _ticketsById.TryGetValue(id, out var t) ? t : null;
    }

    public int FreeSpots(ParkingSpot.SpotKind kind) => _floors.Sum(f => f.FreeCount(kind));

    /// Builder doubles as the Factory: spot kinds come from config, and the switch lives in one place.
    public sealed class Builder
    {
        private readonly List<ParkingFloor> _floors = new();
        private readonly Dictionary<string, ParkingSpot> _spotIndex = new();
        private readonly Dictionary<string, ParkingFloor> _floorBySpot = new();
        private ISpotAllocationStrategy _allocation = new BestFitNearestAllocation();
        private IPricingStrategy _pricing = new RateCard(5, 300, 2400);
        private TimeProvider _clock = TimeProvider.System;

        public Builder Floor(ParkingFloor floor)
        {
            _floors.Add(floor);
            foreach (var spot in floor.Spots)
            {
                _spotIndex[spot.Id] = spot;
                _floorBySpot[spot.Id] = floor;          // O(1) "which index do I return this to?"
            }
            return this;
        }

        public Builder WithPricing(IPricingStrategy pricing) { _pricing = pricing; return this; }
        public Builder WithAllocation(ISpotAllocationStrategy strategy) { _allocation = strategy; return this; }
        public Builder WithClock(TimeProvider clock) { _clock = clock; return this; }

        public ParkingLot Build() => new(_floors, _spotIndex, _floorBySpot, _allocation, _pricing, _clock);
    }
}`,
    },
  ],
  umlNote: "Composition diamonds: Lot ◆— Floor ◆— Spot, and the two strategy interfaces attached to the Lot with dashed 'uses' arrows. Those arrows are the design.",
  qa: [
    ["Why is Vehicle final but ParkingSpot abstract?", "Because the variation is different in kind. A truck differs from a car by measurements, which is data; a motorcycle spot differs from an EV bay by what it must do when a vehicle leaves, which is behavior. Polymorphism buys you behavior, so that is where I spent it."],
    ["What is the complexity of Enter()?", "As written: O(kinds × floors × window) candidate peeks plus a sort, so roughly a few dozen operations for a 1000-spot lot — because of the free index, not because scanning is cheap. The naive version is O(all spots) under a mutex."],
    ["Where is the lock?", "Two places, both small: the ticket maps (a monitor) and the spot claim (a CAS). There is deliberately no lot-wide lock, so two gates can fill the lot in parallel."],
    ["Can a spot be double-sold with the CAS design?", "No — compareAndSet(null, vehicle) has exactly one winner. The real hazard is the reverse: a stale free list. That is why every candidate is re-validated with isFree()/fits() and why release() returns whether it actually freed something."],
    ["Why is exit idempotent, and why return a zero bill instead of throwing?", "A barrier arm that times out and retries is a normal Tuesday. Throwing at the second call would leave a car stuck in a spot it already paid to leave, so the second call resolves to the same outcome with amount 0."],
    ["You said best fit — where exactly?", "In the kind ladder: minimum kind first, then EV, then compact, then large. Only if no candidate of the smallest fitting kind can be claimed do we consume premium space, which is what protects the lot's revenue."],
  ],
  followUps: [
    ["“Support multiple entry gates.”", "Already handled by the CAS claim; the answer to give is that the only shared mutable state left is the ticket registry, which you would move to a concurrent map or a per-gate write buffer merged by a single writer. Then discuss what happens if a gate restarts with unsynced tickets — reconcile from the spot occupancy, which is ground truth."],
    ["“Add EV charging with energy billing.”", "EVSpot gains a meter reading on entry and exit; PricingStrategy becomes a chain (parking fee + kWh fee), which is the decorator already in the design. Mention the operational rule you must ask about: ICE cars occupying EV bays get a penalty rate, and the spot needs an occupancy-after-charge timer."],
    ["“Monthly pass holders skip the ticket flow.”", "Introduce an EntryPolicy: pass-holder lookup issues a standing reservation for a spot *class* rather than a specific spot, and the pass discount is another pricing decorator. Point out that the pass means availability must be tracked as reserved-vs-sellable, or pass holders arrive to a full lot."],
    ["“Now persist it and survive a restart.”", "Tickets and spot occupancy go to a store with an optimistic version; a restart reconciles occupancy from the physical state (sensors/barriers) rather than the map. Say that the in-memory free list is a cache of derived state, and derived state must be rebuildable."],
    ["“Give me 1000 lots and a search page that says '3 spaces left'.”", "Write path stays per-lot; reads move to a projection fed by entry/exit events, because scanning 2000 spots to answer a search is how you take a lot down. Name CQRS and, more importantly, name the staleness you accept (a few seconds)."],
    ["“Trucks need a level restriction.”", "Fit already takes height; add a per-floor max height to the candidate filter. That is the payoff of keeping fit rules in one SpotRules matrix — the change is one predicate, not a rewrite of every spot subclass."],
  ],
  rubric: {
    strong: [
      "Draws the composition tree, then names the two axes of change before coding either.",
      "Best-fit allocation stated as a policy, with the revenue argument for it.",
      "Puts exclusion in the resource (CAS) and explains the stale-index failure mode.",
      "Idempotent exit and a typed 'full' vs 'does not fit' distinction.",
      "Injects the clock and can say why (day-boundary tests).",
    ],
    weak: [
      "Subclass per vehicle type with an empty body.",
      "Scans all spots under one lock and calls it O(1).",
      "Pricing written as a method on ParkingLot.",
      "Assumes release() always succeeds (double-free ghost capacity).",
      "No answer for a lost ticket or a retried exit.",
    ],
  },
  complexity: [
    ["enter", "O(kinds × floors × window) ≈ constant"],
    ["exit", "O(1)"],
    ["lookup by plate", "O(1)"],
    ["space", "O(spots) + two ticket maps"],
    ["contention", "per-spot CAS, no lot lock"],
    ["new pricing rule", "1 class, 0 edits"],
  ],
};
