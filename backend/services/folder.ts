import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { Folder } from "../../shared/types";

interface FolderRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: number;
}

const toFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  createdAt: r.created_at,
});

export function listFolders(): Folder[] {
  return getDb()
    .prepare<[], FolderRow>("SELECT * FROM folders ORDER BY created_at ASC")
    .all()
    .map(toFolder);
}

export function createFolder(input: { name: string; icon?: string; color?: string }): Folder {
  const id = nanoid();
  const now = Date.now();
  const icon = input.icon ?? "folder";
  const color = input.color ?? "#3e63dd";
  getDb()
    .prepare("INSERT INTO folders (id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.name, icon, color, now);
  return { id, name: input.name, icon, color, createdAt: now };
}

export function updateFolder(id: string, patch: Partial<Folder>): Folder {
  const existing = getDb()
    .prepare<[string], FolderRow>("SELECT * FROM folders WHERE id = ?")
    .get(id);
  if (!existing) throw new Error("Folder not found");
  const next = {
    name: patch.name ?? existing.name,
    icon: patch.icon ?? existing.icon,
    color: patch.color ?? existing.color,
  };
  getDb()
    .prepare("UPDATE folders SET name = ?, icon = ?, color = ? WHERE id = ?")
    .run(next.name, next.icon, next.color, id);
  return { id, ...next, createdAt: existing.created_at };
}

export function deleteFolder(id: string): void {
  getDb().prepare("DELETE FROM folders WHERE id = ?").run(id);
}

export function ensureDefaultFolder(): Folder {
  const existing = listFolders();
  if (existing.length > 0) return existing[0];
  return createFolder({ name: "Default" });
}
