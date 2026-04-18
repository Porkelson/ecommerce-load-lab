# ecommerce-load-lab

A monorepo combining a **Spring Boot 3 e-commerce REST API** with a **k6 performance test suite**. Built as a QA engineering portfolio project demonstrating realistic load testing, JWT authentication flows, and observable performance characteristics.

> Companion to: [Playwright E2E repo](https://github.com/olekk/recruitment-task-automated-tests)

---

## What This Project Demonstrates

- **Four canonical test types** — smoke, load, stress, spike — each with a specific purpose and appropriate thresholds
- **Realistic user journeys** — authenticated checkout flow, search-heavy browsing, flash-sale spike pattern
- **Per-VU JWT authentication** — each virtual user acquires its own token during init (not counted in metrics), ensuring cart state isolation
- **Structured k6 architecture** — helpers, journeys, scenarios as separate layers (analogous to Page Object Model in Playwright)
- **Observable performance bottlenecks** — HikariCP pool exhaustion, LIKE search degradation, transactional order concurrency, JWT overhead
- **GitHub Actions CI** — build → Docker Compose → health poll → smoke test → teardown on every push

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Java | 17+ | `java -version` |
| Maven | 3.8+ | bundled in Spring parent or install separately |
| Docker Desktop | any recent | for PostgreSQL + production-like runs |
| k6 | latest | [install guide](https://grafana.com/docs/k6/latest/set-up/install-k6/) |

---

## Project Structure

```
ecommerce-load-lab/
├── .github/workflows/ci.yml       ← GitHub Actions: build → smoke → teardown
├── app/                           ← Spring Boot 3 API
│   ├── src/main/java/com/example/ecommerce/
│   │   ├── config/                ← SecurityConfig (JWT filter chain), OpenAPI
│   │   ├── security/              ← JwtTokenProvider, JwtAuthenticationFilter
│   │   ├── entity/                ← User, Category, Product (@Version), CartItem, Order
│   │   ├── repository/            ← JPA repos; ProductRepository has LIKE search query
│   │   ├── dto/                   ← Request/response records (auth, product, cart, order)
│   │   ├── service/               ← Business logic; OrderService is @Transactional
│   │   ├── controller/            ← REST endpoints
│   │   ├── exception/             ← GlobalExceptionHandler (consistent JSON errors)
│   │   └── seed/DataSeeder.java   ← 6 categories, 500 products, 20 test users on startup
│   ├── docker-compose.yml         ← PostgreSQL + app (for load/stress runs)
│   └── Dockerfile                 ← Multi-stage: Maven builder + JRE runner
└── k6/
    ├── data/users.json            ← 20 pre-seeded credentials (matches DataSeeder)
    ├── config/thresholds.js       ← Per-scenario threshold definitions
    ├── helpers/
    │   ├── http-client.js         ← Thin HTTP wrappers (k6's BasePage equivalent)
    │   ├── checks.js              ← Named check bundles (checkAuth, checkCart, etc.)
    │   └── auth.js                ← Per-VU IIFE token pattern
    ├── journeys/
    │   ├── browse-products.js     ← Anonymous: list → search → detail → categories
    │   ├── checkout.js            ← Auth: add to cart → place order → order history
    │   └── search-heavy.js        ← 8 searches with varied terms, sizes, categories
    └── scenarios/
        ├── smoke.js               ← 1 VU, 1 iteration, abort on any failure
        ├── load.js                ← 30 VUs peak, parallel browse + checkout scenarios
        ├── stress.js              ← Ramp to 150 VUs, find the breaking point
        └── spike.js               ← Arrival-rate executor, flash-sale burst pattern
```

---

## Running the API

### Option A: H2 in-memory (instant, no Docker)

```bash
cd app
mvn spring-boot:run
```

- App starts on `:8080`
- H2 console at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:ecommercedb`)
- Swagger UI at `http://localhost:8080/swagger-ui.html`
- 500 products and 20 test users are seeded automatically on first startup

### Option B: PostgreSQL via Docker (realistic load testing)

```bash
cd app
docker compose up
```

- Builds the app image, starts PostgreSQL, waits for health checks
- Uses `application-postgres.yml` with HikariCP pool size = 20
- This is the correct mode for load/stress/spike tests

---

## Running k6 Tests

All commands run from the repo root. The app must be running first.

```bash
# Smoke test — 1 VU, ~30s, CI-ready
k6 run k6/scenarios/smoke.js

# Load test — 30 VUs peak, ~5 minutes
k6 run k6/scenarios/load.js

# Stress test — ramp to 150 VUs, ~10 minutes, find the breaking point
k6 run k6/scenarios/stress.js

# Spike test — arrival-rate, flash-sale burst, ~2.5 minutes
k6 run k6/scenarios/spike.js
```

**Override the base URL** (for a remote or Docker target):
```bash
BASE_URL=http://localhost:8080 k6 run k6/scenarios/load.js
```

**Save raw results for analysis:**
```bash
k6 run --out json=k6/reports/load-results.json k6/scenarios/load.js
```

**Override stress test ceiling:**
```bash
MAX_VUS=200 k6 run k6/scenarios/stress.js
```

Each scenario writes a markdown summary to `k6/reports/` via `handleSummary()`.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register; returns JWT |
| POST | `/api/auth/login` | — | Login; returns JWT |
| GET | `/api/products` | — | List/search products (`search`, `categoryId`, `page`, `size`) |
| GET | `/api/products/{id}` | — | Product detail |
| GET | `/api/categories` | — | All categories (server-cached) |
| POST | `/api/cart/items` | Bearer | Add product to cart |
| GET | `/api/cart` | Bearer | View cart with line totals |
| DELETE | `/api/cart/items/{id}` | Bearer | Remove cart item |
| POST | `/api/orders` | Bearer | Place order (cart → order, clears cart) |
| GET | `/api/orders` | Bearer | Order history |
| GET | `/actuator/health` | — | Health check (used by CI) |

Full interactive docs: `http://localhost:8080/swagger-ui.html`

---

## Performance Observations

These are the real things k6 exposes about this app — not contrived demo scenarios.

### 1. HikariCP Connection Pool Exhaustion

The PostgreSQL profile sets `maximum-pool-size: 20`. The stress test ramps to 150 VUs all making DB-backed requests. When concurrent DB operations exceed 20, requests queue inside HikariCP. When the queue fills (30s timeout), HikariCP throws, Spring returns a 500.

**What to watch:** In the stress test, `http_req_failed` rate starts climbing around the 100 VU stage. The exact VU count at which this happens depends on your machine's response latency.

**The fix:** Tune pool size, add a read replica, introduce a cache layer.

### 2. LIKE Search Query Degradation

`ProductRepository` uses:
```java
WHERE name LIKE '%keyword%' OR description LIKE '%keyword%'
```
A leading wildcard means no B-tree index can help — every search is a full table scan on 500 products. Under the `search-heavy` journey at 50+ VUs, p95 for search requests climbs non-linearly compared to the product-list baseline (which uses a simple indexed scan).

**What to watch:** Compare `http_req_duration{endpoint:search}` vs `http_req_duration{endpoint:product-detail}` in load test output.

**The fix:** PostgreSQL full-text search (`tsvector`), Elasticsearch, or a dedicated search index.

### 3. JWT Verification Overhead

Every authenticated request (cart, orders) runs HMAC-SHA256 verification synchronously on the request thread. Under load, compare:
- Browse requests (no auth): `GET /api/products`
- Authenticated requests: `GET /api/cart`

The difference in p95 (~20–50ms under moderate load) is the Spring Security filter chain + JWT decoding cost. At 100 RPS this is negligible; at 10,000 RPS it becomes a profiling target.

### 4. Order Transaction Concurrency & Optimistic Locking

`OrderService.placeOrder()` is `@Transactional` and:
1. Validates stock for all cart items
2. Decrements `Product.stockQuantity` for each item
3. Creates `Order` + `OrderItems` (price snapshot)
4. Deletes all `CartItem` rows for the user

`Product` has `@Version` for optimistic locking. Under the stress test at 100+ VUs with shared users (VUs 21+ share the same user credential in round-robin), two VUs may race on the same cart. The losing VU gets an `OptimisticLockException`, which the `GlobalExceptionHandler` maps to a 409.

**What to watch:** In stress test output, filter for `http_req_failed{step:place-order}` — a non-zero rate here is the optimistic locking in action, not a bug. Without `@Version`, the same race would silently over-sell stock.

---

## k6 Architecture: The POM Analogy

This project applies the same layered thinking used in Playwright's Page Object Model:

| Playwright | k6 equivalent | Purpose |
|-----------|--------------|---------|
| `BasePage.ts` | `helpers/http-client.js` | Encapsulates *how* to make requests |
| Page action methods | `journeys/*.js` | Encapsulates *what* user flows do |
| Test fixtures | `helpers/auth.js` | Shared setup (token acquisition) |
| `test-data.ts` | `data/users.json` + `config/thresholds.js` | Centralised test data |
| `*.spec.ts` | `scenarios/*.js` | Orchestrates journeys, defines load shape |

This separation means: changing the base URL touches one line in `http-client.js`. Adding a new endpoint means adding one function to `http-client.js` and one check to `checks.js`. Threshold changes never touch scenario logic.

---

## Threshold Rationale

Thresholds are calibrated for a Spring Boot app on a local machine. **Production APIs should target p95 < 500ms.**

| Test | Threshold | Reasoning |
|------|-----------|-----------|
| Smoke | `rate == 0 errors` | 1 VU — any error is a hard failure |
| Load p50 | `< 300ms` | Median under 300ms is achievable for a simple CRUD API |
| Load p95 | `< 1000ms` | Standard SLO for internal REST APIs |
| Load checkout p95 | `< 1500ms` | Transactions are slower than reads; 1.5s is reasonable |
| Stress p95 | `< 3000ms` | Under 150 VUs, degradation is expected — 3s is the "struggling but alive" ceiling |
| Spike p99 | `< 5000ms` | Spike cares about worst-case outliers (p99 not p95) |
| Spike errors | `< 10%` | A flash sale is allowed to fail for some users; >10% means the system is collapsing |

---

## CI Pipeline

The GitHub Actions workflow runs on every push to `main`/`develop` and every PR to `main`:

1. Build Spring Boot JAR (`mvn package -DskipTests`)
2. `docker compose up -d` (builds image, starts PostgreSQL, waits for health)
3. Poll `/actuator/health` until ready (max 3 minutes)
4. Install k6 via APT
5. Run smoke test (`BASE_URL=http://localhost:8080`)
6. Upload `k6/reports/` as artifact (7-day retention, survives test failure)
7. `docker compose down -v` (always runs, cleans up volumes)

Only the smoke test runs in CI (~2 minutes total). Load and stress tests are run locally or on a manual trigger — they take 5–10 minutes and are not suitable for every push.

---

## Potential Improvements

- **Full-text search** — Replace LIKE with PostgreSQL `tsvector` and verify improved p95 under `search-heavy` load
- **Optimistic lock visibility** — Add a custom k6 `Counter` metric specifically for 409 responses on `POST /api/orders` to make the optimistic lock conflict rate explicit in the summary
- **k6 HTML dashboard** — Use [xk6-dashboard](https://github.com/grafana/xk6-dashboard) for a live real-time graph during load runs
- **Scheduled CI load test** — Add a weekly workflow that runs the full load test against a deployed staging environment
- **Redis caching** — Cache the product catalogue in Redis; verify with k6 that p95 on product list drops to <50ms and connection pool pressure decreases
- **Spring Boot Micrometer + Prometheus** — Expose HikariCP pool metrics at `/actuator/prometheus` and correlate them with k6's timeline in a Grafana dashboard

---

## What I Learned

Building this repo taught me that meaningful performance testing requires owning the system under test. With a mock API like JSONPlaceholder, a k6 threshold pass just means "the network worked." With a real Spring Boot app, a threshold failure is a signal: the connection pool is exhausted, the LIKE query doesn't scale, the transaction is racing. The stress test's recovery stage — watching whether the app self-heals after load drops — was the most revealing part of the exercise. An app that takes 60 seconds to recover its p95 after a spike has a resource leak; an app that recovers in 5 seconds doesn't. That distinction only becomes visible when you build the thing you're testing.
