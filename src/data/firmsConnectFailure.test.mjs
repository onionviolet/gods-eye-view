import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConnectFailure } from '../../vite.config.js';

// ---------------------------------------------------------------------------
// isConnectFailure — which FIRMS failures earn an explicit IPv4 retry (#68)
// ---------------------------------------------------------------------------

test('the Happy Eyeballs signature is retried: bare `fetch failed`, cause underneath', () => {
  const cause = Object.assign(new Error('connect ENETUNREACH 2001:db8::1:443'), { code: 'ENETUNREACH' });
  assert.equal(isConnectFailure(Object.assign(new TypeError('fetch failed'), { cause })), true);
  // …and with no cause attached at all, which is how it often surfaces.
  assert.equal(isConnectFailure(new TypeError('fetch failed')), true);
});

test('an AggregateError from the A/AAAA race is unwrapped, not missed', () => {
  // Happy Eyeballs reports both attempts together; the code lives on the inner
  // errors, so a check that only reads err.code sees nothing and never retries.
  const agg = new TypeError('fetch failed');
  agg.cause = Object.assign(new Error('all attempts failed'), {
    errors: [{ code: 'ENETUNREACH' }, { code: 'ECONNREFUSED' }],
  });
  assert.equal(isConnectFailure(agg), true);
});

test('the caller\'s own timeout is never retried', () => {
  // AbortSignal.timeout fired: the budget is already spent, and a second
  // attempt would spend it again and report the worse of the two failures.
  assert.equal(isConnectFailure(Object.assign(new Error('aborted'), { name: 'AbortError' })), false);
  assert.equal(isConnectFailure(Object.assign(new Error('timed out'), { name: 'TimeoutError' })), false);
});

test('failures that are not connect-level are surfaced as-is', () => {
  assert.equal(isConnectFailure(new Error('non-CSV upstream response')), false);
  assert.equal(isConnectFailure(new Error('HTTP 401')), false);
  assert.equal(isConnectFailure(null), false);
  assert.equal(isConnectFailure(undefined), false);
});

test('a cause chain is walked, but not followed forever', () => {
  const deep = Object.assign(new Error('inner'), { code: 'ETIMEDOUT' });
  assert.equal(isConnectFailure(Object.assign(new Error('a'), { cause: Object.assign(new Error('b'), { cause: deep }) })), true);

  // A self-referential chain must terminate rather than hang the dev server.
  const loop = new Error('loop');
  loop.cause = loop;
  assert.doesNotThrow(() => isConnectFailure(loop));
  assert.equal(isConnectFailure(loop), false);
});
