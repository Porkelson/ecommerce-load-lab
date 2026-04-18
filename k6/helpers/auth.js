import http from 'k6/http';
import { BASE_URL } from './http-client.js';
import users from '../data/users.json';

/**
 * Acquires a JWT for the VU assigned to this virtual user.
 *
 * Called as an IIFE at module level in load/stress/spike scenarios —
 * runs once during the VU init stage, so login cost is NOT counted
 * in scenario metrics and the token is reused across all iterations.
 *
 * VU-to-user mapping: __VU % users.length
 * - VUs 1-20 each own a unique pre-seeded user (cart isolation guaranteed)
 * - VUs 21+ share users in round-robin (acceptable for browse-only scenarios)
 */
export function getTokenForVU() {
  const user = users[(__VU - 1) % users.length];
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
