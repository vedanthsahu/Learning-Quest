## 19. Relationships

### 19.1 The Concept

JPA entities model the same table relationships a Python ORM would (SQLAlchemy
relationships, Django `ForeignKey`/`ManyToManyField`) — `@ManyToOne`,
`@OneToMany`, `@ManyToMany` — but with a distinction Java is stricter about:
every relationship has an **owning side** (the one that actually has the
foreign-key column) and, for two-way relationships, a **mapped-by (inverse)
side** that just mirrors it in memory without owning a column of its own. Get
that backwards and you can end up with confusing duplicate writes; this
codebase has clean, correctly-annotated examples of each shape.

### 19.2 In This Codebase: Many-to-Many

`User.roles` (Part V §18.2) is a many-to-many relationship, backed by a real
join table:

```java
@Builder.Default
@ManyToMany(fetch = FetchType.LAZY)
@JoinTable(name = "user_role",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
)
private Set<Role> roles = new HashSet<>();
```

**Source:** `auth-service/src/main/java/com/ecommerce/authservice/entity/User.java`

`@JoinTable` describes the join table itself (`user_role`, matching the DDL
from Part II §11.3 exactly — `joinColumns` is this side's foreign key,
`inverseJoinColumns` is the other side's. `FetchType.LAZY` means a `User`'s
roles aren't loaded from the database until `.getRoles()` is actually called
on that specific object — deferring the extra query until the data is really
needed, rather than always joining it in up front.

### 19.3 In This Codebase: One-to-Many / Many-to-One, Both Sides

A cart has many orders; each order belongs to exactly one cart. Read both
halves of the same relationship together:

```java
// Cart.java — the "one" side, mapped-by (inverse), no foreign-key column of its own
@Entity
@Table(name = "carts")
public final class Cart extends AbstractMappedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_id", unique = true, nullable = false, updatable = false)
    private Integer cartId;

    @Column(name = "user_id")
    private Long userId;

    @JsonIgnore
    @OneToMany(mappedBy = "cart", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Order> orders;
}
```

```java
// Order.java — the "many" side, owning, holds the real foreign-key column
@Entity
@Table(name = "orders")
public final class Order extends AbstractMappedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id", unique = true, nullable = false, updatable = false)
    private Integer orderId;

    // ... orderDate, orderDesc, orderFee, productId fields ...

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cart_id")
    private Cart cart;
}
```

**Source:** `order-service/src/main/java/com/ecommerce/orderservice/entity/Cart.java` and `order-service/src/main/java/com/ecommerce/orderservice/entity/Order.java`

`Order.cart` is the **owning side** — `@JoinColumn(name = "cart_id")` means
`orders.cart_id` is a real foreign-key column, and setting `order.setCart(cart)`
is what JPA actually persists. `Cart.orders` is the **mapped-by (inverse)
side** — `mappedBy = "cart"` tells JPA "this collection is just the reverse
view of `Order.cart`; don't create a column for it, look it up by querying
orders whose `cart` field points back to this cart." Setting `cart.getOrders().add(order)`
alone, without also setting `order.setCart(cart)`, would not persist the
relationship at all — only the owning side's assignment does.

`CascadeType.ALL` on `Cart.orders` means an operation performed on a `Cart`
(save, delete) cascades to its `orders` automatically — delete a cart, and its
orders are deleted with it, without a separate explicit call. `FetchType.EAGER`
on `Order.cart` (the opposite default from `Cart.orders`'s `LAZY`) means
loading an `Order` always loads its `Cart` immediately, in the same query —
a deliberate choice here since almost every use of an `Order` needs to know
which cart it belongs to.

### 19.4 Recursive Structures and Breaking Cycles, Revisited

Part I §6.3 already covered `Category`'s self-referential `parentCategory`/
`subCategories` relationship and its `@JsonIgnore` cycle-breaking. The exact
same technique appears here: `Cart.orders` carries `@JsonIgnore` too. The
reason is the identical shape of problem — `Order.cart` (eager, always loaded)
points back to the same `Cart` that owns the `orders` collection containing
that very `Order`. Serializing a `Cart` to JSON without breaking that cycle
somewhere would recurse forever: cart → orders → each order's cart → that
cart's orders → .... Cutting it on the `Cart` side (leaving `Order.cart`
serializable) means a client fetching an order can still see which cart it
belongs to; a client fetching a cart just doesn't get its full order list
embedded automatically.

### 19.5 Try It

`Order` has `@ManyToOne(fetch = FetchType.EAGER)` on `cart`, while `Category`
(Part I §6.3) has `@ManyToOne(fetch = FetchType.EAGER)` on `parentCategory`
too — both eager. `Cart.orders` and `Category.subCategories` are both `LAZY`.
Form a general rule from these two examples for which side of a
one-to-many/many-to-one relationship this codebase tends to fetch eagerly,
and which side it tends to defer — and why that choice makes sense given
which side is more likely to be a large, unbounded collection.

---
