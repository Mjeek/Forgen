# Forgen — Patched Chromium

This directory contains the patch set that turns upstream Chromium into the
**Forgen Browser** — the binary that Forgen's Electron app launches per
profile. Overrides are applied in C++ inside Blink/Chromium, not at the JS
layer, so common detection tricks (`Function.prototype.toString` leaks,
re-reading values via iframes, `window.top` access, timing comparisons) don't
reveal that fingerprint properties have been tampered with.

## Target version

The patches are maintained against a **pinned** Chromium revision. See
`CHROMIUM_VERSION.txt` — that's the branch we rebase patches onto.

Bumping: upstream rebases are tracked as separate commits so a rebase can be
revisited quickly when a file moves.

## Build from scratch (Windows)

> Patching and building Chromium is a large undertaking. The first build
> takes **2–8 hours** and needs **~100 GB** of disk. Incremental rebuilds
> after editing a patch are typically 10–60 minutes. You need Visual Studio
> 2022 with the Desktop C++ workload + Windows 11 SDK installed.

1. Install prerequisites:

   - Visual Studio 2022 (Community is fine), with the "Desktop development
     with C++" workload, "Windows 11 SDK (10.0.22621.x)", and the
     "C++ ATL/MFC" components.
   - Python 3.11+ on PATH.
   - Git for Windows.

2. Fetch Chromium + depot_tools (run from the repo root):

   ```powershell
   npm run chromium:fetch
   ```

   This clones depot_tools into `chromium/depot_tools/` and uses
   `fetch chromium` to pull the source into `chromium/src/` on the pinned
   branch. Expect this step to take 30–90 minutes and use ~40 GB.

3. Apply Forgen patches:

   ```powershell
   npm run chromium:patch
   ```

   Patches live in `chromium/patches/` and are applied in order. They add:

   - A `--forgen-profile=<path>` command-line switch.
   - A `ForgenConfig` singleton that reads a per-profile JSON blob.
   - Navigator / Screen / WebGL / Canvas / Audio / WebRTC overrides that
     consult the singleton.

4. Build:

   ```powershell
   npm run chromium:build
   ```

   The resulting binary is written to `chromium/out/Release/chrome.exe`.
   Forgen's launcher (`backend/services/launcher.ts`) checks this path first
   and falls back to the upstream binary + JS-layer injection only if the
   patched build isn't present.

## Patch structure

Each patch file in `chromium/patches/` is a standard unified diff. Naming
uses a numeric prefix so they apply in a deterministic order.

| Patch | Adds |
|-------|------|
| `0001-forgen-config-loader.patch` | `--forgen-profile` switch + JSON loader singleton |
| `0002-navigator-overrides.patch` | UA, platform, hardwareConcurrency, deviceMemory, languages, webdriver |
| `0003-screen-overrides.patch` | width, height, availWidth, availHeight, colorDepth |
| `0004-webgl-vendor-renderer.patch` | UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER_WEBGL |
| `0005-canvas-noise.patch` | Per-profile seeded pixel noise on readback |
| `0006-audio-noise.patch` | AudioBuffer readback noise |
| `0007-webrtc-leak-protection.patch` | Force proxying + disable mDNS host candidates |
| `0008-timezone-locale.patch` | `ICU::TimeZone::createDefault` override |
| `0009-client-rects.patch` | getBoundingClientRect / getClientRects jitter |
| `0010-media-devices.patch` | MediaDevices.enumerateDevices() swap-out |

Patches are kept **small and focused** — one concern per file — so upstream
rebases can resolve conflicts surgically rather than re-deriving everything.

## Using Vision's patched chrome instead

If you have a Vision subscription and Vision installed, the launcher will
pick up Vision's patched binary automatically from
`%APPDATA%\Vision\browser\chrome\<version>\chrome.exe`. Resolution order in
`backend/services/launcher.ts`:

1. `FORGEN_CHROMIUM` environment variable
2. Forgen's own patched build at `chromium/out/Release/chrome.exe`
3. Vision's patched chrome under `%APPDATA%\Vision\browser\chrome\`
   (newest version folder wins)
4. `@puppeteer/browsers`-downloaded Chromium under `userData/chromium`

When Forgen runs on Vision's binary, Vision's chrome ignores our
`--forgen-profile` switch and the C++ singleton in
`0001-forgen-config-loader.patch` does not load. Fingerprint overrides come
from the JS injection layer in `backend/services/injection.ts`. This works
end-to-end but is weaker than running Forgen's own patched build.

## Why JS-layer injection exists too

`backend/services/injection.ts` implements the same overrides in JS as a
**fallback** for developers who haven't built the fork yet. It's not as
robust (a motivated detector can still catch it) but lets the app be tested
end-to-end without the multi-hour build. Once the patched build is in place,
both layers are active and the C++ layer wins for anything they both touch —
they don't conflict because both read the same per-profile config.

## Config format

The patched build reads a JSON blob whose path is passed via
`--forgen-profile=<path>`. Schema lives in `shared/types.ts` as
`FingerprintConfig` (the file the launcher writes to
`<userData>/profiles/<id>/forgen-profile.json`).

## Known follow-ups

- [ ] Font-list whitelisting (Blink font cache)
- [ ] Battery API spoofing
- [ ] Sensor APIs
- [ ] Speech Synthesis voices
- [ ] `chrome://gpu` consistency
- [ ] Reproducible builds + signing
