// ============================================================================
// ARQON OS — Monitor (surveillance système en temps réel)
// Affiche CPU, RAM, disque, réseau, processus réels via le backend.
// Graphiques SVG fluides (sans dépendance lourde).
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Cpu, MemoryStick, HardDrive, Activity, Thermometer, TrendingUp } from "lucide-react";
import { api, fmtBytes } from "../api/client.js";
import type { SystemStats, ProcessInfo } from "../../../shared/types/api";

const HIST = 60; // points d'historique

export default function MonitorApp() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const cpuHist = useRef<number[]>(new Array(HIST).fill(0));
  const memHist = useRef<number[]>(new Array(HIST).fill(0));
  const netHist = useRef<number[]>(new Array(HIST).fill(0));
  const [, force] = useState(0);

  useEffect(() => {
    let active = true;
    const tick = () => {
      api.stats().then((s) => {
        if (!active) return;
        setStats(s);
        cpuHist.current = [...cpuHist.current.slice(1), s.cpu.usage];
        memHist.current = [...memHist.current.slice(1), s.memory.usage];
        netHist.current = [...netHist.current.slice(1), Math.min(100, (s.network.rxRate + s.network.txRate) / 50000)];
        force((n) => n + 1);
      }).catch(() => {});
      api.processes().then(setProcs).catch(() => {});
    };
    tick();
    const t = setInterval(tick, 1500);
    return () => { active = false; clearInterval(t); };
  }, []);

  return (
    <div className="aq-monitor">
      <div className="aq-monitor-grid">
        <Card title="CPU" icon={<Cpu size={16} />} usage={stats?.cpu.usage ?? 0} value={`${(stats?.cpu.usage ?? 0).toFixed(1)}%`} sub={stats ? `${stats.cpu.perCore.length} cœurs · load ${stats.cpu.load[0]?.toFixed(2)}` : ""}>
          <Spark data={cpuHist.current} color="var(--aq-accent)" />
        </Card>

        <Card title="Mémoire" icon={<MemoryStick size={16} />} usage={stats?.memory.usage ?? 0} value={fmtBytes(stats?.memory.usedBytes ?? 0)} sub={stats ? `/ ${fmtBytes(stats.memory.totalBytes)}` : ""}>
          <Spark data={memHist.current} color="var(--aq-accent-2)" />
        </Card>

        <Card title="Disque" icon={<HardDrive size={16} />} usage={stats?.disk.usage ?? 0} value={fmtBytes(stats?.disk.usedBytes ?? 0)} sub={stats ? `/ ${fmtBytes(stats.disk.totalBytes)}` : ""}>
          <Spark data={[stats?.disk.usage ?? 0]} color="var(--aq-success)" />
        </Card>

        <Card title="Réseau" icon={<Activity size={16} />} usage={(stats?.network.rxRate ?? 0) + (stats?.network.txRate ?? 0) ? Math.min(100, ((stats?.network.rxRate ?? 0) + (stats?.network.txRate ?? 0)) / 50000 * 100) : 0} value={`${fmtBytes((stats?.network.rxRate ?? 0) + (stats?.network.txRate ?? 0))}/s`} sub={`RX ${fmtBytes(stats?.network.rxRate ?? 0)}/s · TX ${fmtBytes(stats?.network.txRate ?? 0)}/s`}>
          <Spark data={netHist.current} color="var(--aq-warning)" />
        </Card>
      </div>

      <div className="aq-monitor-detail">
        {stats?.temperature?.available && stats.temperature.value != null && (
          <div className="aq-monitor-stat aq-glass">
            <Thermometer size={16} />
            <div>
              <div className="aq-monitor-stat-label">Température CPU</div>
              <div className="aq-monitor-stat-val">{stats.temperature.value.toFixed(1)} °C</div>
            </div>
          </div>
        )}
        <div className="aq-monitor-stat aq-glass">
          <TrendingUp size={16} />
          <div>
            <div className="aq-monitor-stat-label">Uptime</div>
            <div className="aq-monitor-stat-val">{stats ? `${Math.floor(stats.cpu.load.length ? 0 : 0)}h` : "—"}</div>
          </div>
        </div>
      </div>

      <div className="aq-monitor-procs aq-glass">
        <div className="aq-monitor-procs-head">Processus</div>
        <div className="aq-monitor-procs-list">
          <div className="aq-proc-row aq-proc-head">
            <span>PID</span><span>Processus</span><span>CPU</span><span>Mémoire</span>
          </div>
          {procs.slice(0, 40).map((p) => (
            <div key={p.pid} className="aq-proc-row">
              <span className="aq-mono aq-muted">{p.pid}</span>
              <span className="aq-truncate">{p.name}</span>
              <span className="aq-mono">{p.cpu.toFixed(0)}%</span>
              <span className="aq-mono">{fmtBytes(p.memBytes)}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .aq-monitor { display: flex; flex-direction: column; gap: 14px; height: 100%; padding: 14px; background: var(--aq-bg); }
        .aq-monitor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .aq-monitor-detail { display: flex; gap: 14px; }
        .aq-monitor-stat { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--aq-radius); }
        .aq-monitor-stat-label { font-size: 11px; color: var(--aq-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .aq-monitor-stat-val { font-size: 18px; font-weight: 800; margin-top: 2px; }
        .aq-monitor-procs { flex: 1; display: flex; flex-direction: column; min-height: 120px; border-radius: var(--aq-radius); padding: 14px; }
        .aq-monitor-procs-head { font-weight: 700; font-size: 14px; margin-bottom: 10px; }
        .aq-monitor-procs-list { flex: 1; overflow-y: auto; }
        .aq-proc-row { display: grid; grid-template-columns: 70px 1fr 70px 110px; gap: 10px; padding: 7px 8px; border-radius: var(--aq-radius-sm); font-size: 12.5px; align-items: center; }
        .aq-proc-row:hover { background: var(--aq-surface-hover); }
        .aq-proc-head { font-weight: 700; color: var(--aq-muted); font-size: 11px; text-transform: uppercase; }
      `}</style>
    </div>
  );
}

function Card({ title, icon, usage, value, sub, children }: { title: string; icon: React.ReactNode; usage: number; value: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="aq-card aq-glass">
      <div className="aq-card-head">
        <span className="aq-card-icon">{icon}</span>
        <span className="aq-card-title">{title}</span>
      </div>
      <div className="aq-card-val">{value}</div>
      <div className="aq-card-sub aq-muted">{sub}</div>
      <div className="aq-card-bar"><div className="aq-card-bar-fill" style={{ width: `${Math.min(100, usage)}%`, background: usage > 85 ? "var(--aq-error)" : usage > 70 ? "var(--aq-warning)" : "var(--aq-accent)" }} /></div>
      {children}
      <style>{`
        .aq-card { padding: 14px 16px; border-radius: var(--aq-radius); }
        .aq-card-head { display: flex; align-items: center; gap: 8px; }
        .aq-card-icon { color: var(--aq-accent); }
        .aq-card-title { font-weight: 700; font-size: 13px; }
        .aq-card-val { font-size: 22px; font-weight: 800; margin-top: 6px; }
        .aq-card-sub { font-size: 11.5px; margin-bottom: 8px; }
        .aq-card-bar { height: 6px; background: var(--aq-surface); border-radius: 999px; overflow: hidden; margin-top: 4px; }
        .aq-card-bar-fill { height: 100%; border-radius: 999px; transition: width var(--aq-dur-slow) var(--aq-ease-out); }
      `}</style>
    </div>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 240, h = 48;
  const max = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (Math.min(max, v) / max) * h}`);
  const path = `M ${pts.join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="aq-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${color.replace(/[^a-z]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${color.replace(/[^a-z]/gi, "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <style>{`.aq-spark { width: 100%; height: 48px; display: block; margin-top: 8px; }`}</style>
    </svg>
  );
}
