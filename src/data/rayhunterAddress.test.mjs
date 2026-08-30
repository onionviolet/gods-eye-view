import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLanDeviceAddress } from '../../vite.config.js';

// ---------------------------------------------------------------------------
// isLanDeviceAddress — the Rayhunter proxy's SSRF allowlist (#56)
// ---------------------------------------------------------------------------

test('ordinary LAN addresses are allowed — this is where a Rayhunter lives', () => {
  for (const ip of ['192.168.1.1', '192.168.0.100', '10.0.0.5', '172.16.0.1', '172.31.255.254', '127.0.0.1']) {
    assert.equal(isLanDeviceAddress(ip), true, ip);
  }
  assert.equal(isLanDeviceAddress('100.64.0.1'), true, 'CGNAT — Tailscale and similar');
});

test('the cloud metadata address is refused in every spelling', () => {
  // The shipped guard compared against the literal string '169.254.169.254'.
  // These are all the same address and all satisfied its host:port pattern.
  assert.equal(isLanDeviceAddress('169.254.169.254'), false);
  assert.equal(isLanDeviceAddress('2852039166'), false, 'decimal form');
  assert.equal(isLanDeviceAddress('0251.0376.0251.0376'), false, 'octal form');
  assert.equal(isLanDeviceAddress('0xA9.0xFE.0xA9.0xFE'), false, 'hex form');
  // …and the whole link-local block with it, so nothing near it needs a case.
  assert.equal(isLanDeviceAddress('169.254.1.1'), false);
});

test('public addresses are refused — the proxy is not a general fetcher', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '192.169.0.1']) {
    assert.equal(isLanDeviceAddress(ip), false, ip);
  }
});

test('IPv6 allows loopback and unique-local, refuses link-local and global', () => {
  assert.equal(isLanDeviceAddress('::1'), true);
  assert.equal(isLanDeviceAddress('fd00::1'), true);
  assert.equal(isLanDeviceAddress('fc00::1'), true);
  assert.equal(isLanDeviceAddress('[fd12:3456::1]'), true, 'brackets are stripped');
  assert.equal(isLanDeviceAddress('fe80::1'), false, 'link-local');
  assert.equal(isLanDeviceAddress('2606:4700::1111'), false, 'global');
});

test('malformed input is refused rather than coerced', () => {
  for (const value of ['', '   ', null, undefined, '999.1.1.1', '192.168.1', '192.168.1.1.1', 'metadata.google.internal', 'localhost']) {
    assert.equal(isLanDeviceAddress(value), false, String(value));
  }
});
