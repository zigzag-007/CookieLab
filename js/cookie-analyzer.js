/**
 * cookie-analyzer.js
 * Analysis, status, expiration, scope, grouping, filtering and sorting.
 * No UI dependencies.
 */

/**
 * Build an overview summary from an array of parsed cookies.
 */
export function buildOverview(cookies) {
  const total = cookies.length;
  const live = cookies.filter(c => c.status === 'live').length;
  const session = cookies.filter(c => c.status === 'session').length;
  const expired = cookies.filter(c => c.status === 'expired').length;
  const secureCount = cookies.filter(c => c.secure).length;
  const httpOnlyCount = cookies.filter(c => c.httpOnly).length;
  const domainScoped = cookies.filter(c => c.domainScoped).length;
  const hostOnly = cookies.filter(c => c.hostOnly).length;
  const domains = getUniqueDomains(cookies);

  return {
    total,
    live,
    session,
    expired,
    secureCount,
    httpOnlyCount,
    domainScoped,
    hostOnly,
    domainCount: domains.length,
  };
}

/**
 * Build security observations (not vulnerability claims).
 */
export function buildSecurityObservations(cookies) {
  const observations = [];

  const noSecure = cookies.filter(c => !c.secure);
  if (noSecure.length > 0) {
    observations.push({
      type: 'warn',
      label: 'Missing Secure flag',
      count: noSecure.length,
      detail: `${noSecure.length} cookie(s) do not have the Secure flag set.`,
    });
  }

  const noHttpOnly = cookies.filter(c => !c.httpOnly);
  if (noHttpOnly.length > 0) {
    observations.push({
      type: 'info',
      label: 'Missing HttpOnly flag',
      count: noHttpOnly.length,
      detail: `${noHttpOnly.length} cookie(s) do not have the HttpOnly flag. They are accessible via JavaScript.`,
    });
  }

  const sameSiteNoneInsecure = cookies.filter(c => c.sameSite === 'None' && !c.secure);
  if (sameSiteNoneInsecure.length > 0) {
    observations.push({
      type: 'bad',
      label: 'SameSite=None without Secure',
      count: sameSiteNoneInsecure.length,
      detail: `${sameSiteNoneInsecure.length} cookie(s) use SameSite=None without the Secure flag. Modern browsers may reject these.`,
    });
  }

  const expiredCookies = cookies.filter(c => c.status === 'expired');
  if (expiredCookies.length > 0) {
    observations.push({
      type: 'info',
      label: 'Expired cookies',
      count: expiredCookies.length,
      detail: `${expiredCookies.length} cookie(s) have passed their expiration date.`,
    });
  }

  const sessionCookies = cookies.filter(c => c.status === 'session');
  if (sessionCookies.length > 0) {
    observations.push({
      type: 'info',
      label: 'Session cookies',
      count: sessionCookies.length,
      detail: `${sessionCookies.length} cookie(s) are session-scoped and will be removed when the browser closes.`,
    });
  }

  const domainScopedCookies = cookies.filter(c => c.domainScoped);
  if (domainScopedCookies.length > 0) {
    observations.push({
      type: 'info',
      label: 'Domain-scoped cookies',
      count: domainScopedCookies.length,
      detail: `${domainScopedCookies.length} cookie(s) are domain-scoped and may match the parent domain and subdomains.`,
    });
  }

  const hostOnlyCookies = cookies.filter(c => c.hostOnly);
  if (hostOnlyCookies.length > 0) {
    observations.push({
      type: 'good',
      label: 'Host-only cookies',
      count: hostOnlyCookies.length,
      detail: `${hostOnlyCookies.length} cookie(s) are host-only and restricted to the exact domain.`,
    });
  }

  return observations;
}

/**
 * Get unique domains from cookies.
 */
export function getUniqueDomains(cookies) {
  const set = new Set(cookies.map(c => c.domain));
  return Array.from(set).sort();
}

/**
 * Group cookies by domain.
 */
export function groupByDomain(cookies) {
  const groups = {};
  for (const c of cookies) {
    if (!groups[c.domain]) {
      groups[c.domain] = [];
    }
    groups[c.domain].push(c);
  }
  return groups;
}

/**
 * Build a domain summary: for each domain, count cookies, statuses, flags.
 */
export function buildDomainSummary(cookies) {
  const grouped = groupByDomain(cookies);
  const summaries = [];

  for (const [domain, domainCookies] of Object.entries(grouped)) {
    summaries.push({
      domain,
      total: domainCookies.length,
      live: domainCookies.filter(c => c.status === 'live').length,
      session: domainCookies.filter(c => c.status === 'session').length,
      expired: domainCookies.filter(c => c.status === 'expired').length,
      secure: domainCookies.filter(c => c.secure).length,
      httpOnly: domainCookies.filter(c => c.httpOnly).length,
      domainScoped: domainCookies.some(c => c.domainScoped),
    });
  }

  return summaries.sort((a, b) => b.total - a.total);
}

/**
 * Filter cookies based on criteria.
 */
export function filterCookies(cookies, filters) {
  let result = cookies;

  if (filters.search) {
    const term = filters.search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.domain.toLowerCase().includes(term)
    );
  }

  if (filters.status && filters.status !== 'all') {
    result = result.filter(c => c.status === filters.status);
  }

  if (filters.domain && filters.domain !== 'all') {
    result = result.filter(c => c.domain === filters.domain);
  }

  if (filters.exportState === 'selected') {
    result = result.filter(c => c.selected);
  } else if (filters.exportState === 'unselected') {
    result = result.filter(c => !c.selected);
  }

  return result;
}

/**
 * Sort cookies by a given field.
 */
export function sortCookies(cookies, sortField, sortDirection) {
  const dir = sortDirection === 'asc' ? 1 : -1;

  return [...cookies].sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];

    // Handle null/undefined
    if (va === null || va === undefined) va = sortField === 'remainingLifetime' ? Infinity : '';
    if (vb === null || vb === undefined) vb = sortField === 'remainingLifetime' ? Infinity : '';

    // Status sorting: live > session > expired for readability
    if (sortField === 'status') {
      const order = { live: 0, session: 1, expired: 2 };
      va = order[va] !== undefined ? order[va] : 3;
      vb = order[vb] !== undefined ? order[vb] : 3;
    }

    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * dir;
    }

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir;
    }

    return String(va).localeCompare(String(vb)) * dir;
  });
}

/**
 * Format remaining lifetime in a human-readable way.
 */
export function formatLifetime(seconds) {
  if (seconds === null || seconds === undefined) return '';
  if (seconds <= 0) return 'Expired';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 365) {
    const years = Math.floor(days / 365);
    const remDays = days % 365;
    return years + 'y ' + remDays + 'd';
  }
  if (days > 0) return days + 'd ' + hours + 'h';
  if (hours > 0) return hours + 'h ' + minutes + 'm';
  return minutes + 'm';
}

/**
 * Format a Unix timestamp as a readable date string.
 */
export function formatDate(timestamp) {
  if (timestamp === null || timestamp === undefined) return 'Session';
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a security score string for a cookie.
 * Returns an object with level and flags.
 */
export function getSecurityProfile(cookie) {
  const flags = [];
  let level = 'good';

  if (cookie.secure) flags.push('S');
  if (cookie.httpOnly) flags.push('H');

  if (!cookie.secure) level = 'warn';
  if (!cookie.httpOnly && !cookie.secure) level = 'bad';
  if (cookie.sameSite === 'None' && !cookie.secure) level = 'bad';

  return {
    level,
    flags: flags.length > 0 ? flags.join('+') : 'None',
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
  };
}

/**
 * Describe the scope of a cookie in readable text.
 */
export function describeScopeShort(cookie) {
  if (cookie.domainScoped) return 'Domain';
  return 'Host';
}

export function describeScopeLong(cookie) {
  const pathDescription = cookie.path
    ? 'Path: ' + cookie.path
    : 'Path not provided.';

  if (cookie.domainScoped) {
    return 'Domain-scoped (' + cookie.domain + '). This cookie\'s matching scope includes the parent domain and matching subdomains, subject to normal browser cookie rules. ' + pathDescription;
  }
  return 'Host-only (' + cookie.domain + '). Restricted to the exact domain. ' + pathDescription;
}
