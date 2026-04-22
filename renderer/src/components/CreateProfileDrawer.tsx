import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { useStore } from "../store";
import { api } from "../ipc";
import type { FingerprintConfig, Platform } from "../../../shared/types";
import { Shuffle, Upload, Sparkles, Plus } from "lucide-react";
import clsx from "clsx";

const DEFAULT_FP: FingerprintConfig = {
  platform: "windows",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  webrtcMode: "auto",
  canvas: "noise",
  webgl: "noise",
  audio: "real",
  clientRects: "noise",
  timezone: "auto",
  language: "auto",
  geolocation: "auto",
  vendor: "Google Inc. (AMD)",
  renderer: "ANGLE (AMD, AMD Radeon (TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
  cpuCores: 16,
  memoryGb: 8,
  screenMode: "auto",
  resolution: "1536x864",
  mediaDevices: "real",
  doNotTrack: false,
  portsToProtect: [3389, 5900, 5901, 5800, 7070, 6568, 5938, 1080, 8080, 3128, 3030],
};

export function CreateProfileDrawer() {
  const { drawer, setDrawer, selectedFolderId, proxies, refreshProfiles } = useStore();
  const open = drawer.kind === "createProfile";

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("windows");
  const [browser, setBrowser] = useState<"chrome" | "firefox">("chrome");
  const [proxyId, setProxyId] = useState<string | undefined>(undefined);
  const [advanced, setAdvanced] = useState(true);
  const [fp, setFp] = useState<FingerprintConfig>(DEFAULT_FP);

  useEffect(() => {
    if (!open) {
      setName(""); setPlatform("windows"); setBrowser("chrome");
      setProxyId(undefined); setFp(DEFAULT_FP); setAdvanced(true);
    }
  }, [open]);

  const smart = async () => {
    const generated = await api.profile.smart(platform);
    setFp(generated);
  };

  const submit = async () => {
    if (!name.trim()) { alert("Name is required"); return; }
    await api.profile.create({
      name: name.trim(),
      folderId: selectedFolderId ?? undefined,
      browserKind: browser,
      proxyId,
      fingerprint: { ...fp, platform },
    });
    setDrawer({ kind: "none" });
    await refreshProfiles();
  };

  return (
    <Drawer
      open={open}
      onClose={() => setDrawer({ kind: "none" })}
      title={
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-brand-400"><Plus size={14} /> New Profile</span>
          <span className="flex items-center gap-1 text-ink-500"><Upload size={14} /> Import</span>
        </div>
      }
      width={720}
      aside={<SummaryPanel fp={fp} onSmart={smart} />}
    >
      <div className="p-5 space-y-5">
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Tags">
          <div className="input flex items-center text-ink-500">No tags — click to add</div>
        </Field>

        <Segmented
          value={browser}
          onChange={(v) => setBrowser(v as "chrome" | "firefox")}
          options={[{ value: "chrome", label: "Chrome" }, { value: "firefox", label: "Firefox" }]}
        />

        <Segmented
          value={platform}
          onChange={(v) => setPlatform(v as Platform)}
          options={[
            { value: "windows", label: "Windows" }, { value: "macos", label: "macOS" }, { value: "linux", label: "Linux" },
          ]}
        />

        <ProxySegment proxyId={proxyId} setProxyId={setProxyId} proxies={proxies} />

        <Field label="Cookies">
          <div className="input !py-8 flex flex-col items-center justify-center gap-2 text-ink-500 border-dashed">
            <Upload size={20} />
            <div className="text-xs">Paste your cookies or drag and drop your file</div>
            <button className="btn-secondary !py-1 text-xs">Browse file</button>
          </div>
        </Field>

        <button
          onClick={() => setAdvanced((v) => !v)}
          className="w-full py-3 text-sm font-medium text-brand-400 border-y border-ink-800 hover:bg-ink-900 transition"
        >
          Advanced settings {advanced ? "—" : "+"}
        </button>

        {advanced && <Advanced fp={fp} setFp={setFp} />}

        <button className="btn-primary w-full !py-3 text-base" onClick={submit}>Create profile</button>
      </div>
    </Drawer>
  );
}

function SummaryPanel({ fp, onSmart }: { fp: FingerprintConfig; onSmart: () => void }) {
  const rows: [string, string | undefined][] = [
    ["Platform", labelPlatform(fp.platform)],
    ["User-Agent", fp.userAgent],
    ["Proxy", undefined],
    ["WebRTC", fp.webrtcMode],
    ["Canvas", fp.canvas],
    ["WebGL", fp.webgl],
    ["Audio", fp.audio],
    ["GPU", `${fp.vendor}\n${fp.renderer}`],
    ["Client rects", fp.clientRects],
    ["Timezone", fp.timezone],
    ["Language", fp.language],
    ["Geolocation", typeof fp.geolocation === "string" ? fp.geolocation : "manual"],
    ["CPU cores", String(fp.cpuCores)],
    ["Memory", `${fp.memoryGb} GB`],
    ["Screen resolution", fp.resolution],
    ["Media devices", fp.mediaDevices],
    ["Web camera", fp.webcam ?? "3Mega AoutFocus Webcam"],
    ["Do not track", fp.doNotTrack ? "On" : "Off"],
  ];
  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button className="btn-secondary flex-1"><Shuffle size={14} /> New</button>
        <button className="btn-primary flex-1" onClick={onSmart}><Sparkles size={14} /> Smart</button>
      </div>
      <dl className="space-y-3 text-xs">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="uppercase tracking-wider text-ink-500 text-[10px]">{k}</dt>
            <dd className="text-ink-200 whitespace-pre-line break-words">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Segmented({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-0 bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
      {options.map((o, i) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "py-2.5 text-sm font-medium transition",
            value === o.value ? "bg-brand-500 text-white" : "text-ink-300 hover:bg-ink-800",
            i > 0 && "border-l border-ink-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ProxySegment({
  proxyId, setProxyId, proxies,
}: {
  proxyId: string | undefined;
  setProxyId: (id: string | undefined) => void;
  proxies: { id: string; host: string; port: number }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-0 bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setProxyId(undefined)}
        className={clsx("py-2.5 text-sm font-medium", !proxyId ? "bg-brand-500 text-white" : "text-ink-300 hover:bg-ink-800")}
      >
        No proxy
      </button>
      <select
        value={proxyId ?? ""}
        onChange={(e) => setProxyId(e.target.value || undefined)}
        className="bg-ink-900 border-l border-r border-ink-800 text-sm text-ink-200 px-3 focus:outline-none"
      >
        <option value="">Select proxy</option>
        {proxies.map((p) => (
          <option key={p.id} value={p.id}>{p.host}:{p.port}</option>
        ))}
      </select>
      <button className="py-2.5 text-sm font-medium text-ink-300 hover:bg-ink-800">Add proxy</button>
    </div>
  );
}

function Advanced({ fp, setFp }: { fp: FingerprintConfig; setFp: (fp: FingerprintConfig) => void }) {
  const update = <K extends keyof FingerprintConfig>(k: K, v: FingerprintConfig[K]) =>
    setFp({ ...fp, [k]: v });

  return (
    <div className="space-y-4">
      <Field label="User-Agent">
        <input className="input" value={fp.userAgent} onChange={(e) => update("userAgent", e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="WebRTC">
          <select className="input" value={fp.webrtcMode} onChange={(e) => update("webrtcMode", e.target.value as FingerprintConfig["webrtcMode"])}>
            <option value="auto">Auto</option><option value="real">Real</option>
            <option value="manual">Manual</option><option value="disabled">Disabled</option>
          </select>
        </Field>
        <Field label="IP Address">
          <input className="input" placeholder="optional" value={fp.webrtcIp ?? ""} onChange={(e) => update("webrtcIp", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Canvas">
          <select className="input" value={fp.canvas} onChange={(e) => update("canvas", e.target.value as FingerprintConfig["canvas"])}>
            <option value="noise">Noise</option><option value="real">Real</option><option value="off">Off</option>
          </select>
        </Field>
        <Field label="WebGL">
          <select className="input" value={fp.webgl} onChange={(e) => update("webgl", e.target.value as FingerprintConfig["webgl"])}>
            <option value="noise">Noise</option><option value="real">Real</option><option value="off">Off</option>
          </select>
        </Field>
        <Field label="Audio">
          <select className="input" value={fp.audio} onChange={(e) => update("audio", e.target.value as FingerprintConfig["audio"])}>
            <option value="real">Real</option><option value="noise">Noise</option><option value="off">Off</option>
          </select>
        </Field>
      </div>

      <Field label="Vendor">
        <input className="input" value={fp.vendor} onChange={(e) => update("vendor", e.target.value)} />
      </Field>

      <Field label="Renderer">
        <input className="input" value={fp.renderer} onChange={(e) => update("renderer", e.target.value)} />
      </Field>

      <Field label="Client Rects">
        <select className="input" value={fp.clientRects} onChange={(e) => update("clientRects", e.target.value as FingerprintConfig["clientRects"])}>
          <option value="noise">Noise</option><option value="real">Real</option><option value="off">Off</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Timezone">
          <input className="input" value={fp.timezone} onChange={(e) => update("timezone", e.target.value)} />
        </Field>
        <Field label="Language">
          <input className="input" value={fp.language} onChange={(e) => update("language", e.target.value)} />
        </Field>
      </div>

      <Field label="Geolocation">
        <input
          className="input"
          value={typeof fp.geolocation === "string" ? fp.geolocation : `${fp.geolocation.lat},${fp.geolocation.lon}`}
          onChange={(e) => update("geolocation", e.target.value as FingerprintConfig["geolocation"])}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CPU Cores">
          <input type="number" className="input" value={fp.cpuCores} onChange={(e) => update("cpuCores", parseInt(e.target.value || "0", 10))} />
        </Field>
        <Field label="Memory">
          <input type="number" className="input" value={fp.memoryGb} onChange={(e) => update("memoryGb", parseInt(e.target.value || "0", 10))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Screen">
          <select className="input" value={fp.screenMode} onChange={(e) => update("screenMode", e.target.value as FingerprintConfig["screenMode"])}>
            <option value="auto">Auto</option><option value="manual">Manual</option>
          </select>
        </Field>
        <Field label="Resolution">
          <input className="input" value={fp.resolution} onChange={(e) => update("resolution", e.target.value)} />
        </Field>
      </div>

      <Field label="Media devices">
        <select className="input" value={fp.mediaDevices} onChange={(e) => update("mediaDevices", e.target.value as FingerprintConfig["mediaDevices"])}>
          <option value="real">Real</option><option value="fake">Fake</option>
        </select>
      </Field>

      <Field label="Web camera">
        <input className="input" value={fp.webcam ?? ""} onChange={(e) => update("webcam", e.target.value)} />
      </Field>

      <Field label="Ports to protect">
        <div className="flex flex-wrap gap-1.5">
          {fp.portsToProtect.map((p) => (
            <span key={p} className="chip">{p}</span>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-3 pt-1">
        <input
          type="checkbox"
          checked={fp.doNotTrack}
          onChange={(e) => update("doNotTrack", e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm">Do Not Track</span>
      </label>
    </div>
  );
}

function labelPlatform(p: Platform): string {
  switch (p) { case "windows": return "Windows 11"; case "macos": return "macOS"; case "linux": return "Linux"; }
}
