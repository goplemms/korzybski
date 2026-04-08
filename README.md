# Restaurant Randomizer (PWA)

Svelte 5 + Vite 8 + TypeScript. Local-first shell: yes / no / skip adjusts placeholder scores; swap in your ranking algorithm when ready.

## PWA

**Serwist** (`@serwist/vite`, `serwist`, `@serwist/window`) drives the service worker and precache. The web app manifest lives at `public/manifest.webmanifest`. Service worker source: `src/sw.ts` (built to `dist/sw.js`).

We use Serwist instead of `vite-plugin-pwa` so **npm can resolve cleanly on Vite 8** (the latter’s published peer range still caps at Vite 7).

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build (client + service worker)
- `npm run preview` — preview the build (use this to verify install / SW)
- `npm run check` — `svelte-check`, Vite config TS, and service worker TS

## Dependency bumps

Ranges in `package.json` track current **latest** where compatible (`npm-check-updates` / `npm view`). Re-run `npx npm-check-updates -u && npm install` periodically for a greenfield app.
