// Central list of IPC channel names so main & renderer can't drift.

export const IPC = {
  auth: {
    status: "auth:status",
    register: "auth:register",
    login: "auth:login",
    logout: "auth:logout",
  },
  folder: {
    list: "folder:list",
    create: "folder:create",
    update: "folder:update",
    delete: "folder:delete",
  },
  profile: {
    list: "profile:list",
    get: "profile:get",
    create: "profile:create",
    update: "profile:update",
    delete: "profile:delete",
    launch: "profile:launch",
    stop: "profile:stop",
    smart: "profile:smart",
    bulk: "profile:bulk",
    importCookies: "profile:importCookies",
  },
  proxy: {
    list: "proxy:list",
    create: "proxy:create",
    update: "proxy:update",
    delete: "proxy:delete",
    test: "proxy:test",
    massCreate: "proxy:massCreate",
    changeIp: "proxy:changeIp",
  },
  tag: {
    list: "tag:list",
    create: "tag:create",
    update: "tag:update",
    delete: "tag:delete",
  },
  status: {
    list: "status:list",
    create: "status:create",
    update: "status:update",
    delete: "status:delete",
  },
  app: {
    version: "app:version",
    openExternal: "app:openExternal",
    chooseFile: "app:chooseFile",
    apiToken: "app:apiToken",
    regenerateApiToken: "app:regenerateApiToken",
    runningProfiles: "app:runningProfiles",
  },
} as const;

export type IpcChannel =
  | typeof IPC.auth[keyof typeof IPC.auth]
  | typeof IPC.folder[keyof typeof IPC.folder]
  | typeof IPC.profile[keyof typeof IPC.profile]
  | typeof IPC.proxy[keyof typeof IPC.proxy]
  | typeof IPC.tag[keyof typeof IPC.tag]
  | typeof IPC.status[keyof typeof IPC.status]
  | typeof IPC.app[keyof typeof IPC.app];
