// ============================================================================
// ARQON OS — ARQON DevTools (centre de gestion des environnements de développement)
// Détection réelle des langages/outils installés + version.
// ============================================================================
import { useEffect, useState } from "react";
import { RefreshCw, Check, X, Terminal, Boxes } from "lucide-react";
import { api } from "../api/client.js";
import type { DevToolInfo } from "../../../shared/types/api";

const CATEGORY_ORDER = ["JavaScript", "Python", "Rust", "Go", "Java", "C/C++", "PHP", "Ruby", "Containers", "Version Control", "Network", "Terminal"];
const CATEGORY_ICON: Record<string, string> = {
  JavaScript: "🟨", Python: "🐍", Rust: "🦀", Go: "🐹", Java: "☕", "C/C++": "⚙️",
  PHP: "🐘", Ruby: "💎", Containers: "📦", "Version Control": "🌿", Network: "🌐", Terminal: "🖥️",
};

export default function DevToolsApp({ onNotify }: { winId?: string; onNotify?: (t: string, b: string) => void }) {
  const [tools, setTools] = useState<DevToolInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.devtools().then((t) => { setTools(t); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const installedCount = tools.filter((t) => t.installed).length;

  return (
    <div className="aq-devtools">
      <div className="aq-devtools-head">
        <div>
          <h2>Environnements de développement</h2>
          <p className="aq-muted">{installedCount} outil(s) installé(s) sur le système. Détection réelle.</p>
        </div>
        <button className="aq-iconbtn" onClick={load} title="Actualiser"><RefreshCw size={15} /></button>
      </div>

      <div className="aq-devtools-grid aq-scroll">
        {loading && <div className="aq-empty">Détection des outils…</div>}
        {CATEGORY_ORDER.map((cat) => {
          const list = tools.filter((t) => t.category === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat} className="aq-devtools-section">
              <div className="aq-devtools-cat">
                <span className="aq-devtools-caticon">{CATEGORY_ICON[cat]}</span>
                <span>{cat}</span>
              </div>
              <div className="aq-devtools-cards">
                {list.map((t) => (
                  <div key={t.id} className={`aq-tool-card ${t.installed ? "installed" : "missing"}`}>
                    <div className="aq-tool-card-top">
                      <div className="aq-tool-icon">
                        {t.installed ? <Check size={16} /> : <X size={16} />}
                      </div>
                      <div className="aq-tool-info">
                        <div className="aq-tool-name">{t.name}</div>
                        <div className="aq-tool-ver aq-mono">{t.installed ? t.version : "Non installé"}</div>
                      </div>
                    </div>
                    {t.path && <div className="aq-tool-path aq-mono aq-muted">{t.path}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .aq-devtools { display: flex; flex-direction: column; height: 100%; background: var(--aq-bg); }
        .aq-devtools-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px; border-bottom: var(--aq-border); flex-shrink: 0; }
        .aq-devtools-head h2 { font-size: 17px; }
        .aq-devtools-head p { font-size: 12px; margin-top: 3px; }
        .aq-iconbtn { padding: 7px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-devtools-grid { flex: 1; padding: 16px 18px; }
        .aq-devtools-section { margin-bottom: 22px; }
        .aq-devtools-cat { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; margin-bottom: 10px; color: var(--aq-text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
        .aq-devtools-caticon { font-size: 15px; }
        .aq-devtools-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
        .aq-tool-card { padding: 14px; border-radius: var(--aq-radius); border: var(--aq-border); background: var(--aq-surface); }
        .aq-tool-card.installed { border-left: 3px solid var(--aq-success); }
        .aq-tool-card.missing { border-left: 3px solid var(--aq-error); opacity: 0.85; }
        .aq-tool-card-top { display: flex; align-items: center; gap: 10px; }
        .aq-tool-icon { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
        .aq-tool-card.installed .aq-tool-icon { background: var(--aq-success-soft); color: var(--aq-success); }
        .aq-tool-card.missing .aq-tool-icon { background: var(--aq-error-soft); color: var(--aq-error); }
        .aq-tool-name { font-weight: 600; font-size: 13.5px; }
        .aq-tool-ver { font-size: 11px; margin-top: 2px; }
        .aq-tool-path { font-size: 10.5px; margin-top: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .aq-empty { padding: 30px; text-align: center; color: var(--aq-muted); }
      `}</style>
    </div>
  );
}
