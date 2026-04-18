import { sleep } from 'k6';
import { get } from '../helpers/http-client.js';
import { checkProductList, checkNoServerErrors } from '../helpers/checks.js';

const SEARCH_TERMS = [
  'laptop', 'wireless', 'running shoes', 'cookbook', 'blender',
  'jacket', 'puzzle', 'coffee maker', 'textbook', 'toy',
  'monitor', 'keyboard', 'yoga', 'tent', 'garden',
];

const PAGE_SIZES = [10, 20, 50];

/**
 * Search-heavy journey: 8 consecutive searches with varied terms, page sizes,
 * and optional category filters.
 *
 * Designed to expose LIKE query degradation under concurrent load. Because
 * %keyword% LIKE queries can't use leading-wildcard indexes, response time grows
 * non-linearly as VU count increases — this journey makes that visible.
 *
 * Under 50+ VUs, watch p95 on search requests climb compared to the product-list
 * baseline. That delta is the cost of the full-table scan.
 *
 * @param {Object} data - shared data from setup() with categoryIds
 */
export function searchHeavy(data) {
  const iterations = 8;

  for (let i = 0; i < iterations; i++) {
    const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
    const size = PAGE_SIZES[Math.floor(Math.random() * PAGE_SIZES.length)];

    let path = `/api/products?search=${encodeURIComponent(term)}&page=0&size=${size}`;

    // Every other iteration, also filter by category
    if (i % 2 === 0 && data.categoryIds.length > 0) {
      const catId = data.categoryIds[Math.floor(Math.random() * data.categoryIds.length)];
      path += `&categoryId=${catId}`;
    }

    const res = get(path, { tags: { endpoint: 'search', journey: 'search-heavy' } });
    checkNoServerErrors(res, 'search');
    checkProductList(res);

    sleep(0.2);
  }
}
