import { sleep } from 'k6';
import { get } from '../helpers/http-client.js';
import {
  checkProductList,
  checkProduct,
  checkCategories,
  checkNoServerErrors,
} from '../helpers/checks.js';

const SEARCH_TERMS = [
  'laptop', 'book', 'shirt', 'running', 'coffee',
  'wireless', 'garden', 'puzzle', 'jacket', 'blender',
];

/**
 * Anonymous browsing journey: list → search → product detail → categories.
 *
 * Randomised search terms and product IDs prevent HTTP-level caching from
 * masking real database query performance under concurrent load.
 *
 * @param {Object} data - shared data from setup() containing seeded product IDs
 */
export function browseProducts(data) {
  // 1. Browse first page of products
  const listRes = get('/api/products?page=0&size=20');
  checkProductList(listRes);

  sleep(0.5);

  // 2. Search with a random term
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const searchRes = get(`/api/products?search=${term}&page=0&size=20`);
  checkProductList(searchRes);

  sleep(0.3);

  // 3. Get a random product detail
  const productId = data.productIds[Math.floor(Math.random() * data.productIds.length)];
  const productRes = get(`/api/products/${productId}`, {
    tags: { endpoint: 'product-detail' },
  });
  checkProduct(productRes);

  sleep(0.3);

  // 4. Load categories (cached on server — tests cache hit rate under load)
  const catRes = get('/api/categories');
  checkCategories(catRes);

  sleep(0.5);
}

/**
 * Category-filtered browse: picks a random categoryId and pages through results.
 *
 * @param {Object} data - shared data from setup()
 */
export function browseByCategoryAndPage(data) {
  const categoryId = data.categoryIds[Math.floor(Math.random() * data.categoryIds.length)];
  const page = Math.floor(Math.random() * 3); // pages 0-2

  const res = get(`/api/products?categoryId=${categoryId}&page=${page}&size=20`, {
    tags: { endpoint: 'category-filter' },
  });
  checkNoServerErrors(res, 'category filter');

  sleep(0.4);
}
