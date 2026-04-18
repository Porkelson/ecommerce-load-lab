import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export function get(path, params = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: defaultHeaders,
    ...params,
  });
}

export function post(path, body, params = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: defaultHeaders,
    ...params,
  });
}

export function authGet(path, token, params = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    ...params,
  });
}

export function authPost(path, body, token, params = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    ...params,
  });
}

export function authDelete(path, token, params = {}) {
  return http.del(`${BASE_URL}${path}`, null, {
    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    ...params,
  });
}
