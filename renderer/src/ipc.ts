import { IPC } from "../../shared/ipc-channels";
import type {
  Folder, Profile, Proxy, Status, Tag, User, FingerprintConfig, Platform, ProxyKind,
} from "../../shared/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

declare global {
  interface Window {
    forgen: {
      invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<Result<T>>;
      on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
      channels: typeof IPC;
    };
  }
}

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = await window.forgen.invoke<T>(channel, ...args);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export const api = {
  auth: {
    status: () => call<{ user: User | null; hasAnyUser: boolean }>(IPC.auth.status),
    register: (email: string, password: string) => call<User>(IPC.auth.register, email, password),
    login: (email: string, password: string) => call<User>(IPC.auth.login, email, password),
    logout: () => call<void>(IPC.auth.logout),
  },
  folder: {
    list: () => call<Folder[]>(IPC.folder.list),
    create: (input: { name: string; icon?: string; color?: string }) =>
      call<Folder>(IPC.folder.create, input),
    update: (id: string, patch: Partial<Folder>) => call<Folder>(IPC.folder.update, id, patch),
    delete: (id: string) => call<void>(IPC.folder.delete, id),
  },
  profile: {
    list: (folderId?: string) => call<Profile[]>(IPC.profile.list, folderId),
    get: (id: string) => call<Profile | null>(IPC.profile.get, id),
    create: (input: Partial<Profile> & { name: string; smart?: boolean }) =>
      call<Profile>(IPC.profile.create, input),
    update: (id: string, patch: Partial<Profile>) => call<Profile>(IPC.profile.update, id, patch),
    delete: (id: string) => call<void>(IPC.profile.delete, id),
    smart: (platform?: Platform) => call<FingerprintConfig>(IPC.profile.smart, platform),
    launch: (id: string) => call<{ pid: number }>(IPC.profile.launch, id),
    stop: (id: string) => call<void>(IPC.profile.stop, id),
    bulk: (op: "delete" | "move" | "status", ids: string[], arg?: string | null) =>
      call<number>(IPC.profile.bulk, op, ids, arg ?? null),
  },
  proxy: {
    list: () => call<Proxy[]>(IPC.proxy.list),
    create: (input: { name?: string; kind: ProxyKind; host: string; port: number; username?: string; password?: string; changeIpUrl?: string }) =>
      call<Proxy>(IPC.proxy.create, input),
    update: (id: string, patch: Partial<Proxy>) => call<Proxy>(IPC.proxy.update, id, patch),
    delete: (id: string) => call<void>(IPC.proxy.delete, id),
    test: (id: string) => call<Proxy>(IPC.proxy.test, id),
    massCreate: (text: string, kind?: ProxyKind) => call<Proxy[]>(IPC.proxy.massCreate, text, kind),
    changeIp: (id: string) => call<void>(IPC.proxy.changeIp, id),
  },
  tag: {
    list: () => call<Tag[]>(IPC.tag.list),
    create: (input: { name: string; color?: string }) => call<Tag>(IPC.tag.create, input),
    update: (id: string, patch: Partial<Tag>) => call<Tag>(IPC.tag.update, id, patch),
    delete: (id: string) => call<void>(IPC.tag.delete, id),
  },
  status: {
    list: () => call<Status[]>(IPC.status.list),
    create: (input: { name: string; color?: string }) => call<Status>(IPC.status.create, input),
    update: (id: string, patch: Partial<Status>) => call<Status>(IPC.status.update, id, patch),
    delete: (id: string) => call<void>(IPC.status.delete, id),
  },
};
