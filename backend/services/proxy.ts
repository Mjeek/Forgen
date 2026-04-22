import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { Proxy, ProxyKind } from "../../shared/types";

interface ProxyRow {
  id: string;
  name: string;
  kind: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  change_ip_url: string | null;
  country: string | null;
  city: string | null;
  last_checked_at: number | null;
  last_status: string | null;
  created_at: number;
}

const toProxy = (r: ProxyRow): Proxy => ({
  id: r.id,
  name: r.name,
  kind: r.kind as ProxyKind,
  host: r.host,
  port: r.port,
  username: r.username ?? undefined,
  password: r.password ?? undefined,
  changeIpUrl: r.change_ip_url ?? undefined,
  country: r.country ?? undefined,
  city: r.city ?? undefined,
  lastCheckedAt: r.last_checked_at ?? undefined,
  lastStatus: (r.last_status as "ok" | "fail" | "unknown" | null) ?? undefined,
  createdAt: r.created_at,
});

export function listProxies(): Proxy[] {
  return getDb()
    .prepare<[], ProxyRow>("SELECT * FROM proxies ORDER BY created_at DESC")
    .all()
    .map(toProxy);
}

export interface CreateProxyInput {
  name?: string;
  kind: ProxyKind;
  host: string;
  port: number;
  username?: string;
  password?: string;
  changeIpUrl?: string;
}

export function createProxy(input: CreateProxyInput): Proxy {
  const id = nanoid();
  const name = input.name?.trim() || `${input.host}:${input.port}`;
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO proxies (id, name, kind, host, port, username, password, change_ip_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, name, input.kind, input.host, input.port, input.username ?? null, input.password ?? null, input.changeIpUrl ?? null, now);
  return toProxy(
    getDb().prepare<[string], ProxyRow>("SELECT * FROM proxies WHERE id = ?").get(id)!,
  );
}

export function updateProxy(id: string, patch: Partial<Proxy>): Proxy {
  const existing = getDb()
    .prepare<[string], ProxyRow>("SELECT * FROM proxies WHERE id = ?")
    .get(id);
  if (!existing) throw new Error("Proxy not found");
  const next = {
    name: patch.name ?? existing.name,
    kind: (patch.kind ?? existing.kind) as string,
    host: patch.host ?? existing.host,
    port: patch.port ?? existing.port,
    username: patch.username ?? existing.username,
    password: patch.password ?? existing.password,
    change_ip_url: patch.changeIpUrl ?? existing.change_ip_url,
    country: patch.country ?? existing.country,
    city: patch.city ?? existing.city,
    last_checked_at: patch.lastCheckedAt ?? existing.last_checked_at,
    last_status: patch.lastStatus ?? existing.last_status,
  };
  getDb()
    .prepare(
      `UPDATE proxies SET name=?, kind=?, host=?, port=?, username=?, password=?, change_ip_url=?,
       country=?, city=?, last_checked_at=?, last_status=? WHERE id=?`,
    )
    .run(
      next.name, next.kind, next.host, next.port, next.username, next.password, next.change_ip_url,
      next.country, next.city, next.last_checked_at, next.last_status, id,
    );
  return toProxy({ ...existing, ...next });
}

export function deleteProxy(id: string): void {
  getDb().prepare("DELETE FROM proxies WHERE id = ?").run(id);
}

// Mass-create from pasted lines. Accepted formats per line:
//   host:port
//   host:port:user:pass
//   kind://user:pass@host:port
//   kind://host:port
export function massCreate(text: string, defaultKind: ProxyKind = "http"): Proxy[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Proxy[] = [];
  for (const line of lines) {
    const parsed = parseLine(line, defaultKind);
    if (parsed) out.push(createProxy(parsed));
  }
  return out;
}

function parseLine(line: string, defaultKind: ProxyKind): CreateProxyInput | null {
  // URL-ish form
  const urlMatch = line.match(/^(http|https|socks5|ssh):\/\/(?:([^:@]+)(?::([^@]+))?@)?([^:\/]+):(\d+)/i);
  if (urlMatch) {
    return {
      kind: urlMatch[1].toLowerCase() as ProxyKind,
      username: urlMatch[2] || undefined,
      password: urlMatch[3] || undefined,
      host: urlMatch[4],
      port: parseInt(urlMatch[5], 10),
    };
  }
  // Colon-separated form
  const parts = line.split(":");
  if (parts.length === 2) {
    return { kind: defaultKind, host: parts[0], port: parseInt(parts[1], 10) };
  }
  if (parts.length === 4) {
    return {
      kind: defaultKind,
      host: parts[0],
      port: parseInt(parts[1], 10),
      username: parts[2],
      password: parts[3],
    };
  }
  return null;
}

// Test a proxy by making an outbound request through it to an IP lookup
// service. Uses node's fetch + undici ProxyAgent-compatible path via agents.
// Kept deliberately simple — SOCKS and HTTP are the two supported kinds.
export async function testProxy(id: string): Promise<Proxy> {
  const existing = getDb()
    .prepare<[string], ProxyRow>("SELECT * FROM proxies WHERE id = ?")
    .get(id);
  if (!existing) throw new Error("Proxy not found");

  const proxy = toProxy(existing);
  let status: "ok" | "fail" = "fail";
  let country: string | undefined;
  let city: string | undefined;

  try {
    const info = await lookupViaProxy(proxy);
    if (info) {
      status = "ok";
      country = info.country;
      city = info.city;
    }
  } catch {
    status = "fail";
  }

  return updateProxy(id, {
    lastCheckedAt: Date.now(),
    lastStatus: status,
    country,
    city,
  });
}

async function lookupViaProxy(proxy: Proxy): Promise<{ country: string; city: string } | null> {
  // Lazy-load so type checking doesn't fail if deps aren't present in this
  // exact environment; the launcher ships them in production.
  const { fetch: undiciFetch, ProxyAgent } = await import("undici").catch(() => ({
    fetch: null as unknown,
    ProxyAgent: null as unknown,
  })) as { fetch: typeof fetch | null; ProxyAgent: (new (url: string) => unknown) | null };

  if (!undiciFetch || !ProxyAgent) return null;
  if (proxy.kind === "ssh") return null;

  const auth = proxy.username ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? "")}@` : "";
  const scheme = proxy.kind === "socks5" ? "socks5" : "http";
  const proxyUrl = `${scheme}://${auth}${proxy.host}:${proxy.port}`;
  const agent = new (ProxyAgent as new (url: string) => unknown)(proxyUrl);

  const res = await (undiciFetch as typeof fetch)("https://ipapi.co/json/", {
    // @ts-expect-error undici accepts dispatcher
    dispatcher: agent,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { country_code?: string; city?: string };
  return { country: data.country_code ?? "", city: data.city ?? "" };
}

export async function triggerChangeIp(id: string): Promise<void> {
  const row = getDb()
    .prepare<[string], ProxyRow>("SELECT * FROM proxies WHERE id = ?")
    .get(id);
  if (!row) throw new Error("Proxy not found");
  if (!row.change_ip_url) throw new Error("No change-IP URL set for this proxy");
  await fetch(row.change_ip_url, { method: "GET", signal: AbortSignal.timeout(30000) });
}
