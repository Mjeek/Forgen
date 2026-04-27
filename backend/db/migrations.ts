import type Database from "better-sqlite3";

// Each migration is a self-contained SQL block. Add new ones to the end —
// never edit past entries.
const MIGRATIONS: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'folder',
        color TEXT NOT NULL DEFAULT '#3e63dd',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#3e63dd'
      );

      CREATE TABLE IF NOT EXISTS statuses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#8c97a8'
      );

      CREATE TABLE IF NOT EXISTS proxies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT,
        password TEXT,
        change_ip_url TEXT,
        country TEXT,
        city TEXT,
        last_checked_at INTEGER,
        last_status TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
        browser_kind TEXT NOT NULL DEFAULT 'chrome',
        proxy_id TEXT REFERENCES proxies(id) ON DELETE SET NULL,
        status_id TEXT REFERENCES statuses(id) ON DELETE SET NULL,
        notes TEXT NOT NULL DEFAULT '',
        fingerprint_json TEXT NOT NULL,
        cookies TEXT,
        last_launched_at INTEGER,
        work_timer_ms INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profile_tags (
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (profile_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS idx_profiles_folder ON profiles(folder_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_proxy ON profiles(proxy_id);
    `,
  },
  {
    id: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);`);
  const applied = new Set(
    db.prepare<[], { id: number }>("SELECT id FROM _migrations").all().map((r) => r.id),
  );
  const insert = db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const tx = db.transaction(() => {
      db.exec(m.sql);
      insert.run(m.id, Date.now());
    });
    tx();
  }
}
