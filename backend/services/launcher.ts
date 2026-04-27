import path from "path";
import fs from "fs";
import os from "os";
import net from "net";
import { app } from "electron";
import { spawn, ChildProcess } from "child_process";
import { getProfile, updateProfile } from "./profile";
import { getDb } from "../db";
import type { FingerprintConfig, Profile, Proxy, ProxyKind } from "../../shared/types";
import { buildInjectionScript } from "./injection";

interface RunningInstance {
  profileId: string;
  folderId: string;
  process: ChildProcess;
  port: number;
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

// Vision chrome lives bundled in the project. In dev that's
// `<repo>/chromium/vision/`; in a packaged build electron-builder ships the
// folder under `<resourcesPath>/vision/` via extraResources. Layouts:
//   <root>/chrome.exe                   (flat)
//   <root>/<version>/chrome.exe         (Vision's versioned layout)
// When multiple version folders are present, the most recently modified wins.
function visionRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "vision")
    : path.join(process.cwd(), "chromium", "vision");
}

export function resolveChromiumBinary(): string | null {
  if (process.platform !== "win32") return null;
  const root = visionRoot();
  if (!fs.existsSync(root)) return null;
  const flat = path.join(root, "chrome.exe");
  if (fs.existsSync(flat)) return flat;
  const candidates = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(root, e.name);
      return { dir, mtime: fs.statSync(dir).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  for (const c of candidates) {
    const exe = path.join(c.dir, "chrome.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("Could not allocate free port"));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

export interface ProxyOverride {
  kind: ProxyKind;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface LaunchOptions {
  args?: string[];
  proxyOverride?: ProxyOverride | null;
}

function buildProxyArg(proxy: Pick<Proxy, "kind" | "host" | "port"> | null): string[] {
  if (!proxy) return [];
  const scheme = proxy.kind === "socks5" ? "socks5" : "http";
  return [`--proxy-server=${scheme}://${proxy.host}:${proxy.port}`];
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

export async function launchProfile(
  profileId: string,
  opts: LaunchOptions = {},
): Promise<{ pid: number; port: number }> {
  if (running.has(profileId)) throw new Error("Profile already running");

  const profile = getProfile(profileId);
  if (!profile) throw new Error("Profile not found");

  const proxy: Pick<Proxy, "kind" | "host" | "port" | "username" | "password"> | null =
    opts.proxyOverride
      ? {
          kind: opts.proxyOverride.kind,
          host: opts.proxyOverride.host,
          port: opts.proxyOverride.port,
          username: opts.proxyOverride.username,
          password: opts.proxyOverride.password,
        }
      : profile.proxyId
      ? getProxyById(profile.proxyId)
      : null;

  const chromium = resolveChromiumBinary();
  if (!chromium) {
    throw new Error(
      `Vision chrome not found. Copy Vision's chrome folder into ` +
        `${visionRoot()} (either chrome.exe directly or a versioned subfolder ` +
        `like 147.21/chrome.exe).`,
    );
  }

  writeInjectionScript(profile);
  const debugPort = await pickFreePort();

  const args = [
    `--user-data-dir=${profileDataDir(profile.id)}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate",
    ...buildProxyArg(proxy),
    ...fingerprintFlags(profile.fingerprint),
    ...(opts.args ?? []),
    "about:blank",
  ];

  const child = spawn(chromium, args, {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TZ:
        profile.fingerprint.timezone === "auto"
          ? process.env.TZ ?? ""
          : profile.fingerprint.timezone,
    },
  });

  running.set(profileId, {
    profileId,
    folderId: profile.folderId,
    process: child,
    port: debugPort,
    startedAt: Date.now(),
  });

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

  return { pid: child.pid ?? -1, port: debugPort };
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

export interface RunningInfo {
  folderId: string;
  profileId: string;
  port: number;
  startedAt: number;
}

export function listRunning(): RunningInfo[] {
  return [...running.values()].map((r) => ({
    folderId: r.folderId,
    profileId: r.profileId,
    port: r.port,
    startedAt: r.startedAt,
  }));
}

export function getRunning(profileId: string): RunningInfo | null {
  const r = running.get(profileId);
  if (!r) return null;
  return { folderId: r.folderId, profileId: r.profileId, port: r.port, startedAt: r.startedAt };
}
