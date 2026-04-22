import { useState } from "react";
import { useStore } from "../store";
import { api } from "../ipc";
import { Logo } from "./Logo";
import {
  Bell, Folder as FolderIcon, Grid2x2, Power, Settings, User, Plus, Moon, Sun,
} from "lucide-react";
import clsx from "clsx";
import type { Folder } from "../../../shared/types";

const FOLDER_COLORS = ["#3e63dd", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

export function Sidebar() {
  const { folders, selectedFolderId, selectFolder, refreshFolders, user, setUser } = useStore();
  const [creating, setCreating] = useState(false);

  const create = async (name: string) => {
    const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
    await api.folder.create({ name, color });
    await refreshFolders();
    setCreating(false);
  };

  return (
    <div className="flex h-full">
      <RailLeft user={user} onLogout={() => { api.auth.logout(); setUser(null); }} />
      <div className="w-64 border-r border-ink-800 bg-ink-950 flex flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <div className="text-sm font-semibold tracking-tight">Forgen</div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">Folders</div>
          <div className="flex gap-1">
            <button className="btn-ghost !p-1.5" title="Settings"><Settings size={14} /></button>
            <button className="btn-ghost !p-1.5" title="New folder" onClick={() => setCreating(true)}>
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {folders.map((f) => (
            <FolderRow key={f.id} folder={f} active={selectedFolderId === f.id} onClick={() => selectFolder(f.id)} />
          ))}
          {creating && (
            <NewFolderInline onCancel={() => setCreating(false)} onCreate={create} />
          )}
        </div>
      </div>
    </div>
  );
}

function RailLeft({ user, onLogout }: { user: { email: string } | null; onLogout: () => void }) {
  const [dark, setDark] = useState(true);
  return (
    <div className="w-14 border-r border-ink-800 bg-ink-950 flex flex-col items-center py-3 gap-2">
      <Logo size={28} />
      <div className="mt-2 space-y-1">
        <RailButton icon={<Bell size={18} />} label="Alerts" />
        <RailButton icon={<Grid2x2 size={18} />} label="Profiles" active />
        <RailButton icon={<User size={18} />} label="Account" />
        <RailButton icon={<Settings size={18} />} label="Settings" />
      </div>
      <div className="flex-1" />
      <button className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-400 hover:bg-ink-800" title="Logout" onClick={onLogout}>
        <Power size={18} />
      </button>
      <button
        className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-400 hover:bg-ink-800"
        onClick={() => {
          setDark((d) => !d);
          document.documentElement.classList.toggle("light", dark);
        }}
        title={dark ? "Light mode" : "Dark mode"}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="w-9 h-9 rounded-full bg-ink-800 flex items-center justify-center text-xs font-semibold text-ink-300">
        {user?.email?.[0]?.toUpperCase() ?? "?"}
      </div>
    </div>
  );
}

function RailButton({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={clsx(
        "w-9 h-9 flex items-center justify-center rounded-lg transition",
        active ? "bg-brand-500/15 text-brand-400" : "text-ink-400 hover:bg-ink-800 hover:text-ink-100",
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

function FolderRow({ folder, active, onClick }: { folder: Folder; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
        active
          ? "bg-brand-500/10 text-brand-300 border border-brand-500/30"
          : "text-ink-200 hover:bg-ink-900 border border-transparent",
      )}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: folder.color + "22", color: folder.color }}
      >
        <FolderIcon size={16} />
      </span>
      <span className="truncate">{folder.name}</span>
    </button>
  );
}

function NewFolderInline({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="px-3 py-2 flex items-center gap-2">
      <input
        autoFocus
        className="input"
        placeholder="Folder name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onCreate(name.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
    </div>
  );
}
