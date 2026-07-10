/**
 * app.js
 * UI state, event handling, and rendering for Cookie Lab.
 * Depends on cookie-parser, cookie-analyzer, cookie-exporter, theme-toggle,
 * cursor-glow, and kinetic-grid modules.
 */

import { parseCookies } from './cookie-parser.js';
import {
  buildOverview,
  buildSecurityObservations,
  buildDomainSummary,
  getUniqueDomains,
  filterCookies,
  sortCookies,
  formatLifetime,
  formatDate,
  getSecurityProfile,
  describeScopeShort,
  describeScopeLong,
} from './cookie-analyzer.js';
import {
  buildExportPayload,
  downloadTextFile,
  filterCookiesForExport,
} from './cookie-exporter.js';
import { initTheme, toggleTheme } from './theme-toggle.js';
import { initCursorGlow } from './cursor-glow.js';
import { initKineticGrid } from './kinetic-grid.js';

/* -------------------------------------------------------
   State
------------------------------------------------------- */

let allCookies = [];
let skippedRows = [];
let filters = { search: '', status: 'all', domain: 'all', exportState: 'all' };
let sortField = 'name';
let sortDirection = 'asc';
let expandedRows = new Set();
let exportOptions = { includeExpired: false, includeSession: true };
let analysisTimer = null;
const pagedSections = {
  domain: { items: [], page: 0, renderItem: renderDomainTile },
  observations: { items: [], page: 0, renderItem: renderObservationTile },
};

/* -------------------------------------------------------
   DOM cache
------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

/* -------------------------------------------------------
   Init
------------------------------------------------------- */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initCursorGlow();
    initKineticGrid();
    bindEvents();
    updateThemeIcon();
    showPasteView();
  });
}

/* -------------------------------------------------------
   Event binding
------------------------------------------------------- */

function bindEvents() {
  // Theme toggle
  $('theme-toggle')?.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });

  // Paste and analyze
  $('analyze-btn')?.addEventListener('click', handleAnalyze);
  $('clear-btn')?.addEventListener('click', handleClear);
  $('paste-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAnalyze();
    }
  });

  // Filters
  $('search-input')?.addEventListener('input', (e) => {
    filters.search = e.target.value;
    renderCookieTable();
  });
  $('status-filter')?.addEventListener('change', (e) => {
    filters.status = e.target.value;
    renderCookieTable();
  });
  $('domain-filter')?.addEventListener('change', (e) => {
    filters.domain = e.target.value;
    renderCookieTable();
  });
  $('export-state-filter')?.addEventListener('change', (e) => {
    filters.exportState = e.target.value;
    renderCookieTable();
  });

  // Select/unselect visible
  $('select-visible-btn')?.addEventListener('click', () => toggleVisibleSelection(true));
  $('unselect-visible-btn')?.addEventListener('click', () => toggleVisibleSelection(false));

  // Export
  $('download-dropdown-btn')?.addEventListener('click', () => handleDownload($('download-format-select').value, 'download-dropdown-btn', 'export-feedback'));
  $('copy-dropdown-btn')?.addEventListener('click', () => handleCopyExport($('copy-format-select').value, 'copy-dropdown-btn', 'export-feedback'));
  for (const id of ['download-format-select', 'copy-format-select']) {
    $(id)?.addEventListener('change', () => {
      syncDropdownActionLabels();
      clearExportFeedback();
    });
  }
  syncDropdownActionLabels();

  // Export options
  for (const [id, option] of [
    ['include-expired', 'includeExpired'],
    ['include-session', 'includeSession'],
  ]) {
    $(id)?.addEventListener('change', (e) => {
      exportOptions[option] = e.target.checked;
      clearExportFeedback();
    });
  }

  // New analysis
  $('new-analysis-btn')?.addEventListener('click', handleClear);

  // The two result carousels have separate page state.
  for (const name of Object.keys(pagedSections)) {
    $(name + '-previous')?.addEventListener('click', () => changePagedSection(name, -1));
    $(name + '-next')?.addEventListener('click', () => changePagedSection(name, 1));

    const viewport = $(name + '-viewport');
    viewport?.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      changePagedSection(name, e.key === 'ArrowRight' ? 1 : -1);
    });

    let touchStart = null;
    viewport?.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) {
        touchStart = null;
        return;
      }
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    viewport?.addEventListener('touchend', (e) => {
      if (!touchStart || !e.changedTouches.length) return;
      const deltaX = e.changedTouches[0].clientX - touchStart.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
      changePagedSection(name, deltaX < 0 ? 1 : -1);
    }, { passive: true });
    viewport?.addEventListener('touchcancel', () => { touchStart = null; });
  }

  const tileBreakpoint = window.matchMedia('(min-width: 640px)');
  tileBreakpoint.addEventListener('change', (e) => {
    if ($('results-view').hasAttribute('aria-busy')) return;
    const oldPageSize = e.matches ? 1 : 2;
    const newPageSize = e.matches ? 2 : 1;
    for (const [name, section] of Object.entries(pagedSections)) {
      section.page = Math.floor(section.page * oldPageSize / newPageSize);
      paintPagedSection(name);
    }
  });
}

/* -------------------------------------------------------
   View switching
------------------------------------------------------- */

function showPasteView(clearInput = true) {
  $('paste-view').classList.remove('hidden');
  $('results-view').classList.add('hidden');
  if (clearInput) {
    $('paste-input').value = '';
  }
  $('paste-input').focus();
  updateStatusBanner('idle');
}

function showResultsView() {
  $('paste-view').classList.add('hidden');
  $('results-view').classList.remove('hidden');
}

/* -------------------------------------------------------
   Handlers
------------------------------------------------------- */

function handleAnalyze() {
  const raw = $('paste-input').value;
  if (!raw.trim()) {
    updateStatusBanner('error', 'Paste your cookie data to begin.');
    return;
  }

  const result = parseCookies(raw);
  if (result.cookies.length === 0) {
    updateStatusBanner('error', 'No valid cookies found. Make sure you are pasting tab-separated data from DevTools.');
    return;
  }

  if (analysisTimer !== null) {
    window.clearTimeout(analysisTimer);
  }

  // Reset state before revealing the staged analysis view
  allCookies = [];
  skippedRows = [];
  filters = { search: '', status: 'all', domain: 'all', exportState: 'all' };
  sortField = 'name';
  sortDirection = 'asc';
  expandedRows = new Set();
  exportOptions = { includeExpired: false, includeSession: true };
  for (const section of Object.values(pagedSections)) {
    section.items = [];
    section.page = 0;
  }

  const delay = Math.floor(Math.random() * 4001) + 1000;
  showResultsView();
  renderLoadingState(delay);
  updateStatusBanner('loading', 'Analyzing cookies locally...');

  analysisTimer = window.setTimeout(() => {
    allCookies = result.cookies;
    skippedRows = result.skipped;
    analysisTimer = null;

    renderAll();
    setLoadingControls(false);
    $('results-view').removeAttribute('aria-busy');
    delete $('results-view').dataset.analysisDelay;

    const overview = buildOverview(allCookies);
    const cookieLabel = overview.total === 1 ? 'cookie' : 'cookies';
    const domainLabel = overview.domainCount === 1 ? 'domain' : 'domains';
    updateStatusBanner(
      'success',
      overview.total + ' ' + cookieLabel + ' analyzed across ' +
        overview.domainCount + ' ' + domainLabel + '.',
    );
  }, delay);
}

const buttonFeedbackTimers = new WeakMap();

// Show temporary text or icons on a button after a user clicks it
function setButtonFeedback(button, feedbackHtml, duration = 2000) {
  if (!button) return;
  if (!button.dataset.originalHtml) {
    button.dataset.originalHtml = button.innerHTML;
  }
  if (buttonFeedbackTimers.has(button)) {
    window.clearTimeout(buttonFeedbackTimers.get(button));
  }
  button.innerHTML = feedbackHtml;
  const timer = window.setTimeout(() => {
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
    buttonFeedbackTimers.delete(button);
  }, duration);
  buttonFeedbackTimers.set(button, timer);
}

function handleClear() {
  if (analysisTimer !== null) {
    window.clearTimeout(analysisTimer);
    analysisTimer = null;
  }
  allCookies = [];
  skippedRows = [];
  filters = { search: '', status: 'all', domain: 'all', exportState: 'all' };
  expandedRows = new Set();
  for (const section of Object.values(pagedSections)) {
    section.items = [];
    section.page = 0;
  }
  clearExportFeedback();
  showPasteView();
}

function syncExportOptions() {
  $('include-session').checked = exportOptions.includeSession;
  $('include-expired').checked = exportOptions.includeExpired;
}

function syncDropdownActionLabels() {
  const labels = { netscape: 'Netscape format', json: 'JSON', header: 'Cookie header string' };
  $('download-dropdown-btn').setAttribute('aria-label', 'Download selected cookies as ' + labels[$('download-format-select').value]);
  $('copy-dropdown-btn').setAttribute('aria-label', 'Copy selected cookies as ' + labels[$('copy-format-select').value]);
}

function clearExportFeedback() {
  const feedback = $('export-feedback');
  feedback.hidden = true;
  feedback.textContent = '';
}

function showExportFeedback(id, kind, message) {
  clearExportFeedback();
  const feedback = $(id);
  feedback.dataset.kind = kind;
  feedback.textContent = message;
  feedback.hidden = false;
}

function getExportableCookies(feedbackId, buttonId) {
  const cookies = filterCookiesForExport(allCookies, exportOptions);
  if (cookies.length) return cookies;

  const message = allCookies.some(cookie => cookie.selected)
    ? 'The inclusion options leave no selected cookies to export.'
    : 'No cookies are selected. Select cookie rows first.';
  showExportFeedback(feedbackId, 'error', message);
  setButtonFeedback($(buttonId), '<span class="text-destructive font-medium">Nothing to export</span>');
  return null;
}

function handleDownload(format, buttonId, feedbackId) {
  const cookies = getExportableCookies(feedbackId, buttonId);
  if (!cookies) return;

  try {
    const payload = buildExportPayload(cookies, format);
    downloadTextFile(payload.content, payload.filename, payload.mimeType);
    const message = 'Download started: ' + payload.filename + ' (' + cookies.length + ' cookies, ' + payload.label + ').';
    showExportFeedback(feedbackId, 'success', message);
    setButtonFeedback($(buttonId), 'Download started');
  } catch {
    showExportFeedback(feedbackId, 'error', 'Could not start the download. Please try again.');
    setButtonFeedback($(buttonId), '<span class="text-destructive font-medium">Download failed</span>');
  }
}

async function handleCopyExport(format, buttonId, feedbackId) {
  const cookies = getExportableCookies(feedbackId, buttonId);
  if (!cookies) return;

  const button = $(buttonId);
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  showExportFeedback(feedbackId, 'info', 'Copying cookies to the clipboard...');
  try {
    const payload = buildExportPayload(cookies, format);
    await navigator.clipboard.writeText(payload.content);
    showExportFeedback(feedbackId, 'success', 'Copied ' + cookies.length + ' cookies as ' + payload.label + '.');
    setButtonFeedback(button, 'Copied!');
  } catch {
    showExportFeedback(feedbackId, 'error', 'Clipboard access failed. Allow access and try again.');
    setButtonFeedback(button, '<span class="text-destructive font-medium">Copy failed</span>');
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function toggleVisibleSelection(selected) {
  const filtered = filterCookies(allCookies, filters);
  for (const c of filtered) {
    c.selected = selected;
  }
  renderCookieTable();
  renderOverview();
  clearExportFeedback();
  if (selected) {
    setButtonFeedback(
      $('select-visible-btn'),
      '<svg class="size-3.5 text-success inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>Selected all',
      1500,
    );
  } else {
    setButtonFeedback(
      $('unselect-visible-btn'),
      '<svg class="size-3.5 text-muted-foreground inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>Unselected all',
      1500,
    );
  }
}

/* -------------------------------------------------------
   Rendering
------------------------------------------------------- */

function renderAll() {
  renderOverview();
  renderDomainSummary();
  renderSecurityObservations();
  renderSkippedWarning();
  renderFilters();
  renderCookieTable();
}

function renderLoadingState(delay) {
  const resultsView = $('results-view');
  resultsView.setAttribute('aria-busy', 'true');
  resultsView.dataset.analysisDelay = String(delay);
  $('skipped-warning').classList.add('hidden');
  for (const name of Object.keys(pagedSections)) {
    $(name + '-controls').hidden = true;
    $(name + '-progress').hidden = true;
  }

  for (const id of [
    'stat-total',
    'stat-live',
    'stat-session',
    'stat-expired',
    'stat-domains',
    'stat-selected',
  ]) {
    $(id).innerHTML = '<span class="skeleton-shimmer block h-7 w-12 rounded-lg" aria-hidden="true"></span>';
  }

  $('domain-summary').innerHTML = Array.from({ length: getPageSize() }, () =>
    '<div class="glass-panel rounded-xl border border-border bg-card p-4">' +
      '<span class="skeleton-shimmer block h-4 w-2/3 rounded-full" aria-hidden="true"></span>' +
      '<span class="skeleton-shimmer mt-3 block h-3 w-20 rounded-full" aria-hidden="true"></span>' +
    '</div>',
  ).join('');

  $('security-observations').innerHTML = Array.from({ length: getPageSize() }, (_, index) =>
    '<div class="glass-panel rounded-xl border border-border bg-card p-3.5 sm:p-4">' +
      '<div class="flex items-start gap-3">' +
      '<span class="skeleton-shimmer block size-5 shrink-0 rounded-full" aria-hidden="true"></span>' +
      '<div class="min-w-0 flex-1">' +
        '<span class="skeleton-shimmer block h-3.5 rounded-full ' + (index % 2 === 0 ? 'w-2/3' : 'w-1/2') + '" aria-hidden="true"></span>' +
        '<span class="skeleton-shimmer mt-2.5 block h-3 w-full rounded-full" aria-hidden="true"></span>' +
      '</div>' +
      '</div>' +
    '</div>',
  ).join('');

  $('cookie-tbody').innerHTML = Array.from({ length: 5 }, (_, rowIndex) =>
    '<tr class="border-b border-border/40">' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer mx-auto block size-4 rounded" aria-hidden="true"></span></td>' +
      '<td class="px-2 py-3"></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 rounded-full ' + (rowIndex % 2 === 0 ? 'w-28' : 'w-20') + '" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-32 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-5 w-16 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-28 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-20 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-16 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-12 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-8 rounded-full" aria-hidden="true"></span></td>' +
      '<td class="px-3 py-3"><span class="skeleton-shimmer block h-3.5 w-14 rounded-full" aria-hidden="true"></span></td>' +
    '</tr>',
  ).join('');

  $('visible-count').textContent = 'Building inventory...';
  setLoadingControls(true);
}

function setLoadingControls(isLoading) {
  for (const id of [
    'new-analysis-btn',
    'search-input',
    'status-filter',
    'domain-filter',
    'export-state-filter',
    'select-visible-btn',
    'unselect-visible-btn',
    'include-session',
    'include-expired',
    'download-format-select',
    'copy-format-select',
    'download-dropdown-btn',
    'copy-dropdown-btn',
  ]) {
    const control = $(id);
    control.disabled = isLoading;
    control.classList.toggle('opacity-50', isLoading);
    control.classList.toggle('cursor-not-allowed', isLoading);
  }
}

function renderOverview() {
  const ov = buildOverview(allCookies);
  const selectedCount = allCookies.filter(c => c.selected).length;

  $('stat-total').textContent = ov.total;
  $('stat-live').textContent = ov.live;
  $('stat-session').textContent = ov.session;
  $('stat-expired').textContent = ov.expired;
  $('stat-domains').textContent = ov.domainCount;
  $('stat-selected').textContent = selectedCount;
}

export function getCarouselPage(itemCount, itemsPerPage, requestedPage) {
  const pageSize = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
  const start = page * pageSize;
  return { page, totalPages, start, end: Math.min(start + pageSize, itemCount) };
}

function getPageSize() {
  return window.matchMedia('(min-width: 640px)').matches ? 2 : 1;
}

function paintPagedSection(name) {
  const section = pagedSections[name];
  const container = $(name === 'domain' ? 'domain-summary' : 'security-observations');
  const { page, totalPages, start, end } = getCarouselPage(section.items.length, getPageSize(), section.page);
  section.page = page;
  container.innerHTML = section.items.slice(start, end)
    .map((item, index) => section.renderItem(item, start + index, section.items.length)).join('');

  const controls = $(name + '-controls');
  const progress = $(name + '-progress');
  controls.hidden = totalPages <= 1;
  progress.hidden = totalPages <= 1;
  if (totalPages <= 1) return;

  const counter = $(name + '-page-count');
  counter.textContent = (page + 1) + ' of ' + totalPages;
  counter.setAttribute('aria-label', (name === 'domain' ? 'Domain summary' : 'Observations') + ' page ' + (page + 1) + ' of ' + totalPages);
  $(name + '-previous').disabled = page === 0;
  $(name + '-next').disabled = page === totalPages - 1;
  progress.innerHTML = Array.from({ length: totalPages }, (_, index) =>
    '<span' + (index === page ? ' class="is-active"' : '') + '></span>',
  ).join('');
}

function changePagedSection(name, direction) {
  const section = pagedSections[name];
  const nextPage = getCarouselPage(section.items.length, getPageSize(), section.page + direction).page;
  if (nextPage === section.page) return;
  const usedButton = $(name + (direction < 0 ? '-previous' : '-next'));
  const keepFocus = document.activeElement === usedButton;
  section.page = nextPage;
  paintPagedSection(name);
  if (keepFocus && usedButton.disabled) {
    $(name + (direction < 0 ? '-next' : '-previous')).focus({ preventScroll: true });
  }
}

function renderDomainTile(s, index, total) {
  let html = '<div class="glass-panel card-spotlight rounded-xl border border-border bg-card p-3 sm:p-4" role="group" aria-roledescription="slide" aria-label="Domain ' + (index + 1) + ' of ' + total + '">';
  html += '<div class="flex items-center justify-between gap-2 mb-2">';
  html += '<span class="font-mono text-sm font-medium text-foreground truncate" title="' + escapeAttr(s.domain) + '">' + escapeHtml(s.domain) + '</span>';
  html += '<span class="text-xs font-semibold text-muted-foreground">' + s.total + '</span>';
  html += '</div>';
  html += '<div class="flex flex-wrap gap-1.5">';
  if (s.live > 0) html += '<span class="status-live rounded-full px-2 py-0.5 text-[10px] font-semibold">' + s.live + ' live</span>';
  if (s.session > 0) html += '<span class="status-session rounded-full px-2 py-0.5 text-[10px] font-semibold">' + s.session + ' session</span>';
  if (s.expired > 0) html += '<span class="status-expired rounded-full px-2 py-0.5 text-[10px] font-semibold">' + s.expired + ' expired</span>';
  html += '</div></div>';
  return html;
}

function renderObservationTile(o, index, total) {
  const iconClass = o.type === 'bad' ? 'sec-bad' : o.type === 'warn' ? 'sec-warn' : o.type === 'good' ? 'sec-good' : 'text-muted-foreground';
  const icon = o.type === 'bad' ? alertIcon() : o.type === 'warn' ? warnIcon() : o.type === 'good' ? checkIcon() : infoIcon();
  let html = '<div class="glass-panel card-spotlight rounded-xl border border-border bg-card p-3.5 sm:p-4" role="group" aria-roledescription="slide" aria-label="Observation ' + (index + 1) + ' of ' + total + '">';
  html += '<div class="flex items-start gap-3">';
  html += '<span class="mt-0.5 shrink-0 ' + iconClass + '">' + icon + '</span>';
  html += '<div class="min-w-0 flex-1">';
  html += '<p class="text-sm font-semibold text-foreground">' + escapeHtml(o.label) + ' <span class="text-xs font-normal text-muted-foreground">(' + o.count + ')</span></p>';
  html += '<p class="mt-2.5 text-xs leading-relaxed text-muted-foreground">' + escapeHtml(o.detail) + '</p>';
  html += '</div></div></div>';
  return html;
}

function renderDomainSummary() {
  pagedSections.domain.items = buildDomainSummary(allCookies);
  pagedSections.domain.page = 0;
  paintPagedSection('domain');
}

function renderSecurityObservations() {
  pagedSections.observations.items = buildSecurityObservations(allCookies);
  pagedSections.observations.page = 0;
  paintPagedSection('observations');
}

function renderSkippedWarning() {
  const container = $('skipped-warning');
  if (!container) return;

  if (skippedRows.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  let html = '<div class="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">';
  html += '<span class="mt-0.5 shrink-0 text-warning">' + warnIcon() + '</span>';
  html += '<div class="min-w-0">';
  html += '<p class="text-sm font-medium text-foreground">' + skippedRows.length + ' row(s) skipped</p>';
  html += '<ul class="mt-1 space-y-0.5">';
  for (const s of skippedRows.slice(0, 5)) {
    html += '<li class="text-xs text-muted-foreground">Line ' + s.lineNumber + ': ' + escapeHtml(s.reason) + '</li>';
  }
  if (skippedRows.length > 5) {
    html += '<li class="text-xs text-muted-foreground">...and ' + (skippedRows.length - 5) + ' more</li>';
  }
  html += '</ul></div></div>';

  container.innerHTML = html;
}

function renderFilters() {
  // Populate domain filter
  const domainSelect = $('domain-filter');
  if (domainSelect) {
    const domains = getUniqueDomains(allCookies);
    let opts = '<option value="all">All domains</option>';
    for (const d of domains) {
      opts += '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>';
    }
    domainSelect.innerHTML = opts;
  }

  // Reset search
  const searchInput = $('search-input');
  if (searchInput) searchInput.value = '';

  const statusFilter = $('status-filter');
  if (statusFilter) statusFilter.value = 'all';

  const exportStateFilter = $('export-state-filter');
  if (exportStateFilter) exportStateFilter.value = 'all';

  // Reset export options UI
  syncExportOptions();
  clearExportFeedback();
  $('download-format-select').value = 'netscape';
  $('copy-format-select').value = 'netscape';
  syncDropdownActionLabels();
}

function getVisibleCookies() {
  const filtered = filterCookies(allCookies, filters);
  return sortCookies(filtered, sortField, sortDirection);
}

function renderCookieTable() {
  const tbody = $('cookie-tbody');
  const countEl = $('visible-count');
  if (!tbody) return;

  const visible = getVisibleCookies();
  if (countEl) countEl.textContent = visible.length + ' of ' + allCookies.length;

  if (visible.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="px-4 py-8 text-center text-sm text-muted-foreground">No cookies match the current filters.</td></tr>';
    return;
  }

  let html = '';
  for (let i = 0; i < visible.length; i++) {
    const c = visible[i];
    const isExpanded = expandedRows.has(c);
    const sec = getSecurityProfile(c);

    // Main row
    html += '<tr class="cookie-row' + (isExpanded ? ' cookie-row-expanded' : '') + ' border-b border-border/40 cursor-pointer" data-cookie-idx="' + i + '">';

    // Checkbox
    html += '<td class="px-3 py-2.5 text-center"><input type="checkbox" class="cookie-select rounded border-border" ' + (c.selected ? 'checked' : '') + ' data-cookie-idx="' + i + '"></td>';

    // Expand chevron
    html += '<td class="px-2 py-2.5"><span class="chevron-icon inline-block' + (isExpanded ? ' expanded' : '') + '">' + chevronIcon() + '</span></td>';

    // Name
    html += '<td class="px-3 py-2.5 font-mono text-sm font-medium text-foreground max-w-[200px] truncate" title="' + escapeAttr(c.name) + '">' + escapeHtml(c.name) + '</td>';

    // Domain
    html += '<td class="px-3 py-2.5 font-mono text-xs text-muted-foreground max-w-[180px] truncate" title="' + escapeAttr(c.domain) + '">' + escapeHtml(c.domain) + '</td>';

    // Status
    html += '<td class="px-3 py-2.5"><span class="status-' + c.status + ' inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">' + c.status + '</span></td>';

    // Expires
    html += '<td class="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">' + formatDate(c.expirationTimestamp) + '</td>';

    // Remaining
    html += '<td class="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">' + (c.status === 'session' ? 'Session' : formatLifetime(c.remainingLifetime)) + '</td>';

    // Original lifetime is unknown because DevTools does not provide creation time
    html += '<td class="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">' + (c.originalLifetime === null ? 'Unknown' : formatLifetime(c.originalLifetime)) + '</td>';

    // Security
    html += '<td class="px-3 py-2.5 text-xs font-semibold sec-' + sec.level + '">' + sec.flags + '</td>';

    // Size
    html += '<td class="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">' + (c.size === null ? 'Unknown' : c.size) + '</td>';

    // Scope
    html += '<td class="px-3 py-2.5 text-xs text-muted-foreground">' + describeScopeShort(c) + '</td>';

    html += '</tr>';

    // Expanded detail row
    if (isExpanded) {
      html += '<tr class="cookie-row-expanded border-b border-border/40">';
      html += '<td colspan="11" class="px-4 py-3 sm:px-6">';
      html += renderCookieDetail(c);
      html += '</td></tr>';
    }
  }

  tbody.innerHTML = html;

  // Bind row click events
  tbody.querySelectorAll('tr[data-cookie-idx]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      // Skip if clicking checkbox
      if (e.target.tagName === 'INPUT') return;
      const cookie = visible[parseInt(tr.dataset.cookieIdx, 10)];
      if (!cookie) return;
      if (expandedRows.has(cookie)) {
        expandedRows.delete(cookie);
      } else {
        expandedRows.add(cookie);
      }
      renderCookieTable();
    });
  });

  // Bind checkbox events
  tbody.querySelectorAll('.cookie-select').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      const idx = parseInt(cb.dataset.cookieIdx, 10);
      if (visible[idx]) {
        visible[idx].selected = cb.checked;
      }
      renderOverview();
      clearExportFeedback();
    });
  });

  // Bind sort headers
  document.querySelectorAll('[data-sort]').forEach(th => {
    th.onclick = () => {
      const field = th.dataset.sort;
      if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortDirection = 'asc';
      }
      updateSortIndicators();
      renderCookieTable();
    };
  });

  updateSortIndicators();
}

function renderCookieDetail(c) {
  const sec = getSecurityProfile(c);
  let html = '<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">';

  html += detailCard('Path', c.path || 'Not provided');
  html += detailCard('SameSite', sec.sameSite);
  html += detailCard('Secure', c.secure ? 'Yes' : 'No');
  html += detailCard('HttpOnly', c.httpOnly ? 'Yes' : 'No');
  html += detailCard('Host-only', c.hostOnly ? 'Yes' : 'No');
  html += detailCard('Unix Timestamp', c.expirationTimestamp !== null ? String(Math.floor(c.expirationTimestamp)) : 'N/A');
  html += detailCard('Size (bytes)', c.size === null ? 'Not provided' : String(c.size));

  html += '</div>';

  // Scope explanation
  html += '<div class="mt-3 rounded-lg border border-border/50 bg-card/60 px-3 py-2">';
  html += '<p class="text-xs text-muted-foreground">' + escapeHtml(describeScopeLong(c)) + '</p>';
  html += '</div>';

  return html;
}

function detailCard(label, value) {
  return '<div class="rounded-lg bg-accent/30 px-3 py-2">' +
    '<p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">' + escapeHtml(label) + '</p>' +
    '<p class="mt-0.5 font-mono text-sm text-foreground">' + escapeHtml(value) + '</p>' +
    '</div>';
}

/* -------------------------------------------------------
   Status banner
------------------------------------------------------- */

function updateStatusBanner(kind, message) {
  const banner = $('status-banner');
  if (!banner) return;

  if (kind === 'idle') {
    banner.className = 'hidden';
    banner.innerHTML = '';
    return;
  }

  banner.className = 'mt-5 animate-scale-in flex items-center gap-3 rounded-xl px-4 py-3';

  if (kind === 'loading') {
    banner.className += ' glass-panel border border-border bg-card';
    banner.innerHTML = '<span class="shrink-0 text-primary animate-spin">' + spinnerIcon() + '</span>' +
      '<p class="text-sm text-foreground">' + escapeHtml(message) + '</p>';
  } else if (kind === 'success') {
    banner.className += ' glass-panel border border-success/30 bg-card';
    banner.innerHTML = '<span class="shrink-0 text-success">' + checkIcon() + '</span>' +
      '<p class="text-sm text-foreground">' + escapeHtml(message) + '</p>';
  } else if (kind === 'error') {
    banner.className += ' border border-destructive/40 bg-destructive/10';
    banner.innerHTML = '<span class="shrink-0 text-destructive">' + alertIcon() + '</span>' +
      '<p class="text-sm text-foreground">' + escapeHtml(message) + '</p>';
  }
}

/* -------------------------------------------------------
   Sort indicators
------------------------------------------------------- */

function updateSortIndicators() {
  document.querySelectorAll('[data-sort]').forEach(th => {
    const arrow = th.querySelector('.sort-arrow');
    if (!arrow) return;
    if (th.dataset.sort === sortField) {
      arrow.textContent = sortDirection === 'asc' ? ' ↑' : ' ↓';
      arrow.classList.remove('opacity-0');
      arrow.classList.add('opacity-100');
    } else {
      arrow.textContent = '';
      arrow.classList.add('opacity-0');
      arrow.classList.remove('opacity-100');
    }
  });
}

/* -------------------------------------------------------
   Theme icon update
------------------------------------------------------- */

function updateThemeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const toggle = $('theme-toggle');
  const sunIcon = $('sun-icon');
  const moonIcon = $('moon-icon');
  const pill = $('theme-pill');

  if (toggle) {
    toggle.setAttribute('aria-label', 'Switch to ' + (isDark ? 'light' : 'dark') + ' mode');
  }
  if (pill) {
    pill.classList.toggle('translate-x-10', isDark);
    pill.classList.toggle('sm:translate-x-[60px]', isDark);
    pill.classList.toggle('translate-x-0', !isDark);
    pill.classList.toggle('sm:translate-x-0', !isDark);
  }
  if (sunIcon) {
    sunIcon.classList.toggle('text-slate-950', !isDark);
    sunIcon.classList.toggle('text-slate-400', isDark);
  }
  if (moonIcon) {
    moonIcon.classList.toggle('text-white', isDark);
    moonIcon.classList.toggle('text-slate-500', !isDark);
  }
}

/* -------------------------------------------------------
   SVG icon helpers
------------------------------------------------------- */

function infoIcon() {
  return '<svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>';
}
function checkIcon() {
  return '<svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
}
function alertIcon() {
  return '<svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>';
}
function warnIcon() {
  return '<svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4m0 4h.01"/></svg>';
}
function spinnerIcon() {
  return '<svg class="size-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
}
function chevronIcon() {
  return '<svg class="size-4 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
}

/* -------------------------------------------------------
   Utility
------------------------------------------------------- */

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
