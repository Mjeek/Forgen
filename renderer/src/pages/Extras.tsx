import { Info } from "lucide-react";

export function ExtrasPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-brand-400" />
          <div className="text-sm font-semibold">Extras</div>
        </div>
        <p className="text-ink-400 text-sm leading-relaxed">
          This is where you'll wire up per-folder extras: default startup URLs,
          extension bundles, cookie-jar presets, and automation hooks. Nothing
          here yet — the schema is ready but the UI is intentionally left for
          later so the core profile/proxy/launcher flow can settle first.
        </p>
      </div>
    </div>
  );
}
