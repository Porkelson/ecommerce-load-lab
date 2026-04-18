import http from 'k6/http';
import { BASE_URL } from './http-client.js';

// open() is the idiomatic k6 way to load data files — must be at init scope
const users = JSON.parse(open('../data/users.json'));

/**
 * Acquires a JWT for the VU assigned to this virtual user.
 * Call lazily on first iteration: if (!token) token = getTokenForVU()
 *
 * VU-to-user mapping: ((__VU - 1) % users.length + users.length) % users.length
 * - VUs 1-20 each own a unique pre-seeded user (cart isolation guaranteed)
 * - VUs 21+ share users in round-robin (acceptable for browse-only scenarios)
 */
export function getTokenForVU() {
  const index = ((__VU - 1) % users.length + users.length) % users.length;
  const user = users[index];
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    throw new Error(`VU ${__VU} failed to authenticate: ${res.status} ${res.body}`);
  }

  return res.json('token');
}

/**
 * Registers a brand-new user and returns their token.
 * Used in smoke test to verify the full registration → login flow.
 */
export function registerAndGetToken(suffix) {
  const email = `smoketest_${suffix}_${Date.now()}@test.com`;
  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      username: `smokeuser_${suffix}`,
      email,
      password: 'SmokeTest1!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.status} ${res.body}`);
  }

  return res.json('token');
}
