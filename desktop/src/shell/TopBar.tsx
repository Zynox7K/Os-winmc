// ============================================================================
// ARQON OS — Barre supérieure système
// ============================================================================
import { useEffect, useState } from "react";
import { Search, Wifi, BatteryMedium, Bell, Volume2, Sun } from "lucide-react";
import { api, fmtUptime } from "../api/client.js";

interface Props {
  desktop: number;
  setDesktop: (n: number) => void;
  desktopCount: number;
  windows: { id: string; appId: string; desktop: number; minimized: boolean }[];
  activeDesktop: number;
  onOpenLauncher: () => void;
  onOpenControl: () => void;
  notifications: { id: number; title: string; body: string }[];
  onCloseNotification: (id: number) => void;
}

export default function TopBar({ desktop, setDesktop, desktopCount, windows, onOpenLauncher, onOpenControl, notifications, onCloseNotification }: Props) {
  const [now, setNow] = useState(new Date());
  const [info, setInfo] = useState<{ hostname: string; cpuModel: string; cpuCores: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    api.info().then((i) => setInfo({ hostname: i.hostname, cpuModel: i.cpuModel, cpuCores: i.cpuCores })).catch(() => {});
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div className="aq-topbar">
      <button className="aq-topbar-brand" onClick={onOpenLauncher}>
        <span className="aq-brand-mark">A</span>
        <span className="aq-brand-name">ARQON</span>
      </button>

      <button className="aq-topbar-search" onClick={onOpenLauncher}>
        <Search size={15} />
        <span>Rechercher applications, fichiers, commandes…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="aq-topbar-windowdots">
        {Array.from({ length: desktopCount }).map((_, i) => (
          <button
            key={i}
            className={`aq-desktop-pill ${desktop === i ? "active" : ""}`}
            onClick={() => setDesktop(i)}
          >
            <span className="aq-desktop-num">{i + 1}</span>
            <span className="aq-desktop-count">{windows.filter((w) => w.desktop === i && !w.minimized).length}</span>
          </button>
        ))}
      </div>

      <div className="aq-topbar-right">
        <div className="aq-topbar-status">
          <Wifi size={15} />
          <BatteryMedium size={15} />
          <Volume2 size={15} />
        </div>

        <button className="aq-topbar-iconbtn" onClick={onOpenControl} title="Centre de contrôle">
          <Sun size={16} />
        </button>

        <div className="aq-topbar-clock">
          <div className="aq-topbar-time">{time}</div>
          <div className="aq-topbar-date">{date}</div>
        </div>

        <div className="aq-topbar-notif">
          <Bell size={16} />
          {notifications.length > 0 && <span className="aq-notif-dot">{notifications.length}</span>}
        </div>
        {notifications.length > 0 && (
          <div className="aq-notif-panel aq-glass">
            {notifications.map((n) => (
              <div key={n.id} className="aq-notif-item">
                <div>
                  <div className="aq-notif-title">{n.title}</div>
                  <div className="aq-notif-body">{n.body}</div>
                </div>
                <button onClick={() => onCloseNotification(n.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .aq-topbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 34px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          background: rgba(9, 13, 22, 0.82);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          border-bottom: var(--aq-glass-border);
          z-index: 9000;
          user-select: none;
        }
        .aq-topbar-brand {
          display: flex; align-items: center; gap: 7px;
          padding: 2px 8px; border-radius: var(--aq-radius-sm);
        }
        .aq-brand-mark {
          width: 20px; height: 20px; border-radius: 6px;
          background: linear-gradient(135deg, var(--aq-accent), var(--aq-accent-2));
          color: #06121f; font-weight: 800; font-size: 13px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .aq-brand-name { font-weight: 800; letter-spacing: 1.5px; font-size: 13px; }
        .aq-topbar-search {
          display: flex; align-items: center; gap: 8px;
          background: var(--aq-surface);
          border: var(--aq-border);
          border-radius: 999px;
          padding: 4px 14px;
          font-size: 12.5px;
          color: var(--aq-muted);
          flex: 0 1 340px;
          transition: border-color var(--aq-dur) var(--aq-ease);
        }
        .aq-topbar-search:hover { border-color: var(--aq-accent); color: var(--aq-text-dim); }
        .aq-topbar-search kbd {
          margin-left: auto;
          font-family: var(--aq-font-mono);
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 5px;
          background: var(--aq-secondary);
          border: var(--aq-border);
          color: var(--aq-muted);
        }
        .aq-topbar-windowdots { display: flex; gap: 6px; }
        .aq-desktop-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 3px 10px; border-radius: 999px;
          background: var(--aq-surface); border: var(--aq-border);
          font-size: 11px; color: var(--aq-muted);
          transition: all var(--aq-dur) var(--aq-ease);
        }
        .aq-desktop-pill:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-desktop-pill.active { background: var(--aq-accent); color: #06121f; border-color: transparent; }
        .aq-desktop-num { font-weight: 700; }
        .aq-desktop-count {
          background: rgba(255,255,255,0.15); border-radius: 999px;
          padding: 0 6px; font-size: 10px;
        }
        .aq-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; position: relative; }
        .aq-topbar-status { display: flex; gap: 8px; color: var(--aq-text-dim); }
        .aq-topbar-iconbtn, .aq-topbar-notif {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: var(--aq-radius-sm);
          color: var(--aq-text-dim); position: relative;
          transition: background var(--aq-dur) var(--aq-ease);
        }
        .aq-topbar-iconbtn:hover, .aq-topbar-notif:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-notif-dot {
          position: absolute; top: -2px; right: -2px;
          background: var(--aq-accent); color: #06121f;
          border-radius: 999px; font-size: 9px; font-weight: 700;
          min-width: 14px; height: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0 3px;
        }
        .aq-topbar-clock { text-align: right; line-height: 1.1; }
        .aq-topbar-time { font-weight: 700; font-size: 13px; }
        .aq-topbar-date { font-size: 11px; color: var(--aq-muted); }
        .aq-notif-panel {
          position: absolute; top: 32px; right: 0;
          width: 320px; padding: 8px;
          border-radius: var(--aq-radius);
          box-shadow: var(--aq-shadow-lg);
          z-index: 9500;
        }
        .aq-notif-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px; border-radius: var(--aq-radius);
          background: var(--aq-surface); margin-bottom: 6px;
        }
        .aq-notif-item:last-child { margin-bottom: 0; }
        .aq-notif-title { font-weight: 700; font-size: 13px; }
        .aq-notif-body { font-size: 12px; color: var(--aq-muted); margin-top: 2px; }
        .aq-notif-item button { color: var(--aq-muted); font-size: 16px; line-height: 1; }
      `}</style>
    </div>
  );
}
