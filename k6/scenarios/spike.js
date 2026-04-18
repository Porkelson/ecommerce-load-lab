/**
 * Spike Test — Flash Sale Simulation
 *
 * Purpose: simulate a sudden burst of traffic (e.g. a flash sale announcement)
 * hitting the product browse and cart endpoints simultaneously.
 *
 * Uses ramping-arrival-rate executor instead of ramping-vus because:
 *   - Arrival rate models real traffic (users don't slow down when the server does)
 *   - VU count is a consequence of arrival rate × response time, not an input
 *   - This is the correct model for "100 users click at the same second"
 *
 * Pattern: 1 rps baseline → spike to 100 rps in 5s → hold → drop → confirm recovery
 *
 * What to observe:
 *   - Does the app handle 100 rps? (queue depth, connection pool)
 *   - How quickly does p99 recover after the spike drops? (connection pool drain)
 *   - What error rate does the spike produce? (target: < 10%)
 *   - Are cart write errors higher than browse errors? (write path vs read path)
 *
 * Run with: k6 run k6/scenarios/spike.js
 * Override arrival rate: TARGET_RPS=200 k6 run k6/scenarios/spike.js
 */
import { sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { get } from '../helpers/http-client.js';
import { getTokenForVU } from '../helpers/auth.js';
import { browseProducts } from '../journeys/browse-products.js';
import { checkout } from '../journeys/checkout.js';
import { spikeThresholds } from '../config/thresholds.js';

const TARGET_RPS = parseInt(__ENV.TARGET_RPS) || 100;

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '10s', target: 1 },           // baseline — confirm system is healthy
        { duration: '5s',  target: TARGET_RPS },  // spike — sudden flash sale burst
        { duration: '1m',  target: TARGET_RPS },  // hold spike — sustained peak
        { duration: '10s', target: 1 },           // drop — traffic returns to normal
        { duration: '30s', target: 1 },           // recovery window — watch for healing
      ],
    },
  },
  thresholds: spikeThresholds,
};

// Per-VU auth token
const token = (() => getTokenForVU())();

export function setup() {
  const productsRes = get('/api/products?page=0&size=100');
  const categoriesRes = get('/api/categories');
  return {
    productIds: productsRes.json('content').map((p) => p.id),
    categoryIds: categoriesRes.json().map((c) => c.id),
  };
}

export default function (data) {
  // Flash sale pattern: 80% browse (people checking what's on sale)
  // 20% add to cart (people actually buying)
  if (Math.random() < 0.8) {
    browseProducts(data);
  } else {
    checkout(token, data);
  }
}

export function handleSummary(data) {
  return {
    'k6/reports/spike-summary.md': textSummary(data, { indent: '  ', enableColors: false }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
