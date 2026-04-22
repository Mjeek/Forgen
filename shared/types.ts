// Shared domain types used by both the Electron main process and the renderer.
// Keep this file framework-free so either side can import it without pulling
// node-only or browser-only dependencies.

export type Platform = "windows" | "macos" | "linux";
export type BrowserKind = "chrome" | "firefox";
export type ProxyKind = "http" | "https" | "socks5" | "ssh";
export type FingerprintMode = "auto" | "manual" | "noise" | "real" | "off";

export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Status {
  id: string;
  name: string;
  color: string;
}

export interface Proxy {
  id: string;
  name: string;
  kind: ProxyKind;
  host: string;
  port: number;
  username?: string;
  password?: string;
  changeIpUrl?: string;
  country?: string;
  city?: string;
  lastCheckedAt?: number;
  lastStatus?: "ok" | "fail" | "unknown";
  createdAt: number;
}

export interface FingerprintConfig {
  platform: Platform;
  userAgent: string;
  webrtcMode: "auto" | "real" | "manual" | "disabled";
  webrtcIp?: string;
  canvas: FingerprintMode;
  webgl: FingerprintMode;
  audio: FingerprintMode;
  clientRects: FingerprintMode;
  timezone: "auto" | string;
  language: "auto" | string;
  geolocation: "auto" | "prompt" | "block" | { lat: number; lon: number };
  vendor: string;
  renderer: string;
  cpuCores: number;
  memoryGb: number;
  screenMode: "auto" | "manual";
  resolution: string;
  mediaDevices: "real" | "fake";
  webcam?: string;
  doNotTrack: boolean;
  portsToProtect: number[];
}

export interface Profile {
  id: string;
  name: string;
  folderId: string;
  browserKind: BrowserKind;
  proxyId?: string;
  tagIds: string[];
  statusId?: string;
  notes: string;
  fingerprint: FingerprintConfig;
  cookies?: string;
  lastLaunchedAt?: number;
  workTimerMs: number;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  // passwordHash lives in DB only — never sent to renderer
  createdAt: number;
}

export interface Session {
  user: User | null;
}
