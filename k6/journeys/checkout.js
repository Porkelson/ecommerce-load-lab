import { sleep } from 'k6';
import { authGet, authPost } from '../helpers/http-client.js';
import {
  checkCart,
  checkOrderCreated,
  checkOk,
  checkNoServerErrors,
} from '../helpers/checks.js';

/**
 * Authenticated checkout journey:
 * browse → add 1-2 items to cart → view cart → place order → view order history.
 *
 * This is the most transactionally expensive journey — it hits the OrderService
 * @Transactional path which validates stock, decrements quantities, and clears
 * the cart atomically. Under stress, optimistic locking conflicts on Product rows
 * surface as 409s in k6 metrics.
 *
 * @param {string} token - JWT for the current VU (set in VU init stage)
 * @param {Object} data  - shared data from setup() with product IDs
 */
export function checkout(token, data) {
  // 1. Add 1–2 products to cart
  const itemCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < itemCount; i++) {
    const productId = data.productIds[Math.floor(Math.random() * data.productIds.length)];
    const addRes = authPost(
      '/api/cart/items',
      { productId, quantity: 1 },
      token,
      { tags: { journey: 'checkout', step: 'add-to-cart' } }
    );
    checkCart(addRes);
    sleep(0.3);
  }

  // 2. View cart
  const cartRes = authGet('/api/cart', token, {
    tags: { journey: 'checkout', step: 'view-cart' },
  });
  checkCart(cartRes);

  sleep(0.5);

  // 3. Place order (the critical transactional path)
  const orderRes = authPost('/api/orders', {}, token, {
    tags: { journey: 'checkout', step: 'place-order' },
  });

  // 409 is an acceptable outcome under stress (optimistic lock conflict or empty cart
  // after another VU placed the order) — we check for 201 but don't fail the scenario
  if (orderRes.status === 409) {
    // Order failed due to stock conflict or empty cart — log and continue
    return;
  }
  checkOrderCreated(orderRes);

  sleep(0.3);

  // 4. View order history
  const historyRes = authGet('/api/orders', token, {
    tags: { journey: 'checkout', step: 'order-history' },
  });
  checkOk(historyRes, 'order history');
}
