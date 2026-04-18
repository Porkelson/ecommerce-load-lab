/**
 * Load Test
 *
 * Purpose: simulate a normal business day — two concurrent workloads running in
 * parallel via named scenarios.
 *
 *   browse:   20 VUs — anonymous product browsing and search (read-heavy)
 *   checkout: 10 VUs — authenticated cart + order placement (write-heavy)
 *
 * What to watch:
 *   - p95 for search requests vs list requests (LIKE query cost)
 *   - p95 for checkout-tagged requests vs browse (auth + transaction overhead)
 *   - http_req_failed rate (should stay near 0 at this load level)
 *   - HikariCP under 30 VUs — connection pool should never be exhausted
 */
import { sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { get, post } from '../helpers/http-client.js';
import { getTokenForVU } from '../helpers/auth.js';
import { browseProducts, browseByCategoryAndPage } from '../journeys/browse-products.js';
import { checkout } from '../journeys/checkout.js';
import { loadThresholds } from '../config/thresholds.js';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },  // ramp up
        { duration: '3m', target: 20 },  // sustained load
        { duration: '30s', target: 0 },  // ramp down
      ],
      exec: 'browseScenario',
    },
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'checkoutScenario',
    },
  },
  thresholds: loadThresholds,
};

// Per-VU token acquired once during VU init (not counted in scenario metrics)
const token = (() => getTokenForVU())();

export function setup() {
  const productsRes = get('/api/products?page=0&size=100');
  const categoriesRes = get('/api/categories');
  return {
    productIds: productsRes.json('content').map((p) => p.id),
    categoryIds: categoriesRes.json().map((c) => c.id),
  };
}

export function browseScenario(data) {
  browseProducts(data);
  sleep(0.5);
  browseByCategoryAndPage(data);
}

export function checkoutScenario(data) {
  checkout(token, data);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'k6/reports/load-summary.md': textSummary(data, { indent: '  ', enableColors: false }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
