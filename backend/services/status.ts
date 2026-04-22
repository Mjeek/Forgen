import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { Status } from "../../shared/types";

interface StatusRow { id: string; name: string; color: string }

const toStatus = (r: StatusRow): Status => ({ id: r.id, name: r.name, color: r.color });

export function listStatuses(): Status[] {
  return getDb().prepare<[], StatusRow>("SELECT * FROM statuses ORDER BY name ASC").all().map(toStatus);
}

export function createStatus(input: { name: string; color?: string }): Status {
  const id = nanoid();
  const color = input.color ?? "#8c97a8";
  getDb().prepare("INSERT INTO statuses (id, name, color) VALUES (?, ?, ?)").run(id, input.name, color);
  return { id, name: input.name, color };
}

export function updateStatus(id: string, patch: Partial<Status>): Status {
  const row = getDb().prepare<[string], StatusRow>("SELECT * FROM statuses WHERE id = ?").get(id);
  if (!row) throw new Error("Status not found");
  const next = { name: patch.name ?? row.name, color: patch.color ?? row.color };
  getDb().prepare("UPDATE statuses SET name = ?, color = ? WHERE id = ?").run(next.name, next.color, id);
  return { id, ...next };
}

export function deleteStatus(id: string): void {
  getDb().prepare("DELETE FROM statuses WHERE id = ?").run(id);
}
