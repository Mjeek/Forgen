import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrations";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error("DB not initialized — call initDb() first");
  return db;
}

export function initDb(): Database.Database {
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  const file = path.join(userData, "forgen.sqlite");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
