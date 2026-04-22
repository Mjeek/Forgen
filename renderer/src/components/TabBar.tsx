import { useStore } from "../store";
import { Globe, Cloud, Tag as TagIcon, MessageCircle, Settings } from "lucide-react";

const TABS = [
  { id: "profiles" as const, label: "Profiles", icon: <Globe size={16} /> },
  { id: "proxies" as const, label: "Proxies", icon: <Cloud size={16} /> },
  { id: "tags" as const, label: "Tags", icon: <TagIcon size={16} /> },
  { id: "statuses" as const, label: "Statuses", icon: <MessageCircle size={16} /> },
  { id: "extras" as const, label: "Extras", icon: <Settings size={16} /> },
];

export function TabBar() {
  const { tab, setTab } = useStore();
  return (
    <div className="flex items-center gap-1 border-b border-ink-800 px-2">
      {TABS.map((t) => (
        <div key={t.id} data-active={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
          {t.icon} <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
