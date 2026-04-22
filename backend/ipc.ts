import { ipcMain } from "electron";
import { IPC } from "../shared/ipc-channels";
import * as auth from "./services/auth";
import * as folder from "./services/folder";
import * as profile from "./services/profile";
import * as proxy from "./services/proxy";
import * as tag from "./services/tag";
import * as status from "./services/status";
import * as launcher from "./services/launcher";
import { smartFingerprint } from "./services/fingerprint";

// Small wrapper so every handler returns { ok, data } / { ok:false, error }
// instead of throwing across the IPC boundary (preserves stack-free messages).
const handle = <A extends unknown[], R>(
  channel: string,
  fn: (...args: A) => R | Promise<R>,
) => {
  ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
    try {
      const data = await fn(...(args as A));
      return { ok: true as const, data };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });
};

export function registerIpcHandlers(): void {
  // Auth
  handle(IPC.auth.status, () => auth.authStatus());
  handle(IPC.auth.register, (email: string, password: string) => auth.register(email, password));
  handle(IPC.auth.login, (email: string, password: string) => auth.login(email, password));
  handle(IPC.auth.logout, () => auth.logout());

  // Folders
  handle(IPC.folder.list, () => folder.listFolders());
  handle(IPC.folder.create, (input: Parameters<typeof folder.createFolder>[0]) => folder.createFolder(input));
  handle(IPC.folder.update, (id: string, patch: Parameters<typeof folder.updateFolder>[1]) => folder.updateFolder(id, patch));
  handle(IPC.folder.delete, (id: string) => folder.deleteFolder(id));

  // Profiles
  handle(IPC.profile.list, (folderId?: string) => profile.listProfiles(folderId));
  handle(IPC.profile.get, (id: string) => profile.getProfile(id));
  handle(IPC.profile.create, (input: Parameters<typeof profile.createProfile>[0]) => profile.createProfile(input));
  handle(IPC.profile.update, (id: string, patch: Parameters<typeof profile.updateProfile>[1]) => profile.updateProfile(id, patch));
  handle(IPC.profile.delete, (id: string) => profile.deleteProfile(id));
  handle(IPC.profile.smart, (platform?: Parameters<typeof smartFingerprint>[0]) => smartFingerprint(platform));
  handle(IPC.profile.launch, (id: string) => launcher.launchProfile(id));
  handle(IPC.profile.stop, (id: string) => launcher.stopProfile(id));
  handle(IPC.profile.bulk, (op: "delete" | "move" | "status", ids: string[], arg?: string | null) => {
    if (op === "delete") return profile.bulkDelete(ids);
    if (op === "move") return profile.bulkMove(ids, String(arg));
    if (op === "status") return profile.bulkSetStatus(ids, (arg as string | null) ?? null);
    throw new Error("Unknown bulk op");
  });

  // Proxies
  handle(IPC.proxy.list, () => proxy.listProxies());
  handle(IPC.proxy.create, (input: Parameters<typeof proxy.createProxy>[0]) => proxy.createProxy(input));
  handle(IPC.proxy.update, (id: string, patch: Parameters<typeof proxy.updateProxy>[1]) => proxy.updateProxy(id, patch));
  handle(IPC.proxy.delete, (id: string) => proxy.deleteProxy(id));
  handle(IPC.proxy.test, (id: string) => proxy.testProxy(id));
  handle(IPC.proxy.massCreate, (text: string, kind?: Parameters<typeof proxy.massCreate>[1]) => proxy.massCreate(text, kind));
  handle(IPC.proxy.changeIp, (id: string) => proxy.triggerChangeIp(id));

  // Tags
  handle(IPC.tag.list, () => tag.listTags());
  handle(IPC.tag.create, (input: Parameters<typeof tag.createTag>[0]) => tag.createTag(input));
  handle(IPC.tag.update, (id: string, patch: Parameters<typeof tag.updateTag>[1]) => tag.updateTag(id, patch));
  handle(IPC.tag.delete, (id: string) => tag.deleteTag(id));

  // Statuses
  handle(IPC.status.list, () => status.listStatuses());
  handle(IPC.status.create, (input: Parameters<typeof status.createStatus>[0]) => status.createStatus(input));
  handle(IPC.status.update, (id: string, patch: Parameters<typeof status.updateStatus>[1]) => status.updateStatus(id, patch));
  handle(IPC.status.delete, (id: string) => status.deleteStatus(id));
}
