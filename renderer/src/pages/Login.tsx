import { useState } from "react";
import { Logo } from "../components/Logo";
import { useStore } from "../store";
import { api } from "../ipc";

export function LoginPage() {
  const { hasAnyUser, bootstrap } = useStore();
  const [mode, setMode] = useState<"login" | "register">(hasAnyUser ? "login" : "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null); setBusy(true);
    try {
      if (mode === "register") {
        await api.auth.register(email, password);
      } else {
        await api.auth.login(email, password);
      }
      await bootstrap();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-ink-950 via-ink-950 to-brand-950/40">
      <div className="w-[380px] card p-8">
        <div className="flex items-center gap-3 mb-8">
          <Logo size={36} />
          <div>
            <div className="text-xl font-bold tracking-tight">Forgen</div>
            <div className="text-xs text-ink-400">Anti-detect browser</div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">Email</label>
            <input className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-ink-400 uppercase tracking-wider">Password</label>
            <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <button className="btn-primary w-full !py-3" disabled={busy} onClick={submit}>
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
          <button
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            className="w-full text-center text-xs text-ink-400 hover:text-ink-200"
          >
            {mode === "register" ? "Already have an account? Sign in" : "No account yet? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
