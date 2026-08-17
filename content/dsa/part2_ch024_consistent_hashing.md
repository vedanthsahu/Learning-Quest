## §24. Consistent Hashing

### 1. Summary

Consistent hashing is a technique for distributing keys across a changing set of servers/nodes
such that adding or removing one node remaps only a small fraction of keys (roughly 1/N of them),
instead of nearly all of them. It works by hashing both nodes and keys onto the same circular
hash space (a ring), then assigning each key to the next node clockwise from it. Don't confuse
this with plain modulo hashing (`server = hash(key) % num_servers`) — modulo hashing looks similar
but remaps almost *every* key the moment `num_servers` changes, which is exactly the problem
consistent hashing exists to avoid.

### 2. Why Does It Exist?

Distributed caches and databases add and remove nodes constantly — scaling up, scaling down,
node failures. If changing the node count reshuffles nearly all key-to-node assignments (as plain
modulo hashing does), every scaling event triggers a massive, expensive cache-cold-start or data-
migration event. Consistent hashing bounds that disruption to roughly the keys that specifically
belonged to the node being added or removed.

### 3. Mental Model

Picture a clock face (the hash ring). Each server is placed at some position on the clock, based
on hashing its identifier. Each key is also placed on the clock the same way. To find which server
owns a key, walk clockwise from the key's position until you hit the first server. Adding a new
server only steals keys from the one clockwise-neighbor segment it's inserted into — everyone
else's assignments are untouched.

### 4. Basic Implementation (conceptual, with virtual nodes)

```
ring = SortedStructure()               # e.g. a sorted list/BST of (position -> node) pairs

function add_node(node, virtual_copies=150):
    for i in range(virtual_copies):     # virtual nodes smooth out uneven ring distribution
        position = hash(f"{node}-{i}")
        ring.insert(position, node)

function remove_node(node):
    remove all ring positions that map to `node`

function get_node_for_key(key):
    position = hash(key)
    return ring.find_first_position_clockwise_from(position)   # O(log n) via binary search
```

### 5. Time & Space Complexity

| Operation | Complexity |
|---|---|
| Find node for a key | O(log n) — n = number of ring positions (nodes × virtual copies) |
| Add/remove a node | O(log n) per virtual copy inserted/removed |
| Keys remapped when node count changes by one | ≈ K/N (K = total keys, N = node count),
  vs. ≈ K (nearly all keys) under plain modulo hashing |

### 6. Visualization

```
Hash ring (clockwise), 3 nodes:

           NodeA (pos 10)
          /              \
   NodeC (pos 250)    NodeB (pos 90)

key hashing to position 40 -> walk clockwise -> lands on NodeB (pos 90)
key hashing to position 200 -> walk clockwise -> lands on NodeC (pos 250)

Adding NodeD at position 60:
  only keys between position 10 (NodeA) and 60 (NodeD) move from NodeB to NodeD --
  NodeC's and the rest of NodeB's keys are completely undisturbed.

Virtual nodes: each physical node actually occupies MANY ring positions (e.g. 150),
so no single physical node ends up owning a disproportionate arc of the ring by chance.
```

### 7. Real-World Usage

**Cassandra** and **DynamoDB**-style wide-column/key-value stores use consistent hashing directly
to determine which nodes own which key ranges, and to make cluster resizing (adding/removing
nodes) a bounded-cost operation rather than a full data reshuffle (see §52 for the fuller
Cassandra story). Distributed caching layers (e.g. sharded Memcached deployments) use consistent
hashing to decide which cache node a given key belongs to, so that adding a cache node doesn't
invalidate the entire cache's existing key placement. CDN request routing uses a similar ring-
based idea to route requests to edge servers.

### 8. Common Interview Questions

"Design a distributed cache" or "how would you shard data across servers that can be added or
removed" is the direct prompt for this technique — the key differentiator from a naive answer
(`hash(key) % num_servers`) is recognizing that modulo hashing remaps nearly everything on a
resize, and consistent hashing specifically bounds that cost. "What are virtual nodes and why do
they matter" tests whether you understand the load-imbalance problem plain consistent hashing has
with a small number of physical nodes, and how replicating each node to many ring positions fixes
it.

### 9. Key Takeaways

- Consistent hashing bounds key remapping to roughly 1/N of all keys when a node is added or
  removed, versus nearly all keys under plain modulo hashing.
- The mechanism is a hash ring: keys and nodes both hashed onto the same circular space, each key
  owned by the next node clockwise.
- Virtual nodes (each physical node occupying many ring positions) are essential in practice to
  avoid uneven load distribution across a small number of physical nodes.
- Cassandra and DynamoDB-style stores (§52) are the primary real-world production examples worth
  naming directly in an interview.

---
