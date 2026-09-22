# Darts Scorer

A fast, mobile-friendly darts scorer for 501 / 301 / 701, built as a static single-page app and hosted on Cloudflare.

- 1 to 8 players, first to N legs, double-out or straight-out
- Bust detection, impossible-score validation, checkout suggestions (standard double-out table)
- 3-dart averages, 180s / 140+ / 100+ counts, high checkout, best leg
- Undo, keyboard support, and automatic save so a refresh never loses the game
- Remembers players: saved names appear as one-tap chips on the setup screen
- Match history with lifetime stats per player (wins, average, 180s, high checkout, best leg), plus JSON export/import for backup or moving to another device
- Installable PWA: works offline once opened, and Chrome offers an Install button
- No build step, no framework, no dependencies at runtime

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:8787. (Or simply open `public/index.html` in a browser.)

## Deploy to Cloudflare

The app is deployed as a Cloudflare Worker serving static assets from `public/` (see `wrangler.jsonc`).

```bash
npx wrangler login
npm run deploy
```

Wrangler prints the `*.workers.dev` URL when the deploy finishes. Add a custom domain from the Worker's settings in the Cloudflare dashboard if you want one.

### Alternative: Cloudflare Pages via Git

If you prefer Pages, connect this repository in the Cloudflare dashboard and use:

- Build command: *(leave empty)*
- Build output directory: `public`

## Data and offline

All data (current game, saved players, match history) lives in the browser's `localStorage` on that device. Nothing is sent to a server. Use **History > Export** to download a JSON backup and **Import** to merge it on another device.

The service worker caches the app shell with a stale-while-revalidate strategy: pages open instantly from cache and refresh in the background, so a new deploy is picked up on the next launch. Bump `CACHE` in `public/sw.js` if you ever need to force old caches to be dropped.

## Project layout

```
public/
  index.html     app shell
  app.js         game logic, rules and rendering
  styles.css     styling
  sw.js          service worker (offline app shell cache)
  manifest.webmanifest, icon.svg   PWA metadata (install / add to home screen)
test/
  scoring.test.js   rule tests, run with `npm test`
wrangler.jsonc     Cloudflare deployment config
```
