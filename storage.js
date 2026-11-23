/**
 * storage.js - everything related to localStorage.
 * Two keys are used: the favorites list and the last search term.
 */

const FAVORITES_KEY = 'tvExplorer.favorites';
const LAST_QUERY_KEY = 'tvExplorer.lastQuery';

/** Read and parse JSON safely. Returns fallbackValue if missing, corrupted, or storage is blocked. */
function readJson(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue === null) return fallbackValue;
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn(`Could not read "${key}" from localStorage:`, error);
    return fallbackValue;
  }
}

/** Stringify and save. Returns true on success, false if storage is full or blocked. */
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not write "${key}" to localStorage:`, error);
    return false;
  }
}

/** Load favorites, discarding any malformed entries. */
function loadFavorites() {
  const storedValue = readJson(FAVORITES_KEY, []);
  if (!Array.isArray(storedValue)) return [];
  return storedValue.filter((show) => show && typeof show.id === 'number' && show.name);
}

function saveFavorites(favoritesList) {
  return writeJson(FAVORITES_KEY, favoritesList);
}

/** Add a show (ignored if already saved). Returns the updated list. */
function addFavorite(show) {
  const favorites = loadFavorites();
  if (!favorites.some((favorite) => favorite.id === show.id)) {
    favorites.push(show);
    saveFavorites(favorites);
  }
  return favorites;
}

/** Remove a show by id. Returns the updated list. */
function removeFavorite(showId) {
  const updatedFavorites = loadFavorites().filter((favorite) => favorite.id !== showId);
  saveFavorites(updatedFavorites);
  return updatedFavorites;
}

function clearFavorites() {
  try {
    localStorage.removeItem(FAVORITES_KEY);
  } catch (error) {
    console.warn('Could not clear favorites:', error);
  }
}

function saveLastQuery(query) {
  writeJson(LAST_QUERY_KEY, query);
}

function loadLastQuery() {
  const storedQuery = readJson(LAST_QUERY_KEY, '');
  return typeof storedQuery === 'string' ? storedQuery : '';
}
