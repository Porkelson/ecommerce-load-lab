/**
 * Smoke Test
 *
 * Purpose: prove every critical API path is alive and returns correct responses.
 * Run this before every deployment and as the CI gate.
 *
 * 1 VU, 1 iteration. Aborts immediately on any failure.
 * Covers: register → login → browse → search → product detail → categories
 *         → add to cart → place order → order history
 */
import { group } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { get, post, authGet, authPost } from '../helpers/http-client.js';
import { registerAndGetToken } from '../helpers/auth.js';
import {
  checkAuth,
  checkProductList,
  checkProduct,
  checkCategories,
  checkCart,
  checkOrderCreated,
  checkOk,
} from '../helpers/checks.js';
import { smokeThresholds } from '../config/thresholds.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: smokeThresholds,
};

export function setup() {
  // Fetch IDs once — passed to default() as shared data
  const productsRes = get('/api/products?page=0&size=50');
  const categoriesRes = get('/api/categories');
  return {
    productIds: productsRes.json('content').map((p) => p.id),
    categoryIds: categoriesRes.json().map((c) => c.id),
  };
}

export default function (data) {
  // Register a brand-new user to verify the registration flow end-to-end
  let registeredToken;
  group('auth - register', () => {
    registeredToken = registerAndGetToken('smoke');
  });

  // Login with a pre-seeded test user (stable credentials, predictable cart state)
  let token;
  group('auth - login', () => {
    const res = post('/api/auth/login', {
      email: 'testuser01@test.com',
      password: 'Password1!',
    });
    checkAuth(res);
    token = res.json('token');
  });

  group('products - list and search', () => {
    const listRes = get('/api/products?page=0&size=20');
    checkProductList(listRes);

    const searchRes = get('/api/products?search=laptop&page=0&size=10');
    checkProductList(searchRes);
  });

  group('products - detail', () => {
    const productId = data.productIds[0];
    const res = get(`/api/products/${productId}`);
    checkProduct(res);
  });

  group('categories', () => {
    const res = get('/api/categories');
    checkCategories(res);
  });

  group('cart', () => {
    const addRes = authPost('/api/cart/items',
      { productId: data.productIds[1], quantity: 1 },
      token
    );
    checkCart(addRes);

    const cartRes = authGet('/api/cart', token);
    checkCart(cartRes);
  });

  group('order', () => {
    const orderRes = authPost('/api/orders', {}, token);
    checkOrderCreated(orderRes);

    const historyRes = authGet('/api/orders', token);
    checkOk(historyRes, 'order history');
  });
}

export function handleSummary(data) {
  return {
    'k6/reports/smoke-summary.md': textSummary(data, { indent: '  ', enableColors: false }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
