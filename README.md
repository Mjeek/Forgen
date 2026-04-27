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

## Browser binary

The Electron app is just the control panel. Every profile launches a
separate Chromium binary with its own `--user-data-dir`, proxy and
fingerprint config. Forgen ships against **Vision's patched chrome**:
copy your Vision install's chrome folder (from
`%APPDATA%\Vision\browser\chrome\`) into `chromium/vision/`. The launcher
looks there and nowhere else.

See [`chromium/README.md`](./chromium/README.md) for layout details and
the patch set kept against upstream Chromium for reference.

## Vision-compatible local API

Forgen exposes the same HTTP control surface as Vision so existing
Puppeteer/Playwright/Selenium scripts work with only the `X-Token` swapped
out. Bound to `127.0.0.1:3030` by default (override with `FORGEN_API_PORT`
if Vision is also running).

| Method | Path                                  | Returns                                          |
|--------|---------------------------------------|--------------------------------------------------|
| GET    | `/list`                               | `[{folder_id, profile_id, port}, ...]`           |
| GET    | `/start/{folderId}/{profileId}`       | `{folder_id, profile_id, port}`                  |
| POST   | `/start/{folderId}/{profileId}`       | `{folder_id, profile_id, port}` — body accepts `args`, `proxy` |
| GET    | `/stop/{folderId}/{profileId}`        | `{message}`                                      |

All requests require an `X-Token` header. The token is generated on first
boot and stored in the local SQLite DB (`app_config.api_token`) — fetch or
regenerate it from the Settings UI or via IPC. The `port` returned by
`/start` is a Chrome remote-debugging port; connect with
`puppeteer.connect({ browserURL: 'http://127.0.0.1:<port>' })` or
`chromium.connectOverCDP('http://127.0.0.1:<port>')`.

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
