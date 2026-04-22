import { useEffect, useMemo } from "react";
import { useStore } from "../store";
import { api } from "../ipc";
import type { Profile, Proxy } from "../../../shared/types";
import {
  Play, Square, MoreVertical, Pencil, RefreshCw, Info, Trash2, FolderInput, Tag as TagIcon,
  MessageCircle, Archive, FileDown, Copy, StopCircle, Cookie,
} from "lucide-react";
import clsx from "clsx";

export function ProfilesPage() {
  const {
    profiles, proxies, refreshProfiles, selectedProfileIds,
    toggleProfileSelected, selectAllProfiles, clearSelection, setDrawer,
  } = useStore();

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  const proxyMap = useMemo(() => new Map(proxies.map((p) => [p.id, p])), [proxies]);
  const allSelected = profiles.length > 0 && selectedProfileIds.size === profiles.length;

  const handleLaunch = async (p: Profile) => {
    try { await api.profile.launch(p.id); }
    catch (e) { alert((e as Error).message); }
  };

  const handleBulk = async (op: "delete" | "move" | "status", arg?: string) => {
    if (selectedProfileIds.size === 0) return;
    if (op === "delete" && !confirm(`Delete ${selectedProfileIds.size} profile(s)?`)) return;
    await api.profile.bulk(op, [...selectedProfileIds], arg ?? null);
    clearSelection();
    await refreshProfiles();
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink-500 sticky top-0 bg-ink-950 z-10">
            <tr>
              <th className="w-8 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => (allSelected ? clearSelection() : selectAllProfiles())}
                />
              </th>
              <th className="px-3 py-3 text-left">Name</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Proxy</th>
              <th className="px-3 py-3 text-left">Tags</th>
              <th className="px-3 py-3 text-left">Notes</th>
              <th className="px-3 py-3 text-left">Last update</th>
              <th className="px-3 py-3 text-left">Created</th>
              <th className="px-3 py-3 text-left">Worktimer</th>
              <th className="w-8 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr
                key={p.id}
                className="border-t border-ink-800 hover:bg-ink-900/60 transition"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProfileIds.has(p.id)}
                    onChange={() => toggleProfileSelected(p.id)}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition flex items-center gap-1" onClick={() => handleLaunch(p)}>
                      <Play size={12} fill="currentColor" /> Start
                    </button>
                    <button className="text-ink-500 hover:text-ink-200" onClick={() => setDrawer({ kind: "editProfile", id: p.id })}>
                      <MoreVertical size={14} />
                    </button>
                    <span className="font-medium text-ink-100">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="chip">No status</span>
                </td>
                <td className="px-3 py-3 text-ink-300">
                  {p.proxyId ? <ProxyCell proxy={proxyMap.get(p.proxyId)} /> : <span className="text-ink-500">—</span>}
                </td>
                <td className="px-3 py-3">
                  <button className="w-6 h-6 rounded-md bg-ink-800 text-ink-500 hover:text-ink-200 flex items-center justify-center"><TagIcon size={12} /></button>
                </td>
                <td className="px-3 py-3 max-w-[200px]">
                  <NotesCell profile={p} />
                </td>
                <td className="px-3 py-3 text-ink-400">{formatDate(p.updatedAt)}</td>
                <td className="px-3 py-3 text-ink-400">{formatDate(p.createdAt)}</td>
                <td className="px-3 py-3 text-ink-400">{formatDuration(p.workTimerMs)}</td>
                <td className="px-3 py-3">
                  <button className="text-ink-500 hover:text-ink-200" onClick={() => setDrawer({ kind: "editProfile", id: p.id })}>
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-24 text-center text-ink-500">
                  No profiles yet in this folder. Click <span className="text-brand-400 font-medium">Create profile</span> to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <BottomActionBar selected={selectedProfileIds.size} onBulk={handleBulk} />
    </div>
  );
}

function ProxyCell({ proxy }: { proxy: Proxy | undefined }) {
  if (!proxy) return <span className="text-ink-500">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <RefreshCw size={12} className="text-ink-500" />
        <Info size={12} className="text-ink-500" />
        <FlagChip country={proxy.country} />
        <span className="text-ink-200 truncate max-w-[200px]">{proxy.host}:{proxy.port}</span>
      </div>
      <div className="text-xs text-ink-500">
        {proxy.lastCheckedAt ? timeAgo(proxy.lastCheckedAt) : "not tested"} · {proxy.country ?? "—"} · {proxy.host}
      </div>
    </div>
  );
}

function FlagChip({ country }: { country: string | undefined }) {
  if (!country) return <span className="w-5 h-3 rounded-sm bg-ink-800" />;
  return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-ink-800 text-ink-200">{country}</span>;
}

function NotesCell({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1 text-xs text-amber-200">
      <Pencil size={12} />
      <span className="truncate">{profile.notes || ""}</span>
    </div>
  );
}

function BottomActionBar({ selected, onBulk }: { selected: number; onBulk: (op: "delete" | "move" | "status", arg?: string) => void }) {
  return (
    <div className="flex items-center gap-2 p-3 border-t border-ink-800 bg-ink-950">
      <BottomBtn icon={<TagIcon size={14} />} label="Tag" />
      <BottomBtn icon={<MessageCircle size={14} />} label="Status" />
      <BottomBtn icon={<Archive size={14} />} label="Archive" />
      <BottomBtn icon={<Copy size={14} />} label="Duplicate" />
      <BottomBtn icon={<Cookie size={14} />} label="Cookies" />
      <BottomBtn icon={<FileDown size={14} />} label="Export" />
      <BottomBtn icon={<FolderInput size={14} />} label="Move" onClick={() => {
        const target = prompt("Enter destination folder ID:");
        if (target) onBulk("move", target);
      }} />
      <BottomBtn icon={<Play size={14} />} label="Start all" />
      <BottomBtn icon={<StopCircle size={14} />} label="Stop all" />
      <BottomBtn icon={<Trash2 size={14} />} label={selected > 0 ? `Delete (${selected})` : "Delete"} onClick={() => onBulk("delete")} danger />
      <div className="flex-1" />
      <div className="text-xs text-ink-500">
        Rows per page: <select className="bg-ink-900 border border-ink-800 rounded px-1 py-0.5 ml-1"><option>25</option><option>50</option><option>100</option></select>
      </div>
    </div>
  );
}

function BottomBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-9 h-9 rounded-md flex items-center justify-center transition",
        danger
          ? "text-ink-400 hover:bg-rose-500/15 hover:text-rose-400"
          : "text-ink-400 hover:bg-ink-800 hover:text-ink-100",
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const out = [];
  if (d) out.push(`${d}d`);
  if (h) out.push(`${h}h`);
  out.push(`${m}m`);
  return out.join(" ");
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} day${d === 1 ? "" : "s"} ago`;
  if (h > 0) return `${h} hour${h === 1 ? "" : "s"} ago`;
  if (m > 0) return `${m} min${m === 1 ? "" : "s"} ago`;
  return "just now";
}
