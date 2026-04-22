import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels";

// Expose a narrow, typed bridge to the renderer. The renderer never touches
// ipcRenderer directly — everything goes through window.forgen.
const api = {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: unknown[]) => void): (() => void) => {
    const wrapped = (_e: unknown, ...args: unknown[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
  channels: IPC,
};

contextBridge.exposeInMainWorld("forgen", api);

export type ForgenApi = typeof api;
