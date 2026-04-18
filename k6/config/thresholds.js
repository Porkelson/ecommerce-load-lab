/**
 * Thresholds are tuned for a Spring Boot app running locally on a modern laptop.
 * Production APIs should target p95 < 500ms — these are lenient because
 * JSONPlaceholder-style public APIs and local dev machines have no SLA.
 *
 * Each export is spread into the `thresholds` option of the scenario that uses it.
 */

export const smokeThresholds = {
  // Smoke = 1 VU. Any failure means the system is broken, not just slow.
  http_req_failed: [{ threshold: 'rate==0', abortOnFail: true }],
  http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: true }],
};

export const loadThresholds = {
  // 30 VUs sustained. Spring Boot + H2/Postgres should handle this comfortably.
  http_req_failed: [{ threshold: 'rate<0.01' }],
  http_req_duration: [
    { threshold: 'p(50)<300' },
    { threshold: 'p(95)<1000' },
    { threshold: 'p(99)<2000' },
  ],
  // Checkout journey is slower (transaction + multiple DB writes)
  'http_req_duration{journey:checkout}': [{ threshold: 'p(95)<1500' }],
};

export const stressThresholds = {
  // Ramp to 150 VUs. We expect degradation — thresholds are intentionally lenient.
  // The goal is to observe where the app breaks, not to enforce SLOs.
  http_req_failed: [{ threshold: 'rate<0.05' }],
  http_req_duration: [{ threshold: 'p(95)<3000', abortOnFail: false }],
};

export const spikeThresholds = {
  // Flash-sale pattern. p99 matters more than p95 here (worst-case outliers).
  http_req_failed: [{ threshold: 'rate<0.10' }],
  http_req_duration: [{ threshold: 'p(99)<5000' }],
};
