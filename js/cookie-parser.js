/**
 * cookie-parser.js
 * Parses tab-separated cookie rows from browser DevTools clipboard.
 * Pure parsing logic, no UI dependencies.
 */

// Default column order from Chrome DevTools Application > Cookies
const DEFAULT_COLUMNS = [
  'name', 'value', 'domain', 'path', 'expires',
  'size', 'httpOnly', 'secure', 'sameSite', 'partitionKey',
  'priority', 'sameParty',
];

/**
 * Parse a raw tab-separated cookie dump into an array of cookie objects.
 * Returns { cookies: [], skipped: [], columnOrder: [] }.
 */
export function parseCookies(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { cookies: [], skipped: [], columnOrder: [] };
  }

  const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { cookies: [], skipped: [], columnOrder: [] };
  }

  // Detect if the first line is a header row
  const firstFields = lines[0].split('\t');
  const looksLikeHeader = firstFields.some(f => {
    const low = f.trim().toLowerCase();
    return ['name', 'domain', 'path', 'expires', 'value', 'size'].includes(low);
  });

  let columnOrder;
  let dataStart;

  if (looksLikeHeader) {
    columnOrder = firstFields.map(f => normalizeColumnName(f.trim()));
    dataStart = 1;
  } else {
    columnOrder = DEFAULT_COLUMNS;
    dataStart = 0;
  }

  const cookies = [];
  const skipped = [];

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split('\t');

    // Need at least name, value, domain (3 fields minimum)
    if (fields.length < 3) {
      skipped.push({ lineNumber: i + 1, content: line, reason: 'Too few columns' });
      continue;
    }

    const obj = {};
    for (let c = 0; c < columnOrder.length && c < fields.length; c++) {
      const col = columnOrder[c];
      if (col) {
        obj[col] = fields[c];
      }
    }

    // Validate required fields
    if (!obj.name || obj.name.trim() === '') {
      skipped.push({ lineNumber: i + 1, content: line, reason: 'Missing cookie name' });
      continue;
    }

    if (!obj.domain || obj.domain.trim() === '') {
      skipped.push({ lineNumber: i + 1, content: line, reason: 'Missing domain' });
      continue;
    }

    cookies.push(normalizeCookie(obj));
  }

  return { cookies, skipped, columnOrder };
}

/**
 * Normalize a column header string into a known field name.
 */
function normalizeColumnName(raw) {
  const low = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const map = {
    name: 'name',
    value: 'value',
    domain: 'domain',
    path: 'path',
    expires: 'expires',
    expiresmax: 'expires',
    expiresmaxage: 'expires',
    expirationdate: 'expires',
    maxage: 'expires',
    size: 'size',
    httponly: 'httpOnly',
    secure: 'secure',
    samesite: 'sameSite',
    partitionkey: 'partitionKey',
    priority: 'priority',
    sameparty: 'sameParty',
  };
  return map[low] || raw;
}

/**
 * Build a normalized cookie object from raw parsed fields.
 */
function normalizeCookie(raw) {
  const name = (raw.name || '').trim();
  const value = (raw.value || '');
  const domain = (raw.domain || '').trim();
  const path = raw.path !== undefined && raw.path.trim() !== ''
    ? raw.path.trim()
    : null;
  const expiresRaw = (raw.expires || '').trim();
  const sizeRaw = (raw.size || '').trim();
  const sameSite = normalizeSameSite((raw.sameSite || '').trim());

  // Boolean fields: Chrome shows checkmark or empty
  const httpOnly = parseBoolean(raw.httpOnly);
  const secure = parseBoolean(raw.secure);

  // Domain analysis
  const hostOnly = !domain.startsWith('.');
  const domainScoped = domain.startsWith('.');

  // Expiration parsing
  const { expirationTimestamp, status, isSession } = parseExpiration(expiresRaw);

  // Remaining and original lifetime
  const now = Date.now() / 1000;
  let remainingLifetime = null;
  let originalLifetime = null;

  if (!isSession && expirationTimestamp !== null) {
    remainingLifetime = Math.max(0, expirationTimestamp - now);
    // We cannot determine original lifetime from expiration alone,
    // but we store it for display purposes
    originalLifetime = null;
  }

  // Size
  const parsedSize = Number.parseInt(sizeRaw, 10);
  const size = Number.isNaN(parsedSize) ? null : parsedSize;

  return {
    name,
    value,
    domain,
    path,
    expires: expiresRaw,
    expirationTimestamp,
    size,
    httpOnly,
    secure,
    sameSite,
    status,
    hostOnly,
    domainScoped,
    remainingLifetime,
    originalLifetime,
    selected: true,
  };
}

/**
 * Parse the expires field into a Unix timestamp and status.
 */
function parseExpiration(expiresRaw) {
  if (!expiresRaw || expiresRaw.toLowerCase() === 'session') {
    return { expirationTimestamp: null, status: 'session', isSession: true };
  }

  // Try ISO or date string
  let timestamp;
  const parsed = Date.parse(expiresRaw);
  if (!isNaN(parsed)) {
    timestamp = parsed / 1000;
  } else {
    // Try as a plain number (Unix timestamp, possibly in seconds or ms)
    const num = Number(expiresRaw);
    if (!isNaN(num) && num > 0) {
      // If it looks like milliseconds (> year 2100 in seconds), convert
      timestamp = num > 1e12 ? num / 1000 : num;
    } else {
      return { expirationTimestamp: null, status: 'session', isSession: true };
    }
  }

  const now = Date.now() / 1000;
  const status = timestamp < now ? 'expired' : 'live';
  return { expirationTimestamp: timestamp, status, isSession: false };
}

/**
 * Parse a boolean field from DevTools clipboard.
 * Chrome uses a checkmark character or the text in the cell.
 */
function parseBoolean(val) {
  if (val === undefined || val === null) return false;
  const trimmed = val.toString().trim().toLowerCase();
  if (trimmed === '' || trimmed === 'false' || trimmed === '0' || trimmed === 'no') return false;
  // Checkmark, "true", any other truthy string
  return true;
}

/**
 * Normalize the SameSite value.
 */
function normalizeSameSite(raw) {
  const low = raw.toLowerCase();
  if (low === 'strict') return 'Strict';
  if (low === 'lax') return 'Lax';
  if (low === 'none') return 'None';
  if (low === '' || low === 'unspecified') return 'Unspecified';
  return raw;
}
