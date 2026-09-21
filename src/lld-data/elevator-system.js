// Elevator System — the deepest chapter: one-writer-per-car actor model, SCAN scheduling that
// survives direction reversal, a cost-function dispatcher, and the emergency/observability story.

export const ELEVATOR_CHAPTER = {
  id: "elevator-system",
  num: "04",
  title: "Elevator System",
  level: "System-flavoured LLD · 50 min",
  tagline: "Where LLD stops being about classes: two owners for two volatile decisions, and one writer per car.",
  pattern: "State + Strategy + SCAN scheduling + actor (one writer per car)",
  accent: "#c586c0",
  diagram: "elevator",
  uml: "elevator",
  sim: "elevator",
  minutes: 50,
  requirements: [
    "N cars, M floors, up to 8 cars in real buildings; ground and rooftop are always reachable.",
    "Hall calls (a floor button with an UP or DOWN intent) and car calls (a destination inside a cabin).",
    "Each car moves one stop at a time, opens and closes doors, and serves its stops in SCAN order.",
    "A dispatcher assigns every hall call to exactly one car, and re-assigns if that car cannot take it.",
    "A waiting passenger must never be starved, and a car must never reverse mid-travel to chase a call.",
    "Emergency: on the fire alarm every car returns to the ground floor, opens its doors and stops answering calls.",
  ],
  clarify: [
    ["Single building or a bank of elevators?", "Ask for the count: 2 cars and 6 floors is a data-structure question; 8 cars and 40 floors is a scheduling question. The answer changes which part you spend time on."],
    ["Are hall calls assigned once or re-assignable?", "Assigned once, re-assignable while un-served. This is the difference between a toy and a system that survives a car going out of service."],
    ["Do doors block the car?", "Yes — dwell time is real. Model it, because a car that 'arrives' instantly double-serves stops and never lets anyone off."],
    ["What is the hardware model?", "A controller tick with sensors. So the code must be driven by an injected clock/tick, not by wall time in a loop."],
    ["Is fairness a requirement?", "In a building, yes: the metric is worst-case wait, not average. Say that, because it is the reason you do not greedily pile everything onto the nearest car."],
  ],
  entities: [
    ["ElevatorCall", "Immutable record: floor, kind (HALL or CAR), direction, requestedAt. The requestedAt stamp is what lets you measure wait instead of hoping."],
    ["ElevatorCar", "One cabin. Owns its stop sets, its State, and its inbox. The only class allowed to mutate a car's position."],
    ["ElevatorCar.State", "IDLE / MOVING_UP / MOVING_DOWN / DOORS_OPEN / FAULT — plus EMERGENCY as a flag that overrides everything."],
    ["AssignmentStrategy", "Which car answers a hall call, as a scored comparison, so rush-hour tuning is weights and not a rewrite."],
    ["Dispatcher", "Owns the car registry, routes calls, retries unassigned ones each tick, and implements the emergency policy."],
    ["DoorPolicy", "open dwell + close travel time, in millis. Injected, so a test can advance exactly one second."],
    ["CarObserver", "The floor display and the metrics sink. Side effects leave the scheduling path."],
    ["Scheduler tick", "One method, stepOnce(now), advanced by a driver thread or a test loop — the seam that makes this deterministic."],
  ],
  contract: [
    "void pressHallButton(int floor, Direction dir)",
    "void selectDestination(int floor)          // inside the car",
    "boolean submit(ElevatorCall call)          // car inbox: never blocks the caller",
    "void tick(long nowMillis)                  // one scheduler quantum",
    "void fireEmergency()                       // all cars: to ground, doors open, no new calls",
    "Snapshot metrics()                         // avg + max wait, stops served, floors travelled",
  ],
  idea: [
    "Two decisions change for different reasons, so they get different owners. Which car answers a hall call is a *policy* the building operator tunes (nearest? direction-aware? load-aware? rush-hour zoning?). Which floor a car visits next is a *physical* consequence of SCAN scheduling. The naive design puts both in one controller class, and then every tuning meeting is a merge conflict in that class. Here the controller delegates the first to an injected strategy and the second to the car.",
    "Inside a car, scheduling is one idea: keep going until the direction is exhausted, then reverse. Two ordered sets make that trivial — stops above the current floor ascending, stops below descending — and 'next stop' is always `first()` in the active set. Reversal is not a special case; it is just 'the set for this direction is empty'.",
    "The tempting clever version is a single TreeSet with a comparator that orders floors relative to `currentFloor`. Do not ship it, and say exactly why: the comparator reads mutable state, so changing `currentFloor` silently invalidates the tree's invariant and it starts returning wrong elements with no exception. Two direction-keyed sets whose comparators are pure, plus a re-route when a call arrives, is correct and still O(log n). This is the highest-signal sentence in this round.",
    "Concurrency: a cabin is a thing with exactly one legitimate writer — its own controller. So each car owns an inbox queue and a single engine thread drains it; every mutation happens on that thread, which means the car's internals need no locks at all. The dispatcher touches only concurrent queues and an immutable registry snapshot. Locks then appear in exactly one place: the unassigned hall-call registry.",
    "Finally, split hall calls from car calls. A waiting UP passenger at floor 6 is not a destination; they are only boarding if the car passes 6 moving up (or is at 6 reversing upward). Modelling those as two different sets is what stops your elevator from doing a drive-by of every floor.",
  ],
  patterns: [
    ["State", "ElevatorCar.State", "'Can I pick up here?' depends on the state machine: DOORS_OPEN blocks movement, FAULT removes the car from assignment."],
    ["Strategy", "AssignmentStrategy", "The tuning knob, with a Weights record so policies are configuration."],
    ["Actor / single-writer", "car inbox + engine thread", "Removes almost all locking from the scheduling code and makes the state machine analyzable."],
    ["Observer", "CarObserver (floor display, metrics)", "Arrival events are consumed by displays and telemetry without the car knowing either exists."],
    ["Template Method / hook", "Dispatcher.emergency() overriding normal routing", "A cross-cutting mode that must beat every policy, so it is checked before the strategy is consulted."],
  ],
  decisions: [
    ["Two pure-comparator sets, not one relative-comparator set", "Mutable-state comparators corrupt a balanced tree. Cost: on direction reversal, calls already registered in the 'wrong' set are re-routed once.", "The single TreeSet trick: O(log n), looks brilliant, and is silently wrong after the first floor change."],
    ["One thread per car + queue", "The 'elevator is an actor' framing; no locks inside the car, and the engine loop is the only place time advances for it.", "A shared pool running synchronized cars: same throughput at this scale, and 4× the reasoning burden."],
    ["Dispatcher assigns, but the car decides the order", "Two owners for two variabilities; a car never has to expose its internal queue to the controller."],
    ["Direction-aware scoring with a starvation guard", "Average wait improves immediately; a max-wait guard (escalate after N ticks) bounds the worst case.", "Pure nearest-car greedy: excellent average, and floor 1 waits forever at 09:00."],
    ["tick(now) with an injected clock", "Determinism: a test asserts the exact stop sequence for a scripted set of calls.", "Thread.sleep in the loop: untestable, and flaky in CI by lunchtime."],
  ],
  concurrency: [
    "Writes to a car's position, state and stop sets happen on that car's engine thread only. Cross-thread interaction is a `submit()` into a `LinkedBlockingQueue`, which is non-blocking for the caller and therefore cannot deadlock against the dispatcher.",
    "The registry of cars is an immutable `List` published once; the dispatcher reads it without synchronising. Adding a car to service is a copy-on-write swap — reads stay lock-free.",
    "The one genuinely shared mutable structure is the unassigned hall-call set (a call can be re-assignment-eligible). It is a `ConcurrentHashMap<Integer, PendingCall>` keyed by floor+direction, and re-assignment happens only on the dispatcher thread, so there is no read-modify-write race.",
    "Deadlock analysis, said out loud: there is no lock ordering problem because nothing takes two locks. If you add a persistence layer, never hold the car lock while writing the audit row — publish an event and let a writer thread do it.",
    "shutdown(): interrupt the engine threads and drain inboxes; an in-flight call is handed back to the dispatcher so nobody is stranded on a floor with a lit button and a dead car.",
  ],
  edgeCases: [
    "A call at the car's current floor while it is already stopping → the stop set is a Set, so a duplicate press is not a second stop.",
    "Direction reversal request at the exact floor the car occupies (someone presses UP while you are leaving DOWN) → the call is re-routed to the other set on the next tick, not lost.",
    "Car becomes FAULT mid-travel → its pending calls must be released back to the dispatcher, or those passengers wait forever.",
    "Emergency while doors are open → cancel dwell, close, drive to ground, open and stay.",
    "More stops than the direction can serve before reversing: a car call below you while moving up is not an error, it is a next-cycle stop.",
    "A button pressed for the floor you are on (no-op) and a press for an out-of-range floor (rejected at the boundary).",
    "Two floors at the same distance from two cars — ties need a deterministic rule (lowest car id), otherwise 'heisenbug' reports are unfixable.",
  ],
  atScale: [
    "8 cars: the strategy matters more than the data structures; a bad greedy assignment costs more time than any TreeSet.",
    "40 floors / 12 cars: zone the building and add sky lobbies. That is a *strategy* change plus a car-group registry, not a rewrite — which is the payoff of the seam.",
    "Rush hour: switch Weights (heavier stop penalty, park idle cars at the lobby). Do this by config, which means weights are data, and mention that 'up-peak parking' needs an idle-parking policy as a third strategy.",
    "Real hardware: the tick is the PLC loop, calls come from a CAN bus, and the controller must be restartable — so the stop sets are reconstructed from registered button states, never from memory.",
    "Multi-building cloud monitoring: this whole design is per-building; the fleet layer consumes the observer events.",
  ],
  files: [
    {
      name: "ElevatorCall",
      java: `/**
 * One immutable value for both kinds of demand, and the timestamp that makes wait measurable.
 * Kind matters for scheduling: a CAR call is a destination, a HALL call is a passenger who only
 * boards if a car passes their floor wanting to go their way.
 */
public record ElevatorCall(int floor, Kind kind, Direction direction, long requestedAtMillis) {

    public enum Kind { HALL, CAR }

    /** NONE is a real state: a parked car, and a car call once the passenger is inside. */
    public enum Direction { UP, DOWN, NONE }

    public ElevatorCall {
        if (floor < 0) throw new IllegalArgumentException("floor must be >= 0, got " + floor);
        if (kind == null) throw new IllegalArgumentException("kind required");
        direction = direction == null ? Direction.NONE : direction;
    }

    public static ElevatorCall hall(int floor, Direction direction, long nowMillis) {
        return new ElevatorCall(floor, Kind.HALL, direction, nowMillis);
    }

    public static ElevatorCall destination(int floor, long nowMillis) {
        return new ElevatorCall(floor, Kind.CAR, Direction.NONE, nowMillis);
    }

    public boolean isHallCall() { return kind == Kind.HALL; }

    /** Age of an un-served call: the dispatcher's escalation input, and your max-wait metric. */
    public long ageMillis(long nowMillis) { return Math.max(0, nowMillis - requestedAtMillis); }
}`,
      cs: `/// One immutable value for both kinds of demand, and the timestamp that makes wait measurable.
/// Kind matters for scheduling: a Car call is a destination, a Hall call is a passenger who only
/// boards if a car passes their floor wanting to go their way.
public sealed record ElevatorCall(int Floor, CallKind Kind, Direction Dir, long RequestedAtMillis)
{
    public enum CallKind { Hall, Car }

    /// None is a real state: a parked car, and a car call once the passenger is inside.
    public enum Direction { Up, Down, None }

    public static ElevatorCall Hall(int floor, Direction dir, long nowMillis)
    {
        if (floor < 0) throw new System.ArgumentException("floor must be >= 0, got " + floor);
        return new ElevatorCall(floor, CallKind.Hall, dir, nowMillis);
    }

    public static ElevatorCall Destination(int floor, long nowMillis)
    {
        if (floor < 0) throw new System.ArgumentException("floor must be >= 0, got " + floor);
        return new ElevatorCall(floor, CallKind.Car, Direction.None, nowMillis);
    }

    public bool IsHallCall => Kind == CallKind.Hall;

    /// Age of an un-served call: the dispatcher's escalation input, and your max-wait metric.
    public long AgeMillis(long nowMillis) => Math.Max(0, nowMillis - RequestedAtMillis);
}`,
    },
    {
      name: "ElevatorCar",
      java: `import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicLong;

/**
 * A cabin, and the only object allowed to decide where the cabin goes.
 *
 * Threading contract: every field below is mutated on ONE thread (the engine loop, or a test
 * calling stepOnce()). External callers only ever touch submit(), which is a concurrent queue.
 * That is why there is not a single synchronized block in the scheduling path.
 *
 * Why two TreeSets and not one TreeSet with a relative comparator: a comparator that reads
 * currentFloor breaks the tree invariant as soon as the car moves. TreeSet has no way to notice
 * and starts returning wrong elements. Pure comparators + explicit re-routing is the honest fix.
 */
public final class ElevatorCar {

    public enum State { IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, FAULT }

    /** Door timing as data. Tests inject {0,0} to make arrival instantaneous. */
    public record DoorPolicy(long openDwellMillis, long closeMillis) {
        public static final DoorPolicy INSTANT = new DoorPolicy(0, 0);
    }

    public interface CarObserver { void onArrived(ElevatorCar car, int floor); }

    private final int id;
    private final int topFloor;
    private final DoorPolicy doors;
    private final List<CarObserver> observers = List.of();

    /** Destinations of boarded passengers, split by travel direction. */
    private final TreeSet<Integer> upStops = new TreeSet<>();
    private final TreeSet<Integer> downStops = new TreeSet<>(Comparator.reverseOrder());

    /** Waiting hall passengers, keyed by the direction they want. Picked up only on a matching pass. */
    private final TreeSet<Integer> hallUp = new TreeSet<>();
    private final TreeSet<Integer> hallDown = new TreeSet<>();

    private final ConcurrentLinkedQueue<ElevatorCall> inbox = new ConcurrentLinkedQueue<>();

    private int currentFloor;
    private State state = State.IDLE;
    private boolean emergency;
    private long doorsBusyUntil;
    private final AtomicLong stopsServed = new AtomicLong();
    private final AtomicLong floorsTravelled = new AtomicLong();

    public ElevatorCar(int id, int topFloor, DoorPolicy doors) {
        this.id = id;
        this.topFloor = topFloor;
        this.doors = doors;
    }

    public int id() { return id; }
    public int currentFloor() { return currentFloor; }
    public State state() { return state; }
    public boolean isIdle() { return state == State.IDLE && inbox.isEmpty(); }
    public boolean isAssignable() { return state != State.FAULT && !emergency; }
    public long stopsServed() { return stopsServed.get(); }
    public long floorsTravelled() { return floorsTravelled.get(); }

    /** The only cross-thread entry point. Never blocks, so the dispatcher cannot be stalled by a car. */
    public boolean submit(ElevatorCall call) {
        if (!isAssignable()) return false;               // caller keeps it for re-assignment
        if (call.floor() > topFloor) return false;       // out of this car's zone
        return inbox.offer(call);
    }

    public void enterEmergency() {
        emergency = true;
        upStops.clear();
        downStops.clear();
        hallUp.clear();
        hallDown.clear();
    }

    /**
     * One quantum of work. @return true if the car did something observable (moved, opened, closed).
     * Public so the simulation and the unit tests can drive time deterministically without a thread.
     */
    public boolean stepOnce(long now) {
        drainInbox(now);

        if (state == State.FAULT) return false;

        if (state == State.DOORS_OPEN) {
            if (now < doorsBusyUntil) return false;      // dwell is real: no double-serving stops
            state = pendingWork() ? chooseDirection() : State.IDLE;
            return true;
        }

        if (emergency) {
            if (currentFloor == 0) { openDoorsAt(0, now); return true; }
            return moveToward(0, now);
        }

        if (!pendingWork()) { state = State.IDLE; return false; }

        int next = nextStopFloor();
        if (next < 0) { state = State.IDLE; return false; }
        return moveToward(next, now);
    }

    /* --------------------------------- engine-thread internals --------------------------------- */

    private void drainInbox(long now) {
        ElevatorCall call;
        while ((call = inbox.poll()) != null) register(call, now);
    }

    private void register(ElevatorCall call, long now) {
        int floor = call.floor();
        if (floor == currentFloor && call.isHallCall()) { openDoorsAt(floor, now); return; }

        // Destinations and waiting passengers are recorded in different sets on purpose: a hall
        // call is only useful to a car that can reach it in the direction the passenger wants.
        if (floor > currentFloor) upStops.add(floor);
        else if (floor < currentFloor) downStops.add(floor);

        if (call.isHallCall()) {
            if (call.direction() == ElevatorCall.Direction.UP) hallUp.add(floor);
            else if (call.direction() == ElevatorCall.Direction.DOWN) hallDown.add(floor);
        }
    }

    /** SCAN: keep going in this direction until its demand is exhausted, then let it reverse. */
    private int nextStopFloor() {
        if (headingUp())   return pickNearest(upStops.higher(currentFloor), hallUp.ceiling(currentFloor));
        if (headingDown()) return pickNearest(downStops.lower(currentFloor), hallDown.floor(currentFloor));

        // Idle: either way is open, so take the nearest real demand in either direction.
        Integer forward = upStops.isEmpty() ? null : upStops.first();
        Integer backward = downStops.isEmpty() ? null : downStops.last();
        return pickNearest(pickNearest(forward, hallUp.ceiling(currentFloor)),
                           pickNearest(backward, hallDown.floor(currentFloor)));
    }

    private int pickNearest(Integer a, Integer b) {
        if (a == null) return b == null ? -1 : b;
        if (b == null) return a;
        return Math.abs(a - currentFloor) <= Math.abs(b - currentFloor) ? a : b;
    }

    private boolean moveToward(int target, long now) {
        int delta = Integer.compare(target, currentFloor);
        currentFloor += delta;                            // one floor per quantum: real travel
        floorsTravelled.incrementAndGet();
        lastDirectionWasUp = delta > 0;
        state = delta > 0 ? State.MOVING_UP : State.MOVING_DOWN;

        if (currentFloor == target) {
            openDoorsAt(currentFloor, now);
            for (CarObserver observer : observers) observer.onArrived(this, currentFloor);
        }
        return true;
    }

    private void openDoorsAt(int floor, long now) {
        // Drop off first, then take on whoever wants this direction (or anyone, at a terminal floor).
        boolean servingUp = headingUp();
        upStops.remove(floor);
        downStops.remove(floor);
        if (servingUp) hallUp.remove(floor); else hallDown.remove(floor);
        if (floor == 0 || floor == topFloor) { hallUp.remove(floor); hallDown.remove(floor); }

        stopsServed.incrementAndGet();
        state = State.DOORS_OPEN;
        doorsBusyUntil = now + doors.openDwellMillis() + doors.closeMillis();
    }

    /** Intent, not just motion: a car paused with doors open still owes its direction. */
    private boolean headingUp() { return state == State.MOVING_UP || (state == State.DOORS_OPEN && lastDirectionWasUp); }

    private boolean headingDown() { return state == State.MOVING_DOWN || (state == State.DOORS_OPEN && !lastDirectionWasUp); }

    private boolean pendingWork() {
        return !upStops.isEmpty() || !downStops.isEmpty() || !hallUp.isEmpty() || !hallDown.isEmpty();
    }

    /** On door close the car re-decides: that is the reversal point, and it is not a special case. */
    private State chooseDirection() {
        Integer nearestUp = upStops.higher(currentFloor);
        if (nearestUp == null) nearestUp = hallUp.higher(currentFloor);

        Integer nearestDown = downStops.lower(currentFloor);
        if (nearestDown == null) nearestDown = hallDown.lower(currentFloor);

        if (nearestUp != null && (nearestDown == null || nearestUp - currentFloor <= currentFloor - nearestDown)) {
            lastDirectionWasUp = true;
            return State.MOVING_UP;
        }
        if (nearestDown != null) { lastDirectionWasUp = false; return State.MOVING_DOWN; }
        return State.IDLE;
    }

    private boolean lastDirectionWasUp = true;             // tie-break for a freshly idle car
}`,
      cs: `using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

/// A cabin, and the only object allowed to decide where the cabin goes.
///
/// Threading contract: every field below is mutated on ONE thread (the engine loop, or a test
/// calling StepOnce()). External callers only touch Submit(), which is a concurrent queue.
/// That is why there is not a single lock in the scheduling path.
///
/// Why two ordered sets and not one with a relative comparator: a comparator that reads
/// CurrentFloor breaks the tree invariant as soon as the car moves, and SortedSet has no way to
/// notice. Pure comparators + explicit re-routing is the honest fix.
public sealed class ElevatorCar
{
    public enum CarState { Idle, MovingUp, MovingDown, DoorsOpen, Fault }

    /// Door timing as data. Tests inject (0, 0) to make arrival instantaneous.
    public sealed record DoorPolicy(long OpenDwellMillis, long CloseMillis)
    {
        public static readonly DoorPolicy Instant = new(0, 0);
    }

    public delegate void CarObserver(ElevatorCar car, int floor);

    public int Id { get; }
    public int TopFloor { get; }
    public int CurrentFloor { get; private set; }
    public CarState State { get; private set; } = CarState.Idle;
    public long StopsServed => _stopsServed;
    public long FloorsTravelled => _floorsTravelled;

    private readonly DoorPolicy _doors;
    private readonly List<CarObserver> _observers = new();

    /// Destinations of boarded passengers and waiting hall passengers, kept as four sets.
    /// All four stay in natural ascending order; travel direction is expressed by which side of
    /// CurrentFloor the view reads. GetViewBetween is what keeps "next stop" O(log n).
    private readonly SortedSet<int> _upStops = new();
    private readonly SortedSet<int> _downStops = new();
    private readonly SortedSet<int> _hallUp = new();
    private readonly SortedSet<int> _hallDown = new();

    private readonly ConcurrentQueue<ElevatorCall> _inbox = new();

    private bool _emergency;
    private bool _lastDirectionWasUp = true;               // tie-break for a freshly idle car
    private long _doorsBusyUntil;
    private long _stopsServed, _floorsTravelled;

    public ElevatorCar(int id, int topFloor, DoorPolicy doors)
    {
        Id = id;
        TopFloor = topFloor;
        _doors = doors;
    }

    public bool IsIdle => State == CarState.Idle && _inbox.IsEmpty;

    public bool IsAssignable => State != CarState.Fault && !_emergency;

    /// The only cross-thread entry point. Never blocks, so the dispatcher cannot be stalled.
    public bool Submit(ElevatorCall call)
    {
        if (!IsAssignable || call.Floor > TopFloor) return false;   // caller keeps it for re-routing
        _inbox.Enqueue(call);
        return true;
    }

    public void Observe(CarObserver observer) => _observers.Add(observer);

    public void EnterEmergency()
    {
        _emergency = true;
        _upStops.Clear(); _downStops.Clear(); _hallUp.Clear(); _hallDown.Clear();
    }

    /// One quantum of work. Returns true if the car did something observable.
    /// Public so the simulation and unit tests can drive time deterministically without a thread.
    public bool StepOnce(long now)
    {
        DrainInbox();
        if (State == CarState.Fault) return false;

        if (State == CarState.DoorsOpen)
        {
            if (now < _doorsBusyUntil) return false;       // dwell is real: no double-serving stops
            State = PendingWork() ? ChooseDirection() : CarState.Idle;
            return true;
        }

        if (_emergency)
        {
            if (CurrentFloor == 0) { OpenDoorsAt(0, now); return true; }
            return MoveToward(0, now);
        }

        if (!PendingWork()) { State = CarState.Idle; return false; }

        int next = NextStopFloor();
        return next < 0 ? FinishIdle() : MoveToward(next, now);
    }

    private bool FinishIdle()
    {
        State = CarState.Idle;
        return false;
    }

    /* ------------------------------ engine-thread internals ------------------------------ */

    private void DrainInbox()
    {
        while (_inbox.TryDequeue(out var call)) Register(call);
    }

    private void Register(ElevatorCall call)
    {
        int floor = call.Floor;
        if (floor == CurrentFloor && call.IsHallCall) { OpenDoorsAt(floor, Environment.TickCount64); return; }

        if (floor > CurrentFloor) _upStops.Add(floor);
        else if (floor < CurrentFloor) _downStops.Add(floor);

        if (call.IsHallCall)
        {
            if (call.Dir == ElevatorCall.Direction.Up) _hallUp.Add(floor);
            else _hallDown.Add(floor);
        }
    }

    /// SCAN: keep going in this direction until its demand is exhausted, then let it reverse.
    private int NextStopFloor()
    {
        if (HeadingUp())
            return PickNearest(Above(_upStops, CurrentFloor + 1), AtOrAbove(_hallUp, CurrentFloor));

        if (HeadingDown())
            return PickNearest(Below(_downStops, CurrentFloor - 1), AtOrBelow(_hallDown, CurrentFloor));

        // Idle: either way is open, so take the nearest real demand in either direction.
        int? forward = _upStops.Count > 0 ? _upStops.Min : null;
        int? backward = _downStops.Count > 0 ? _downStops.Max : null;
        return PickNearest(PickNearest(forward, AtOrAbove(_hallUp, CurrentFloor)),
                           PickNearest(backward, AtOrBelow(_hallDown, CurrentFloor)));
    }

    /* View helpers: the C# equivalent of TreeSet.higher/floor, and still O(log n).
       The empty-set guard matters: SortedSet.Min returns default(int) when empty, which would
       otherwise hand back floor 0 as a real stop. */
    private static int? Above(SortedSet<int> set, int exclusiveBelow) =>
        set.Count == 0 || exclusiveBelow >= set.Max ? null : set.GetViewBetween(exclusiveBelow, set.Max).Min;

    private static int? AtOrAbove(SortedSet<int> set, int inclusiveBelow) =>
        set.Count == 0 || inclusiveBelow > set.Max ? null : set.GetViewBetween(inclusiveBelow, set.Max).Min;

    private static int? Below(SortedSet<int> set, int exclusiveAbove) =>
        set.Count == 0 || exclusiveAbove <= set.Min ? null : set.GetViewBetween(set.Min, exclusiveAbove).Max;

    private static int? AtOrBelow(SortedSet<int> set, int inclusiveAbove) =>
        set.Count == 0 || inclusiveAbove < set.Min ? null : set.GetViewBetween(set.Min, inclusiveAbove).Max;

    private int PickNearest(int? a, int? b)
    {
        if (a is null) return b ?? -1;
        if (b is null) return a.Value;
        return Math.Abs(a.Value - CurrentFloor) <= Math.Abs(b.Value - CurrentFloor) ? a.Value : b.Value;
    }

    private bool MoveToward(int target, long now)
    {
        int delta = target.CompareTo(CurrentFloor);
        CurrentFloor += delta;                             // one floor per quantum: real travel
        _floorsTravelled++;
        State = delta > 0 ? CarState.MovingUp : CarState.MovingDown;
        _lastDirectionWasUp = delta > 0;

        if (CurrentFloor != target) return true;

        OpenDoorsAt(CurrentFloor, now);
        foreach (var observer in _observers) observer(this, CurrentFloor);
        return true;
    }

    private void OpenDoorsAt(int floor, long now)
    {
        // Drop off first, then take on whoever wants this direction (or anyone, at a terminal floor).
        bool servingUp = HeadingUp();
        _upStops.Remove(floor);
        _downStops.Remove(floor);

        if (servingUp) _hallUp.Remove(floor); else _hallDown.Remove(floor);
        if (floor == 0 || floor == TopFloor) { _hallUp.Remove(floor); _hallDown.Remove(floor); }

        _stopsServed++;
        State = CarState.DoorsOpen;
        _doorsBusyUntil = now + _doors.OpenDwellMillis + _doors.CloseMillis;
    }

    /// Intent, not just motion: a car paused with doors open still owes its direction.
    private bool HeadingUp() => State == CarState.MovingUp || (State == CarState.DoorsOpen && _lastDirectionWasUp);

    private bool HeadingDown() => State == CarState.MovingDown || (State == CarState.DoorsOpen && !_lastDirectionWasUp);

    private bool PendingWork() =>
        _upStops.Count > 0 || _downStops.Count > 0 || _hallUp.Count > 0 || _hallDown.Count > 0;

    /// On door close the car re-decides: that is the reversal point, and it is not a special case.
    private CarState ChooseDirection()
    {
        int? nearestUp = Above(_upStops, CurrentFloor + 1) ?? Above(_hallUp, CurrentFloor + 1);
        int? nearestDown = Below(_downStops, CurrentFloor - 1) ?? Below(_hallDown, CurrentFloor - 1);

        if (nearestUp is not null && (nearestDown is null || nearestUp - CurrentFloor <= CurrentFloor - nearestDown))
        {
            _lastDirectionWasUp = true;
            return CarState.MovingUp;
        }
        if (nearestDown is not null)
        {
            _lastDirectionWasUp = false;
            return CarState.MovingDown;
        }
        return CarState.Idle;
    }
}`,
    },
    {
      name: "AssignmentStrategy",
      java: `import java.util.List;

/**
 * The tuning knob. Expressed as a score, because every real policy (nearest, direction aware,
 * load aware, zone-based) is the same four terms with different weights — so rush hour becomes
 * config, not a rewrite of the controller.
 */
public interface AssignmentStrategy {

    /** @return the car that should serve this call, or null when the building is at capacity. */
    ElevatorCar choose(List<ElevatorCar> cars, ElevatorCall call);

    /** Weights are data: that is the whole difference between a policy and a pile of ifs. */
    record Weights(int floorPenalty, int stopPenalty, int directionBonus, int idleBonus) {
        public static final Weights DEFAULT = new Weights(10, 25, 40, 30);
        public static final Weights RUSH_HOUR = new Weights(6, 45, 70, 10);
    }

    static AssignmentStrategy directionAware(Weights weights) {
        return (cars, call) -> cars.stream()
                .filter(ElevatorCar::isAssignable)
                .min((a, b) -> Integer.compare(score(a, call, weights), score(b, call, weights)))
                .orElse(null);
    }

    /** Lower is better. Ties break on car id, or "which car got it" becomes unreproducible. */
    static int score(ElevatorCar car, ElevatorCall call, Weights w) {
        int distance = Math.abs(car.currentFloor() - call.floor());
        int score = distance * w.floorPenalty();

        if (car.isIdle()) score -= w.idleBonus();

        boolean sameDirection =
                call.direction() == ElevatorCall.Direction.UP && car.state() == ElevatorCar.State.MOVING_UP
             || call.direction() == ElevatorCall.Direction.DOWN && car.state() == ElevatorCar.State.MOVING_DOWN;

        boolean passesFloor =
                call.direction() == ElevatorCall.Direction.UP ? call.floor() >= car.currentFloor()
              : call.direction() == ElevatorCall.Direction.DOWN ? call.floor() <= car.currentFloor()
              : true;

        if (sameDirection && passesFloor) score -= w.directionBonus();
        else if (!sameDirection) score += w.stopPenalty();      // a reversal is expensive for everyone aboard

        return score + car.id();                                // deterministic tie-break
    }

    /** The 20-line answer most candidates give, kept so you can A/B it in a test. */
    static AssignmentStrategy nearest() {
        return directionAware(new Weights(1, 0, 0, 0));
    }
}`,
      cs: `using System.Collections.Generic;
using System.Linq;

/// The tuning knob. Expressed as a score, because every real policy (nearest, direction aware,
/// load aware, zone-based) is the same four terms with different weights — so rush hour becomes
/// config, not a rewrite of the controller.
public interface IAssignmentStrategy
{
    /// Returns the car that should serve this call, or null when the building is at capacity.
    ElevatorCar? Choose(IReadOnlyList<ElevatorCar> cars, ElevatorCall call);

    public sealed record Weights(int FloorPenalty, int StopPenalty, int DirectionBonus, int IdleBonus)
    {
        public static readonly Weights Default = new(10, 25, 40, 30);
        public static readonly Weights RushHour = new(6, 45, 70, 10);
    }
}

/// Lower is better. Ties break on car id, or "which car got it" becomes unreproducible.
public sealed class DirectionAwareAssignment : IAssignmentStrategy
{
    private readonly IAssignmentStrategy.Weights _w;

    public DirectionAwareAssignment(IAssignmentStrategy.Weights weights) => _w = weights;

    public ElevatorCar? Choose(IReadOnlyList<ElevatorCar> cars, ElevatorCall call)
    {
        ElevatorCar? best = null;
        int bestScore = int.MaxValue;

        foreach (var car in cars)
        {
            if (!car.IsAssignable) continue;
            int score = Score(car, call);
            if (score < bestScore) { bestScore = score; best = car; }
        }
        return best;
    }

    private int Score(ElevatorCar car, ElevatorCall call)
    {
        int distance = System.Math.Abs(car.CurrentFloor - call.Floor);
        int score = distance * _w.FloorPenalty;

        if (car.IsIdle) score -= _w.IdleBonus;

        bool sameDirection =
            call.Dir == ElevatorCall.Direction.Up && car.State == ElevatorCar.CarState.MovingUp ||
            call.Dir == ElevatorCall.Direction.Down && car.State == ElevatorCar.CarState.MovingDown;

        bool passesFloor = call.Dir switch
        {
            ElevatorCall.Direction.Up => call.Floor >= car.CurrentFloor,
            ElevatorCall.Direction.Down => call.Floor <= car.CurrentFloor,
            _ => true,
        };

        if (sameDirection && passesFloor) score -= _w.DirectionBonus;
        else if (!sameDirection) score += _w.StopPenalty;      // a reversal is expensive for everyone aboard

        return score + car.Id;                                 // deterministic tie-break
    }
}`,
    },
    {
      name: "Dispatcher",
      java: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Owns the car registry and the routing policy, and nothing else: it does not know how a car
 * picks its next floor, and a car does not know other cars exist.
 *
 * The starvation guard is the part candidates forget: a call that keeps losing the assignment
 * must escalate, or your average wait is great and floor 30 is a rumour.
 */
public final class Dispatcher {

    public record Snapshot(long ticks, long served, long worstWaitMillis, List<Integer> floorsPerCar) { }

    private final List<ElevatorCar> cars;                 // published once, then read-only
    private final AssignmentStrategy strategy;

    /** floor*2 + (up?1:0) -> the call and how long it has been waiting. The only shared mutable map. */
    private final Map<Integer, ElevatorCall> unassigned = new ConcurrentHashMap<>();

    private final ScheduledExecutorService engine = Executors.newScheduledThreadPool(1);
    private final AtomicLong ticks = new AtomicLong();
    private final AtomicLong served = new AtomicLong();
    private final AtomicLong worstWaitMillis = new AtomicLong();

    private volatile boolean emergency;
    private long nowMillis;

    public Dispatcher(List<ElevatorCar> cars, AssignmentStrategy strategy) {
        this.cars = List.copyOf(cars);
        this.strategy = strategy;                          // the weights live inside the strategy
    }

    /** The heartbeat in production is the controller PLC; here it is a 100 ms scheduler. */
    public void start(long quantumMillis) {
        engine.scheduleAtFixedRate(this::tickQuietly, quantumMillis, quantumMillis, TimeUnit.MILLISECONDS);
    }

    public void pressHallButton(int floor, ElevatorCall.Direction direction, long nowMillis) {
        if (emergency) return;                             // buttons are dead during a fire alarm
        ElevatorCall call = ElevatorCall.hall(floor, direction, nowMillis);
        unassigned.put(key(floor, direction), call);
    }

    public void selectDestination(int floor, long nowMillis) {
        ElevatorCar free = cars.stream()
                .filter(ElevatorCar::isAssignable)
                .min(Comparator.comparingInt(c -> Math.abs(c.currentFloor() - floor)))
                .orElse(null);
        if (free != null) free.submit(ElevatorCall.destination(floor, nowMillis));
    }

    /** One quantum: assign what is waiting, then advance every car exactly one step. */
    public void tick() {
        ticks.incrementAndGet();

        for (Map.Entry<Integer, ElevatorCall> entry : unassigned.entrySet()) {
            ElevatorCall call = entry.getValue();

            // Escalation: after ~3 s of waiting, hand it to the least-loaded car regardless of cost.
            boolean starved = call.ageMillis(nowMillis) > 3_000;
            ElevatorCar car = starved ? leastLoaded() : strategy.choose(cars, call);

            if (car != null && car.submit(call)) {
                unassigned.remove(entry.getKey());
                served.incrementAndGet();
                worstWaitMillis.accumulateAndGet(call.ageMillis(nowMillis), Math::max);
            }
        }

        for (ElevatorCar car : cars) car.stepOnce(nowMillis);
        nowMillis += 100;                                  // deterministic in tests, monotonic in prod
    }

    /** Cross-cutting mode: beats every policy, which is why it is checked before the strategy. */
    public void fireEmergency() {
        emergency = true;
        unassigned.clear();
        cars.forEach(ElevatorCar::enterEmergency);
    }

    public void shutdown() {
        engine.shutdownNow();
    }

    public Snapshot metrics() {
        List<Integer> floors = new ArrayList<>();
        for (ElevatorCar car : cars) floors.add(car.currentFloor());
        return new Snapshot(ticks.get(), served.get(), worstWaitMillis.get(), floors);
    }

    public int pendingCalls() { return unassigned.size(); }

    private void tickQuietly() {
        try {
            tick();
        } catch (RuntimeException fatal) {
            // Never let a scheduling exception kill the loop: the building stops responding silently.
            for (ElevatorCar car : cars) car.stepOnce(nowMillis);
            System.err.println("dispatch tick failed: " + fatal);
        }
    }

    private ElevatorCar leastLoaded() {
        return cars.stream()
                .filter(ElevatorCar::isAssignable)
                .min(Comparator.comparingLong(ElevatorCar::stopsServed)
                        .thenComparingInt(ElevatorCar::id))
                .orElse(cars.get(0));
    }

    private static int key(int floor, ElevatorCall.Direction direction) {
        return floor * 2 + (direction == ElevatorCall.Direction.DOWN ? 1 : 0);
    }
}`,
      cs: `using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

/// Owns the car registry and the routing policy, and nothing else: it does not know how a car
/// picks its next floor, and a car does not know other cars exist.
/// The starvation guard is the part candidates forget: a call that keeps losing the assignment
/// must escalate, or your average wait is great and floor 30 is a rumour.
public sealed class Dispatcher : IDisposable
{
    public sealed record Snapshot(long Ticks, long Served, long WorstWaitMillis, IReadOnlyList<int> FloorsPerCar);

    private readonly List<ElevatorCar> _cars;              // published once, then read-only
    private readonly IAssignmentStrategy _strategy;

    /// floor*2 + (down?1:0) -> the call and how long it has waited. The only shared mutable map.
    private readonly ConcurrentDictionary<int, ElevatorCall> _unassigned = new();

    private long _ticks, _served, _worstWaitMillis, _nowMillis;
    private volatile bool _emergency;
    private Timer _engine;

    public Dispatcher(IEnumerable<ElevatorCar> cars, IAssignmentStrategy strategy)
    {
        _cars = cars.ToList();
        _strategy = strategy;
    }

    /// The heartbeat in production is the controller PLC; here it is a 100 ms timer.
    public void Start(long quantumMillis) =>
        _engine = new Timer(_ => Tick(), null, quantumMillis, quantumMillis);

    public void PressHallButton(int floor, ElevatorCall.Direction dir, long nowMillis)
    {
        if (_emergency) return;                            // buttons are dead during a fire alarm
        _unassigned[Key(floor, dir)] = ElevatorCall.Hall(floor, dir, nowMillis);
    }

    public void SelectDestination(int floor, long nowMillis)
    {
        var car = _cars.Where(c => c.IsAssignable)
                       .OrderBy(c => Math.Abs(c.CurrentFloor - floor))
                       .ThenBy(c => c.Id)
                       .FirstOrDefault();
        car?.Submit(ElevatorCall.Destination(floor, nowMillis));
    }

    /// One quantum: assign what is waiting, then advance every car exactly one step.
    public void Tick()
    {
        Interlocked.Increment(ref _ticks);

        foreach (var entry in _unassigned.ToList())
        {
            ElevatorCall call = entry.Value;

            // Escalation: after ~3 s of waiting, hand it to the least-loaded car regardless of cost.
            bool starved = call.AgeMillis(_nowMillis) > 3_000;
            ElevatorCar car = starved ? LeastLoaded() : _strategy.Choose(_cars, call);

            if (car is not null && car.Submit(call))
            {
                _unassigned.TryRemove(entry.Key, out _);
                Interlocked.Increment(ref _served);
                InterlockedMax(ref _worstWaitMillis, call.AgeMillis(_nowMillis));
            }
        }

        foreach (var car in _cars) car.StepOnce(_nowMillis);
        _nowMillis += 100;                                 // deterministic in tests, monotonic in prod
    }

    /// Cross-cutting mode: beats every policy, which is why it is checked before the strategy.
    public void FireEmergency()
    {
        _emergency = true;
        _unassigned.Clear();
        foreach (var car in _cars) car.EnterEmergency();
    }

    public int PendingCalls => _unassigned.Count;

    public Snapshot Metrics() => new(_ticks, _served, _worstWaitMillis, _cars.Select(c => c.CurrentFloor).ToList());

    public void Dispose() => _engine?.Dispose();

    private ElevatorCar LeastLoaded() => _cars
        .Where(c => c.IsAssignable)
        .OrderBy(c => c.StopsServed)
        .ThenBy(c => c.Id)
        .First();

    private static int Key(int floor, ElevatorCall.Direction dir) => floor * 2 + (dir == ElevatorCall.Direction.Down ? 1 : 0);

    private static void InterlockedMax(ref long field, long candidate)
    {
        long current;
        do { current = Volatile.Read(ref field); }
        while (current < candidate && Interlocked.CompareExchange(ref field, candidate, current) != current);
    }
}`,
    },
  ],
  umlNote: "Two arrows carry this design: Dispatcher → AssignmentStrategy (a dashed 'uses') and Dispatcher → ElevatorCar (an aggregated registry). The car's four ordered sets are its whole private world.",
  qa: [
    ["Why two SortedSets per direction instead of one queue?", "Because the next stop must be O(log n) in the direction of travel. A single queue needs a scan to find the nearest forward stop; a single sorted set with a direction-relative comparator is worse — the comparator reads currentFloor, so the tree becomes inconsistent the moment the car moves. Two pure-comparator sets cost a re-route on reversal."],
    ["Who assigns the car, and who assigns the floor?", "Two owners for two reasons-to-change. Assignment policy is tuned by operators (a strategy); floor order is physics (the car's state machine). Merging them makes every tuning meeting a conflict in one file."],
    ["Where is the locking?", "There is none in the scheduling path, by construction: only a car's engine thread mutates it, and callers go through a non-blocking queue. The only shared map is the unassigned-call registry, and it is concurrent because the button press and the tick run on different threads."],
    ["What is the complexity of one tick?", "O(calls × (log s + c) + c) where s is stops per car and c is cars — and the honest follow-up is that at 8 cars and 40 floors, none of this is the bottleneck; the assignment policy is."],
    ["How does a passenger get off at the floor they got on?", "They don't register a stop for their own floor; a CAR call at currentFloor is ignored. The interesting bug is the reverse: someone pressing a hall button as the doors close, which the unassigned registry catches on the next tick."],
    ["What happens when a car fails?", "submit() returns false, so the dispatcher keeps the call in the registry and hands it to someone else. If you instead let submit() swallow the call, that passenger waits forever with a lit button — which is exactly the failure mode the interviewer is fishing for."],
  ],
  followUps: [
    ["“Now make it thread-safe.”", "Say what is already safe and why: one writer per car, a queue as the only cross-thread edge, an immutable registry. Then add the two things that genuinely need it — a shutdown that drains inboxes and hands un-served calls back, and a metrics writer that must not lock the tick. Naming the place you *don't* need a lock is the point."],
    ["“Add door timers and overshoot prevention.”", "Door dwell is already State.DOORS_OPEN + doorsBusyUntil, so a tick during dwell is a no-op. Overshoot prevention means a car cannot start moving toward a stop it will not fit through — check remaining capacity (weight × passengers) before picking up, which is a new guard in register(), not a new field on the dispatcher."],
    ["“40 floors, 12 cars, and the lobby is murder at 09:00.”", "Zoning plus a parking policy: split the bank into high/low zones (a car's topFloor/bottomFloor range), give up-peak calls a strategy that biases toward lobby-parked cars, and idle-park cars in the zone with the highest recent demand. All three are weights or ranges — which is what the seams bought you."],
    ["“Two adjacent hall calls should get two cars.”", "Add a penalty term per already-assigned stop in that band (the load-aware Weights tweak), or a small look-ahead: score the batch of unassigned calls with a greedy assignment instead of one call at a time. Mention that optimal is bipartite matching and that nobody ships it in an elevator."],
    ["“Persist so a restart does not strand people.”", "Registered button presses are the source of truth and live in hardware; on boot, the controller re-reads them and rebuilds its sets. Position comes from the shaft sensor, never from memory — which is a general lesson: derived state must be rebuildable."],
    ["“How do you test this?”", "stepOnce(now) is the seam: script calls, advance the clock, assert the exact stop sequence. Then property tests — no call is served twice, total wait is bounded, emergency always reaches floor 0. State that you deliberately kept the loop free of wall-clock reads so tests are deterministic."],
  ],
  rubric: {
    strong: [
      "Separates assignment (policy) from scheduling (physics) and says who owns each.",
      "Rejects the mutable-comparator trick and can explain the corruption.",
      "Models hall calls and car calls as different things.",
      "One writer per car + queue, so the lock discussion is short.",
      "Volunteers starvation, tie-breaking, and the fail-the-car-not-the-passenger case.",
      "Makes time injectable and can name the test it enables.",
    ],
    weak: [
      "A single queue with a linear scan for the next stop, then a surprise O(n).",
      "Controller that both assigns and schedules in one class.",
      "Thread.sleep in the loop and no way to test a stop sequence.",
      "Fire emergency implemented as an if inside the car.",
      "No answer for a call that never wins an assignment.",
    ],
  },
  complexity: [
    ["submit / press", "O(1) queue offer"],
    ["add stop", "O(log s)"],
    ["next stop", "O(log s)"],
    ["assignment", "O(c log s) per call"],
    ["tick", "O(calls + cars)"],
    ["space", "O(cars × floors)"],
  ],
};
