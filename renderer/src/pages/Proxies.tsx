import { useEffect } from "react";
import { useStore } from "../store";
import { api } from "../ipc";
import { RefreshCw, Info, Pencil, Trash2, Copy, CloudUpload } from "lucide-react";

export function ProxiesPage() {
  const { proxies, refreshProxies } = useStore();
  useEffect(() => { refreshProxies(); }, [refreshProxies]);

  const test = async (id: string) => {
    try { await api.proxy.test(id); await refreshProxies(); }
    catch (e) { alert((e as Error).message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this proxy?")) return;
    await api.proxy.delete(id);
    await refreshProxies();
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink-500 sticky top-0 bg-ink-950">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="px-3 py-3 text-left">Name</th>
              <th className="px-3 py-3 text-left">Status</th>
              <th className="px-3 py-3 text-left">Profiles</th>
              <th className="px-3 py-3 text-left">IP</th>
              <th className="px-3 py-3 text-left">Port</th>
              <th className="px-3 py-3 text-left">Username</th>
              <th className="w-8 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {proxies.map((p) => (
              <tr key={p.id} className="border-t border-ink-800 hover:bg-ink-900/60">
                <td className="px-3 py-3"><input type="checkbox" /></td>
                <td className="px-3 py-3"><span className="text-ink-100 font-medium">{p.host.slice(0, 12)}...</span></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-ink-500 hover:text-ink-200" onClick={() => test(p.id)}><RefreshCw size={12} /></button>
                    <Info size={12} className="text-ink-500" />
                    {p.lastStatus === "ok" && <span className="chip !bg-emerald-500/15 !border-emerald-500/30 !text-emerald-400">A</span>}
                    {p.lastStatus === "fail" && <span className="chip !bg-rose-500/15 !border-rose-500/30 !text-rose-400">F</span>}
                    {!p.lastStatus && <span className="chip">—</span>}
                    <span className="text-ink-300 text-xs">
                      {p.lastCheckedAt ? timeAgo(p.lastCheckedAt) : "not tested"} · {p.country ?? "—"} · {p.city ?? ""}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3"><span className="chip">—</span></td>
                <td className="px-3 py-3 text-ink-300">{p.host}</td>
                <td className="px-3 py-3 text-ink-300">{p.port}</td>
                <td className="px-3 py-3 text-ink-300">{p.username ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button className="text-ink-500 hover:text-ink-200" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {proxies.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-24 text-center text-ink-500">
                  No proxies yet. Click <span className="text-brand-400 font-medium">Create proxy</span> to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-ink-800 bg-ink-950">
        <button className="w-9 h-9 rounded-md text-ink-400 hover:bg-ink-800 hover:text-ink-100 flex items-center justify-center" title="Copy selected"><Copy size={14} /></button>
        <button className="w-9 h-9 rounded-md text-ink-400 hover:bg-ink-800 hover:text-ink-100 flex items-center justify-center" title="Mass import"><CloudUpload size={14} /></button>
        <button className="w-9 h-9 rounded-md text-ink-400 hover:bg-ink-800 hover:text-ink-100 flex items-center justify-center" title="Delete selected"><Trash2 size={14} /></button>
        <div className="flex-1" />
        <div className="text-xs text-ink-500">
          Rows per page: <select className="bg-ink-900 border border-ink-800 rounded px-1 py-0.5 ml-1"><option>25</option></select>
        </div>
      </div>
    </div>
  );
}

function timeAgo(ms: number): string {
  const m = Math.floor((Date.now() - ms) / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} hour${h === 1 ? "" : "s"} ago`;
  if (m > 0) return `${m} min${m === 1 ? "" : "s"} ago`;
  return "just now";
}
