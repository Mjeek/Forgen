import type { FingerprintConfig, Platform } from "../../shared/types";

// Coherent fingerprint bundles. The point of a "smart" generator isn't just
// to randomize — it's to pick values that go together. A Windows 11 UA with
// an Apple GPU is an instant giveaway. So each bundle locks platform + UA +
// vendor/renderer combinations that occur in the wild.

interface GpuBundle {
  vendor: string;
  renderer: string;
}

interface PlatformBundle {
  platform: Platform;
  userAgents: string[];
  resolutions: string[];
  gpus: GpuBundle[];
  cpuCores: number[];
  memoryGb: number[];
  timezones: string[];
  languages: string[];
}

const BUNDLES: PlatformBundle[] = [
  {
    platform: "windows",
    userAgents: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    ],
    resolutions: ["1920x1080", "1536x864", "1366x768", "2560x1440", "1440x900"],
    gpus: [
      { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon (TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    ],
    cpuCores: [4, 8, 12, 16],
    memoryGb: [8, 16, 32],
    timezones: ["Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Singapore"],
    languages: ["en-US", "en-GB", "de-DE", "fr-FR"],
  },
  {
    platform: "macos",
    userAgents: [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    ],
    resolutions: ["2560x1600", "2880x1800", "1920x1200", "1440x900"],
    gpus: [
      { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M1, OpenGL 4.1)" },
      { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M2, OpenGL 4.1)" },
      { vendor: "Google Inc. (Apple)", renderer: "ANGLE (Apple, Apple M3 Pro, OpenGL 4.1)" },
      { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics OpenGL Engine, OpenGL 4.1)" },
    ],
    cpuCores: [8, 10, 12],
    memoryGb: [8, 16, 32, 64],
    timezones: ["America/Los_Angeles", "America/New_York", "Europe/London"],
    languages: ["en-US", "en-GB"],
  },
  {
    platform: "linux",
    userAgents: [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    ],
    resolutions: ["1920x1080", "2560x1440", "1366x768"],
    gpus: [
      { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3070/PCIe/SSE2, OpenGL 4.5)" },
      { vendor: "Google Inc. (Mesa)", renderer: "ANGLE (Mesa, llvmpipe, OpenGL 4.5)" },
    ],
    cpuCores: [4, 8, 16],
    memoryGb: [8, 16, 32],
    timezones: ["Europe/Berlin", "America/New_York", "Asia/Tokyo"],
    languages: ["en-US", "de-DE"],
  },
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const DEFAULT_PROTECTED_PORTS = [3389, 5900, 5901, 5800, 7070, 6568, 5938, 1080, 8080, 3128, 3030];

export function smartFingerprint(preferredPlatform?: Platform): FingerprintConfig {
  const bundle = preferredPlatform
    ? BUNDLES.find((b) => b.platform === preferredPlatform) ?? BUNDLES[0]
    : pick(BUNDLES);
  const gpu = pick(bundle.gpus);
  return {
    platform: bundle.platform,
    userAgent: pick(bundle.userAgents),
    webrtcMode: "auto",
    canvas: "noise",
    webgl: "noise",
    audio: "real",
    clientRects: "noise",
    timezone: "auto",
    language: "auto",
    geolocation: "auto",
    vendor: gpu.vendor,
    renderer: gpu.renderer,
    cpuCores: pick(bundle.cpuCores),
    memoryGb: pick(bundle.memoryGb),
    screenMode: "auto",
    resolution: pick(bundle.resolutions),
    mediaDevices: "real",
    doNotTrack: false,
    portsToProtect: [...DEFAULT_PROTECTED_PORTS],
  };
}

export function defaultFingerprint(): FingerprintConfig {
  return smartFingerprint("windows");
}

export function listGpuBundlesFor(platform: Platform): GpuBundle[] {
  return BUNDLES.find((b) => b.platform === platform)?.gpus ?? [];
}

export function listResolutionsFor(platform: Platform): string[] {
  return BUNDLES.find((b) => b.platform === platform)?.resolutions ?? ["1920x1080"];
}
