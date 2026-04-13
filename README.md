# Restaurant Randomizer (PWA)

Svelte 5 + Vite 8 + TypeScript. Local-first shell: yes / no / skip drives **decision material** per place (`src/scoring/decisionMaterial.ts`) — net **score**, **lastInteractedAt** (recency), and **answerCounts** (yes/no/skip tags). Ranking uses score, then recency, then name; tune weights or add decay in that module.

## Nearby restaurants (Google Places)

The browser never sees your Google API key. A tiny Node proxy (`server/placesProxy.ts`) calls [Places API (New) Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search) with a **minimal field mask** (`places.id`, `places.displayName`) so requests stay on the **Nearby Search Pro** SKU tier rather than Enterprise fields.

1. In Google Cloud, enable **Places API (New)** and create an API key (restrict it to that API).
2. Copy `.env.example` to `.env`, set `GOOGLE_MAPS_API_KEY`, and start the proxy:
   - `npm run server` (loads nothing automatically; export vars or `source .env` first if you use a `.env` file).
3. In another terminal, `npm run dev`. The UI button **Load nearby** uses the device location and replaces the demo list via `POST /api/places/nearby` (Vite proxies to `http://127.0.0.1:8787` by default; override with `VITE_PLACES_PROXY`).

For `npm run preview`, run the proxy the same way; the preview server also proxies `/api` to the backend.

## PWA

**Serwist** (`@serwist/vite`, `serwist`, `@serwist/window`) drives the service worker and precache. The web app manifest lives at `public/manifest.webmanifest`. Service worker source: `src/sw.ts` (built to `dist/sw.js`).

We use Serwist instead of `vite-plugin-pwa` so **npm can resolve cleanly on Vite 8** (the latter’s published peer range still caps at Vite 7).

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build (client + service worker)
- `npm run preview` — preview the build (use this to verify install / SW)
- `npm run server` — Places API proxy on port `8787` (or `PORT`)
- `npm run test` — Node test runner: Places proxy (mocked `fetch`) plus client POI session / Maps URL helpers in `src/poiSession.test.ts`
- `npm run check` — `svelte-check`, Vite config TS, service worker TS, and server TS

## Dependency bumps

Ranges in `package.json` track current **latest** where compatible (`npm-check-updates` / `npm view`). Re-run `npx npm-check-updates -u && npm install` periodically for a greenfield app.
