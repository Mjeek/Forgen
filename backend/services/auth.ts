import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import type { User } from "../../shared/types";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
}

let currentUser: User | null = null;

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export function authStatus(): { user: User | null; hasAnyUser: boolean } {
  const row = getDb().prepare<[], { n: number }>("SELECT COUNT(*) as n FROM users").get();
  return { user: currentUser, hasAnyUser: (row?.n ?? 0) > 0 };
}

export function register(email: string, password: string): User {
  if (!email.includes("@")) throw new Error("Invalid email");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (existing) throw new Error("An account with that email already exists");

  const id = nanoid();
  const hash = bcrypt.hashSync(password, 10);
  getDb()
    .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(id, email.toLowerCase(), hash, Date.now());
  const user: User = { id, email: email.toLowerCase(), createdAt: Date.now() };
  currentUser = user;
  return user;
}

export function login(email: string, password: string): User {
  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new Error("Invalid email or password");
  }
  currentUser = toUser(row);
  return currentUser;
}

export function logout(): void {
  currentUser = null;
}

export function requireUser(): User {
  if (!currentUser) throw new Error("Not authenticated");
  return currentUser;
}
