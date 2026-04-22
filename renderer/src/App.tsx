import { useEffect } from "react";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { TabBar } from "./components/TabBar";
import { ProfilesPage } from "./pages/Profiles";
import { ProxiesPage } from "./pages/Proxies";
import { TagsPage } from "./pages/Tags";
import { StatusesPage } from "./pages/Statuses";
import { ExtrasPage } from "./pages/Extras";
import { LoginPage } from "./pages/Login";
import { CreateProfileDrawer } from "./components/CreateProfileDrawer";
import { CreateProxyDrawer } from "./components/CreateProxyDrawer";

export function App() {
  const { booted, user, bootstrap, tab, setDrawer, refreshProfiles, refreshProxies, refreshTags, refreshStatuses } = useStore();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (!booted) return <div className="flex items-center justify-center h-full text-ink-500">Loading…</div>;
  if (!user) return <LoginPage />;

  const onRefresh = () => {
    if (tab === "profiles") refreshProfiles();
    else if (tab === "proxies") refreshProxies();
    else if (tab === "tags") refreshTags();
    else if (tab === "statuses") refreshStatuses();
  };

  const onCreate = () => {
    if (tab === "profiles") setDrawer({ kind: "createProfile" });
    else if (tab === "proxies") setDrawer({ kind: "createProxy" });
    // Tags / Statuses have inline forms on the page itself.
  };

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TabBar />
        <TopBar onRefresh={onRefresh} onCreate={onCreate} />
        {tab === "profiles" && <ProfilesPage />}
        {tab === "proxies" && <ProxiesPage />}
        {tab === "tags" && <TagsPage />}
        {tab === "statuses" && <StatusesPage />}
        {tab === "extras" && <ExtrasPage />}
      </div>
      <CreateProfileDrawer />
      <CreateProxyDrawer />
    </div>
  );
}
