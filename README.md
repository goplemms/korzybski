# Restaurant Randomizer (PWA)

Svelte 5 + Vite + TypeScript. Local-first shell: yes / no / skip adjusts placeholder scores; swap in your ranking algorithm when ready.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build (includes PWA service worker)
- `npm run preview` — preview the build
- `npm run check` — `svelte-check` and Node TS project

`vite-plugin-pwa` is used with `legacy-peer-deps` because its peer range does not yet list Vite 8; the production build is verified against Vite 8.
