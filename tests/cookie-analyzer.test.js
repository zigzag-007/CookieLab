import test from 'node:test';
import assert from 'node:assert/strict';
import { getCarouselPage } from '../js/app.js';

import {
  buildOverview,
  buildSecurityObservations,
  describeScopeLong,
  filterCookies,
  sortCookies,
} from '../js/cookie-analyzer.js';

const cookies = [
  {
    name: 'zeta',
    domain: '.example.com',
    status: 'live',
    expirationTimestamp: 4102444800,
    remainingLifetime: 100,
    originalLifetime: null,
    size: 20,
    secure: true,
    httpOnly: true,
    sameSite: 'None',
    domainScoped: true,
    hostOnly: false,
    selected: true,
  },
  {
    name: 'alpha',
    domain: 'accounts.example.com',
    status: 'session',
    expirationTimestamp: null,
    remainingLifetime: null,
    originalLifetime: null,
    size: 10,
    secure: false,
    httpOnly: false,
    sameSite: 'Lax',
    domainScoped: false,
    hostOnly: true,
    selected: false,
  },
  {
    name: 'beta',
    domain: 'example.com',
    status: 'expired',
    expirationTimestamp: 1,
    remainingLifetime: 0,
    originalLifetime: null,
    size: 5,
    secure: false,
    httpOnly: false,
    sameSite: 'None',
    domainScoped: false,
    hostOnly: true,
    selected: true,
  },
];

test('builds overview counts across statuses and scopes', () => {
  assert.deepEqual(buildOverview(cookies), {
    total: 3,
    live: 1,
    session: 1,
    expired: 1,
    secureCount: 1,
    httpOnlyCount: 1,
    domainScoped: 1,
    hostOnly: 2,
    domainCount: 3,
  });
});

test('filters by name or domain, status, domain, and export state', () => {
  assert.deepEqual(
    filterCookies(cookies, {
      search: 'accounts',
      status: 'session',
      domain: 'accounts.example.com',
      exportState: 'unselected',
    }).map(cookie => cookie.name),
    ['alpha'],
  );
});

test('sorts status in readable live session expired order', () => {
  assert.deepEqual(
    sortCookies(cookies, 'status', 'asc').map(cookie => cookie.status),
    ['live', 'session', 'expired'],
  );
  assert.deepEqual(
    sortCookies(cookies, 'name', 'desc').map(cookie => cookie.name),
    ['zeta', 'beta', 'alpha'],
  );
});

test('reports SameSite None without Secure as an observation', () => {
  const observations = buildSecurityObservations(cookies);
  const finding = observations.find(item => item.label === 'SameSite=None without Secure');

  assert.equal(finding.count, 1);
  assert.equal(finding.type, 'bad');
});

test('describes a missing path without inventing one', () => {
  assert.equal(
    describeScopeLong({
      domain: 'example.com',
      domainScoped: false,
      path: null,
    }),
    'Host-only (example.com). Restricted to the exact domain. Path not provided.',
  );
});

test('pages result tiles in pairs and singles without losing the last item', () => {
  assert.deepEqual(getCarouselPage(5, 2, 0), { page: 0, totalPages: 3, start: 0, end: 2 });
  assert.deepEqual(getCarouselPage(5, 2, 2), { page: 2, totalPages: 3, start: 4, end: 5 });
  assert.deepEqual(getCarouselPage(5, 1, 4), { page: 4, totalPages: 5, start: 4, end: 5 });
  assert.deepEqual(getCarouselPage(2, 2, 0), { page: 0, totalPages: 1, start: 0, end: 2 });
});

test('clamps carousel pages when data or screen size changes', () => {
  assert.deepEqual(getCarouselPage(3, 2, 9), { page: 1, totalPages: 2, start: 2, end: 3 });
  assert.deepEqual(getCarouselPage(3, 1, -1), { page: 0, totalPages: 3, start: 0, end: 1 });
  assert.deepEqual(getCarouselPage(0, 2, 4), { page: 0, totalPages: 1, start: 0, end: 0 });
});
