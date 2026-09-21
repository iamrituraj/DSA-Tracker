// LLD Lab content: four classic interview designs with completed C# implementations.
// Source: curated interview prep notes, extended so every design is whole and runnable-in-spirit.

export const LLD_CHAPTERS = [
  {
    id: "lru-cache",
    num: "01",
    title: "LRU Cache",
    tagline: "Easiest of the four — tests core data structures + clean OOP composition",
    pattern: "Composition + HashMap + Doubly Linked List",
    accent: "#7aa2ff",
    diagram: "lru",
    complexity: [["Get", "O(1)"], ["Put", "O(1)"], ["Space", "O(capacity)"]],
    requirements: [
      "Get(key) → return the value and mark the entry as recently used.",
      "Put(key, value) → insert a new entry or update an existing one.",
      "When capacity is exceeded, evict the least recently used item.",
      "Both Get and Put must run in O(1) time.",
    ],
    idea: [
      "A Dictionary alone gives O(1) lookup but keeps no ordering, so you cannot find the least recently used entry quickly. A linked list alone keeps ordering but lookup is O(n).",
      "Combine them: the Dictionary maps key → node for O(1) access, and a Doubly Linked List maintains recency order for O(1) unlink + reinsert anywhere. Head side is most recently used, tail side is least recently used — eviction always cuts from the tail.",
      "A doubly linked list (not singly) is required because removing an arbitrary node in O(1) needs access to its previous pointer, which a singly linked list cannot give without a prior scan.",
    ],
    files: [
      {
        name: "LruCache.cs",
        code: `public class LruCache<TKey, TValue>
{
    private class Node
    {
        public TKey Key;
        public TValue Value;
        public Node Prev;
        public Node Next;

        public Node(TKey key, TValue value)
        {
            Key = key;
            Value = value;
        }
    }

    private readonly int _capacity;
    private readonly Dictionary<TKey, Node> _map;

    // Sentinel nodes keep the list non-empty and remove all null checks
    // from insert / remove — a classic interview-grade simplification.
    private readonly Node _head;
    private readonly Node _tail;

    private readonly object _lock = new();

    public LruCache(int capacity)
    {
        if (capacity <= 0)
            throw new ArgumentException("Capacity must be positive");

        _capacity = capacity;
        _map = new Dictionary<TKey, Node>();

        _head = new Node(default, default);
        _tail = new Node(default, default);

        _head.Next = _tail;
        _tail.Prev = _head;
    }

    public TValue Get(TKey key)
    {
        lock (_lock)
        {
            if (!_map.TryGetValue(key, out var node))
                return default;

            MoveToFront(node);

            return node.Value;
        }
    }

    public void Put(TKey key, TValue value)
    {
        lock (_lock)
        {
            // Update path: overwrite value and refresh recency.
            if (_map.TryGetValue(key, out var existing))
            {
                existing.Value = value;
                MoveToFront(existing);
                return;
            }

            // Insert path: add to dictionary and to the MRU end of the list.
            var node = new Node(key, value);

            _map[key] = node;
            AddToFront(node);

            // Evict from the LRU end when over capacity.
            if (_map.Count > _capacity)
            {
                var lru = _tail.Prev;

                Remove(lru);
                _map.Remove(lru.Key);
            }
        }
    }

    private void MoveToFront(Node node)
    {
        Remove(node);
        AddToFront(node);
    }

    private void AddToFront(Node node)
    {
        node.Next = _head.Next;
        node.Prev = _head;

        _head.Next.Prev = node;
        _head.Next = node;
    }

    private void Remove(Node node)
    {
        node.Prev.Next = node.Next;
        node.Next.Prev = node.Prev;
    }
}`,
      },
    ],
    qa: [
      ["Why not just use a Dictionary?", "A Dictionary doesn't maintain usage ordering, so finding the least recently used entry would be an O(n) scan."],
      ["Why a doubly linked list instead of singly linked?", "Removing an arbitrary node in O(1) requires its previous pointer. With a singly linked list you'd have to search for the predecessor first — that's O(n)."],
      ["Why the lock?", "Concurrent Get and Put calls mutate both the dictionary and the list. Interleaved mutations would corrupt the structure, so the compound operation must be atomic."],
    ],
    followUps: [
      "Make it thread-safe with a ReaderWriterLockSlim so parallel Gets don't block each other.",
      "Add a TTL so entries expire even when frequently read.",
      "Turn it into an LFU cache — what changes in the data structures?",
    ],
  },
  {
    id: "vending-machine",
    num: "02",
    title: "Vending Machine",
    tagline: "The classic State Pattern problem — behavior depends on the machine's state",
    pattern: "State Pattern + inventory / payment separation",
    accent: "#f0c674",
    diagram: "vending",
    complexity: [
      ["InsertMoney", "O(1)"],
      ["SelectProduct", "O(1)"],
      ["Dispense", "O(1)"],
      ["State check", "no if-chains"],
    ],
    requirements: [
      "Select a product by code.",
      "Insert money and validate the balance against the price.",
      "Dispense the product and return change.",
      "Cancel a transaction and refund the inserted money.",
      "Handle out-of-stock and insufficient-money errors cleanly.",
    ],
    idea: [
      "The machine is a small state machine: IDLE → HAS_MONEY → PRODUCT_SELECTED → DISPENSE → back to IDLE. Which operations are legal depends entirely on the current state.",
      "Instead of a large switch inside VendingMachine checking 'if state == Idle and action == SelectProduct…', each state becomes a class implementing IVendingMachineState. Illegal operations throw from the state that disallows them, and transitions are just SetState calls.",
      "The key interview line: 'I use the State Pattern because valid operations depend heavily on the current state — this keeps each state's rules in one place and avoids an ever-growing conditional maze in the machine itself.'",
    ],
    files: [
      {
        name: "Product.cs",
        code: `public class Product
{
    public string Code { get; }
    public string Name { get; }
    public decimal Price { get; }

    public Product(string code, string name, decimal price)
    {
        Code = code;
        Name = name;
        Price = price;
    }
}`,
      },
      {
        name: "Inventory.cs",
        code: `public class Inventory
{
    private readonly Dictionary<string, (Product Product, int Quantity)> _items
        = new();

    public void AddProduct(Product product, int quantity)
    {
        if (_items.ContainsKey(product.Code))
        {
            var existing = _items[product.Code];

            _items[product.Code] =
                (existing.Product, existing.Quantity + quantity);
        }
        else
        {
            _items[product.Code] = (product, quantity);
        }
    }

    public bool IsAvailable(string code)
    {
        return _items.TryGetValue(code, out var item)
               && item.Quantity > 0;
    }

    public Product GetProduct(string code)
    {
        return _items[code].Product;
    }

    public void RemoveProduct(string code)
    {
        var item = _items[code];

        if (item.Quantity <= 0)
            throw new InvalidOperationException("Out of stock");

        _items[code] = (item.Product, item.Quantity - 1);
    }
}`,
      },
      {
        name: "IVendingMachineState.cs",
        code: `// Every state understands the same four operations;
// states that disallow one simply throw.
public interface IVendingMachineState
{
    void InsertMoney(decimal amount);
    void SelectProduct(string code);
    void Dispense();
    void Cancel();
}`,
      },
      {
        name: "VendingMachine.cs",
        code: `public class VendingMachine
{
    public IVendingMachineState State { get; private set; }

    public Inventory Inventory { get; }

    public decimal Balance { get; set; }

    public Product SelectedProduct { get; set; }

    public VendingMachine()
    {
        Inventory = new Inventory();
        State = new IdleState(this);
    }

    public void SetState(IVendingMachineState state)
    {
        State = state;
    }

    // The machine is a thin dispatcher — every rule lives in the state.
    public void InsertMoney(decimal amount)
    {
        State.InsertMoney(amount);
    }

    public void SelectProduct(string code)
    {
        State.SelectProduct(code);
    }

    public void Dispense()
    {
        State.Dispense();
    }

    public void Cancel()
    {
        State.Cancel();
    }
}`,
      },
      {
        name: "States.cs",
        code: `public class IdleState : IVendingMachineState
{
    private readonly VendingMachine _machine;

    public IdleState(VendingMachine machine)
    {
        _machine = machine;
    }

    public void InsertMoney(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Invalid amount");

        _machine.Balance += amount;
        _machine.SetState(new HasMoneyState(_machine));
    }

    public void SelectProduct(string code)
    {
        throw new InvalidOperationException("Insert money first");
    }

    public void Dispense()
    {
        throw new InvalidOperationException("No product selected");
    }

    public void Cancel()
    {
        throw new InvalidOperationException("No active transaction");
    }
}

public class HasMoneyState : IVendingMachineState
{
    private readonly VendingMachine _machine;

    public HasMoneyState(VendingMachine machine)
    {
        _machine = machine;
    }

    public void InsertMoney(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Invalid amount");

        _machine.Balance += amount;
        // Stay in HasMoneyState — more money, same state.
    }

    public void SelectProduct(string code)
    {
        if (!_machine.Inventory.IsAvailable(code))
            throw new InvalidOperationException("Out of stock");

        _machine.SelectedProduct = _machine.Inventory.GetProduct(code);
        _machine.SetState(new ProductSelectedState(_machine));
    }

    public void Dispense()
    {
        throw new InvalidOperationException("No product selected");
    }

    public void Cancel()
    {
        // Refund whatever was inserted and return to idle.
        _machine.Balance = 0;
        _machine.SetState(new IdleState(_machine));
    }
}

public class ProductSelectedState : IVendingMachineState
{
    private readonly VendingMachine _machine;

    public ProductSelectedState(VendingMachine machine)
    {
        _machine = machine;
    }

    public void InsertMoney(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Invalid amount");

        _machine.Balance += amount;
    }

    public void SelectProduct(string code)
    {
        // Allow switching to a different in-stock product.
        if (!_machine.Inventory.IsAvailable(code))
            throw new InvalidOperationException("Out of stock");

        _machine.SelectedProduct = _machine.Inventory.GetProduct(code);
    }

    public void Dispense()
    {
        if (_machine.Balance < _machine.SelectedProduct.Price)
            throw new InvalidOperationException("Insufficient money");

        _machine.SetState(new DispensingState(_machine));

        // Re-dispatch through the machine: DispensingState now owns the flow.
        _machine.Dispense();
    }

    public void Cancel()
    {
        _machine.SelectedProduct = null;
        _machine.Balance = 0;
        _machine.SetState(new IdleState(_machine));
    }
}

public class DispensingState : IVendingMachineState
{
    private readonly VendingMachine _machine;

    public DispensingState(VendingMachine machine)
    {
        _machine = machine;
    }

    public void Dispense()
    {
        var product = _machine.SelectedProduct;

        _machine.Inventory.RemoveProduct(product.Code);

        var change = _machine.Balance - product.Price;
        _machine.Balance = 0;
        _machine.SelectedProduct = null;

        // In a real machine these would be coin-mechanism / motor calls.
        Console.WriteLine($"Dispensed {product.Name}; change returned: {change}");

        _machine.SetState(new IdleState(_machine));
    }

    public void InsertMoney(decimal amount)
    {
        throw new InvalidOperationException("Transaction in progress");
    }

    public void SelectProduct(string code)
    {
        throw new InvalidOperationException("Transaction in progress");
    }

    public void Cancel()
    {
        throw new InvalidOperationException("Too late to cancel - dispensing");
    }
}`,
      },
    ],
    qa: [
      ["Why the State Pattern instead of a switch?", "The switch would grow as state × operation and every new state means touching one giant method. With State classes, each state owns exactly its legal operations and adding a state is adding a class."],
      ["Where do you keep the balance?", "On the machine (shared context), not inside the state objects — states are transient behavior wrappers, the machine owns the data."],
      ["What's the 'insert money again' behavior?", "It's legal in HAS_MONEY and PRODUCT_SELECTED: the state just adds to the balance without transitioning. That nuance is exactly what interviewers probe."],
    ],
    followUps: [
      "Add a CoinParser that accepts only specific denominations and computes minimal-coin change.",
      "Support admin restock mode as another state (MAINTENANCE) that rejects customer operations.",
      "Make it thread-safe for two simultaneous button presses — where would you lock?",
    ],
  },
  {
    id: "parking-lot",
    num: "03",
    title: "Parking Lot",
    tagline: "Object modeling + Strategy Pattern with two extension axes",
    pattern: "Strategy (allocation + pricing) + Factory-style spot types",
    accent: "#4ec9b0",
    diagram: "parking",
    complexity: [
      ["Enter / park", "O(floors × spots)"],
      ["Exit / pay", "O(1)"],
      ["Spot fit check", "O(1) per spot"],
      ["New rule", "new strategy, no edits"],
    ],
    requirements: [
      "Multiple floors, each with many spots of different types.",
      "Different vehicle types: motorcycle, car, truck.",
      "Entry gate issues a ticket; exit gate computes the fee.",
      "Spot allocation must respect vehicle-to-spot compatibility.",
      "Pricing must be changeable without redeploying the lot logic.",
    ],
    idea: [
      "Model the nouns first: a ParkingLot HAS-A collection of ParkingFloors, each floor HAS-A collection of ParkingSpots. Vehicles form an IS-A hierarchy (Car, Truck, Motorcycle : Vehicle), and spot types mirror it — CompactSpot, LargeSpot, MotorcycleSpot each answer CanFit(vehicle).",
      "Two behaviors change independently of the structure: which spot gets picked (allocation) and how much you pay (pricing). Both become Strategy interfaces injected into ParkingLot.",
      "Tomorrow the requirement changes to 'allocate the spot closest to the elevator' or 'handicap priority' — you add a new IParkingSpotStrategy class without touching ParkingLot at all. That's the Open/Closed Principle demonstrated with the least possible ceremony.",
    ],
    files: [
      {
        name: "Vehicle.cs",
        code: `public enum VehicleType
{
    Motorcycle,
    Car,
    Truck
}

public abstract class Vehicle
{
    public string LicensePlate { get; }
    public VehicleType Type { get; }

    protected Vehicle(string licensePlate, VehicleType type)
    {
        LicensePlate = licensePlate;
        Type = type;
    }
}

public class Car : Vehicle
{
    public Car(string plate)
        : base(plate, VehicleType.Car) { }
}

public class Truck : Vehicle
{
    public Truck(string plate)
        : base(plate, VehicleType.Truck) { }
}

public class Motorcycle : Vehicle
{
    public Motorcycle(string plate)
        : base(plate, VehicleType.Motorcycle) { }
}`,
      },
      {
        name: "ParkingSpot.cs",
        code: `public enum SpotType
{
    Motorcycle,
    Compact,
    Large
}

public abstract class ParkingSpot
{
    public string Id { get; }
    public SpotType Type { get; }

    protected Vehicle Vehicle { get; private set; }

    protected ParkingSpot(string id, SpotType type)
    {
        Id = id;
        Type = type;
    }

    public bool IsFree => Vehicle == null;

    public virtual bool CanFit(Vehicle vehicle)
    {
        return false;
    }

    public void Park(Vehicle vehicle)
    {
        if (!IsFree)
            throw new InvalidOperationException("Spot occupied");

        if (!CanFit(vehicle))
            throw new InvalidOperationException("Vehicle cannot fit");

        Vehicle = vehicle;
    }

    public void Vacate()
    {
        Vehicle = null;
    }
}

// Spot subclasses define their own fit rules — this is where new
// vehicle categories (EV, van, oversized) would hook in.
public class MotorcycleSpot : ParkingSpot
{
    public MotorcycleSpot(string id)
        : base(id, SpotType.Motorcycle) { }

    public override bool CanFit(Vehicle vehicle)
    {
        return vehicle.Type == VehicleType.Motorcycle;
    }
}

public class CompactSpot : ParkingSpot
{
    public CompactSpot(string id)
        : base(id, SpotType.Compact) { }

    public override bool CanFit(Vehicle vehicle)
    {
        return vehicle.Type == VehicleType.Motorcycle
               || vehicle.Type == VehicleType.Car;
    }
}

public class LargeSpot : ParkingSpot
{
    public LargeSpot(string id)
        : base(id, SpotType.Large) { }

    // The biggest spot accepts every vehicle type.
    public override bool CanFit(Vehicle vehicle)
    {
        return true;
    }
}

public class ParkingFloor
{
    public int Number { get; }

    public List<ParkingSpot> Spots { get; } = new();

    public ParkingFloor(int number)
    {
        Number = number;
    }

    public void AddSpot(ParkingSpot spot)
    {
        Spots.Add(spot);
    }
}`,
      },
      {
        name: "AllocationStrategy.cs",
        code: `// Don't put allocation logic directly inside ParkingLot.
public interface IParkingSpotStrategy
{
    ParkingSpot FindSpot(
        IEnumerable<ParkingFloor> floors,
        Vehicle vehicle);
}

public class NearestSpotStrategy : IParkingSpotStrategy
{
    public ParkingSpot FindSpot(
        IEnumerable<ParkingFloor> floors,
        Vehicle vehicle)
    {
        foreach (var floor in floors)
        {
            foreach (var spot in floor.Spots)
            {
                if (spot.IsFree && spot.CanFit(vehicle))
                    return spot;
            }
        }

        return null;
    }
}

// Swappable tomorrow without touching ParkingLot:
//   ElevatorProximityStrategy, HandicapPriorityStrategy, EVChargingStrategy...`,
      },
      {
        name: "PricingStrategy.cs",
        code: `public interface IPricingStrategy
{
    decimal Calculate(ParkingTicket ticket, DateTime exitTime);
}

public class HourlyPricingStrategy : IPricingStrategy
{
    private readonly decimal _ratePerHour;

    public HourlyPricingStrategy(decimal ratePerHour)
    {
        _ratePerHour = ratePerHour;
    }

    public decimal Calculate(
        ParkingTicket ticket,
        DateTime exitTime)
    {
        var duration = exitTime - ticket.EntryTime;

        var hours = Math.Ceiling(duration.TotalHours);

        return (decimal)hours * _ratePerHour;
    }
}

// Other injectable variants:
//   DayPricingStrategy, TieredPricingStrategy (first hour cheap),
//   WeekendPricingStrategy, ValetSurchargeStrategy.`,
      },
      {
        name: "ParkingTicket.cs",
        code: `public class ParkingTicket
{
    public string TicketId { get; }
    public Vehicle Vehicle { get; }
    public ParkingSpot Spot { get; }

    public DateTime EntryTime { get; }

    public ParkingTicket(
        string ticketId,
        Vehicle vehicle,
        ParkingSpot spot)
    {
        TicketId = ticketId;
        Vehicle = vehicle;
        Spot = spot;
        EntryTime = DateTime.UtcNow;
    }
}`,
      },
      {
        name: "ParkingLot.cs",
        code: `public class ParkingLot
{
    private readonly List<ParkingFloor> _floors = new();
    private readonly Dictionary<string, ParkingTicket> _activeTickets = new();

    private readonly IParkingSpotStrategy _spotStrategy;
    private readonly IPricingStrategy _pricingStrategy;

    private int _ticketCounter;

    // Both volatile rules are injected — the lot itself never changes.
    public ParkingLot(
        IParkingSpotStrategy spotStrategy,
        IPricingStrategy pricingStrategy)
    {
        _spotStrategy = spotStrategy;
        _pricingStrategy = pricingStrategy;
    }

    public void AddFloor(ParkingFloor floor)
    {
        _floors.Add(floor);
    }

    // Entry gate: allocate a spot, park, issue a ticket.
    public ParkingTicket Enter(Vehicle vehicle)
    {
        var spot = _spotStrategy.FindSpot(_floors, vehicle);

        if (spot == null)
            throw new InvalidOperationException("Parking full");

        var ticket = new ParkingTicket(
            $"T-{++_ticketCounter}",
            vehicle,
            spot);

        spot.Park(vehicle);
        _activeTickets[ticket.TicketId] = ticket;

        return ticket;
    }

    // Exit gate: compute the fee, free the spot, close the ticket.
    public decimal Exit(string ticketId, DateTime exitTime)
    {
        if (!_activeTickets.TryGetValue(ticketId, out var ticket))
            throw new ArgumentException("Invalid ticket");

        var fee = _pricingStrategy.Calculate(ticket, exitTime);

        ticket.Spot.Vacate();
        _activeTickets.Remove(ticketId);

        return fee;
    }

    public int FreeSpotCount()
    {
        return _floors.Sum(f => f.Spots.Count(s => s.IsFree));
    }
}`,
      },
    ],
    qa: [
      ["Why is allocation a Strategy and not a method on ParkingLot?", "Because the allocation rule is the thing that changes between companies and over time. Isolating it satisfies Open/Closed: new rule = new class, ParkingLot untouched."],
      ["Where does the Factory idea appear?", "In constructing the right spot/vehicle objects. You can add a ParkingSpotFactory that builds floor layouts from a config — spots differ only by type, creation belongs in one place."],
      ["Can one vehicle take multiple spots?", "Not with this model — a spot owns exactly one vehicle. If the requirement appears (a trailer, for example), change the ownership relationship, which is exactly why you ask about it up front."],
    ],
    followUps: [
      "Support multiple entry gates — what must be locked so two cars never get the same spot?",
      "Add EV charging spots with occupancy pricing; which strategy classes change?",
      "Monthly pass holders skip the ticket flow — where does that hook in without breaking hourly pricing?",
    ],
  },
  {
    id: "elevator-system",
    num: "04",
    title: "Elevator System",
    tagline: "The deepest one — State + Strategy + SCAN-like scheduling",
    pattern: "Strategy + State + Scheduling (SCAN)",
    accent: "#c586c0",
    diagram: "elevator",
    complexity: [
      ["AddRequest", "O(log n)"],
      ["Next stop", "O(log n) via SortedSet"],
      ["Elevator select", "O(elevators)"],
      ["Scheduling", "SCAN / elevator algorithm"],
    ],
    requirements: [
      "Multiple elevators serving multiple floors.",
      "External requests from a hall button (UP/DOWN) and internal requests (destination floor).",
      "Each elevator moves, opens/closes doors and serves requests efficiently.",
      "A controller assigns each hall request to one elevator.",
      "The assignment algorithm must be replaceable without touching the controller.",
    ],
    idea: [
      "Split responsibilities in three layers: the ElevatorController owns assignment, each Elevator owns its request sets and movement, and an IElevatorSelectionStrategy decides which elevator answers a hall call.",
      "Inside an elevator, keep two SortedSet collections: requests above the current floor in ascending order and requests below in descending order. Serving Min of the relevant set reproduces the SCAN (elevator) scheduling algorithm — finish the current direction, then reverse.",
      "Because requests live in a sorted structure, insertion is O(log n) and the 'next logical stop' query is O(log n) too — no rescanning the whole queue at every floor.",
    ],
    files: [
      {
        name: "ElevatorRequest.cs",
        code: `public enum Direction
{
    Up,
    Down,
    None
}

// An elevator also has a coarse state — movement vs door-open matters
// when the controller decides who is assignable.
public enum ElevatorState
{
    Idle,
    Moving,
    DoorOpen
}

public class ElevatorRequest
{
    public int Floor { get; }
    public Direction Direction { get; }

    public ElevatorRequest(int floor, Direction direction)
    {
        Floor = floor;
        Direction = direction;
    }
}`,
      },
      {
        name: "Elevator.cs",
        code: `public class Elevator
{
    public int Id { get; }

    public int CurrentFloor { get; private set; }

    public Direction Direction { get; private set; }

    public ElevatorState State { get; private set; }

    // Two sorted sets = the SCAN algorithm in one data structure.
    // Requests above you, ascending; requests below you, descending.
    private readonly SortedSet<int> _upRequests = new();
    private readonly SortedSet<int> _downRequests =
        new(Comparer<int>.Create((a, b) => b.CompareTo(a)));

    public Elevator(int id)
    {
        Id = id;
        CurrentFloor = 0;
        Direction = Direction.None;
        State = ElevatorState.Idle;
    }

    public bool HasPendingRequests =>
        _upRequests.Count > 0 || _downRequests.Count > 0;

    // Idle and nothing pending = free to take a brand-new hall call.
    public bool IsAvailable =>
        State == ElevatorState.Idle && !HasPendingRequests;

    public void AddRequest(int floor)
    {
        if (floor > CurrentFloor)
            _upRequests.Add(floor);
        else if (floor < CurrentFloor)
            _downRequests.Add(floor);
    }

    // One scheduling step: serve the next floor in the current travel
    // direction; when that direction is exhausted, reverse; when both
    // are empty, go idle.
    public void MoveNext()
    {
        if (_upRequests.Count > 0 &&
            (Direction != Direction.Down || _downRequests.Count == 0))
        {
            ServeNext(_upRequests);
            Direction = Direction.Up;
        }
        else if (_downRequests.Count > 0)
        {
            ServeNext(_downRequests);
            Direction = Direction.Down;
        }
        else
        {
            Direction = Direction.None;
            State = ElevatorState.Idle;
        }
    }

    private void ServeNext(SortedSet<int> queue)
    {
        var next = queue.Min;   // nearest stop in the travel direction
        queue.Remove(next);

        CurrentFloor = next;

        // Arrive: doors open to let passengers in/out, then the car is
        // ready for the next MoveNext step.
        State = ElevatorState.DoorOpen;
    }
}`,
      },
      {
        name: "SelectionStrategy.cs",
        code: `// Which elevator answers a hall request is the second volatile rule.
public interface IElevatorSelectionStrategy
{
    Elevator Select(
        IEnumerable<Elevator> elevators,
        ElevatorRequest request);
}

public class NearestElevatorStrategy : IElevatorSelectionStrategy
{
    public Elevator Select(
        IEnumerable<Elevator> elevators,
        ElevatorRequest request)
    {
        return elevators
            .OrderBy(e =>
                Math.Abs(e.CurrentFloor - request.Floor))
            .First();
    }
}

// Replaceable ladders of realism, none of which touch the controller:
//   DirectionAwareStrategy  - prefer a car already traveling your way
//   LoadAwareStrategy       - prefer the emptiest car
//   EtaStrategy             - prefer the smallest estimated arrival`,
      },
      {
        name: "ElevatorController.cs",
        code: `public class ElevatorController
{
    private readonly List<Elevator> _elevators;

    private readonly IElevatorSelectionStrategy _strategy;

    // The controller owns no scheduling knowledge - it delegates both
    // "which elevator" (strategy) and "which floor next" (elevator SCAN).
    public ElevatorController(
        List<Elevator> elevators,
        IElevatorSelectionStrategy strategy)
    {
        _elevators = elevators;
        _strategy = strategy;
    }

    public void RequestElevator(int floor, Direction direction)
    {
        var request = new ElevatorRequest(floor, direction);

        var elevator = _strategy.Select(_elevators, request);

        elevator.AddRequest(floor);
    }

    // The system heartbeat: in production this is driven by a timer /
    // dispatch thread; one tick advances every busy elevator one stop.
    public void Tick()
    {
        foreach (var elevator in _elevators)
        {
            if (elevator.HasPendingRequests)
                elevator.MoveNext();
        }
    }
}`,
      },
    ],
    qa: [
      ["Why two SortedSets instead of one queue?", "Direction matters for the next-stop query. With the split, the next stop is always queue.Min in O(log n); with one set you'd scan for the nearest floor in the travel direction."],
      ["Why does the elevator pick its floors and the controller pick the car?", "Two independent variabilities, two owners. Assignment policy changes (rush-hour tuning) without changing movement, and movement changes (door timing) without touching assignment."],
      ["What's concurrent here?", "In reality requests arrive from many buttons at once — the controller would enqueue them onto a dispatch thread that owns the elevators, so the elevator state machine stays single-writer."],
    ],
    followUps: [
      "'Now make it thread-safe' — where does the lock go: controller, queue, or elevator?",
      "Add door timing and overshoot prevention: which ElevatorState transitions change?",
      "Traffic-aware grouping: two adjacent hall calls should bias toward sending two cars. Which strategy absorbs that complexity?",
    ],
  },
];

export const LLD_PATTERN_TABLE = [
  ["LRU Cache", "Composition + HashMap + LinkedList", "Two structures, each covering the other's weakness."],
  ["Vending Machine", "State Pattern", "Legal behavior depends on the current state."],
  ["Parking Lot", "Strategy + Factory", "Allocation and pricing rules change independently."],
  ["Elevator", "Strategy + State + Scheduling", "Two owners for two volatile decisions."],
];

export const LLD_STEPS = [
  ["Clarify requirements", "Ask before designing: multiple floors? multi-spot vehicles? concurrent gates? hourly or dynamic pricing?"],
  ["Identify core entities", "Nouns → Classes. Verbs → Methods. Changing behavior → Strategy/State. Object creation → Factory."],
  ["Define relationships", "ParkingLot HAS-A ParkingFloor HAS-A ParkingSpot. Car IS-A Vehicle. Get the arrows right before any code."],
  ["Write the happy path first", "A working Park() beats a perfect-but-unwritten billing module."],
  ["Add extensibility out loud", "'If pricing changes, I won't modify the lot — I'll inject IPricingStrategy.' That sentence is worth more than 100 lines of code."],
];

export const LLD_LADDER = [
  "SOLID",
  "Composition over inheritance",
  "Interface segregation",
  "Dependency Injection",
  "Strategy Pattern",
  "State Pattern",
  "Factory Pattern",
  "Observer Pattern",
  "Thread safety / locking",
  "Collections and their complexity",
];

export const LLD_RECAP_CARDS = [
  ["LRU", "Dictionary + Doubly Linked List → O(1) Get/Put"],
  ["Vending Machine", "State Pattern → Idle → Money → Selection → Dispense"],
  ["Parking Lot", "Vehicle + Spot + Floor + Ticket → allocation Strategy + pricing Strategy"],
  ["Elevator", "Elevator + Request + Controller → selection Strategy + SCAN scheduling + State"],
];

export const LLD_FOLLOWUP_PROMPTS = [
  "Now make it thread-safe.",
  "Support multiple entry gates.",
  "Support EV charging spots.",
  "Change pricing without code changes.",
  "What happens when two requests arrive simultaneously?",
];
