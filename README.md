# Singing Sands: Calendar

A tiny, offline-first PWA that shows which family has the boat each day.

- **Pletzer** — green
- **Salter** — royal blue

Days alternate starting **26 Aug 2026 (Pletzer's day)**, forever in both directions — no server, no database, just date math done in the browser.

## Features

- Week view: today + the next 6 days by default, with a "Today" button and week-by-week forward/back toggles.
- Month view: full calendar grid, colour-coded per day. Tap any day to jump straight to that week.
- Works any number of years forward or back.
- Installable as a PWA (Android/desktop get an "Install app" button; iOS shows Share → Add to Home Screen instructions).
- Fully offline after first load (service worker caches all assets).
- Dark, night-friendly theme.

## Files

```
index.html      the app shell
styles.css      dark theme styling
app.js          calendar logic, rendering, navigation, install prompt
manifest.json   PWA metadata
sw.js           offline caching (service worker)
icons/          app icons (192/512, incl. maskable variants)
```

## Changing the schedule

Everything hinges on one line in `app.js`:

```js
const ANCHOR = new Date(2026, 7, 26); // 26 Aug 2026 = Pletzer's day
```

To change the start date or which family starts, edit that line (month is 0-indexed, so `7` = August) and, if needed, swap which family is listed first in the `FAMILIES` alternation logic (`familyForDate`). Colours live at the top of `styles.css` as `--pletzer` and `--salter`.

## Deploying to GitHub Pages

1. Create a new **public** GitHub repository (e.g. `singing-sands-calendar`).
2. Upload all the files in this folder to the repo root (keep the `icons/` folder structure).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and `/ (root)` folder, then **Save**.
6. Wait a minute or two — GitHub will give you a live URL, typically:
   `https://<your-username>.github.io/singing-sands-calendar/`

That URL opens straight into the calendar. From there:
- **Android / desktop Chrome/Edge**: an "Install app" button appears in the page; tapping it adds it as a standalone app.
- **iPhone/iPad (Safari)**: tap the Share icon → **Add to Home Screen** (iOS doesn't support automatic install prompts, so the app shows this instruction on iOS automatically).

No further setup, backend, or build step is required — it's a static site.

### Optional: custom domain
If you want a nicer URL, add a `CNAME` file with your domain to the repo root and configure DNS per GitHub's custom domain docs — not required for the app to work.
