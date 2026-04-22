# Forgen

Anti-detect browser. Electron-based control panel + patched Chromium fork,
per-profile fingerprint isolation, proxy management.

## Stack

- **Electron 32** shell + **React 18** / **Vite** renderer
- **Node.js / better-sqlite3** backend (single local DB, no cloud)
- **puppeteer-core** + a pinned **patched Chromium** fork (see `chromium/`)
- **TailwindCSS** for the UI (Forgen blue — `brand` palette in `tailwind.config.js`)

## Install

```bash
npm install
```

## Run (dev)

```bash
npm run dev
```

Boots Vite on `localhost:5173`, compiles the Electron main process, and
launches the desktop window pointing at the dev server. Hot-reload works on
the renderer; the main process needs a restart if you edit `electron/` or
`backend/`.

## Build (Windows)

```bash
npm run package
```

Produces an NSIS installer under `release/`.

## Chromium fork

The Electron app is just the control panel. Every profile launches a
separate **patched Chromium** binary with its own `--user-data-dir`, proxy
and fingerprint config. Until you've built the fork, the launcher falls back
to upstream Chromium + JS-layer fingerprint injection (works but weaker).

```bash
npm run chromium:fetch    # 30–90 min, ~40 GB
npm run chromium:patch    # seconds
npm run chromium:build    # 2–8 hours first time
```

See [`chromium/README.md`](./chromium/README.md) for full details.

## Layout

```
electron/           Electron main + preload
backend/            Node services (DB, auth, profiles, proxies, launcher,
                    fingerprint generator, JS-injection fallback)
renderer/           React UI (sidebar, tabs, drawers)
shared/             Types + IPC channel constants used by both sides
chromium/           Patch set + build scripts for the patched fork
```

## License

MIT.
