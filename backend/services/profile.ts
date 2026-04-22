import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { Profile, FingerprintConfig } from "../../shared/types";
import { smartFingerprint, defaultFingerprint } from "./fingerprint";
import { ensureDefaultFolder } from "./folder";

interface ProfileRow {
  id: string;
  name: string;
  folder_id: string;
  browser_kind: string;
  proxy_id: string | null;
  status_id: string | null;
  notes: string;
  fingerprint_json: string;
  cookies: string | null;
  last_launched_at: number | null;
  work_timer_ms: number;
  created_at: number;
  updated_at: number;
}

function toProfile(row: ProfileRow, tagIds: string[]): Profile {
  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    browserKind: (row.browser_kind as Profile["browserKind"]) || "chrome",
    proxyId: row.proxy_id ?? undefined,
    statusId: row.status_id ?? undefined,
    notes: row.notes,
    fingerprint: JSON.parse(row.fingerprint_json) as FingerprintConfig,
    cookies: row.cookies ?? undefined,
    lastLaunchedAt: row.last_launched_at ?? undefined,
    workTimerMs: row.work_timer_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds,
  };
}

function getTagIds(profileId: string): string[] {
  return getDb()
    .prepare<[string], { tag_id: string }>("SELECT tag_id FROM profile_tags WHERE profile_id = ?")
    .all(profileId)
    .map((r) => r.tag_id);
}

export function listProfiles(folderId?: string): Profile[] {
  const rows = folderId
    ? getDb()
        .prepare<[string], ProfileRow>("SELECT * FROM profiles WHERE folder_id = ? ORDER BY created_at DESC")
        .all(folderId)
    : getDb().prepare<[], ProfileRow>("SELECT * FROM profiles ORDER BY created_at DESC").all();
  return rows.map((r) => toProfile(r, getTagIds(r.id)));
}

export function getProfile(id: string): Profile | null {
  const row = getDb().prepare<[string], ProfileRow>("SELECT * FROM profiles WHERE id = ?").get(id);
  if (!row) return null;
  return toProfile(row, getTagIds(id));
}

export interface CreateProfileInput {
  name: string;
  folderId?: string;
  browserKind?: Profile["browserKind"];
  proxyId?: string;
  statusId?: string;
  tagIds?: string[];
  notes?: string;
  fingerprint?: FingerprintConfig;
  cookies?: string;
  smart?: boolean;
}

export function createProfile(input: CreateProfileInput): Profile {
  const id = nanoid();
  const folderId = input.folderId ?? ensureDefaultFolder().id;
  const now = Date.now();
  const fp = input.fingerprint ?? (input.smart ? smartFingerprint() : defaultFingerprint());

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO profiles
       (id, name, folder_id, browser_kind, proxy_id, status_id, notes, fingerprint_json, cookies, work_timer_ms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).run(
      id, input.name, folderId, input.browserKind ?? "chrome",
      input.proxyId ?? null, input.statusId ?? null, input.notes ?? "",
      JSON.stringify(fp), input.cookies ?? null, now, now,
    );
    for (const tagId of input.tagIds ?? []) {
      db.prepare("INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) VALUES (?, ?)").run(id, tagId);
    }
  });
  tx();
  return getProfile(id)!;
}

export function updateProfile(id: string, patch: Partial<Profile>): Profile {
  const existing = getDb().prepare<[string], ProfileRow>("SELECT * FROM profiles WHERE id = ?").get(id);
  if (!existing) throw new Error("Profile not found");
  const now = Date.now();
  const next = {
    name: patch.name ?? existing.name,
    folder_id: patch.folderId ?? existing.folder_id,
    browser_kind: patch.browserKind ?? existing.browser_kind,
    proxy_id: patch.proxyId ?? existing.proxy_id,
    status_id: patch.statusId ?? existing.status_id,
    notes: patch.notes ?? existing.notes,
    fingerprint_json: patch.fingerprint ? JSON.stringify(patch.fingerprint) : existing.fingerprint_json,
    cookies: patch.cookies ?? existing.cookies,
    last_launched_at: patch.lastLaunchedAt ?? existing.last_launched_at,
    work_timer_ms: patch.workTimerMs ?? existing.work_timer_ms,
  };

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE profiles SET name=?, folder_id=?, browser_kind=?, proxy_id=?, status_id=?, notes=?,
       fingerprint_json=?, cookies=?, last_launched_at=?, work_timer_ms=?, updated_at=? WHERE id=?`,
    ).run(
      next.name, next.folder_id, next.browser_kind, next.proxy_id, next.status_id, next.notes,
      next.fingerprint_json, next.cookies, next.last_launched_at, next.work_timer_ms, now, id,
    );
    if (patch.tagIds) {
      db.prepare("DELETE FROM profile_tags WHERE profile_id = ?").run(id);
      for (const tagId of patch.tagIds) {
        db.prepare("INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) VALUES (?, ?)").run(id, tagId);
      }
    }
  });
  tx();
  return getProfile(id)!;
}

export function deleteProfile(id: string): void {
  getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
}

export function bulkDelete(ids: string[]): number {
  const stmt = getDb().prepare("DELETE FROM profiles WHERE id = ?");
  const tx = getDb().transaction((arr: string[]) => {
    for (const id of arr) stmt.run(id);
  });
  tx(ids);
  return ids.length;
}

export function bulkMove(ids: string[], folderId: string): number {
  const stmt = getDb().prepare("UPDATE profiles SET folder_id = ?, updated_at = ? WHERE id = ?");
  const now = Date.now();
  const tx = getDb().transaction((arr: string[]) => {
    for (const id of arr) stmt.run(folderId, now, id);
  });
  tx(ids);
  return ids.length;
}

export function bulkSetStatus(ids: string[], statusId: string | null): number {
  const stmt = getDb().prepare("UPDATE profiles SET status_id = ?, updated_at = ? WHERE id = ?");
  const now = Date.now();
  const tx = getDb().transaction((arr: string[]) => {
    for (const id of arr) stmt.run(statusId, now, id);
  });
  tx(ids);
  return ids.length;
}
