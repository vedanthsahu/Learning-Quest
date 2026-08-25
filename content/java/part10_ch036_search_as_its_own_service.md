## 36. Search as Its Own Service

### 36.1 The Concept

`product-service` owns product data in Postgres — the entities from Part I
§6 and Part V. Full-text search (autocomplete, fuzzy matching, ranking by
relevance) is a fundamentally different workload than a relational database
is built for, which is why this platform runs a **separate** service backed
by Elasticsearch, kept in sync via the CDC pipeline §35.3 already introduced,
rather than trying to make Postgres itself do search well.

### 36.2 In This Codebase

`search-service` defines its own `Product` — not the same class as
`product-service`'s JPA entity from Part I §6.3, a completely separate model
shaped for a document database instead of a relational one:

```java
package com.ecommerce.search.document;

import java.time.ZonedDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

@Document(indexName = "product")
@Setting(settingPath = "esconfig/elastic-analyzer.json")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    @Id
    private Long id;
    @Field(type = FieldType.Text, analyzer = "autocomplete_index", searchAnalyzer = "autocomplete_search")
    private String name;
    private String slug;
    @Field(type = FieldType.Double)
    private Double price;
    private Boolean isPublished;
    private Boolean isVisibleIndividually;
    private Boolean isAllowedToOrder;
    private Boolean isFeatured;
    private Long thumbnailMediaId;
    @Field(type = FieldType.Text, fielddata = true)
    private String brand;
    @Field(type = FieldType.Keyword)
    private List<String> categories;
    @Field(type = FieldType.Keyword)
    private List<String> attributes;
    @Field(type = FieldType.Date)
    private ZonedDateTime createdOn;
}
```

**Source:** `search-service/src/main/java/com/ecommerce/search/document/Product.java`

`@Document(indexName = "product")` is Spring Data Elasticsearch's equivalent
of JPA's `@Entity`/`@Table` (Part I §6.3) — this class maps to an
Elasticsearch **index** named `product`, not a SQL table. The `@Field`
annotations are where the two worlds diverge most: `FieldType.Text` fields
(like `name`) are analyzed — broken into searchable tokens by a text analyzer
— while `FieldType.Keyword` fields (`categories`, `attributes`) are indexed
as exact, unanalyzed values, meant for filtering and aggregation rather than
free-text search. `name`'s `analyzer = "autocomplete_index"` and
`searchAnalyzer = "autocomplete_search"` (two *different* analyzers, one for
indexing, one for querying — configured externally in the
`@Setting(settingPath = "esconfig/elastic-analyzer.json")` file) is precisely
what powers "search as you type" style autocomplete, a capability plain SQL
`LIKE '%query%'` matching doesn't provide.

### 36.3 Staying in Sync

Nothing in `product-service`'s own code writes directly to this Elasticsearch
index — `ProductSyncDataConsumer` (§35.3) is the only path data takes to
arrive here, reacting to Postgres CDC events and calling
`productSyncDataService.createProduct(id)`/`updateProduct(id)`/`deleteProduct(id)`
in response. This means `search-service`'s index is **eventually
consistent** with `product-service`'s real data — there's a real, if usually
small, window between a product changing in Postgres and that change
reaching Elasticsearch, flowing through the CDC tool, the Kafka topic, and
this consumer, in that order.

### 36.4 Try It

If `product-service`'s Postgres `products` table gained a new column
(say, `discount_percentage`) that should also be searchable/filterable,
name every layer, in order, that new field would need to be added to for it
to actually show up as a real Elasticsearch field on this `Product` document —
starting from the Postgres column itself, and using what §35.3 and this
chapter have shown about how data actually flows from one to the other.

---
