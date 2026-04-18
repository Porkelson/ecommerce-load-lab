import { check } from 'k6';

export function checkOk(res, label = '') {
  return check(res, {
    [`${label} status 200`]: (r) => r.status === 200,
  });
}

export function checkCreated(res, label = '') {
  return check(res, {
    [`${label} status 201`]: (r) => r.status === 201,
  });
}

export function checkNoContent(res, label = '') {
  return check(res, {
    [`${label} status 204`]: (r) => r.status === 204,
  });
}

export function checkAuth(res) {
  return check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
    'login has username': (r) => r.json('username') !== undefined,
  });
}

export function checkRegister(res) {
  return check(res, {
    'register status 201': (r) => r.status === 201,
    'register has token': (r) => r.json('token') !== undefined,
  });
}

export function checkProductList(res) {
  return check(res, {
    'product list status 200': (r) => r.status === 200,
    'product list has content': (r) => Array.isArray(r.json('content')),
    'product list has totalElements': (r) => r.json('totalElements') >= 0,
  });
}

export function checkProduct(res) {
  return check(res, {
    'product status 200': (r) => r.status === 200,
    'product has id': (r) => r.json('id') !== undefined,
    'product has price': (r) => r.json('price') !== undefined,
  });
}

export function checkCategories(res) {
  return check(res, {
    'categories status 200': (r) => r.status === 200,
    'categories is array': (r) => Array.isArray(r.json()),
    'categories not empty': (r) => r.json().length > 0,
  });
}

export function checkCart(res) {
  return check(res, {
    'cart status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'cart has items': (r) => Array.isArray(r.json('items')),
    'cart has total': (r) => r.json('total') !== undefined,
  });
}

export function checkOrderCreated(res) {
  return check(res, {
    'order status 201': (r) => r.status === 201,
    'order has id': (r) => r.json('id') !== undefined,
    'order has status CONFIRMED': (r) => r.json('status') === 'CONFIRMED',
  });
}

export function checkNoServerErrors(res, label = '') {
  return check(res, {
    [`${label} no server error`]: (r) => r.status < 500,
  });
}
