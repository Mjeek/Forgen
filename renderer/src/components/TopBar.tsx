import { useStore } from "../store";
import { RefreshCw, SlidersHorizontal, Plus, Search } from "lucide-react";

export function TopBar({ onRefresh, onCreate }: { onRefresh: () => void; onCreate: () => void }) {
  const { tab } = useStore();
  return (
    <div className="flex items-center gap-3 p-3 border-b border-ink-800 bg-ink-950/50">
      <div className="flex-1 flex items-center bg-ink-900 border border-ink-800 rounded-lg px-3">
        <Search size={16} className="text-ink-500" />
        <input className="bg-transparent flex-1 py-2 px-2 text-sm outline-none" placeholder="Search…" />
      </div>
      <button className="btn-secondary" onClick={onRefresh}>
        <RefreshCw size={14} /> Refresh
      </button>
      <button className="btn-secondary">
        <SlidersHorizontal size={14} /> Filters
      </button>
      <button className="btn-primary" onClick={onCreate}>
        <Plus size={14} /> {createLabel(tab)}
      </button>
    </div>
  );
}

function createLabel(tab: string): string {
  switch (tab) {
    case "profiles": return "Create profile";
    case "proxies": return "Create proxy";
    case "tags": return "Create tag";
    case "statuses": return "Create status";
    case "extras": return "Create extra";
    default: return "Create";
  }
}
