import http from "http";
import { URL } from "url";
import { getApiToken } from "./api-token";
import { listProfiles } from "./profile";
import {
  launchProfile,
  stopProfile,
  isRunning,
  listRunning,
  getRunning,
  type LaunchOptions,
  type ProxyOverride,
} from "./launcher";
import type { ProxyKind } from "../../shared/types";

// Local HTTP API on 127.0.0.1:3030. Mirrors Vision's surface so existing
// scripts that target Vision (Puppeteer, Playwright, Selenium driving the
// browser via the per-profile CDP port returned in /start responses) work
// against Forgen with only the X-Token swapped out.
//
// Endpoints (all require X-Token header):
//   GET  /list                                -> [{folder_id, profile_id, port}, ...]
//   GET  /start/{folderId}/{profileId}        -> {folder_id, profile_id, port}
//   POST /start/{folderId}/{profileId}        -> {folder_id, profile_id, port}
//        body: {"args": ["--headless"], "proxy": {"type":"http","address":"...","port":1080,"username":"...","password":"..."}}
//   GET  /stop/{folderId}/{profileId}         -> {message}

const DEFAULT_PORT = 3030;
const HOST = "127.0.0.1";

let server: http.Server | null = null;

interface StartBody {
  args?: string[];
  proxy?: {
    type?: string;
    address?: string;
    port?: number;
    username?: string;
    password?: string;
  };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(text);
}

function authorized(req: http.IncomingMessage): boolean {
  const got = req.headers["x-token"];
  if (typeof got !== "string") return false;
  return got === getApiToken();
}

function parseProxyOverride(input: StartBody["proxy"]): ProxyOverride | null {
  if (!input || !input.address || !input.port) return null;
  const t = (input.type ?? "http").toLowerCase();
  const kind: ProxyKind =
    t === "socks5" ? "socks5" : t === "https" ? "https" : t === "ssh" ? "ssh" : "http";
  return {
    kind,
    host: input.address,
    port: input.port,
    username: input.username,
    password: input.password,
  };
}

function profileExists(folderId: string, profileId: string): boolean {
  return listProfiles(folderId).some((p) => p.id === profileId);
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${HOST}`);
  const segments = url.pathname.split("/").filter(Boolean);
  const method = req.method ?? "GET";

  if (!authorized(req)) {
    send(res, 401, { error: "Missing or invalid X-Token" });
    return;
  }

  // GET /list
  if (segments.length === 1 && segments[0] === "list" && method === "GET") {
    send(
      res,
      200,
      listRunning().map((r) => ({
        folder_id: r.folderId,
        profile_id: r.profileId,
        port: r.port,
      })),
    );
    return;
  }

  // GET|POST /start/{folderId}/{profileId}
  if (segments.length === 3 && segments[0] === "start" && (method === "GET" || method === "POST")) {
    const folderId = segments[1];
    const profileId = segments[2];
    if (!profileExists(folderId, profileId)) {
      send(res, 404, { error: `Profile ${profileId} not found in folder ${folderId}` });
      return;
    }
    if (isRunning(profileId)) {
      const info = getRunning(profileId)!;
      send(res, 200, { folder_id: info.folderId, profile_id: info.profileId, port: info.port });
      return;
    }

    let opts: LaunchOptions = {};
    if (method === "POST") {
      const raw = await readBody(req);
      if (raw) {
        try {
          const body = JSON.parse(raw) as StartBody;
          opts = {
            args: Array.isArray(body.args) ? body.args.filter((a) => typeof a === "string") : undefined,
            proxyOverride: parseProxyOverride(body.proxy),
          };
        } catch {
          send(res, 400, { error: "Invalid JSON body" });
          return;
        }
      }
    }

    try {
      const result = await launchProfile(profileId, opts);
      send(res, 200, { folder_id: folderId, profile_id: profileId, port: result.port });
    } catch (err) {
      send(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  // GET /stop/{folderId}/{profileId}
  if (segments.length === 3 && segments[0] === "stop" && method === "GET") {
    const folderId = segments[1];
    const profileId = segments[2];
    if (!isRunning(profileId)) {
      send(res, 404, { error: `Profile ${profileId} is not running` });
      return;
    }
    stopProfile(profileId);
    send(res, 200, { message: `Stopping profile ${profileId} in folder ${folderId}` });
    return;
  }

  send(res, 404, { error: "Not found" });
}

export function startApiServer(): { port: number } {
  if (server) return { port: DEFAULT_PORT };
  const port = Number(process.env.FORGEN_API_PORT) || DEFAULT_PORT;
  server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      try {
        send(res, 500, { error: err instanceof Error ? err.message : String(err) });
      } catch {
        // response already sent
      }
    });
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[forgen] API port ${port} is in use (Vision app probably running). ` +
          `Set FORGEN_API_PORT to use a different port.`,
      );
    } else {
      console.error("[forgen] API server error:", err);
    }
  });
  server.listen(port, HOST, () => {
    console.log(`[forgen] API listening on http://${HOST}:${port}`);
  });
  // Eagerly materialize the token so it's stable before the first request.
  getApiToken();
  return { port };
}

export function stopApiServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
