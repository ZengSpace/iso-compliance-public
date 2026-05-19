const state = {
  data: null,
  view: 'interconnection',
  search: '',
};

const els = {
  currentRead: document.querySelector('#current-read'),
  windowLabel: document.querySelector('#window-label'),
  recentCount: document.querySelector('#recent-count'),
  watchCount: document.querySelector('#watch-count'),
  generatedAt: document.querySelector('#generated-at'),
  captureAt: document.querySelector('#capture-at'),
  sourceLink: document.querySelector('#source-link'),
  rowCount: document.querySelector('#row-count'),
  body: document.querySelector('#updates-body'),
  notes: document.querySelector('#notes-list'),
  search: document.querySelector('#search'),
  chips: Array.from(document.querySelectorAll('[data-view]')),
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function rowsForView() {
  if (!state.data) return [];
  if (state.view === 'recent') return state.data.recentOtherOatiUpdates || [];
  if (state.view === 'watchlist') return state.data.baselineInterconnectionWatchlist || [];
  return state.data.updates || [];
}

function badge(row) {
  if (state.view === 'watchlist') return '<span class="badge badge--watch">Watch</span>';
  if (row.keywordHit) return '<span class="badge badge--hit">Keyword hit</span>';
  return '<span class="badge badge--other">Recent</span>';
}

function matchesSearch(row) {
  if (!state.search) return true;
  const haystack = [
    row.title,
    row.updated,
    row.source,
    row.folder,
    row.documentType,
    row.summary,
    row.proposalImpact,
    row.status,
    ...(Array.isArray(row.tags) ? row.tags : []),
  ].join(' ').toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function renderTable() {
  const rows = rowsForView().filter(matchesSearch);
  els.rowCount.textContent = `${rows.length} row${rows.length === 1 ? '' : 's'}`;
  if (!rows.length) {
    const message = state.view === 'interconnection'
      ? 'No direct interconnection-keyword updates in this window. Check “All recent OATI” for monitor sanity and “Baseline watchlist” for watched topics.'
      : 'No rows match this view/filter.';
    els.body.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(message)}</td></tr>`;
    return;
  }

  els.body.innerHTML = rows.map((row) => {
    const title = row.url
      ? `<a class="doc-title" href="${escapeHtml(row.url)}" rel="noreferrer">${escapeHtml(row.title)}</a>`
      : `<span class="doc-title">${escapeHtml(row.title)}</span>`;
    return `<tr>
      <td>${escapeHtml(formatDate(row.updated))}</td>
      <td><strong>${escapeHtml(row.source || '—')}</strong><div class="muted">${escapeHtml(row.folder || '—')}</div></td>
      <td>${title}<div class="doc-summary">${escapeHtml(row.summary || '')}</div></td>
      <td>${escapeHtml(row.proposalImpact || 'Review required.')}</td>
      <td>${badge(row)}<div class="muted">${escapeHtml(row.confidence || 'low')} confidence</div></td>
    </tr>`;
  }).join('');
}

function renderSummary() {
  const meta = state.data.meta || {};
  const counts = meta.counts || {};
  const hitCount = counts.recentInterconnectionRows ?? (state.data.updates || []).length;
  const recentCount = counts.recentRows ?? ((state.data.updates || []).length + (state.data.recentOtherOatiUpdates || []).length);
  const watchCount = counts.baselineInterconnectionRows ?? (state.data.baselineInterconnectionWatchlist || []).length;

  els.currentRead.textContent = hitCount;
  els.windowLabel.textContent = `${formatDate(meta.windowStart)} to ${formatDate(meta.windowEnd)} (${meta.windowDays || 14} days)`;
  els.recentCount.textContent = recentCount;
  els.watchCount.textContent = watchCount;
  els.generatedAt.textContent = formatDate(meta.generatedAt);
  els.captureAt.textContent = meta.captureTimestamp ? `Captured ${formatDate(meta.captureTimestamp)}` : 'Source capture pending';
  if (meta.sourcePage) els.sourceLink.href = meta.sourcePage;

  els.notes.innerHTML = (state.data.notes || []).map((note) => `<li>${escapeHtml(note)}</li>`).join('');
}

function setView(view) {
  state.view = view;
  els.chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.view === view));
  renderTable();
}

async function init() {
  try {
    const response = await fetch('data/updates.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    renderSummary();
    renderTable();
  } catch (error) {
    els.currentRead.textContent = 'Data load failed';
    els.body.innerHTML = `<tr><td colspan="5" class="empty-state">Could not load data/updates.json: ${escapeHtml(error.message)}</td></tr>`;
    console.error(error);
  }
}

els.chips.forEach((chip) => chip.addEventListener('click', () => setView(chip.dataset.view)));
els.search.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderTable();
});

init();
