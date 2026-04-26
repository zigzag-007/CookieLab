import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCookies } from '../js/cookie-parser.js';

test('parses real tab separated DevTools rows and normalizes flags', () => {
  const input = [
    'Name\tValue\tDomain\tPath\tExpires\tSize\tHttpOnly\tSecure\tSameSite',
    'sid\tsecret\t.example.com\t/\tSession\t9\t✓\t✓\tNone',
    'theme\tdark\taccounts.example.com\t/settings\tTue, 01 Sep 2099 00:00:00 GMT\t10\t\t\tLax',
  ].join('\n');

  const result = parseCookies(input);

  assert.equal(result.skipped.length, 0);
  assert.equal(result.cookies.length, 2);
  assert.deepEqual(
    {
      name: result.cookies[0].name,
      domain: result.cookies[0].domain,
      status: result.cookies[0].status,
      domainScoped: result.cookies[0].domainScoped,
      hostOnly: result.cookies[0].hostOnly,
      httpOnly: result.cookies[0].httpOnly,
      secure: result.cookies[0].secure,
      sameSite: result.cookies[0].sameSite,
    },
    {
      name: 'sid',
      domain: '.example.com',
      status: 'session',
      domainScoped: true,
      hostOnly: false,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
  );
  assert.equal(result.cookies[1].hostOnly, true);
  assert.equal(result.cookies[1].status, 'live');
});

test('recognizes the Expires slash Max Age DevTools header', () => {
  const input = [
    'Name\tValue\tDomain\tPath\tExpires / Max Age\tSize\tHttpOnly\tSecure\tSameSite',
    'old\tvalue\texample.com\t/\tThu, 01 Jan 1970 00:00:01 GMT\t8\t\t\tLax',
  ].join('\n');

  const result = parseCookies(input);

  assert.equal(result.cookies[0].status, 'expired');
  assert.equal(result.cookies[0].expirationTimestamp, 1);
});

test('reports malformed rows instead of silently dropping them', () => {
  const input = [
    'Name\tValue\tDomain',
    'valid\tone\texample.com',
    'broken-only-one-column',
    'missing-domain\tvalue\t',
  ].join('\n');

  const result = parseCookies(input);

  assert.equal(result.cookies.length, 1);
  assert.deepEqual(
    result.skipped.map(row => row.reason),
    ['Too few columns', 'Missing domain'],
  );
});

test('keeps missing path and size unknown instead of inventing values', () => {
  const input = [
    'Name\tValue\tDomain',
    'minimal\tvalue\texample.com',
  ].join('\n');

  const result = parseCookies(input);

  assert.equal(result.cookies[0].path, null);
  assert.equal(result.cookies[0].size, null);
});
