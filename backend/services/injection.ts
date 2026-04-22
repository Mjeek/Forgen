import type { FingerprintConfig } from "../../shared/types";

// Builds a JS string that is written to disk per-profile and loaded into
// every page before other scripts run. This is the "fallback" layer —
// overrides done in pure JS. The patched Chromium fork overrides the same
// surfaces at the C++ layer, but both speak the same per-profile config so
// the two can coexist (patched wins, JS fills gaps).
//
// The script reads a JSON blob that is inlined at build-time per-profile.
// We deliberately avoid any "function.toString()" leaks by wrapping each
// proxy function with a Proxy handler that forwards toString to the original.

export function buildInjectionScript(fp: FingerprintConfig): string {
  const serialized = JSON.stringify(fp);
  return `/* forgen injection — generated */
(() => {
  const CONFIG = ${serialized};

  const tsOrig = Function.prototype.toString;
  const faked = new WeakSet();
  Function.prototype.toString = function () {
    if (faked.has(this)) return "function " + (this.name || "") + "() { [native code] }";
    return tsOrig.call(this);
  };

  const wrap = (name, fn) => {
    Object.defineProperty(fn, "name", { value: name, configurable: true });
    faked.add(fn);
    return fn;
  };

  const defineOn = (target, prop, value) => {
    try {
      Object.defineProperty(target, prop, {
        get: wrap("get " + prop, () => value),
        configurable: true,
      });
    } catch {}
  };

  // --- navigator ------------------------------------------------------
  defineOn(Navigator.prototype, "userAgent", CONFIG.userAgent);
  defineOn(Navigator.prototype, "platform", platformToken(CONFIG.platform));
  defineOn(Navigator.prototype, "hardwareConcurrency", CONFIG.cpuCores);
  defineOn(Navigator.prototype, "deviceMemory", CONFIG.memoryGb);
  if (CONFIG.language !== "auto") {
    defineOn(Navigator.prototype, "language", CONFIG.language);
    defineOn(Navigator.prototype, "languages", Object.freeze([CONFIG.language]));
  }
  defineOn(Navigator.prototype, "doNotTrack", CONFIG.doNotTrack ? "1" : null);
  defineOn(Navigator.prototype, "webdriver", false);

  function platformToken(p) {
    switch (p) { case "windows": return "Win32"; case "macos": return "MacIntel"; case "linux": return "Linux x86_64"; default: return "Win32"; }
  }

  // --- screen ---------------------------------------------------------
  try {
    const [sw, sh] = String(CONFIG.resolution).split("x").map(Number);
    if (sw && sh) {
      defineOn(Screen.prototype, "width", sw);
      defineOn(Screen.prototype, "height", sh);
      defineOn(Screen.prototype, "availWidth", sw);
      defineOn(Screen.prototype, "availHeight", sh - 40);
      defineOn(Screen.prototype, "colorDepth", 24);
      defineOn(Screen.prototype, "pixelDepth", 24);
    }
  } catch {}

  // --- WebGL ----------------------------------------------------------
  const patchWebGL = (proto) => {
    if (!proto) return;
    const origGetParam = proto.getParameter;
    proto.getParameter = wrap("getParameter", function (p) {
      // UNMASKED_VENDOR_WEBGL = 0x9245, UNMASKED_RENDERER_WEBGL = 0x9246
      if (p === 0x9245) return CONFIG.vendor;
      if (p === 0x9246) return CONFIG.renderer;
      return origGetParam.call(this, p);
    });
  };
  patchWebGL(WebGLRenderingContext && WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== "undefined") patchWebGL(WebGL2RenderingContext.prototype);

  // --- Canvas noise ---------------------------------------------------
  if (CONFIG.canvas === "noise") {
    const hash = CONFIG.id || Math.random().toString(36).slice(2);
    const noiseFor = (seed) => {
      let h = 0;
      for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
      return (x) => ((h = (h * 1664525 + 1013904223) & 0xffffffff), ((h >>> 0) % 3) - 1 + x);
    };
    const noise = noiseFor(String(hash));
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = wrap("toDataURL", function (...a) {
      try {
        const ctx = this.getContext("2d");
        if (ctx) {
          const img = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = Math.max(0, Math.min(255, noise(img.data[i])));
          }
          ctx.putImageData(img, 0, 0);
        }
      } catch {}
      return origToDataURL.apply(this, a);
    });
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = wrap("getImageData", function (...a) {
      const img = origGetImageData.apply(this, a);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = Math.max(0, Math.min(255, noise(img.data[i])));
      }
      return img;
    });
  }

  // --- Audio noise ----------------------------------------------------
  if (CONFIG.audio === "noise" && typeof AudioBuffer !== "undefined") {
    const orig = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = wrap("getChannelData", function (...a) {
      const data = orig.apply(this, a);
      for (let i = 0; i < data.length; i += 500) data[i] = data[i] + (Math.random() - 0.5) * 1e-7;
      return data;
    });
  }

  // --- Client rects ---------------------------------------------------
  if (CONFIG.clientRects === "noise") {
    const jitter = () => (Math.random() - 0.5) * 0.0001;
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = wrap("getBoundingClientRect", function () {
      const r = origRect.call(this);
      return new DOMRect(r.x + jitter(), r.y + jitter(), r.width + jitter(), r.height + jitter());
    });
  }

  // --- Timezone -------------------------------------------------------
  if (CONFIG.timezone && CONFIG.timezone !== "auto") {
    try {
      const origResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = wrap("resolvedOptions", function () {
        return Object.assign(origResolved.call(this), { timeZone: CONFIG.timezone });
      });
    } catch {}
  }

  // --- WebRTC leak protection ----------------------------------------
  if (CONFIG.webrtcMode === "disabled") {
    try {
      window.RTCPeerConnection = undefined;
      window.webkitRTCPeerConnection = undefined;
    } catch {}
  }
})();
`;
}
