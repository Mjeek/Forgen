import crypto from "crypto";
import { getDb } from "../db";

const KEY = "api_token";

function readToken(): string | null {
  const row = getDb()
    .prepare<[string], { value: string }>("SELECT value FROM app_config WHERE key = ?")
    .get(KEY);
  return row?.value ?? null;
}

function writeToken(token: string): void {
  getDb()
    .prepare(
      "INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(KEY, token);
}

function generate(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getApiToken(): string {
  let token = readToken();
  if (!token) {
    token = generate();
    writeToken(token);
  }
  return token;
}

export function regenerateApiToken(): string {
  const token = generate();
  writeToken(token);
  return token;
}
