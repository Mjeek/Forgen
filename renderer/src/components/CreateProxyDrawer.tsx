import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { useStore } from "../store";
import { api } from "../ipc";
import type { ProxyKind } from "../../../shared/types";
import { Plus, Info, BarChart3 } from "lucide-react";
import clsx from "clsx";

export function CreateProxyDrawer() {
  const { drawer, setDrawer, refreshProxies } = useStore();
  const open = drawer.kind === "createProxy" || drawer.kind === "massProxy";
  const isMass = drawer.kind === "massProxy";

  const [kind, setKind] = useState<ProxyKind>("http");
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [changeIpUrl, setChangeIpUrl] = useState("");
  const [massText, setMassText] = useState("");

  useEffect(() => {
    if (!open) { setName(""); setLine(""); setChangeIpUrl(""); setMassText(""); setKind("http"); }
  }, [open]);

  const submit = async () => {
    try {
      if (isMass) {
        const created = await api.proxy.massCreate(massText, kind);
        alert(`Created ${created.length} proxies`);
      } else {
        const parsed = parseSingle(line);
        if (!parsed) { alert("Expected format: host:port or host:port:user:pass"); return; }
        await api.proxy.create({ ...parsed, kind, name: name.trim() || undefined, changeIpUrl: changeIpUrl.trim() || undefined });
      }
      await refreshProxies();
      setDrawer({ kind: "none" });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={() => setDrawer({ kind: "none" })}
      title={
        <div className="flex items-center gap-4">
          <button
            className={clsx("flex items-center gap-1", !isMass ? "text-brand-400" : "text-ink-500")}
            onClick={() => setDrawer({ kind: "createProxy" })}
          >
            <Plus size={14} /> New Proxy
          </button>
          <button
            className={clsx("flex items-center gap-1", isMass ? "text-brand-400" : "text-ink-500")}
            onClick={() => setDrawer({ kind: "massProxy" })}
          >
            <Plus size={14} /> Mass Proxy Creation
          </button>
        </div>
      }
      width={520}
    >
      <div className="p-5 space-y-4">
        {!isMass && (
          <input className="input" placeholder="Proxy name" value={name} onChange={(e) => setName(e.target.value)} />
        )}

        <div className="grid grid-cols-4 gap-0 bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
          {(["http", "https", "socks5", "ssh"] as ProxyKind[]).map((k, i) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={clsx(
                "py-2.5 text-sm font-medium uppercase tracking-wider transition",
                kind === k ? "bg-brand-500 text-white" : "text-ink-300 hover:bg-ink-800",
                i > 0 && "border-l border-ink-800",
              )}
            >
              {k}
            </button>
          ))}
        </div>

        {!isMass && (
          <div className="relative">
            <input
              className="input pr-16"
              placeholder="host:port or host:port:user:pass"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 text-ink-500">
              <Info size={14} />
              <BarChart3 size={14} />
            </div>
          </div>
        )}

        {!isMass && (
          <div className="relative">
            <input
              className="input pr-8"
              placeholder="Link for changing IP"
              value={changeIpUrl}
              onChange={(e) => setChangeIpUrl(e.target.value)}
            />
            <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500" />
          </div>
        )}

        {isMass && (
          <>
            <div className="text-xs text-ink-500">
              Paste one proxy per line. Supported formats:<br />
              <code className="text-ink-300">host:port</code>,
              <code className="text-ink-300"> host:port:user:pass</code>,
              <code className="text-ink-300"> scheme://user:pass@host:port</code>
            </div>
            <textarea
              className="input !h-64 font-mono"
              placeholder="1.2.3.4:8080:user:pass"
              value={massText}
              onChange={(e) => setMassText(e.target.value)}
            />
          </>
        )}

        <div className="flex gap-2 pt-2">
          {!isMass && (
            <button className="btn-secondary flex-1">Add more</button>
          )}
          <button className="btn-primary flex-1" onClick={submit}>
            {isMass ? "Import proxies" : "Create"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function parseSingle(line: string): { host: string; port: number; username?: string; password?: string } | null {
  const parts = line.trim().split(":");
  if (parts.length === 2) return { host: parts[0], port: parseInt(parts[1], 10) };
  if (parts.length === 4) return { host: parts[0], port: parseInt(parts[1], 10), username: parts[2], password: parts[3] };
  return null;
}
