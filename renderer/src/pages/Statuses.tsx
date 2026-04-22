import { useEffect, useState } from "react";
import { useStore } from "../store";
import { api } from "../ipc";
import { Trash2 } from "lucide-react";

export function StatusesPage() {
  const { statuses, refreshStatuses } = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8c97a8");
  useEffect(() => { refreshStatuses(); }, [refreshStatuses]);

  const add = async () => {
    if (!name.trim()) return;
    await api.status.create({ name: name.trim(), color });
    setName("");
    await refreshStatuses();
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="card p-4 max-w-lg">
        <div className="text-sm font-semibold mb-3">New status</div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Status name (e.g. Working, Banned, Warming up)" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="color" className="w-10 h-10 rounded-lg bg-ink-900 border border-ink-800" value={color} onChange={(e) => setColor(e.target.value)} />
          <button className="btn-primary" onClick={add}>Add</button>
        </div>
      </div>
      <div className="card max-w-2xl">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink-500">
            <tr><th className="px-3 py-3 text-left">Name</th><th className="px-3 py-3 text-left">Color</th><th className="w-8"></th></tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.id} className="border-t border-ink-800">
                <td className="px-3 py-3"><span className="chip" style={{ background: s.color + "22", borderColor: s.color + "66", color: s.color }}>{s.name}</span></td>
                <td className="px-3 py-3 text-ink-400">{s.color}</td>
                <td className="px-3 py-3"><button className="text-ink-500 hover:text-rose-400" onClick={async () => { await api.status.delete(s.id); await refreshStatuses(); }}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {statuses.length === 0 && (<tr><td colSpan={3} className="px-3 py-12 text-center text-ink-500">No statuses yet</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
