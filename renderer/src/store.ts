import { create } from "zustand";
import type { Folder, Profile, Proxy, Status, Tag, User } from "../../shared/types";
import { api } from "./ipc";

type Tab = "profiles" | "proxies" | "tags" | "statuses" | "extras";

interface AppState {
  booted: boolean;
  user: User | null;
  hasAnyUser: boolean;

  folders: Folder[];
  selectedFolderId: string | null;

  profiles: Profile[];
  proxies: Proxy[];
  tags: Tag[];
  statuses: Status[];

  tab: Tab;
  setTab: (tab: Tab) => void;

  selectedProfileIds: Set<string>;
  toggleProfileSelected: (id: string) => void;
  clearSelection: () => void;
  selectAllProfiles: () => void;

  drawer:
    | { kind: "none" }
    | { kind: "createProfile" }
    | { kind: "editProfile"; id: string }
    | { kind: "createProxy" }
    | { kind: "massProxy" };
  setDrawer: (d: AppState["drawer"]) => void;

  bootstrap: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshProxies: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshStatuses: () => Promise<void>;
  selectFolder: (id: string | null) => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  booted: false,
  user: null,
  hasAnyUser: false,

  folders: [],
  selectedFolderId: null,

  profiles: [],
  proxies: [],
  tags: [],
  statuses: [],

  tab: "profiles",
  setTab: (tab) => set({ tab }),

  selectedProfileIds: new Set(),
  toggleProfileSelected: (id) => {
    const s = new Set(get().selectedProfileIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    set({ selectedProfileIds: s });
  },
  clearSelection: () => set({ selectedProfileIds: new Set() }),
  selectAllProfiles: () => set({ selectedProfileIds: new Set(get().profiles.map((p) => p.id)) }),

  drawer: { kind: "none" },
  setDrawer: (d) => set({ drawer: d }),

  bootstrap: async () => {
    const status = await api.auth.status();
    set({ user: status.user, hasAnyUser: status.hasAnyUser, booted: true });
    if (status.user) {
      await Promise.all([
        get().refreshFolders(),
        get().refreshProxies(),
        get().refreshTags(),
        get().refreshStatuses(),
      ]);
      const first = get().folders[0];
      if (first) await get().selectFolder(first.id);
    }
  },

  refreshFolders: async () => {
    const folders = await api.folder.list();
    set({ folders });
  },
  refreshProfiles: async () => {
    const profiles = await api.profile.list(get().selectedFolderId ?? undefined);
    set({ profiles });
  },
  refreshProxies: async () => {
    const proxies = await api.proxy.list();
    set({ proxies });
  },
  refreshTags: async () => {
    const tags = await api.tag.list();
    set({ tags });
  },
  refreshStatuses: async () => {
    const statuses = await api.status.list();
    set({ statuses });
  },

  selectFolder: async (id) => {
    set({ selectedFolderId: id, selectedProfileIds: new Set() });
    await get().refreshProfiles();
  },

  setUser: (user) => set({ user }),
}));
