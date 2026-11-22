'use strict';
// ---- Config ----------------------------------------------------------
const DEFAULT_API_KEY = 'YOUR_API_KEY_HERE'; // or use the "API Key" button in the UI
const API = 'https://www.omdbapi.com/';
const KEY_STORE = 'cinevault.apikey';
const WL_STORE = 'cinevault.watchlist';

// ---- State -----------------------------------------------------------
const state = {
  view: 'search',
  results: [],      // current search results (array of objects)
  page: 1,
  total: 0,
  lastSearch: null,
  watchlist: loadWatchlist()
};

// ---- DOM -------------------------------------------------------------
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const grid = $('#grid'), statusEl = $('#status'), loadMoreBtn = $('#load-more');

// ---- Storage ---------------------------------------------------------
function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WL_STORE)) || []; }
  catch { return []; }
}
function saveWatchlist() {
  localStorage.setItem(WL_STORE, JSON.stringify(state.watchlist));
  $('#count').textContent = state.watchlist.length;
}
const getKey = () => localStorage.getItem(KEY_STORE) || DEFAULT_API_KEY;

// ---- Helpers ---------------------------------------------------------
function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach(k => n.append(k));
  return n;
}
const inWatchlist = (id) => state.watchlist.find(m => m.imdbID === id);
const yearNum = (m) => parseInt(m.Year, 10) || 0;
function sortMovies(list, mode) {
  const arr = [...list];
  if (mode === 'year-desc') arr.sort((a, b) => yearNum(b) - yearNum(a));
  else if (mode === 'year-asc') arr.sort((a, b) => yearNum(a) - yearNum(b));
  else if (mode === 'title') arr.sort((a, b) => a.Title.localeCompare(b.Title));
  else if (mode === 'added') arr.sort((a, b) => b.addedAt - a.addedAt);
  return arr;
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---- UI states -------------------------------------------------------
function showLoading(append = false) {
  statusEl.textContent = 'Loading…';
  if (!append) {
    grid.replaceChildren(...Array.from({ length: 8 }, () => el('div', { className: 'skeleton' })));
  }
  loadMoreBtn.hidden = true;
}
function showState(icon, text, type = '') {
  statusEl.textContent = text;
  grid.replaceChildren(el('div', { className: 'state ' + type },
    el('div', { className: 'big', textContent: icon }), el('p', { textContent: text })));
  loadMoreBtn.hidden = true;
}

// ---- API -------------------------------------------------------------
async function searchMovies(append = false) {
  const { query, type, year } = state.lastSearch;
  const key = getKey();
  if (!key || key === 'YOUR_API_KEY_HERE') {
    showState('🔑', 'Add your free OMDb API key (⚙ API Key button) to start searching.', 'error');
    return;
  }
  showLoading(append);
  try {
    const params = new URLSearchParams({ apikey: key, s: query, page: state.page });
    if (type) params.set('type', type);
    if (year) params.set('y', year);
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`Network error (HTTP ${res.status})`);
    const data = await res.json();
    if (data.Response === 'False') {
      if (/api key/i.test(data.Error)) throw new Error('Invalid API key. Check your key and try again.');
      if (!append) { state.results = []; showState('🔍', `No results for "${query}". Try another title or keyword.`); }
      loadMoreBtn.hidden = true;
      return;
    }
    state.total = Number(data.totalResults);
    state.results = append ? state.results.concat(data.Search) : data.Search;
    renderResults();
  } catch (err) {
    showState('⚠️', err.message === 'Failed to fetch' ? 'Network failure. Check your connection.' : err.message, 'error');
  }
}
async function fetchDetails(id) {
  const params = new URLSearchParams({ apikey: getKey(), i: id, plot: 'full' });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error);
  return data;
}

// ---- Rendering -------------------------------------------------------
function createCard(m) {
  const saved = inWatchlist(m.imdbID);
  const poster = m.Poster && m.Poster !== 'N/A'
    ? el('img', { src: m.Poster, alt: `Poster of ${m.Title}`, loading: 'lazy', tabIndex: 0 })
    : el('div', { className: 'noposter', textContent: '🎞 No poster', tabIndex: 0 });
  const open = () => openDetails(m.imdbID);
  poster.addEventListener('click', open);
  poster.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });

  const addBtn = el('button', { className: saved ? 'saved' : '', textContent: saved ? '✓ Saved' : '+ Watchlist' });
  addBtn.setAttribute('aria-label', `${saved ? 'Remove' : 'Add'} ${m.Title} ${saved ? 'from' : 'to'} watchlist`);
  addBtn.addEventListener('click', () => toggleWatchlist(m));
  const actions = el('div', { className: 'actions' }, addBtn, el('button', { textContent: 'Details' }));
  actions.lastChild.addEventListener('click', open);

  const info = el('div', { className: 'info' },
    el('h3', { textContent: m.Title }),
    el('div', { className: 'meta' }, el('span', { textContent: m.Year }), el('span', { className: 'tag', textContent: m.Type })));
  if (saved && saved.watched) info.append(el('span', { className: 'watched-flag', textContent: '✔ Watched' }));
  if (state.view === 'watchlist') {
    const wb = el('button', { textContent: saved.watched ? 'Unwatch' : 'Mark watched' });
    wb.addEventListener('click', () => { saved.watched = !saved.watched; saveWatchlist(); render(); });
    actions.prepend(wb);
  }
  info.append(actions);
  return el('article', { className: 'card' }, poster, info);
}
function renderResults() {
  const list = sortMovies(state.results, $('#sort').value);
  grid.replaceChildren(...list.map(createCard));
  statusEl.textContent = `Showing ${list.length} of ${state.total} results`;
  loadMoreBtn.hidden = state.results.length >= state.total;
}
function renderWatchlist() {
  const q = $('#wl-query').value.trim().toLowerCase();
  const status = $('#wl-status').value;
  let list = state.watchlist
    .filter(m => m.Title.toLowerCase().includes(q))
    .filter(m => status === 'all' || (status === 'watched') === !!m.watched);
  list = sortMovies(list, $('#wl-sort').value);
  loadMoreBtn.hidden = true;
  if (!list.length) {
    showState('📭', state.watchlist.length ? 'No saved titles match your filters.' : 'Your watchlist is empty. Search for movies and save some!');
    return;
  }
  statusEl.textContent = `${list.length} saved title(s)`;
  grid.replaceChildren(...list.map(createCard));
}
function render() { state.view === 'watchlist' ? renderWatchlist() : (state.results.length ? renderResults() : null); }

// ---- Actions ---------------------------------------------------------
function toggleWatchlist(m) {
  const existing = inWatchlist(m.imdbID);
  if (existing) {
    state.watchlist = state.watchlist.filter(x => x.imdbID !== m.imdbID);
    toast(`Removed "${m.Title}"`);
  } else {
    state.watchlist.push({ imdbID: m.imdbID, Title: m.Title, Year: m.Year, Type: m.Type, Poster: m.Poster, watched: false, addedAt: Date.now() });
    toast(`Saved "${m.Title}"`);
  }
  saveWatchlist();
  state.view === 'watchlist' ? renderWatchlist() : renderResults();
}
function switchView(view) {
  state.view = view;
  $$('.tab').forEach(t => { const on = t.dataset.view === view; t.classList.toggle('active', on); t.setAttribute('aria-pressed', on); });
  $('#view-search').hidden = view !== 'search';
  $('#view-watchlist').hidden = view !== 'watchlist';
  if (view === 'watchlist') renderWatchlist();
  else if (state.results.length) renderResults();
  else showState('🍿', 'Search for a movie or series to get started.');
}
async function openDetails(id) {
  const dlg = $('#details'), body = $('#details-body');
  body.replaceChildren(el('div', { className: 'spinner' }), el('p', { textContent: 'Loading details…' }));
  dlg.showModal();
  try {
    const d = await fetchDetails(id);
    const rows = [['Rating', d.imdbRating !== 'N/A' ? `⭐ ${d.imdbRating}/10` : 'N/A'], ['Released', d.Released], ['Runtime', d.Runtime], ['Genre', d.Genre], ['Director', d.Director], ['Cast', d.Actors], ['Plot', d.Plot]];
    const dl = el('dl', {});
    rows.forEach(([k, v]) => dl.append(el('dt', { textContent: k }), el('dd', { textContent: v })));
    const img = d.Poster !== 'N/A' ? el('img', { src: d.Poster, alt: `Poster of ${d.Title}` }) : el('div', { className: 'noposter', textContent: 'No poster' });
    body.replaceChildren(el('div', { className: 'detail' }, img, el('div', {}, el('h2', { textContent: `${d.Title} (${d.Year})` }), dl)));
  } catch (err) {
    body.replaceChildren(el('p', { className: 'state error', textContent: `Could not load details: ${err.message}` }));
  }
}

// ---- Events ----------------------------------------------------------
$('#search-form').addEventListener('submit', e => {
  e.preventDefault();
  state.lastSearch = { query: $('#query').value.trim(), type: $('#type').value, year: $('#year').value };
  state.page = 1;
  searchMovies();
});
loadMoreBtn.addEventListener('click', () => { state.page++; searchMovies(true); });
['#sort'].forEach(s => $(s).addEventListener('change', () => state.results.length && renderResults()));
['#wl-query', '#wl-status', '#wl-sort'].forEach(s => $(s).addEventListener('input', renderWatchlist));
$$('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));
$('#clear-all').addEventListener('click', () => {
  if (state.watchlist.length && confirm('Remove all saved titles?')) { state.watchlist = []; saveWatchlist(); renderWatchlist(); }
});
$('#close-details').addEventListener('click', () => $('#details').close());
$('#details').addEventListener('click', e => { if (e.target.id === 'details') e.target.close(); });
$('#btn-settings').addEventListener('click', () => { $('#key-input').value = localStorage.getItem(KEY_STORE) || ''; $('#settings').showModal(); });
$('#key-form').addEventListener('submit', e => {
  if (e.submitter && e.submitter.id === 'save-key') {
    localStorage.setItem(KEY_STORE, $('#key-input').value.trim());
    toast('API key saved');
  }
});

// ---- Init ------------------------------------------------------------
saveWatchlist();
switchView('search');
