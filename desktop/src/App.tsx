// ============================================================================
// ARQON OS — App principale (shell)
// Gère les fenêtres, les bureaux virtuels, le dock, le launcher, le centre.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { Terminal, Code2, FolderGit2, Package, Boxes, Activity, GitBranch, PanelTop, Search, Settings } from "lucide-react";
import Window, { type WindowState } from "./shared/components/Window.js";
import TopBar from "./shell/TopBar.js";
import Dock from "./shell/Dock.js";
import Launcher from "./shell/Launcher.js";
import ControlCenter from "./shell/ControlCenter.js";
import DesktopWidgets from "./shell/DesktopWidgets.js";
import TerminalApp from "./apps/Terminal.js";
import CodeApp from "./apps/Code.js";
import ProjectsApp from "./apps/Projects.js";
import PackagesApp from "./apps/Packages.js";
import DevToolsApp from "./apps/DevTools.js";
import MonitorApp from "./apps/Monitor.js";
import GitApp from "./apps/Git.js";
import ContainersApp from "./apps/Containers.js";
import Onboarding, { type OnboardingResult } from "./apps/Onboarding.js";

export type AppId =
  | "terminal" | "code" | "projects" | "packages" | "devtools"
  | "containers" | "monitor" | "git" | "settings";

interface AppDef {
  id: AppId;
  title: string;
  icon: React.ComponentType<any>;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  single?: boolean; // une seule instance
}

const APPS: AppDef[] = [
  { id: "terminal", title: "ARQON Terminal", icon: Terminal, defaultWidth: 760, defaultHeight: 460, single: true },
  { id: "code", title: "ARQON Code", icon: Code2, defaultWidth: 900, defaultHeight: 580, minWidth: 500, minHeight: 360 },
  { id: "projects", title: "ARQON Projects", icon: FolderGit2, defaultWidth: 720, defaultHeight: 480 },
  { id: "packages", title: "ARQON Packages", icon: Package, defaultWidth: 720, defaultHeight: 480 },
  { id: "devtools", title: "ARQON DevTools", icon: Boxes, defaultWidth: 720, defaultHeight: 480 },
  { id: "containers", title: "ARQON Containers", icon: Activity, defaultWidth: 760, defaultHeight: 480 },
  { id: "monitor", title: "ARQON Monitor", icon: Activity, defaultWidth: 720, defaultHeight: 520 },
  { id: "git", title: "ARQON Git", icon: GitBranch, defaultWidth: 760, defaultHeight: 480 },
  { id: "settings", title: "ARQON Control Center", icon: Settings, defaultWidth: 760, defaultHeight: 520, single: true },
];

interface WinInstance {
  id: string;
  appId: AppId;
  desktop: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
}

const DESKTOPS = 3;

export default function App() {
  const [windows, setWindows] = useState<WinInstance[]>([]);
  const [desktop, setDesktop] = useState(0);
  const [zCounter, setZCounter] = useState(10);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; title: string; body: string }[]>([]);
  const [onboarding, setOnboarding] = useState(() => !localStorage.getItem("arqon.onboarded"));
  const [onboardResult, setOnboardResult] = useState<OnboardingResult | null>(null);

  // Applique l'accent sélectionné pendant l'onboarding sur l'ensemble du shell.
  const applyAccent = useCallback((color: string) => {
    document.documentElement.style.setProperty("--aq-accent", color);
  }, []);

  const open = useCallback((appId: AppId) => {
    const def = APPS.find((a) => a.id === appId)!;
    setWindows((prev) => {
      if (def.single && prev.some((w) => w.appId === appId && !w.minimized)) {
        // recentre la fenêtre existante
        return prev.map((w) => (w.appId === appId ? { ...w, minimized: false } : w));
      }
      const id = `${appId}-${Date.now()}`;
      setZCounter((z) => z + 1);
      return [...prev, { id, appId, desktop, minimized: false, maximized: false, z: zCounter + 1 }];
    });
  }, [desktop, zCounter]);

  const close = useCallback((id: string) => setWindows((prev) => prev.filter((w) => w.id !== id)), []);
  const minimize = useCallback((id: string) => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))), []);
  const maximize = useCallback((id: string) => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w))), []);

  const focus = useCallback((id: string) => {
    setZCounter((z) => {
      const nz = z + 1;
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, z: nz, minimized: false } : w)));
      return nz;
    });
  }, []);

  const notify = useCallback((title: string, body: string) => {
    setNotifications((prev) => [...prev, { id: Date.now(), title, body }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== Date.now())), 5000);
  }, []);

  // Notification système au démarrage.
  useEffect(() => {
    notify("ARQON OS", "Le système est prêt. Build. Code. Create.");
  }, [notify]);

  const defFor = (appId: AppId) => APPS.find((a) => a.id === appId)!;
  const visibleWindows = windows.filter((w) => w.desktop === desktop && !w.minimized);

  return (
    <div className="aq-desktop">
      <DesktopWidgets />

      {/* Bureaux virtuels */}
      <div className="aq-desktop-layer" data-desktop={desktop}>
        {visibleWindows.map((w) => {
          const def = defFor(w.appId);
          const Icon = def.icon;
          const win: WindowState = {
            id: w.id,
            title: def.title,
            icon: <Icon size={15} />,
            minWidth: def.minWidth,
            minHeight: def.minHeight,
            defaultWidth: def.defaultWidth,
            defaultHeight: def.defaultHeight,
          };
          return (
            <Window
              key={w.id}
              win={win}
              onClose={() => close(w.id)}
              onMinimize={() => minimize(w.id)}
              onMaximize={() => maximize(w.id)}
            >
              <AppBody appId={w.appId} winId={w.id} onNotify={notify} />
            </Window>
          );
        })}
      </div>

      <TopBar
        desktop={desktop}
        setDesktop={setDesktop}
        desktopCount={DESKTOPS}
        windows={windows}
        activeDesktop={desktop}
        onOpenLauncher={() => setLauncherOpen(true)}
        onOpenControl={() => setControlOpen((v) => !v)}
        notifications={notifications}
        onCloseNotification={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      <Dock
        apps={APPS}
        windows={windows}
        desktop={desktop}
        onOpen={open}
        onFocus={focus}
        onClose={close}
        onSwitchDesktop={setDesktop}
        desktopCount={DESKTOPS}
      />

      {launcherOpen && (
        <Launcher
          onClose={() => setLauncherOpen(false)}
          onOpen={(id) => { open(id); setLauncherOpen(false); }}
        />
      )}

      {controlOpen && <ControlCenter onClose={() => setControlOpen(false)} onOpenSettings={() => open("settings")} />}

      {onboarding && (
        <Onboarding
          onDone={(r) => {
            setOnboardResult(r);
            applyAccent(r.accent);
            localStorage.setItem("arqon.onboarded", "1");
            localStorage.setItem("arqon.profile", r.profile);
            localStorage.setItem("arqon.user", r.user.name);
            setOnboarding(false);
            notify("ARQON OS", "Configuration terminée. Welcome to your workspace.");
          }}
          onAccentChange={applyAccent}
          onDarkChange={() => {}}
        />
      )}

      <style>{`
        .aq-desktop {
          position: fixed;
          inset: 0;
          overflow: hidden;
        }
        .aq-desktop-layer {
          position: absolute;
          inset: 0;
          transition: opacity var(--aq-dur-slow) var(--aq-ease);
        }
      `}</style>
    </div>
  );
}

function AppBody({ appId, winId, onNotify }: { appId: AppId; winId: string; onNotify: (t: string, b: string) => void }) {
  switch (appId) {
    case "terminal": return <TerminalApp winId={winId} onNotify={onNotify} />;
    case "code": return <CodeApp winId={winId} />;
    case "projects": return <ProjectsApp winId={winId} onOpenCode={() => {}} />;
    case "packages": return <PackagesApp onNotify={onNotify} />;
    case "devtools": return <DevToolsApp onNotify={onNotify} />;
    case "containers": return <ContainersApp onNotify={onNotify} />;
    case "monitor": return <MonitorApp />;
    case "git": return <GitApp onNotify={onNotify} />;
    case "settings": return <ControlCenter inline />;
    default: return <div className="aq-empty">Application non disponible.</div>;
  }
}

// Ré-export pour les icônes utilisées dans le launcher.
export { Search, PanelTop };
