/**
 * Stress Test
 *
 * Purpose: find the breaking point — ramp VUs well past the comfortable zone
 * and observe where the app starts to degrade.
 *
 * Stages: 0→20 (warm up) → 50 (beyond normal) → 100 (high stress)
 *         → 150 (at or past breaking point) → 0 (recovery)
 *
 * The recovery stage is critical: it shows whether the app self-heals after
 * peak load or stays degraded due to connection pool leaks or thread starvation.
 *
 * What to observe:
 *   - At which VU count does http_req_failed start rising? (pool exhaustion)
 *   - Does p95 climb linearly or does it spike suddenly? (GC pause vs pool limit)
 *   - After ramp-down, does error rate return to 0? (recovery health)
 *   - Does `POST /api/orders` show 409s during peak? (optimistic lock conflicts)
 *
 * Thresholds are lenient — the goal is observation, not SLO enforcement.
 * Run with --out json=k6/reports/stress-results.json to save raw data for analysis.
 */
import { sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { get } from '../helpers/http-client.js';
import { getTokenForVU } from '../helpers/auth.js';
import { browseProducts } from '../journeys/browse-products.js';
import { searchHeavy } from '../journeys/search-heavy.js';
import { checkout } from '../journeys/checkout.js';
import { stressThresholds } from '../config/thresholds.js';

const MAX_VUS = parseInt(__ENV.MAX_VUS) || 150;

export const options = {
  stages: [
    { duration: '2m', target: 20 },                   // warm up to normal load
    { duration: '2m', target: 50 },                   // beyond normal
    { duration: '2m', target: 100 },                  // high stress
    { duration: '2m', target: MAX_VUS },              // breaking point
    { duration: '2m', target: 0 },                    // recovery — does the app heal?
  ],
  thresholds: stressThresholds,
};

let token;

export function setup() {
  const productsRes = get('/api/products?page=0&size=100');
  const categoriesRes = get('/api/categories');
  return {
    productIds: productsRes.json('content').map((p) => p.id),
    categoryIds: categoriesRes.json().map((c) => c.id),
  };
}

export default function (data) {
  if (!token) token = getTokenForVU();
  // Weight: 60% browse, 30% search, 10% checkout
  const roll = Math.random();
  if (roll < 0.6) {
    browseProducts(data);
  } else if (roll < 0.9) {
    searchHeavy(data);
  } else {
    checkout(token, data);
  }
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'k6/reports/stress-summary.md': textSummary(data, { indent: '  ', enableColors: false }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
