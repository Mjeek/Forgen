import path from "path";
import fs from "fs";
import os from "os";
import { app } from "electron";
import { spawn, ChildProcess } from "child_process";
import { getProfile, updateProfile } from "./profile";
import { getDb } from "../db";
import type { FingerprintConfig, Profile, Proxy } from "../../shared/types";
import { buildInjectionScript } from "./injection";

interface RunningInstance {
  profileId: string;
  process: ChildProcess;
  startedAt: number;
}

const running = new Map<string, RunningInstance>();

function userDataRoot(): string {
  const p = path.join(app.getPath("userData"), "profiles");
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function profileDataDir(profileId: string): string {
  const p = path.join(userDataRoot(), profileId);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function profileConfigPath(profileId: string): string {
  return path.join(profileDataDir(profileId), "forgen-profile.json");
}

function getProxyById(id: string): Proxy | null {
  const row = getDb()
    .prepare<[string], {
      id: string; name: string; kind: string; host: string; port: number;
      username: string | null; password: string | null; change_ip_url: string | null;
      country: string | null; city: string | null;
      last_checked_at: number | null; last_status: string | null; created_at: number;
    }>("SELECT * FROM proxies WHERE id = ?")
    .get(id);
  if (!row) return null;
  return {
    id: row.id, name: row.name, kind: row.kind as Proxy["kind"],
    host: row.host, port: row.port,
    username: row.username ?? undefined, password: row.password ?? undefined,
    changeIpUrl: row.change_ip_url ?? undefined,
    country: row.country ?? undefined, city: row.city ?? undefined,
    lastCheckedAt: row.last_checked_at ?? undefined,
    lastStatus: (row.last_status as Proxy["lastStatus"]) ?? undefined,
    createdAt: row.created_at,
  };
}

// Location of the patched Chromium binary. In MVP we fall back to any
// Chromium that the user points us at via FORGEN_CHROMIUM env var, or to
// @puppeteer/browsers-downloaded Chromium under userData/chromium.
export function resolveChromiumBinary(): string | null {
  if (process.env.FORGEN_CHROMIUM && fs.existsSync(process.env.FORGEN_CHROMIUM)) {
    return process.env.FORGEN_CHROMIUM;
  }
  const patched = path.join(process.cwd(), "chromium", "out", "Release", "chrome.exe");
  if (fs.existsSync(patched)) return patched;

  const bundled = path.join(app.getPath("userData"), "chromium");
  if (!fs.existsSync(bundled)) return null;
  // Walk one level deep and pick chrome.exe (Windows) or chrome (others).
  const exe = process.platform === "win32" ? "chrome.exe" : "chrome";
  const stack = [bundled];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name === exe) return full;
    }
  }
  return null;
}

function buildProxyArg(proxy: Proxy | null): string[] {
  if (!proxy) return [];
  const scheme = proxy.kind === "socks5" ? "socks5" : "http";
  return [`--proxy-server=${scheme}://${proxy.host}:${proxy.port}`];
}

function writeProfileConfig(profile: Profile, proxy: Proxy | null): string {
  const config = {
    version: 1,
    id: profile.id,
    fingerprint: profile.fingerprint,
    proxy: proxy
      ? {
          kind: proxy.kind, host: proxy.host, port: proxy.port,
          username: proxy.username ?? null, password: proxy.password ?? null,
        }
      : null,
  };
  const file = profileConfigPath(profile.id);
  fs.writeFileSync(file, JSON.stringify(config, null, 2), "utf8");
  return file;
}

function writeInjectionScript(profile: Profile): string {
  const file = path.join(profileDataDir(profile.id), "forgen-injection.js");
  fs.writeFileSync(file, buildInjectionScript(profile.fingerprint), "utf8");
  return file;
}

function fingerprintFlags(fp: FingerprintConfig): string[] {
  const flags: string[] = [];
  flags.push(`--user-agent=${fp.userAgent}`);
  if (fp.language !== "auto") flags.push(`--lang=${fp.language}`);
  const [w, h] = fp.resolution.split("x").map(Number);
  if (w && h) flags.push(`--window-size=${w},${h}`);
  return flags;
}

export async function launchProfile(profileId: string): Promise<{ pid: number }> {
  if (running.has(profileId)) throw new Error("Profile already running");

  const profile = getProfile(profileId);
  if (!profile) throw new Error("Profile not found");

  const proxy = profile.proxyId ? getProxyById(profile.proxyId) : null;
  const chromium = resolveChromiumBinary();
  if (!chromium) {
    throw new Error(
      "Chromium binary not found. Either build the patched Chromium (see chromium/README.md) " +
      "or set FORGEN_CHROMIUM to an existing chrome.exe.",
    );
  }

  writeProfileConfig(profile, proxy);
  writeInjectionScript(profile);

  const args = [
    `--user-data-dir=${profileDataDir(profile.id)}`,
    `--forgen-profile=${profileConfigPath(profile.id)}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
    "--enable-logging=stderr",
    ...buildProxyArg(proxy),
    ...fingerprintFlags(profile.fingerprint),
    "about:blank",
  ];

  const child = spawn(chromium, args, {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      FORGEN_PROFILE_CONFIG: profileConfigPath(profile.id),
      TZ: profile.fingerprint.timezone === "auto" ? (process.env.TZ ?? "") : profile.fingerprint.timezone,
    },
  });

  running.set(profileId, { profileId, process: child, startedAt: Date.now() });

  child.on("exit", () => {
    const inst = running.get(profileId);
    running.delete(profileId);
    if (inst) {
      const elapsed = Date.now() - inst.startedAt;
      const current = getProfile(profileId);
      if (current) {
        updateProfile(profileId, {
          workTimerMs: current.workTimerMs + elapsed,
          lastLaunchedAt: inst.startedAt,
        });
      }
    }
  });

  return { pid: child.pid ?? -1 };
}

export function stopProfile(profileId: string): void {
  const inst = running.get(profileId);
  if (!inst) return;
  if (os.platform() === "win32") {
    spawn("taskkill", ["/pid", String(inst.process.pid), "/T", "/F"]);
  } else {
    inst.process.kill("SIGTERM");
  }
}

export function isRunning(profileId: string): boolean {
  return running.has(profileId);
}

export function listRunning(): string[] {
  return [...running.keys()];
}
