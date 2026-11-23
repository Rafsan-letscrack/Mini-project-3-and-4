/**
 * app.js - UI logic: DOM rendering, event handling, and application state.
 * Depends on functions from storage.js and api.js.
 */

// ---------- DOM references (selected once, reused everywhere) ----------
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const statusArea = document.querySelector('#status-area');
const resultsSection = document.querySelector('#results-section');
const resultsList = document.querySelector('#results-list');
const resultsCount = document.querySelector('#results-count');
const genreFilter = document.querySelector('#genre-filter');
const sortSelect = document.querySelector('#sort-select');
const favoritesList = document.querySelector('#favorites-list');
const favoritesCount = document.querySelector('#favorites-count');
const favoritesEmptyNote = document.querySelector('#favorites-empty');
const clearFavoritesButton = document.querySelector('#clear-favorites');

// ---------- Application state ----------
const state = {
  results: [],                    // shows returned by the latest search
  favorites: loadFavorites(),     // restored from localStorage on every page load
  selectedGenre: 'all',
  sortBy: 'relevance',
  latestRequestId: 0              // used to ignore out-of-date responses
};

// ---------- Status messages (loading / error / empty / idle) ----------
function showStatus(type, message, retryQuery) {
  statusArea.replaceChildren();

  const box = document.createElement('div');
  box.className = `status status-${type}`;

  if (type === 'loading') {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    box.append(spinner);
  }

  const text = document.createElement('span');
  text.textContent = message;
  box.append(text);

  // Error state gets a Retry button that repeats the failed search
  if (type === 'error' && retryQuery) {
    const retryButton = document.createElement('button');
    retryButton.className = 'btn btn-danger';
    retryButton.type = 'button';
    retryButton.textContent = 'Retry';
    retryButton.addEventListener('click', () => runSearch(retryQuery));
    box.append(retryButton);
  }

  statusArea.append(box);
}

function clearStatus() {
  statusArea.replaceChildren();
}

// ---------- Searching ----------
async function runSearch(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    showStatus('empty', 'Please type a show title to search.');
    return;
  }

  const requestId = ++state.latestRequestId;
  resultsSection.hidden = true;
  showStatus('loading', `Searching for "${trimmedQuery}"...`);

  try {
    const shows = await searchShows(trimmedQuery);

    // A newer search started while this one was running, so discard this response
    if (requestId !== state.latestRequestId) return;

    saveLastQuery(trimmedQuery);
    state.results = shows;
    state.selectedGenre = 'all';
    state.sortBy = 'relevance';
    sortSelect.value = 'relevance';

    if (shows.length === 0) {
      showStatus('empty', `No shows found for "${trimmedQuery}". Try a different title.`);
      return;
    }

    clearStatus();
    populateGenreFilter();
    renderResults();
  } catch (error) {
    if (requestId !== state.latestRequestId) return;
    showStatus('error', error.message, trimmedQuery);
  }
}

// ---------- Filtering and sorting (pure data logic) ----------
function getVisibleResults() {
  // filter() keeps shows matching the genre; the spread copy stops sort() from changing state.results
  const filtered = state.results.filter(
    (show) => state.selectedGenre === 'all' || show.genres.includes(state.selectedGenre)
  );
  const sorted = [...filtered];

  if (state.sortBy === 'rating') {
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (state.sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sortBy === 'year') {
    sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  return sorted; // "relevance" keeps the API's original order
}

/** Build the genre dropdown from the genres that actually appear in the results. */
function populateGenreFilter() {
  // flatMap merges every show's genre array; Set removes duplicates
  const uniqueGenres = [...new Set(state.results.flatMap((show) => show.genres))].sort();

  genreFilter.replaceChildren(new Option('All genres', 'all'));
  uniqueGenres.forEach((genre) => genreFilter.append(new Option(genre, genre)));
  genreFilter.value = 'all';
}

// ---------- Rendering ----------
function isFavorite(showId) {
  return state.favorites.some((favorite) => favorite.id === showId);
}

/** Create one show card. The button's data attributes let one click listener handle every card. */
function createShowCard(show, isInFavoritesList) {
  const card = document.createElement('li');
  card.className = 'card';

  if (show.imageUrl) {
    const poster = document.createElement('img');
    poster.className = 'card-poster';
    poster.src = show.imageUrl;
    poster.alt = `Poster of ${show.name}`;
    poster.loading = 'lazy';
    card.append(poster);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'card-poster-placeholder';
    placeholder.textContent = 'No image';
    card.append(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = show.name;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  const ratingText = show.rating ? `Rating ${show.rating}` : 'Not rated';
  meta.textContent = [show.year || 'Year unknown', ratingText, show.genres.join(', ')]
    .filter(Boolean)
    .join(' | ');

  const summary = document.createElement('p');
  summary.className = 'card-summary';
  summary.textContent = show.summary.length > 130
    ? `${show.summary.slice(0, 130)}...`
    : show.summary || 'No description available.';

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.dataset.showId = show.id;
  favoriteButton.dataset.action = 'toggle-favorite';

  if (isInFavoritesList || isFavorite(show.id)) {
    favoriteButton.className = 'btn btn-danger';
    favoriteButton.textContent = 'Remove from favorites';
  } else {
    favoriteButton.className = 'btn btn-primary';
    favoriteButton.textContent = 'Add to favorites';
  }

  body.append(title, meta, summary, favoriteButton);
  card.append(body);
  return card;
}

function renderResults() {
  const visibleShows = getVisibleResults();
  resultsSection.hidden = false;
  resultsCount.textContent = visibleShows.length;
  resultsList.replaceChildren();

  // Empty state caused by the genre filter (the search itself did return data)
  if (visibleShows.length === 0) {
    showStatus('empty', 'No shows match the selected genre. Choose "All genres" to see everything.');
    return;
  }

  clearStatus();
  visibleShows.forEach((show) => resultsList.append(createShowCard(show, false)));
}

function renderFavorites() {
  favoritesList.replaceChildren();
  favoritesCount.textContent = state.favorites.length;

  const hasFavorites = state.favorites.length > 0;
  favoritesEmptyNote.hidden = hasFavorites;
  clearFavoritesButton.hidden = !hasFavorites;

  state.favorites.forEach((show) => favoritesList.append(createShowCard(show, true)));
}

// ---------- Favorites logic ----------
function toggleFavorite(showId) {
  if (isFavorite(showId)) {
    state.favorites = removeFavorite(showId);
  } else {
    // find() looks in the current results first, then the favorites list
    const showToSave = state.results.find((show) => show.id === showId);
    if (showToSave) {
      state.favorites = addFavorite(showToSave);
    }
  }
  renderFavorites();
  if (!resultsSection.hidden) renderResults(); // refresh button labels in results
}

// ---------- Event listeners ----------
searchForm.addEventListener('submit', (event) => {
  event.preventDefault(); // stop the page from reloading
  runSearch(searchInput.value);
});

genreFilter.addEventListener('change', () => {
  state.selectedGenre = genreFilter.value;
  renderResults();
});

sortSelect.addEventListener('change', () => {
  state.sortBy = sortSelect.value;
  renderResults();
});

// Event delegation: one listener per list instead of one per button
[resultsList, favoritesList].forEach((list) => {
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="toggle-favorite"]');
    if (button) toggleFavorite(Number(button.dataset.showId));
  });
});

clearFavoritesButton.addEventListener('click', () => {
  if (confirm('Remove all favorites?')) {
    clearFavorites();
    state.favorites = [];
    renderFavorites();
    if (!resultsSection.hidden) renderResults();
  }
});

// ---------- Startup ----------
function init() {
  renderFavorites(); // favorites survive page refresh through localStorage

  const lastQuery = loadLastQuery();
  if (lastQuery) {
    searchInput.value = lastQuery;
    runSearch(lastQuery); // restore the previous search
  } else {
    showStatus('idle', 'Search for a TV show above to get started.');
  }
}

init();
