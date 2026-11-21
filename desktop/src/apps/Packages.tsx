// ============================================================================
// ARQON OS — ARQON Packages (gestionnaire d'applications réelles)
// Affiche les paquets installés réels (APT/dpkg, Flatpak, pip, npm global).
// Recherche, installation/désinstallation via les gestionnaires réels.
// ============================================================================
import { useEffect, useState } from "react";
import { Search, Download, Trash2, RefreshCw, Package, Layers } from "lucide-react";
import { api } from "../api/client.js";
import type { PackageEntry } from "../../../shared/types/api";

const SOURCE_LABEL: Record<string, string> = {
  apt: "APT", flatpak: "Flatpak", pip: "pip", npm: "npm", system: "Système",
};
const SOURCE_COLOR: Record<string, string> = {
  apt: "var(--aq-accent)", flatpak: "var(--aq-accent-2)", pip: "var(--aq-success)", npm: "var(--aq-warning)", system: "var(--aq-muted)",
};

export default function PackagesApp({ onNotify }: { winId?: string; onNotify?: (t: string, b: string) => void }) {
  const [pkgs, setPkgs] = useState<PackageEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [updates, setUpdates] = useState<{ available: number }>({ available: 0 });

  const load = () => {
    setLoading(true);
    Promise.all([api.packages(), api.updates()])
      .then(([p, u]) => { setPkgs(p); setUpdates(u); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const install = async (name: string) => {
    setInstalling(name);
    try {
      const r = await api.installPackage(name, "apt");
      onNotify?.("ARQON Packages", `Installation de « ${name} » terminée.`);
      load();
    } catch (e: any) {
      onNotify?.("ARQON Packages", `Échec de l'installation : ${e.message}`);
    } finally {
      setInstalling(null);
    }
  };

  const filtered = pkgs.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="aq-packages">
      <div className="aq-packages-head">
        <div className="aq-packages-search">
          <Search size={16} />
          <input className="aq-packages-input" placeholder="Rechercher un paquet…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="aq-packages-stats">
          <span className="aq-badge"><Package size={11} /> {pkgs.length} paquets</span>
          <span className="aq-badge aq-badge-accent"><Layers size={11} /> {updates.available} mise(s) à jour</span>
          <button className="aq-iconbtn" onClick={load} title="Actualiser"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="aq-packages-list aq-scroll">
        {loading && <div className="aq-empty">Chargement des paquets…</div>}
        {!loading && filtered.length === 0 && <div className="aq-empty">Aucun paquet correspondant.</div>}
        {filtered.map((p) => (
          <div key={`${p.source}:${p.name}`} className="aq-package">
            <div className="aq-package-main">
              <div className="aq-package-name">{p.name}</div>
              <div className="aq-package-meta">
                <span className="aq-badge" style={{ color: SOURCE_COLOR[p.source], background: `${SOURCE_COLOR[p.source]}1f` }}>
                  {SOURCE_LABEL[p.source]}
                </span>
                <span className="aq-mono aq-muted">{p.version}</span>
                {p.description && <span className="aq-package-desc aq-truncate">{p.description}</span>}
              </div>
            </div>
            <div className="aq-package-actions">
              {p.source === "apt" ? (
                <button className="aq-btn aq-btn-ghost" onClick={() => install(p.name)} disabled={installing === p.name}>
                  {installing === p.name ? <RefreshCw size={13} className="spin" /> : <Trash2 size={13} />}
                  Reinstaller
                </button>
              ) : (
                <span className="aq-badge aq-badge-success">Installé</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .aq-packages { display: flex; flex-direction: column; height: 100%; background: var(--aq-bg); }
        .aq-packages-head { display: flex; align-items: center; gap: 12px; padding: 14px; border-bottom: var(--aq-border); flex-shrink: 0; }
        .aq-packages-search { display: flex; align-items: center; gap: 10px; flex: 1; background: var(--aq-surface); border: var(--aq-border); border-radius: var(--aq-radius); padding: 0 14px; color: var(--aq-muted); }
        .aq-packages-input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; font-size: 13.5px; color: var(--aq-text); }
        .aq-packages-stats { display: flex; align-items: center; gap: 8px; }
        .aq-iconbtn { padding: 7px; border-radius: var(--aq-radius-sm); color: var(--aq-muted); }
        .aq-iconbtn:hover { background: var(--aq-surface-hover); color: var(--aq-text); }
        .aq-packages-list { flex: 1; padding: 8px 14px; }
        .aq-package { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: var(--aq-radius); border: var(--aq-border); margin-bottom: 8px; transition: background var(--aq-dur-fast) var(--aq-ease); }
        .aq-package:hover { background: var(--aq-surface); }
        .aq-package-main { flex: 1; min-width: 0; }
        .aq-package-name { font-weight: 600; font-size: 14px; }
        .aq-package-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; font-size: 12px; }
        .aq-package-desc { color: var(--aq-muted); max-width: 320px; }
        .aq-package-actions { flex-shrink: 0; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
