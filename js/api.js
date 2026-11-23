/**
 * api.js - all network communication with the TVMaze API.
 * Docs: https://www.tvmaze.com/api (free, no API key required)
 */

const SHOW_API_BASE_URL = 'https://api.tvmaze.com';

/**
 * Search shows by title.
 * Resolves with an array of simplified show objects (empty array = no matches).
 * Rejects with an Error whose message is safe to display to the user.
 */
async function searchShows(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const url = `${SHOW_API_BASE_URL}/search/shows?q=${encodeURIComponent(trimmedQuery)}`;

  try {
    const response = await fetch(url);

    // fetch() only rejects on network failure, so HTTP errors must be checked manually
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a few seconds and try again.');
      }
      throw new Error(`The server responded with an error (HTTP ${response.status}).`);
    }

    const rawResults = await response.json();

    // Empty response: the API returns [] when nothing matches
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return [];
    }

    return rawResults.map((item) => normalizeShow(item.show));
  } catch (error) {
    // A TypeError from fetch() means the request never reached the server
    if (error instanceof TypeError) {
      throw new Error('Network problem: could not reach the TV show service. Check your connection.');
    }
    throw error; // already a friendly Error from above (or a JSON parse failure)
  }
}

/** Convert the raw API object into a small, predictable shape used by the whole app. */
function normalizeShow(rawShow) {
  return {
    id: rawShow.id,
    name: rawShow.name,
    genres: rawShow.genres || [],
    rating: rawShow.rating && rawShow.rating.average ? rawShow.rating.average : null,
    year: rawShow.premiered ? Number(rawShow.premiered.slice(0, 4)) : null,
    status: rawShow.status || 'Unknown',
    imageUrl: rawShow.image ? rawShow.image.medium.replace('http://', 'https://') : null,
    summary: stripHtml(rawShow.summary),
    pageUrl: rawShow.url
  };
}

/** The API sends summaries as HTML; DOMParser extracts plain text without running scripts. */
function stripHtml(html) {
  if (!html) return '';
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  return parsedDocument.body.textContent.trim();
}
