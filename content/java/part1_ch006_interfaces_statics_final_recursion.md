## 6. Interfaces, Statics, Final, and Recursion

### 6.1 Interface / Implementation Separation

Declaring a service as an interface, then implementing it in a separate class,
is one of the oldest patterns in Java — and it's used throughout this codebase's
"legacy layer." `ProductService` declares the complete contract with no bodies:

```java
package com.ecommerce.productservice.service;

import com.ecommerce.productservice.dto.ProductDto;

import java.util.List;

public interface ProductService {
    List<ProductDto> findAll();

    ProductDto findById(final Integer productId);

    ProductDto save(final ProductDto productDto);

    ProductDto update(final ProductDto productDto);

    ProductDto update(final Integer productId, final ProductDto productDto);

    void deleteById(final Integer productId);
}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/service/ProductService.java`

`ProductServiceImpl implements ProductService` (Part I §4.2) supplies every
method body — including both overloaded `update` methods, which is why the
interface declares two `update` signatures rather than one. Python's nearest
equivalent is an `abc.ABC` with `@abstractmethod` methods, or a
`typing.Protocol` — but where Python's version is optional discipline, Java's
`interface` is compiler-enforced: `ProductServiceImpl` simply does not compile
until every method in `ProductService` has an implementation.

The practical payoff shows up in Spring's dependency injection (Part III):
other classes depend on the *interface* type, not the concrete class, which
means the implementation could be swapped — for tests, or for an entirely
different strategy — without touching any calling code.

### 6.2 Static Methods on an Interface

`ProductMappingHelper` uses an interface for a different reason entirely — not
as a contract to implement, but purely as a namespace for functions that never
need an object instance:

```java
package com.ecommerce.productservice.helper;

import com.ecommerce.productservice.entity.Category;
import com.ecommerce.productservice.entity.Product;
import com.ecommerce.productservice.dto.CategoryDto;
import com.ecommerce.productservice.dto.ProductDto;

public interface ProductMappingHelper {
    static ProductDto map(final Product product) {
        return ProductDto.builder()
                .productId(product.getProductId())
                .productTitle(product.getProductTitle())
                .imageUrl(product.getImageUrl())
                .sku(product.getSku())
                .priceUnit(product.getPriceUnit())
                .quantity(product.getQuantity())
                .categoryDto(
                        CategoryDto.builder()
                                .categoryId(product.getCategory().getCategoryId())
                                .categoryTitle(product.getCategory().getCategoryTitle())
                                .imageUrl(product.getCategory().getImageUrl())
                                .build())
                .build();
    }

    static Product map(final ProductDto productDto) {
        return Product.builder()
                .productId(productDto.getProductId())
                .productTitle(productDto.getProductTitle())
                .imageUrl(productDto.getImageUrl())
                .sku(productDto.getSku())
                .priceUnit(productDto.getPriceUnit())
                .quantity(productDto.getQuantity())
                .category(
                        Category.builder()
                                .categoryId(productDto.getCategoryDto().getCategoryId())
                                .categoryTitle(productDto.getCategoryDto().getCategoryTitle())
                                .imageUrl(productDto.getCategoryDto().getImageUrl())
                                .build())
                .build();
    }

}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/helper/ProductMappingHelper.java`

`static` methods on an interface became legal in Java 8. Nobody ever writes
`new ProductMappingHelper()` — every call site is `ProductMappingHelper.map(x)`,
exactly like calling a plain function in a Python module. This is functionally
close to a Python module of loose functions, or a class of nothing but
`@staticmethod`s; Java just requires *some* class or interface to hang the
methods off of, since it has no true module-level free function. Notice the two
`map` methods are **overloaded** — same name, different parameter type
(`Product` vs `ProductDto`) — Java picks the right one at compile time based on
the argument's type, something Python's single-dispatch-free function
definitions don't do at all.

### 6.3 `final` Classes and Recursive Entities

`Product` combines two ideas worth separating. First, `final`:

```java
package com.ecommerce.productservice.entity;

import lombok.*;
import jakarta.persistence.*;
import java.io.Serial;
import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = {"category"})
@Data
@Builder
@Entity
@Table(name = "products")
public final class Product extends AbstractMappedEntity implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id", unique = true, nullable = false, updatable = false)
    private Integer productId;

    @Column(name = "product_title")
    private String productTitle;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(unique = true)
    private String sku;

    @Column(name = "price_unit", columnDefinition = "decimal")
    private Double priceUnit;

    @Column(name = "quantity")
    private Integer quantity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/entity/Product.java`

`final` on a class means it cannot be subclassed at all — `class Sale extends
Product` would fail to compile. Python has no direct equivalent (any class can
be subclassed by default); the closest deliberate parallel is simply choosing
not to design a class for inheritance, except Java's `final` makes that
decision compiler-enforced rather than a matter of convention. `implements
Serializable` is a marker interface (it declares no methods at all) telling the
JVM this object's state can be converted to a byte stream — relevant if this
entity is ever cached, sent across a network in raw Java-serialized form, or
stored in a session. The JPA annotations (`@Entity`, `@Id`, `@Column`, `@ManyToOne`)
are covered properly in Part V.

`Category`, in the same package, is a **self-referential** entity — a category
can have a parent category and child subcategories, both typed as `Category`
itself:

```java
package com.ecommerce.productservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import jakarta.persistence.*;
import java.io.Serial;
import java.io.Serializable;
import java.util.Set;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = {"subCategories", "parentCategory", "products"})
@Data
@Builder
@Entity
@Table(name = "categories")
public final class Category extends AbstractMappedEntity implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id", unique = true, nullable = false, updatable = false)
    private Integer categoryId;

    @Column(name = "category_title")
    private String categoryTitle;

    @Column(name = "image_url")
    private String imageUrl;

    @JsonIgnore
    @OneToMany(mappedBy = "parentCategory", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Category> subCategories;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_category_id")
    private Category parentCategory;

    @JsonIgnore
    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Set<Product> products;

}
```

**Source:** `product-service/src/main/java/com/ecommerce/productservice/entity/Category.java`

This is the classic recursive tree structure — the same shape as a Python class
whose `children` attribute holds a list of instances of that same class — here
backed by a real self-join in the database (Part V covers the `@OneToMany`/
`@ManyToOne` annotations themselves). The `@JsonIgnore` on `subCategories` (and
on `products`) matters specifically *because* the structure is recursive:
without it, serializing a `Category` to JSON would walk into its subcategories,
which each reference their parent again, and loop forever. `parentCategory` is
deliberately left serializable — the walk only needs to be cut in one direction
to break the cycle.

### 6.4 Try It

Look at `Category` above. `parentCategory` has no `@JsonIgnore`, but
`subCategories` and `products` both do. In your own words, explain why leaving
exactly one direction of this circular reference serializable is enough to
prevent an infinite loop — and which direction it would have needed to be if
the fields had been named the other way around.

---
