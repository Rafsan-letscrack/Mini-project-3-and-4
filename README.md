 # TV Show Explorer

A vanilla HTML, CSS, and JavaScript web app for searching TV shows, filtering and sorting results, and saving favorites that persist after a page refresh.

**Course:** CSE-2340 Software Development I, International Islamic University Chittagong
**Assignment:** Mini Project 3-4 (MP3-MP4)
**Student:** YOUR NAME (YOUR STUDENT ID)

## API Used

**TVMaze API**: https://www.tvmaze.com/api

- Endpoint: `GET https://api.tvmaze.com/search/shows?q={query}`
- **Why I chose it:** it is free, needs no API key or sign-up, supports cross-origin browser requests, and returns rich data (poster, genres, rating, summary, premiere date). This lets the project run immediately by opening `index.html`.

## Features Mapped to the Marking Requirements

| Requirement | Marks | Where it is implemented |
|---|---|---|
| DOM Manipulation and Dynamic Rendering | 4 (MP3) | `js/app.js`: `createElement`, `querySelector`, `replaceChildren`, `append`; cards, results, and favorites are rendered from API data. Interactive features: **search, genre filter, sorting, add/remove favorites**. |
| Event Handling and JavaScript Logic | 3 (MP3) | `addEventListener()` for form submit, filter/sort `change`, delegated card clicks, and clear-all. Data kept in arrays and objects (`state`) and processed with `map()`, `filter()`, `find()`, `some()`, `forEach()`, `flatMap()`. |
| API Integration and Async Operations | 4 (MP4) | `js/api.js`: `fetch()` with `async/await`, `try/catch`, `response.ok` check, and empty-response handling. **Loading** (spinner), **error** (message + Retry button), and **empty** (no matches / no genre match) states are all visible in the UI. |
| Local Storage | 3 (MP4) | `js/storage.js`: favorites list and last search term are saved, loaded (with safe JSON parsing), and removed. Both survive a refresh. |

## How to Run

**Option 1:** double-click `index.html` to open it in a browser.

**Option 2 (local server):**
```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```
(or use the VS Code "Live Server" extension)

An internet connection is required for searching.

## Folder Structure

```
CSE2340-MP3-MP4-YourStudentID/
├── index.html
├── README.md
├── .gitignore
├── css/
│   └── style.css
└── js/
    ├── api.js
    ├── app.js
    └── storage.js
```

## Testing Checklist

- Search "Friends": results appear, and the loading spinner shows briefly.
- Search "zzzxqqq": the empty state appears.
- Turn off the network (DevTools > Network > Offline) and search: the error state appears with a Retry button.
- Add favorites, refresh the page: favorites and the last search are restored.
