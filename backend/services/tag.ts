import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { Tag } from "../../shared/types";

interface TagRow { id: string; name: string; color: string }

const toTag = (r: TagRow): Tag => ({ id: r.id, name: r.name, color: r.color });

export function listTags(): Tag[] {
  return getDb().prepare<[], TagRow>("SELECT * FROM tags ORDER BY name ASC").all().map(toTag);
}

export function createTag(input: { name: string; color?: string }): Tag {
  const id = nanoid();
  const color = input.color ?? "#3e63dd";
  getDb().prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)").run(id, input.name, color);
  return { id, name: input.name, color };
}

export function updateTag(id: string, patch: Partial<Tag>): Tag {
  const row = getDb().prepare<[string], TagRow>("SELECT * FROM tags WHERE id = ?").get(id);
  if (!row) throw new Error("Tag not found");
  const next = { name: patch.name ?? row.name, color: patch.color ?? row.color };
  getDb().prepare("UPDATE tags SET name = ?, color = ? WHERE id = ?").run(next.name, next.color, id);
  return { id, ...next };
}

export function deleteTag(id: string): void {
  getDb().prepare("DELETE FROM tags WHERE id = ?").run(id);
}
