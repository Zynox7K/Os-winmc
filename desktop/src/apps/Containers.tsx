// ============================================================================
// ARQON OS — ARQON Containers (gestionnaire de conteneurs réels)
// S'appuie sur Docker ou Podman (binaire réel du système).
// ============================================================================
import { useEffect, useState } from "react";
import { Play, Square, RotateCw, Trash2, RefreshCw, Boxes, Cpu, MemoryStick, Container } from "lucide-react";
import { api, fmtBytes } from "../api/client.js";
import type { ContainerInfo } from "../../../shared/types/api";

interface CState {
  available: boolean;
  runtime: string | null;
  containers: ContainerInfo[];
}

export default function ContainersApp({ onNotify }: { winId?: string; onNotify?: (t: string, b: string) => void }) {
  const [state, setState] = useState<CState>({ available: false, runtime: null, containers: [] });
  const [images, setImages] = useState<{ ref: string; size: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.containers(), api.containerImages()])
      .then(([c, im]) => { setState(c); setImages(im.images); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const action = async (act: string, name: string) => {
    try {
      await api.containerAction(act, name);
      onNotify?.("ARQON Containers", `${act} sur « ${name} » effectué.`);
      load();
    } catch (e: any) {
      onNotify?.("ARQON Containers", `Erreur : ${e.message}`);
    }
  };

  return (
    <div className="aq-containers">
      <div className="aq-containers-head">
        <div>
          <h2>Conteneurs</h2>
          <p className="aq-muted">
            {state.available ? `Moteur : ${state.runtime}` : "Aucun moteur de conteneurs (Docker/Podman) disponible sur ce système."}
          </p>
        </div>
        <div className="aq-containers-stats">
          <span className="aq-badge"><Container size={11} /> {state.containers.length} conteneurs</span>
          <button className="aq-iconbtn" onClick={load} title="Actualiser"><RefreshCw size={15} className={loading ? "spin" : ""} /></button>
        </div>
      </div>

      <div className="aq-containers-list aq-scroll">
        {!state.available && (
          <div className="aq-empty">
            <Boxes size={40} />
            <p>Aucun moteur de conteneurs détecté.</p>
            <p className="aq-muted">Installez Docker ou Podman pour gérer des conteneurs réels.</p>
          </div>
        )}
        {state.available && state.containers.length === 0 && <div className="aq-empty">Aucun conteneur. Créez ou démarrez un conteneur via le terminal.</div>}

        {state.containers.map((c) => (
          <div key={c.id} className={`aq-container ${c.status === "running" ? "running" : "stopped"}`}>
            <div className="aq-container-main">
              <div className="aq-container-name">
                <span className={`aq-cstatus ${c.status}`} />
                {c.name}
              </div>
              <div className="aq-container-meta">
                <span className="aq-mono aq-muted">{c.image}</span>
                <span className="aq-badge">{c.status}</span>
                <span className="aq-badge"><Cpu size={10} /> {c.cpuPct.toFixed(0)}%</span>
                <span className="aq-badge"><MemoryStick size={10} /> {fmtBytes(c.memBytes)}</span>
              </div>
              <div className="aq-container-state aq-muted">{c.state}</div>
            </div>
            <div className="aq-container-actions">
              {c.status === "running" ? (
                <button className="aq-btn" onClick={() => action("stop", c.name)}><Square size={13} /> Arrêter</button>
              ) : (
                <button className="aq-btn aq-btn-primary" onClick={() => action("start", c.name)}><Play size={13} /> Démarrer</button>
              )}
              <button className="aq-btn" onClick={() => action("restart", c.name)}><RotateCw size={13} /> Redémarrer</button>
              <button className="aq-btn aq-btn-ghost" onClick={() => action("remove", c.name)}><Trash2 size={13} /> Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {images.length > 0 && (
        <div className="aq-containers-images aq-glass">
          <div className="aq-containers-images-head">Images ({images.length})</div>
          <div className="aq-containers-images-list">
            {images.map((im, i) => (
              <div key={i} className="aq-image">
                <span className="aq-mono">{im.ref}</span>
                <span className="aq-muted">{im.size}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .aq-containers { display: flex; flex-direction: column; height: 100%; background: var(--aq-bg); }
        .aq-containers-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px; border-bottom: var(--aq-border); flex-shrink: 0; }
        .aq-containers-head h2 { font-size: 17px; }
        .aq-containers-head p { font-size: 12px; margin-top: 3px; }
        .aq-containers-stats { display: flex; align-items: center; gap: 8px; }
        .aq-iconbtn { padding: 7px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-containers-list { flex: 1; padding: 12px 18px; overflow-y: auto; }
        .aq-container { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: var(--aq-radius); border: var(--aq-border); margin-bottom: 10px; background: var(--aq-surface); }
        .aq-container.running { border-left: 3px solid var(--aq-success); }
        .aq-container.stopped { border-left: 3px solid var(--aq-muted); }
        .aq-container-main { flex: 1; min-width: 0; }
        .aq-container-name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
        .aq-cstatus { width: 9px; height: 9px; border-radius: 50%; }
        .aq-cstatus.running { background: var(--aq-success); box-shadow: 0 0 6px var(--aq-success); }
        .aq-cstatus.stopped { background: var(--aq-muted); }
        .aq-container-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 11.5px; flex-wrap: wrap; }
        .aq-container-state { font-size: 11px; margin-top: 4px; }
        .aq-container-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .aq-containers-images { margin: 0 18px 16px; border-radius: var(--aq-radius); padding: 12px 16px; flex-shrink: 0; max-height: 160px; display: flex; flex-direction: column; }
        .aq-containers-images-head { font-weight: 700; font-size: 13px; margin-bottom: 8px; }
        .aq-containers-images-list { overflow-y: auto; }
        .aq-image { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: var(--aq-border); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .aq-empty { padding: 40px; text-align: center; color: var(--aq-muted); display: flex; flex-direction: column; align-items: center; gap: 8px; }
      `}</style>
    </div>
  );
}
