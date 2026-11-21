// ============================================================================
// ARQON OS — Widgets système sur le bureau
// Affiche l'horloge et les stats système en temps réel (données réelles).
// ============================================================================
import { useEffect, useState } from "react";
import { Cpu, MemoryStick, HardDrive, Activity } from "lucide-react";
import { api, fmtBytes } from "../api/client.js";

interface Stats {
  cpu: { usage: number };
  memory: { usage: number; usedBytes: number; totalBytes: number };
  disk: { usage: number; usedBytes: number; totalBytes: number };
}

export default function DesktopWidgets() {
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const s = setInterval(() => { api.stats().then(setStats).catch(() => {}); }, 2000);
    api.stats().then(setStats).catch(() => {});
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="aq-widgets">
      <div className="aq-widget aq-glass">
        <div className="aq-widget-time">{time}</div>
        <div className="aq-widget-date">{date}</div>
      </div>

      <div className="aq-widget aq-glass">
        <div className="aq-widget-head"><Cpu size={14} /> CPU</div>
        <WidgetBar pct={stats?.cpu.usage ?? 0} />
        <div className="aq-widget-val">{(stats?.cpu.usage ?? 0).toFixed(0)}%</div>
      </div>

      <div className="aq-widget aq-glass">
        <div className="aq-widget-head"><MemoryStick size={14} /> RAM</div>
        <WidgetBar pct={stats?.memory.usage ?? 0} />
        <div className="aq-widget-val">{fmtBytes(stats?.memory.usedBytes ?? 0)}</div>
      </div>

      <div className="aq-widget aq-glass">
        <div className="aq-widget-head"><HardDrive size={14} /> Disque</div>
        <WidgetBar pct={stats?.disk.usage ?? 0} />
        <div className="aq-widget-val">{(stats?.disk.usage ?? 0).toFixed(0)}%</div>
      </div>

      <div className="aq-widget aq-glass">
        <div className="aq-widget-head"><Activity size={14} /> ARQON</div>
        <div className="aq-widget-slogan">Build. Code. Create.</div>
      </div>

      <style>{`
        .aq-widgets {
          position: fixed; top: 44px; right: 16px;
          display: flex; flex-direction: column; gap: 12px;
          z-index: 5; pointer-events: none;
        }
        .aq-widget {
          padding: 14px 16px;
          border-radius: var(--aq-radius-lg);
          box-shadow: var(--aq-shadow);
          min-width: 168px;
          pointer-events: auto;
        }
        .aq-widget-time { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .aq-widget-date { font-size: 12px; color: var(--aq-muted); margin-top: 2px; }
        .aq-widget-head { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--aq-text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
        .aq-widget-val { font-size: 12px; font-weight: 700; margin-top: 6px; }
        .aq-widget-slogan { font-size: 12px; font-weight: 700; color: var(--aq-accent); margin-top: 6px; }
      `}</style>
    </div>
  );
}

function WidgetBar({ pct }: { pct: number }) {
  return (
    <>
      <div className="aq-wbar" style={{ marginTop: 8 }}>
        <div className="aq-wbar-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct > 85 ? "var(--aq-error)" : pct > 70 ? "var(--aq-warning)" : "var(--aq-accent)" }} />
      </div>
      <style>{`
        .aq-wbar { height: 5px; background: var(--aq-surface); border-radius: 999px; overflow: hidden; }
        .aq-wbar-fill { height: 100%; border-radius: 999px; transition: width var(--aq-dur-slow) var(--aq-ease-out); }
      `}</style>
    </>
  );
}
