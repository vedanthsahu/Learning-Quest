## §27. Vector Indexes: KD-Trees & HNSW

### 1. Summary

A vector index answers "which stored vectors are closest to this query vector" (nearest-neighbor
search) faster than checking every stored vector one by one. This chapter covers two approaches at
opposite ends of the tradeoff spectrum: a **KD-Tree**, which partitions space along alternating
dimensions and gives *exact* nearest-neighbor results but degrades badly in high dimensions; and
**HNSW** (Hierarchical Navigable Small World graphs), which gives *approximate* nearest neighbors
(ANN) but scales gracefully to the hundreds-of-dimensions embeddings produced by modern ML models.
Don't confuse "nearest neighbor" here with a Binary Search Tree (§11) — a BST orders one-
dimensional keys; nearest-neighbor search operates over points in many-dimensional space, where
there's no single "smaller/larger" ordering to exploit.

### 2. Why Does It Exist?

Comparing a query vector against every stored vector one at a time is O(n) per query — fine for
a few thousand vectors, prohibitively slow for the tens or hundreds of millions of embeddings a
production RAG or recommendation system might store. A vector index restructures the data so most
queries only need to examine a small fraction of it.

### 3. Mental Model — KD-Tree

A KD-Tree generalizes a BST's "smaller left, larger right" idea to multiple dimensions by
splitting on a *different* dimension at each depth level (x, then y, then x again, for 2D data) —
each split cuts the remaining space roughly in half, the same halving intuition as binary search.
The problem: in high dimensions (embeddings are commonly 384-1536 dimensions), almost every point
ends up "close" to almost every split boundary, and the tree's pruning power collapses — this is
the well-known **curse of dimensionality**.

### 3b. Mental Model — HNSW

HNSW builds several layers of a navigable graph, sparse at the top (long-range "express" links
between far-apart points) and dense at the bottom (short-range links between nearby points) —
structurally similar in spirit to a Skip List's (§21) layered express lanes, but over graph edges
in many-dimensional space instead of a sorted 1D sequence. A search starts at the sparse top
layer, greedily walks toward the query vector, and drops down a layer once no closer neighbor is
found at the current layer — converging on a very good (though not always exact) answer in a
small number of hops.

### 4. Basic Implementation (conceptual)

```
# KD-Tree: exact NN, good only for low dimensions (roughly <20)
function build_kdtree(points, depth=0):
    if points is empty: return None
    axis = depth % num_dimensions
    sort points by their value along `axis`
    median = points[len(points)//2]
    return Node(
        value=median,
        left=build_kdtree(points before median, depth+1),
        right=build_kdtree(points after median, depth+1)
    )

# HNSW: approximate NN, scales to hundreds of dimensions
function search(hnsw, query, ef=search_width):
    current = entry_point_at_top_layer
    for layer from top to bottom:
        current = greedy_walk_toward(query, current, layer)   # follow closer neighbors
        if layer > 0:
            descend_to_next_layer(current)
    return best_ef_candidates_found(current, ef)               # approximate top-ef results
```

### 5. Time & Space Complexity

| Structure | Search | Build | Exactness | Scales to High Dimensions? |
|---|---|---|---|---|
| Brute-force scan | O(n·d) | O(1) | Exact | Yes, but always slow |
| KD-Tree | O(log n) low-dim, degrades toward O(n) high-dim | O(n log n) | Exact | Poorly |
| HNSW | O(log n) typical, empirically | O(n log n) typical | Approximate | Well |

d = number of dimensions; HNSW's guarantees are empirical/probabilistic, not worst-case proven,
which is the honest tradeoff versus a KD-Tree's exactness.

### 6. Visualization

```
KD-Tree (2D), alternating x/y splits:
              (5,4) [split on x]
             /              \
      (2,3)[split on y]   (8,6)[split on y]
       /        \            /        \
    (1,1)     (3,5)      (7,2)      (9,8)

HNSW layers (sparse top, dense bottom):
Layer 2:   A -------------------> F              (long hops)
Layer 1:   A -----> C -----> E -> F
Layer 0:   A->B->C->D->E->F->G->H                 (every point, short hops)

search(query near E): start at A (layer 2) -> hop to F -> drop to layer 1 ->
                       refine toward E -> drop to layer 0 -> confirm nearest neighbors
```

### 7. Real-World Usage

**Vector databases (FAISS, pgvector, Pinecone, Milvus)** use HNSW (or related ANN structures like
IVF) as their core index for embedding similarity search — this is the mechanism behind RAG
(retrieval-augmented generation) systems finding the most relevant document chunks for a query,
and behind recommendation systems finding "similar items" (see §55 for the fuller story of how
these pieces combine in production AI infrastructure). KD-Trees remain useful for genuinely
low-dimensional nearest-neighbor problems — spatial/geographic queries (nearest restaurant to a
GPS coordinate, 2-3 dimensions), where the curse of dimensionality never becomes a factor.

### 8. Common Interview Questions

"How would you find the most similar documents/images/products to a given one, at scale" is the
prompt this chapter directly answers — for embeddings (high-dimensional), the expected answer
names HNSW or a vector database, not a KD-Tree. "Why doesn't a KD-Tree work well for 1000-
dimensional embeddings" tests understanding of the curse of dimensionality — every point ends up
roughly equidistant from every split boundary, so pruning stops helping and search degrades
toward brute force. "What's the tradeoff of approximate nearest neighbor search" is asking
whether you understand that HNSW/ANN structures trade a small, tunable accuracy loss for a large
speed gain, which is almost always the right tradeoff for embedding-scale similarity search.

### 9. Key Takeaways

- Nearest-neighbor search generalizes ordered search (§11, §29) to multiple dimensions, where no
  single dimension's ordering alone can guide the search.
- KD-Trees give exact results but collapse toward brute-force performance in high dimensions —
  the curse of dimensionality — making them suitable mainly for low-dimensional (spatial/
  geographic) data.
- HNSW trades exactness for a layered-graph structure that scales gracefully to the hundreds of
  dimensions real embeddings use, and is the practical default for production vector search.
- FAISS, pgvector, Pinecone, and Milvus (§55) are the concrete systems to name — this structure
  is the backbone of every modern RAG and embedding-similarity production system.

---
