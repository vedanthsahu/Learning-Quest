## §1. Arrays

### 1. Summary

An array is a fixed-layout, contiguous block of memory holding elements of the same size, each
reachable in constant time by an integer index computed directly from a base address (`base +
index * element_size`). A Python `list` is not a raw array — it's a dynamic array: a contiguous
buffer of *pointers* to objects, with spare capacity at the end so appends are usually O(1)
instead of requiring a resize every time. Don't confuse "array" (fixed-size, index-addressed,
contiguous) with "list" in the abstract-data-type sense (an ordered sequence, which could be
backed by an array *or* a linked list) — Python's `list` is a dynamic array specifically.

### 2. Why Does It Exist?

Every other data structure in this book is built out of arrays or pointers, or exists precisely
to work around what a plain array can't do. Arrays exist because random access by index —
"give me element 47,203 right now" — needs to be O(1), and contiguous memory with a known
element size is the only layout that makes that possible without a lookup structure of its own.

### 3. Mental Model

Picture a numbered row of identical-size boxes sitting side by side in memory. Knowing the
address of box 0 and the box size, you can jump straight to box 47,203 with one multiplication
and one addition — no walking, no searching. The tradeoff: because the boxes are packed
side-by-side with nothing spare between them, inserting a new box in the middle means physically
sliding every box after it over by one.

### 4. Basic Implementation

```
function get(array, index):
    return array[index]                      # O(1): base + index * size

function insert_at(array, index, value):
    shift all elements from index..end right by one
    array[index] = value

function delete_at(array, index):
    shift all elements from index+1..end left by one

function append(array, value):
    if array.length == array.capacity:
        allocate new array of capacity * 2
        copy all elements over
    array[array.length] = value
    array.length += 1
```

### 5. Time & Space Complexity

| Operation | Static Array | Dynamic Array (Python `list`) |
|---|---|---|
| Access by index | O(1) | O(1) |
| Search (unsorted) | O(n) | O(n) |
| Append at end | N/A (fixed size) | O(1) amortized |
| Insert/delete at front or middle | O(n) | O(n) |
| Space | O(n) | O(n), with slack capacity |

### 6. Visualization

```
Index:     0    1    2    3    4
         +----+----+----+----+----+
Array:   | 12 | 47 | 3  | 91 | 8  |
         +----+----+----+----+----+
Address:  100  104  108  112  116   (4 bytes/element)

get(array, 3) = *(base_address + 3*4) = *(112) = 91
```

Amortized append doubling — capacity grows geometrically, so the *average* cost per append
stays O(1) even though any single append that triggers a resize costs O(n):

```
len=4, cap=4  [_,_,_,_]  <- full, next append triggers resize
len=5, cap=8  [_,_,_,_,_,_,_,_]  <- copied all 4, then appended
```

### 7. Real-World Usage

Arrays back nearly everything: a Python `list`'s underlying buffer, NumPy's `ndarray` (true
fixed-stride contiguous arrays, which is why NumPy is fast), a database's in-memory row buffers,
image pixel buffers, and every hash table's underlying bucket array (§7 Hash Tables). CPU cache
lines favor arrays heavily over pointer-chasing structures like linked lists — sequential array
access is dramatically faster in practice than the same Big-O on a linked list, because of
cache locality, even though both look identical in asymptotic notation.

### 8. Common Interview Questions

If a problem gives you a fixed collection and asks for a *subarray* (contiguous) property — sum,
max, product — think arrays plus Prefix Sum (§32), Sliding Window (§31), or Two Pointers (§30)
before reaching for anything heavier. If it asks you to find something by value rather than
index, that's a search problem — decide whether the array is sorted (Binary Search, §29) or not
(likely a Hash Table, §7, for O(1) lookup). "Rotate an array in place," "find the missing
number," "two sum" are all fundamentally array-manipulation-with-O(1)-extra-space questions.

### 9. Key Takeaways

- Arrays give O(1) index access because element size and memory layout are fixed and contiguous.
- Insertion/deletion in the middle costs O(n) because of the shift — this is the core tradeoff
  every other linear structure in Part I exists to address in one direction or another.
- Python `list` append is O(1) *amortized*, not O(1) worst-case, due to geometric resizing.
- Contiguous memory means better real-world (cache-driven) performance than the same Big-O
  complexity would suggest on a pointer-based structure.
- Most array interview problems are really "which other structure or technique turns this O(n²)
  brute force into O(n) or O(n log n)" questions.

---
