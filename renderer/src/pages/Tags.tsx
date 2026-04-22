import { useEffect, useState } from "react";
import { useStore } from "../store";
import { api } from "../ipc";
import { Trash2 } from "lucide-react";

export function TagsPage() {
  const { tags, refreshTags } = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3e63dd");
  useEffect(() => { refreshTags(); }, [refreshTags]);

  const add = async () => {
    if (!name.trim()) return;
    await api.tag.create({ name: name.trim(), color });
    setName("");
    await refreshTags();
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="card p-4 max-w-lg">
        <div className="text-sm font-semibold mb-3">New tag</div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
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
            {tags.map((t) => (
              <tr key={t.id} className="border-t border-ink-800">
                <td className="px-3 py-3"><span className="chip" style={{ background: t.color + "22", borderColor: t.color + "66", color: t.color }}>{t.name}</span></td>
                <td className="px-3 py-3 text-ink-400">{t.color}</td>
                <td className="px-3 py-3"><button className="text-ink-500 hover:text-rose-400" onClick={async () => { await api.tag.delete(t.id); await refreshTags(); }}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {tags.length === 0 && (<tr><td colSpan={3} className="px-3 py-12 text-center text-ink-500">No tags yet</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
